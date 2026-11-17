import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../server/store.mjs';
import { createApp, hashPassword } from '../server/app.mjs';
import { inquiry, price } from './fixtures.mjs';
async function fixture(t, extra = {}) {
  const store = new Store(':memory:', randomBytes(32).toString('hex'));
  const config = { mode: 'demo', origin: 'http://127.0.0.1:1', enabled: true, adminHash: hashPassword('synthetic-password'), retentionDays: 30, ...extra };
  // Reserve a port once; origin is updated before requests, through the server factory.
  const reservation = (await import('node:net')).createServer().listen(0, '127.0.0.1'); await once(reservation, 'listening');
  const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve)); config.origin = `http://127.0.0.1:${port}`;
  const app = createApp({ store, config, dist: new URL('../dist', import.meta.url).pathname.replace(/^\/(\w:)/, '$1') });
  app.listen(port, '127.0.0.1'); await once(app, 'listening');
  t.after(async () => { await new Promise(resolve => app.close(resolve)); store.close(); });
  const send = (path, method = 'GET', data, headers = {}) => fetch(config.origin + path, { method, headers: { ...(method !== 'GET' ? { Origin: config.origin, 'Content-Type': 'application/json' } : {}), ...headers }, body: data ? JSON.stringify(data) : undefined });
  const login = async () => { const response = await send('/api/login', 'POST', { password: 'synthetic-password' }); assert.equal(response.status, 200); return response.headers.get('set-cookie').split(';')[0]; };
  return { store, config, send, login };
}
test('HTTP intake is origin-checked, idempotent, encrypted and admin-only', async t => {
  const { store, send, login } = await fixture(t); const data = inquiry(), key = randomUUID(), headers = { 'Idempotency-Key': key };
  assert.equal((await send('/api/admin/inquiries')).status, 401);
  assert.equal((await send('/api/inquiries', 'POST', data, { ...headers, Origin: 'https://attacker.invalid' })).status, 403);
  const first = await send('/api/inquiries', 'POST', data, headers); assert.equal(first.status, 201); const receipt = await first.json();
  const replay = await send('/api/inquiries', 'POST', data, headers); assert.equal(replay.status, 200); assert.equal((await replay.json()).id, receipt.id);
  assert.equal((await send('/api/inquiries', 'POST', { ...data, notes: 'changed' }, headers)).status, 409);
  assert.equal(store.db.prepare('SELECT count(*) AS count FROM inquiries').get().count, 1);
  assert.ok(!store.db.prepare('SELECT payload FROM inquiries').get().payload.includes(data.contact));
  assert.equal(store.list()[0].consentEvidence.version, '2026-11-16-v1');
  assert.ok(Number.isSafeInteger(store.list()[0].consentEvidence.acceptedAt));
  assert.equal(store.db.prepare("SELECT count FROM metrics WHERE event='inquiry_submit'").get().count, 1);
  const cookie = await login(), response = await send('/api/admin/inquiries', 'GET', undefined, { Cookie: cookie }); assert.match(response.headers.get('cache-control'), /no-store/); assert.equal((await response.json()).items[0].contact, data.contact);
  assert.equal((await send('/api/logout', 'POST', {}, { Cookie: cookie })).status, 200);
  assert.equal((await send('/api/admin/inquiries', 'GET', undefined, { Cookie: cookie })).status, 401);
});
test('server rejects spoofing, invalid fields, large bodies and excessive requests', async t => {
  const { send } = await fixture(t);
  assert.equal((await send('/api/inquiries', 'POST', inquiry())).status, 400);
  assert.equal((await send('/api/inquiries', 'POST', { ...inquiry(), consent: false }, { 'Idempotency-Key': randomUUID() })).status, 400);
  assert.equal((await send('/api/events', 'POST', { event: 'confirmed_booking', source: 'google' })).status, 400);
  assert.equal((await send('/api/events', 'POST', { event: 'page_view', source: 'google', name: 'private' })).status, 400);
  assert.equal((await send('/api/inquiries', 'POST', { ...inquiry(), notes: 'x'.repeat(18000) }, { 'Idempotency-Key': randomUUID() })).status, 413);
  await send('/api/inquiries', 'POST', inquiry(), { 'Idempotency-Key': randomUUID(), 'X-Forwarded-For': '1.2.3.4' });
  await send('/api/inquiries', 'POST', inquiry(), { 'Idempotency-Key': randomUUID(), 'X-Forwarded-For': '2.3.4.5' });
  assert.equal((await send('/api/inquiries', 'POST', inquiry(), { 'Idempotency-Key': randomUUID(), 'X-Forwarded-For': '3.4.5.6' })).status, 429);
});
test('disabled production intake fails closed and configuration never returns secrets', async t => {
  const { send } = await fixture(t, { enabled: false, lineUrl: 'javascript:alert(1)' });
  assert.equal((await send('/api/inquiries', 'POST', inquiry(), { 'Idempotency-Key': randomUUID() })).status, 503);
  const config = await (await send('/api/config')).json(); assert.equal(config.lineUrl, ''); assert.equal(config.adminHash, undefined); assert.equal(config.encryptionKey, undefined);
  assert.throws(() => createApp({ store: {}, config: { mode: 'production', origin: 'http://example.com' }, dist: '.' }));
  assert.throws(() => createApp({ store: {}, config: { mode: 'production', origin: 'https://example.com', enabled: true }, dist: '.' }));
});
test('booking requires evidence; updates reject stale versions; conversion deduplicates', async t => {
  const { send, login, store } = await fixture(t); const receipt = await (await send('/api/inquiries', 'POST', inquiry(), { 'Idempotency-Key': randomUUID() })).json(); const Cookie = await login();
  const path = `/api/admin/inquiries/${receipt.id}`, data = { version: 1, status: 'booked', calculation: price(), bookingReference: '' };
  assert.equal((await send(path, 'PATCH', data, { Cookie })).status, 400);
  assert.equal((await send(path, 'PATCH', { ...data, bookingReference: 'synthetic reviewed record' }, { Cookie })).status, 200);
  assert.equal((await send(path, 'PATCH', { ...data, bookingReference: 'synthetic reviewed record' }, { Cookie })).status, 409);
  assert.equal((await send(path, 'PATCH', { ...data, version: 2, status: 'won', bookingReference: 'synthetic reviewed record' }, { Cookie })).status, 200);
  assert.equal(store.db.prepare("SELECT count FROM metrics WHERE event='confirmed_booking'").get().count, 1);
  assert.equal((await send(path, 'DELETE', undefined, { Cookie })).status, 200); assert.equal(store.list().length, 0); assert.equal(store.db.prepare('SELECT count(*) AS count FROM receipts').get().count, 0);
});
test('sessions expire and login is throttled across persistent storage', async t => {
  const { send, login, store } = await fixture(t); const Cookie = await login();
  store.db.exec('UPDATE sessions SET expires=0'); assert.equal((await send('/api/admin/inquiries', 'GET', undefined, { Cookie })).status, 401);
  for (let i = 0; i < 4; i++) assert.equal((await send('/api/login', 'POST', { password: 'wrong' })).status, 401);
  assert.equal((await send('/api/login', 'POST', { password: 'wrong' })).status, 429);
});
test('disk restart preserves encrypted records, rate limits, receipts and retention', () => {
  const temp = mkdtempSync(join(tmpdir(), 'studio-test-')), path = join(temp, 'test.sqlite'), key = randomBytes(32).toString('hex');
  try {
    let store = new Store(path, key); const now = Date.now(), data = validateForStore(inquiry(now)); store.persist(randomUUID(), data, now - 31 * 86400000); const receiptKey = randomUUID(); const receipt = store.persist(receiptKey, data, now); store.rate('persistent', 1, 3600000); store.close();
    assert.ok(!readFileSync(path).includes(Buffer.from(data.contact)));
    store = new Store(path, key); assert.equal(store.list().length, 2); assert.equal(store.rate('persistent', 1, 3600000), false); assert.equal(store.persist(receiptKey, data).id, receipt.id); assert.equal(store.purge(30), 1); assert.equal(store.list().length, 1); store.close();
  } finally { rmSync(temp, { recursive: true, force: true }); }
});
function validateForStore(value) { const { consent, website, startedAt, ...data } = value; return data; }
