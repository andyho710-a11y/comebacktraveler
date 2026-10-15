begin;
create or replace function public.admin_job_records(p_status text default '',p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 perform require_member();if not is_admin() then raise exception '限管理者';end if;if p_offset<0 or p_offset>100000 then raise exception '頁碼錯誤';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from (select j.id,j.status,j.district,j.category,j.created_at,j.owner_id,coalesce(m.provider_id,j.selected_provider_id) as selected_provider_id,m.amount,m.matched_at,m.service_at,(select count(*) from quotes q where q.job_id=j.id) as quote_count from jobs j left join successful_matches m on m.job_id=j.id where not j.test_case and (p_status='' or j.status=p_status) order by j.created_at desc limit 30 offset p_offset) r),'[]'::jsonb);
end;$$;
create function public.admin_schedule_status() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 perform require_member();if not is_admin() then raise exception '限管理者';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from (select j.jobname,j.schedule,j.active,(select d.status from cron.job_run_details d where d.jobid=j.jobid order by d.runid desc limit 1) as last_status from cron.job j where j.jobname in ('matching-completion-reminders','matching-email-dispatch')) r),'[]'::jsonb);
end;$$;
revoke execute on function public.admin_schedule_status() from public,anon;
grant execute on function public.admin_schedule_status() to authenticated;
revoke all on schema cron,net,vault from public,anon,authenticated;
revoke all on all tables in schema cron,net,vault from public,anon,authenticated;
commit;
