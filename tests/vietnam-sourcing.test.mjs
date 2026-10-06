import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyticsDimensions, createHttpTransport, createSubmissionGate, readIntake, serializeRFQ, unavailableTransport, validateIntake, REQUIRED_FIELDS, RFQ_STATUSES } from '../src/lib/vietnam-sourcing/rfq.ts';

function validData() {
  const data = new FormData();
  for (const [key, value] of Object.entries({ company_name: '測試公司', contact_name: '測試聯絡人', email: 'buyer@example.com', phone: '+886 912345678', product_name: '桌子', specifications: '木製，機密規格', quantity: '100 張', product_category: 'furniture', frequency: 'monthly', oem: 'yes', odm: 'no', private_label: 'unsure', existing_supplier_status: 'none', consent: 'yes' })) data.set(key, value);
  data.append('services_requested', 'supplier_search');
  data.append('services_requested', 'samples');
  return data;
}
const validInput = () => readIntake(validData());
test('each required field rejects blank and whitespace input', () => {
  for (const field of REQUIRED_FIELDS) { const data = validData(); data.set(field, '  '); const result = validateIntake(readIntake(data)); assert.equal(result.valid, false); assert.ok(result.errors[field]); }
});
test('invalid email and missing consent are rejected', () => {
  for (const email of ['bad', 'a@', 'a@b', 'a b@example.com']) assert.ok(validateIntake({ ...validInput(), email }).errors.email);
  assert.ok(validateIntake({ ...validInput(), consent: false }).errors.consent);
});
test('honeypot fails closed without serialization or transport', async () => {
  const input = { ...validInput(), website_confirmation: 'bot' };
  assert.deepEqual(validateIntake(input), { valid: false, spam: true, errors: { form: '無法處理這次需求，資料尚未送出。' } });
  assert.throws(() => serializeRFQ(input), /Invalid RFQ/);
});
test('payload serialization preserves business fields, attribution and consent', () => {
  const payload = serializeRFQ(validInput(), '?utm_source=test&utm_medium=referral&utm_campaign=sourcing&utm_content=hero&utm_term=wood&email=private', 'fixture-id', '2026-10-06T00:00:00.000Z');
  assert.equal(payload.rfq_id, 'fixture-id'); assert.equal(payload.created_at, '2026-10-06T00:00:00.000Z');
  assert.equal(payload.company.name, '測試公司'); assert.equal(payload.contact.email, 'buyer@example.com');
  assert.equal(payload.specifications, '木製，機密規格'); assert.equal(payload.quantity, '100 張');
  assert.deepEqual(payload.services_requested, ['supplier_search', 'samples']); assert.deepEqual(payload.attachments, []);
  assert.equal(payload.utm_source, 'test'); assert.equal(payload.utm_medium, 'referral'); assert.equal(payload.utm_campaign, 'sourcing'); assert.equal(payload.utm_content, 'hero'); assert.equal(payload.utm_term, 'wood');
  assert.equal(payload.landing_page, '/vietnam-sourcing'); assert.equal(payload.status, 'new'); assert.equal(payload.consent.accepted, true);
  assert.equal(payload.consent.accepted_at, payload.created_at); assert.equal(JSON.parse(JSON.stringify(payload)).schema_version, 1);
  assert.equal(RFQ_STATUSES.length, 10);
});
test('length, website and enum tampering fail validation', () => {
  for (const [key, value] of [['specifications', 'x'.repeat(4001)], ['company_name', 'x'.repeat(301)], ['website', 'javascript:alert(1)'], ['tax_id', 'abc'], ['frequency', 'daily'], ['product_category', 'buyer@example.com'], ['oem', 'maybe'], ['existing_supplier_status', 'unknown'], ['services_requested', ['private-spec']]]) assert.equal(validateIntake({ ...validInput(), [key]: value }).valid, false, key);
  assert.equal(validateIntake(validInput()).valid, true);
});
test('GA4 dimensions are allowlisted and cannot contain PII or free text', () => {
  assert.deepEqual(analyticsDimensions('furniture', ['samples', 'samples', 'buyer@example.com', 'secret specifications']), { page_path: '/vietnam-sourcing', product_category: 'furniture', services_requested: 'samples' });
  assert.deepEqual(analyticsDimensions('buyer@example.com', ['__proto__']), { page_path: '/vietnam-sourcing', product_category: 'unspecified', services_requested: 'none' });
  const dimensions = JSON.stringify(analyticsDimensions('家具；電話0912345678', ['測試聯絡人', 'supplier_search']));
  for (const forbidden of ['0912345678', '測試聯絡人', 'buyer@example.com', 'specifications', 'contact', 'utm']) assert.ok(!dimensions.includes(forbidden));
});
test('unconfigured transport never fakes success', async () => {
  assert.deepEqual(await unavailableTransport(serializeRFQ(validInput())), { ok: false, code: 'not_configured' });
});
test('HTTP transport requires matching durable receipt and idempotency key', async () => {
  const payload = serializeRFQ(validInput()); let seen;
  const transport = createHttpTransport('/api/vietnam-sourcing', async (url, options) => { seen = { url, options }; return new Response(JSON.stringify({ stored: true, rfq_id: payload.rfq_id })); });
  assert.deepEqual(await transport(payload), { ok: true, rfq_id: payload.rfq_id });
  assert.equal(seen.options.headers['Idempotency-Key'], payload.rfq_id); assert.deepEqual(JSON.parse(seen.options.body), payload);
  for (const body of [{ ok: true }, { stored: true, rfq_id: 'different' }, { stored: false, rfq_id: payload.rfq_id }]) assert.equal((await createHttpTransport('/api/rfq', async () => new Response(JSON.stringify(body)))(payload)).ok, false);
  assert.throws(() => createHttpTransport('https://external.example/api'), /same-origin/);
});
test('HTTP transport handles server errors, invalid JSON and network failures', async () => {
  const payload = serializeRFQ(validInput());
  assert.equal((await createHttpTransport('/api/rfq', async () => new Response('{}', { status: 429 }))(payload)).code, 'rejected');
  assert.equal((await createHttpTransport('/api/rfq', async () => new Response('invalid'))(payload)).code, 'network');
  assert.equal((await createHttpTransport('/api/rfq', async () => { throw new Error('offline'); })(payload)).code, 'network');
});
test('submission gate blocks concurrent attempts, cooldown and repeat after success', async () => {
  let finish; let calls = 0;
  const payload = serializeRFQ(validInput());
  const gate = createSubmissionGate(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const first = gate(payload, 10000);
  assert.equal((await gate(payload, 16000)).code, 'busy');
  finish({ ok: false, code: 'network' }); await first;
  assert.equal((await gate(payload, 11000)).code, 'busy');
  const second = gate(payload, 17000); finish({ ok: true, rfq_id: payload.rfq_id }); await second;
  assert.equal((await gate(payload, 30000)).code, 'busy'); assert.equal(calls, 2);
});
test('rendered page has truthful offline notice, labeled fields and real SEO/FAQ', () => {
  const html = readFileSync(new URL('../dist/vietnam-sourcing.html', import.meta.url), 'utf8');
  assert.match(html, /線上需求接收功能準備中/); assert.match(html, /目前不接收檔案/);
  assert.match(html, /href="https:\/\/comebacktraveler.com\/vietnam-sourcing"/);
  const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(match => JSON.parse(match[1]));
  const nodes = schemas.flatMap(schema => schema['@graph'] ?? [schema]);
  for (const type of ['WebPage', 'Service', 'BreadcrumbList', 'FAQPage']) assert.ok(nodes.some(node => node['@type'] === type));
  const faq = nodes.find(node => node['@type'] === 'FAQPage'); assert.equal(faq.mainEntity.length, 6);
  for (const item of faq.mainEntity) { assert.ok(html.includes(item.name)); assert.ok(html.includes(item.acceptedAnswer.text)); }
  for (const field of REQUIRED_FIELDS) { assert.match(html, new RegExp(`for="${field}"`)); assert.match(html, new RegExp(`id="${field}"[^>]*required`)); }
  assert.ok(!html.includes('type="file"')); assert.ok(!html.includes('action='));
  assert.match(html, /id="consent"[^>]*required/); assert.match(html, /href="\/privacy"/);
  assert.match(html, /G-XW4LBK8PYF/);
});
