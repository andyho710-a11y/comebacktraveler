begin;
create table private.test_users(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.jobs add column test_case boolean not null default false;
alter table public.jobs drop constraint jobs_status_check;
do $$ declare v_name text; begin
 for v_name in select conname from pg_constraint where conrelid='public.jobs'::regclass and contype='c' and pg_get_constraintdef(oid) like '%selected_provider_id%' loop
  execute format('alter table public.jobs drop constraint %I',v_name);
 end loop;
end;$$;
alter table public.jobs add constraint jobs_status_check check(status in ('pending','open','awaiting_provider','matched','submitted','completed','rejected','cancelled','cancellation_requested','disputed'));
-- A previous selection alone is not evidence of a successful match.
update public.jobs set status='awaiting_provider' where status='assigned';
alter table public.jobs add constraint jobs_assignment_check check((status in ('awaiting_provider','matched','submitted','completed','cancellation_requested','disputed') and selected_provider_id is not null) or (status in ('pending','open','rejected','cancelled') and selected_provider_id is null));
alter table public.quotes add column service_at timestamptz;
update public.quotes q set service_at=j.preferred_at from public.jobs j where j.id=q.job_id;
alter table public.quotes alter column service_at set not null;
alter table public.quotes drop constraint quotes_status_check;
alter table public.quotes add constraint quotes_status_check check(status in ('offered','selected','accepted','rejected','declined','withdrawn'));

create table public.successful_matches(
 id uuid primary key default gen_random_uuid(),job_id uuid not null unique references public.jobs(id) on delete cascade,
 customer_id uuid not null references public.profiles(id),provider_id uuid not null references public.profiles(id),
 quote_id uuid not null references public.quotes(id),amount integer not null check(amount between 1 and 100000),
 quote_note text not null,service_at timestamptz not null,matched_at timestamptz not null default now()
);
create table public.job_events(id bigint generated always as identity primary key,job_id uuid not null references public.jobs(id) on delete cascade,actor_id uuid references auth.users(id),kind text not null,note text not null default '' check(char_length(note)<=1000),created_at timestamptz not null default now());
create table public.job_cases(job_id uuid primary key references public.jobs(id) on delete cascade,kind text not null check(kind in ('cancellation','dispute')),opened_by uuid not null references public.profiles(id),previous_status text not null,reason text not null check(char_length(reason) between 2 and 1000),state text not null default 'open' check(state in ('open','resolved')),resolution text not null default '',opened_at timestamptz not null default now(),resolved_at timestamptz);
create table public.job_moderation(job_id uuid primary key references public.jobs(id) on delete cascade,review_note text not null default '' check(char_length(review_note)<=500));
insert into public.job_moderation select id,review_note from public.jobs;
update public.jobs set review_note='';
create table public.notifications(id uuid primary key default gen_random_uuid(),recipient_id uuid not null references auth.users(id) on delete cascade,job_id uuid references public.jobs(id) on delete cascade,kind text not null,title text not null,body text not null,dedupe_key text not null unique,created_at timestamptz not null default now(),read_at timestamptz);
create index notifications_recipient on public.notifications(recipient_id,created_at desc);
create index job_events_job on public.job_events(job_id,created_at);
create table private.notification_outbox(id uuid primary key default gen_random_uuid(),notification_id uuid not null unique references public.notifications(id) on delete cascade,state text not null default 'pending' check(state in ('pending','processing','sent','failed','skipped')),attempts integer not null default 0,available_at timestamptz not null default now(),lease_id uuid,leased_at timestamptz,sent_at timestamptz,last_error text not null default '');

create or replace function public.can_read_job(p_job uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from jobs j where j.id=p_job and (j.owner_id=auth.uid() or is_admin() or can_match(j.id) or (j.selected_provider_id=auth.uid() and is_provider()) or exists(select 1 from successful_matches m where m.job_id=j.id and m.provider_id=auth.uid())));
$$;
create or replace function public.can_match(p_job uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from jobs j join provider_public p on p.user_id=auth.uid() join provider_applications a on a.user_id=p.user_id and a.status='approved' where j.id=p_job and j.owner_id<>auth.uid() and j.status='open' and j.category=any(p.categories) and j.district=any(p.districts) and j.test_case=exists(select 1 from private.test_users t where t.user_id=auth.uid()));
$$;
create or replace function public.can_contact(p_job uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from jobs j where j.id=p_job and (j.owner_id=auth.uid() or is_admin() or (j.selected_provider_id=auth.uid() and is_provider() and j.status in ('matched','submitted'))));
$$;
create function public.is_job_participant(p_job uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from jobs j where j.id=p_job and (j.owner_id=auth.uid() or j.selected_provider_id=auth.uid() or exists(select 1 from successful_matches m where m.job_id=j.id and m.provider_id=auth.uid())));
$$;
alter table public.successful_matches enable row level security;
alter table public.job_events enable row level security;
alter table public.job_cases enable row level security;
alter table public.job_moderation enable row level security;
alter table public.notifications enable row level security;
create policy match_read on public.successful_matches for select to authenticated using(is_verified() and (customer_id=auth.uid() or provider_id=auth.uid() or is_admin()));
create policy events_read on public.job_events for select to authenticated using(is_verified() and (is_job_participant(job_id) or is_admin()));
create policy cases_read on public.job_cases for select to authenticated using(is_verified() and (is_job_participant(job_id) or is_admin()));
create policy moderation_read on public.job_moderation for select to authenticated using(is_verified() and (is_admin() or exists(select 1 from jobs j where j.id=job_id and j.owner_id=auth.uid())));
create policy notifications_read on public.notifications for select to authenticated using(is_verified() and recipient_id=auth.uid());
revoke all on public.successful_matches,public.job_events,public.job_cases,public.job_moderation,public.notifications from public,anon,authenticated;
grant select on public.successful_matches,public.job_events,public.job_cases,public.job_moderation,public.notifications to authenticated;

create function private.emit_notification(p_recipient uuid,p_job uuid,p_kind text,p_title text,p_body text,p_key text,p_email boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 insert into notifications(recipient_id,job_id,kind,title,body,dedupe_key) values(p_recipient,p_job,p_kind,p_title,p_body,p_key) on conflict(dedupe_key) do nothing returning id into v_id;
 if p_email and v_id is not null then insert into private.notification_outbox(notification_id) values(v_id);end if;
end;$$;
create function private.notify_admins(p_job uuid,p_kind text,p_title text,p_body text,p_email boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid;v_test boolean;
begin
 select test_case into v_test from jobs where id=p_job;
 for v_user in select a.user_id from private.admin_users a where exists(select 1 from private.test_users t where t.user_id=a.user_id)=v_test loop
  perform private.emit_notification(v_user,p_job,p_kind,p_title,p_body,p_kind||':'||p_job||':'||v_user,p_email);
 end loop;
end;$$;
create function private.record_job_event(p_job uuid,p_kind text,p_note text default '') returns void language sql security definer set search_path=public,pg_temp as $$
 insert into job_events(job_id,actor_id,kind,note) values(p_job,auth.uid(),p_kind,coalesce(p_note,''));
$$;

-- Keep existing RPC signatures where possible; extend the quote with the agreed service time.
drop function public.offer_quote(uuid,integer,text);
create function public.offer_quote(p_job uuid,p_amount integer,p_note text,p_service_at timestamptz default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_job jobs;v_time timestamptz;
begin
 perform require_member();select * into v_job from jobs where id=p_job for update;
 if not can_match(p_job) then raise exception '此案件不可報價';end if;
 v_time=coalesce(p_service_at,v_job.preferred_at);
 if v_time>now()+interval '180 days' then raise exception '服務時間超過 180 天';end if;
 if (select count(*) from quotes where provider_id=auth.uid() and created_at>now()-interval '1 day')>=20 then raise exception '已達今日報價上限';end if;
 insert into quotes(job_id,provider_id,amount,note,service_at) values(p_job,auth.uid(),p_amount,trim(p_note),v_time);
 perform private.record_job_event(p_job,'quote_offered');
end;$$;
create or replace function public.choose_quote(p_quote uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_quote quotes;v_job jobs;
begin
 perform require_member();select * into v_quote from quotes where id=p_quote;
 if not found then raise exception '報價不存在';end if;
 select * into v_job from jobs where id=v_quote.job_id for update;
 if v_job.owner_id<>auth.uid() or v_job.status<>'open' or v_quote.status<>'offered' then raise exception '無法選擇此報價';end if;
 if not exists(select 1 from provider_applications where user_id=v_quote.provider_id and status='approved') then raise exception '服務者資格已變更';end if;
 update quotes set status=case when id=p_quote then 'selected' else 'rejected' end where job_id=v_job.id and status='offered';
 update jobs set selected_provider_id=v_quote.provider_id,status='awaiting_provider',updated_at=now() where id=v_job.id;
 perform private.record_job_event(v_job.id,'provider_selected');
 perform private.emit_notification(v_quote.provider_id,v_job.id,'accept_request','客戶已選擇你的報價','請開啟案件確認報價及服務時間。確認接單後才算媒合成功。','selection:'||p_quote,false);
end;$$;
create function public.confirm_assignment(p_job uuid,p_accept boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_job jobs;v_quote quotes;
begin
 perform require_member();select * into v_job from jobs where id=p_job for update;
 if v_job.status<>'awaiting_provider' or v_job.selected_provider_id<>auth.uid() or not is_provider() then raise exception '僅選定且已核准的服務者可確認';end if;
 select * into v_quote from quotes where job_id=p_job and provider_id=auth.uid() and status='selected' for update;
 if not found then raise exception '選定的報價不存在';end if;
 if p_accept is distinct from true then
  update quotes set status='offered' where job_id=p_job and status='rejected';update quotes set status='declined' where id=v_quote.id;
  update jobs set status='open',selected_provider_id=null,updated_at=now() where id=p_job;
  perform private.record_job_event(p_job,'provider_declined');
  perform private.emit_notification(v_job.owner_id,p_job,'provider_declined','服務者未接受接單','案件已重新開放，你可選擇其他報價。','declined:'||v_quote.id,false);return;
 end if;
 insert into successful_matches(job_id,customer_id,provider_id,quote_id,amount,quote_note,service_at) values(p_job,v_job.owner_id,auth.uid(),v_quote.id,v_quote.amount,v_quote.note,v_quote.service_at);
 update quotes set status='accepted' where id=v_quote.id;update jobs set status='matched',updated_at=now() where id=p_job;
 perform private.record_job_event(p_job,'matched');
 perform private.notify_admins(p_job,'matched','媒合成功','案件 '||left(p_job::text,8)||' · '||v_job.district||' · 成交報價 NT$ '||v_quote.amount||'。服務者已確認，詳情請登入管理後台。',true);
 perform private.emit_notification(v_job.owner_id,p_job,'matched','服務者已確認接單','媒合成功。請依成交報價與約定時間安排服务，款項由雙方自行結算。','matched:customer:'||p_job,false);
 perform private.emit_notification(auth.uid(),p_job,'matched','接單已確認','媒合成功。完成服務後請回報完工，等待客戶驗收。','matched:provider:'||p_job,false);
end;$$;
create function public.withdraw_quote(p_quote uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_job uuid;
begin
 perform require_member();select job_id into v_job from quotes where id=p_quote;perform 1 from jobs where id=v_job for update;
 update quotes set status='withdrawn' where id=p_quote and provider_id=auth.uid() and status='offered' and exists(select 1 from jobs where id=v_job and status='open');
 if not found then raise exception '只能撤回自己的開放報價';end if;perform private.record_job_event(v_job,'quote_withdrawn');
end;$$;
create or replace function public.submit_completion(p_job uuid,p_note text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_owner uuid;
begin
 perform require_member();select owner_id into v_owner from jobs where id=p_job and selected_provider_id=auth.uid() and status='matched' for update;
 if not found or not is_provider() then raise exception '須確認接單且資格有效才能回報';end if;
 insert into completion_reports(job_id,provider_id,note) values(p_job,auth.uid(),trim(p_note));update jobs set status='submitted',updated_at=now() where id=p_job;
 perform private.record_job_event(p_job,'completion_submitted');
 perform private.emit_notification(v_owner,p_job,'completion','服務者已回報完工','請確認實際服務情況後驗收，或提出爭議。','completion:'||p_job,false);
end;$$;
create or replace function public.accept_completion(p_job uuid,p_feedback text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_member();perform 1 from jobs where id=p_job and owner_id=auth.uid() and status='submitted' for update;
 if not found then raise exception '僅案件客戶可驗收已回報的服務';end if;
 update completion_reports set accepted_at=now(),customer_feedback=p_feedback where job_id=p_job;
 update jobs set status='completed',updated_at=now() where id=p_job;
 perform private.record_job_event(p_job,'completed');insert into audit_events(actor_id,action,subject_id) values(auth.uid(),'job:completed',p_job);
end;$$;
create or replace function public.cancel_job(p_job uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_member();update jobs set status='cancelled',selected_provider_id=null,updated_at=now() where id=p_job and owner_id=auth.uid() and status in ('pending','open','awaiting_provider');
 if not found then raise exception '已媒合案件需提出取消協議';end if;
 update quotes set status='rejected' where job_id=p_job and status in ('offered','selected');perform private.record_job_event(p_job,'cancelled');
end;$$;
create function public.open_job_case(p_job uuid,p_kind text,p_reason text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_job jobs;v_previous text;
begin
 perform require_member();select * into v_job from jobs where id=p_job for update;
 if not is_job_participant(p_job) or v_job.status not in ('matched','submitted','cancellation_requested') or p_kind not in ('cancellation','dispute') then raise exception '此案件無法提出取消或爭議';end if;
 if p_kind='cancellation' and v_job.status='cancellation_requested' then raise exception '已有取消申請';end if;
 v_previous=v_job.status;
 if v_previous='cancellation_requested' then select previous_status into v_previous from job_cases where job_id=p_job;end if;
 insert into job_cases(job_id,kind,opened_by,previous_status,reason) values(p_job,p_kind,auth.uid(),v_previous,trim(p_reason)) on conflict(job_id) do update set kind=excluded.kind,opened_by=excluded.opened_by,previous_status=excluded.previous_status,reason=excluded.reason,state='open',resolution='',opened_at=now(),resolved_at=null;
 update jobs set status=case when p_kind='dispute' then 'disputed' else 'cancellation_requested' end,updated_at=now() where id=p_job;
 perform private.record_job_event(p_job,p_kind||'_opened',trim(p_reason));
 perform private.notify_admins(p_job,p_kind,'案件有取消或爭議申請','請登入案件檢查與處理，私人說明只在站內提供。',false);
end;$$;
create function public.respond_cancellation(p_job uuid,p_accept boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_job jobs;v_case job_cases;
begin
 perform require_member();select * into v_job from jobs where id=p_job for update;select * into v_case from job_cases where job_id=p_job;
 if v_job.status<>'cancellation_requested' or v_case.state<>'open' or v_case.kind<>'cancellation' or not is_job_participant(p_job) or auth.uid()=v_case.opened_by then raise exception '限另一方回覆取消申請';end if;
 update job_cases set state='resolved',resolution=case when p_accept then '雙方同意取消' else '另一方不同意取消' end,resolved_at=now() where job_id=p_job;
 update jobs set status=case when p_accept then 'cancelled' else v_case.previous_status end,selected_provider_id=case when p_accept then null else selected_provider_id end,updated_at=now() where id=p_job;
 perform private.record_job_event(p_job,case when p_accept then 'cancelled' else 'cancellation_declined' end);
end;$$;
create function public.resolve_job_case(p_job uuid,p_outcome text,p_note text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_case job_cases;
begin
 perform require_member();if not is_admin() or p_outcome not in ('cancel','resume') or char_length(trim(p_note))<2 then raise exception '限管理者處理並記錄原因';end if;
 perform 1 from jobs where id=p_job and status in ('disputed','cancellation_requested') for update;if not found then raise exception '案件狀態已變更';end if;
 select * into v_case from job_cases where job_id=p_job and state='open';if not found then raise exception '找不到待處理紀錄';end if;
 update job_cases set state='resolved',resolution=trim(p_note),resolved_at=now() where job_id=p_job;
 update jobs set status=case when p_outcome='cancel' then 'cancelled' else v_case.previous_status end,selected_provider_id=case when p_outcome='cancel' then null else selected_provider_id end,updated_at=now() where id=p_job;
 perform private.record_job_event(p_job,'admin_case_'||p_outcome,trim(p_note));
end;$$;
create function public.mark_notification_read(p_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin perform require_member();update notifications set read_at=coalesce(read_at,now()) where id=p_id and recipient_id=auth.uid();if not found then raise exception '無法操作別人的通知';end if;end;$$;
create function public.admin_metrics() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 perform require_member();if not is_admin() then raise exception '限管理者';end if;
 return jsonb_build_object('jobs',(select count(*) from jobs where not test_case),'quotes',(select count(*) from quotes q join jobs j on j.id=q.job_id where not j.test_case),'matches',(select count(*) from successful_matches m join jobs j on j.id=m.job_id where not j.test_case),'completed',(select count(*) from jobs where not test_case and status='completed'),'cancelled',(select count(*) from jobs where not test_case and status='cancelled'),'disputed',(select count(*) from jobs where not test_case and status='disputed'),'awaiting_provider',(select count(*) from jobs where not test_case and status='awaiting_provider'),'email_pending',(select count(*) from private.notification_outbox where state in ('pending','processing')),'email_failed',(select count(*) from private.notification_outbox where state='failed'));
end;$$;
create function public.admin_job_records(p_status text default '',p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 perform require_member();if not is_admin() then raise exception '限管理者';end if;
 if p_offset<0 or p_offset>100000 then raise exception '頁碼錯誤';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from (select j.id,j.status,j.district,j.category,j.created_at,j.owner_id,j.selected_provider_id,m.amount,m.matched_at,m.service_at,(select count(*) from quotes q where q.job_id=j.id) as quote_count from jobs j left join successful_matches m on m.job_id=j.id where not j.test_case and (p_status='' or j.status=p_status) order by j.created_at desc limit 30 offset p_offset) r),'[]'::jsonb);
end;$$;
create or replace function public.selected_provider_contact(p_job uuid) returns table(display_name text,phone text) language sql stable security definer set search_path=public,pg_temp as $$
 select p.display_name,p.phone from jobs j join profiles p on p.id=j.selected_provider_id join provider_applications a on a.user_id=p.id and a.status='approved' where j.id=p_job and j.owner_id=auth.uid() and is_verified() and j.status in ('matched','submitted');
$$;
create or replace function public.review_job(p_job uuid,p_approve boolean,p_summary text,p_note text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_member();if not is_admin() then raise exception '限管理者';end if;if p_approve and not safe_summary(p_summary) then raise exception '公開需求不能包含個資或高風險工程';end if;
 update jobs set status=case when p_approve then 'open' else 'rejected' end,summary=trim(p_summary),review_note='',updated_at=now() where id=p_job and status='pending';if not found then raise exception '案件狀態已變更';end if;
 insert into job_moderation values(p_job,p_note) on conflict(job_id) do update set review_note=excluded.review_note;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),case when p_approve then 'job:approved' else 'job:rejected' end,p_job);
end;$$;
create or replace function public.stop_job(p_job uuid,p_note text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_member();if not is_admin() then raise exception '限管理者';end if;
 update jobs set status='rejected',review_note='',updated_at=now() where id=p_job and status in ('pending','open');if not found then raise exception '案件狀態已變更';end if;
 insert into job_moderation values(p_job,p_note) on conflict(job_id) do update set review_note=excluded.review_note;
 update quotes set status='rejected' where job_id=p_job;perform private.record_job_event(p_job,'listing_stopped');
end;$$;
-- Tag synthetic cases in the same transaction, and include new active states in limits.
create function private.tag_and_limit_job() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 new.test_case=exists(select 1 from private.test_users where user_id=new.owner_id);
 if (select count(*) from jobs where owner_id=new.owner_id and status in ('pending','open','awaiting_provider','matched','submitted','cancellation_requested','disputed'))>=3 then raise exception '每位會員最多同時刊登 3 個案件';end if;
 return new;
end;$$;
create trigger tag_and_limit_job before insert on public.jobs for each row execute function private.tag_and_limit_job();
revoke execute on all functions in schema private from public,anon,authenticated;
revoke execute on function public.is_job_participant(uuid),public.offer_quote(uuid,integer,text,timestamptz),public.confirm_assignment(uuid,boolean),public.withdraw_quote(uuid),public.open_job_case(uuid,text,text),public.respond_cancellation(uuid,boolean),public.resolve_job_case(uuid,text,text),public.mark_notification_read(uuid),public.admin_metrics(),public.admin_job_records(text,integer) from public,anon;
grant execute on function public.is_job_participant(uuid),public.offer_quote(uuid,integer,text,timestamptz),public.confirm_assignment(uuid,boolean),public.withdraw_quote(uuid),public.open_job_case(uuid,text,text),public.respond_cancellation(uuid,boolean),public.resolve_job_case(uuid,text,text),public.mark_notification_read(uuid),public.admin_metrics(),public.admin_job_records(text,integer) to authenticated;
commit;
