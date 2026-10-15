begin;
-- Safety approval belongs to the actual immutable Storage object, not a reusable path.
alter table private.photo_sharing add column object_id uuid references storage.objects(id) on delete cascade;
update private.photo_sharing s set object_id=o.id,safe=false,reviewed_by=null,reviewed_at=null from storage.objects o where o.bucket_id='job-photos' and o.name=s.path;
delete from private.photo_sharing where object_id is null;
alter table private.photo_sharing alter column object_id set not null;
create or replace function public.set_photo_sharing(p_job uuid,p_path text,p_stage text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j jobs;v_object uuid;begin
 perform require_member();select * into j from jobs where id=p_job and owner_id=auth.uid() for update;
 if not found or p_stage is null or p_stage not in ('owner_only','after_match','quote') then raise exception '限客戶管理自己的案件照片';end if;
 select id into v_object from storage.objects o where o.bucket_id='job-photos' and o.name=p_path and o.name like j.owner_id::text||'/'||j.id::text||'/%';if not found then raise exception '照片不存在';end if;
 insert into private.photo_sharing(path,job_id,object_id,stage) values(p_path,p_job,v_object,p_stage) on conflict(path) do update set stage=excluded.stage;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),'privacy:photo_scope:'||p_stage,p_job);
end;$$;
create or replace function public.review_photo(p_job uuid,p_path text,p_safe boolean) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_object uuid;begin
 perform require_member();if not is_admin() or p_safe is null then raise exception '限管理者審核指定案件照片';end if;
 select o.id into v_object from storage.objects o join jobs j on j.id=p_job where o.bucket_id='job-photos' and o.name=p_path and o.name like j.owner_id::text||'/'||j.id::text||'/%';if not found then raise exception '照片不存在';end if;
 insert into private.photo_sharing(path,job_id,object_id,safe,reviewed_by,reviewed_at) values(p_path,p_job,v_object,p_safe,auth.uid(),now()) on conflict(path) do update set object_id=excluded.object_id,safe=excluded.safe,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),case when p_safe then 'privacy:photo_safe' else 'privacy:photo_blocked' end,p_job);
end;$$;
create or replace function private.photo_allowed(p_path text) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare parts text[];j jobs;s private.photo_sharing;v_object uuid;
begin
 if not is_verified() then return false;end if;parts=string_to_array(p_path,'/');if cardinality(parts)<>3 or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' then return false;end if;
 select * into j from jobs where id=parts[2]::uuid and owner_id=parts[1]::uuid;if not found then return false;end if;
 select id into v_object from storage.objects where bucket_id='job-photos' and name=p_path;if not found then return false;end if;
 if j.owner_id=auth.uid() or is_admin() then return true;end if;
 select * into s from private.photo_sharing where path=p_path and job_id=j.id and object_id=v_object;
 if not found or not s.safe or s.stage='owner_only' then return false;end if;
 if private.matched_access(j.id,auth.uid()) then return true;end if;
 if private.active_visit(j.id,auth.uid()) and exists(select 1 from private.site_visit_grants g where g.job_id=j.id and g.provider_id=auth.uid() and g.photos) then return true;end if;
 return s.stage='quote' and can_match(j.id);
exception when invalid_text_representation then return false;
end;$$;
revoke execute on all functions in schema private from public,anon,authenticated;
commit;
