begin;
create table if not exists private.integration_migrations(version text primary key,checksum text not null,applied_at timestamptz not null default now());
revoke all on private.integration_migrations from public,anon,authenticated;
-- Test rollout only. Existing consents are deliberately NOT inferred/backfilled.
create table private.job_sharing_consents(job_id uuid primary key references public.jobs(id) on delete cascade,owner_id uuid not null references auth.users(id),version text not null default '2026-10-15',consented_at timestamptz not null default now());
create table private.site_visit_grants(job_id uuid references public.jobs(id) on delete cascade,provider_id uuid references auth.users(id) on delete cascade,phone boolean not null,address boolean not null,photos boolean not null,expires_at timestamptz not null,granted_at timestamptz not null default now(),revoked_at timestamptz,primary key(job_id,provider_id));
create table private.photo_sharing(path text primary key,job_id uuid not null references public.jobs(id) on delete cascade,stage text not null default 'owner_only' check(stage in ('owner_only','after_match','quote')),safe boolean not null default false,reviewed_by uuid references auth.users(id),reviewed_at timestamptz);
create table private.privacy_access_log(id bigint generated always as identity primary key,job_id uuid references public.jobs(id) on delete cascade,actor_id uuid references auth.users(id) on delete set null,resource text not null,actor_role text not null,purpose text not null,created_at timestamptz not null default now());
create index privacy_access_job on private.privacy_access_log(job_id,created_at desc);
revoke all on private.job_sharing_consents,private.site_visit_grants,private.photo_sharing,private.privacy_access_log from public,anon,authenticated;

create function private.provider_fits(p_job uuid,p_provider uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from jobs j join provider_public p on p.user_id=p_provider join provider_applications a on a.user_id=p.user_id and a.status='approved' join auth.users u on u.id=p_provider and u.email_confirmed_at is not null where j.id=p_job and j.owner_id<>p_provider and j.category=any(p.categories) and j.district=any(p.districts) and j.test_case=exists(select 1 from private.test_users t where t.user_id=p_provider));
$$;
create function private.active_visit(p_job uuid,p_provider uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from private.site_visit_grants g join jobs j on j.id=g.job_id where g.job_id=p_job and g.provider_id=p_provider and g.revoked_at is null and g.expires_at>now() and j.status in ('open','awaiting_provider') and private.provider_fits(p_job,p_provider));
$$;
create function private.matched_access(p_job uuid,p_provider uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from jobs j join private.job_sharing_consents c on c.job_id=j.id and c.owner_id=j.owner_id join provider_applications a on a.user_id=p_provider and a.status='approved' join successful_matches m on m.job_id=j.id and m.provider_id=p_provider where j.id=p_job and j.selected_provider_id=p_provider and j.status in ('matched','submitted'));
$$;
create function private.log_access(p_job uuid,p_resource text,p_role text,p_purpose text) returns void language sql security definer set search_path=public,pg_temp as $$
 insert into private.privacy_access_log(job_id,actor_id,resource,actor_role,purpose) values(p_job,auth.uid(),p_resource,p_role,p_purpose);
$$;
create function private.admin_purpose(p_purpose text) returns void language plpgsql immutable as $$
begin if p_purpose is null or p_purpose not in ('moderation','dispute','support') then raise exception '管理者查看私人資料須選擇審核、爭議或客服用途';end if;end;$$;

-- Never deliver sensitive customer fields using table SELECT, embeds, or a signed URL.
revoke select on public.job_private from authenticated,anon;
drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() and is_verified());
drop policy applications_read on public.provider_applications;
create policy applications_read on public.provider_applications for select to authenticated using(user_id=auth.uid() and is_verified());
drop policy photos_select on storage.objects;
-- No SELECT policy on this bucket: authenticated download, list, transforms and
-- signed-URL creation all fail. All byte reads use the audited streaming function.

