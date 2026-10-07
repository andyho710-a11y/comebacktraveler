import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FirestoreIntakeStore } from '../lib/functions/src/firestore-store.js';
import { createIntakeHandler, hash, IP_REQUEST_LIMIT, GLOBAL_REQUEST_LIMIT } from '../lib/functions/src/service.js';
import { validEnvelope, request } from '../tests/fixtures.mjs';

if (!process.env.FIRESTORE_EMULATOR_HOST || process.env.GCLOUD_PROJECT !== 'demo-rfq-intake') throw new Error('These tests require the isolated demo-rfq-intake emulator project');
const database = getFirestore(initializeApp({ projectId: 'demo-rfq-intake' }), 'rfq-intake');
const store = new FirestoreIntakeStore(database);
const endpoint = 'http://127.0.0.1:5000/api/vietnam-sourcing';
const headers = body => ({ 'Content-Type': 'application/json', Origin: 'http://127.0.0.1:5000', 'Idempotency-Key': body.submission_id });
test('Hosting rewrite → Function → named Firestore persists RFQ before returning receipt', async () => {
  const body = validEnvelope(); const response = await fetch(endpoint, { method: 'POST', headers: headers(body), body: JSON.stringify(body) });
  assert.equal(response.status, 201); const receipt = await response.json(); assert.equal(receipt.stored, true);
  const stored = await database.collection('rfqs').doc(receipt.rfq_id).get(); assert.equal(stored.exists, true); assert.equal(stored.data().company.name, body.input.company_name); assert.equal(stored.data().status, 'new'); assert.equal(stored.data().updated_at, stored.data().created_at);
  const again = await fetch(endpoint, { method: 'POST', headers: headers(body), body: JSON.stringify(body) }); assert.equal(again.status, 200); assert.equal((await again.json()).rfq_id, receipt.rfq_id);
});
test('real Firestore transactions deduplicate concurrent requests and reject conflicting retry', async () => {
  const body = validEnvelope(); const handle = createIntakeHandler({ store, enabled: true, origins: ['http://localhost:5000'] });
  const results = await Promise.all([handle(request(body, { clientIp: '192.0.2.40' })), handle(request(body, { clientIp: '192.0.2.40' }))]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 201]); assert.equal(results[0].body.rfq_id, results[1].body.rfq_id);
  assert.equal((await database.collection('rfqs').doc(results[0].body.rfq_id).get()).exists, true);
  body.input.quantity = 'different'; assert.equal((await handle(request(body, { clientIp: '192.0.2.40' }))).status, 409);
});
test('real persistent rate counter survives distinct store instances and enforces global cap', async () => {
  const now = Date.now(); const key = hash('fixture-rate');
  for (let i = 0; i < IP_REQUEST_LIMIT; i++) assert.equal(await new FirestoreIntakeStore(database).consumeRate(key, now), true);
  assert.equal(await new FirestoreIntakeStore(database).consumeRate(key, now), false);
  await database.collection('_rfq_abuse').doc('global').set({ count: GLOBAL_REQUEST_LIMIT, reset_at: now + 600000 });
  assert.equal(await store.consumeRate(hash('fixture-other-client'), now), false);
  // Test-only cleanup in the isolated demo emulator, so subsequent QA can submit.
  await database.collection('_rfq_abuse').doc('global').delete();
});
test('real Firestore persistence failure cannot return a stored receipt', async () => {
  const failedStore = { consumeRate: (...args) => store.consumeRate(...args), async persist(record, key, fingerprint) { return store.persist({ ...record, impossible_firestore_value: undefined }, key, fingerprint); } };
  const handle = createIntakeHandler({ store: failedStore, enabled: true, origins: ['http://localhost:5000'] });
  const body = validEnvelope(); const result = await handle(request(body, { clientIp: '192.0.2.77' })); assert.equal(result.status, 500); assert.equal(result.body.stored, false);
  assert.equal((await database.collection('_rfq_receipts').doc(hash(body.submission_id)).get()).exists, false);
});
test('Firestore rules deny every browser operation, anonymous and authenticated, including nested paths', async () => {
  const auth = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) });
  assert.equal(auth.status, 200); const token = (await auth.json()).idToken; assert.ok(token);
  const base = 'http://' + process.env.FIRESTORE_EMULATOR_HOST + '/v1/projects/demo-rfq-intake/databases/rfq-intake/documents';
  for (const authorization of [undefined, `Bearer ${token}`]) {
    const options = { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) };
    for (const path of ['rfqs', '_rfq_receipts', '_rfq_abuse', 'rfqs/fake/nested']) {
      assert.equal((await fetch(`${base}/${path}`, { headers: options })).status, 403, `list ${path}`);
      assert.equal((await fetch(`${base}/${path}/fake`, { headers: options })).status, 403, `get ${path}`);
      assert.equal((await fetch(`${base}/${path}/fake`, { method: 'PATCH', headers: options, body: JSON.stringify({ fields: { status: { stringValue: 'won' }, admin: { booleanValue: true } } }) })).status, 403, `write ${path}`);
      assert.equal((await fetch(`${base}/${path}/fake`, { method: 'DELETE', headers: options })).status, 403, `delete ${path}`);
    }
  }
});
