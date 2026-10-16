import {test} from 'node:test';import assert from 'node:assert/strict';
import {stripJpegMetadata} from '../supabase/functions/service-private-photo/jpeg.ts';
import {handlePhoto} from '../supabase/functions/service-private-photo/handler.ts';
test('JPEG metadata sanitizer removes EXIF/IPTC/comments/trailing payload; keeps scan data',()=>{
 const tag=Buffer.from('GPSLocation=PRIVATE');const app=Buffer.concat([Buffer.from([255,225,0,tag.length+2]),tag]);
 const jpeg=Buffer.concat([Buffer.from([255,216]),app,Buffer.from([255,218,0,2,1,2,255,0,3,255,217]),Buffer.from('PRIVATE trailer')]);
 const clean=stripJpegMetadata(jpeg);assert.ok(!Buffer.from(clean).includes(tag));assert.ok(!Buffer.from(clean).includes(Buffer.from('PRIVATE')));assert.deepEqual([...clean],[255,216,255,218,0,2,1,2,255,0,3,255,217]);
 assert.throws(()=>stripJpegMetadata(Buffer.from('not jpeg')));assert.throws(()=>stripJpegMetadata(new Uint8Array(2097153)));
});
test('photo gateway fails closed before storage and never exposes signed URLs',async()=>{
 const env={SUPABASE_URL:'https://jqzyduwzcbhylgjlrdvf.supabase.co',SUPABASE_ANON_KEY:'test-public',SUPABASE_SERVICE_ROLE_KEY:'test-only-secret'};
 assert.equal((await handlePhoto(new Request('https://example.test'),env)).status,405);
 assert.equal((await handlePhoto(new Request('https://example.test',{method:'POST'}),env)).status,401);
 assert.equal((await handlePhoto(new Request('https://example.test',{method:'POST',headers:{Origin:'https://hostile.test'}}),env)).status,403);
 assert.equal((await handlePhoto(new Request('https://example.test',{method:'POST'}),{...env,SUPABASE_URL:'https://production.test'})).status,503);
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response('{}',{status:401});};
 try{const r=await handlePhoto(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify({path:'10000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000002/10000000-0000-4000-8000-000000000003.jpg'})}),env);assert.equal(r.status,401);assert.equal(calls,1);assert.equal(r.headers.get('Cache-Control'),'private, no-store, max-age=0');assert.ok(!(await r.text()).includes('test-only-secret'));}finally{globalThis.fetch=original;}
});

test('production photo CORS accepts only its configured sites and exact release preview',async()=>{
 const origin='https://comeback-traveler-web--services-release-test123.web.app';
 const env={SUPABASE_URL:'https://nneammnczvwziggoyzrn.supabase.co',SUPABASE_ANON_KEY:'test-public',SUPABASE_SERVICE_ROLE_KEY:'test-secret',SERVICE_PHOTO_PREVIEW_ORIGIN:origin};
 const options=(o)=>new Request('https://example.test',{method:'OPTIONS',headers:{Origin:o}});
 for(const o of ['https://comebacktraveler.com','https://kaoh-help-20261014.web.app',origin]){const r=await handlePhoto(options(o),env);assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),o);}
 for(const o of ['https://hostile.test','https://comeback-traveler-web--services-release-other.web.app','https://comeback-traveler-web--services-integration-we1toi2q.web.app'])assert.equal((await handlePhoto(options(o),env)).status,403);
 assert.equal((await handlePhoto(options(origin),{...env,SUPABASE_URL:'https://jqzyduwzcbhylgjlrdvf.supabase.co'})).status,403);
 assert.equal((await handlePhoto(options('https://hostile.test'),{...env,SERVICE_PHOTO_PREVIEW_ORIGIN:'https://hostile.test'})).status,403);
});
