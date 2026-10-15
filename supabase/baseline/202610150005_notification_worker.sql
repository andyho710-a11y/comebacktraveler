begin;
create function public.enqueue_completion_reminders(p_test boolean default false) returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v record;v_round integer;v_user uuid;v_count integer=0;
begin
 for v in select j.id,j.owner_id,j.selected_provider_id,m.service_at from jobs j join successful_matches m on m.job_id=j.id where j.status in ('matched','submitted') and j.test_case=p_test and m.service_at<now()-interval '1 day' loop
  v_round=case when v.service_at<now()-interval '7 days' then 7 when v.service_at<now()-interval '3 days' then 3 else 1 end;
  foreach v_user in array array[v.owner_id,v.selected_provider_id] loop
   perform private.emit_notification(v_user,v.id,'completion_reminder','請更新服務完成情況','預定服務時間已過。服務者請回報完工，客戶請確認驗收；若服務未完成，請於案件提出取消或爭議。','reminder:'||v.id||':'||v_round||':'||v_user,not p_test);
   v_count=v_count+1;
  end loop;
 end loop;return v_count;
end;$$;
create function public.claim_notification_emails() returns table(id uuid,lease_id uuid,email text,kind text,title text,body text,job_id uuid) language plpgsql security definer set search_path=public,pg_temp as $$
declare v_budget integer;v_lease uuid=gen_random_uuid();
begin
 perform pg_advisory_xact_lock(hashtext('kaohsiung-help-notification-claim'));
 update private.notification_outbox o set state='skipped',last_error='no_longer_relevant' from notifications n where n.id=o.notification_id and o.state in ('pending','processing') and ((n.kind='completion_reminder' and not exists(select 1 from jobs j where j.id=n.job_id and j.status in ('matched','submitted'))) or exists(select 1 from private.test_users t where t.user_id=n.recipient_id));
 update private.notification_outbox set state='failed',last_error='retry_limit' where attempts>=5 and (state='pending' or (state='processing' and leased_at<now()-interval '10 minutes'));
 select greatest(0,100-count(*))::integer into v_budget from private.notification_outbox where (state='sent' and sent_at>now()-interval '1 day') or (state='processing' and leased_at>now()-interval '10 minutes');
 if v_budget=0 then return;end if;
 return query with picked as (
  select o.id from private.notification_outbox o where o.attempts<5 and ((o.state='pending' and o.available_at<=now()) or (o.state='processing' and o.leased_at<now()-interval '10 minutes')) order by o.available_at limit least(3,v_budget) for update skip locked
 ),claimed as (
  update private.notification_outbox o set state='processing',attempts=o.attempts+1,lease_id=v_lease,leased_at=now() from picked p where o.id=p.id returning o.id,o.lease_id,o.notification_id
 ) select c.id,c.lease_id,u.email::text,n.kind,n.title,n.body,n.job_id from claimed c join notifications n on n.id=c.notification_id join auth.users u on u.id=n.recipient_id and u.email_confirmed_at is not null;
end;$$;
create function public.finish_notification_email(p_id uuid,p_lease uuid,p_result text,p_error text default '') returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_result not in ('sent','retry','skipped') or p_error !~ '^[a-zA-Z0-9_:-]{0,80}$' then raise exception 'Invalid delivery outcome';end if;
 update private.notification_outbox set state=case when p_result='retry' and attempts>=5 then 'failed' when p_result='retry' then 'pending' else p_result end,sent_at=case when p_result='sent' then now() else sent_at end,available_at=now()+interval '5 minutes'*power(2,least(attempts-1,4)),last_error=p_error where id=p_id and state='processing' and lease_id=p_lease;
 if not found then raise exception 'Delivery lease is invalid or already acknowledged';end if;
end;$$;
create function public.notification_delivery_allowed(p_id uuid,p_lease uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from private.notification_outbox o join notifications n on n.id=o.notification_id join auth.users u on u.id=n.recipient_id where o.id=p_id and o.state='processing' and o.lease_id=p_lease and u.email_confirmed_at is not null and not exists(select 1 from private.test_users t where t.user_id=n.recipient_id) and (n.kind<>'completion_reminder' or exists(select 1 from jobs j where j.id=n.job_id and j.status in ('matched','submitted'))));
$$;
create function public.notification_delivery_probe() returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_admin uuid;v_id uuid;v_key text='probe:'||gen_random_uuid();
begin
 select a.user_id into v_admin from private.admin_users a join auth.users u on u.id=a.user_id where lower(u.email)='andyho710@gmail.com' and u.email_confirmed_at is not null;
 if v_admin is null then raise exception 'Verified operator unavailable';end if;
 perform private.emit_notification(v_admin,null,'delivery_probe','系統寄信測試（不是成交通知）','這是一封通知系統驗收信，不代表任何實際媒合或成交。站內及管理員寄信功能正在驗證。',v_key,true);
 select id into v_id from notifications where dedupe_key=v_key;return v_id;
end;$$;
create function public.admin_email_records() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 perform require_member();if not is_admin() then raise exception '限管理者';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)) from (select n.job_id,n.kind,n.title,o.state,o.attempts,o.sent_at,o.last_error,n.created_at from private.notification_outbox o join notifications n on n.id=o.notification_id where not exists(select 1 from private.test_users t where t.user_id=n.recipient_id) order by n.created_at desc limit 50) r),'[]'::jsonb);
end;$$;
revoke execute on function public.enqueue_completion_reminders(boolean),public.claim_notification_emails(),public.finish_notification_email(uuid,uuid,text,text),public.notification_delivery_allowed(uuid,uuid),public.notification_delivery_probe() from public,anon,authenticated;
grant execute on function public.enqueue_completion_reminders(boolean),public.claim_notification_emails(),public.finish_notification_email(uuid,uuid,text,text),public.notification_delivery_allowed(uuid,uuid),public.notification_delivery_probe() to service_role;
revoke execute on function public.admin_email_records() from public,anon;
grant execute on function public.admin_email_records() to authenticated;
commit;
