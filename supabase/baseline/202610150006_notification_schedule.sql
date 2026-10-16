begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
create table private.notification_runtime(id boolean primary key default true check(id),project_url text not null,configured_at timestamptz not null default now());
create function private.dispatch_notification_worker() returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare v_url text;v_secret text;v_id bigint;
begin
 select project_url into v_url from private.notification_runtime where id;
 select decrypted_secret into v_secret from vault.decrypted_secrets where name='matching_notification_worker';
 if v_url is null or v_secret is null then raise exception 'Notification worker is not configured';end if;
 select net.http_post(url:=v_url||'/functions/v1/notification-dispatch',headers:=jsonb_build_object('Content-Type','application/json','X-Worker-Key',v_secret),body:='{}'::jsonb,timeout_milliseconds:=120000) into v_id;return v_id;
end;$$;
create function public.configure_notification_schedule(p_url text,p_worker_key text) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_secret_id uuid;v_job bigint;
begin
 if p_url not in ('https://jqzyduwzcbhylgjlrdvf.supabase.co','https://nneammnczvwziggoyzrn.supabase.co') or p_worker_key !~ '^[a-f0-9]{64}$' then raise exception 'Invalid isolated worker configuration';end if;
 select id into v_secret_id from vault.secrets where name='matching_notification_worker';
 if v_secret_id is null then perform vault.create_secret(p_worker_key,'matching_notification_worker');else perform vault.update_secret(v_secret_id,p_worker_key,'matching_notification_worker');end if;
 insert into private.notification_runtime(id,project_url) values(true,p_url) on conflict(id) do update set project_url=excluded.project_url,configured_at=now();
 for v_job in select jobid from cron.job where jobname in ('matching-completion-reminders','matching-email-dispatch') loop perform cron.unschedule(v_job);end loop;
 perform cron.schedule('matching-completion-reminders','0 * * * *','select public.enqueue_completion_reminders(false)');
 perform cron.schedule('matching-email-dispatch','* * * * *','select private.dispatch_notification_worker()');
end;$$;
create function public.dispatch_notification_probe() returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
begin return private.dispatch_notification_worker();end;$$;
revoke all on schema cron,net,vault from anon,authenticated;
revoke all on all tables in schema cron,net,vault from anon,authenticated;
revoke execute on all functions in schema private from public,anon,authenticated;
revoke execute on function public.configure_notification_schedule(text,text),public.dispatch_notification_probe() from public,anon,authenticated;
grant execute on function public.configure_notification_schedule(text,text),public.dispatch_notification_probe() to service_role;
commit;
