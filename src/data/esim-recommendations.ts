import type { Recommendation } from '../components/AffiliateRecommendations.astro';

// Owner-provided URLs (2026-10-04), copied verbatim. Never add/rewrite tracking codes.
export const esimAffiliateUrls = {
  joytelJapan: 'https://afflink.one/s/5SmIS',
  klookJapan: 'https://onelink.one/s/LeROS',
  joytelKorea: 'https://afflink.one/s/qCGku',
  klookKorea: 'https://linkgo.one/s/qK25E',
  kkdayVietnam: 'https://onelink.one/s/nnjWf', // existing /esim URL; verified Vietnam product
  // TODO: Optional new JOYTEL catalog URL; old zf2Z8 redirects to a parked domain.
  joytelCatalog: undefined,
  // TODO: Approved URLs for broader Southeast Asia and multi-country coverage.
  klookSoutheastAsia: undefined,
  airaloMultiCountry: undefined,
} satisfies Record<string, string | undefined>;

export const esimRecommendations: Recommendation[] = [
  {
    title: '日本旅遊',
    description: '只去日本，先看日本單國方案，再依旅遊天數與用量挑選。',
    detail: '想看 JOYTEL 三電信方案，或習慣在 Klook 挑選，都可以直接查看各自商品頁。',
    destination: 'japan',
    category: 'esim',
    offers: [
      {
        brand: 'JOYTEL',
        productName: 'JOYTEL 日本三電信 eSIM',
        productKey: 'collection_joytel_japan_esim',
        merchant: 'joytel',
        network: 'affiliates_one',
        affiliateUrl: esimAffiliateUrls.joytelJapan,
        ctaLabel: '查看 JOYTEL 日本三電信 eSIM',
      },
      {
        brand: 'Klook',
        productName: 'Klook 日本 eSIM',
        productKey: 'collection_klook_japan_esim',
        merchant: 'klook',
        network: 'affiliates_one',
        affiliateUrl: esimAffiliateUrls.klookJapan,
        ctaLabel: '查看 Klook 日本 eSIM',
      },
    ],
    fallback: { href: '/esim/japan', label: '看日本 eSIM 選購重點' },
  },
  {
    title: '韓國旅遊',
    description: '去首爾、釜山或其他韓國城市，先把使用天數和流量需求確認好。',
    detail: '下方分別是 JOYTEL 雙電信與 Klook 5G 商品；熱點分享與使用限制，購買前再看一次。',
    destination: 'korea',
    category: 'esim',
    offers: [
      {
        brand: 'JOYTEL',
        productName: 'JOYTEL 韓國雙電信 eSIM',
        productKey: 'collection_joytel_korea_esim',
        merchant: 'joytel',
        network: 'affiliates_one',
        affiliateUrl: esimAffiliateUrls.joytelKorea,
        ctaLabel: '查看 JOYTEL 韓國雙電信 eSIM',
      },
      {
        brand: 'Klook',
        productName: 'Klook 韓國 5G eSIM',
        productKey: 'collection_klook_korea_esim',
        merchant: 'klook',
        network: 'affiliates_one',
        affiliateUrl: esimAffiliateUrls.klookKorea,
        ctaLabel: '查看 Klook 韓國 5G eSIM',
      },
    ],
    fallback: { href: '/esim/korea', label: '看韓國 eSIM 選購重點' },
  },
  {
    title: '東南亞旅遊（越南）',
    description: '這趟只去越南？先看越南單國方案，依天數和使用需求挑選。',
    detail: '下方是越南商品；去泰國、新加坡或跨國旅行，請另找涵蓋對應目的地的方案。',
    destination: 'southeast_asia',
    category: 'esim',
    offers: [{
      brand: 'KKday',
      productName: 'KKday 越南 eSIM',
        productKey: 'kkday_vietnam_esim',
        merchant: 'kkday',
      network: 'affiliates_one',
      affiliateUrl: esimAffiliateUrls.kkdayVietnam,
      ctaLabel: '查看 KKday 越南 eSIM',
    }],
    fallback: { href: '#esim-buying-checklist', label: '先看 eSIM 選購重點' },
  },
  {
    title: '多國／跨洲旅行',
    description: '先找能涵蓋整趟行程的區域或全球方案，再比較分國購買是否更合適。',
    detail: '把國家與天數列好，再核對有效期與流量；「多國」不代表每一站都能用。',
    destination: 'multi_country',
    category: 'esim',
    offers: [{
      brand: 'Airalo',
      productName: 'Airalo 多國 eSIM',
      affiliateUrl: esimAffiliateUrls.airaloMultiCountry,
      ctaLabel: '查看 Airalo 多國方案',
    }],
    fallback: { href: '#esim-buying-checklist', label: '先看多國 eSIM 選購重點' },
  },
];
