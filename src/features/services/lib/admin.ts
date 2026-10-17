import {renderProviderReviews} from './provider-review';
import {renderOperations} from './admin-operations';
import {client,enabled,run,check,session,escape,message} from './client';
import {categories} from './catalog';
import {date,money} from './jobs';
const box=document.getElementById('admin-content')!;
async function load(){
 try{await session();}catch{location.replace('/services/account?next=admin');return;}
 const {data:admin}=check(await client!.rpc('is_admin'));if(!admin){box.textContent='目前帳號不是管理者，無法查看營運數據或操作後台。';throw new Error('你沒有管理者權限。');}
 const {data:jobs}=check(await client!.from('jobs').select('*').eq('status','pending').order('created_at').limit(100));
 const {data:open}=check(await client!.from('jobs').select('id,district,summary').eq('status','open').order('created_at').limit(100));

 box.innerHTML='<h2>服務者申請與資格</h2><div id="applications"></div><h2 style="margin-top:32px">待審核案件</h2><div class="job-list" id="pending-jobs"></div>';
 await renderProviderReviews(document.getElementById('applications')!);
 document.getElementById('pending-jobs')!.innerHTML=jobs!.map(j=>`<form class="job-card job-review" data-id="${escape(j.id)}"><span class="tag">${escape(categories[j.category as keyof typeof categories])}</span><h3>${escape(j.district)} · ${escape(date(j.preferred_at))}</h3><p>${money(j.budget_min)} – ${money(j.budget_max)}</p><a class="button secondary small" href="/services/job?id=${encodeURIComponent(j.id)}" target="_blank" rel="noopener">檢查私人資料與照片</a><div class="field" style="margin-top:18px"><label>公開需求（確認無個資、無高風險工程）<textarea name="summary" minlength="10" maxlength="1000" required>${escape(j.summary)}</textarea></label></div><div class="field"><label>審核備註<textarea name="note" maxlength="500"></textarea></label></div><div class="actions"><button class="button small" name="decision" value="yes">核准刊登</button><button class="button secondary small" name="decision" value="no">不核准</button></div></form>`).join('')||'<div class="empty">目前沒有待審核案件。</div>';
 document.querySelectorAll<HTMLFormElement>('.job-review').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const approve=(e.submitter as HTMLButtonElement).value==='yes';const fields=new FormData(form);void run(async()=>{check(await client!.rpc('review_job',{p_job:form.dataset.id,p_approve:approve,p_summary:fields.get('summary'),p_note:fields.get('note')}));message('案件審核已儲存。');await load();});}));
 const active=document.createElement('section');active.innerHTML='<h2 style="margin-top:32px">已刊登案件的安全管理</h2>'+open!.map(j=>`<form class="job-card stop-job" data-id="${escape(j.id)}"><h3>${escape(j.district)}</h3><p>${escape(j.summary)}</p><div class="field"><label>停止刊登原因<input name="note" minlength="2" maxlength="500" required/></label></div><button class="button danger small">停止刊登</button></form>`).join('');box.append(active);
 document.querySelectorAll<HTMLFormElement>('.stop-job').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const note=new FormData(form).get('note');void run(async()=>{check(await client!.rpc('stop_job',{p_job:form.dataset.id,p_note:note}));message('已停止刊登並關閉報價。');await load();});}));
 await renderOperations(box);
}
if(enabled)void run(load);