create or replace function public.can_contact(p_job uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select is_verified() and exists(select 1 from jobs j where j.id=p_job and (j.owner_id=auth.uid() or is_admin() or private.matched_access(p_job,auth.uid()) or private.active_visit(p_job,auth.uid())));
$$;
create or replace function public.can_read_job(p_job uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from jobs j where j.id=p_job and (j.owner_id=auth.uid() or is_admin() or can_match(j.id) or private.active_visit(j.id,auth.uid()) or (j.selected_provider_id=auth.uid() and is_provider() and j.status in ('awaiting_provider','matched','submitted','cancellation_requested','disputed'))));
$$;
create or replace function public.is_job_participant(p_job uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from jobs j where j.id=p_job and (j.owner_id=auth.uid() or (j.selected_provider_id=auth.uid() and is_provider() and j.status in ('awaiting_provider','matched','submitted','cancellation_requested','disputed'))));
$$;
drop policy reports_read on public.completion_reports;
create policy reports_read on public.completion_reports for select to authenticated using(is_verified() and (is_admin() or exists(select 1 from jobs j where j.id=job_id and (j.owner_id=auth.uid() or (j.selected_provider_id=auth.uid() and j.status in ('matched','submitted','cancellation_requested','disputed'))))));

create function public.consent_match_sharing(p_job uuid,p_consent boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_member();perform 1 from jobs where id=p_job and owner_id=auth.uid() for update;if not found then raise exception '限案件客戶管理同意';end if;
 if p_consent is true then insert into private.job_sharing_consents(job_id,owner_id) values(p_job,auth.uid()) on conflict(job_id) do update set consented_at=now(),version='2026-10-15';
 else delete from private.job_sharing_consents where job_id=p_job;end if;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),case when p_consent is true then 'privacy:match_consent' else 'privacy:match_consent_revoked' end,p_job);
end;$$;
create function private.guard_sharing_transition() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status in ('awaiting_provider','matched') and (new.status is distinct from old.status or new.selected_provider_id is distinct from old.selected_provider_id) and not exists(select 1 from private.job_sharing_consents c where c.job_id=new.id and c.owner_id=new.owner_id) then raise exception '客戶須先明確同意接單成功後分享電話及施工地址';end if;
 if new.status is distinct from old.status or new.selected_provider_id is distinct from old.selected_provider_id then update private.site_visit_grants set revoked_at=coalesce(revoked_at,now()) where job_id=new.id;end if;
 return new;
end;$$;
create trigger guard_sharing_transition before update of status,selected_provider_id on public.jobs for each row execute function private.guard_sharing_transition();

create function public.read_job_contact(p_job uuid,p_purpose text default '') returns table(contact_name text,contact_phone text,address text) language plpgsql security definer set search_path=public,pg_temp as $$
declare j jobs;g private.site_visit_grants;r text;
begin
 perform require_member();select * into j from jobs where id=p_job;
 if not found then return;end if;
 if j.owner_id=auth.uid() then r='owner';
 elsif is_admin() then perform private.admin_purpose(p_purpose);r='admin';
 elsif private.matched_access(p_job,auth.uid()) then r='matched';
 elsif private.active_visit(p_job,auth.uid()) then select * into g from private.site_visit_grants where job_id=p_job and provider_id=auth.uid();if not g.phone and not g.address then return;end if;r='site_visit';
 else return;end if;
 perform private.log_access(p_job,'contact',r,case when r='admin' then p_purpose else r end);
 return query select case when r in ('owner','admin') then p.contact_name else null end,case when r<>'site_visit' or g.phone then p.contact_phone else null end,case when r<>'site_visit' or g.address then p.address else null end from job_private p where p.job_id=p_job;
end;$$;
create or replace function public.selected_provider_contact(p_job uuid) returns table(display_name text,phone text) language plpgsql volatile security definer set search_path=public,pg_temp as $$
begin
 perform require_member();if not exists(select 1 from jobs j where j.id=p_job and j.owner_id=auth.uid() and private.matched_access(p_job,j.selected_provider_id)) then return;end if;
 perform private.log_access(p_job,'provider_contact','owner','service');
 return query select p.display_name,p.phone from jobs j join profiles p on p.id=j.selected_provider_id where j.id=p_job;
end;$$;

create function public.site_visit_candidates(p_job uuid) returns table(user_id uuid,display_name text) language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_member();if not exists(select 1 from jobs where id=p_job and owner_id=auth.uid() and status in ('open','awaiting_provider')) then return;end if;
 return query select p.user_id,p.display_name from provider_public p where private.provider_fits(p_job,p.user_id) order by p.display_name,p.user_id limit 100;
