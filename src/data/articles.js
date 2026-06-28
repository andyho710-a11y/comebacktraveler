// 全站文章的單一資料來源（single source of truth）。
// 首頁 (index.astro) 與 RSS feed (rss.xml.js) 皆從這裡取用，避免兩邊各自維護而漂移。
// 新增文章時：在對應陣列加一筆，並填上 pubDate（發布日，格式 YYYY-MM-DD）。
//
// 網站定位：久久才出國一次的小資旅人「出國準備與避坑筆記」。
// 首頁順序以「出國前準備」為主軸，eSIM／上網方案只是其中一項，不再當主角。

// 出國前準備（首頁第一主軸）：行李、必備小物、打包、女生必帶。
export const prepArticles = [
  {
    tag: '出國準備 · 行李清單',
    title: '第一次出國行李清單：久久才出國一次的人不要漏帶',
    desc: '久久才飛一次最容易出包。住越南十年、進出機場上百次的過來人，把出發前要確認的事、文件、3C、衣物、藥品、安全用品整理成一份不漏帶的清單。',
    href: '/first-trip-packing-list',
    label: '看完整行李清單 →',
    pubDate: '2026-06-23',
  },
  {
    tag: '越南旅遊好物 2026',
    title: '越南旅遊必備小物推薦｜住越南十年，我推薦你帶這幾樣',
    desc: '第一次去越南該帶什麼？從炎熱天氣、220V 電壓到飛車搶劫的角度，幫你篩出防曬、防蚊、充電器、防盜包，出發前一次備齊不踩雷。',
    href: '/vietnam-travel-essentials',
    label: '看必備小物整理 →',
    pubDate: '2026-06-02',
  },
  {
    tag: '越南行李清單 2026',
    title: '越南自由行行李清單｜住越南十年，教你帶多少、怎麼裝、什麼上手提',
    desc: '越南自由行行李怎麼打包？住越南十年的過來人，從帶多少、怎麼裝箱、手提行李 vs 託運怎麼分，整理出一份不超重、不漏帶、不被海關卡的越南行李清單。',
    href: '/vietnam-packing-list',
    label: '看行李清單 →',
    pubDate: '2026-06-12',
  },
  {
    tag: '越南女生旅行 2026',
    title: '越南女生旅行必帶物品｜住越南十年，這幾樣沒帶你會後悔',
    desc: '越南女生旅行要帶什麼？住越南十年的在地人整理：防曬、防蚊、私密處護理、安全防身、美妝保養，哪些台灣帶、哪些當地買，一篇說清楚。',
    href: '/vietnam-girls-packing',
    label: '看女生必帶清單 →',
    pubDate: '2026-06-13',
  },
  {
    tag: '越南防蚊準備 2026',
    title: '越南防蚊用品怎麼準備？住越南十年的在地經驗整理',
    desc: '去越南怕被蚊子叮、又擔心登革熱？Picaridin 與 DEET 差在哪、防蚊貼能不能當主力、不同行程與不同人怎麼搭配，住越南十年的在地經驗一次整理。',
    href: '/vietnam-mosquito-repellent-guide',
    label: '看防蚊準備 →',
    pubDate: '2026-06-15',
  },
];

