begin;
create function public.selected_provider_contact(p_job uuid) returns table(display_name text,phone text)
language sql stable security definer set search_path=public,pg_temp as $$
 select p.display_name,p.phone from jobs j join profiles p on p.id=j.selected_provider_id
 join provider_applications a on a.user_id=p.id and a.status='approved'
 where j.id=p_job and j.owner_id=auth.uid() and public.is_verified() and j.status in ('assigned','submitted');
$$;
create function public.stop_job(p_job uuid,p_note text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.require_member();
 if not public.is_admin() then raise exception '限管理者停止刊登'; end if;
 update jobs set status='rejected',review_note=p_note,updated_at=now() where id=p_job and status in ('pending','open');
 if not found then raise exception '此案件無法停止刊登，承接中案件需另外處理'; end if;
 update quotes set status='rejected' where job_id=p_job;
 insert into audit_events(actor_id,action,subject_id) values(auth.uid(),'job:stopped',p_job);
end; $$;
revoke execute on function public.selected_provider_contact(uuid),public.stop_job(uuid,text) from public,anon;
grant execute on function public.selected_provider_contact(uuid),public.stop_job(uuid,text) to authenticated;
commit;
