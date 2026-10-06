# SEO / Affiliate Repair Sprint 1

檢查日期：2026-10-07（Asia/Taipei）。修改、盤點與可用的驗證已完成；**大寫 JCB HTTP gate 失敗，Browser QA 未驗證，尚未達成全部 release gates**。沒有 merge、push 或部署。

## 1. Branch / baseline

- Branch：`codex/seo-affiliate-repair-1`
- 精確 production baseline：`79e1735cef5e25864bb13707b54e81f76238ffe0`
- 獨立 checkout：`C:\Users\WIN10\.codex\worktrees\seo-affiliate-repair-1\astro`
- 本報告與程式一同 commit；最終 commit SHA 以交付回覆及此分支 `git log -1` 為準。
- `D:\astro` 的 `codex/vietnam-sourcing-mvp` 與原有未提交檔案保留；本分支不包含 Sourcing commits。

## 2. Files changed

Production source/config 共 9 個檔案：

- `firebase.json`、`astro.config.mjs`
- `src/components/AffiliateClickTracker.astro`
- `src/pages/vietnam-mosquito-repellent.astro`
- `src/pages/vietnam-packing-list.astro`
- `src/pages/anti-theft-crossbody-bag-guide.astro`
- `src/pages/esim/joytel.astro`
- `src/pages/esim/saigon-airport-sim.astro`
- `src/pages/esim-quiz.astro`

驗證文件：既有 tracker test 加兩個 fallback assertions；新增 `tests/seo-affiliate-repair.test.mjs`、`tests/fixtures/affiliate-repair-baseline.json`、本報告與 `docs/seo-affiliate-repair-1/` 證據。沒有新增頁面、套件或 lockfile 修改。

## 3. JCB redirect implementation

Firebase Hosting 新增唯一 exact rule：`/vietnam-jCB-lounge` → `/vietnam-jcb-lounge`，301。保留 `cleanUrls: true`、`trailingSlash: false`。沒有新增大寫 Astro page 或 JS redirect；小寫頁面的 self canonical 保持原值。

真實 Firebase CLI 15.32.1 Hosting emulator，demo project、本機 5123：

| 路徑 | 實際 HTTP chain | 結論 |
|---|---|---|
| `/vietnam-jCB-lounge` | 200，無 Location，HTML canonical 小寫 | **失敗：預期 301** |
| `/vietnam-jcb-lounge` | 200，無 Location | 通過 |
| `/vietnam-jcb-lounge/` | 301 → 小寫無斜線 200 | 通過，無 loop |
| `/vietnam-jcb-lounge.html` | 301 → 小寫無副檔名 200 | 通過，無 loop |

Windows case-insensitive 檔案系統能用大寫路徑讀取小寫檔案，與此結果一致；尚未在 case-sensitive Hosting 環境證明該 rule 的完整 HTTP 行為。沒有修改環境來強迫測試通過，也沒有使用自製 server 冒充 Firebase。證據：`local-hosting-http.json`。部署後仍須實測大寫 301 → 小寫 200。

## 4. Sitemap changes

僅移除 `/en/connectivity`、`/en/travel-gear`、`/en/vietnam-travel-prep` 三個 HTML URL，42 → 39。英文頁面仍存在，保留 intentional noindex；沒有刪頁、改成 index 或加入英文 article。原有 draft/alias exclusions 保持。測試比較完整 sitemap 集合，其他 URL 不變。

## 5. Tracking schema before / after

沿用既有 singleton click handler、`affiliate_click` event；不新增 tracker、`affiliate_cta_view` 或 GA4 設定。

| 欄位 | Before | After |
|---|---|---|
| `affiliate_network` | network 判斷 | 明確 enum 或 domain boundary 判斷，補 linkgo 與 momo |
| `merchant` | 無 | 明確 merchant；短網址不可推斷時 `unknown` |
| `product_key` | 無 | 明確穩定 key；缺漏 `unspecified` |
| `product_name` | metadata／文字 fallback | 僅編輯設定的 metadata；缺漏 `unspecified` |
| `product_category` | metadata／fallback | 保留，machine token 驗證；缺漏 `uncategorized` |
| `cta_position` | metadata／位置 fallback | 保留；動態 quiz 明確 `quiz_result` |
| `link_url` | 完整 href | analytics 專用 sanitizer；所有 query/hash/userinfo 移除 |