// 旅遊攻略與越南避坑筆記（首頁第二區塊）。
export const travelArticles = [
  {
    tag: '越南旅遊 2026',
    title: '越南旅遊省時攻略：帶小孩出國不崩潰！',
    desc: '海關排隊 40 分鐘、小孩餓到抗議——住過越南十年的過來人，告訴你快速通關和上網怎麼準備。',
    href: '/vietnam-guide',
    label: '看越南旅遊攻略 →',
    pubDate: '2026-04-28',
  },
  {
    tag: '越南交通攻略 2026',
    title: '越南叫車 App 怎麼選？Grab、Be、Xanh SM 在地比較',
    desc: '住越南十年的在地建議——三大叫車 App 該裝哪幾個、各自優缺點，加上機場被坑 50 萬越盾的避雷指南。',
    href: '/vietnam-taxi-app-guide',
    label: '看叫車 App 攻略 →',
    pubDate: '2026-05-29',
  },
  {
    tag: '越南機場貴賓室 2026',
    title: '新山一機場免費貴賓室｜JCB 白金卡進 Rose Lounge',
    desc: '搭廉航也能享商務艙待遇。資格、位置、餐飲、踩雷重點一次說清楚，出發前 5 分鐘看完直接走人。',
    href: '/vietnam-jcb-lounge',
    label: '看貴賓室攻略 →',
    pubDate: '2026-05-04',
  },
  {
    tag: '越南親子旅遊 2026',
    title: '帶女兒第一次回越南：The Mira 五星飯店 + 5 Ri 5 在地海鮮店',
    desc: '住越南十年的台灣爸爸帶女兒回胡志明市——五星飯店配當地人才會去的熱炒店，「住高檔、吃在地」的親子旅遊心法。',
    href: '/kids-travel-guide',
    label: '看親子旅遊紀錄 →',
    pubDate: '2026-05-09',
  },
  {
    tag: '越南親子旅遊 2026',
    title: 'The Amazing Bay 神奇海灣水樂園｜越南最大水樂園親子實戰',
    desc: '邊和市最大水樂園就在 The Mira 飯店附近——老婆帶女兒和親戚去玩了一整天，現場買票才知道台灣 Klook 訂便宜一半。',
    href: '/kids-travel-amazing-bay',
    label: '看水樂園紀錄 →',
    pubDate: '2026-05-10',
  },
  {
    tag: '越南夫妻散策 2026',
    title: '回越南最後一晚的胡志明夜遊：紅教堂、中央郵政、Cộng Cà Phê',
    desc: '把女兒交給外婆，夫妻夜遊胡志明市區。紅教堂與郵政都關門，只看外觀；最後落腳一家「客房普通、頂樓景觀有救」的飯店。',
    href: '/saigon-couple-walk',
    label: '看夫妻夜遊紀錄 →',
    pubDate: '2026-05-10',
  },
  {
    tag: '日本自由行 2026',
    title: '日本自由行行程規劃｜東京、京都、大阪',
    desc: '東京必去景點、京都季節限定活動、大阪美食整理，搭配 Klook 提前預訂，省錢又省時。',
    href: '/japan-guide',
    label: '看日本行程攻略 →',
    pubDate: '2026-04-26',
  },
  {
    tag: '韓國自由行 2026',
    title: '韓國自由行行程規劃｜首爾、釜山完整攻略',
    desc: '首爾景福宮、弘大購物、釜山海雲台，Klook 行程搶先預訂，現場排隊少一小時。',
    href: '/korea-guide',
    label: '看韓國行程攻略 →',
    pubDate: '2026-04-26',
  },
  {
    tag: '高鐵省錢攻略',
    title: '高鐵怎麼買最便宜？2026 商務通勤族省錢攻略',
    desc: '定期票、早鳥、KKday 晚鳥票完整比較，依你的搭乘頻率找最對的方案，一年省下 8,000 元以上。',
    href: '/thsr-guide',
    label: '看高鐵省錢攻略 →',
    pubDate: '2026-04-26',
  },
  {
    tag: '關於這個人',
    title: '從越南副總到 Uber 司機：重新出發的故事',
    desc: '越南工廠十年、養蝦失敗、跑 Uber、父親離世——那些跌跤的歲月，才是真正的養分。',
    href: '/story',
    label: '看作者的故事 →',
    pubDate: '2026-04-26',
  },
];

