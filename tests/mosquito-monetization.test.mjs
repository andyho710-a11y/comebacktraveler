import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const baseline = JSON.parse(read('tests/fixtures/mosquito-monetization-baseline.json'));
const html = read('dist/vietnam-mosquito-repellent.html');
const page = read('src/pages/vietnam-mosquito-repellent.astro');
const source = read('src/components/AffiliateClickTracker.astro').replace(/<\/?script\b[^>]*>/g, '');
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
const attrs = s => Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])]));
const affiliates = s => [...s.matchAll(/<a\b[^>]*>/g)].map(m => attrs(m[0])).filter(a => a['data-affiliate'] || /\bsponsored\b/.test(a.rel || ''));
const ctas = affiliates(html);
const keys = ['dintin_picaridin_10h', 'collection_vietnam_travel_essentials'];
const experiment = 'mosquito_monetization_v1';
function setup({ path = '/vietnam-mosquito-repellent', ready = 'complete', io = true, extra = [] } = {}) {
  const events = []; const handlers = {}; const timers = new Map(); let clock = 0; let timerId = 0;
  const links = [...ctas, ...extra].map(a => ({
    href: a.href, attributes: { ...a }, textContent: 'email@example.test 0912345678 RFQ search user input',
    getAttribute(name) { return this.attributes[name] ?? null; },
    closest: () => null, classList: { contains: () => false }, getBoundingClientRect: () => ({ top: 200 })
  }));
  let observer;
  class IO {
    constructor(callback, options) { this.callback = callback; this.options = options; this.observed = new Set(); this.records = []; observer = this; }
    observe(link) { this.observed.add(link); }
    unobserve(link) { this.observed.delete(link); }
    takeRecords() { return this.records.splice(0); }
  }
  const window = {
    location: { pathname: path, href: 'https://comebacktraveler.com' + path + '?email=private@example.test&phone=0912345678&order_id=12345678#RFQ' },
    scrollY: 0, gtag: (...a) => events.push(a),
    setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimeout: id => timers.delete(id), ...(io ? { IntersectionObserver: IO } : {})
  };
  const document = {
    hidden: false, readyState: ready, referrer: 'https://example.test/private@example.test?q=PII#LINE',
    documentElement: { lang: 'zh-TW', scrollHeight: 1000 },
    addEventListener(type, fn) { (handlers[type] ||= []).push(fn); },
    querySelectorAll: () => links
  };
  const init = () => runInNewContext(source, { window, document, URL, Set, Map }); init();
  function emit(index, ratio, isIntersecting = ratio > 0) { observer.callback([{ target: links[index], intersectionRatio: ratio, isIntersecting }]); }
  function advance(ms) {
    const deadline = clock + ms;
    while (true) {
      const next = [...timers].filter(([, t]) => t.at <= deadline).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      clock = next[1].at; timers.delete(next[0]); next[1].fn();
    }
    clock = deadline;
  }
  const click = index => handlers.click[0]({ target: { closest: () => links[index] } });
  const views = () => events.filter(a => a[1] === 'affiliate_cta_view');
  const visibility = hidden => { document.hidden = hidden; handlers.visibilitychange?.forEach(fn => fn()); };
  return { links, events, handlers, window, document, init, emit, advance, click, views, visibility, observer: () => observer };
}

