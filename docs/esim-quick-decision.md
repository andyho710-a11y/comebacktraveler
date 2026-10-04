# eSIM 30 秒目的地速查

## 實作範圍

在 `/esim`「先說結論」後、個人故事前加入利益揭露與四個情境。日本、韓國依使用者要求各有 JOYTEL／Klook 兩個選項；東南亞（越南）一個聯盟 CTA，多國／跨洲一個站內指引。手機按鈕垂直排列、間隔 12px、最小高度 48px；700px 起內文與 CTA 區並排。原生連結支援 Tab／Enter 與可見焦點，無新增前端框架或 analytics 依賴。

變更檔案：

- `src/components/AffiliateRecommendations.astro`：可重用元件，支援每情境多個品牌選項與缺少 URL 時的站內替代連結，也可套用行李箱、旅充等分類。
- `src/data/esim-recommendations.ts`：集中 URL、文案、品牌與情境資料。
- `src/components/AffiliateClickTracker.astro`：延伸現有 `affiliate_click`，保留原欄位與單次初始化機制。
- `src/pages/esim.astro`：插入模組、移動揭露、以官方頁面取代固定售價；修正已查證的商品資訊，保留 SEO 與站內連結。
- `tests/affiliate-click-tracker.test.mjs`：6 項回歸測試。
- `docs/esim-quick-decision.md`：本交付與驗證紀錄。

## CTA 與網址

以下四個正式 URL 完全依使用者提供，未增刪參數。2026-10-04 透過可見瀏覽器逐一確認抵達相符商品頁。

| 卡片 | CTA 文案 | 原始聯盟 URL | 落地商品 |
| --- | --- | --- | --- |
| 日本 | 查看 JOYTEL 日本三電信 eSIM | https://afflink.one/s/5SmIS | JOYTEL `/products/japan-esim` |
| 日本 | 查看 Klook 日本 eSIM | https://onelink.one/s/LeROS | Klook #109393 |
| 韓國 | 查看 JOYTEL 韓國雙電信 eSIM | https://afflink.one/s/qCGku | JOYTEL `/products/korea-esim` |
| 韓國 | 查看 Klook 韓國 5G eSIM | https://linkgo.one/s/qK25E | Klook #109354 |

東南亞（越南）沿用 `https://onelink.one/s/nnjWf`，已確認抵達 KKday 越南 eSIM #146719；未冒充東南亞通用卡。多國／跨洲指向 `#esim-buying-checklist`。

## 實際文案

模組標題：**30 秒選出適合你的 eSIM**

導言：先看你要去哪裡，再選想查看的品牌。手機已確認支援 eSIM，再往下挑就好。

**日本旅遊**

只去日本，先看日本單國方案，再依旅遊天數與用量挑選。

想看 JOYTEL 三電信方案，或習慣在 Klook 挑選，都可以直接查看各自商品頁。

**韓國旅遊**

去首爾、釜山或其他韓國城市，先把使用天數和流量需求確認好。

下方分別是 JOYTEL 雙電信與 Klook 5G 商品；熱點分享與使用限制，購買前再看一次。

共用提醒：價格與方案以官方頁面為準；付款前再確認手機相容性、使用天數、涵蓋國家與熱點限制。

## Tracking

五個速查聯盟 CTA 都包含 `target="_blank"`、`rel="sponsored noopener noreferrer"` 與另開分頁提示。

- `brand`：JOYTEL、Klook 或 KKday。
- `placement`：`esim_quick_decision`。
- `destination`：`japan`、`korea` 或 `southeast_asia`（後者商品名明列越南）。
- `article`：`/esim`。
- 保留 `affiliate_network=affiliates_one`、`product_category=esim`、`product_name`、`cta_position`、`link_url`、`page_path` 與 beacon 傳輸。

原始短網址不添加／重寫追蹤碼。站內替代連結不發送 `affiliate_click`。既有 tracker 以 `data-affiliate` 辨識，所以 Klook 韓國的 `linkgo.one` 同樣正常追蹤，不依賴 hostname 猜測。

測試確認事件產生與欄位，不代表 production GA4 已收到事件或訂單歸因成功。上線後需在 GA4 確認收件；若要依新欄位製作報表，管理員需確認事件範圍自訂維度是否已建立。本次不修改 GA4 帳戶。QA 預覽阻擋遠端 analytics／廣告請求，避免測試污染。

## 已確認的原文修正

- 舊 JOYTEL 日本短鏈 `https://onelink.one/s/z4xjt` 與品牌入口 `https://afflink.one/s/zf2Z8` 轉到網域出售頁，不再用於本頁導購。原品牌入口 CTA 暫連 `/esim/joytel` 站內指引，沒有將日本商品假扮全球入口。
- JOYTEL 日本三電信商品頁確認為漫遊線路，修正本頁相關表格／段落，避免讀者誤認為原生方案。
- 部分方案掃描後開始計天，將「出發前一律完成安裝」改為依商品指示確認安裝與啟用時間。
- KKday 越南商品注意事項不支援接收當地 App 驗證簡訊，修正原文把含門號推薦給 OTP 用途的說法。

其他文章仍有舊 JOYTEL 短鏈，本次未擴大修改全站；可另行盤點更新。

## 驗證

- `ASTRO_TELEMETRY_DISABLED=1 npm run build`：44 頁建置通過。
- `node --experimental-strip-types --test tests/affiliate-click-tracker.test.mjs`：6/6 通過；含四個正式 URL 保真、品牌／目的地分組、舊追蹤相容、初始化去重、無 analytics 容錯與失效 URL 防護。
- 原專案無 lint／test scripts。`npm run astro -- check` 提示缺少 `@astrojs/check` 與 `typescript`；未完成完整型別檢查，未修改依賴檔。
- 比對修改前後 title、所有 meta、canonical／alternate、JSON-LD 與 sitemap 不變；原有站內連結保留，目標與錨點存在；檢查外連 rel、target、追蹤欄位及唯一 ID。
- 可見瀏覽器檢查 320px、390px、1280px，確認按鈕換行、間距、Tab 焦點與 Enter 導覽；並非完整 WCAG 稽核。
- 本機分支 `codex/esim-quick-decision`，完成後 commit，未 push、merge 或部署。

## 剩餘 TODO／人工確認

日本與韓國沒有 URL placeholder，不需再提供。設定檔只保留：可選的 JOYTEL 全球品牌入口、越南以外東南亞區域連結、Airalo 多國連結。缺少連結不生成假購買 CTA。優惠碼不是必要資料，本次沒有加入。

上線後人工確認 GA4 收件、自訂維度與聯盟平台歸因；四個正式連結已確認商品落地，但沒有進行購買。

建議觀察三個 KPI：

1. 文章聯盟 CTR：`/esim` 有聯盟點擊的工作階段 ÷ 瀏覽本文章的工作階段，分裝置／來源比較。
2. 速查模組導購率：`placement=esim_quick_decision` 有聯盟點擊的工作階段 ÷ 本文章工作階段，按品牌／目的地比較。分母不是模組曝光。
3. 聯盟平台 EPC：已確認佣金 ÷ 平台有效點擊；須取自平台，GA4 點擊不能代表成交。未有官方子追蹤碼時，不宣稱收益能精確歸因到本模組。
