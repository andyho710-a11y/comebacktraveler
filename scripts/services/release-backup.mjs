import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {sql,productionRef,assertRelease} from './release-backend.mjs';
assertRelease(productionRef);mkdirSync('work/release',{recursive:true});
const data={at:new Date().toISOString(),ref:productionRef,scope:'Pre-migration application schemas, functions, grants, policies, triggers and all public/private table rows. Auth and Storage are not mutated by these migrations; their counts and identity metadata are recorded, not credentials.',tables:[],baseline:[]};
data.identity=sql(productionRef,"select id,email,email_confirmed_at from auth.users");
data.photos=sql(productionRef,"select id,name,bucket_id from storage.objects where bucket_id='job-photos'");
assert.equal(data.photos.length,0,'Nonempty Storage requires an additional byte backup before release');
data.columns=sql(productionRef,"select * from information_schema.columns where table_schema in ('public','private') order by table_schema,table_name,ordinal_position");
data.functions=sql(productionRef,"select n.nspname as schema,p.proname,pg_get_function_identity_arguments(p.oid) as args,pg_get_functiondef(p.oid) as definition,p.proacl::text as acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prokind='f' order by n.nspname,p.proname,args");
data.policies=sql(productionRef,"select * from pg_policies where schemaname in ('public','private') or (schemaname='storage' and tablename='objects') order by schemaname,tablename,policyname");
data.grants=sql(productionRef,"select * from information_schema.role_table_grants where table_schema in ('public','private') order by table_schema,table_name,grantee,privilege_type");
data.triggers=sql(productionRef,"select n.nspname as schema,c.relname as table_name,t.tgname,pg_get_triggerdef(t.oid) as definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','private') order by n.nspname,c.relname,t.tgname");
const tables=sql(productionRef,"select schemaname,tablename from pg_tables where schemaname in ('public','private') order by schemaname,tablename");
for(const t of tables){assert.match(t.schemaname,/^(public|private)$/);assert.match(t.tablename,/^[a-z_]+$/);data.tables.push({...t,rows:sql(productionRef,`select coalesce(jsonb_agg(to_jsonb(t)),'[]') as records from ${t.schemaname}.${t.tablename} t`)[0].records});}
for(const name of readdirSync('supabase/baseline').filter(n=>n.endsWith('.sql')).sort())data.baseline.push({name,sql:readFileSync('supabase/baseline/'+name,'utf8')});
assert.equal(data.tables.find(t=>t.tablename==='jobs').rows.length,0,'Existing jobs require dedicated in-flight compatibility review');
// Windows DPAPI binds recovery to the current Windows user. Plaintext exists only in pipes/memory.
const protect=`Add-Type -AssemblyName System.Security; $s=[Console]::In.ReadToEnd(); $b=[Convert]::FromBase64String($s); $e=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($e))`;
const unprotect=protect.replace('::Protect(','::Unprotect(');
const plain=Buffer.from(JSON.stringify(data)),encrypted=Buffer.from(execFileSync('powershell',['-NoProfile','-NonInteractive','-Command',protect],{input:plain.toString('base64'),encoding:'utf8',stdio:['pipe','pipe','pipe'],maxBuffer:32*1024*1024}),'base64');
writeFileSync('work/release/production-before.dpapi',encrypted);
const restored=Buffer.from(execFileSync('powershell',['-NoProfile','-NonInteractive','-Command',unprotect],{input:readFileSync('work/release/production-before.dpapi').toString('base64'),encoding:'utf8',stdio:['pipe','pipe','pipe'],maxBuffer:32*1024*1024}),'base64');assert.ok(plain.equals(restored),'Encrypted backup readback mismatch');
const evidence={verified_at:data.at,project_ref:productionRef,encrypted_backup:'work/release/production-before.dpapi',sha256:createHash('sha256').update(encrypted).digest('hex'),decryption_readback_verified:true,application_table_count:data.tables.length,function_count:data.functions.length,users:data.identity.length,jobs:0,photos:0,scope:data.scope,owner_identity_preserved:true};
writeFileSync('work/release/backup-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
