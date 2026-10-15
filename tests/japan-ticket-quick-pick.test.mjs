import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import {withoutServicesNav} from './helpers/services-nav.mjs';
import { japanTicketGroups } from '../src/data/japan-ticket-recommendations.ts';
const read = p => readFileSync(new URL('../'+p, import.meta.url), 'utf8');
const hash = s => createHash('sha256').update(s).digest('hex');
const baseline = JSON.parse(read('tests/fixtures/japan-ticket-baseline.json'));
const approved = JSON.parse(read('tests/fixtures/japan-ticket-approved-urls.json'));
const html = read('dist/japan-guide.html');
const module = html.match(/<section id="japan-ticket-quick-pick"[\s\S]*?<\/section>/)[0];
const attrs = s => Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2].replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n))]));
const ctas = [...module.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(m=>attrs(m[0])).filter(a=>a['data-affiliate']);
const offers = japanTicketGroups.flatMap(g=>g.offers);
const products = [['usj-entry','theme-park-ticket','osaka','查看 USJ 入場門票'],['usj-express','theme-park-express','osaka','查看 USJ 快速通關'],['tokyo-disney','theme-park-ticket','tokyo','查看東京迪士尼門票'],['shibuya-sky','attraction-ticket','tokyo','查看 SHIBUYA SKY 門票'],['haruka','airport-transport','kansai','查看 HARUKA 車票']];
test('exactly five owner URLs remain literal in data and rendered href, with safe external attributes',()=>{
 assert.equal(ctas.length,5); assert.deepEqual(offers.map(o=>o.url),approved); assert.deepEqual(ctas.map(a=>a.href),approved);
 ctas.forEach((a,i)=>{assert.equal(a.target,'_blank');assert.equal(a.rel,'sponsored noopener noreferrer');assert.equal(a['data-affiliate-product-key'],products[i][0]);assert.equal(offers[i].label,products[i][3]);});
});
test('disclosure precedes purchases and Express warning is directly associated with its CTA',()=>{
 assert.ok(module.indexOf('利益揭露')<module.indexOf('data-affiliate='));
 assert.ok(module.includes('Express Pass 快速通關不等於 USJ 入場門票，購買前請確認是否仍需另備入園券。'));
 assert.equal(ctas[1]['aria-describedby'],'usj-express-warning');assert.ok(module.includes('id="usj-express-warning"'));
 assert.ok(module.includes('價格、可售日期與方案以商品頁當下資訊為準。'));
 assert.doesNotMatch(module,/TODO|placeholder|最便宜|必買|一定要搶|折扣碼|NT\$/i);
});
test('original source remains exact outside the new import and insertion',()=>{
 const source=read('src/pages/japan-guide.astro').replace(/\r\n/g,'\n').replace("import JapanTicketQuickPick from '../components/JapanTicketQuickPick.astro';\n",'').replace('  <JapanTicketQuickPick />\n\n','');
 assert.equal(hash(source.replace(/\r\n/g,'\n')),baseline.originalSourceHash);
});
test('original rendered content and SEO stay exact except dedicated stylesheet packaging',()=>{
 const clean=withoutServicesNav(html).replace(module,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>|<link rel="stylesheet"[^>]*>/g,'').replace(/\s+/g,' ').trim();
 assert.equal(hash(clean),baseline.originalContentHash);
});
test('protected eSIM and first trip packing HTML and every referenced built asset remain byte identical',()=>{
 for(const [p,expected]of Object.entries(baseline.protected)){const bytes=readFileSync(new URL('../dist/'+p,import.meta.url));assert.equal(hash(p.endsWith('.html')?withoutServicesNav(bytes.toString()):bytes),expected,p);}
});
for(const [i,[key,category,destination]]of products.entries())test('existing affiliate_click actual sanitized payload: '+key,()=>{
 const calls=[];let handler;
 const window={location:{href:'https://comebacktraveler.com/japan-guide?email=private@example.com',pathname:'/japan-guide'},scrollY:0,gtag:(...args)=>calls.push(args)};
 const document={referrer:'https://search.example/?email=private@example.com',documentElement:{lang:'zh-TW',scrollHeight:1000},addEventListener:(event,fn)=>{if(event==='click')handler=fn;}};
 const tracker=read('src/components/AffiliateClickTracker.astro').replace(/<\/?script\b[^>]*>/g,'');
 runInNewContext(tracker,{window,document,URL});
 const a=ctas[i];const link={href:a.href,getAttribute:k=>a[k]??null};
 handler({target:{closest:()=>link}});
 assert.equal(calls.length,1);assert.equal(calls[0][1],'affiliate_click');const payload=calls[0][2];
 for(const [field,value]of Object.entries({merchant:'klook',brand:'Klook',affiliate_network:'affiliate',article:'/japan-guide',placement:'japan-ticket-quick-pick',cta_position:'japan-ticket-quick-pick',product_key:key,product_category:category,destination,page_path:'/japan-guide',link_url:new URL(approved[i]).origin}))assert.equal(payload[field],value,field);
 assert.equal(payload.product,undefined);assert.equal(link.href,approved[i]);assert.ok(!JSON.stringify(payload).includes('private@example.com'));assert.ok(!JSON.stringify(payload).includes('/track/clicks/'));assert.ok(!JSON.stringify(payload).includes('utm_source'));
});
