// Production access is explicit, restricted to the existing project, and never logs credentials.
import {cli,parse,keys as stagingKeys,sql as stagingSql} from './supabase-cli.mjs';
import {readFileSync} from 'node:fs';
export const productionRef='nneammnczvwziggoyzrn';
export function assertRelease(ref){if(ref!==productionRef||!process.argv.includes('--production-release'))throw Error('Explicit production release flag and exact project required');}
export function keys(ref){if(ref==='jqzyduwzcbhylgjlrdvf')return stagingKeys(ref);assertRelease(ref);const list=parse(cli(['projects','api-keys','--project-ref',ref,'--reveal','--output','json']));const anon=list.find(k=>k.name==='anon'),service=list.find(k=>k.name==='service_role');if(!anon||!service)throw Error('Expected existing API keys absent');return {anon:anon.api_key??anon.key,service:service.api_key??service.key};}
export function sql(ref,query){if(ref==='jqzyduwzcbhylgjlrdvf')return stagingSql(ref,query);assertRelease(ref);return parse(cli(['db','query','--linked','--project-ref',ref,query,'--output','json'])).rows;}
export function testTarget(ref){if(ref==='jqzyduwzcbhylgjlrdvf')return 'https://comeback-traveler-web--services-integration-we1toi2q.web.app/services';assertRelease(ref);const data=JSON.parse(readFileSync('work/release/preflight-deployment.json'));const base=data.url;const parsed=new URL(base);if(!/^comeback-traveler-web--services-release-[a-z0-9]+\.web\.app$/.test(parsed.hostname)||parsed.protocol!=='https:'||parsed.pathname!=='/')throw Error('Unexpected preflight target');return base.replace(/\/$/,'')+'/services';}
export function evidencePath(ref,name){return ref===productionRef?'work/release/'+name:'work/'+name;}
