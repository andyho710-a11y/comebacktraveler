-- First installation only. Dedicated project; never run against Comeback Traveler.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(display_name) between 2 and 40),
 phone text not null check (phone ~ '^[0-9+() -]{8,24}$'),
 consent_version text not null default '2026-10-14',
 consent_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create table public.provider_applications (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 real_name text not null check (char_length(real_name) between 2 and 40),
 categories text[] not null, districts text[] not null,
 introduction text not null check (char_length(introduction) between 10 and 1000),
 status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
 review_note text not null default '' check (char_length(review_note) <= 500), updated_at timestamptz not null default now()
);
create table public.provider_public (
 user_id uuid primary key references public.provider_applications(user_id) on delete cascade,
 display_name text not null check (char_length(display_name) between 2 and 40),
 categories text[] not null, districts text[] not null,
 bio text not null check (char_length(bio) between 10 and 1000)
);
create table public.jobs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 category text not null check (category in ('cleaning','organizing','furniture','minor')),
 district text not null, preferred_at timestamptz not null,
 budget_min integer not null check (budget_min between 0 and 100000),
 budget_max integer not null check (budget_max between budget_min and 100000),
 summary text not null check (char_length(summary) between 10 and 1000),
 status text not null default 'pending' check (status in ('pending','open','assigned','submitted','completed','rejected','cancelled')),
 selected_provider_id uuid references public.profiles(id),
 review_note text not null default '' check (char_length(review_note) <= 500),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((status in ('assigned','submitted','completed') and selected_provider_id is not null) or (status not in ('assigned','submitted','completed') and selected_provider_id is null))
);
create table public.job_private (
 job_id uuid primary key references public.jobs(id) on delete cascade,
 address text not null check (char_length(address) between 5 and 200),
 contact_name text not null check (char_length(contact_name) between 2 and 40),
 contact_phone text not null check (contact_phone ~ '^[0-9+() -]{8,24}$')
);
create table public.quotes (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id) on delete cascade,
 provider_id uuid not null references public.profiles(id), amount integer not null check (amount between 1 and 100000),
 note text not null check (char_length(note) between 10 and 1000),
 status text not null default 'offered' check (status in ('offered','selected','rejected')),
 created_at timestamptz not null default now(), unique(job_id,provider_id)
);
create table public.completion_reports (
 job_id uuid primary key references public.jobs(id) on delete cascade,
 provider_id uuid not null references public.profiles(id),
 note text not null check (char_length(note) between 10 and 1000), created_at timestamptz not null default now(),
 accepted_at timestamptz, customer_feedback text check (char_length(customer_feedback) <= 1000)
);
create table public.audit_events (
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id),
 action text not null, subject_id uuid not null, created_at timestamptz not null default now()
);
create index jobs_status_category_district on public.jobs(status,category,district);
create index jobs_owner on public.jobs(owner_id);
create index jobs_selected on public.jobs(selected_provider_id);
create index quotes_job on public.quotes(job_id);
create index quotes_provider on public.quotes(provider_id);

create function public.is_admin() returns boolean language sql stable security definer set search_path = public,pg_temp as $$
 select exists(select 1 from private.admin_users where user_id = auth.uid());
$$;
create function public.is_verified() returns boolean language sql stable security definer set search_path = public,pg_temp as $$
 select exists(select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null);
$$;
create function public.is_provider() returns boolean language sql stable security definer set search_path = public,pg_temp as $$
 select exists(select 1 from provider_applications where user_id=auth.uid() and status='approved');
$$;
create function public.can_match(p_job uuid) returns boolean language sql stable security definer set search_path = public,pg_temp as $$
 select exists(select 1 from jobs j join provider_public p on p.user_id=auth.uid()
 join provider_applications a on a.user_id=p.user_id and a.status='approved'
 where j.id=p_job and j.owner_id<>auth.uid() and j.status='open'
 and j.category=any(p.categories) and j.district=any(p.districts));
$$;
create function public.can_contact(p_job uuid) returns boolean language sql stable security definer set search_path = public,pg_temp as $$
 select exists(select 1 from jobs j where j.id=p_job and
 (j.owner_id=auth.uid() or public.is_admin() or
 (j.selected_provider_id=auth.uid() and public.is_provider() and j.status in ('assigned','submitted'))));
