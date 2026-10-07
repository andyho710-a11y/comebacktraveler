# eSIM AFFILIATE ROUTING FIX — READY FOR HUMAN REVIEW

Branch：`codex/esim-affiliate-routing-fix`。基準 production main：`a2147d130cc2ce718b3c0eb6a6eb1e08a698cef3`。本地 commit SHA 於最終回報提供。

Preview：https://comeback-traveler-web--esim-affiliate-routing-fix-1lcp06n8.web.app

Preview release：`1791332391762000`；version：`961e1472131b2bcf`；發布時間：2026-10-07T00:19:51.762Z。到期：2026-10-14T00:19:45.122804054Z（台北 10 月 14 日 08:19）。只建立及更新此 Preview，沒有 merge、push main 或 production deploy。

## 修正

- 日本頁恢復兩處 JOYTEL 購買連結，另提供 Klook 日本替代購買；保留比較正文與站內比較。
- 韓國頁兩個舊 LsI9l CTA 統一使用中央 joytelKorea，另提供 Klook 韓國替代購買。JOYTEL 仍首推。
- JOYTEL overview 購買區分別連往日本與韓國商品，保留完整 eSIM 比較；未將日本商品假冒 generic catalog。
- Quiz 日本／韓國 stable 直接使用中央 JOYTEL；cheap 仍推薦 WaySim，主要 CTA 保留站內比較，secondary CTA 清楚標示 Klook 是另一個可購買選項。
- Quiz 越南兩種結果與其他 eSIM 頁面的越南購買區使用中央 KKday；移除散落的舊 JOYTEL Vietnam 與 Viettel 商品網址。保留 Viettel 選購敘述，明確區分 KKday 商品目前為 Vinaphone。
- 安裝教學原本 generic JOYTEL 網址未有本輪核准中央 catalog；改為站內 JOYTEL 選購重點，不假冒購買或發 affiliate_click。
- `/esim` 原有 7 個 affiliate anchors 補齊 machine key 與 merchant。共用卡片僅新增可選 metadata 欄位，未修改共用 CSS、tracker 或防蚊實驗。
- Quiz 動態產生的卡片／按鈕改為結果容器內的樣式，修正原本無法匹配 Astro scope 的問題。深色購買區內部比較連結改為可讀顏色。

## 五條中央網址公開驗證

只使用 owner-approved 原網址，未重新生成或加入任何 tracking parameters。HTTP GET 停在 tracking service 的 HTTP 202，繼續以瀏覽器實際 landing 驗證；未登入、購買、加購或送表單。

| key | 結果 | 實際商品 |
|---|---|---|
| joytelJapan | PASS；無 parked | JOYTEL 日本三電信 eSIM，`joytel-tw.com/products/japan-esim` |
| klookJapan | PASS；無 parked | Klook 日本 eSIM，商品 109393 |
| joytelKorea | PASS；無 parked | JOYTEL 韓國雙電信 eSIM，`joytel-tw.com/products/korea-esim` |
| klookKorea | PASS；無 parked | Klook 韓國 5G eSIM，商品 109354 |
| kkdayVietnam | PASS；無 parked | KKday 越南 Vinaphone eSIM，商品 146719 |

商家自行附加的轉址參數未複製回 repository。日本三電信商品目前標示漫遊線路；依本次指示保留 quiz「JOYTEL 日本原生線路」推薦文字，並在 CTA 前明確告知兩者不同。人工驗收應特別確認此區分。KKday 越南不是 Viettel，購買說明同樣明確標示。

## Gates

