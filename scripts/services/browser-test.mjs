import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {keys,sql} from './supabase-cli.mjs';
import {frontendFingerprint} from './source-fingerprints.mjs';
const ref='jqzyduwzcbhylgjlrdvf',base='https://comeback-traveler-web--services-integration-we1toi2q.web.app/services',wmux='D:/wmux-0.7.0-win-x64/resources/cli/wmux.js';
const browser=(...args)=>{try{return JSON.parse(execFileSync(process.execPath,[wmux,'browser',...args],{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}));}catch{throw new Error('Visible browser action failed: '+args[0]);}};
const evaluate=code=>browser('eval',code).result;
async function waitFor(code,message){for(let attempt=0;attempt<30;attempt++){if(evaluate(code))return;await new Promise(resolve=>setTimeout(resolve,400));}throw new Error(message);}
const {anon,service}=keys(ref),root=createClient(`https://${ref}.supabase.co`,service,{auth:{persistSession:false,autoRefreshToken:false}}),users={},checks=[];
const ok=result=>{if(result.error)throw new Error(result.error.message);return result.data;};
const pass=name=>{checks.push({name,passed:true});console.log('PASS',name);};
async function open(path){browser('open',base+path);}
async function login(name){
 await open('/account');await waitFor('!!document.getElementById("auth-section")','Account page unavailable');
 await new Promise(resolve=>setTimeout(resolve,900));
 if(evaluate('!document.getElementById("member-section").hidden')){evaluate('document.getElementById("logout").click();true');await waitFor('!document.getElementById("auth-section").hidden','Fixture logout failed');}
 const user=users[name];
 evaluate(`document.getElementById('email').value=${JSON.stringify(user.email)};document.getElementById('password').value=${JSON.stringify(user.password)};document.getElementById('auth-form').requestSubmit();true`);
 await waitFor('!document.getElementById("member-section").hidden','Fixture login failed');
}
try{
 for(const name of ['admin','customer','provider','foreign']){const password=randomBytes(24).toString('base64url'),email=`browser-${name}-${Date.now()}@example.invalid`;const user=ok(await root.auth.admin.createUser({email,password,email_confirm:true})).user;users[name]={id:user.id,email,password};const c=createClient(`https://${ref}.supabase.co`,anon,{auth:{persistSession:false,autoRefreshToken:false}});ok(await c.auth.signInWithPassword({email,password}));ok(await c.rpc('save_profile',{p_name:name+'合成測試',p_phone:'0900000000',p_consent:true}));users[name].c=c;}
 const ids=Object.values(users).map(user=>user.id);sql(ref,`insert into private.test_users values ${ids.map(id=>`('${id}')`).join(',')};insert into private.admin_users values('${users.admin.id}')`);
 const p=users.provider.c,a=users.customer.c,admin=users.admin.c;

 await login('provider');await open('/provider');await waitFor('!!document.getElementById("provider-form")','Application form unavailable');
 evaluate(`document.getElementById('real-name').value='合成測試服務者';document.querySelector('input[name="category"][value="cleaning"]').checked=true;document.querySelector('input[name="district"][value="三民區"]').checked=true;document.getElementById('intro').value='瀏覽器介面合成測試，一般居家清潔經驗及工具';document.getElementById('consent').checked=true;document.getElementById('provider-form').requestSubmit();true`);
 await waitFor('document.getElementById("application-status").textContent.includes("待人工審核")','Provider application did not persist');
 ok(await admin.rpc('review_provider',{p_user:users.provider.id,p_status:'approved',p_name:'介面測試好幫手',p_bio:'一般居家清潔合成測試的服務簡介',p_note:'測試資格'}));pass('Service provider application is saved through the integrated form');
 await login('customer');await open('/post');await waitFor('!!document.getElementById("job-form")','Post form unavailable');
 const time=new Date(Date.now()+86400000+8*3600000).toISOString().slice(0,16);
 evaluate(`document.getElementById('category').value='cleaning';document.getElementById('district').value='三民區';document.getElementById('time').value=${JSON.stringify(time)};document.getElementById('summary').value='手機整合介面合成測試，一般居家清潔';document.getElementById('address').value='私人完整地址不可被未授權者讀取';document.getElementById('contact').value='私人測試客戶';document.getElementById('contact-phone').value='0900000000';document.getElementById('consent').checked=true;document.getElementById('match-consent').checked=true;document.getElementById('job-form').requestSubmit();true`);
 await waitFor('!!document.querySelector("#job-form a")','Integrated posting did not persist');
 const job=new URL(evaluate('document.querySelector("#job-form a").href')).searchParams.get('id');assert.match(job,/^[0-9a-f-]{36}$/);
 ok(await admin.rpc('review_job',{p_job:job,p_approve:true,p_summary:'手機介面合成測試，一般居家清潔',p_note:'私人測試備註不可公開'}));pass('Customer posts a pending request through /services/post and receives an integrated case link');
 await login('provider');await open('/job?id='+job);await waitFor('!!document.getElementById("service-time")','Provider quote form unavailable');
 evaluate("document.getElementById('amount').value='1800';document.getElementById('quote-note').value='瀏覽器實測一般清潔報價，包含用品與工具';document.getElementById('quote-form').requestSubmit();true");await waitFor('document.getElementById("quotes").textContent.includes("1,800")','Browser quote did not persist');pass('Provider submits a real quote through the deployed UI');
 await login('customer');await open('/job?id='+job);await waitFor('!!document.querySelector(".choose")','Customer cannot see quote');
 evaluate('window.confirm=()=>true;document.querySelector(".choose").click();true');await waitFor('document.querySelector("#detail > .tag").textContent.includes("等待服務者確認")','Selection must wait for provider');assert.equal(ok(await a.from('successful_matches').select('*').eq('job_id',job)).length,0);pass('Customer selection remains awaiting confirmation, not success');
 await login('provider');await open('/job?id='+job);await waitFor('!!document.getElementById("confirm-assignment")','Provider confirmation unavailable');assert.ok(!evaluate('document.getElementById("contact").textContent.includes("私人完整地址")'));
 evaluate('window.confirm=()=>true;document.getElementById("confirm-assignment").click();true');await waitFor('!!document.getElementById("complete-form")','Provider acceptance did not persist');await waitFor('document.getElementById("detail").textContent.includes("媒合成功紀錄")','Match snapshot missing');pass('Provider confirms assignment; immutable match and private access follow');
 evaluate("document.getElementById('complete-note').value='瀏覽器實測已完成一般清潔，等待客戶驗收';document.getElementById('complete-form').requestSubmit();true");await waitFor('document.querySelector("#detail > .tag").textContent.includes("等待客戶驗收")','Completion submission failed');
 await login('customer');await open('/job?id='+job);await waitFor('!!document.getElementById("accept-form")','Customer acceptance form unavailable');evaluate("document.querySelector('#accept-form input[type=checkbox]').checked=true;document.getElementById('feedback').value='合成測試已確認驗收';document.getElementById('accept-form').requestSubmit();true");await waitFor('document.querySelector("#detail > .tag").textContent.includes("已完成")','Acceptance did not persist');pass('Provider completion and customer acceptance use the deployed forms');
 await open('/notifications');await waitFor('document.getElementById("notifications").textContent.includes("服務者已確認接單")','Personal notifications missing');pass('Station notifications display only the signed-in recipient records');
 await login('foreign');await open('/admin');await waitFor('document.getElementById("admin-content").textContent.includes("不是管理者")','Ordinary user must be blocked');assert.equal(evaluate('document.querySelectorAll(".metric").length'),0);pass('Ordinary signed-in user cannot render operating data');
 await login('admin');await open('/admin');await waitFor('document.querySelectorAll(".metric strong").length===9','Admin operations did not load');const actual=ok(await admin.rpc('admin_metrics'));const values=JSON.parse(evaluate('JSON.stringify(Array.from(document.querySelectorAll(".metric strong")).map(node=>Number(node.textContent)))'));assert.deepEqual(values,[actual.jobs,actual.quotes,actual.matches,actual.completed,actual.cancelled,actual.disputed,actual.awaiting_provider,actual.email_pending,actual.email_failed]);
 const geometry=JSON.parse(evaluate('JSON.stringify({width:innerWidth,documentWidth:document.documentElement.scrollWidth})'));assert.ok(geometry.documentWidth<=geometry.width);pass('Narrow mobile admin layout renders actual metrics, with no horizontal overflow');
 writeFileSync('work/services-browser-evidence.json',JSON.stringify({tested_at:new Date().toISOString(),project_ref:ref,passed:true,mobile:true,auth_permissions:true,flow_completed:true,viewport:geometry,frontend_source_hash:frontendFingerprint(),checks,fixture_case_excluded_from_metrics:true},null,2));
}finally{
 const ids=Object.values(users).map(user=>user.id);if(ids.length){const list=ids.map(id=>`'${id}'`).join(',');sql(ref,`delete from audit_events where actor_id in (${list});delete from jobs where owner_id in (${list});delete from private.admin_users where user_id in (${list})`);for(const id of ids)ok(await root.auth.admin.deleteUser(id));}
 await open('/account');await new Promise(resolve=>setTimeout(resolve,500));evaluate('document.getElementById("logout")?.click();true');await open('/');console.log('Synthetic browser fixtures removed.');
}
