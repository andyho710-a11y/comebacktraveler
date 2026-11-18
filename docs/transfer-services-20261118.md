# 安心包車接送替換生活服務

依使用者要求，主站 `/services` 改為個人包車、長途接送及一般陪診，頂部入口改為「安心包車接送」。移除八個舊媒合、刊登、接案與帳號頁，Hosting 以 301 導回新服務首頁。隱私頁換成新服務說明。舊 Supabase 資料、帳號及後端未刪除；不啟用新資料庫或收款。

## 費率與授權

使用者確認一般陪診每小時 400 元、至少兩小時，交通另報，並授權依行情優化包車里程與加價條件。單一費率來源為 `src/features/services/data/transfer-pricing.json`。4/5/8 小時為 2,800/3,200/4,200 元起，含 140/160/220 公里；超時每半小時 200 元增加 10 公里，超里程每公里 15 元。停車、過路及代墊另列，適用範圍及組合陪診總價事先確認。

原稿 8 小時 4,500 元高於 4 小時加 4 小時超時的 4,400 元，故改為 4,200 元。公開比較限 LINE GO 舒適四人座基本費率，4/5/8 小時分別少 995/1,090/1,575 元，明列日期、車款及完整條件不同，未宣稱市場最低。一般陪診不與有照護資格服務當作等同產品比較。

查核日期 2026-11-18，主要來源：

- https://www.linego.me/charter_service
- https://airport0963910710.com/how_much/time-charter/kaohsiung-chartered-car/
- https://www.ezkt.com.tw/Traveling_Kaohsiung.html
- https://paopaotui.com.tw/news/95
- https://ghsha.com/articles/107

一般陪診僅為院內掛號、候診、繳費、領藥協助，不含醫療照護、移位或病情解讀。舊獨立接送網站同步費率與範圍。A4 PDF 與 LINE 直式圖由相同 JSON 產生，放於本機輸出目錄，不將個人 LINE ID 或原始照片加入版本控制。

## 驗證與部署

- 主站 148 項測試通過、1 項原有線上測試跳過；服務型別檢查零錯誤。
- 旅遊內容、SEO、CTA 與聯盟連結依既有語意基準全數驗證，未改旅遊文章。
- 原始碼雜湊保護仍完整。編譯工具修補後，兩個舊 HTML 位元組比較改用原有完整 DOM 語意基準與實際資產存在檢查，未重建內容基準；其他行為測試保留。
- 可見瀏覽器驗證桌面及 390 px 手機版；價格、聯絡及手機選單正常，無水平溢出。
- PDF 為一頁 A4，中文字型嵌入；兩份 QR 在 100/150/300 dpi 均解碼至設定的 LINE 連結。這不等於已驗證 LINE 手機端收件人狀態。
- Hosting 明確指向 `comeback-traveler-web`；只部署 Hosting，保留越南詢價 API rewrite 與原有網址轉址。前一個 live 版本為 `f8bfc52aa057b87d`，releaseTime `2026-10-17T05:25:02.325Z`。
- 聯絡資料由本機環境或 GitHub repository variables 注入；未設定時連至原獨立接送網站的詢問入口，不假裝已收單。

## 尚未消除的套件安全警示

Astro 更新至 7.4.12、Vite 至 8.3.8，並執行相容的 lockfile 修補。其餘 npm audit 警示來自 picomatch 上游相依鏈。2026-11-18 查詢 npm 最新版為 4.0.7；GitHub 通報 GHSA-fc5q-39xc-vjpf（2026-11-17 更新）列出 <=4.0.7 受影響、無修補版。沒有強制降版或關閉 audit，CI 仍會因它失敗。

該依賴用於受控原始碼的建置／型別檢查，不將任意訪客輸入交給 glob parser。本次發布為靜態 HTML/CSS/JS，產物未包含 picomatch 或舊 Supabase 程式，仍須追蹤上游修補。此評估不是宣稱依賴已無漏洞。

來源：https://github.com/advisories/GHSA-fc5q-39xc-vjpf