| 項目 | 結果 |
|---|---|
| LsI9l active before / after | 3 → 0（韓國靜態 CTA 2 + quiz variant 1） |
| centralized affiliate CTA count | 18 個靜態 anchors；5 個商品 keys。Quiz 6 個 eSIM 結果分支各有 1 個購買 CTA |
| affiliate href changes | 7 個 eSIM 靜態頁的 inventory 改變；5 處舊連結替換、2 處移除、6 處新增。Quiz 3 個原 affiliate 結果替換，新增日本 stable 與兩個 Klook alternatives；未新增 query parameters |
| unrelated affiliate href changes | 0；順序亦一致 |
| parked zf2Z8 / z4xjt active | 0 / 0 |
| Build | 44 pages，成功 |
| Tests | 82/82 PASS；0 failed；0 skipped（含 Preview 真實 301/200 routing test） |
| Typecheck delta | 新 diagnostics 0，移除 0；既有 59 errors、0 warnings、1 hint |
| SEO guardrail | 9 頁 title、meta description、H1、canonical、schema 精確一致；主要正文除 CTA／商品區別購買說明外未變 |
| Preview 檔案比對 | 44 HTML + 31 JS/CSS + 2 sitemap 共 77 個公開檔案，HTTP 200、與本地建置 byte-identical |
| unrelated page HTML | 35 頁與 production main 建置 byte-identical |
| Privacy / navigation | PII、敏感 query、RFQ/order ID 與任意輸入不入 affiliate payload；實際 href 保留核准原值 |
| Mosquito regression | source、tracker、freeze 文件未變；完整渲染 HTML 與參照資產 byte-identical；原實驗兩 CTA 與去重 gates 全數通過 |
| Live channel | 仍為 release 1791325434446000／version bf0c1565fdb81532，未更新 |

静態 href 變更計數按原 anchor 意圖核對：韓國 2、越南 3，共替換 5；安裝 generic 1、越南舊 inline 1，共移除 2；日本 3、JOYTEL overview 2、韓國 Klook 1，共新增 6。`/esim` 的既有 7 個 href unchanged。

## Tracking 與 Preview Browser QA

所有 direct affiliate CTA 均有 `data-affiliate=affiliates_one`、product、product-key、category=esim、merchant 及 position。Machine keys：`collection_joytel_japan_esim`、`collection_joytel_korea_esim`、`collection_klook_japan_esim`、`collection_klook_korea_esim`、`kkday_vietnam_esim`。

聯盟揭露位於第一次 affiliate CTA 前。Quiz 使用一次結果揭露，不逐按鈕重複；cheap 的站內比較保持非 affiliate。

| 寬度 | `/esim`、日本、韓國、JOYTEL、quiz | quiz 結果 |
|---|---|---|
| 320px | PASS；document scrollWidth 305px，無橫向溢出 | 日本 stable／cheap、韓國 stable／cheap、越南 stable／cheap PASS |
| 390px | PASS；document scrollWidth 375px，無橫向溢出 | 同上六種結果 PASS |
| 1280px | PASS；document scrollWidth 1265px，無橫向溢出 | 同上六種結果 PASS |

实际操作 quiz 共 18 個尺寸／結果組合，確認推薦文字、比較 href、購買 href、商家 metadata，並確認最新卡片與按鈕樣式。Preview 瀏覽器未點擊商家購買連結。

另以本地候選建置 HTML 保留同一 tracker 與 quiz client bundle，移除外部 analytics loader 並注入本地 gtag stub，阻止所有連結 navigation。實際操作六種结果并点击各自購買 CTA，得到 6 次 affiliate_click，merchant、product key、quiz_result、affiliates_one 均正確；兩次 WaySim 內部比較沒有額外 affiliate_click。本次 eSIM 不新增 affiliate_cta_view，隔離測試為 0；防蚊既有曝光範圍維持不變。此證據不等於 GA4 live 收件驗證，未修改 GA4 config。

## Release readiness

**READY FOR HUMAN REVIEW**。請在 Preview 審核五個頁面與 quiz；特別確認日本原生推薦與核准三電信漫遊商品的提示，以及 Viettel 建議與 KKday Vinaphone 替代購買的提示。所有五條核准短網址目前可落地對應商家／國家，沒有失效網址需自行替換。

本輪未 merge、未 push main、未 production deploy；未碰 Sourcing、其他原有未提交檔案、secrets、GA4 config、Functions 或 Firestore。等待人工驗收與後續發布指示。
