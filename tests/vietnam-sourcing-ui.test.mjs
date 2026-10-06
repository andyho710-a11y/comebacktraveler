import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as intake from '../src/lib/vietnam-sourcing/rfq.ts';

// Exercise the actual client controller with a small DOM harness; this is not a browser layout test.
const source = readFileSync(new URL('../src/scripts/vietnam-sourcing.ts', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
function harness(transport = intake.unavailableTransport, analytics = true) {
  const nodes = new Map(); const events = []; const listeners = {}; let reset = false;
  function node(id) { if (!nodes.has(id)) nodes.set(id, { id, name: id, textContent: '', attributes: {}, focus() { this.focused = true; }, setAttribute(key, value) { this.attributes[key] = value; }, removeAttribute(key) { delete this.attributes[key]; } }); return nodes.get(id); }
  const data = new FormData();
  for (const [key, value] of Object.entries({ company_name: '敏感公司', tax_id: '12345678', website: 'https://confidential.example.com', contact_name: '敏感姓名', email: 'pii@example.com', phone: '0912345678', line_id: 'secret-line', product_name: '產品', specifications: '機密規格', target_price: '秘密預算', additional_notes: '秘密備註', quantity: '100 件', product_category: 'other', frequency: 'unsure', oem: 'unsure', odm: 'unsure', private_label: 'unsure', existing_supplier_status: 'none', consent: 'yes' })) { data.set(key, value); node(key); node(`${key}-error`); }
  data.append('services_requested', 'samples');
  const form = Object.assign(node('sourcing-form'), { data, addEventListener(name, handler) { listeners[name] = handler; }, querySelectorAll(selector) { return [...nodes.values()].filter(item => selector === '.vs-error' ? item.id.endsWith('-error') : item.attributes['aria-invalid']); }, querySelector() { return [...nodes.values()].find(item => item.attributes['aria-invalid']); }, reset() { reset = true; } });
  const button = node('rfq-submit'); const feedback = node('rfq-feedback');
  const cta = { hash: '#rfq', addEventListener(name, handler) { this.click = handler; } }; const target = Object.assign(node('rfq'), { scrollIntoView(options) { this.scroll = options; } });
  const document = { querySelector(selector) { return selector === '#rfq' ? target : selector === '#sourcing-form' ? form : selector === '#rfq-submit' ? button : feedback; }, querySelectorAll() { return [cta]; }, getElementById(id) { return nodes.get(id); } };
  class DOMFormData extends FormData { constructor(element) { super(); for (const [key, value] of element.data.entries()) this.append(key, value); } }
  vm.runInNewContext(code, { ...intake, createHttpTransport: () => transport, document, window: { location: { search: '?utm_source=test&email=private' }, ...(analytics ? { gtag(command, event, dimensions) { events.push({ command, event, dimensions }); } } : {}) }, FormData: DOMFormData, matchMedia: () => ({ matches: true }), Date, JSON });
  return { form, button, feedback, nodes, events, cta, target, input: key => listeners.input({ target: node(key) }), submit: () => listeners.submit({ preventDefault() {} }), wasReset: () => reset };
}
test('actual controller tracks view/start/CTA once, respects reduced motion and emits no PII', () => {
  const ui = harness(); ui.input('contact_name'); ui.input('email'); ui.cta.click({ preventDefault() {} });
  assert.deepEqual(ui.events.map(item => item.event), ['vietnam_sourcing_view', 'vietnam_sourcing_form_start', 'vietnam_sourcing_cta_click']);
  assert.equal(ui.target.scroll.behavior, 'auto'); assert.equal(ui.target.focused, true);
  const serialized = JSON.stringify(ui.events);
  for (const value of ['敏感公司', '12345678', 'confidential.example.com', '敏感姓名', 'pii@example.com', '0912345678', 'secret-line', '機密規格', '秘密預算', '秘密備註', 'utm_source']) assert.ok(!serialized.includes(value));
  for (const item of ui.events) assert.deepEqual(Object.keys(item.dimensions).sort(), ['page_path', 'product_category', 'services_requested']);
});
test('actual controller validates fields and honeypot before any submit event or transport', async () => {
  let called = false; const ui = harness(async () => { called = true; return { ok: false, code: 'network' }; });
  ui.form.data.set('email', 'invalid'); await ui.submit(); assert.equal(ui.nodes.get('email').attributes['aria-invalid'], 'true'); assert.equal(ui.nodes.get('email').focused, true);
  ui.form.data.set('email', 'buyer@example.com'); ui.form.data.set('website_confirmation', 'bot'); await ui.submit();
  assert.equal(called, false); assert.equal(ui.events.some(item => item.event === 'vietnam_sourcing_form_submit'), false); assert.match(ui.feedback.textContent, /尚未送出/);
});
test('actual controller shows offline error, keeps data and never emits success', async () => {
  const ui = harness(); await ui.submit();
  assert.match(ui.feedback.textContent, /未能確認/); assert.equal(ui.wasReset(), false); assert.equal(ui.button.disabled, false);
  assert.equal(ui.events.filter(item => item.event === 'vietnam_sourcing_form_submit').length, 1); assert.equal(ui.events.some(item => item.event === 'vietnam_sourcing_form_success'), false);
  await ui.submit(); assert.equal(ui.events.filter(item => item.event === 'vietnam_sourcing_form_submit').length, 1);
});
test('actual controller shows loading, blocks concurrent submit and confirms only receipt', async () => {
  let finish; let called = 0;
  const ui = harness(payload => { called++; return new Promise(resolve => { finish = () => resolve({ ok: true, rfq_id: payload.rfq_id }); }); });
  const pending = ui.submit(); assert.equal(ui.button.disabled, true); assert.match(ui.button.textContent, /正在處理/); assert.equal(ui.form.attributes['aria-busy'], 'true');
  await ui.submit(); assert.equal(called, 1); finish(); await pending;
  assert.equal(ui.wasReset(), true); assert.equal(ui.button.disabled, true); assert.match(ui.feedback.textContent, /需求已成功送出/);
  assert.equal(ui.events.filter(item => item.event === 'vietnam_sourcing_form_success').length, 1); await ui.submit(); assert.equal(called, 1);
});
test('actual controller works without analytics and handles a throwing transport', async () => {
  const ui = harness(async () => { throw new Error('offline'); }, false); await ui.submit();
  assert.match(ui.feedback.textContent, /未能確認/); assert.equal(ui.button.disabled, false); assert.equal(ui.wasReset(), false);
});
for (const status of [400, 429, 500]) test(`controller never shows success after server ${status}`, async () => {
  const transport = intake.createHttpTransport('/api/rfq', async () => new Response(JSON.stringify({ stack: 'secret database details' }), { status }));
  const ui = harness(transport); await ui.submit();
  assert.match(ui.feedback.textContent, /未能確認/); assert.equal(ui.wasReset(), false);
  assert.ok(!ui.feedback.textContent.includes('secret')); assert.equal(ui.events.some(item => item.event === 'vietnam_sourcing_form_success'), false);
});
test('controller never shows success after timeout', async () => {
  const ui = harness(intake.createHttpTransport('/api/rfq', async () => { throw new DOMException('Timeout secret', 'TimeoutError'); })); await ui.submit();
  assert.match(ui.feedback.textContent, /未能確認/); assert.equal(ui.wasReset(), false); assert.ok(!ui.feedback.textContent.includes('secret'));
  assert.equal(ui.events.some(item => item.event === 'vietnam_sourcing_form_success'), false);
});
