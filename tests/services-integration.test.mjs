import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {withoutServicesNav} from './helpers/services-nav.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const config=JSON.parse(read('firebase.json'));
const pricing=JSON.parse(read('src/features/services/data/transfer-pricing.json'));
const retired=['account','admin','dashboard','job','jobs','notifications','post','provider'];

test('personal transfer replaces the marketplace and no retired account or intake screen is published',()=>{
 assert.deepEqual(readdirSync(new URL('../src/pages/services',import.meta.url)).sort(),['index.astro','privacy.astro']);
 for(const page of retired)assert.equal(existsSync(new URL('../dist/services/'+page+'.html',import.meta.url)),false,page);
 const html=read('dist/services.html');
 assert.match(html,/data-service-mode="personal-transfer"/);
 assert.match(html,/高雄安心包車長途接送/);
 assert.doesNotMatch(html,/免費刊登|成為好幫手|登入／註冊|supabase|<form\b|googletagmanager|google-analytics|adotone|adsbygoogle/i);
 assert.match(html,/rel="canonical" href="https:\/\/comebacktraveler.com\/services"/);
 assert.match(html,/name="robots" content="index,follow"/);
 assert.match(read('dist/services/privacy.html'),/name="robots" content="noindex,nofollow"/);
 assert.match(read('dist/index.html'),/>安心包車接送<\/a>/);
});

test('retired deep links redirect to the new service and the existing travel intake is retained',()=>{
 assert.equal(config.hosting.site,'comeback-traveler-web');
 const redirect=config.hosting.redirects.find(r=>r.destination==='/services');
 assert.deepEqual(redirect,{source:'/services/{account,admin,dashboard,job,jobs,notifications,post,provider}{,/**,.html}',destination:'/services',type:301});
 assert.deepEqual(config.hosting.rewrites,[{source:'/api/vietnam-sourcing',function:{functionId:'vietnamSourcingIntake',region:'asia-east1'}}]);
 assert.ok(config.hosting.redirects.some(r=>r.source==='/vietnam-jCB-lounge'&&r.destination==='/vietnam-jcb-lounge'&&r.type===301));
});

test('personal service CSP removes marketplace connections and disables form submission',()=>{
 const fields=Object.fromEntries(config.hosting.headers[0].headers.map(h=>[h.key,h.value]));
 assert.equal(config.hosting.headers[0].source,'/services{,/**,.html}');
 assert.ok(fields['Content-Security-Policy'].includes("connect-src 'none'"));
 assert.ok(fields['Content-Security-Policy'].includes("form-action 'none'"));
 assert.ok(fields['Content-Security-Policy'].includes("frame-ancestors 'none'"));
 assert.equal(fields['Referrer-Policy'],'no-referrer');
 assert.equal(config.hosting.headers[1].source,'/services/privacy{,/**,.html}');
});

test('price comparisons preserve equal published time and mileage and do not invent a market minimum',()=>{
 const reference=pricing.reference;
 for(const plan of pricing.packages){
   assert.equal(plan.reference,reference.basePrice+(plan.hours-reference.baseHours)*reference.hourly);
   assert.equal(plan.km,reference.baseKm+(plan.hours-reference.baseHours)*reference.additionalKm);
   assert.ok(plan.price<plan.reference);
   assert.ok(read('dist/services.html').includes('$'+plan.price.toLocaleString('en-US')));
 }
 assert.equal(pricing.companion.minimumPrice,pricing.companion.hourly*pricing.companion.minimumHours);
 assert.equal(pricing.companion.minimumHours,2);
 assert.equal(pricing.packages[2].price,4200);
 // Buying a named longer package must never cost more than extending the short one.
 for(const a of pricing.packages)for(const b of pricing.packages)if(b.hours>a.hours){
   const increments=(b.hours-a.hours)*60/pricing.overtime.minutes;
   assert.ok(b.price<=a.price+increments*pricing.overtime.price);
   assert.equal(b.km,a.km+increments*pricing.overtime.additionalKm);
 }
 assert.match(pricing.reference.note,/不代表全市場最低/);
 assert.match(read('dist/services.html'),/交通費另外報價/);
});

test('travel comparisons permit only the old or newly authorized navigation label',()=>{
 for(const label of ['生活服務','安心包車接送']){
  const approved=`<a href="/services" class="cbt-nav-link" data-astro-cid-rutobish>${label}</a>`;
  assert.equal(withoutServicesNav('before'+approved+'after'),'beforeafter');
  for(const changed of [approved.replace('/services','/other'),approved.replace(label,'其他內容'),approved.replace('cbt-nav-link','unexpected')])assert.equal(withoutServicesNav(changed),changed);
 }
});
