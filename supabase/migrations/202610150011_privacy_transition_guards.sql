begin;
-- Table reads remain denied even if a later generic grant restores SELECT.
drop policy contacts_read on public.job_private;
create policy contacts_read on public.job_private for select to authenticated using(false);
create or replace function private.guard_sharing_transition() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 -- Gate a new selection/initial acceptance, not an admin resolving a dispute.
 -- Resumed jobs still cannot share data after consent was withdrawn.
 if ((new.status='awaiting_provider' and (new.status is distinct from old.status or new.selected_provider_id is distinct from old.selected_provider_id)) or (new.status='matched' and old.status='awaiting_provider')) and not exists(select 1 from private.job_sharing_consents c where c.job_id=new.id and c.owner_id=new.owner_id) then raise exception '客戶須先明確同意接單成功後分享電話及施工地址';end if;
 if new.status is distinct from old.status or new.selected_provider_id is distinct from old.selected_provider_id then update private.site_visit_grants set revoked_at=coalesce(revoked_at,now()) where job_id=new.id;end if;
 return new;
end;$$;
create or replace function private.photo_allowed(p_path text) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare parts text[];j jobs;s private.photo_sharing;
begin
 if not is_verified() then return false;end if;parts=string_to_array(p_path,'/');if cardinality(parts)<>3 or p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' then return false;end if;
 select * into j from jobs where id=parts[2]::uuid and owner_id=parts[1]::uuid;if not found or not exists(select 1 from storage.objects where bucket_id='job-photos' and name=p_path) then return false;end if;
 if j.owner_id=auth.uid() or is_admin() then return true;end if;
 select * into s from private.photo_sharing where path=p_path and job_id=j.id;
 if not found or not s.safe or s.stage='owner_only' then return false;end if;
 if private.matched_access(j.id,auth.uid()) then return true;end if;
 if private.active_visit(j.id,auth.uid()) and exists(select 1 from private.site_visit_grants g where g.job_id=j.id and g.provider_id=auth.uid() and g.photos) then return true;end if;
 return s.stage='quote' and can_match(j.id);
exception when invalid_text_representation then return false;
end;$$;
revoke execute on all functions in schema private from public,anon,authenticated;
commit;
