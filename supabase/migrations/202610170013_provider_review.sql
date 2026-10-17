begin;
lock table public.provider_applications in share row exclusive mode;
-- Preserve every pre-existing business field. Legacy submission dates were never recorded.
create temporary table provider_before on commit drop as select user_id,md5(to_jsonb(a)::text) as hash from public.provider_applications a;
alter table public.provider_applications add column created_at timestamptz;
alter table public.provider_applications add column submitted_at timestamptz;
alter table public.provider_applications alter column created_at set default now();
alter table public.provider_applications alter column submitted_at set default now();
create table private.provider_events(
 id bigint generated always as identity primary key,
 target_id uuid not null,actor_id uuid references auth.users(id) on delete cascade,
 kind text not null,from_status text,to_status text,outcome text not null check(outcome in ('success','failure')),
 code text not null default '',note text not null default '' check(char_length(note)<=500),created_at timestamptz not null default now()
);
create index provider_events_target on private.provider_events(target_id,id desc);
revoke all on private.provider_events from public,anon,authenticated;
insert into private.provider_events(target_id,actor_id,kind,to_status,outcome,created_at)
 select e.subject_id,e.actor_id,'legacy_reviewed',split_part(e.action,':',2),'success',e.created_at from audit_events e join provider_applications a on a.user_id=e.subject_id where e.action in ('provider:approved','provider:rejected','provider:suspended') order by e.created_at,e.id;
create function private.track_provider_application() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_when='BEFORE' then
  if tg_op='UPDATE' then
   new.created_at=old.created_at;new.submitted_at=old.submitted_at;
   if new.status='pending' and auth.uid()=new.user_id then new.submitted_at=now();end if;
  end if;return new;
 end if;
 insert into private.provider_events(target_id,actor_id,kind,from_status,to_status,outcome,note)
 values(new.user_id,auth.uid(),case when new.status='pending' then 'submitted' else 'reviewed' end,case when tg_op='UPDATE' then old.status end,new.status,'success',new.review_note);
 if new.status='pending' then insert into audit_events(actor_id,action,subject_id) values(auth.uid(),'provider:submitted',new.user_id);end if;
 return new;
end;$$;
create trigger provider_submission_time before update on public.provider_applications for each row execute function private.track_provider_application();
create trigger provider_application_audit after insert or update on public.provider_applications for each row execute function private.track_provider_application();

create function public.submit_provider_application(p_name text,p_categories text[],p_districts text[],p_intro text,p_consent boolean) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare s text;t timestamptz;c text;
begin
 perform require_member();
 begin
  if not exists(select 1 from profiles where id=auth.uid()) then raise exception using errcode='23503',message='會員資料尚未完成';end if;
  perform apply_provider(p_name,p_categories,p_districts,p_intro,p_consent);
  select status,submitted_at into s,t from provider_applications where user_id=auth.uid();
  if s is distinct from 'pending' then raise exception '申請寫入確認失敗';end if;
  return jsonb_build_object('ok',true,'application_id',auth.uid(),'status',s,'submitted_at',t);
 exception when others then
  get stacked diagnostics c=returned_sqlstate;
  insert into private.provider_events(target_id,actor_id,kind,outcome,code) values(auth.uid(),auth.uid(),'submission_failed','failure',c);
  return jsonb_build_object('ok',false,'code',c,'message',case when c='23503' then '請先儲存會員資料，再送出服務者申請。' else '申請未送出，請檢查服務範圍、必填資料與同意欄位；已核准或停權者請聯絡管理員。' end);
 end;
end;$$;

