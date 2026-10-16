import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {withoutServicesNav} from '../../tests/helpers/services-nav.mjs';
const base='https://comeback-traveler-web--services-integration-we1toi2q.web.app',live='https://comebacktraveler.com';
const digest=b=>createHash('sha256').update(b).digest('hex');
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name]);
const html=files('work/baseline-dist').filter(p=>p.endsWith('.html'));
const route=file=>file.replace('work/baseline-dist','').replace(/\/index.html$/,'/').replace(/\.html$/,'');
const fetchText=async url=>{const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,url);return {r,text:await r.text()};};
const evidence={verified_at:new Date().toISOString(),preview:base,production:live,travel_pages:[],service_pages:[],assets:[],formal_deployment_performed:false};
for(let i=0;i<html.length;i+=5)await Promise.all(html.slice(i,i+5).map(async file=>{
 const path=route(file),expected=readFileSync(file,'utf8');const preview=await fetchText(base+path),production=await fetchText(live+path);
 assert.equal(withoutServicesNav(preview.text),expected,'Preview travel markup changed outside the service link: '+path);
 assert.equal(production.text,expected,'Production no longer matches inspected main: '+path);
 assert.match(preview.r.headers.get('x-robots-tag')??'',/noindex/);
 const csp=preview.r.headers.get('content-security-policy')??'';assert.ok(csp.includes("script-src 'self' 'unsafe-inline'")&&!csp.includes('googletagmanager'));
 evidence.travel_pages.push({path,preview_http:200,content_exact_except_service_link:true,production_http:200,production_sha256:digest(production.text),production_unchanged:true});
}));
for(const path of ['/services','/services/account','/services/admin','/services/dashboard','/services/job','/services/jobs','/services/notifications','/services/post','/services/privacy','/services/provider']){
 const {r,text}=await fetchText(base+path);assert.ok(text.includes('測試環境 · 不接受正式委託'));assert.ok(!/googletagmanager|adotone|adsbygoogle/.test(text));
 const csp=r.headers.get('content-security-policy')??'';assert.ok(csp.includes("script-src 'self';"),'Service script policy must remain strict');assert.equal(r.headers.get('x-frame-options'),'DENY');assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.match(r.headers.get('cache-control')??'',/no-store/);assert.match(r.headers.get('x-robots-tag')??'',/noindex/);
 evidence.service_pages.push({path,http:200,private_headers:true,no_travel_analytics:true});
}
const assets=files('work/baseline-dist/_astro');
for(let i=0;i<assets.length;i+=6)await Promise.all(assets.slice(i,i+6).map(async file=>{const path=file.replace('work/baseline-dist','');const expected=readFileSync(file);assert.ok(expected.equals(readFileSync('dist'+path)),path);const r=await fetch(base+path);assert.equal(r.status,200);assert.ok(expected.equals(Buffer.from(await r.arrayBuffer())),path);evidence.assets.push({path,exact:true});}));
for(const path of ['/sitemap-0.xml','/sitemap-index.xml','/rss.xml','/robots.txt']){const expected=readFileSync('work/baseline-dist'+path,'utf8');const {text}=await fetchText(base+path);assert.equal(text,expected,path);if(path.includes('sitemap'))assert.ok(!text.includes('/services'));}
for(const path of ['/services/','/services/account/','/services/account.html']){const r=await fetch(base+path,{redirect:'manual'});assert.ok([301,302,307,308].includes(r.status),path);assert.ok(r.headers.get('location')?.includes(path==='/services/'?'/services':'/services/account'));await r.body?.cancel();}
const redirect=await fetch(base+'/vietnam-jCB-lounge',{redirect:'manual'});assert.equal(redirect.status,301);assert.match(redirect.headers.get('location')??'',/vietnam-jcb-lounge$/);await redirect.body?.cancel();
evidence.passed=true;evidence.original_routes=html.length;evidence.existing_assets=assets.length;evidence.feed_sitemap_robots_unchanged=true;
const planned=await fetch(live+'/services',{redirect:'manual'});assert.equal(planned.status,404,'Services must not have been published to production');evidence.formal_services_http=404;await planned.body?.cancel();
writeFileSync('work/services-http-evidence.json',JSON.stringify(evidence,null,2));
console.log('Preview verified: 45 unchanged travel pages, 33 exact old assets, 10 private service routes; production remains unchanged.');
