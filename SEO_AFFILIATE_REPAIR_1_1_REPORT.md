# SEO / Affiliate Repair Sprint 1.1

2026-10-07（Asia/Taipei）。**Release gate：RELEASE-READY，全部指定 gates 通過；尚未發布 production。**

## Branch 與範圍

- Branch：`codex/seo-affiliate-repair-1`
- 本輪起點：`8035db4676e64ca652202d4ee9de1df5c27cdc80`
- 原 production baseline：`79e1735cef5e25864bb13707b54e81f76238ffe0`
- 本輪 commit SHA 在交付回覆與此分支 `git log -1` 提供。
- 六個 source pages 的失效 CTA、JOYTEL 小螢幕表格 CSS、既有 regression tests、fixture、inventory、本報告及驗證證據為此次變更。
- 不 merge、不 push、不 production deploy。沒有修改 secrets、GA4 config、Auth authorized domains、database、Firestore 或 Sourcing Functions。

## JOYTEL Emergency Cleanup

| 項目 | Before | After |
|---|---:|---:|
| Active parked JOYTEL CTA | 11 | **0** |
| Affiliate CTA definitions | 83 | 72 |
| Static affiliate anchors | 79 | 69 |
| Dynamic affiliate variants | 4 | 3 |
| 移除 commercial affiliate intent | — | **11** |
| Temporary internal fallbacks | 0 | **11** |
| 非 parked affiliate href 改動 | — | **0** |

舊 URL 僅保留於 source history／盤點證據，不再出現在任何 built HTML／quiz executable script。沒有猜測、生成或套用 JOYTEL 替代 affiliate URL。有效的其他 JOYTEL、日本／韓國 production-approved recommendations 也保留原值；不把 cleanup 擴大成移除所有 JOYTEL。

### Temporary fallback mapping

| Source page | CTA count | Replacement |
|---|---:|---|
| `/esim/china` | 2 | `/esim`（日韓 general comparison） |
| `/esim/joytel` | 2 | `/esim`（general catalog fallback） |
| `/esim/troubleshoot` | 2 | `/esim`（general comparison） |
| `/vietnam-jcb-lounge` | 2 | `/esim`（越南上網／general comparison） |
| `/esim/japan` | 2 | `/esim/japan` |
| `/esim-quiz` 日本 stable variant | 1 | `/esim/japan` |

本輪沒有已確認 parked 的 Korea-specific CTA（0 個）；保留有效韓國 URL，未製造多餘替換。

一般 CTA 使用「查看目前可用的 eSIM 方案」，日本使用「比較其他日本 eSIM 方案」。JCB 原敘述內的品牌 anchor 保留品牌辨識並註明比較目前方案。China、日本、JOYTEL、troubleshoot 的該 CTA 區域將購買佣金說明改成「JOYTEL 購買連結更新中，可先查看其他可用方案。」不再把這些按鈕當成購買入口。

所有 fallback 移除 `target="_blank"`、commercial `rel`、`data-affiliate`、所有 `data-affiliate-*` 及 `data-cta-position`；quiz 的 `aff` 改為 false，刪除失效常數及日本 metadata。既有 tracker 不改，fallback 點擊不匹配 affiliate selector，測試確認不產生 `affiliate_click`。一般 GA4 page navigation 行為未改，不宣稱完全不發送 page_view。

更新 `docs/seo-affiliate-repair-1/joytel-legacy-cta-inventory.csv` 全部 11 筆，新增 `old_url`、`source_page`、`old_anchor`、`replacement_type`、`replacement_url`、`affiliate_removed=true`、`reason=confirmed parked destination`、replacement anchor。先前 GET chain 作歷史證據保留。將來重新加入商業 CTA 仍需要 owner-approved replacement；目前 internal fallback 已安全解除 release blocker。

## JOYTEL 文章與其他 affiliate regression

`/esim/joytel` 頁面保留。Title、meta description、H1、schema 各有 baseline exact assertions；完整 rendered editorial content 與原 production build 比對，僅排除兩個授權 CTA anchors、CTA 透明說明及非正文的 scripts/styles/stylesheet references，內容一致。

QA 找到原 320px 表格使 document 寬度達 352px（client width 305px）。只在既有 `max-width:600px` rule 加入 `display:block; max-width:100%; overflow-x:auto`，不修改比較表文字、欄位或順序。最終 320px document scroll/client 都是 305px；表格自身 client 273px、scroll 336px，可在表格內捲動。390px 表格寬 343px，desktop 692px；兩者均無頁面水平溢出。

所有其餘 static affiliate href 與順序逐頁比較 baseline；quiz 其餘 3 個原始 URL 也 exact compare。Coupang、Shopee、momo、Klook、KKday、Booking、Trip.com 以及非 parked JOYTEL href 改動均 0。沒有修改追蹤 query／UTM。

## Hosting Preview 與 production safety

