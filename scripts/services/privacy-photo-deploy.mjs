import {cli} from './supabase-cli.mjs';import {writeFileSync} from 'node:fs';
const ref=process.argv[2];if(ref!=='jqzyduwzcbhylgjlrdvf')throw Error('Staging only');
// The gateway validates the user JWT with Auth and authorization with the RPC
// before any service-role Storage read. Platform JWT verification stays enabled.
cli(['functions','deploy','service-private-photo','--project-ref',ref,'--use-api']);
writeFileSync('work/privacy-function-deployment.json',JSON.stringify({deployed_at:new Date().toISOString(),project_ref:ref,function:'service-private-photo',auth:'Auth user validation plus audited permission RPC before streaming',staging_only:true},null,2));console.log('Staging photo function deployment completed.');
