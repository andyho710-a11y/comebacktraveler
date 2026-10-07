import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const baseline=JSON.parse(read('tests/fixtures/esim-routing-baseline.json'));
const urls=Object.fromEntries([...read('src/data/esim-recommendations.ts').matchAll(/(\w+): '(https:[^']+)'/g)].map(m=>[m[1],m[2]]));
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2].replace(/&amp;/g,'&')]));
const anchors=s=>[...s.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(m=>({...attrs(m[0]),text:m[0].replace(/<[^>]*>/g,'').trim()}));
const aff=s=>anchors(s).filter(a=>a['data-affiliate'] || /\bsponsored\b/.test(a.rel||''));
const model={joytelJapan:['joytel','collection_joytel_japan_esim'],joytelKorea:['joytel','collection_joytel_korea_esim'],klookJapan:['klook','collection_klook_japan_esim'],klookKorea:['klook','collection_klook_korea_esim'],kkdayVietnam:['kkday','kkday_vietnam_esim']};
function quiz(){
 const result={hidden:true,innerHTML:'',scrollIntoView(){}};
 const element={querySelectorAll:()=>[],addEventListener(){},scrollIntoView(){}};
 const document={getElementById:id=>id==='result'?result:element};
 const script=read('src/pages/esim-quiz.astro').match(/<script>\s*([\s\S]*?)<\/script>/)[1].replace(/import[^;]+;/,'').replace(/function renderCta\(cta[^)]*\)/, 'function renderCta(cta)');
 const context={document,esimAffiliateUrls:urls}; runInNewContext(script+'\nglobalThis.qa={recommend,render};',context);
 return {...context.qa,result};
}
function track(a,path='/esim-quiz'){
 const events=[]; let handler;
 const window={location:{pathname:path,href:'https://comebacktraveler.com'+path+'?email=secret@example.test&rfq=private'},scrollY:0,gtag:(...args)=>events.push(args)};
 const document={referrer:'https://example.test/orders/private?q=secret',documentElement:{lang:'zh-Hant',scrollHeight:1000},addEventListener:(event,fn)=>{if(event==='click')handler=fn;}};
 runInNewContext(read('src/components/AffiliateClickTracker.astro').replace(/<\/?script\b[^>]*>/g,''),{window,document,URL,Set,Map});
 const link={href:a.href,textContent:'secret@example.test 0912345678 private order RFQ',getAttribute:key=>a[key]??null,closest:()=>null,classList:{contains:()=>false},getBoundingClientRect:()=>({top:200})};
 const isAffiliate=!!a['data-affiliate'] || /\bsponsored\b/.test(a.rel||'');
 handler({target:{closest:()=>isAffiliate?link:null}}); return {events,link};
}
function check(a,key,position){
 assert.equal(a.href,urls[key]); assert.equal(a['data-affiliate'],'affiliates_one'); assert.equal(a['data-affiliate-category'],'esim');
 assert.equal(a['data-affiliate-merchant'],model[key][0]); assert.equal(a['data-affiliate-product-key'],model[key][1]); assert.ok(a['data-affiliate-product']);
 if(position)assert.equal(a['data-cta-position'],position); else assert.ok(a['data-cta-position']);
 assert.equal(a.target,'_blank'); assert.match(a.rel,/sponsored/);
 const {events,link}=track(a); assert.equal(events.length,1); assert.equal(events[0][1],'affiliate_click');
 const payload=events[0][2]; assert.equal(payload.product_key,model[key][1]); assert.equal(payload.merchant,model[key][0]); assert.equal(payload.affiliate_network,'affiliates_one');
 assert.ok(!JSON.stringify(payload).includes('secret')); assert.ok(!JSON.stringify(payload).includes('0912345678')); assert.equal(link.href,a.href);
}
test('central owner URLs stay exact without added parameters',()=>{
 assert.deepEqual(Object.keys(model).map(k=>urls[k]),['https://afflink.one/s/5SmIS','https://afflink.one/s/qCGku','https://onelink.one/s/LeROS','https://linkgo.one/s/qK25E','https://onelink.one/s/nnjWf']);
 for(const path of Object.keys(baseline.pages)) assert.ok(!/https:\/\/(?:afflink|onelink|linkgo)\.one\/s\//.test(read('src/pages/'+path+'.astro')),path);
});
for(const [path,expected] of Object.entries({'esim/japan':['joytelJapan','joytelJapan','klookJapan'],'esim/korea':['joytelKorea','joytelKorea','klookKorea'],'esim/joytel':['joytelJapan','joytelKorea'],'esim':['joytelJapan','klookJapan','joytelKorea','klookKorea','kkdayVietnam','kkdayVietnam','kkdayVietnam'],'esim/saigon-airport-sim':['kkdayVietnam'],'esim/overseas-internet-guide':['kkdayVietnam'],'esim/china-routing-2026':['kkdayVietnam'],'esim/install':[]})){
 test('exact centralized CTA inventory and tracking: '+path,()=>{
  const html=read('dist/'+path+'.html'); const ctas=aff(html); assert.equal(ctas.length,expected.length);
  ctas.forEach((a,i)=>check(a,expected[i]));
  if(ctas.length){assert.ok(html.indexOf('class="aff-disclosure"') < html.indexOf('href="'+ctas[0].href+'"')); assert.ok(html.indexOf('class="aff-disclosure"')>=0);}
 });
}
for(const [dest,care,key] of [['jp','stable','joytelJapan'],['kr','stable','joytelKorea'],['vn','stable','kkdayVietnam'],['vn','cheap','kkdayVietnam']]){
 test('quiz direct centralized purchase: '+dest+' '+care,()=>{
  const q=quiz(); const r=q.recommend({dest,care,days:'mid',people:'solo'});q.render(r);
  assert.equal(r.cta.aff,true); assert.equal(r.cta.href,urls[key]); check(aff(q.result.innerHTML)[0],key,'quiz_result');
  assert.ok(q.result.innerHTML.indexOf('result-disclosure') < q.result.innerHTML.indexOf('data-affiliate='));
  assert.ok(anchors(q.result.innerHTML).some(a=>a.href.startsWith('/esim/')));
 });
}
for(const [dest,key,path] of [['jp','klookJapan','/esim/japan'],['kr','klookKorea','/esim/korea']]){
 test('WaySim cheap result retains internal comparison and distinct Klook alternative: '+dest,()=>{
  const q=quiz();const r=q.recommend({dest,care:'cheap',days:'short',people:'solo'});q.render(r);
  assert.match(r.title,/WaySim/);assert.equal(r.cta.href,path);assert.equal(r.cta.aff,false);assert.match(r.cta.label,/JOYTEL vs WaySim/);
  check(aff(q.result.innerHTML)[0],key,'quiz_result');assert.match(q.result.innerHTML,/另一個可購買選項/);assert.match(q.result.innerHTML,/不是上方推薦的 WaySim/);
  const compare=anchors(q.result.innerHTML).find(a=>a.text.includes('JOYTEL vs WaySim'));assert.equal(track(compare).events.length,0);
 });
}
test('WiFi and physical SIM results have no affiliate CTA',()=>{
 for(const a of [{dest:'jp',care:'stable',people:'group',days:'long'},{dest:'vn',care:'call',people:'solo',days:'short'}]){const q=quiz();q.render(q.recommend(a));assert.equal(aff(q.result.innerHTML).length,0);}
});
test('no LsI9l, parked codes or old Vietnam URL in active built pages/client assets',()=>{
 const walk=p=>readdirSync(new URL('../'+p,import.meta.url),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):/\.(html|js)$/.test(e.name)?[p+'/'+e.name]:[]);
 for(const p of walk('dist'))assert.ok(!/LsI9l|zf2Z8|z4xjt|SNmCj|qG9cT|sub_id=quiz/.test(read(p)),p);
});
test('all unrelated affiliate URLs and their order remain unchanged',()=>{
 const allowed=new Set(Object.keys(baseline.pages).map(p=>p+'.html'));
 for(const [p,hrefs]of Object.entries(baseline.affiliateHrefs))if(!allowed.has(p))assert.deepEqual(aff(read('dist/'+p)).map(a=>a.href),hrefs,p);
});
for(const [p,original]of Object.entries(baseline.pages))test('SEO head and H1 unchanged: '+p,()=>{
 const current=read('dist/'+p+'.html');const head=[...current.matchAll(/<title>.*?<\/title>|<meta name="description"[^>]*>|<link rel="canonical"[^>]*>|<h1\b[^>]*>.*?<\/h1>|<script[^>]*type="application\/ld\+json"[^>]*>.*?<\/script>/gs)].map(m=>m[0]);assert.deepEqual(head,original.head);
});
test('mosquito experiment source, tracking and freeze document are byte-identical',()=>{
 for(const [p,hash]of Object.entries(baseline.protected))assert.equal(createHash('sha256').update(read(p).replace(/\r\n/g,'\n')).digest('hex'),hash,p);
});

test('main body remains exact outside purchase blocks, links and the explicit merchant clarification',()=>{
 const normalize=s=>s.replace(/^---[\s\S]*?---/,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g,'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<div class="cta-box">[\s\S]*?<\/div>/g,'').replace(/<a\b[^>]*>[\s\S]*?<\/a>/g,'').replace(/<p>(?:此連結為 JOYTEL 日本三電信商品|這是另一個可購買選項：KKday)[\s\S]*?<\/p>/g,'').replace(/\s+/g,' ').trim();
 for(const [path,original]of Object.entries(baseline.pages)) assert.equal(normalize(read('src/pages/'+path+'.astro')),normalize(original.source),path);
});
