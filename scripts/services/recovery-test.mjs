import {createClient} from '@supabase/supabase-js';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {keys} from './supabase-cli.mjs';
const ref='jqzyduwzcbhylgjlrdvf';
const target='https://comeback-traveler-web--services-integration-we1toi2q.web.app/services/account';
const wmux='D:/wmux-0.7.0-win-x64/resources/cli/wmux.js';
const browser=(...args)=>JSON.parse(execFileSync(process.execPath,[wmux,'browser',...args],{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}));
const evaluate=code=>browser('eval',code).result;
const {service,anon}=keys(ref);
const admin=createClient(`https://${ref}.supabase.co`,service,{auth:{persistSession:false,autoRefreshToken:false}});
const email='kh-recovery-ui-'+Date.now()+'@example.invalid';
const original=randomBytes(24).toString('base64url');const updated=randomBytes(24).toString('base64url');
let id;
try{
 const created=await admin.auth.admin.createUser({email,password:original,email_confirm:true});assert.equal(created.error,null);id=created.data.user.id;
 const generated=await admin.auth.admin.generateLink({type:'recovery',email,options:{redirectTo:target}});assert.equal(generated.error,null);
 // Generated fixture URL/password remain in process memory and never enter evidence/output.
 browser('open',generated.data.properties.action_link);
 let ready=false;
 for(let i=0;i<10;i++){
  const state=JSON.parse(evaluate('JSON.stringify({account:location.pathname==="/services/account",passwordVisible:!!document.getElementById("password-section")&&!document.getElementById("password-section").hidden,memberVisible:!!document.getElementById("member-section")&&!document.getElementById("member-section").hidden})'));
  if(state.account&&state.passwordVisible&&state.memberVisible){ready=true;break;}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 assert.equal(ready,true,'Recovery token must produce signed-in session and visible new-password form');
 evaluate(`document.getElementById('new-password').value=${JSON.stringify(updated)};document.getElementById('password-form').requestSubmit();true`);
 let success=false;
 for(let i=0;i<10;i++){
  const text=evaluate('document.getElementById("notice").textContent');
  if(text==='密碼已更新。'){success=true;break;}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 assert.equal(success,true,'Browser must confirm actual password update');
 const login=createClient(`https://${ref}.supabase.co`,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 assert.equal((await login.auth.signInWithPassword({email,password:updated})).error,null);
 await login.auth.signOut();
 const oldLogin=createClient(`https://${ref}.supabase.co`,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 assert.ok((await oldLogin.auth.signInWithPassword({email,password:original})).error,'Previous password must be rejected');
 evaluate('document.getElementById("logout").click();true');
 const evidence={tested_at:new Date().toISOString(),project_ref:ref,passed:true,scope:'Visible browser on deployed staging, synthetic recovery link without email delivery',checks:['Recovery link signs in and reveals new-password form','Browser updates password through real Auth API','New password login succeeds','Previous password login fails'],smtp_delivery_verified:false};
 writeFileSync('work/services-recovery-evidence.json',JSON.stringify(evidence,null,2));
 console.log('Deployed browser recovery flow passed: 4 checks. No email was sent.');
}finally{
 if(id)assert.equal((await admin.auth.admin.deleteUser(id)).error,null,'Synthetic user cleanup');
 browser('open',target);
}
