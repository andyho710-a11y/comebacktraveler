import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { createHash } from 'node:crypto';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const tracker = read('src/components/AffiliateClickTracker.astro').replace(/<\/?script\b[^>]*>/g, '');
const baseline = JSON.parse(read('tests/fixtures/affiliate-repair-baseline.json'));
const decode = text => text.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, number) => String.fromCodePoint(number[0].toLowerCase() === 'x' ? parseInt(number.slice(1), 16) : Number(number))).replace(/&amp;/g, '&').replace(/&quot;/g, '"');
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])]));
const affiliate = a => (a.rel || '').split(' ').includes('sponsored') || !!a['data-affiliate'];
const anchors = html => [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(m => ({ ...attributes(m[0]), text: m[0].replace(/<[^>]*>/g, '').trim() })).filter(affiliate);
function setup(path = '/vietnam-packing-list') {
  const calls = []; let handler;
  const window = { location: { href: 'https://comebacktraveler.com' + path, pathname: path }, scrollY: 0, gtag: (...args) => calls.push(args) };
  const document = { referrer: '', documentElement: { lang: 'zh-TW', scrollHeight: 1000 }, addEventListener: (_, callback) => { handler = callback; } };
  runInNewContext(tracker, { window, document, URL });
  return { calls, window, document, click(a) {
    const link = { href: a.href, textContent: a.text || 'unsafe free text', getAttribute: key => a[key] ?? null, closest: () => null, classList: { contains: () => false }, getBoundingClientRect: () => ({ top: 200 }) };
    const matches = affiliate(a) || /https:\/\/(?:coupa\.ng|collshp\.com|s\.shopee\.tw|afflink\.one|onelink\.one|linkgo\.one|s\.momoshop\.com\.tw|amzn\.to|[^/]*amazon\.com)\//.test(a.href);
    handler({ target: { closest: () => matches ? link : null } }); return { payload: calls.at(-1)?.[2], link };
  } };
}
function quiz() {
  let result = { hidden: true, innerHTML: '', scrollIntoView() {} };
  const noop = () => {};
  const element = { querySelectorAll: () => [], addEventListener: noop, scrollIntoView: noop, classList: { remove: noop }, disabled: true };
  const document = { getElementById: id => id === 'result' ? result : element, querySelectorAll: () => [] };
  const source = read('src/pages/esim-quiz.astro').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  const context = { document }; runInNewContext(source + '\nglobalThis.qa = { brandFor, recommend, render };', context);
  return { ...context.qa, result };
}
const targetPages = ['/vietnam-mosquito-repellent', '/vietnam-packing-list', '/anti-theft-crossbody-bag-guide', '/esim/joytel', '/esim/saigon-airport-sim'];

test('Hosting adds exactly the requested uppercase 301 and retains existing URL normalization', () => {
  const hosting = JSON.parse(read('firebase.json')).hosting;
  assert.deepEqual(hosting.redirects, [{ source: '/vietnam-jCB-lounge', destination: '/vietnam-jcb-lounge', type: 301 }]);
  assert.equal(hosting.cleanUrls, true); assert.equal(hosting.trailingSlash, false); assert.equal(hosting.rewrites, undefined);
  assert.ok(!readdirSync(new URL('../src/pages/', import.meta.url)).includes('vietnam-jCB-lounge.astro'));
  assert.ok(read('dist/vietnam-jcb-lounge.html').includes('rel="canonical" href="https://comebacktraveler.com/vietnam-jcb-lounge"'));
});

test('three English placeholders stay present and noindex while sitemap removes only their URLs', () => {
  const excluded = ['/en/connectivity', '/en/travel-gear', '/en/vietnam-travel-prep'];
  const sitemap = [...read('dist/sitemap-0.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  assert.equal(sitemap.length, 39);
  for (const path of excluded) {
    const html = read('dist' + path + '.html');
    assert.match(html, /name="robots" content="noindex, follow"/);
    assert.ok(!sitemap.includes('https://comebacktraveler.com' + path));
  }
  assert.deepEqual(sitemap.slice().sort(), baseline.sitemap.filter(url => !excluded.some(path => url === 'https://comebacktraveler.com' + path)).sort());
});

for (const path of targetPages) {
  test('rendered explicit metadata emits six stable reporting dimensions: ' + path, () => {
    const ctas = anchors(read('dist' + path + '.html'));
    if (path === '/esim/joytel') { assert.equal(ctas.length, 0); return; }
    assert.ok(ctas.length);
    for (const a of ctas) {
      for (const key of ['data-affiliate-product', 'data-affiliate-product-key', 'data-affiliate-category', 'data-affiliate-merchant', 'data-cta-position']) assert.ok(a[key], key);
      assert.match(a['data-affiliate-product-key'], /^[a-z][a-z0-9_]+$/);
      const state = setup(path); const { payload, link } = state.click(a);
      assert.equal(state.calls.length, 1); assert.equal(state.calls[0][1], 'affiliate_click');
      assert.equal(payload.page_path, path); assert.equal(payload.product_key, a['data-affiliate-product-key']);
      assert.equal(payload.product_name, a['data-affiliate-product']); assert.equal(payload.product_category, a['data-affiliate-category']);
      assert.equal(payload.cta_position, a['data-cta-position']); assert.equal(payload.merchant, a['data-affiliate-merchant']);
      assert.equal(payload.affiliate_network, a['data-affiliate']); assert.equal(link.href, a.href);
    }
  });
}

test('quiz Japan is a safe internal fallback; three remaining affiliate variants preserve navigation and metadata', () => {
  const q = quiz();
  const variants = [['jp', 'stable'], ['kr', 'stable'], ['vn', 'stable'], ['vn', 'cheap']];
  for (const [dest, care] of variants) {
    const recommendation = q.recommend({ dest, care, days: 'short', people: 'solo' }); q.render(recommendation);
    if (dest === 'jp') {
      assert.equal(recommendation.cta.href, '/esim/japan'); assert.equal(recommendation.cta.aff, false);
      assert.equal(anchors(q.result.innerHTML).length, 0); assert.ok(!q.result.innerHTML.includes('data-affiliate'));
      const a = attributes(q.result.innerHTML.match(/<a\b[^>]*href="\/esim\/japan"[^>]*>/)[0]);
      const state = setup('/esim-quiz'); state.click(a); assert.equal(state.calls.length, 0); continue;
    }
    const [a] = anchors(q.result.innerHTML); assert.ok(a);
    assert.equal(a.href, baseline.quiz[dest + '_' + care]);
    assert.equal(a['data-affiliate-merchant'], dest === 'vn' && care === 'cheap' ? 'kkday' : 'joytel');
    assert.equal(a['data-affiliate-category'], 'esim'); assert.equal(a['data-cta-position'], 'quiz_result');
    const state = setup('/esim-quiz'); const { payload, link } = state.click(a);
    assert.equal(payload.product_key, a['data-affiliate-product-key']); assert.equal(payload.affiliate_network, 'affiliates_one');
    assert.ok(!payload.product_name.includes('你自己')); assert.equal(link.href, a.href); assert.ok(!payload.link_url.includes('?'));
  }
});

test('storefront and catalog CTA keys are explicitly collection keys, never a single item', () => {
  for (const path of ['/vietnam-mosquito-repellent', '/vietnam-packing-list', '/esim/joytel']) {
    for (const a of anchors(read('dist' + path + '.html'))) {
      if (a.href.includes('collshp.com') || a.href.includes('/zf2Z8')) assert.match(a['data-affiliate-product-key'], /^collection_/);
    }
  }
  const q = quiz();
  for (const dest of ['kr', 'vn']) assert.match(q.brandFor(dest, 'stable').cta.metadata.key, /^collection_/);
});

test('linkgo classifies as Affiliates.One; explicit KKday merchant is distinct; lookalike domains do not match', () => {
  const a = { href: 'https://linkgo.one/s/qG9cT', rel: 'sponsored', 'data-affiliate-merchant': 'kkday' };
  const p = setup().click(a).payload; assert.equal(p.affiliate_network, 'affiliates_one'); assert.equal(p.merchant, 'kkday');
  const unknown = setup().click({ href: 'https://evil-linkgo.one.example/s/123', rel: 'sponsored' }).payload;
  assert.equal(unknown.affiliate_network, 'affiliate'); assert.equal(unknown.merchant, 'unknown');
  assert.equal(setup().click({ href: a.href, rel: 'sponsored' }).payload.merchant, 'unknown');
});

test('affiliate payload strips PII/session/search/order queries, hash and userinfo without mutating href', () => {
  const state = setup();
  const secrets = ['person@example.com', '0912345678', 'line_private', 'private_person', 'private_company', 'rfq_secret', 'order_secret', 'session_secret', 'free_text_secret'];
  const query = new URLSearchParams(Object.fromEntries(['email', 'phone', 'line', 'name', 'company', 'rfq', 'order_id', 'sid', 'q'].map((key, i) => [key, secrets[i]]))).toString();
  state.window.location.href += '?' + query; state.document.referrer = 'https://search.example/?' + query;
  const href = 'https://person%40example.com:session_secret@afflink.one/s/5SmIS?' + query + '#private_person';
  const a = { href, rel: 'sponsored', text: secrets.join(' '), 'data-affiliate-product': 'JOYTEL 日本 eSIM', 'data-affiliate-product-key': 'joytel_japan_esim', 'data-affiliate-merchant': 'joytel' };
  const { payload, link } = state.click(a); const serialized = JSON.stringify(payload);
  for (const secret of secrets) assert.ok(!serialized.includes(secret), secret);
  assert.ok(!/[?#@]/.test(payload.link_url)); assert.equal(payload.link_url, 'https://afflink.one/s/5SmIS');
  assert.equal(payload.page_location, 'https://comebacktraveler.com/vietnam-packing-list'); assert.equal(payload.page_referrer, 'https://search.example');
  assert.equal(payload.button_text, undefined); assert.equal(payload.page_title, undefined); assert.equal(link.href, href);
});

test('unsafe metadata and session-bearing paths cannot copy personal text into payload', () => {
  const state = setup('/person@example.com');
  const href = 'https://booking.com/orders/person@example.com/0912345678?sid=private';
  const p = state.click({ href, rel: 'sponsored', 'data-affiliate-product': 'person@example.com', 'data-affiliate-product-key': 'person@example.com', 'data-affiliate-merchant': 'private person', 'data-affiliate-category': 'phone=0912345678', 'data-cta-position': 'line@secret' }).payload;
  assert.equal(p.page_path, '/'); assert.equal(p.link_url, 'https://booking.com'); assert.equal(p.product_name, 'unspecified'); assert.equal(p.product_key, 'unspecified');
  assert.equal(p.merchant, 'unknown'); assert.equal(p.product_category, 'uncategorized'); assert.ok(!JSON.stringify(p).includes('person@example.com'));
});

test('every remaining static affiliate href and page placement order matches baseline byte-for-byte', () => {
  for (const [path, expected] of Object.entries(baseline.links)) {
    const html = read('dist/' + (path === '/' ? 'index' : path.slice(1)) + '.html');
    assert.deepEqual(anchors(html).map(a => a.href), expected.filter(href => !/\/(zf2Z8|z4xjt)(?:\?|$)/.test(href)), path);
  }
});

test('all ten static parked CTAs become internal navigation without affiliate attributes or click events', () => {
  const mapping = [['/esim/china', '/esim'], ['/esim/joytel', '/esim'], ['/esim/troubleshoot', '/esim'], ['/vietnam-jcb-lounge', '/esim'], ['/esim/japan', '/esim/japan']];
  let fallbackCount = 0;
  for (const [path, destination] of mapping) {
    const html = read('dist' + path + '.html');
    assert.ok(!/zf2Z8|z4xjt/.test(html), path);
    const fallbacks = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].filter(m => /(?:目前可用|比較其他日本)/.test(m[0])).map(m => ({ ...attributes(m[0]), text: m[0].replace(/<[^>]*>/g, '').trim() }));
    assert.equal(fallbacks.length, 2, path); fallbackCount += fallbacks.length;
    for (const a of fallbacks) {
      assert.equal(a.href, destination); assert.equal(a.target, undefined); assert.equal(affiliate(a), false);
      assert.ok(!Object.keys(a).some(key => key.startsWith('data-affiliate') || key === 'data-cta-position'));
      const state = setup(path); state.click(a); assert.equal(state.calls.length, 0);
    }
  }
  assert.equal(fallbackCount, 10);
  assert.ok(!/zf2Z8|z4xjt/.test(read('dist/esim-quiz.html')));
  // There were no parked Korea-specific CTAs: retain its valid owner URLs via the global regression test.
  assert.ok(!/zf2Z8|z4xjt/.test(read('dist/esim/korea.html')));
});

test('JOYTEL rendered content remains unchanged except authorized CTA anchors, transparency note and responsive styles', () => {
  const fixture = JSON.parse(read('tests/fixtures/affiliate-repair-1-1-baseline.json'));
  const normalized = read('dist/esim/joytel.html').replace(/<a\b[^>]*href="(?:https:\/\/afflink.one\/s\/zf2Z8|\/esim)"[^>]*>[\s\S]*?<\/a>/g, '<fallback-cta/>').replace(/<p class="cta-label"[^>]*>[\s\S]*?<\/p>/g, '<cta-transparency/>').replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '<page-style/>').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '<page-script/>').replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, '<stylesheet/>');
  // Executable scripts/styles are outside editorial content; schema/head have independent exact assertions below.
  assert.equal(createHash('sha256').update(normalized).digest('hex'), fixture.joytel_rendered_content_sha256);
});

test('packing exact disclosure appears once before first commercial CTA', () => {
  const html = read('dist/vietnam-packing-list.html');
  const phrase = '💡 透明聲明：本文部分連結為聯盟行銷連結。你透過連結購買，我會獲得少許佣金，但不影響你的價格與我的建議立場。';
  assert.equal(html.split(phrase).length - 1, 1); assert.ok(html.indexOf(phrase) < html.indexOf('href="https://collshp.com/'));
  assert.match(html, /<p class="disclosure"[^>]*>\s*💡 透明聲明/);
});

test('requested core production routes and protected JOYTEL head/body/schema remain intact', () => {
  for (const path of ['/', '/esim', '/esim/japan', '/esim/korea', '/esim/joytel', ...targetPages, '/vietnam-jcb-lounge']) {
    assert.match(read('dist/' + (path === '/' ? 'index' : path.slice(1)) + '.html'), /<!doctype html>/i);
  }
  const html = read('dist/esim/joytel.html');
  assert.equal(html.match(/<title>(.*?)<\/title>/s)[1], baseline.joytel.title);
  assert.equal(attributes(html.match(/<meta name="description"[^>]*>/)[0]).content, baseline.joytel.description);
  assert.equal(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1], baseline.joytel.h1);
  const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.deepEqual(schemas, baseline.joytel.schemas);
});

test('real case-sensitive Hosting uppercase -> 301 -> lowercase 200 and existing aliases do not loop', { skip: !process.env.REPAIR_HOSTING_URL }, async () => {
  const origin = process.env.REPAIR_HOSTING_URL;
  for (const path of ['/vietnam-jCB-lounge', '/vietnam-jcb-lounge/', '/vietnam-jcb-lounge.html']) {
    const response = await fetch(origin + path, { redirect: 'manual' }); assert.equal(response.status, 301);
    const destination = new URL(response.headers.get('location'), origin); assert.equal(destination.pathname, '/vietnam-jcb-lounge');
    assert.equal(destination.origin, origin); const final = await fetch(destination, { redirect: 'manual' }); assert.equal(final.status, 200);
    assert.equal(final.headers.get('location'), null); assert.ok((await final.text()).includes('https://comebacktraveler.com/vietnam-jcb-lounge'));
  }
  assert.equal((await fetch(origin + '/vietnam-jcb-lounge', { redirect: 'manual' })).status, 200);
});
