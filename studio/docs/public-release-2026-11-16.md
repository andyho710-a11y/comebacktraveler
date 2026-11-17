# LINE 人工詢問版公開試營運

使用者已於 2026-11-16 明確授權上線試營運並要求網址、Google／AI 搜尋及其他獲客建議。本次授權涵蓋獨立接送站公開發佈，取代先前僅限本機的限制；不合併原站、不購買付費服務。

- 公開網址：https://kaohsiung-safe-transfer.web.app/
- Firebase project：`comeback-traveler-web`；獨立 Hosting site：`kaohsiung-safe-transfer`。
- 首次上線來源提交：`1fb0446`，之後加入同站 Google 驗證標記。最終 Hosting 版本 `ff4957d6a5e4ac00`，發布時間為 2026-11-16 14:17:03（Asia/Taipei）。設定僅用 `studio/firebase.public.json`，只部署 Hosting。
- 發佈範圍：首頁、跨縣市、長輩等候往返、半日／一日用車、隱私說明，共 5 個可索引內容頁；另有 robots、sitemap、分享圖與必要資產。
- 公開版以 LINE 人工聯繫為主，行程工具只在本頁產生文字，客人自行複製及傳送。姓名／聯絡方式改為選填，乘客欄位最多 4 位。
- 不部署 Node、SQLite、管理頁、analytics 頁或 API；不儲存表單、不載入 GA4、不自動發送訊息、報價、預約或付款。所有正式預約依車隊與主管機關規範人工完成。

## 驗證

11 項單元／HTTP／持久化／公開控制器測試通過。公開控制器測試執行實際程式，確認載入、輸入、submit 及文字生成均不呼叫 fetch；非法聯絡 URL／非 HTTPS 網站設定拒絕。預設 noindex 本機版與公開版各有產物檢查。

公開 smoke test：7 個公開入口回應 200；`/admin`、`/analytics`、`/api/config`、`/api/inquiries` 均回應 404。實際回應包含 no-referrer、nosniff 及禁止表單傳送／網路收集的 CSP。公開 sitemap 為有效 XML、包含 5 個正式 canonical 網址，無 noindex HTTP 標頭。依賴 audit 0 已知漏洞。

可見 Chrome 驗收公開首頁與 390px 手機行程文字生成：375px client／scroll 寬度相同、無橫向溢出；LINE 入口指向經營者提供的個人帳號，不把行程資料加進網址。沒有代傳 LINE 訊息。

原站 root 設定與部署流程未修改；部署前後旅遊站 `live` releaseTime 同為 `2026-10-17T05:25:02.325Z`，未發佈 `/services` 或 sourcing。原站既有依賴 audit 問題仍獨立保留，不將接送專案的 0 漏洞套用到整個 repo。

## 搜尋與獲客

已驗證 Search Console 的此 HTTPS URL-prefix 擁有權，驗證標記只放於本機建置設定及公開產物，不提交 Git。首次 Sitemap 提交成功，但介面回報「無法讀取 Sitemap」；獨立 HTTP 測試確認 XML／200／索引標頭正常，尚不能宣稱 Google 已擷取或收錄。首頁索引申請的最終結果另記於本文件後續核對狀態。

IndexNow 已通知 Bing 5 個網址，HTTP 202，代表收到且驗證待處理，並非收錄證明。開放一般搜尋爬蟲及 OAI-SearchBot，GPTBot 另行禁止訓練用途爬取。已加入真正可見的服務內容、內部連結、WebSite／WebPage／Service 結構化資料、canonical、OG 與 sitemap，沒有建立換地名的薄內容頁、假評論、假地址或報價。

獲客研究、社團排除理由、貼文與合作方向見 [public-acquisition-plan.md](public-acquisition-plan.md)。沒有購買廣告、建立商家檔案、代發社群貼文或聯絡合作對象。

## 後續維護

發佈前固定執行 `npm run check:public`。保留 `.runtime/config.json` 的聯絡設定與 `.runtime/google-site-verification.txt`，不要把帳戶密碼、加密金鑰或資料庫提交／部署。正式站重建若缺 Google 標記會拒絕，避免無意移除擁有權驗證。另保留 `.runtime/indexnow-key.txt` 供相同站點更新通知；它不是客戶資料。

回復僅限接送 Hosting site 的前一版本，不操作預設旅遊站或資料庫。Firebase Hosting 保留已發佈版本；先用 `hosting:channel:list --site kaohsiung-safe-transfer` 記錄當前版本，再依既有回復程序選定要回復的接送版本。不可用原站設定檔執行全域 deploy。

Google 首頁索引查詢當時顯示尚未編入索引；手動要求建立索引因平台顯示每日配額不足而未受理。沒有繞過驗證或反覆提交。擁有權驗證完成不等於已索引，Sitemap 的首次讀取問題仍需之後查看 Google 回讀結果。

Bing／IndexNow 已提交 5 個公開網址，HTTP 202：收到但站點 key 驗證待處理；不是收錄證明。沒有使用已停用的 sitemap ping 端點、沒有付費買索引或保證排名。

獲客方案與貼文草稿見 [public-acquisition-plan.md](public-acquisition-plan.md)。本次沒有加入社團、發社群貼文、聯絡飯店／民宿、建立 Google 商家檔案或購買廣告。