保留 page_path、既有品牌／placement／destination／article 維度。移除 payload 的任意 button_text/page_title。product_name 不讀取按鈕標籤、表單、搜尋或 quiz answer；metadata 另有輸入檢查。page_location/referrer 明確覆寫為淨化值，避免 event 自動 URL 再帶入 query。已知短網址僅保留受限 code path；其他路徑只保留 origin。使用者真正點擊的 href 不經 sanitizer、不被賦值改寫，原 UTM 與 `sub_id=quiz` 均保留在導航 URL。

## 6. High-value CTA metadata coverage

總數定義：79 個 rendered static affiliate anchors + 4 個可由 quiz 動態產生的 affiliate CTA definitions = **83**；不是單次頁面同時顯示 83 個 CTA。

| 全站明確 metadata | Before | After |
|---|---:|---:|
| product_name | 35/83 | 45/83 |
| product_key | 0/83 | 13/83 |
| merchant | 0/83 | 13/83 |
| category | 35/83 | 45/83 |
| position | 35/83 | 45/83 |

六個指定頁面合計 **13/13 CTA**，上述五欄及 network 均明確。原有明確 product/category/position 為 3/13，merchant/key 0/13。

| 頁面 | CTA | merchant | product_key |
|---|---:|---|---|
| `/vietnam-mosquito-repellent` | 2 | coupang / shopee | `dintin_picaridin_10h` / `collection_vietnam_travel_essentials` |
| `/vietnam-packing-list` | 2 | shopee / momo | `collection_vietnam_travel_essentials` / `eminent_kk60_24_front_open` |
| `/anti-theft-crossbody-bag-guide` | 2 | momo / shopee | `pacsafe_v_crossbody_5l` / `ozuko_anti_theft_sling` |
| `/esim/joytel` | 2 | joytel | `collection_joytel_esim_catalog` |
| `/esim/saigon-airport-sim` | 1 | kkday | `kkday_vietnam_viettel_5g_esim` |
| `/esim-quiz` | 4 | joytel × 3 / kkday × 1 | `collection_joytel_japan_esim`、`collection_joytel_korea_esim`、`collection_joytel_vietnam_esim`、`kkday_vietnam_viettel_5g_esim` |

集合／商店入口使用 collection key，沒有冒充單品。KKday/Viettel metadata 依既有編輯意圖，未改產品描述或宣稱重新驗證商品規格。其餘 CTA 保留 fallback；沒有把 13/83 宣稱為全站完整覆蓋。逐筆證據：`affiliate-before.csv`、`affiliate-after.csv`。

## 7. JOYTEL legacy URL inventory

GET timestamp：2026-10-06 16:07:19 UTC（2026-10-07 00:07:19 台北）。HTTP redirects only，未執行網站 JS、登入、加入購物車或下單。

| Legacy URL | CTA | Source pages | GET 結果 |
|---|---:|---|---|
| `https://afflink.one/s/zf2Z8` | 8 | china、joytel、troubleshoot、vietnam-jcb-lounge 各 2 | 301 → shrturl.shop，200 網域出售停放頁 |
| `https://onelink.one/s/z4xjt` | 2 | esim/japan | 301 → shrturl.info，200 網域出售停放頁 |
| `https://onelink.one/s/z4xjt?sub_id=quiz` | 1 | esim-quiz 動態日本 CTA | 同上，200 停放頁 |

**6 頁、11 個 risk CTA**。HTTP 200 不等於成功到達 JOYTEL。每筆來源檔案、頁面、anchor、原 URL、預期 merchant、完整 chain、最終狀態與 action 都在 `joytel-legacy-cta-inventory.csv`；原始 GET 結果在 `joytel-get-validation.json`。

## 8. Confirmed safe links

本次 legacy risk CTA 中 verified-good **0/11**。沒有足夠證據可把替代連結列為 confirmed safe。

僅檢查已存在 production `src/data/esim-recommendations.ts` 的日本候選 `https://afflink.one/s/5SmIS`：301 → vbtrax.com tracker，GET 202，沒有 HTTP 直接完成 JOYTEL landing。此候選的 encoded target 是 JOYTEL 日本產品頁，但完整 affiliate flow 仍未驗證；不可把它當成 generic catalog 或日韓全方案入口，也沒有自動套用、重建 URL 或修改其原有 query。其他 production 連結不在本次 GET 驗證範圍，不宣稱 verified-good。