- Preview：[seo-affiliate-repair-1-1](https://comeback-traveler-web--seo-affiliate-repair-1-1-div4t0iz.web.app)
- 到期：**2026-10-07 12:41:50 台北時間**（12h temporary channel）。
- 使用 Firebase CLI 15.32.1，既有身份／權限；只執行 `hosting:channel:deploy seo-affiliate-repair-1-1 --expires 12h --no-authorized-domains --project comeback-traveler-web`。
- 為 CTA 說明與實際發現的 mobile CSS 修正，更新同一 Preview channel；未建立／修改 production channel 或 custom domain。
- 8 個指定 Preview HTML 與最終本機 dist **byte-for-byte 相同**；Preview sitemap 與本機 XML 相同且為 39 URLs。證據：`preview-build-manifest.json`。

Live release before/after 都是 `projects/comeback-traveler-web/sites/comeback-traveler-web/channels/live/releases/1791174500394000`；live version before/after 都是 `projects/comeback-traveler-web/sites/comeback-traveler-web/versions/85758aab1eb942e2`。`preview-safety.json` 保存精簡核對，沒有保存登入 token／帳號原始資料。

因此 **production 上的舊 CTA 尚未因本次 Preview 改變**；production cleanup 要另行授權 merge／release，本輪沒有執行。

## JCB HTTP release gate

在真實 case-sensitive Firebase Hosting Preview 用 GET、逐跳且不自動隱藏 redirect chain 驗證：

| Request | Chain | 結果 |
|---|---|---|
| `/vietnam-jCB-lounge` | **301 → `/vietnam-jcb-lounge` → 200** | PASS |
| `/vietnam-jcb-lounge` | 200，無 Location | PASS |
| `/vietnam-jcb-lounge/` | 301 → 小寫無斜線 → 200 | PASS |
| `/vietnam-jcb-lounge.html` | 301 → 小寫無副檔名 → 200 | PASS |

每條 chain 只有一個 final 200、沒有 loop，canonical 都是 `https://comebacktraveler.com/vietnam-jcb-lounge`。`firebase.json` 本輪無 diff，保留先前 exact redirect、cleanUrls 與 trailingSlash。證據：`preview-http.json`。前一輪 Windows emulator 的限制已由這項 Preview 驗證補齊。

## Browser QA

使用本次允許的 Codex 可見 in-app browser；`wmux` 不可用。實際設定 viewport width 320／390／1280、高 900，逐頁載入 Preview、量測 DOM、保存 JPEG 截圖並檢視 overview/focus screenshots。

| Page | 320 | 390 | 1280 |
|---|---|---|---|
| `/vietnam-packing-list` | PASS | PASS | PASS |
| `/vietnam-mosquito-repellent` | PASS | PASS | PASS |
| `/anti-theft-crossbody-bag-guide` | PASS | PASS | PASS |
| `/esim/joytel` | PASS（修正後） | PASS | PASS |
| `/esim/japan` | PASS | PASS | PASS |
| `/esim/korea` | PASS | PASS | PASS |
| `/esim-quiz` | PASS | PASS | PASS |
| `/vietnam-jcb-lounge` | PASS | PASS | PASS |

24/24 document scrollWidth ≤ clientWidth，無 active parked anchor，header/footer 存在，CTA 可讀且在內容寬度內。Packing disclosure 先於第一 commercial CTA，三種尺寸均正常。JOYTEL 表格的局部橫向捲動屬預期行為，不是 document overflow。

另實際完成日本測驗（short／solo／stable），顯示 internal CTA，點擊進入 `/esim/japan`；JOYTEL generic fallback 點擊進入 `/esim`。Mobile menu 展開並導航到比較頁，footer privacy link 導航到 `/privacy`。沒有點擊外部 affiliate／購買連結，沒有手動發送 analytics event；QA 後還原 viewport override。

Preview 更新後曾遇到 browser cache，reload 後重新量測並保存 JOYTEL 三尺寸最終證據。保存的 raw viewport／full-page JPEG 共 51 張在本機 visualization `repair-1-1-browser`；repo 內保存 6 個八頁 overview、3 個 disclosure/table/fallback focus sheets、quiz 與 mobile-menu 截圖及全部 24 筆 metrics/navigation JSON。Overview 每張依序 packing、mosquito、anti-theft、JOYTEL、日本、韓國、quiz、JCB（左到右、上到下）。

## Build、tests、typecheck

- 最終 `ASTRO_TELEMETRY_DISABLED=1 npm run build`：**44 pages 成功**。
- `REPAIR_HOSTING_URL=<Preview origin> node --test tests/*.test.mjs`：**29 passed、0 failed、0 skipped**。既有 11 tests 保留，包含 tracking、packing 與 production owner URL assertions。
- 覆蓋 10 static + 1 dynamic fallback、無 active parked links、移除 affiliate attributes／event、Japan route、general approved internal routes、JOYTEL protected content/head/schema、全站其餘 href、packing disclosure、39 sitemap URLs、原 JCB config、真實 Preview HTTP chain。
- `npx astro check`：**59 errors、0 warnings、1 hint**。與原 baseline 按 file／severity／TS code／primary message 比較，新增與移除診斷均 0；忽略授權編輯造成的 line shifts。Typecheck 仍有既有 errors，未宣稱 typecheck clean。
- Tests 與比較摘要在 `docs/seo-affiliate-repair-1-1/`；不以 skip 算通過，也沒有刪除 uppercase 301 assertion。

## Release gate 結論

| Gate | Result |
|---|---|
| Parked JOYTEL active = 0 | PASS |
| Non-JOYTEL affiliate regression = 0 | PASS |
| Build | PASS |
| Tests | PASS（29/29） |
| Sitemap 39 expected HTML URLs | PASS |
| Packing disclosure | PASS |
| Browser QA | PASS（24/24） |
| Case-sensitive JCB 301 → 200 | PASS（Preview） |
| 新 typecheck diagnostics = 0 | PASS |

**RELEASE-READY，等待人工審核及另行 production release 授權。** 原 `D:\astro` 仍是 `codex/vietnam-sourcing-mvp`、HEAD `ee70f4f481c9cd96c4bb89e56dbdfd50889c2533`，原 scorecard 的 26 行變更及 audit／image／social 未提交狀態保留。