$$;
create function public.can_read_job(p_job uuid) returns boolean language sql stable security definer set search_path = public,pg_temp as $$
 select exists(select 1 from jobs j where j.id=p_job and
 (j.owner_id=auth.uid() or public.is_admin() or public.can_match(j.id) or
 (j.selected_provider_id=auth.uid() and public.is_provider() and j.status in ('assigned','submitted','completed'))));
$$;
create function public.valid_areas(p_categories text[],p_districts text[]) returns boolean language sql immutable as $$
 select cardinality(p_categories) between 1 and 4 and cardinality(p_districts) between 1 and 38
 and p_categories <@ array['cleaning','organizing','furniture','minor']::text[]
 and p_districts <@ array['楠梓區','左營區','鼓山區','三民區','鹽埕區','前金區','新興區','苓雅區','前鎮區','旗津區','小港區','鳳山區','鳥松區','仁武區','大社區','大樹區','林園區','大寮區','梓官區','岡山區','橋頭區','燕巢區','田寮區','阿蓮區','路竹區','湖內區','茄萣區','永安區','彌陀區','旗山區','美濃區','六龜區','甲仙區','杉林區','內門區','茂林區','桃源區','那瑪夏區']::text[]
 and array_position(p_categories,null) is null and array_position(p_districts,null) is null;
$$;
create function public.safe_summary(p_text text) returns boolean language sql immutable as $$
 select p_text !~* '(@|https?://|0[0-9][0-9 -]{6,}|(路|街|巷|弄).{0,20}[0-9一二三四五六七八九十]+號|瓦斯|配線|消防|結構|防水|高空|拆除|危險廢棄物|醫療|照護)';
$$;
create function public.require_member() returns void language plpgsql security definer set search_path = public,pg_temp as $$
begin
 if auth.uid() is null or not public.is_verified() then raise exception '請先登入並驗證 Email'; end if;
end; $$;

alter table public.profiles enable row level security;
alter table public.provider_applications enable row level security;
alter table public.provider_public enable row level security;
alter table public.jobs enable row level security;
alter table public.job_private enable row level security;
alter table public.quotes enable row level security;
alter table public.completion_reports enable row level security;
alter table public.audit_events enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
create policy applications_read on public.provider_applications for select to authenticated using (user_id=auth.uid() or public.is_admin());
-- Provider directory is member-only; no indexed personal profiles.
create policy providers_read on public.provider_public for select to authenticated using (public.is_verified());
create policy jobs_read on public.jobs for select to authenticated using (public.is_verified() and public.can_read_job(id));
create policy contacts_read on public.job_private for select to authenticated using (public.is_verified() and public.can_contact(job_id));
create policy quotes_read on public.quotes for select to authenticated using (public.is_verified() and
 (provider_id=auth.uid() or public.is_admin() or exists(select 1 from public.jobs j where j.id=job_id and j.owner_id=auth.uid())));
create policy reports_read on public.completion_reports for select to authenticated using (public.is_verified() and
 (provider_id=auth.uid() or public.is_admin() or exists(select 1 from public.jobs j where j.id=job_id and j.owner_id=auth.uid())));
create policy audit_read on public.audit_events for select to authenticated using (public.is_admin());
revoke all on all tables in schema public from anon,authenticated;
grant select on public.profiles,public.provider_applications,public.provider_public,public.jobs,public.job_private,public.quotes,public.completion_reports,public.audit_events to authenticated;

create function public.save_profile(p_name text,p_phone text,p_consent boolean) returns void language plpgsql security definer set search_path = public,pg_temp as $$
begin
 perform public.require_member();
 if p_consent is distinct from true then raise exception '請閱讀並同意個資告知'; end if;
 insert into profiles(id,display_name,phone) values(auth.uid(),trim(p_name),trim(p_phone))
 on conflict(id) do update set display_name=excluded.display_name,phone=excluded.phone;
end; $$;

create function public.apply_provider(p_name text,p_categories text[],p_districts text[],p_intro text,p_consent boolean) returns void language plpgsql security definer set search_path = public,pg_temp as $$
begin
 perform public.require_member();
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if p_consent is distinct from true or not public.valid_areas(p_categories,p_districts) then raise exception '服務範圍或同意條款不正確'; end if;
 if exists(select 1 from provider_applications where user_id=auth.uid() and status in ('approved','suspended')) then raise exception '已核准或停權資料請聯絡管理者變更'; end if;
 insert into provider_applications(user_id,real_name,categories,districts,introduction)
 values(auth.uid(),trim(p_name),p_categories,p_districts,trim(p_intro))
 on conflict(user_id) do update set real_name=excluded.real_name,categories=excluded.categories,districts=excluded.districts,
 introduction=excluded.introduction,status='pending',review_note='',updated_at=now();