-- Preserve legacy review RPC and its policy: verified administrators may review themselves.
-- This wrapper records authorized failures without committing a partial review.
create function public.review_provider_checked(p_user uuid,p_status text,p_name text,p_bio text,p_note text,p_expected text default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare s text;c text;
begin
 perform require_member();if not is_admin() then raise exception '限管理者審核';end if;
 begin
  select status into s from provider_applications where user_id=p_user for update;
  if not found then raise exception '找不到申請，請重新整理';end if;
  if p_expected is not null and s<>p_expected then raise exception using errcode='40001',message='申請已變更';end if;
  if p_status is null or p_status not in ('approved','rejected','suspended') then raise exception '審核狀態錯誤';end if;
  if s=p_status then
   insert into private.provider_events(target_id,actor_id,kind,from_status,to_status,outcome) values(p_user,auth.uid(),'review_unchanged',s,s,'success');
   return jsonb_build_object('ok',true,'unchanged',true,'status',s,'message','資格狀態未變更，無須重複審核。');end if;
  perform review_provider(p_user,p_status,p_name,p_bio,coalesce(p_note,''));
  if not exists(select 1 from provider_applications where user_id=p_user and status=p_status) then raise exception '審核寫入確認失敗';end if;
  return jsonb_build_object('ok',true,'unchanged',false,'status',p_status,'message','審核已儲存並寫入紀錄。');
 exception when others then
  get stacked diagnostics c=returned_sqlstate;
  insert into private.provider_events(target_id,actor_id,kind,from_status,to_status,outcome,code) values(p_user,auth.uid(),'review_failed',s,p_status,'failure',c);
  return jsonb_build_object('ok',false,'code',c,'message',case when c='40001' then '申請已由其他操作更新，請重新整理後再審核。' else '審核未成功，資格未變更。請確認公開稱呼、簡介及備註格式，或重新整理申請。' end);
 end;
end;$$;

create function public.admin_provider_applications_page(p_status text default 'all',p_limit integer default 20,p_cursor uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;r record;
begin
 perform require_member();if not is_admin() then raise exception '限管理者';end if;
 if p_status is null or p_status not in ('all','pending','approved','rejected','suspended') or p_limit is null or p_limit<1 or p_limit>50 then raise exception '篩選或分頁不正確';end if;
 if p_cursor is not null and not exists(select 1 from provider_applications where user_id=p_cursor and (p_status='all' or status=p_status)) then raise exception '列表已更新，請重新整理第一頁';end if;
 with filtered as materialized (
  select a.*,row_number() over(order by a.submitted_at desc nulls last,a.user_id desc) as seq,
   u.email_confirmed_at is not null as email_verified,p.id is not null as profile_complete,v.user_id is not null as public_provider_present,v.display_name as public_name,v.bio as public_bio,
   array_remove(array[case when u.email_confirmed_at is null then 'Email 尚未驗證' end,case when p.id is null then '會員資料' end,case when char_length(trim(a.real_name))<2 then '真實姓名' end,case when not valid_areas(a.categories,a.districts) then '服務類別或行政區' end,case when char_length(trim(a.introduction))<10 then '服務介紹' end],null) as missing_fields
  from provider_applications a join auth.users u on u.id=a.user_id left join profiles p on p.id=a.user_id left join provider_public v on v.user_id=a.user_id where p_status='all' or a.status=p_status
 ), page as materialized(select * from filtered where seq>coalesce((select seq from filtered where user_id=p_cursor),0) order by seq limit p_limit)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(x)-'seq'||jsonb_build_object('eligible',x.status='approved' and x.email_verified and x.profile_complete and x.public_provider_present and cardinality(x.missing_fields)=0) order by seq) from page x),'[]'::jsonb),'total',(select count(*) from filtered),'counts',(select jsonb_object_agg(status,n) from(select status,count(*) as n from provider_applications group by status)c),'has_more',exists(select 1 from filtered where seq>coalesce((select max(seq) from page),0))) into result;
 for r in select value->>'user_id' as id from jsonb_array_elements(result->'items') loop insert into audit_events(actor_id,action,subject_id) values(auth.uid(),'privacy:provider_application_review',r.id::uuid);end loop;
 return result;
end;$$;

create function public.admin_provider_history(p_user uuid,p_before bigint default null,p_limit integer default 20) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_member();if not is_admin() then raise exception '限管理者';end if;
 if p_limit is null or p_limit<1 or p_limit>50 then raise exception '分頁不正確';end if;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),'privacy:provider_history',p_user);
 return coalesce((select jsonb_agg(to_jsonb(x) order by id desc) from (
  select id,actor_id,kind,from_status,to_status,outcome,code,note,created_at from private.provider_events where target_id=p_user and (p_before is null or id<p_before) order by id desc limit p_limit
 )x),'[]'::jsonb);
end;$$;
revoke execute on function private.track_provider_application() from public,anon,authenticated;
revoke execute on function public.submit_provider_application(text,text[],text[],text,boolean),public.review_provider_checked(uuid,text,text,text,text,text),public.admin_provider_applications_page(text,integer,uuid),public.admin_provider_history(uuid,bigint,integer) from public,anon;
grant execute on function public.submit_provider_application(text,text[],text[],text,boolean),public.review_provider_checked(uuid,text,text,text,text,text),public.admin_provider_applications_page(text,integer,uuid),public.admin_provider_history(uuid,bigint,integer) to authenticated;
do $$begin if exists(select 1 from provider_before b join provider_applications a using(user_id) where b.hash<>md5((to_jsonb(a)-'created_at'-'submitted_at')::text)) then raise exception '既有申請資料不得變更';end if;end;$$;
commit;