test('mosquito URL, title, description, H1, canonical and robots remain exact', () => {
  for (const pattern of [/<title>.*?<\/title>/s, /<meta name="description"[^>]*>/, /<link rel="canonical"[^>]*>/, /<meta name="robots"[^>]*>/]) {
    assert.equal(html.match(pattern)[0], baseline.head.match(pattern)[0]);
  }
  assert.equal(html.match(/<h1\b[^>]*>.*?<\/h1>/s)[0], baseline.h1);
  assert.match(page, /const canonical = "https:\/\/comebacktraveler.com\/vietnam-mosquito-repellent"/);
});
test('Article and FAQ schemas remain exact', () => {
  assert.deepEqual([...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m => m[1]), baseline.schema);
});
test('main article, FAQ, quick list and internal links are preserved outside decision blocks', () => {
  const editorial = text => text.match(/<article class="article">([\s\S]*?)<\/article>/)[1]
    .replace(/<section class="(?:quick-decision|commercial-decision)"[\s\S]*?<\/section>/g, '')
    .replace(/<div class="(?:product-card|shopee-block)">[\s\S]*?\n  <\/div>/g, '')
    .replace(/<p class="disclosure">[\s\S]*?<\/p>/g, '').replace(/<AffiliateDisclosure\s*\/>/g, '').replace(/\s+/g, ' ').trim();
  assert.equal(editorial(page), editorial(baseline.pageSource));
  assert.equal(page.match(/const quickList = \[[\s\S]*?\];/)[0].replace(/\r\n/g, '\n'), baseline.pageSource.match(/const quickList = \[[\s\S]*?\];/)[0].replace(/\r\n/g, '\n'));
});
test('exact two product keys and distinct merchants, categories, positions and experiment IDs', () => {
  assert.equal(ctas.length, 2);
  assert.deepEqual(ctas.map(a => a['data-affiliate-product-key']), keys);
  assert.deepEqual(ctas.map(a => a['data-affiliate-merchant']), ['coupang', 'shopee']);
  assert.deepEqual(ctas.map(a => a['data-affiliate-category']), ['mosquito_repellent', 'travel_essentials']);
  assert.deepEqual(ctas.map(a => a['data-cta-position']), ['decision_primary', 'decision_collection']);
  assert.deepEqual(ctas.map(a => a['data-affiliate']), ['coupang', 'shopee']);
  assert.ok(ctas.every(a => a['data-experiment-id'] === experiment && a['data-affiliate-product']));
});
test('exact affiliate navigation hrefs remain unchanged', () => {
  assert.deepEqual(ctas.map(a => a.href), baseline.affiliateHrefs['vietnam-mosquito-repellent.html'].map(decode));
  for (const name of ['COUPANG_PICARIDIN', 'SHOPEE_URL']) {
    const pattern = new RegExp('const ' + name + ' = "([^"]+)"');
    assert.equal(page.match(pattern)[1], baseline.pageSource.match(pattern)[1]);
  }
});
test('one existing disclosure precedes both CTA anchors and quick choice follows DEET', () => {
  assert.equal((page.match(/<AffiliateDisclosure\s*\/>/g) || []).length, 1);
  assert.equal((html.match(/class="aff-disclosure"/g) || []).length, 1);
  assert.ok(html.indexOf('class="aff-disclosure"') < html.indexOf('href="https://coupa.ng/'));
  assert.ok(page.indexOf('二、DEET') < page.indexOf('id="quick-decision-title"'));
  assert.match(html, /這是多品項商品清單，不是單一防蚊商品/);
  assert.match(html, /價格與庫存以商家頁面當下資訊為準/);
});
test('both affiliate clicks preserve schema and append only scoped experiment ID', () => {
  const s = setup(); s.click(0); s.click(1);
  assert.deepEqual(s.events.map(e => e[1]), ['affiliate_click', 'affiliate_click']);
  s.events.forEach((e, i) => {
    const p = e[2]; assert.equal(p.product_key, keys[i]); assert.equal(p.experiment_id, experiment);
    assert.equal(p.product_name, ctas[i]['data-affiliate-product']); assert.equal(p.cta_position, ctas[i]['data-cta-position']);
    assert.equal(p.merchant, ctas[i]['data-affiliate-merchant']); assert.equal(p.affiliate_network, ctas[i]['data-affiliate']);
    assert.ok('brand' in p && 'placement' in p && 'destination' in p && 'article' in p && 'link_url' in p);
    assert.equal(s.links[i].href, ctas[i].href);
  });
});
test('49% visibility never counts even after dwell', () => { const s = setup(); s.emit(0, .49); s.advance(5000); assert.equal(s.views().length, 0); });
test('50% continuously visible requires full 1000ms dwell', () => { const s = setup(); s.emit(0, .5); s.advance(999); assert.equal(s.views().length, 0); s.advance(1); assert.equal(s.views().length, 1); });
test('each product sends only one view per page view', () => { const s = setup(); s.emit(0, 1); s.advance(1000); s.emit(0, 1); s.advance(5000); assert.equal(s.views().length, 1); });
test('the two different CTA products each send one view', () => { const s = setup(); s.emit(0, .5); s.emit(1, .5); s.advance(1000); assert.deepEqual(s.views().map(e => e[2].product_key), keys); });
test('scroll away and back after emission does not duplicate', () => { const s = setup(); s.emit(0, 1); s.advance(1000); s.emit(0, 0); s.emit(0, 1); s.advance(2000); assert.equal(s.views().length, 1); });
test('scroll away before dwell cancels timer and return needs fresh full dwell', () => { const s = setup(); s.emit(0, .7); s.advance(900); s.emit(0, .4); s.advance(2000); s.emit(0, .7); s.advance(999); assert.equal(s.views().length, 0); s.advance(1); assert.equal(s.views().length, 1); });
test('hidden document cancels dwell and resume requires new visibility and dwell', () => { const s = setup(); s.emit(0, 1); s.advance(900); s.visibility(true); s.advance(2000); s.visibility(false); s.advance(2000); assert.equal(s.views().length, 0); s.emit(0, .5); s.advance(1000); assert.equal(s.views().length, 1); });
test('queued threshold crossings cannot count interrupted dwell', () => {
  const s = setup(); s.emit(0, .6); s.advance(900);
  s.observer().records.push({ target: s.links[0], intersectionRatio: .4, isIntersecting: true }, { target: s.links[0], intersectionRatio: .6, isIntersecting: true });
  s.advance(100); assert.equal(s.views().length, 0); s.advance(1000); assert.equal(s.views().length, 1);
});
test('view payload uses explicit safe dimensions without link/query/button/user text', () => {
  const s = setup(); s.emit(0, .5); s.advance(1000); const p = s.views()[0][2];
  assert.deepEqual(Object.keys(p).sort(), ['page_path', 'page_location', 'page_referrer', 'merchant', 'product_key', 'product_name', 'product_category', 'cta_position', 'affiliate_network', 'experiment_id', 'transport_type'].sort());
  assert.equal(p.page_path, '/vietnam-mosquito-repellent');
  assert.ok(!/private|0912345678|email|order_id|RFQ|search user|\?|#/.test(JSON.stringify(p)));
});
test('click privacy strips URL queries and never reads CTA free text', () => {
  const s = setup(); s.click(0); s.click(1);
  assert.ok(!/private|0912345678|email|order_id|RFQ|search user|\?|#/.test(JSON.stringify(s.events)));
});
test('unsafe editorial product name and machine dimension fail closed', () => {
  const s = setup(); s.links[0].attributes['data-affiliate-product'] = 'private@example.test 0912345678';
  s.click(0); assert.equal(s.events[0][2].product_name, 'unspecified');
  s.links[0].attributes['data-cta-position'] = 'RFQ email@example.test'; s.click(0);
  assert.equal(s.events[1][2].experiment_id, undefined);
});
test('other pages retain existing clicks and never initialize view experiment', () => {
  const s = setup({ path: '/vietnam-packing-list' }); assert.equal(s.observer(), undefined); s.click(0);
  assert.equal(s.events.length, 1); assert.equal(s.events[0][2].experiment_id, undefined);
});
test('unapproved key, merchant or experiment metadata never enables extra views', () => {
  const extra = [{ ...ctas[0], 'data-affiliate-product-key': 'unapproved' }, { ...ctas[0], 'data-affiliate-merchant': 'shopee' }, { ...ctas[0], 'data-experiment-id': 'other' }];
  const s = setup({ extra }); assert.equal(s.observer().observed.size, 2);
  for (let i = 2; i < 5; i++) { s.click(i); assert.equal(s.events.at(-1)[2].experiment_id, undefined); }
});
test('tracker waits for DOM content and duplicate initialization stays singleton', () => {
  const s = setup({ ready: 'loading' }); assert.equal(s.observer(), undefined); s.init();
  assert.equal(s.handlers.DOMContentLoaded.length, 1); assert.equal(s.handlers.click.length, 1);
  s.handlers.DOMContentLoaded[0](); assert.equal(s.observer().observed.size, 2);
});
test('missing observer or analytics does not break navigation or throw', () => {
  const noIO = setup({ io: false }); assert.equal(noIO.observer(), undefined); noIO.click(0); assert.equal(noIO.events.length, 1);
  const s = setup(); s.window.gtag = undefined; s.emit(0, 1); s.advance(1000); s.click(0); assert.equal(s.events.length, 0);
});
test('every site affiliate URL and ordering remain equal to locked main baseline', () => {
  for (const [path, hrefs] of Object.entries(baseline.affiliateHrefs)) assert.deepEqual(affiliates(read('dist/' + path)).map(a => a.href), hrefs.map(decode), path);
});
test('no parked JOYTEL link regression anywhere in built HTML or quiz', () => {
  const walk = path => readdirSync(new URL('../' + path, import.meta.url), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path + '/' + e.name) : e.name.endsWith('.html') ? [path + '/' + e.name] : []);
  for (const file of walk('dist')) assert.ok(!/zf2Z8|z4xjt/.test(read(file)), file);
});
