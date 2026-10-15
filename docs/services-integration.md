# 高雄好幫手整合預覽與正式切換方案

目前僅完成獨立分支與預覽，尚未合併 main，也未部署 Comeback Traveler 正式站。正式部署須等待使用者確認。

## 架構與重用範圍

- 旅遊站基準：`90a180a760c434a4265f5dbd2a1f35b8be10263c`，Astro 7.2.8，Firebase `comeback-traveler-web`。原本 D:\astro 的工作中分支與檔案未修改。
- 整合分支：`codex/services-integration`。重用 `andyho710-a11y/kaohsiung-help` 的 `72bf9d5` 版本，19 個前端來源檔及10個頁面，保留來源 SHA256 清單於 `src/features/services/reuse-manifest.json`。
- 頁面放在 `src/pages/services/`，功能、版型及樣式放在 `src/features/services/`。調整內部連結、登入與重設密碼回跳、favicon 與返回旅遊站入口。旅遊中文選單新增一個「生活服務」，展開高度改依內容計算，避免新增項目截斷原選單。
- 重用原有 Supabase 登入、案件、報價、媒合快照、完工驗收、取消／爭議、通知、排程、RLS 與私人 Storage，沒有建立新資料庫、資料表或遷移。
- 預覽連接原測試專案 `jqzyduwzcbhylgjlrdvf`；未來正式連接原正式專案 `nneammnczvwziggoyzrn`。本次未修改正式專案。
- 僅在測試 Auth 新增兩個精確的預覽 `/services/account` 回跳網址，保留原回跳、SMTP、密碼長度、MFA 與 rate limits，未重新輸入或讀取 SMTP 密碼。
- 完全免費、不抽成、不代收、不串金流；原有高風險工程排除規則維持。

## 網址對照

| 用途 | 網址 | 狀態 |
|---|---|---|
| 現有旅遊正式站 | https://comebacktraveler.com | 保持原版本 |
| 現有獨立媒合站 | https://kaoh-help-20261014.web.app | 保留，未切換或導流 |
| 原 Firebase 測試版 | https://kaoh-help-20261014--staging-xdtxcjn2.web.app | 保留，使用測試資料庫 |
| 整合預覽 | https://comeback-traveler-web--services-integration-we1toi2q.web.app/services | 已部署預覽，2026-10-22 到期 |
| 預覽帳號頁 | https://comeback-traveler-web--services-integration-we1toi2q.web.app/services/account | 測試會員登入，與正式會員分開 |
| 預覽管理後台 | https://comeback-traveler-web--services-integration-we1toi2q.web.app/services/admin | 僅測試專案管理者可用 |
| 核准後正式專區 | https://comebacktraveler.com/services | 尚未發布，目前404 |
| 核准後正式後台 | https://comebacktraveler.com/services/admin | 尚未發布 |

沿用旅遊站原本去除結尾斜線的規則：`/services/` 會301正規化至 `/services`，不改動其他網址規則。

## SEO、分析與隱私

- 45個原有旅遊頁面，排除服務選單連結與其展開高度調整後，HTML完全一致；原33個外部 CSS／JS 資產完全一致。
- 原文章、標題、canonical、結構化資料、GA4程式、聯盟網址與追蹤欄位不變；sitemap、RSS及 robots.txt 不變。
- 原回歸測試的 fixtures 未改寫。測試只針對新增選單元素、固定的行動選單修正區塊與明確的 Tailwind 掃描排除作窄範圍比對，其餘仍照原基準檢查。
- 媒合頁採獨立版型，不載入 GA4、AdSense、Adotone 或聯盟追蹤，不把私人表單、案件識別或驗證網址送到旅遊分析工具。
- `/services` 所有頁面維持 noindex、不加入 sitemap；私人資料由原有後端權限保護。僅此路徑套用 no-store、no-referrer、DENY、嚴格 CSP 等安全標頭。
- 預覽環境額外禁止索引，並以僅預覽使用的 CSP 阻擋外部分析／廣告程式；正式旅遊頁面的標頭設定未變。
- 同一 Supabase 正式帳號與密碼可在未來正式專區登入。因網站來源改變，使用者需重新登入一次，不搬移密碼。

