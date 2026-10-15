begin;
-- Match all quote mutations' lock order: job first, then re-read the quote.
-- A concurrent withdrawal must not be selected using an earlier row snapshot.
create or replace function public.choose_quote(p_quote uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_quote quotes;v_job jobs;v_job_id uuid;
begin
 perform require_member();select job_id into v_job_id from quotes where id=p_quote;
 if not found then raise exception '報價不存在';end if;
 select * into v_job from jobs where id=v_job_id for update;
 select * into v_quote from quotes where id=p_quote for update;
 if not found or v_job.owner_id is distinct from auth.uid() or v_job.status is distinct from 'open' or v_quote.status is distinct from 'offered' then raise exception '無法選擇此報價';end if;
 if not exists(select 1 from provider_applications where user_id=v_quote.provider_id and status='approved') then raise exception '服務者資格已變更';end if;
 update quotes set status=case when id=p_quote then 'selected' else 'rejected' end where job_id=v_job.id and status='offered';
 update jobs set selected_provider_id=v_quote.provider_id,status='awaiting_provider',updated_at=now() where id=v_job.id;
 perform private.record_job_event(v_job.id,'provider_selected');
 perform private.emit_notification(v_quote.provider_id,v_job.id,'accept_request','客戶已選擇你的報價','請開啟案件確認報價及服務時間。確認接單後才算媒合成功。','selection:'||p_quote,false);
end;$$;
commit;
