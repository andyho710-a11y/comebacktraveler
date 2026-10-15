import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {writeFileSync,mkdirSync,readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {keys,sql} from './supabase-cli.mjs';
const ref=process.argv[2];if(ref!=='jqzyduwzcbhylgjlrdvf')throw Error('Only staging is authorized for integration tests');
const production=ref==='nneammnczvwziggoyzrn'&&process.argv.includes('--production-smoke');
if(ref!=='jqzyduwzcbhylgjlrdvf'&&!production)throw new Error('Only explicitly selected isolated environments are allowed');
const {anon,service}=keys(ref);const url=`https://${ref}.supabase.co`;
const root=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
const clients={},ids=[],results=[];let job,photo;
const ok=(r)=>{if(r.error)throw new Error(r.error.message);return r.data;};
const check=async(name,fn)=>{await fn();results.push({name,passed:true});console.log('PASS',name);};
const rejects=async(p)=>{const r=await p;assert.ok(r.error,'Operation must fail');};
const rows=async(c,table,field,id)=>ok(table==='job_private'?await c.rpc('read_job_contact',{p_job:id}):await c.from(table).select('*').eq(field,id));
async function photoDownload(c,path){const {data:{session}}=await c.auth.getSession();const response=await fetch(url+'/functions/v1/service-private-photo',{method:'POST',headers:{Authorization:'Bearer '+session.access_token,apikey:anon,'Content-Type':'application/json'},body:JSON.stringify({path}),cache:'no-store'});return response.ok?{data:await response.blob(),error:null}:{data:null,error:{message:'Photo access denied: '+response.status}};}
const jpeg=Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdAAB//9k=','base64');
try{
 for(const name of ['admin','alice','bob','cleaner','other','pending']){
  const password=randomBytes(24).toString('base64url');const email=`kh-${name}-${Date.now()}@example.invalid`;
  const user=ok(await root.auth.admin.createUser({email,password,email_confirm:true})).user;ids.push(user.id);
  const c=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  ok(await c.auth.signInWithPassword({email,password}));clients[name]={c,id:user.id};
  ok(await c.rpc('save_profile',{p_name:name+'測試會員',p_phone:'0900000000',p_consent:true}));
 }
 sql(ref,`begin;insert into private.admin_users(user_id) values('${clients.admin.id}') on conflict do nothing;insert into private.test_users(user_id) values ${ids.map(id=>"('"+id+"')").join(',')} on conflict do nothing;commit;`);
 const {c:a,id:alice}=clients.alice,{c:b}=clients.bob,{c:admin}=clients.admin,{c:cleaner}=clients.cleaner,{c:other}=clients.other,{c:pending}=clients.pending;
 for(const name of ['cleaner','other','pending'])ok(await clients[name].c.rpc('apply_provider',{p_name:name+'測試姓名',p_categories:['cleaning'],p_districts:['三民區'],p_intro:'合成測試，一般居家清潔服務範圍',p_consent:true}));
 for(const name of ['cleaner','other'])ok(await admin.rpc('review_provider',{p_user:clients[name].id,p_status:'approved',p_name:name+'測試好幫手',p_bio:'合成測試，提供一般居家清潔服務',p_note:'測試環境人工審核'}));
 job=ok(await a.rpc('create_job',{p_category:'cleaning',p_district:'三民區',p_time:new Date(Date.now()+86400000*3).toISOString(),p_min:1000,p_max:3000,p_summary:'合成測試需求，清潔廚房浴室和地板',p_address:'高雄市三民區合成測試地址',p_contact:'測試客戶',p_phone:'0900000000',p_consent:true}));
 photo=`${alice}/${job}/${crypto.randomUUID()}.jpg`;
 await check('cross-account private profiles and addresses are filtered',async()=>{assert.equal((await rows(b,'profiles','id',alice)).length,0);assert.equal((await rows(b,'job_private','job_id',job)).length,0);assert.equal((await rows(b,'jobs','id',job)).length,0);});
 await check('direct status updates and nonadmin reviews fail',async()=>{await rejects(a.from('jobs').update({status:'open'}).eq('id',job));await rejects(b.rpc('review_job',{p_job:job,p_approve:true,p_summary:'非法升權測試，應被後端拒絕',p_note:''}));});
 await check('real private Storage rejects foreign upload',async()=>{await rejects(b.storage.from('job-photos').upload(photo,jpeg,{contentType:'image/jpeg'}));});
 await check('real Storage gateway rejects disallowed MIME and oversized uploads',async()=>{
  await rejects(a.storage.from('job-photos').upload(`${alice}/${job}/${crypto.randomUUID()}.jpg`,Buffer.from('invalid'),{contentType:'text/plain'}));
  await rejects(a.storage.from('job-photos').upload(`${alice}/${job}/${crypto.randomUUID()}.jpg`,Buffer.alloc(2097153),{contentType:'image/jpeg'}));
 });
 await check('real private Storage accepts owner JPEG and owner download',async()=>{ok(await a.storage.from('job-photos').upload(photo,jpeg,{contentType:'image/jpeg',cacheControl:'0'}));ok(await a.rpc('set_photo_sharing',{p_job:job,p_path:photo,p_stage:'after_match'}));ok(await admin.rpc('review_photo',{p_job:job,p_path:photo,p_safe:true}));const blob=ok(await photoDownload(a,photo));assert.ok(blob.size>0);});
 await check('real private Storage denies other customer and unselected provider',async()=>{await rejects(photoDownload(b,photo));await rejects(photoDownload(cleaner,photo));const listed=ok(await b.storage.from('job-photos').list(`${alice}/${job}`));assert.equal(listed.length,0);});
 await check('unapproved provider cannot view or quote pending/open work',async()=>{assert.equal((await rows(pending,'jobs','id',job)).length,0);await rejects(pending.rpc('offer_quote',{p_job:job,p_amount:1800,p_note:'未核准的服務者不應該可以報價'}));});
 ok(await admin.rpc('review_job',{p_job:job,p_approve:true,p_summary:'合成測試需求，清潔廚房浴室和地板',p_note:'安全範圍與個資已確認'}));
 await check('approved matching provider reads approved job but not contacts',async()=>{assert.equal((await rows(cleaner,'jobs','id',job)).length,1);assert.equal((await rows(cleaner,'job_private','job_id',job)).length,0);});
 ok(await cleaner.rpc('offer_quote',{p_job:job,p_amount:1800,p_note:'測試報價，包含廚房浴室和地板清潔'}));ok(await other.rpc('offer_quote',{p_job:job,p_amount:2000,p_note:'測試報價，提供一般居家清潔工具'}));
 const quotes=ok(await a.from('quotes').select('*').eq('job_id',job));const quote=quotes.find(q=>q.provider_id===clients.cleaner.id).id;
 await check('only quote author, owner and admin can read each quote',async()=>{assert.equal(quotes.length,2);assert.equal((await rows(other,'quotes','id',quote)).length,0);assert.equal((await rows(b,'quotes','id',quote)).length,0);});
 await check('foreign customer cannot select quote',async()=>{await rejects(b.rpc('choose_quote',{p_quote:quote}));});
 ok(await a.rpc('consent_match_sharing',{p_job:job,p_consent:true}));ok(await a.rpc('choose_quote',{p_quote:quote}));
 await check('selection is not success and cannot reveal private data before provider acceptance',async()=>{assert.equal((await rows(a,'jobs','id',job))[0].status,'awaiting_provider');assert.equal((await rows(a,'successful_matches','job_id',job)).length,0);assert.equal((await rows(cleaner,'job_private','job_id',job)).length,0);await rejects(other.rpc('confirm_assignment',{p_job:job,p_accept:true}));await rejects(a.rpc('confirm_assignment',{p_job:job,p_accept:true}));});
 ok(await cleaner.rpc('confirm_assignment',{p_job:job,p_accept:true}));
 await check('provider acceptance creates one immutable snapshot and one private admin notification',async()=>{await rejects(cleaner.rpc('confirm_assignment',{p_job:job,p_accept:true}));const matches=await rows(a,'successful_matches','job_id',job);assert.equal(matches.length,1);assert.equal(matches[0].amount,1800);assert.equal(matches[0].customer_id,alice);const notes=ok(await admin.from('notifications').select('*').eq('job_id',job).eq('kind','matched'));assert.equal(notes.length,1);assert.ok(!notes[0].body.includes('合成測試地址'));assert.equal((await rows(b,'notifications','id',notes[0].id)).length,0);await rejects(b.rpc('admin_metrics'));});
 await check('selection grants chosen provider contact and photo access only',async()=>{assert.equal((await rows(cleaner,'job_private','job_id',job)).length,1);ok(await photoDownload(cleaner,photo));assert.equal((await rows(other,'job_private','job_id',job)).length,0);await rejects(photoDownload(other,photo));});
 await check('customer receives chosen provider contact; other customers cannot',async()=>{assert.equal(ok(await a.rpc('selected_provider_contact',{p_job:job})).length,1);assert.equal(ok(await b.rpc('selected_provider_contact',{p_job:job})).length,0);});
 await check('second selection is rejected',async()=>{await rejects(a.rpc('choose_quote',{p_quote:quote}));});
 await check('completion requires selected provider then job owner acceptance',async()=>{await rejects(other.rpc('submit_completion',{p_job:job,p_note:'非承接者不能夠提交完工回報'}));ok(await cleaner.rpc('submit_completion',{p_job:job,p_note:'合成測試完成廚房浴室地板，等待驗收'}));await rejects(b.rpc('accept_completion',{p_job:job,p_feedback:'非客戶不能驗收'}));ok(await a.rpc('accept_completion',{p_job:job,p_feedback:'合成測試驗收完成'}));});
 await check('completed work revokes fresh provider address and photo requests',async()=>{assert.equal((await rows(cleaner,'job_private','job_id',job)).length,0);const {data:{session}}=await cleaner.auth.getSession();const response=await fetch(url+'/storage/v1/object/authenticated/job-photos/'+photo+'?cacheNonce='+crypto.randomUUID(),{headers:{Authorization:'Bearer '+session.access_token,apikey:anon,'Cache-Control':'no-cache'},cache:'no-store'});console.log('Fresh storage authorization status:',response.status);assert.ok(!response.ok,'New private photo request must be denied');});
 await check('only admin stops published work and shuts down quotes',async()=>{
  const id=ok(await a.rpc('create_job',{p_category:'cleaning',p_district:'三民區',p_time:new Date(Date.now()+86400000*3).toISOString(),p_min:1000,p_max:3000,p_summary:'合成測試需求，驗證管理者停止刊登',p_address:'高雄市三民區合成測試地址',p_contact:'測試客戶',p_phone:'0900000000',p_consent:true}));
  ok(await admin.rpc('review_job',{p_job:id,p_approve:true,p_summary:'合成測試需求，驗證管理者停止刊登',p_note:'測試'}));
  await rejects(b.rpc('stop_job',{p_job:id,p_note:'非管理者不得停止'}));
  ok(await admin.rpc('stop_job',{p_job:id,p_note:'合成安全處理測試'}));
  await rejects(cleaner.rpc('offer_quote',{p_job:id,p_amount:1800,p_note:'停止刊登不得繼續接受報價'}));
 });
 const evidenceFile=production?'docs/production-smoke-evidence.json':'work/services-api-evidence.json';const previous=existsSync(evidenceFile)?JSON.parse(readFileSync(evidenceFile,'utf8')):{};
 mkdirSync('docs',{recursive:true});writeFileSync(production?'docs/production-smoke-evidence.json':'work/services-api-evidence.json',JSON.stringify({...previous,tested_at:new Date().toISOString(),project_ref:ref,passed:true,scope:'Real PostgREST RLS, RPC, password login with synthetic verified fixtures, and private Storage HTTP. Public email delivery is a separate pending gate.',results},null,2));
 console.log((production?'Production smoke':'Staging API')+' tests passed. SMTP proof is preserved separately; synthetic fixtures do not prove email receipt.');
}finally{
 if(photo)ok(await root.storage.from('job-photos').remove([photo]));
 if(ids.length){const literals=ids.map(id=>`'${id}'`).join(',');sql(ref,`delete from audit_events where actor_id in (${literals});delete from jobs where owner_id in (${literals});delete from private.admin_users where user_id in (${literals});`);for(const id of ids)ok(await root.auth.admin.deleteUser(id));}
 console.log('Synthetic fixtures removed.');
}
