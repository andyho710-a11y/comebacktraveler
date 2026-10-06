# Vietnam Mosquito Repellent Monetization v1 — 驗收報告

狀態：**READY FOR HUMAN REVIEW**。只有 temporary Hosting Preview；沒有 merge、push main 或 production deploy。

## 1. Main baseline

同步 `origin/main`，確認指定 `74f6d6d73e8d0888322175c227c1ded0d7f3158a`。從乾淨 main 建立實驗分支；原 `D:\astro` Sourcing 分支與未提交檔案保留。本輪使用已附加的獨立 checkout，不把 Sourcing 或 repair feature 混入。

## 2. Branch

`codex/monetization-mosquito-v1`，parent 為指定 main。驗收版本為本報告所在的 Git commit，完整 SHA 隨最終交付列出。修改範圍只有防蚊頁、既有 tracker、實驗測試／fixture、量測計畫、報告及 QA evidence。

## 3. Existing page snapshot

完整修改前 source、head、H1、Article／FAQ schema 及 44 頁 affiliate href inventory 保存於 `tests/fixtures/mosquito-monetization-baseline.json`。

- URL/canonical：`https://comebacktraveler.com/vietnam-mosquito-repellent`。
- Title：越南防蚊用品怎麼準備？住越南十年的在地經驗整理（2026）。
- Description：去越南自由行要帶哪種防蚊用品？住越南十年的重來的旅人，從登革熱風險、胡志明蚊蟲環境、Picaridin 與 DEET 差異，到防蚊液、防蚊貼、防蚊衣與房間防蚊，整理真正適合越南旅行的防蚊清單與適合誰、不適合誰。
- H1：越南防蚊用品怎麼準備？／住越南十年的在地經驗整理，原換行保留。
- Article、FAQPage JSON-LD、robots、title/meta/H1/canonical 精確相同；主要正文、五項 quick list、FAQ 與內部連結未改。
- Before：Picaridin 單品卡位於第一節，position=`picaridin_product_card`；Shopee block 位於 FAQ 前，position=`mosquito_collection`。共有 2 個 commercial CTA；第一節前有 AffiliateDisclosure，文末另有一次 disclosure。
- Before mobile CSS：商品卡在 600px 以下改直向；CTA 沒有明確最低觸控高度；快速清單沒有固定欄寬。完整 CSS 已包含在 before source。

## 4. Affiliate destination validation

2026-10-07 Taipei，安全 GET 加公開瀏覽器驗證，不登入、加車、購買或提交資料。

| 出口 | GET / redirect | 公開瀏覽器確認 | 狀態 |
|---|---|---|---|
| Coupang `cnc3H4` | 301 → Coupang onelink → 301 → link.tw.coupang.com → 302 → www.tw.coupang.com/products/611480856576064；HTTP client 最終 403 | 相同 itemId 313832983461890、vendorItemId 313832035565578；可見叮寧派卡瑞丁10H小黑蚊防蚊液、25ml、1瓶及商品資訊 | VERIFIED INTENT；GET 本身受阻，由公開瀏覽器補足 |
| Shopee category 3834915 | collshp.com 原 URL 回傳 200 | 放鬆生活研究所／「旅遊越南小物」、14 個商品，可見旅行收納用品與派卡瑞丁防蚊用品 | VERIFIED COLLECTION |

沒有觀察到 parked domain 或明顯 destination mismatch。酷澎曾顯示「伺服器發生錯誤」通知，關閉非綁定通知後商品內容可讀；未以 403 誤判 broken，也未以重新導向成功當商品驗證完成。這是當下公開頁意圖驗證，不保證未來庫存、價格或成交歸因。原兩個完整 affiliate href 保留；沒有自行換 URL。商家規格未額外搬入卡片，只使用既有且本輪可核對的 Picaridin 成分／商品名稱，容量與濃度仍提示購買前確認。

## 5. UI changes

