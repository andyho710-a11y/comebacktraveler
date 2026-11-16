# SEO、前 30 天獲客及成效追蹤

## 搜尋需求證據

以下均是**候選詞，未驗證搜尋量**：高雄長途接送、高雄跨縣市接送、高雄長輩接送、高雄半日包車、楠梓長途接送、左營包車接送、高雄台南往返接送、高雄原車等候接送、高雄返鄉探親接送。此次沒有 Keyword Planner／GSC 實際查詢報告，也沒有「每月搜尋量」或排名保證。

初期只讓一個內容完整、服務真實的主頁承接相關意圖，不建立大量換地名的薄內容頁。未來有真實可承接路線、不同的實用資訊與需求證據，再建立獨立路線頁，不把相似頁當作導流跳板。FAQ 寫清接送、照護與車隊預約的差別。

技術已備妥 title、description、H1/H2、lang、OG、canonical、robots 與 sitemap endpoint。預設 `.invalid` 網址不輸出假 canonical、全站 noindex、sitemap 空白。管理與分析空殼永不加入 sitemap。確認獨立正式 origin 後，以 `STUDIO_SITE_URL` 建置；先審核實際資訊，再設 `STUDIO_INDEXABLE=true`，runtime 同步設定 indexable。服務頁 WebPage schema 不含假地址、評論、資格或報價；商家名稱未定稿前，不注入 LocalBusiness。實際上線確認後可加入適合實際經營型態的 TaxiService／LocalBusiness 與 Service schema，不能為了豐富結果補造必填資料。

靜態 HTML、無外部字型、無輪播與重型地圖、插畫 SVG、有 reduced-motion 及 44px 以上主要按鈕，減少前台負擔。但未取得真實流量的 CrUX／CWV；不可宣稱已達 LCP／INP／CLS 門檻。上線後以 PageSpeed Insights 和 GSC 實測，追查 LCP 圖文、CLS 與表單 INP。

## 30 天行動（正式上線核對完成後起算）

| 時間 | 工作 | 產出／衡量 |
|---|---|---|
| 第 1–3 天 | 核對車隊流程、運價、車型容量、真實公開名稱與個資窗口；補實車照片 | 可公開的事實清單、承接與拒單條件；不先花廣告費 |
| 第 4–7 天 | 核准託管方案；完成 HTTPS、備份復原、通知與假資料驗收，再開收單 | 用手機完成詢問→儲存→人工回覆；未完成前保持測試 |
| 第 8–10 天 | 建立／驗證獨立 GSC 網址資源（可用 URL-prefix 的 meta／HTML 檔案），提交 sitemap、檢查 canonical | 有效索引、查詢與頁面報告；不把提交視為已收錄 |
| 第 11–14 天 | 與既有客人／親友一對一介紹可服務情境；提供短網址或 QR，尊重意願 | 真實詢問理由、地區、人數／時數；只記匿名彙總 |
| 第 15–20 天 | 審閱 GSC 的實際曝光詞、LINE 及表單有效詢問；修正文案、FAQ 與容量說明 | 分開記錄候選詞、有曝光詞、有點擊詞、有有效詢單詞；不以點擊冒充訂單 |
| 第 21–25 天 | 若資格允許，準備 Google 商家檔案；FB／Threads 至多分享少量具體行程規劃經驗 | 不暴露客戶照片、時間路線或對話；不洗版、不買評論 |
| 第 26–30 天 | 檢查有效率、成交率、空車里程、總工時及貢獻利潤，調整可承接時段 | 看實際單筆成果；沒有數據就記「尚無資料」，樣本小不下排名或利潤結論 |

## Google 商家檔案

已查閱（2026-11-16）[Google 商家呈現規範](https://support.google.com/business/answer/3038177?hl=zh-Hant)。能與顧客面對面提供服務是重要資格基礎，但本案能否以單人駕駛獨立建檔、適用類別及車隊品牌限制仍須核對，不能視為已獲 Google 核准。

先確認真實對外品牌、營業模式及管理權，檢查是否已有重複檔案；確認服務區域型態及驗證資料。如不在住家接待顧客，依實際服務區域業務規則處理地址，不公開住址、不用虛擬辦公室冒充店面。名稱用實際品牌，不堆疊地名／關鍵字。填真實電話／網站、可提供服務的地區、時段、類別及照片，由業主完成驗證。不建立測試商家或假評論。

## GA4 與本站彙總

既有旅遊站 measurement ID `G-XW4LBK8PYF` 是從 repository source 確認，不等於檢查了 GA4 Admin 設定。建議接送工作室採**獨立資料串流**；若需要完全不同資料存取、保留與權限，再採獨立 property。此次沒有建立或修改任何 property／stream，也未從 Windsor 或 GA4 查實際成效。

| 事件 | 本版實作／真實觸發條件 |
|---|---|
| page_view | 公開首頁載入後的本站彙總；GA4 同意後才送 |
| line_click | 點擊實際 LINE 聯絡連結；點表單錨點不計 |
| inquiry_start | 本頁第一次編輯表單 |
| inquiry_submit | 伺服器成功交易寫入後；重試不重複計本站彙總 |
| phone_click | 僅設定真實電話時呈現並追蹤；目前沒有電話 |
| quote_request | 伺服器成功收到詢問後計數，非正式報價 |
| confirmed_booking | 管理員填寫合法預約依據，首次標記 booked／won 時原子計數；不接受公開事件 API 偽造 |

目前以上均有本站安全彙總邏輯；GA4 對外事件只有公開頁面的六種事件 adapter。confirmed_booking 目前**僅進內部彙總**，尚未對 GA4 發送；之後若核准 Measurement Protocol，後端可使用單獨的隨機匿名 client ID 與 outbox 去重，不把詢單 ID／聯絡資訊當成 GA client ID，不把 GA 與客戶身份連結。該串接需要另外審核第三方 API 與金鑰，未擅自啟用。

GA4 runtime 需 `gaId` 與 `analyticsApproved=true`，訪客仍須主動同意。Google 腳本只載入獨立空白 analytics iframe，接收 allowlist 事件與 source enum，不接觸表單 DOM。page_location 固定正式首頁、referrer 空白，沒有查詢字串／hash／行程內容。所有事件不含姓名、電話、LINE ID、詳細地址、備註或詢單 ID。獨立 stream 上線前還要關閉 Enhanced Measurement 的 form／outbound 自動蒐集、Google Signals、廣告個人化及使用者提供資料蒐集，驗收 DebugView 與 Network request payload；沒有實際 GA4 傳輸驗收，不宣稱 GA4 已完成上線。

來源只採 `utm_source` 的 direct／google／line／referral／social／other 白名單，不儲存任意 UTM、referrer 或完整 URL；屬單次頁面來源，無跨裝置／跨次歸因。站內彙總有 rate limit 但可遭垃圾互動污染，page_view 不是唯一訪客數。管理後台提供按來源的瀏覽、LINE 點擊、表單與首次合法預約；目前有效／成交用現存狀態，歷史轉換用去重事件，兩種口徑分開。訪客數等待實際 GA4 報表，不填造數字。