end;$$;
create function public.set_site_visit_grant(p_job uuid,p_provider uuid,p_phone boolean,p_address boolean,p_photos boolean,p_hours integer,p_consent boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_member();perform 1 from jobs where id=p_job and owner_id=auth.uid() and status in ('open','awaiting_provider') for update;
 if not found or not private.provider_fits(p_job,p_provider) or p_consent is distinct from true or p_hours is null or p_hours<1 or p_hours>48 or not (coalesce(p_phone,false) or coalesce(p_address,false) or coalesce(p_photos,false)) then raise exception '須由客戶同意、指定符合條件的服務者、資料範圍與 1–48 小時期限';end if;
 insert into private.site_visit_grants(job_id,provider_id,phone,address,photos,expires_at) values(p_job,p_provider,p_phone,p_address,p_photos,now()+make_interval(hours=>p_hours)) on conflict(job_id,provider_id) do update set phone=excluded.phone,address=excluded.address,photos=excluded.photos,expires_at=excluded.expires_at,granted_at=now(),revoked_at=null;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),'privacy:site_visit_granted',p_job);
end;$$;
create function public.revoke_site_visit_grant(p_job uuid,p_provider uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_member();perform 1 from jobs where id=p_job and owner_id=auth.uid() for update;if not found then raise exception '限案件客戶撤回勘查授權';end if;
 update private.site_visit_grants set revoked_at=coalesce(revoked_at,now()) where job_id=p_job and provider_id=p_provider;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),'privacy:site_visit_revoked',p_job);
end;$$;
create function public.job_privacy_state(p_job uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare j jobs;begin
 perform require_member();select * into j from jobs where id=p_job;if not found or not can_read_job(p_job) then raise exception '無法查看';end if;
 return jsonb_build_object('owner',j.owner_id=auth.uid(),'admin',is_admin(),'match_consent',exists(select 1 from private.job_sharing_consents where job_id=p_job),'matched_access',private.matched_access(p_job,auth.uid()),'site_visit',private.active_visit(p_job,auth.uid()),'grants',case when j.owner_id=auth.uid() then coalesce((select jsonb_agg(jsonb_build_object('provider_id',g.provider_id,'display_name',p.display_name,'phone',g.phone,'address',g.address,'photos',g.photos,'expires_at',g.expires_at,'active',g.revoked_at is null and g.expires_at>now() and j.status in ('open','awaiting_provider'))) from private.site_visit_grants g left join provider_public p on p.user_id=g.provider_id where g.job_id=p_job),'[]'::jsonb) else '[]'::jsonb end);
end;$$;

create function private.photo_allowed(p_path text) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare parts text[];j jobs;s private.photo_sharing;
begin
 if not is_verified() then return false;end if;parts=string_to_array(p_path,'/');if cardinality(parts)<>3 or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' then return false;end if;
 select * into j from jobs where id=parts[2]::uuid and owner_id=parts[1]::uuid;if not found then return false;end if;
 if j.owner_id=auth.uid() or is_admin() then return true;end if;
 select * into s from private.photo_sharing where path=p_path and job_id=j.id;
 if not found or not s.safe or s.stage='owner_only' then return false;end if;
 if private.matched_access(j.id,auth.uid()) then return true;end if;
 if private.active_visit(j.id,auth.uid()) and exists(select 1 from private.site_visit_grants g where g.job_id=j.id and g.provider_id=auth.uid() and g.photos) then return true;end if;
 return s.stage='quote' and can_match(j.id);
exception when invalid_text_representation then return false;
end;$$;
create function public.set_photo_sharing(p_job uuid,p_path text,p_stage text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j jobs;begin
 perform require_member();select * into j from jobs where id=p_job and owner_id=auth.uid() for update;
 if not found or p_stage not in ('owner_only','after_match','quote') or not exists(select 1 from storage.objects o where o.bucket_id='job-photos' and o.name=p_path and o.name like j.owner_id::text||'/'||j.id::text||'/%') then raise exception '限客戶管理自己的案件照片';end if;
 insert into private.photo_sharing(path,job_id,stage) values(p_path,p_job,p_stage) on conflict(path) do update set stage=excluded.stage;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),'privacy:photo_scope:'||p_stage,p_job);
end;$$;
create function public.review_photo(p_job uuid,p_path text,p_safe boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform require_member();if not is_admin() or p_safe is null or not exists(select 1 from storage.objects o join jobs j on j.id=p_job where o.bucket_id='job-photos' and o.name=p_path and o.name like j.owner_id::text||'/'||j.id::text||'/%') then raise exception '限管理者審核指定案件照片';end if;
 insert into private.photo_sharing(path,job_id,safe,reviewed_by,reviewed_at) values(p_path,p_job,p_safe,auth.uid(),now()) on conflict(path) do update set safe=excluded.safe,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),case when p_safe then 'privacy:photo_safe' else 'privacy:photo_blocked' end,p_job);
