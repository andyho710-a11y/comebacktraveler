# 高雄安心長途接送｜獨立測試工作室

此專案位於原 repository 的 `studio/`，採獨立依賴、建置目錄、版型及資料庫。**不掛到 Comeback Traveler 正式路由，不修改 `/services`、Supabase、根 Firebase 設定、旅遊站追蹤或原部署流程。** 2026-11-16 業主已授權公開試營運，採獨立 Hosting 的 LINE 人工詢問版；不收款、不自動報價或派遣，Node／SQLite 後台仍不對外部署。

## 本機開始（Node 22.13+；建議 Node 24 LTS）

```powershell
cd D:\astro\.worktrees\kaohsiung-transfer\studio
npm ci
npm run build
npm run setup
npm start
```

首頁：http://127.0.0.1:4330 ／ 後台：http://127.0.0.1:4330/admin 。測試版只能填假資料。`setup` 產生隨機管理密碼到 `.runtime/admin-password.txt`，不覆蓋既有設定。不要把這個檔案或 `.runtime/config.json` 放入 Git、截圖、對話或雲端同步。

`npm run dev` 僅提供 Astro 靜態版面預覽（4331），不提供後端。完整送單與管理請使用 `build` → `start`。程式綁定 loopback，不開放區網或網際網路。

```powershell
npm test
npm run purge
```

## 已實作

- 手機優先繁體服務首頁、流程、FAQ、待核實信任資料、隱私告知、預覽 noindex、可設定 canonical／sitemap／OG。
- 個人 LINE 入口由未追蹤的 `.runtime/config.json` 設定 `lineUrl` 與 `lineId`，預設空白；本機已套用業主提供的聯絡方式，公開來源不提交個人 ID。連結尚待實機驗收。不是官方帳號，無自動回覆或 Webhook。行程文字只在頁面產生，複製後自行傳送。
- 前後端驗證、honeypot、2.5 秒最低填寫時間、16KiB 請求上限、同源檢查、持久化限流、UUID 重試及內容衝突檢查。重送不重複計數。
- SQLite 持久化，AES-256-GCM 加密詢單與試算內容。單一管理員 scrypt 密碼、8 小時 HttpOnly／SameSite session；正式模式要求 HTTPS。所有管理 API 授權，頁面只有空殼，沒有靜態客戶資料。
- 七種狀態、搜尋／篩選、內部成本試算、每單試算保存、版本衝突處理、資料刪除、啟動及每小時保留期清理（示範 30 天）。最近 1,000 筆可搜尋。
- 本頁開啟且在前景時的 30 秒輪詢提醒，只顯示「有新詢問」。**不是手機背景推播或 LINE 通知。**
- 按日來源彙總事件與成交狀態統計；GA4 預設關閉，可核准設定獨立串流後由訪客主動同意啟用前台事件。`confirmed_booking` 現階段僅在本站服務端、首次人工確認時計數，未傳 GA4；見追蹤文件。

## 設定、安全與資料

本機設定在 `.runtime/config.json`。正式設定位於主機受保護目錄，以 `STUDIO_CONFIG` 指向該檔案，`STUDIO_DATABASE` 指向持久化磁碟資料庫。金鑰與資料庫應分開存取、分開備份。Windows 的 POSIX `mode` 不等同 NTFS 權限控制；上線前須驗證 ACL、磁碟加密與備份權限。丟失金鑰無法復原；更換金鑰需離線解密重加密，不可直接覆蓋。

`enabled` 可啟用 demo 假資料收單；production 模式另要求 `operator`、`privacyContact`、`legalApproved` 及 HTTPS。這只是誤開防護，不是法律資格判定。正式預約永遠需要人工車隊流程。匿名分析只存 enum 來源；不接受任意 UTM 值，沒有客戶個資／網址參數入 GA4。

網路來源採直接 peer IP 的 HMAC，不相信外部 `X-Forwarded-For`。反向代理正式上線須另設代理層 per-client 限流；否則所有訪客共用代理 IP 的 5 次／小時門檻（保守但會誤擋）。現階段不允許任意信任 forwarded headers。

加密不涵蓋來源 enum、狀態、時間、彙總指標與 session 到期時間；它們也只在受保護資料庫。API 錯誤不回傳內部例外，程式不記錄請求本文。刪除會移除本機詢單與重試紀錄，採 SQLite secure_delete，仍須處理磁碟快照、備份與 LINE 對話。彙總分析保留 400 天，與已刪除詢單不做重新識別。

## 文件

- [架構與環境盤點](docs/architecture.md)
- [競品、車型與上線核對](docs/research-launch.md)
- [SEO、30 天獲客與 GA4](docs/acquisition.md)
- [LINE 文案、通知與 AI 擴充](docs/line-automation.md)
- [測試與驗收](docs/validation.md)

**公開試營運：** https://kaohsiung-safe-transfer.web.app/ ，使用同專案的獨立 Hosting site，僅發佈 `dist-public`。網站本身不收單儲存、不部署 admin／analytics 頁面、不載入 GA4；客人自行複製文字後使用 LINE 人工聯繫。原 Node／SQLite 與背景通知仍需另行核准常駐託管方式。沒有購買網域、主機、廣告或啟用付費 API。

```powershell
$env:STUDIO_SITE_URL='https://kaohsiung-safe-transfer.web.app'
npm run build:public
npm run check:public
npx -y firebase-tools@latest deploy --only hosting --config firebase.public.json --project comeback-traveler-web
```

聯絡網址與 ID 從未追蹤的 `.runtime/config.json` 讀取；建置產物本來就供公開網站顯示，但不提交 GitHub。CI 只用明確標示的假資料建置，從不部署。GSC 的公開驗證標記可由 `STUDIO_GOOGLE_SITE_VERIFICATION` 注入；IndexNow 驗證檔自動產生且不進 Git。獲客執行表見 [public-acquisition-plan.md](docs/public-acquisition-plan.md)。
