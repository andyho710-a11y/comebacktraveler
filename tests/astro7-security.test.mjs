import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {digest,sourceDigest,semanticHTML} from './helpers/toolchain-semantics.mjs';
import {withoutServicesNav,originalTravelSource} from './helpers/services-nav.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const baseline=JSON.parse(read('tests/fixtures/astro7-semantic-baseline.json'));
// Original main Git blobs use LF; Windows checkout may use CRLF for these text files.
// Pin their complete normalized content rather than changing the deployed files.
const normalizedTextFiles={
 'ads.txt':'108d061027c5023cdf3dd8b1537132df8c17d5ffbee892eb91e47f9558fd6551',
 'favicon.svg':'2d7a310283d6f9cc753210d83224cd6db6348cb82a5536348884e5831d46203f',
 'robots.txt':'85f0f30bd1ba5ac7e53ba5f1a5c8bf849486b2dbf3b7ab03b64920a6eb9ccd84'
};
const files=dir=>readdirSync(new URL('../'+dir,import.meta.url),{recursive:true}).filter(p=>statSync(new URL('../'+dir+'/'+p,import.meta.url)).isFile()).map(p=>p.replaceAll('\\','/')).sort();
test('all 45 production routes and parsed content/SEO/CTA DOM match pre-upgrade main',()=>{
 assert.deepEqual(files('dist').filter(p=>p.endsWith('.html')&&p!=='services.html'&&!p.startsWith('services/')),Object.keys(baseline.html).sort());
 for(const [p,h]of Object.entries(baseline.html))assert.equal(semanticHTML(withoutServicesNav(read('dist/'+p).toString())),h,p);
});
test('all application sources, affiliate tracker and public/XML output stay exact',()=>{
 assert.deepEqual(files('src').filter(p=>!p.startsWith('features/services/')&&!p.startsWith('pages/services/')),Object.keys(baseline.source).map(p=>p.slice(4)).sort());
 for(const [p,h]of Object.entries(baseline.source))assert.equal(sourceDigest(originalTravelSource(p,read(p).toString())),h,p);
 for(const [p,h]of Object.entries(baseline.unchangedFiles))assert.equal(normalizedTextFiles[p]?sourceDigest(read('dist/'+p)):digest(read('dist/'+p)),normalizedTextFiles[p]??h,p);
});
test('semantic comparison ignores only compiler packaging and rejects content/URL/metadata changes',()=>{
 const html=read('dist/japan-guide.html').toString();const expected=semanticHTML(html);
 for(const replacement of [html.replace('usj-entry','unapproved-product'),html.replace('theme-park-ticket','changed-category'),html.replace('sponsored noopener noreferrer','noopener'),html.replace('日本自由行完整攻略','不同攻略'),html.replace('afflnk.site','unapproved.example')])assert.notEqual(semanticHTML(replacement),expected);
});
test('recompiled eSIM filter retains selection and visibility behavior',()=>{
 const html=read('dist/esim.html').toString();const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('.filter-btn')&&s.includes('#esim-tbody'));
 assert.ok(script);const rows=['japan korea','europe','southeast-asia'].map(tags=>({dataset:{tags},style:{display:''}}));
 const buttons=['all','japan','europe'].map(tag=>({dataset:{tag},active:false,classList:{},addEventListener(_event,fn){this.click=fn;}}));
 for(const b of buttons){b.classList={add(){b.active=true;},remove(){b.active=false;}};}
 runInNewContext(script,{document:{querySelectorAll:s=>s==='.filter-btn'?buttons:rows}});
 buttons[1].click();assert.deepEqual(rows.map(r=>r.style.display),['','none','none']);assert.deepEqual(buttons.map(b=>b.active),[false,true,false]);
 buttons[2].click();assert.deepEqual(rows.map(r=>r.style.display),['none','','none']);
 buttons[0].click();assert.deepEqual(rows.map(r=>r.style.display),['','','']);
});
