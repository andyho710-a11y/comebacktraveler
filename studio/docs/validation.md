# 驗收紀錄

日期：2026-11-16，Node 24.15.0／Windows。本次沒有部署或操作線上服務，所有送單與後台測試均用明示的假資料。

## 新工作室

- Astro 7.4.12 靜態建置成功。獨立 lockfile 的 `npm audit --audit-level=moderate`：0 個已知漏洞（查詢當下的 npm advisory 結果，非完整安全保證）。
- `npm test`：9 項通過。涵蓋反垃圾、同意、日期／數值／enum／長度驗證，空車與等待工時、兩種車輛成本去重、虧損與合法運價審查、分析欄位白名單；HTTP 同源、未授權存取、請求上限、持久化限流、防信任偽造 forwarded IP、重試去重、內容衝突、儲存加密、登入失敗限流與 session 到期、登出失效、booking 確認依據、版本衝突、首次確認去重、刪除與保留期、重啟後持久化。
- `node scripts/check-build.mjs` 檢查預設頁面 noindex、robots 阻擋、空 sitemap、後台靜態檔無假資料、分析空殼無表單／LINE 聯絡連結、產物未含 runtime 金鑰或測試密碼。
- Windows sandbox 預設禁止測試的 loopback 連線，初次 EACCES 不代表產品測試通過；取得本機測試執行權限後才完成 HTTP 測試。
- 可見 Chrome 驗收：桌面首頁、390×844 手機首頁與表單、原生必填同意提示、產生 LINE 文字、伺服器收單後的「尚非預約成功」及停用重送按鈕。沒有點擊傳送 LINE 訊息。
- 隔離的 in-memory 假資料 QA server 驗收手機後台登入、詢單顯示、內部試算、回存單筆成本／利潤及搜尋無結果狀態。沒有操作正式帳號或資料庫。
- 390px viewport，頁面 client／scroll 寬度 375／375（垂直捲軸占 15px），無橫向溢出。尚未另做 320px 實機驗收；暫時 viewport override 驗收後重設。

## 原站隔離驗收

以同一基底 `5688d2b` 建立 detached baseline worktree，比較本分支與基底 `dist` 全部檔案的 SHA-256：**134／134 檔案逐 byte 相同**，包含 HTML、CSS、JS、XML、公用圖檔及 `/services` 產物。兩者使用相同 root lockfile、相同依賴及相同未啟用服務設定建置；這不是 production-backed cloud 驗收，也不驗證 Supabase 即時資料。

第一次全站測試發現新 CI 檔的 `contents` 被 Tailwind 自動掃描，產生多餘 `.contents` CSS 規則，導致 2 個嚴格 hash 測試失敗。將該 workflow 與 studio 來源加入根 gitignore 的 Tailwind 排除後，重新建置：**原站 151 項測試，150 通過、0 失敗、1 原有線上 Hosting 測試跳過**。沒有修改既有測試基準或放寬任何斷言。

盤點同時發現 root 原有 lockfile 的 npm audit 為 6 個受影響套件（3 high、2 moderate、1 low），包括 Astro／undici 等。這是基底的依賴風險，未因本案升級或更改原站依賴；應另開修補工作並完整驗收，不把新 studio 的 0 漏洞結果套用到整個 repo。

## 尚未驗證／正式上線前必做

- 個人 LINE 深連結在實際手機開啟及 ID 搜尋允許設定；目前只驗收按鈕呈現及文字生成。
- 行照、保險、車隊合約／運價與預約合法程序、真實經營者／個資窗口；網站內待確認內容須逐一更新。
- 常駐 HTTPS 託管、proxy Host／來源與 TLS、Windows ACL 或 Linux 最小權限、加密備份及異機復原、金鑰保管／輪替、資料權利處理與刪除備份政策。
- 手機背景通知、遠端推播或管理員 LINE／email 通知；目前僅前景頁面提醒。
- 正式 GA4 串流／Enhanced Measurement 設定、DebugView 和實際請求 payload，confirmed_booking 對 GA4 的後端傳輸未接線。
- GSC／Google 商家資格與驗證、真實搜尋需求、CWV 與流量、成交資料。目前沒有任何搜尋量、實際客戶、營收或 ROI 結論。

本版本是可 review、可本機驗收的安全測試 MVP，不能只部署靜態檔就宣稱能在家收到正式詢單或通知。
