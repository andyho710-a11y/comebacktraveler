import test from 'node:test';
import assert from 'node:assert/strict';
import { installJsonParserLogPrivacy } from '../lib/functions/src/log-privacy.js';
import { createIntakeHandler } from '../lib/functions/src/service.js';
import { MemoryStore, request, validEnvelope } from './fixtures.mjs';

test('framework parser event replaces raw body and stack; other ERROR logs remain', () => {
  const forwarded = [], safe = [];
  const target = { error: (...args) => forwarded.push(args) };
  installJsonParserLogPrivacy(target, event => safe.push(event));
  target.error('SyntaxError: Unexpected token SECRET-EMAIL@example.com in JSON\n at parse (/workspace/node_modules/body-parser/lib/types/json.js:77:19)');
  assert.equal(safe.length, 1); assert.equal(safe[0].error_code, 'INVALID_JSON'); assert.equal(safe[0].http_status, 400);
  assert.deepEqual(Object.keys(safe[0]).sort(), ['error_code', 'event', 'http_status', 'status', 'timestamp']);
  assert.equal(forwarded.length, 0); assert.ok(!JSON.stringify(safe).includes('SECRET'));
  target.error('storage health failure'); target.error('SyntaxError: unrelated application failure');
  assert.equal(forwarded.length, 2);
});

test('operational events cover persistence, retry, conflict, schema, honeypot, rate, 500 without input', async () => {
  const events = []; const store = new MemoryStore();
  const handle = createIntakeHandler({ store, enabled: true, origins: ['http://localhost:5000'], onEvent: event => events.push(event) });
  const body = validEnvelope(); await handle(request(body)); await handle(request(body));
  const changed = structuredClone(body); changed.input.quantity = 'secret price'; await handle(request(changed));
  await handle(request(body, { rawBody: Buffer.from('{"SECRET":"private@example.com",') }));
  const invalid = validEnvelope(); invalid.input.company_name = ''; await handle(request(invalid));
  const honey = validEnvelope(); honey.input.website_confirmation = 'SECRET'; await handle(request(honey));
  store.consumeRate = async () => false; await handle(request(body));
  store.consumeRate = async () => { throw new Error('SECRET'); }; await handle(request(body));
  assert.deepEqual(events.map(e => e.error_code), ['RFQ_STORED', 'IDEMPOTENCY_REPLAY', 'IDEMPOTENCY_CONFLICT', 'INVALID_JSON', 'INVALID_SCHEMA', 'HONEYPOT', 'RATE_LIMITED', 'TEMPORARILY_UNAVAILABLE']);
  for (const event of events) { assert.deepEqual(Object.keys(event).sort(), ['error_code', 'http_status', 'latency_ms', 'status', 'timestamp']); assert.ok(event.latency_ms >= 0); }
  assert.ok(!JSON.stringify(events).includes('SECRET')); assert.ok(!JSON.stringify(events).includes('example.com'));
  assert.equal(events.at(-1).http_status, 500);
});

test('telemetry failure cannot turn durable success into failure', async () => {
  const store = new MemoryStore(); const handle = createIntakeHandler({ store, enabled: true, origins: ['http://localhost:5000'], onEvent() { throw new Error('logging unavailable'); } });
  assert.equal((await handle(request())).status, 201); assert.equal(store.records.size, 1);
});
