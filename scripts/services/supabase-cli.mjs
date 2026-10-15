import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
export function cli(args){try{return execFileSync(process.execPath,['C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js','exec','--yes','--package=supabase','--','supabase',...args],{encoding:'utf8',maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});}catch{throw new Error('Supabase CLI 操作未完成：'+args.slice(0,2).join(' ')+'。請檢查登入授權與指定專案；原始輸出不顯示以保護憑證。');}}
export function parse(text){const first=text.search(/[\[{]/);if(first<0)throw new Error('Missing JSON');return JSON.parse(text.slice(first));}
export function keys(ref){if(ref!=="jqzyduwzcbhylgjlrdvf")throw Error("Preview tests may only use staging");const list=parse(cli(['projects','api-keys','--project-ref',ref,'--reveal','--output','json']));const anon=list.find(k=>k.name==='anon')??list.find(k=>k.type==='publishable');const service=list.find(k=>k.name==='service_role')??list.find(k=>k.type==='secret');if(!anon||!service)throw new Error('Missing API keys');return {anon:anon.api_key??anon.key,service:service.api_key??service.key};}
export function sql(ref,query){if(ref!=="jqzyduwzcbhylgjlrdvf")throw Error("Preview tests may only use staging");const output=cli(['db','query','--linked','--project-ref',ref,query,'--output','json']);return parse(output).rows;}
if(process.argv[2]==='configure'){
 const ref=process.argv[3];if(!/^[a-z]{20}$/.test(ref))throw new Error('Invalid ref');const key=keys(ref).anon;
 writeFileSync('.env',`PUBLIC_SUPABASE_URL=https://${ref}.supabase.co\nPUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\nPUBLIC_OPERATOR_NAME=andyho710（個人試營運）\nPUBLIC_PRIVACY_EMAIL=andyho710@gmail.com\nPUBLIC_PILOT_ENABLED=false\nPUBLIC_ENVIRONMENT=${ref==='jqzyduwzcbhylgjlrdvf'?'staging':'production'}\n`);
 console.log('Public backend settings stored locally; private keys were not written.');
}
