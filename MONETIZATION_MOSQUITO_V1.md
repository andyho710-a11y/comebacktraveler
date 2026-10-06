# Vietnam Mosquito Repellent Monetization v1

Experiment ID: `mosquito_monetization_v1`  
Page: `/vietnam-mosquito-repellent`  
Main baseline: `74f6d6d73e8d0888322175c227c1ded0d7f3158a`  
Branch: `codex/monetization-mosquito-v1`  
experiment_start_date: **TBD — production deployment date**

## 已知流量 baseline

Owner 提供的 Search Console 約三個月資料：186 clicks、2,440 impressions、CTR 7.62%、average position 4.65。未在本輪登入 Search Console 重新擷取；這是搜尋流量基準，不能當作 affiliate clicks、orders 或 conversion。

## 實驗出口

| 意圖 | Merchant | Product key | Category | CTA position |
|---|---|---|---|---|
| Specific product：叮寧 Picaridin 防蚊液 | coupang | dintin_picaridin_10h | mosquito_repellent | decision_primary |
| Browse collection：越南旅行用品清單 | shopee | collection_vietnam_travel_essentials | travel_essentials | decision_collection |

只使用這兩個既有 owner-approved URL，商品入口數維持 2，不加商品、價格、倒數或結束日期。Collection 包含多種旅行用品，不能把它的訂單解讀成 Picaridin 單品銷量。兩個 CTA 不是隨機 A/B 分流；讀者可同時接觸兩者，因此差異只能代表觀察到的選購意圖，不能直接推論因果效果。

## 事件與分母

- `affiliate_cta_view`：只對本頁這兩個 CTA 啟用。按鈕至少 50% 可見、連續滿 1,000 ms、頁面前景，才送事件；每個 document/page view 每個 product_key 最多一次。離開視窗或移出範圍會取消 dwell。重載屬新的 page view；返回同一保留的 document 不重送。
- `affiliate_click`：沿用既有 schema，這兩個 CTA 額外加 experiment_id；不阻止正常導航。不把按鈕文字、輸入內容、URL query、訂單或個資當維度。
- 維度：page_path、merchant、product_key、product_name、product_category、cta_position、affiliate_network、experiment_id。事件另覆寫去 query/hash 的 page_location/page_referrer，避免 GA4 預設 URL 將 query 帶回此事件。

Primary：每個 product_key 各自算 `affiliate_click event count / affiliate_cta_view event count`。它是事件 CTR，重複点击或滿 1 秒前点击可能使比率超過 100%；報表應一併顯示原始分子與分母，不當成去重使用者 conversion。若 owner 用 GA4 session/page-view 層級資料，可另看「有 qualifying view 後至少一次 click 的 page views / 有 qualifying view 的 page views」。

Secondary：本頁 affiliate clicks / 本頁 page sessions，分產品及合計列出。GA4 的 session 歸因與跨頁行為需使用相同日期、page_path 和 experiment_id 篩選。不要拿 Search Console clicks 作 affiliate CTR 分母。

## 觀察時間與樣本

Production 上線日由 owner 填入，Preview QA 不計入正式實驗。至少觀察 28 天；先以每個主要 CTA 100 個 qualifying views 作初步檢視門檻，這是操作上的最小樣本門檻，不是統計顯著性的保證。樣本不足時延長觀察；不因 3–5 個 clicks 宣布 winner。每週列 view、click、CTR、page sessions 和各自樣本量，沒有資料就標「尚無資料」。

## Owner 人工補成交資料

| 期間 | Merchant / product key | Views | Clicks | Page sessions | Orders | Commission | Conversion | EPC |
|---|---|---|---|---|---|---|---|---|
| TBD | coupang / dintin_picaridin_10h | TBD | TBD | TBD | owner 補 | owner 補 | 待可歸因資料 | 待可歸因資料 |
| TBD | shopee / collection_vietnam_travel_essentials | TBD | TBD | TBD | owner 補 | owner 補 | 待可歸因資料 | 待可歸因資料 |

在 merchant 報表能對上相同期間、商品與歸因範圍時，再計 orders / attributable clicks 與 commission / attributable clicks（EPC）。若商家只能提供帳戶總單量，不可硬配到這兩個 CTA。記錄歸因窗、退款、幣別、資料延遲；沒有成交 API 假設，也沒有程式自動抓訂單。

## 上線前人工事項

Review Preview 和目的地證據，確認商品名稱及 collection 內容；另行批准 production release。Owner 可在現有 GA4 報表檢查事件維度是否可查詢，本輪沒有建立 custom dimensions 或修改 GA4 account config。正式發布後填開始日期，建立相同期間的 GA4 與 merchant 人工紀錄。
