import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const baseline=JSON.parse(read('tests/fixtures/sourcing-production-baseline.json'));
test('every current production HTML and executable/style asset stays exact except approved privacy addition',()=>{
 for(const [path,hash] of Object.entries(baseline.hashes)) assert.equal(createHash('sha256').update(readFileSync(new URL('../dist/'+path,import.meta.url))).digest('hex'),hash,path);
});
test('sensitive analytics loads only on approved production hosts and clears referrer; Preview queues safely',()=>{
 const html=read('dist/vietnam-sourcing.html');
 const script=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('analyticsTag'));
 assert.ok(script);assert.ok(!html.includes('pagead2.googlesyndication.com'));assert.ok(!html.includes('cdn.adotone.com'));
 for(const hostname of ['localhost','127.0.0.1','comeback-traveler-web--test.web.app','comebacktraveler.com']) {
  const tags=[];const context={window:{location:{hostname}},document:{createElement:()=>({}),head:{appendChild:s=>tags.push(s)}},Date};
  vm.runInNewContext(script,context);
  assert.equal(tags.length,hostname==='comebacktraveler.com'?1:0);
  const config=context.window.dataLayer?.find(x=>x[0]==='config');
  if(config){assert.equal(config[2].page_location,'https://comebacktraveler.com/vietnam-sourcing');assert.equal(config[2].page_referrer,'');}
 }
});
