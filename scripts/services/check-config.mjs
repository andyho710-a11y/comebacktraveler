import {loadEnv} from 'vite';
import {pathToFileURL} from 'node:url';
export function validateServicesConfig(env,production=false){
 const url=env.PUBLIC_SUPABASE_URL,key=env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url&&!key&&!production)return {enabled:false};
 if(!['staging','production'].includes(env.PUBLIC_ENVIRONMENT))throw Error('An explicit services environment is required.');
 const stage=env.PUBLIC_ENVIRONMENT==='staging';
 const expected=stage?'https://jqzyduwzcbhylgjlrdvf.supabase.co':'https://nneammnczvwziggoyzrn.supabase.co';
 if(url!==expected||!key)throw Error('Services must use the existing authorized backend and a public key.');
 if(production&&(stage||env.PUBLIC_PILOT_ENABLED!=='true'))throw Error('Production services configuration is incomplete.');
 if(!key.startsWith('sb_publishable_')){let role;try{role=JSON.parse(Buffer.from(key.split('.')[1],'base64url')).role;}catch{}if(role!=='anon')throw Error('Only an anon or publishable key may enter the frontend.');}
 if(!env.PUBLIC_OPERATOR_NAME||!/^\S+@\S+\.\S+$/.test(env.PUBLIC_PRIVACY_EMAIL??''))throw Error('Services operating contact is required.');
 return {enabled:env.PUBLIC_PILOT_ENABLED==='true',environment:stage?'staging':'production'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 validateServicesConfig({...loadEnv('production',process.cwd(),'PUBLIC_'),...process.env},process.argv.includes('--production'));
 console.log('Services public configuration checked; no private keys were printed.');
}