## 驗證與人工試用

本機126項測試中125項通過，1項為既有跳過；另已對預覽實測原大小寫301。專區19個檔案型別檢查0錯誤／警告，正式套件弱點檢查0件。

自動檢查另外將原 main 的 ads.txt、favicon.svg、robots.txt 文字換行正規化後固定比對原 Git 內容，處理 Windows／Linux 換行差異；沒有修改這三個公開檔案或放寬其他檔案的位元組比對。

預覽站已實際操作：服務者申請、客戶刊登、報價、客戶選擇、服務者確認接單、完工回報、客戶驗收、私人通知、一般會員後台阻擋及真實管理數據比對。另驗證新路徑重設密碼回跳、新密碼成功登入、舊密碼被拒絕，以及18項既有跨帳號／私人圖片API檢查。測試使用合成帳號及標記案件，已清除，沒有記入真實成交。

可見瀏覽器在212px窄版完成媒合流程，並實際從 eSIM、首次出國打包及日本攻略的行動選單進入專區；修正後選單完整展開。密碼回跳使用合成連結，沒有寄出額外驗收信；本次沿用已設定的SMTP，正式切換時仍需驗收新網址的實際收信。預覽的通知郵件連結暫沿用原Firebase測試站，站內通知已使用整合路徑。

人工試用請在整合預覽用測試會員，依「登入／會員資料 → 服務者申請與審核 → 客戶刊登與審核 → 報價 → 選擇 → 接單確認 → 完工 → 驗收」操作。客戶選擇後仍應等待確認，服務者接受後才產生成功媒合紀錄。第三個一般會員不應讀到私人聯絡資料或管理數據。

## 等待確認後的正式步驟

1. 使用者確認此預覽及正式整合後，再重新抓取 main，檢查基準有無變更；若有變更，先重新比對及驗收。
2. 記錄當下 Hosting live 版本並保留回復用版本／channel。本次唯讀記錄的 live 版本為 `d0833aa906b73c98`，發佈時間2026-10-13 21:59（台灣時間），本次未更新。
3. 將原正式後端的公開 URL 與 anon／publishable key 設到 GitHub Repository Variables：`SERVICES_SUPABASE_URL`、`SERVICES_SUPABASE_PUBLISHABLE_KEY`。不放 service_role、SMTP密碼或其他私密憑證。分支已備妥 build 檢查，缺少正確正式設定時會停止部署。
4. 在正式 Supabase 追加精確的 `https://comebacktraveler.com/services/account` 與 `?reset=1` 回跳網址，保留原網址與安全設定；將通知函式的 `NOTIFICATION_SITE_URL` 改為 `https://comebacktraveler.com/services`，讓案件信件指向整合路徑。SMTP及排程不用重建。
5. 經確認後才合併 main，讓既有 Hosting 流程部署；重新驗證正式頁面、登入回跳、會員權限、媒合與通知。不得將連接測試資料庫的預覽版本直接 clone 到 live。
6. 原 Firebase 程式版本及測試 channel 保留。現有獨立 live 暫留作回復入口；正式切換穩定後，若要把其根網址改為純測試用途，應另以測試後端設定部署並清楚顯示測試標示，避免測試寫入正式資料。

本次沒有設定正式 Repository Variables、改動正式 Auth／通知設定、合併 main 或部署正式站。

## 回復方案

尚未正式部署前，保留 main 即維持原站，無須回復資料庫。

正式整合後若需回復，經使用者授權可從 Hosting 既有版本還原。依本次記錄版本，官方CLI格式如下（本次僅查核命令格式，沒有執行）：

```powershell
npx -y firebase-tools@latest hosting:clone comeback-traveler-web@d0833aa906b73c98 comeback-traveler-web:live --project comeback-traveler-web
```

執行時必須使用正式部署前再次保存的最新版本，而不是盲用此歷史識別。程式庫可還原整合的 merge commit，重新部署原版。通知連結回復原獨立媒合網址；原 Supabase資料、會員、案件、報價與媒合紀錄持續保留，不執行資料庫降版或刪除。

會員驗證、服務者資格審核、爭議及個資清理仍沿用現有人工營運流程。