end;$$;
create function public.list_job_photos(p_job uuid,p_purpose text default '') returns table(path text,stage text,safe boolean) language plpgsql security definer set search_path=public,pg_temp as $$
declare j jobs;begin
 perform require_member();select * into j from jobs where id=p_job;if not found or not can_read_job(p_job) then return;end if;
 if is_admin() and j.owner_id<>auth.uid() then perform private.admin_purpose(p_purpose);end if;
 return query select o.name,coalesce(s.stage,'owner_only'),coalesce(s.safe,false) from storage.objects o left join private.photo_sharing s on s.path=o.name where o.bucket_id='job-photos' and o.name like j.owner_id::text||'/'||j.id::text||'/%' and private.photo_allowed(o.name) order by o.created_at,o.name limit 5;
end;$$;
create function public.authorize_private_photo(p_path text,p_purpose text default '') returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare j jobs;r text;begin
 perform require_member();if not private.photo_allowed(p_path) then return false;end if;
 select * into j from jobs where id=split_part(p_path,'/',2)::uuid;
 if j.owner_id=auth.uid() then r='owner';elsif is_admin() then perform private.admin_purpose(p_purpose);r='admin';elsif private.matched_access(j.id,auth.uid()) then r='matched';elsif private.active_visit(j.id,auth.uid()) then r='site_visit';else r='quote';end if;
 perform private.log_access(j.id,'photo:'||split_part(p_path,'/',3),r,case when r='admin' then p_purpose else r end);return true;
end;$$;

-- Existing admin reviews retain access through audited, bounded RPCs.
create function public.admin_provider_applications() returns setof public.provider_applications language plpgsql security definer set search_path=public,pg_temp as $$
declare a provider_applications;begin perform require_member();if not is_admin() then raise exception '限管理者';end if;
 for a in select * from provider_applications order by updated_at desc limit 100 loop insert into audit_events(actor_id,action,subject_id) values(auth.uid(),'privacy:provider_application_review',a.user_id);return next a;end loop;
end;$$;
create function public.admin_provider_contact(p_user uuid,p_purpose text) returns table(display_name text,phone text) language plpgsql security definer set search_path=public,pg_temp as $$
begin perform require_member();if not is_admin() then raise exception '限管理者';end if;perform private.admin_purpose(p_purpose);
 if not exists(select 1 from provider_applications where user_id=p_user) then return;end if;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),'privacy:provider_contact:'||p_purpose,p_user);
 return query select p.display_name,p.phone from profiles p where p.id=p_user;
end;$$;
create function public.privacy_access_records(p_job uuid) returns table(actor_id uuid,resource text,actor_role text,purpose text,created_at timestamptz) language plpgsql security definer set search_path=public,pg_temp as $$
begin perform require_member();if not is_admin() and not exists(select 1 from jobs where id=p_job and owner_id=auth.uid()) then raise exception '限案件客戶或管理者';end if;
 return query select l.actor_id,l.resource,l.actor_role,l.purpose,l.created_at from private.privacy_access_log l where l.job_id=p_job order by l.id desc limit 100;
end;$$;
revoke execute on all functions in schema private from public,anon,authenticated;
revoke execute on function public.consent_match_sharing(uuid,boolean),public.read_job_contact(uuid,text),public.site_visit_candidates(uuid),public.set_site_visit_grant(uuid,uuid,boolean,boolean,boolean,integer,boolean),public.revoke_site_visit_grant(uuid,uuid),public.job_privacy_state(uuid),public.set_photo_sharing(uuid,text,text),public.review_photo(uuid,text,boolean),public.list_job_photos(uuid,text),public.authorize_private_photo(text,text),public.admin_provider_applications(),public.admin_provider_contact(uuid,text),public.privacy_access_records(uuid) from public,anon;
grant execute on function public.consent_match_sharing(uuid,boolean),public.read_job_contact(uuid,text),public.site_visit_candidates(uuid),public.set_site_visit_grant(uuid,uuid,boolean,boolean,boolean,integer,boolean),public.revoke_site_visit_grant(uuid,uuid),public.job_privacy_state(uuid),public.set_photo_sharing(uuid,text,text),public.review_photo(uuid,text,boolean),public.list_job_photos(uuid,text),public.authorize_private_photo(text,text),public.admin_provider_applications(),public.admin_provider_contact(uuid,text),public.privacy_access_records(uuid) to authenticated;
commit;
