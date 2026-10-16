import {createClient} from '@supabase/supabase-js';import {randomUUID} from 'node:crypto';import {writeFileSync,existsSync} from 'node:fs';import {keys,sql} from './supabase-cli.mjs';
const ref=process.argv[2];if(ref!=='jqzyduwzcbhylgjlrdvf')throw Error('Staging only');
const journal='work/privacy-existing-photo-rotation.json';if(existsSync(journal))throw Error('A photo rotation journal already exists; inspect it instead of rotating twice');
const {service}=keys(ref),root=createClient(`https://${ref}.supabase.co`,service,{auth:{persistSession:false}});const ok=r=>{if(r.error)throw Error('Private photo rotation failed');return r.data;};
const objects=sql(ref,"select o.name from storage.objects o where o.bucket_id='job-photos' and not exists(select 1 from private.test_users t where t.user_id::text=split_part(o.name,'/',1)) order by o.name"),moves=[];
if(objects.length!==2)throw Error('Authorization is limited to exactly two existing non-fixture staging photos');
for(const {name} of objects){
 if(!/^([0-9a-f-]{36}\/){2}[0-9a-f-]{36}\.jpg$/.test(name))throw Error('Unexpected legacy path; inspect without exposing it');
 const signed=ok(await root.storage.from('job-photos').createSignedUrl(name,60)).signedUrl;
 const next=name.slice(0,name.lastIndexOf('/')+1)+randomUUID()+'.jpg';ok(await root.storage.from('job-photos').move(name,next));
 moves.push({from:name,to:next});writeFileSync(journal,JSON.stringify({project_ref:ref,moves,complete:false},null,2));
 // Do not read image bytes: only confirm the superseded link is refused.
 const r=await fetch(signed,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});await r.body?.cancel();if(r.ok)throw Error('Legacy signed URL still resolves');
}
writeFileSync(journal,JSON.stringify({project_ref:ref,moves,complete:true,legacy_urls_refused:true,verified_at:new Date().toISOString()},null,2));console.log('Preserved and rotated '+moves.length+' staging photos; old signed links no longer resolve. No private image contents read.');
