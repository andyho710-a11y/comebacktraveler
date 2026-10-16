begin;
create function private.notify_case_counterparty() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid;v_job jobs;
begin
 if new.state<>'open' then return new;end if;
 if tg_op='UPDATE' and new.opened_at=old.opened_at then return new;end if;
 select * into v_job from jobs where id=new.job_id;
 v_user=case when new.opened_by=v_job.owner_id then v_job.selected_provider_id else v_job.owner_id end;
 if v_user is not null then perform private.emit_notification(v_user,new.job_id,'case_opened','另一方提出取消或爭議','請登入案件查看私人說明與處理進度；取消協議需要另一方回覆。','case:'||new.job_id||':'||new.opened_at||':'||v_user,false);end if;return new;
end;$$;
create trigger notify_case_counterparty after insert or update on public.job_cases for each row execute function private.notify_case_counterparty();
revoke execute on function private.notify_case_counterparty() from public,anon,authenticated;
commit;