## 9. Unresolved links requiring owner action

**11/11 OWNER ACTION REQUIRED**：舊 URL 的落地停放頁已確認，未解決的是可用替代 URL、適用目的地與 owner approval。請 owner 提供／確認 merchant dashboard 的有效對應 affiliate URL，完成實際 landing 與追蹤驗證後，另行授權替換。general catalog 8 個與日本 3 個 CTA 必須分別匹配原意圖。

此次全部保留原 href，affiliate href changed **0**。没有停用、隱藏 CTA 或虛構優惠。

## 10. Packing disclosure result

將原 `.disclosure` 完整文字及樣式保留，從文章尾端移到第一個 `.shopee-block` 之前。只出現一次，在第一 commercial CTA 前；沒有新增 duplicate disclosure 或修改正文／recommendation。DOM order test 通過；視覺版面未驗證。

## 11. Tests

- Baseline 既有 tests：11/11 通過。
- 修改後 `REPAIR_HOSTING_URL=http://127.0.0.1:5123 node --test tests/*.test.mjs`：**27 tests，26 passed，1 failed，0 skipped**。
- 唯一失敗為大寫 JCB 301 gate（actual 200 vs expected 301），沒有刪除 assertion 或把它改為通過。
- 通過項目包含既有 11 tests、redirect config/canonical、sitemap 精確差集、六頁靜態／quiz 真正 render metadata、network/merchant 分離、集合 key、analytics privacy、href/order、disclosure、protected JOYTEL head/body/schema。
- Privacy 測試含 email、phone、姓名、公司、LINE、RFQ、order、search、session query/hash/userinfo；證明 payload 與導航 URL 分離。click handler 用 VM/DOM harness 驗證，未向 GA4 送測試 event。

Local HTTP 個別 alias checks 的證據另見第 3 節，不把失敗 test 計為成功。

## 12. Build

baseline 與 after 均使用 `ASTRO_TELEMETRY_DISABLED=1 npm run build`，**44 pages 成功**。指定 `/`、`/esim`、`/esim/japan`、`/esim/korea`、`/esim/joytel`、`/vietnam-mosquito-repellent`、`/vietnam-packing-list`、`/anti-theft-crossbody-bag-guide`、`/vietnam-jcb-lounge` 均產生 HTML。

`npx astro check` baseline/after 都是 **59 errors、0 warnings、1 hint**；以檔案、severity、TS code、primary message 比較，忽略行號位移，新增／移除診斷均 0。不是全站 typecheck clean。證據 `typecheck-comparison.json`。

## 13. Browser QA

**320px、390px、desktop 全部未驗證。** 使用者指定的 `wmux browser` 不在此環境；沒有改用隱藏 browser。Windows WSL 沒有可用 distro，未安裝新環境。CTA/disclosure 的 DOM 與 CSS 原值保留只能支持結構檢查，不能代替視覺 QA。

## 14. Regression

- 83 affiliate definitions href/order 與 baseline 相同；href changed 0，含 quiz 4 個原始 URL。
- 44/44 HTML 在移除 script、affiliate metadata attrs、忽略 disclosure 移位後相同（`editorial-regression.csv`）。此比較不表示 HTML/CSS bundle 全 byte-identical；tracker 與 quiz script 是預期差異。
- JOYTEL title/meta/H1/schema 原值逐項測試通過；沒有 SEO experiment。
- 沒有 content collections、新文章、產品比較重構、second tracker、CRM、Sourcing、database、secret 或 GA4 設定修改。
- 原 checkout、scorecard、social 與既有 audit 檔案不在本分支 staging 範圍。

## 15. Production deployment requirements

本次只交付可人工審核的本機分支／commit。**不得視為全部驗證通過或已部署**。

人工審核後如另行授權發布，需要 case-sensitive Hosting/preview 的大寫 301 → 小寫 200 gate、320/390/desktop 視覺 QA、production canonical/sitemap check；JOYTEL 11 個 CTA 的替代與授權是獨立 owner action，沒有隨本次修改解決。正式 Hosting deployment 才會使 redirect 與 sitemap 在 production 生效。本輪沒有 merge、push、deploy、登入操作或 analytics test sends。