DEET 比較之後加入快速選擇，再以「如果你想直接準備」集合既有兩個出口。Disclosure 沿用現有 component，保留一次且在第一個 commercial CTA 前。刪除商品卡中原有「專治」「小孩也能用」等籠統推銷文字，改為行程與產品標示提示；正文／FAQ 保留。商品名稱的「叮嚀」依商家核對修正為「叮寧」，product_key 不變。

不顯示固定價格，加「價格與庫存以商家頁面當下資訊為準」。兩個 CTA 設至少 48px 高度；名稱與 collection 按鈕可換行；quick list 固定欄寬，避免小螢幕溢位。無固定在螢幕的購買按鈕、彈窗、倒數或虛假 urgency。

## 6. Tracking changes

沿用 `affiliate_click` 與既有參數，僅這兩個 CTA 加 `experiment_id=mosquito_monetization_v1`。共享 tracker 抽出安全維度 helper，但其他頁事件不加 experiment_id，既有 click 行為不變。

| product_key | merchant/network | category | position |
|---|---|---|---|
| dintin_picaridin_10h | coupang | mosquito_repellent | decision_primary |
| collection_vietnam_travel_essentials | shopee | travel_essentials | decision_collection |

## 7. affiliate_cta_view implementation

只在 exact pathname `/vietnam-mosquito-repellent` 初始化；必須同時符合 experiment attr、允許的 key、merchant/network、category 和 position。SiteNav 在 article 之前載入，故等 DOMContentLoaded 再找 CTA。保留 singleton，防止重複初始化。

IntersectionObserver threshold 0.5，連續 1,000ms 才發送；移出 50% 或切到背景取消 timer，返回需要新的 observation 和完整 dwell。timer 前處理 queued crossings，避免短暫移出又返回誤計。Set 按 product_key 每 document 一次，發送後 unobserve。未提供 IO/gtag 時安全略過，不影響連結導航。無寫死結束日期。

## 8. Analytics privacy

View 僅送安全維度、experiment_id、去 query/hash 的 page_location/page_referrer、transport_type。Click 保留原 schema 和安全 link_url（短連結 code 或 merchant origin）。沒有 query、email、phone、LINE、個人姓名、company、search text、user input、order ID、RFQ；沒有從按鈕 free text 取 identifier。導航 href 包含原合法追蹤 query，分析 payload 與導航用途分開。

測試涵蓋惡意 query/hash/userinfo、個資樣式 metadata、自由按鈕文字；本地瀏覽器 DOM event evidence 可核對實際 payload。沒有修改 GA4 account config 或 custom dimensions；沒有宣稱已在 GA4 後台收到事件。

## 9. Product / collection distinction

酷澎明確為「具體單品」，給已決定比較 Picaridin 的人；蝦皮明確為「多品項探索」，提示 collection 不是單一防蚊商品。merchant、product_key、category、position 分開，報表不混成同一商品。原圖片保留；沒有加入新 DEET、兒童、防蚊貼等 affiliate 商品。

## 10. Browser QA

