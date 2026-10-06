import test from 'node:test';
import assert from 'node:assert/strict';
import { createIntakeHandler, generateRFQId, normalizeSubmission, providerClientIp, MAX_PAYLOAD_BYTES, IP_REQUEST_LIMIT, GLOBAL_REQUEST_LIMIT, RATE_WINDOW_MS } from '../lib/functions/src/service.js';
import { MemoryStore, request, validEnvelope } from './fixtures.mjs';
const fixedDate = new Date('2026-10-06T00:00:00.000Z');
function setup(store = new MemoryStore(), overrides = {}) { return { store, handle: createIntakeHandler({ store, enabled: true, origins: ['http://localhost:5000'], clock: () => fixedDate, ...overrides }) }; }
test('valid RFQ persists before success; authoritative ID/timestamps/status and all schema fields', async () => {
  const { store, handle } = setup(); const input = validEnvelope(); const result = await handle(request(input));
  assert.equal(result.status, 201); assert.equal(result.body.stored, true); assert.equal(result.body.submission_id, input.submission_id);
  assert.match(result.body.rfq_id, /^RFQ-20261006-[a-f0-9]{32}$/); assert.notEqual(result.body.rfq_id, input.submission_id);
  const record = store.records.get(result.body.rfq_id); assert.ok(record); assert.equal(record.created_at, fixedDate.toISOString()); assert.equal(record.updated_at, record.created_at); assert.equal(record.status, 'new');
  assert.equal(record.contact.email, 'qa@example.com'); assert.equal(record.company.name, input.input.company_name); assert.deepEqual(record.attachments, []); assert.equal(record.notification_status, 'pending_manual_review'); assert.equal(record.utm_source, 'qa');
  assert.equal(result.headers['Cache-Control'], 'no-store, private'); assert.ok(!JSON.stringify(result.body).includes('qa@example.com'));
});
test('malformed JSON, invalid RFQ and required fields reject with no RFQ persisted', async () => {
  const { store, handle } = setup();
  assert.equal((await handle(request(validEnvelope(), { rawBody: Buffer.from('{') }))).status, 400);
  for (const field of ['company_name', 'contact_name', 'email', 'phone', 'product_name', 'specifications', 'quantity']) { const body = validEnvelope(); body.input[field] = ''; assert.equal((await handle(request(body, { clientIp: `192.0.2.${Object.keys(body.input).indexOf(field) + 10}` }))).status, 400); }
  assert.equal(store.records.size, 0);
});
test('consent false, invalid email and honeypot are rejected server-side', async () => {
  const { store, handle } = setup();
  for (const [field, value] of [['consent', false], ['email', 'bad'], ['website_confirmation', 'spam']]) { const body = validEnvelope(); body.input[field] = value; const result = await handle(request(body)); assert.equal(result.status, 400); assert.equal(result.body.stored, false); }
  assert.equal(store.records.size, 0);
});
test('field injection, server timestamps/status, attachments, base64 and invalid types are rejected', () => {
  for (const [key, value] of [['status', 'won'], ['created_at', '1999'], ['attachments', [{ filename: 'secret', base64: 'a' }]], ['__proto__', { admin: true }]]) { const body = JSON.parse(JSON.stringify(validEnvelope())); Object.defineProperty(body, key, { value, enumerable: true }); assert.equal(normalizeSubmission(body), null); }
  for (const [key, value] of [['company_name', 3], ['specifications', { nested: 'bad' }], ['services_requested', ['samples', 3]], ['additional_notes', 'data:application/pdf;base64,AAAA'], ['company_name', 'x'.repeat(301)], ['specifications', 'x'.repeat(4001)]]) { const body = validEnvelope(); body.input[key] = value; assert.equal(normalizeSubmission(body), null); }
  const body = validEnvelope(); body.input.admin = true; assert.equal(normalizeSubmission(body), null);
});
test('oversized raw payload is rejected before storage/rate calls', async () => {
  const store = { consumeRate() { throw new Error('must not run'); }, persist() { throw new Error('must not run'); } };
  const result = await setup(store).handle(request(validEnvelope(), { rawBody: new Uint8Array(MAX_PAYLOAD_BYTES + 1) })); assert.equal(result.status, 413); assert.equal(result.body.stored, false);
});
test('method, origin, media type, key and disabled intake fail closed', async () => {
  const { handle, store } = setup();
  for (const [override, status] of [[{ method: 'GET' }, 405], [{ origin: 'https://evil.example' }, 403], [{ origin: '' }, 403], [{ contentType: 'text/plain' }, 415], [{ idempotencyKey: 'fake' }, 400]]) assert.equal((await handle(request(validEnvelope(), override))).status, status);
  assert.equal((await setup(store, { enabled: false }).handle(request())).status, 503); assert.equal(store.records.size, 0);
});
test('per-client rate limit rejects request 11 and resets after the window', async () => {
  const { handle, store } = setup();
  for (let i = 0; i < IP_REQUEST_LIMIT; i++) assert.equal((await handle(request())).status, 201);
  const limited = await handle(request()); assert.equal(limited.status, 429); assert.equal(limited.body.stored, false); assert.equal(limited.headers['Retry-After'], '600');
  const later = setup(store, { clock: () => new Date(fixedDate.getTime() + RATE_WINDOW_MS) }); assert.equal((await later.handle(request())).status, 201);
});
test('global limit cannot be bypassed by changing clients', async () => {
  const { handle, store } = setup();
  for (let i = 0; i < GLOBAL_REQUEST_LIMIT; i++) assert.equal((await handle(request(validEnvelope(), { clientIp: `192.0.2.${i + 1}` }))).status, 201);
  assert.equal((await handle(request(validEnvelope(), { clientIp: '198.51.100.1' }))).status, 429); assert.equal(store.records.size, GLOBAL_REQUEST_LIMIT);
});
test('duplicate retry returns the same persisted ID; changed content conflicts', async () => {
  const { handle, store } = setup(); const body = validEnvelope(); const [first, second] = await Promise.all([handle(request(body)), handle(request(body))]);
  assert.deepEqual([first.status, second.status].sort(), [200, 201]); assert.equal(first.body.rfq_id, second.body.rfq_id); assert.equal(store.records.size, 1);
  body.input.quantity = '200 units'; assert.equal((await handle(request(body))).status, 409); assert.equal(store.records.size, 1);
});
test('persistence failure and rate-store failure never acknowledge success or expose details', async () => {
  const rateStore = new MemoryStore(); rateStore.fail = true;
  const failedPersist = new MemoryStore(); failedPersist.persist = async () => { throw new Error('credential stack trace'); };
  for (const store of [rateStore, failedPersist]) { const result = await setup(store).handle(request()); assert.equal(result.status, 500); assert.equal(result.body.stored, false); assert.equal(store.records.size, 0); assert.deepEqual(result.body, { stored: false, code: 'temporarily_unavailable' }); }
});
test('basic RFQ ID uniqueness uses 128-bit secure random suffix', () => {
  const ids = new Set(Array.from({ length: 1000 }, () => generateRFQId(fixedDate))); assert.equal(ids.size, 1000); for (const id of ids) assert.match(id, /^RFQ-20261006-[a-f0-9]{32}$/);
});
test('operator signal fires only after new persistence, never on retry or failure', async () => {
  const store = new MemoryStore(); let calls = 0;
  const { handle } = setup(store, { onStored: () => { calls++; assert.equal(store.records.size, 1); } });
  const body = validEnvelope(); await handle(request(body)); await handle(request(body)); assert.equal(calls, 1);
  store.fail = true; await handle(request()); assert.equal(calls, 1);
});
test('forwarded IP selection ignores attacker-controlled first address', () => {
  assert.equal(providerClientIp('198.51.100.3, 192.0.2.4', '127.0.0.1'), '192.0.2.4'); assert.equal(providerClientIp('not-an-ip', '127.0.0.1'), '127.0.0.1'); assert.equal(providerClientIp(undefined, undefined), 'unknown');
});
