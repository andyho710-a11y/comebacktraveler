import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {sql} from './supabase-cli.mjs';
const ref=process.argv[2];if(ref!=='jqzyduwzcbhylgjlrdvf')throw Error('This rollout is authorized for staging only');
const version=process.argv[3]??'202610150010',files={'202610150010':'staged_privacy','202610150011':'privacy_transition_guards','202610150012':'photo_review_identity'};if(!files[version])throw Error('Unknown privacy migration');
const source=readFileSync('supabase/migrations/'+version+'_'+files[version]+'.sql','utf8'),checksum=createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex');
const exists=sql(ref,"select to_regclass('private.integration_migrations') is not null as present")[0].present;
const applied=exists?sql(ref,`select checksum from private.integration_migrations where version='${version}'`):[];
if(applied.length){if(applied[0].checksum!==checksum)throw Error('Applied migration differs; use a new forward migration');console.log('Identical staging migration already applied.');}
else {
 writeFileSync('work/privacy-apply.sql',source.replace(/commit;\s*$/,`insert into private.integration_migrations(version,checksum) values('${version}','${checksum}');notify pgrst,'reload schema';commit;`));
 try{execFileSync(process.execPath,['C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js','exec','--yes','--package=supabase','--','supabase','db','query','--linked','--project-ref',ref,'--file','work/privacy-apply.sql','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']});}
 catch(e){const error=String(e.stderr??'').replace(/eyJ[\w.-]+|sb_[\w-]+/g,'[redacted]');throw Error(error.slice(-3000)||'SQL file apply failed');}
 console.log('Staging privacy migration committed.');
}
writeFileSync('work/privacy-migration-evidence.json',JSON.stringify({verified_at:new Date().toISOString(),project_ref:ref,version,checksum,applied:true,production_modified:false},null,2));