Preview：[防蚊實驗頁](https://comeback-traveler-web--mosquito-monetization-v1-8ge9heun.web.app/vietnam-mosquito-repellent)。到期：2026-10-07 15:38:42 Taipei。使用 preview channel，關閉 authorized domains 自動同步。

| Viewport | Document scrollWidth | Product CTA height | Collection CTA height | 結果 |
|---|---:|---:|---:|---|
| 320px | 305px | 48px | 85.2px | PASS |
| 390px | 375px | 48px | 54.6px | PASS |
| 1280px | 1265px | 48px | 54.6px | PASS |

寬度扣除瀏覽器 scrollbar 後仍無 document horizontal overflow；商品名稱換行、disclosure 13.5px 可讀。各尺寸實際檢查 Hero、quick decision、disclosure、兩張卡、FAQ、內部連結和 footer，保存 21 張 viewport screenshots。長頁全頁截圖介面受限，改保存各段可見截圖。既有上方導覽仍正常。

另用本地 build HTML harness，移除 GA4/ads 遠端 loader、裝 analytics stub，僅防止 QA 中外部 CTA 導航；tracker 和 CTA href 與 build 一致。真實瀏覽器 IO 送出 2 個 view（各 key 一次）及 2 個 stub click（各 key 一次）；移到 Hero 再回 CTA，view 維持 2。未點 Preview 外部商品 CTA，未把 stub 部署到 Preview。50% 邊界／dwell／背景取消用 deterministic timer tests 驗證。

## 11. Tests

`node --test tests/*.test.mjs`：53/53 PASS、0 failed、0 skipped。使用 REPAIR_HOSTING_URL 指向本輪 Preview，使原 Hosting redirect integration case 也執行。新增 24 cases，覆蓋指定 18 類條件，另驗證短暫移出、背景、queued crossings、DOM ready、singleton、scope、observer/analytics 缺失和安全 metadata。

## 12. Build

`npm run build`：成功，44 pages。使用 lockfile 的 `npm ci --ignore-scripts`，Astro 6.1.10、sitemap 3.7.2；manifest/lock 未改。最初發現舊 no-save install 將本地依賴解析到較新版本，已恢復鎖定版本並重建 baseline，未以依賴漂移的結果放行。

## 13. Typecheck delta

`npx astro check`：59 existing errors、0 warnings、1 hint；按 file/severity/code/primary message 與原 baseline 比較，新增 0、移除 0。不是 typecheck clean。檢查工具以唯讀 junction 引用原 D:\astro 的 @astrojs/check 0.9.10／TypeScript 5.9.3，避免再次讓 no-save install 改變鎖定 build dependencies。

## 14. Affiliate regression

Commercial CTA 2 → 2；affiliate href changed count **0**；view enabled CTA **2**。對 44 頁所有靜態 affiliate href 及順序與 locked main 比對相同；原 quiz／JOYTEL／packing 保護測試全部通過，parked JOYTEL codes active **0**。頁面 SEO head/schema 精確一致，article/FAQ 和 internal links 保留。

共享 inline tracker 的更新會改變含該 tracker 的 HTML script；其他頁 source、商業文案與 affiliate URLs 沒改。全站 44 頁去掉 tracker 後，只有本輪防蚊頁改變；其他 43 頁保持相同，共用 CSS 精確相同。測試／報告詞彙曾被 Tailwind 自動掃描為無用 utility，已消除這些額外樣式，未修改共用 CSS 設定。證據列於 `docs/monetization-mosquito-v1/regression.json`。Preview target HTTP HTML 與驗證的 local build 精確一致。

## 15. Measurement plan

見 `MONETIZATION_MOSQUITO_V1.md`。Search Console baseline 只代表搜尋流量。Primary 按 product_key 分別算 view→click 事件 CTR，揭露重複 click／提前 click 的限制；secondary clicks/page sessions。至少 28 天，每主要 CTA 先累積足夠 qualifying views；100 views 僅初步檢視門檻，3–5 clicks 不宣布 winner。Owner 人工補 orders、commission、可歸因 conversion 和 EPC；無成交 API 假設。

experiment_start_date：**TBD — production deployment date**。Preview 與本地 QA 不作正式實驗樣本。

## 16. Remaining owner actions

人工驗收 Preview、商品／collection 意圖與量測方式；之後另行批准 production release，填開始日並建立 GA4／merchant 同期間紀錄。兩個目的地本輪已驗證，無 confirmed broken 出口；上線時仍應核對當下商品與庫存。技術驗收通過，不代表已有商品需求、成交或收入證據。

未 merge、push main、production deploy，未修改 secrets、Functions、Firestore、Sourcing、payment、CRM 或 GA4 account config。Hosting live release before/after 比對保持不變；等待人工驗收。
