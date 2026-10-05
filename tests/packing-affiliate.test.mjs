import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

// Run after build: exercise the actual rendered CTA attributes with the shared tracker.
const html = readFileSync(new URL('../dist/first-trip-packing-list.html', import.meta.url), 'utf8');
const tracker = readFileSync(new URL('../src/components/AffiliateClickTracker.astro', import.meta.url), 'utf8').replace(/<\/?script\b[^>]*>/g, '');
const expected = [
  ['https://s.momoshop.com.tw/s/adj8XGZ3', 'eminent', 'momo', 'luggage', 'luggage-recommendation'],
  ['https://s.shopee.tw/AUuWzXaO2N', 'eminent', 'shopee', 'luggage', 'luggage-recommendation'],
  ['https://s.shopee.tw/9V1znny2lb', 'BAGSMART', 'shopee', 'packing-organizer', 'packing-recommendation'],
  ['https://s.momoshop.com.tw/s/6f8WFW16', 'BAGSMART', 'momo', 'packing-organizer', 'packing-recommendation'],
];
const anchors = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(match => match[0]);

for (const [url, brand, network, category, placement] of expected) {
  test(`rendered ${network} ${category} CTA preserves URL, external attributes and emits affiliate_click`, () => {
    const matches = anchors.filter(anchor => anchor.includes(`href="${url}"`));
    assert.equal(matches.length, 1);
    const attributes = Object.fromEntries([...matches[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
    assert.equal(attributes.target, '_blank');
    assert.equal(attributes.rel, 'sponsored noopener noreferrer');
    const calls = [];
    let handler;
    const window = { location: { href: 'https://comebacktraveler.com/first-trip-packing-list', pathname: '/first-trip-packing-list' }, gtag: (...args) => calls.push(args) };
    const document = { title: '第一次出國行李清單', documentElement: { lang: 'zh-Hant' }, addEventListener: (_, callback) => { handler = callback; } };
    runInNewContext(tracker, { window, document, URL });
    const link = { href: attributes.href, textContent: matches[0].replace(/<[^>]*>/g, ''), getAttribute: name => attributes[name] ?? null };
    handler({ target: { closest: () => link } });
    assert.equal(calls.length, 1);
    const [command, event, data] = calls[0];
    assert.equal(command, 'event');
    assert.equal(event, 'affiliate_click');
    assert.equal(data.brand, brand);
    assert.equal(data.affiliate_network, network);
    assert.equal(data.product_category, category);
    assert.equal(data.placement, placement);
    assert.equal(data.destination, 'general_travel');
    assert.equal(data.article, '/first-trip-packing-list');
    assert.equal(data.link_url, url);
  });
}

test('packing recommendations remain beside their relevant article sections without stale pricing', () => {
  const organizer = html.indexOf('id="packing-recommendation"');
  assert.ok(organizer > html.indexOf('衣物、盥洗用品、拖鞋、收納袋怎麼帶'));
  assert.ok(organizer < html.indexOf('藥品、防蚊、腸胃藥、OK 繃'));
  const luggage = html.indexOf('id="luggage-recommendation"');
  assert.ok(luggage > html.indexOf('24 吋前開行李箱，適合第一次出國嗎？'));
  assert.ok(luggage < html.indexOf('結論：不用帶很多，但重要的不能漏'));
  assert.ok(html.includes('價格與庫存以商品頁當下資訊為準。'));
  assert.ok(!html.includes('NT$7,650'));
  assert.ok(!html.includes('https://s.momoshop.com.tw/s/llZBggFG'));
});