end; $$;

create function public.create_job(p_category text,p_district text,p_time timestamptz,p_min integer,p_max integer,p_summary text,p_address text,p_contact text,p_phone text,p_consent boolean) returns uuid language plpgsql security definer set search_path = public,pg_temp as $$
declare v_id uuid;
begin
 perform public.require_member();
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if p_consent is distinct from true or not public.valid_areas(array[p_category],array[p_district]) or not public.safe_summary(p_summary) then raise exception '請勿刊登聯絡資訊、地址或高風險工程；請確認服務範圍與個資同意'; end if;
 if p_time < now() or p_time > now()+interval '180 days' then raise exception '服務時間必須在未來 180 天內'; end if;
 if (select count(*) from jobs where owner_id=auth.uid() and status in ('pending','open','assigned','submitted')) >= 3 then raise exception '每位會員最多同時刊登 3 個案件'; end if;
 if (select count(*) from jobs where owner_id=auth.uid() and created_at>now()-interval '1 day') >= 5 then raise exception '已達今日刊登上限'; end if;
 insert into jobs(owner_id,category,district,preferred_at,budget_min,budget_max,summary)
 values(auth.uid(),p_category,p_district,p_time,p_min,p_max,trim(p_summary)) returning id into v_id;
 insert into job_private(job_id,address,contact_name,contact_phone) values(v_id,trim(p_address),trim(p_contact),trim(p_phone));
 return v_id;
end; $$;

create function public.review_provider(p_user uuid,p_status text,p_name text,p_bio text,p_note text) returns void language plpgsql security definer set search_path = public,pg_temp as $$
declare v_app provider_applications;
begin
 perform public.require_member();
 if not public.is_admin() then raise exception '限管理者審核'; end if;
 if p_status not in ('approved','rejected','suspended') then raise exception '審核狀態錯誤'; end if;
 select * into v_app from provider_applications where user_id=p_user for update;
 if not found then raise exception '找不到申請'; end if;
 if p_status='approved' then
  if not public.safe_summary(p_name) or not public.safe_summary(p_bio) then raise exception '公開簡介不能包含個資或高風險服務'; end if;
  insert into provider_public(user_id,display_name,categories,districts,bio) values(p_user,trim(p_name),v_app.categories,v_app.districts,trim(p_bio))
  on conflict(user_id) do update set display_name=excluded.display_name,categories=excluded.categories,districts=excluded.districts,bio=excluded.bio;
 else delete from provider_public where user_id=p_user; end if;
 update provider_applications set status=p_status,review_note=p_note,updated_at=now() where user_id=p_user;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),'provider:'||p_status,p_user);
end; $$;

create function public.review_job(p_job uuid,p_approve boolean,p_summary text,p_note text) returns void language plpgsql security definer set search_path = public,pg_temp as $$
begin
 perform public.require_member();
 if not public.is_admin() then raise exception '限管理者審核'; end if;
 if p_approve and not public.safe_summary(p_summary) then raise exception '公開需求不能包含個資或高風險工程'; end if;
 update jobs set status=case when p_approve then 'open' else 'rejected' end,summary=trim(p_summary),review_note=p_note,updated_at=now()
 where id=p_job and status='pending';
 if not found then raise exception '案件狀態已變更，請重新載入'; end if;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),case when p_approve then 'job:approved' else 'job:rejected' end,p_job);
end; $$;

create function public.offer_quote(p_job uuid,p_amount integer,p_note text) returns void language plpgsql security definer set search_path = public,pg_temp as $$
begin
 perform public.require_member();
 perform 1 from jobs where id=p_job for update;
 if not public.can_match(p_job) then raise exception '此案件不在可報價範圍，或已停止報價'; end if;
 if (select count(*) from quotes where provider_id=auth.uid() and created_at>now()-interval '1 day') >= 20 then raise exception '已達今日報價上限'; end if;
 insert into quotes(job_id,provider_id,amount,note) values(p_job,auth.uid(),p_amount,trim(p_note));
end; $$;

