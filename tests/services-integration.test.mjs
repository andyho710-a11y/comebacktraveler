import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateServicesConfig} from '../scripts/services/check-config.mjs';
import {withoutServicesNav} from './helpers/services-nav.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const pages=['account','admin','dashboard','job','jobs','notifications','post','privacy','provider'];
test('exactly ten services pages reuse the completed platform source manifest',()=>{
 assert.deepEqual(readdirSync(new URL('../src/pages/services',import.meta.url)).sort(),[...pages,'index'].map(p=>p+'.astro').sort());
 const manifest=JSON.parse(read('src/features/services/reuse-manifest.json'));assert.equal(manifest.source_repository,'andyho710-a11y/kaohsiung-help');assert.match(manifest.source_revision,/^72bf9d5[a-f0-9]{33}$/);assert.equal(manifest.backend_reused,true);assert.deepEqual(manifest.database_migrations,['202610150010_staged_privacy.sql','202610150011_privacy_transition_guards.sql','202610150012_photo_review_identity.sql','202610170013_provider_review.sql']);assert.equal(manifest.files.length,19);
 for(const file of manifest.files)assert.equal(createHash('sha256').update(read(file.target).replace(/\r\n/g,'\n')).digest('hex'),file.integrated_sha256,file.target);
});
test('service screens do not load travel analytics, affiliate scripts or travel styles',()=>{
 for(const name of ['',...pages]){const html=read(name?'dist/services/'+name+'.html':'dist/services.html');assert.match(html,name?/name="robots" content="noindex,nofollow"/:/name="robots" content="(?:noindex,nofollow|index,follow)"/);if(!name&&html.includes('content="index,follow"'))assert.ok(html.includes('rel="canonical" href="https://comebacktraveler.com/services"'));assert.match(html,/data-services="true"/);assert.doesNotMatch(html,/googletagmanager|google-analytics|adotone|adsbygoogle|BlogLayout\.[^" ]+\.css/);}
});
test('service navigation and account callbacks stay inside the services namespace',()=>{
 for(const name of ['',...pages]){const html=read(name?'dist/services/'+name+'.html':'dist/services.html');const links=[...html.matchAll(/href="(\/[^"]*)"/g)].map(m=>m[1]);for(const link of links)assert.ok(link==='/'||link==='/services'||link.startsWith('/services/')||link.startsWith('/_astro/'),name+': '+link);}
 const account=read('src/pages/services/account.astro');assert.ok(account.includes("const callback = () => location.origin+'/services/account'+(providerIntent?'?next=provider':'')"));assert.ok(account.includes("location.replace('/services/admin')"));assert.ok(read('src/features/services/lib/admin.ts').includes("location.replace('/services/account?next=admin')"));
});
test('service hosting protections are scoped and retain the original travel intake and redirect',()=>{
 const config=JSON.parse(read('firebase.json'));assert.equal(config.hosting.headers.length,3);const h=config.hosting.headers[0];assert.equal(h.source,'/services{,/**,.html}');const fields=Object.fromEntries(h.headers.map(p=>[p.key,p.value]));assert.equal(fields['X-Frame-Options'],'DENY');assert.equal(fields['Cache-Control'],'no-store');assert.equal(fields['Referrer-Policy'],'no-referrer');assert.deepEqual(config.hosting.headers.slice(1),[{source:'/services/**',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'}]},{source:'/services{,/,.html}',headers:[{key:'X-Robots-Tag',value:'index, follow'}]}]);assert.ok(!fields['Content-Security-Policy'].split(';').find(p=>p.includes('script-src')).includes('unsafe-inline'));
 assert.deepEqual(config.hosting.rewrites,[{source:'/api/vietnam-sourcing',function:{functionId:'vietnamSourcingIntake',region:'asia-east1'}}]);assert.deepEqual(config.hosting.redirects,[{source:'/vietnam-jCB-lounge',destination:'/vietnam-jcb-lounge',type:301}]);
});
const key=role=>'e30.'+Buffer.from(JSON.stringify({role})).toString('base64url')+'.signature';
const env={PUBLIC_SUPABASE_URL:'https://jqzyduwzcbhylgjlrdvf.supabase.co',PUBLIC_SUPABASE_PUBLISHABLE_KEY:key('anon'),PUBLIC_ENVIRONMENT:'staging',PUBLIC_PILOT_ENABLED:'true',PUBLIC_OPERATOR_NAME:'測試窗口',PUBLIC_PRIVACY_EMAIL:'test@example.invalid'};
test('public configuration rejects private credentials and unknown backends',()=>{assert.throws(()=>validateServicesConfig({...env,PUBLIC_SUPABASE_PUBLISHABLE_KEY:key('service_role')}));assert.throws(()=>validateServicesConfig({...env,PUBLIC_SUPABASE_URL:'https://unknown.example'}));assert.deepEqual(validateServicesConfig(env),{enabled:true,environment:'staging'});});
test('production build cannot silently use staging or missing service configuration',()=>{assert.throws(()=>validateServicesConfig(env,true));assert.throws(()=>validateServicesConfig({},true));assert.deepEqual(validateServicesConfig({}),{enabled:false});});
test('legacy comparison removes only the exact approved service navigation entry',()=>{const approved='<a href="/services" class="cbt-nav-link" data-astro-cid-rutobish>生活服務</a>';assert.equal(withoutServicesNav('before'+approved+'after'),'beforeafter');for(const changed of [approved.replace('/services','/other'),approved.replace('生活服務','其他內容'),approved.replace('cbt-nav-link','unexpected')])assert.equal(withoutServicesNav(changed),changed);});
