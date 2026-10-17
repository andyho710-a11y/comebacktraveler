import {client,enabled,run,message,check} from './client';import {statuses} from './catalog';
const form=document.getElementById('provider-form') as HTMLFormElement,status=document.getElementById('application-status')!,progress=document.getElementById('provider-progress')!;
async function load(){
 const {data,error}=await client!.auth.getUser();
 if(error||!data.user){form.hidden=true;progress.textContent='尚未登入。請先建立會員並驗證 Email，再儲存會員資料，最後提交服務者申請。';return null;}
 const user=data.user;const {data:profile}=check(await client!.from('profiles').select('id').eq('id',user.id).maybeSingle());
 const verified=!!user.email_confirmed_at;
 const {data:app}=verified?check(await client!.from('provider_applications').select('*').eq('user_id',user.id).maybeSingle()):{data:null};
 const {data:qualified}=verified?check(await client!.rpc('is_provider')):{data:false};
 const {data:publicProfile}=verified?check(await client!.from('provider_public').select('user_id').eq('user_id',user.id).maybeSingle()):{data:null};
 const active=qualified&&verified&&profile&&publicProfile;
 progress.textContent=`會員註冊：已完成；Email：${verified?'已驗證':'尚未驗證'}；會員資料：${profile?'已儲存':'尚未儲存'}；服務者申請：${app?'已提交':'尚未提交'}；審核：${app?(statuses[app.status as keyof typeof statuses]??app.status):'尚未開始'}；接案資格：${active?'已生效，可查看其他客戶符合服務範圍的公開案件及報價':'尚未取得，或接案所需資料未完整'}。`;
 form.hidden=!verified||!profile||!!app&&['approved','suspended'].includes(app.status);
 status.hidden=!app;
 if(app){status.textContent=`申請狀態：${statuses[app.status as keyof typeof statuses]}。申請編號：${app.user_id}。最近提交：${app.submitted_at?new Date(app.submitted_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):'舊版未記錄'}。${app.review_note||''}`;}
 if(!profile&&verified)message('Email 已驗證，但尚未儲存會員資料；完成後仍須回到本頁送出申請。');
 return app;
}
form.addEventListener('submit',e=>{e.preventDefault();void run(async()=>{
 const selected=(name:string)=>[...form.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`)].map(e=>e.value);
 if(!selected('category').length||!selected('district').length)throw Error('請至少勾選一個服務類別與行政區。');
 const {data}=check(await client!.rpc('submit_provider_application',{p_name:(document.getElementById('real-name') as HTMLInputElement).value,p_categories:selected('category'),p_districts:selected('district'),p_intro:(document.getElementById('intro') as HTMLTextAreaElement).value,p_consent:(document.getElementById('consent') as HTMLInputElement).checked}));
 if(!data?.ok)throw Error(data?.message??'申請未成功，請重新整理確認，勿視為已提交。');
 const saved=await load();if(!saved||saved.user_id!==data.application_id)throw Error('尚無法確認申請寫入，請重新整理或提供申請編號請管理員查核。');
 message(`申請已確認寫入，等待管理者審核。申請編號：${data.application_id}。核准前尚無接案資格。`);
});});
if(enabled)void load().catch(e=>{form.hidden=true;message(e instanceof Error?e.message:'無法讀取申請狀態，請稍後重新整理。',true);});else form.hidden=true;
