import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { publicConfig } from '../src/lib/public-config.mjs';
import { validateInquiry, inquiryText, sourceFromSearch, analyticsEvent } from '../src/lib/domain.mjs';
import { inquiry } from './fixtures.mjs';
test('public configuration rejects dangerous contact URLs and non-origin site URLs', () => {
  assert.equal(publicConfig({}).launched, false);
  const env = { STUDIO_LAUNCH_MODE: 'line-only', STUDIO_SITE_URL: 'https://example.test', STUDIO_LINE_URL: 'https://line.me/ti/p/~synthetic', STUDIO_LINE_ID: 'synthetic' };
  assert.equal(publicConfig(env).launched, true);
  for (const url of ['javascript:alert(1)', 'https://evil.invalid/id', 'https://line.me/ti/p/?text=private', 'https://line.me/']) assert.throws(() => publicConfig({ ...env, STUDIO_LINE_URL: url }));
  for (const url of ['http://example.test', 'https://example.test/path', 'https://example.test/?name=private']) assert.throws(() => publicConfig({ ...env, STUDIO_SITE_URL: url }));
});
test('actual public controller never fetches intake/config/analytics and only produces local text', async () => {
  const nodes = new Map();
  function node() { return { hidden: false, disabled: false, textContent: '', value: '', listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; } }; }
  for (const id of ['#inquiry-form', '#form-status', '#submit-inquiry', '#make-text', '#message-text', '#message-box', '#copy-text', '#environment', '#privacy-contact', '#line-link', '#line-status']) nodes.set(id, node());
  const form = nodes.get('#inquiry-form'); form.dataset = { launchMode: 'line-only', lineUrl: 'https://line.me/ti/p/~synthetic', lineId: 'synthetic' }; form.elements = { date: {} }; form.reportValidity = () => true;
  const value = inquiry(); value.name = ''; value.contact = ''; const fields = Object.entries({ ...value, waitHours: '2', passengers: '2', bags: '1', consent: 'on' }).filter(([key]) => !['startedAt', 'source'].includes(key));
  const requests = [];
  let time = Date.now();
  class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [time])); } static now() { return time; } }
  const context = { document: { querySelector: selector => nodes.get(selector), querySelectorAll: () => [] }, location: { search: '?utm_source=referral', origin: 'https://example.test' }, crypto: webcrypto, URLSearchParams, FormData: class { [Symbol.iterator]() { return fields[Symbol.iterator](); } }, fetch: async (...args) => { requests.push(args); throw Error('Public network collection is forbidden'); }, Date: ClockDate, Intl, validateInquiry: input => validateInquiry(input, new Date(time)), inquiryText, sourceFromSearch, analyticsEvent, AbortSignal, window: {}, navigator: {} };
  const code = readFileSync(new URL('../src/scripts/inquiry.mjs', import.meta.url), 'utf8').replace(/^import .*?;\r?\n/, '');
  await vm.runInNewContext(`(async () => {${code}\n})()`, context);
  assert.equal(nodes.get('#submit-inquiry').hidden, true);
  await form.listeners.input();
  await form.listeners.submit({ preventDefault() {} });
  time += 3000;
  await nodes.get('#make-text').listeners.click();
  assert.match(nodes.get('#message-text').value, /尚非正式預約/);
  assert.match(nodes.get('#message-text').value, /透過本次 LINE 對話聯繫/);
  assert.equal(nodes.get('#message-box').hidden, false);
  assert.equal(requests.length, 0);
});