create function public.choose_quote(p_quote uuid) returns void language plpgsql security definer set search_path = public,pg_temp as $$
declare v_quote quotes; v_job jobs;
begin
 perform public.require_member();
 select * into v_quote from quotes where id=p_quote;
 if not found then raise exception '報價不存在'; end if;
 select * into v_job from jobs where id=v_quote.job_id for update;
 if v_job.owner_id<>auth.uid() or v_job.status<>'open' or v_quote.status<>'offered' then raise exception '無法選擇此報價'; end if;
 if not exists(select 1 from provider_applications where user_id=v_quote.provider_id and status='approved') then raise exception '服務者審核資格已變更'; end if;
 update quotes set status=case when id=p_quote then 'selected' else 'rejected' end where job_id=v_job.id;
 update jobs set selected_provider_id=v_quote.provider_id,status='assigned',updated_at=now() where id=v_job.id;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),'quote:selected',v_job.id);
end; $$;

create function public.submit_completion(p_job uuid,p_note text) returns void language plpgsql security definer set search_path = public,pg_temp as $$
begin
 perform public.require_member();
 perform 1 from jobs where id=p_job and selected_provider_id=auth.uid() and status='assigned' for update;
 if not found or not public.is_provider() then raise exception '無法回報此案件'; end if;
 insert into completion_reports(job_id,provider_id,note) values(p_job,auth.uid(),trim(p_note));
 update jobs set status='submitted',updated_at=now() where id=p_job;
end; $$;

create function public.accept_completion(p_job uuid,p_feedback text) returns void language plpgsql security definer set search_path = public,pg_temp as $$
begin
 perform public.require_member();
 perform 1 from jobs where id=p_job and owner_id=auth.uid() and status='submitted' for update;
 if not found then raise exception '尚無完工回報或不是此案件客戶'; end if;
 update completion_reports set accepted_at=now(),customer_feedback=p_feedback where job_id=p_job;
 update jobs set status='completed',updated_at=now() where id=p_job;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),'job:completed',p_job);
end; $$;

create function public.cancel_job(p_job uuid) returns void language plpgsql security definer set search_path = public,pg_temp as $$
begin
 perform public.require_member();
 update jobs set status='cancelled',selected_provider_id=null,updated_at=now()
 where id=p_job and owner_id=auth.uid() and status in ('pending','open');
 if not found then raise exception '僅能取消尚未選定服務者的案件，其他狀況請聯絡管理者'; end if;
 update quotes set status='rejected' where job_id=p_job;
end; $$;

create function public.photo_access(p_path text,p_write boolean) returns boolean language plpgsql stable security definer set search_path = public,pg_temp as $$
declare parts text[]; v_job jobs;
begin
 if not public.is_verified() then return false; end if;
 parts=string_to_array(p_path,'/');
 if cardinality(parts)<>3 or parts[1] !~ '^[0-9a-f-]{36}$' or parts[2] !~ '^[0-9a-f-]{36}$' or parts[3] !~ '^[0-9a-f-]{36}\.jpg$' then return false; end if;
 select * into v_job from jobs where id=parts[2]::uuid and owner_id=parts[1]::uuid;
 if not found then return false; end if;
 if p_write then return v_job.owner_id=auth.uid() and v_job.status='pending'; end if;
 return public.can_contact(v_job.id);
exception when invalid_text_representation then return false;
end; $$;

create function public.photo_upload_allowed(p_path text) returns boolean language plpgsql volatile security definer set search_path = public,pg_temp as $$
declare v_prefix text;
begin
 if not public.photo_access(p_path,true) then return false; end if;
 v_prefix=split_part(p_path,'/',1)||'/'||split_part(p_path,'/',2)||'/';
 perform pg_advisory_xact_lock(hashtext(v_prefix));
 return (select count(*) from storage.objects where bucket_id='job-photos' and name like v_prefix||'%')<5;
end; $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('job-photos','job-photos',false,2097152,array['image/jpeg']);
create policy photos_select on storage.objects for select to authenticated using (bucket_id='job-photos' and public.photo_access(name,false));
create policy photos_insert on storage.objects for insert to authenticated with check (
 bucket_id='job-photos' and public.photo_upload_allowed(name)
 and (metadata->>'mimetype')='image/jpeg' and (metadata->>'size')::bigint between 1 and 2097152);
-- No UPDATE/upsert: an uploaded object cannot be replaced or moved to another case.
create policy photos_delete on storage.objects for delete to authenticated using (
 bucket_id='job-photos' and (public.photo_access(name,true) or public.is_admin()));

-- Restrict every RPC to authenticated callers; no public/default EXECUTE.
revoke execute on all functions in schema public from public,anon;
grant execute on all functions in schema public to authenticated;
-- Internal assertion helpers cannot mutate anything and never accept a caller identity.
commit;