// 出國上網 eSIM／方案（首頁後段，屬「出國準備」的一項，非主角）。
// 提醒：eSIM 內容皆為依官方規格與使用情境整理，非每項親自實測，文案避免「實測／評測／只推」等字眼。
export const esimArticles = [
  {
    tag: 'eSIM 選購整理',
    title: '出國 eSIM 怎麼選？六家品牌完整比較',
    desc: '把 JOYTEL、DJB、Klook、Airalo 等六家整理成一張表。5 分鐘做決定，不用再 Google 到天亮。',
    href: '/esim',
    label: '看比較表 →',
    pubDate: '2026-04-18',
  },
  {
    tag: '出國上網懶人包',
    title: 'eSIM、WiFi 機、漫遊該選哪個？一篇看懂',
    desc: '第一次出國不知道網路怎麼辦？三種上網方案的優缺點、適合誰、怎麼省，過來人用最白話的方式一次講清楚，出國前看完不再踩雷。',
    href: '/esim/overseas-internet-guide',
    label: '看三種方案比較 →',
    pubDate: '2026-05-31',
  },
  {
    tag: '日本 eSIM 2026',
    title: '日本 eSIM 怎麼選 2026｜新手選購整理（兩張比較）',
    desc: '原生線路 vs 漫遊線路差在哪？哪家有中文客服？依官方規格與使用情境，幫新手把選擇縮到最小。',
    href: '/esim/japan',
    label: '看日本選購整理 →',
    pubDate: '2026-04-20',
  },
  {
    tag: '韓國 eSIM 2026',
    title: '韓國 eSIM 怎麼選 2026｜新手選購整理（兩張比較）',
    desc: 'SKT 原生線路、Naver Map 導航都能跑，搭配中文 LINE 客服，首爾到濟州都不怕斷線。',
    href: '/esim/korea',
    label: '看韓國選購整理 →',
    pubDate: '2026-04-20',
  },
  {
    tag: 'eSIM 安裝教學',
    title: 'eSIM 怎麼安裝？iPhone + Android 圖解',
    desc: '收到 QR Code 之後卡關了？iPhone、三星 Galaxy、Google Pixel 的設定路徑全圖解，5 分鐘搞定。',
    href: '/esim/install',
    label: '看安裝步驟 →',
    pubDate: '2026-04-22',
  },
  {
    tag: 'JOYTEL 選購整理',
    title: 'JOYTEL eSIM 選購整理 2026｜原生線路、客服比較',
    desc: '依官方規格與用戶回饋彙整：日韓原生線路速率、LINE 中文客服回應時間、與 DJB、WaySim 完整比較表。',
    href: '/esim/joytel',
    label: '看 JOYTEL 選購整理 →',
    pubDate: '2026-04-25',
  },
  {
    tag: 'eSIM 問題排解',
    title: 'eSIM 設定失敗怎麼辦？10 個常見問題解法',
    desc: 'QR Code 掃不到、安裝失敗、有訊號沒網路、APN 設定錯誤——10 個問題逐一解法，一篇全搞定。',
    href: '/esim/troubleshoot',
    label: '看問題解法 →',
    pubDate: '2026-04-25',
  },
  {
    tag: '中國大陸上網',
    title: '去中國大陸用 eSIM｜GFW 封鎖哪些 App？',
    desc: '去大陸一定要選「免翻牆」eSIM，否則 LINE、Google、IG 全不能用。大陸線路選擇、防火長城封鎖 App 清單、出發前準備清單，全整理好了。',
    href: '/esim/china',
    label: '看大陸上網攻略 →',
    pubDate: '2026-04-25',
  },
  {
    tag: 'eSIM 資安爭議',
    title: '2026 eSIM 還能買嗎？「封包送中」爭議解析',
    desc: '便宜 eSIM 封包繞道中國？改 APN 切新加坡真的有用嗎？住國外十年的過來人帶你看懂這波在吵什麼，教你自己判斷手上的 eSIM 安不安全。',
    href: '/esim/china-routing-2026',
    label: '看資安爭議解析 →',
    pubDate: '2026-05-31',
  },
  {
    tag: '越南上網 2026',
    title: '胡志明市機場 SIM 卡值得買嗎？新山一機場上網建議',
    desc: '剛下飛機到底要不要現場買 SIM 卡？住越南十年的過來人，幫你比較機場買、線上 eSIM、實體 SIM 的差異。',
    href: '/esim/saigon-airport-sim',
    label: '看機場 SIM 卡建議 →',
    pubDate: '2026-06-09',
  },
];

// 人生筆記：中年重新出發的觀點與體悟。零導購的個人原創內容。
export const lifeArticles = [
  {
    tag: '人生重來',
    title: '人生不是一次選對，而是不斷修正：我從 Naval 學到的 5 個重來提醒',
    desc: '重新開始不可怕，可怕的是明知道方向不對，卻因為面子、習慣和分心一直停在原地。從 Naval Ravikant 整理的 5 個提醒：選擇、驕傲、疊代、靈感與注意力。',
    href: '/life-restart-naval',
    label: '看這篇人生筆記 →',
    pubDate: '2026-06-16',
  },
];

// 草稿／暫時隱藏：頁面仍存在，但不收錄於首頁、RSS、sitemap（並在頁面加 noindex）。
// 想重新公開時，把這筆移回 lifeArticles 即可。
export const draftArticles = [
  {
    tag: '人生筆記 · 心理健康',
    title: '為了喝一杯水，我要先把世界擦乾淨',
    desc: '一段我與強迫症（OCD）共處、還沒走出來的誠實紀錄——為了喝一杯水，得先把桌子、環境、身體都擦乾淨。寫給同樣被強迫、潔癖與罪咎感困住的你。',
    href: '/drink-a-glass-of-water',
    label: '看這篇紀錄 →',
    pubDate: '2026-06-21',
  },
];

// 全站文章（含未上首頁者）。RSS 用此清單。
export const allArticles = [...prepArticles, ...travelArticles, ...esimArticles, ...lifeArticles];
