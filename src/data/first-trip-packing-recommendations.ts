import type { Recommendation } from '../components/AffiliateRecommendations.astro';

// Owner-provided affiliate URLs, copied verbatim. Do not rewrite tracking codes.
export const packingAffiliateUrls = {
  eminentMomo: 'https://s.momoshop.com.tw/s/adj8XGZ3',
  eminentShopee: 'https://s.shopee.tw/AUuWzXaO2N',
  bagsmartShopee: 'https://s.shopee.tw/9V1znny2lb',
  bagsmartMomo: 'https://s.momoshop.com.tw/s/6f8WFW16',
};

export const packingPriceNote = '價格與庫存以商品頁當下資訊為準。';
export const packingArticle = '/first-trip-packing-list';

export const luggageRecommendations: Recommendation[] = [{
  title: 'eminent 萬國通路 KK60 24 吋前開式行李箱',
  description: '24 吋、前開式、可擴充，適合已安排託運、需要一般中程旅行收納空間的人。',
  detail: '家裡已有狀況良好的 24–26 吋箱子，就先用原本的；需要新箱時，再看尺寸、重量與託運額度。本站未實測這款商品。',
  destination: 'general_travel',
  category: 'luggage',
  offers: [
    { brand: 'eminent', productName: 'eminent KK60 24吋前開式行李箱', network: 'momo', affiliateUrl: packingAffiliateUrls.eminentMomo, ctaLabel: 'momo 查看' },
    { brand: 'eminent', productName: 'eminent KK60 24吋前開式行李箱', network: 'shopee', affiliateUrl: packingAffiliateUrls.eminentShopee, ctaLabel: '蝦皮比價' },
  ],
  fallback: { href: '/first-trip-packing-list', label: '看出國行李清單' },
}];

export const organizerRecommendations: Recommendation[] = [{
  title: 'BAGSMART 旅行壓縮收納袋',
  description: '衣服較多、想把行李分類整理得更整齊的人，可以看看這類收納袋。先把上衣、褲子、內衣襪子分好，找東西比較省事。',
  detail: '蝦皮連結是 6 件組，momo 連結是 BLAST 款，兩者不是同一組商品；先核對件數與尺寸，依自己的衣物量選。壓縮整理不會減少行李重量。',
  destination: 'general_travel',
  category: 'packing-organizer',
  offers: [
    { brand: 'BAGSMART', productName: 'BAGSMART 6件組旅行壓縮收納袋', network: 'shopee', affiliateUrl: packingAffiliateUrls.bagsmartShopee, ctaLabel: '蝦皮 BAGSMART 6件組' },
    { brand: 'BAGSMART', productName: 'BAGSMART BLAST 旅行壓縮收納袋', network: 'momo', affiliateUrl: packingAffiliateUrls.bagsmartMomo, ctaLabel: 'momo BAGSMART BLAST' },
  ],
  fallback: { href: '/first-trip-packing-list', label: '看出國行李清單' },
}];
