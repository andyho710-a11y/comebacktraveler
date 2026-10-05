# 第一次出國行李清單：行李箱與收納袋推薦

文章：`/first-trip-packing-list`。

## 範圍與位置

- 「衣物、盥洗用品、拖鞋、收納袋怎麼帶」的小建議與原有延伸閱讀後，新增 BAGSMART 推薦。
- 「24 吋前開行李箱，適合第一次出國嗎？」後，將原有單一 momo 推薦換成 KK60 的 momo／蝦皮選項。
- 沿用 AffiliateRecommendations；只新增可選 priceNote，eSIM 預設文案與元件 CSS 均不變。沒有建立另一套 UI 或 tracking。
- 移除本篇旧 momo URL、固定價格與不再使用的 product-option CSS。其餘段落、SEO、schema、canonical、sitemap 與原有站內連結保留。

## 正式 CTA 與 tracking

| CTA | URL | brand | affiliate_network | product_category | placement |
| --- | --- | --- | --- | --- | --- |
| momo 查看 | https://s.momoshop.com.tw/s/adj8XGZ3 | eminent | momo | luggage | luggage-recommendation |
| 蝦皮比價 | https://s.shopee.tw/AUuWzXaO2N | eminent | shopee | luggage | luggage-recommendation |
| 蝦皮 BAGSMART 6件組 | https://s.shopee.tw/9V1znny2lb | BAGSMART | shopee | packing-organizer | packing-recommendation |
| momo BAGSMART BLAST | https://s.momoshop.com.tw/s/6f8WFW16 | BAGSMART | momo | packing-organizer | packing-recommendation |

四個網址完全依使用者提供，未重寫或添加追蹤碼。共用 `article=/first-trip-packing-list`、`destination=general_travel`；事件為 `affiliate_click`。依既有 schema，商品分類使用 `product_category`；原有事件 `category=affiliate` 保留。所有 CTA 都有 `target="_blank"`、`rel="sponsored noopener noreferrer"` 及另開分頁文字。

## 商品資訊與價格

2026-10-05 可見瀏覽器確認 momo [KK60 商品頁](https://www.momoshop.com.tw/product/13659085)標題列出 24 吋、前開式、可擴充。僅採用這些資訊；不宣稱本站實測、耐用年限、排名或銷量。

BAGSMART 名稱與款式依使用者正式商品資料，明列 6 件組與 BLAST 為不同選項，提醒核對件數與尺寸。沒有省空間比例、真空效果或多裝衣物數量承諾。

統一提醒：「價格與庫存以商品頁當下資訊為準。」無即時售價、折扣、優惠碼、庫存或限時活動。

## 驗證

- `ASTRO_TELEMETRY_DISABLED=1 npm run build`：44 頁通過。
- `node --experimental-strip-types --test tests/affiliate-click-tracker.test.mjs tests/packing-affiliate.test.mjs`：11/11 通過。新測試以建置後 HTML 的真實 CTA 屬性執行既有 tracker，驗證四個事件與正確放置位置。
- title、meta、canonical、JSON-LD、sitemap 與原有站內連結比對不變。
- `/esim` 頁面／data／tracker 未修改；排除 Astro CSS 打包位置差異後，建置 HTML 相同；推薦元件 CSS 原文不變。新增元件引用使 Astro 將部分共用 CSS 由外部檔移為 inline，不是功能或版面變更。
- 可見瀏覽器检查 320px、390px、1280px：手機 CTA 垂直排列、間距與文字正常，Tab／Shift+Tab 可移動，焦點外框清楚。未對正式商品 CTA 製造測試点击，事件以隔離的測試驗證；不代表 GA4 production 收件或聯盟訂單歸因已驗證。
- repo 無 lint script；未新增 type-check dependency。

沒有本次新增的 placeholder 或待補 affiliate URL。既有 eSIM TODO 與其他 tracking 技術債不在本次範圍。

本次只 commit feature branch；不 push、merge 或部署。既有 scorecard、public 圖片及 social/ 保留。
