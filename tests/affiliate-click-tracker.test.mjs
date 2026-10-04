import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { esimRecommendations } from '../src/data/esim-recommendations.ts';

const source = readFileSync(new URL('../src/components/AffiliateClickTracker.astro', import.meta.url), 'utf8')
  .replace(/<\/?script\b[^>]*>/g, '');

function setup() {
  const calls = [];
  const listeners = [];
  const window = {
    location: { href: 'https://comebacktraveler.com/esim', pathname: '/esim' },
    scrollY: 0,
    gtag: (...args) => calls.push(args),
  };
  const document = {
    title: 'eSIM', documentElement: { lang: 'zh-TW', scrollHeight: 1000 },
    addEventListener: (type, handler) => listeners.push({ type, handler }),
  };
  const context = { window, document, URL };
  const init = () => runInNewContext(source, context);
  init();
  return { calls, listeners, window, init };
}

function link(attributes = {}) {
  return {
    href: 'https://afflink.one/s/5SmIS', textContent: ' 查看日本方案 → ',
    getAttribute: (name) => attributes[name] ?? null,
    closest: () => null,
    classList: { contains: () => false },
    getBoundingClientRect: () => ({ top: 100 }),
  };
}

test('nested CTA click emits one affiliate event with the four reporting dimensions', () => {
  const state = setup();
  const cta = link({
    'data-affiliate': 'affiliates_one', 'data-affiliate-brand': 'JOYTEL',
    'data-affiliate-placement': 'esim_quick_decision', 'data-cta-position': 'esim_quick_decision',
    'data-affiliate-destination': 'japan', 'data-affiliate-article': '/esim',
    'data-affiliate-product': 'JOYTEL 日本 eSIM', 'data-affiliate-category': 'esim',
  });
  state.listeners[0].handler({ target: { closest: () => cta } });
  assert.equal(state.calls.length, 1);
  const [command, event, data] = state.calls[0];
  assert.equal(command, 'event');
  assert.equal(event, 'affiliate_click');
  assert.equal(data.brand, 'JOYTEL');
  assert.equal(data.placement, 'esim_quick_decision');
  assert.equal(data.destination, 'japan');
  assert.equal(data.article, '/esim');
  assert.equal(data.affiliate_network, 'affiliates_one');
  assert.equal(data.product_category, 'esim');
  assert.equal(data.cta_position, data.placement);
  assert.equal(data.link_url, cta.href);
  assert.equal(data.transport_type, 'beacon');
});

test('legacy affiliate links keep their network and position fields', () => {
  const state = setup();
  state.listeners[0].handler({ target: { closest: () => link() } });
  const data = state.calls[0][2];
  assert.equal(data.affiliate_network, 'affiliates_one');
  assert.equal(data.cta_position, 'article_top');
  assert.equal(data.placement, 'article_top');
  assert.equal(data.article, '/esim');
  assert.equal(data.brand, 'unknown');
  assert.equal(data.destination, 'unspecified');
});

test('repeated tracker initialization does not double-count clicks', () => {
  const state = setup();
  state.init();
  assert.equal(state.listeners.length, 1);
});

test('missing analytics, non-affiliate links and non-element targets are harmless', () => {
  const state = setup();
  const handler = state.listeners[0].handler;
  handler({ target: { closest: () => null } });
  handler({ target: null });
  handler({ target: {} });
  state.window.gtag = undefined;
  assert.doesNotThrow(() => handler({ target: { closest: () => link() } }));
  assert.equal(state.calls.length, 0);
});

test('recommendations never publish known parked partner URLs or empty guidance links', () => {
  const parked = new Set(['https://onelink.one/s/z4xjt', 'https://afflink.one/s/zf2Z8']);
  assert.equal(esimRecommendations.length, 4);
  for (const item of esimRecommendations) {
    for (const offer of item.offers) {
      assert.ok(!parked.has(offer.affiliateUrl));
      if (offer.affiliateUrl) {
        assert.equal(new URL(offer.affiliateUrl).protocol, 'https:');
        assert.ok(offer.brand && item.destination && item.category);
      }
    }
    if (!item.offers.some((offer) => offer.affiliateUrl)) {
      assert.ok(item.fallback.href.length > 1);
      assert.match(item.fallback.href, /^(\/|#)/);
      assert.ok(item.fallback.label);
    }
  }
});

test('Japan and Korea preserve all four owner-supplied URLs and distinct attribution', () => {
  const expected = [
    ['japan', 'JOYTEL', 'https://afflink.one/s/5SmIS'],
    ['japan', 'Klook', 'https://onelink.one/s/LeROS'],
    ['korea', 'JOYTEL', 'https://afflink.one/s/qCGku'],
    ['korea', 'Klook', 'https://linkgo.one/s/qK25E'],
  ];
  for (const destination of ['japan', 'korea']) {
    assert.equal(esimRecommendations.find((item) => item.destination === destination).offers.length, 2);
  }
  for (const [destination, brand, url] of expected) {
    const offer = esimRecommendations.find((item) => item.destination === destination).offers.find((item) => item.brand === brand);
    assert.equal(offer.affiliateUrl, url);
    const state = setup();
    const cta = link({
      'data-affiliate-brand': brand,
      'data-affiliate-placement': 'esim_quick_decision',
      'data-affiliate-destination': destination,
      'data-affiliate-article': '/esim',
      'data-affiliate': offer.network,
    });
    cta.href = offer.affiliateUrl;
    state.listeners[0].handler({ target: { closest: () => cta } });
    assert.equal(state.calls.length, 1);
    const data = state.calls[0][2];
    assert.equal(data.brand, brand);
    assert.equal(data.destination, destination);
    assert.equal(data.placement, 'esim_quick_decision');
    assert.equal(data.article, '/esim');
    assert.equal(data.link_url, url);
  }
});
