export interface ShoppingGuide {
  id: string;
  category: string;
  choice: string;
  shortAnswer: string;
  bestFor: string;
  skipWhen: string;
  checkBeforeBuying: string;
  guideHref: string;
  guideLabel: string;
}

export const shoppingGuides: ShoppingGuide[] = [
  {
    id: 'esim',
    category: '旅行網路',
    choice: '依目的地與天數選 eSIM',
    shortAnswer: '先確認手機支援 eSIM，再比較原生線路、流量、天數與是否需要分享熱點。',
    bestFor: '想在出發前完成設定、落地後直接連線的人。',
    skipWhen: '手機不支援 eSIM，或同行多人更適合共用 Wi-Fi。',
    checkBeforeBuying: '手機型號、使用天數、每日流量、熱點限制與客服方式。',
    guideHref: '/esim',
    guideLabel: '查看 eSIM 比較',
  },
  {
    id: 'sunscreen',
    category: '防曬',
    choice: 'SPF50+、PA++++ 的耐汗防曬',
    shortAnswer: '越南日照強、步行時間長，先看防護等級與耐汗性，再依膚質挑清爽或保濕質地。',
    bestFor: '城市步行、海邊、水樂園與長時間戶外行程。',
    skipWhen: '家中已有未過期、膚況適合且用量足夠的防曬。',
    checkBeforeBuying: '容量、補擦方式、臉部或身體用途，以及是否容易泛白。',
    guideHref: '/vietnam-travel-essentials',
    guideLabel: '查看越南用品決策',
  },
  {
    id: 'mosquito',
    category: '防蚊',
    choice: 'Picaridin 或 DEET 防蚊液',
    shortAnswer: '一般城市與親子行程可先看 Picaridin；雨季、郊區或蚊蟲密集行程再評估 DEET。',
    bestFor: '雨季、郊區、戶外餐廳、民宿與有孩童同行的行程。',
    skipWhen: '全程住高樓飯店、主要在室內活動，且已有合用的防蚊用品。',
    checkBeforeBuying: '有效成分、濃度、適用年齡、補擦間隔與使用禁忌。',
    guideHref: '/vietnam-mosquito-repellent',
    guideLabel: '比較 Picaridin 與 DEET',
  },
  {
    id: 'charger',
    category: '充電',
    choice: '65W 多孔 GaN 充電器',
    shortAnswer: '手機、平板與輕薄筆電一起帶時，一顆多孔充電器通常比帶三顆原廠充電頭更省空間。',
    bestFor: '同時攜帶兩種以上 3C 裝置、需要減少行李重量的人。',
    skipWhen: '只帶一支手機，現有充電器已支援所需快充規格。',
    checkBeforeBuying: '總輸出功率、單孔功率、插頭規格、安規標示與是否附合適線材。',
    guideHref: '/vietnam-travel-essentials',
    guideLabel: '查看旅行充電建議',
  },
  {
    id: 'anti-theft-bag',
    category: '隨身收納',
    choice: '可貼身、拉鍊可固定的斜背包',
    shortAnswer: '重點不是「防盜」兩個字，而是包體能貼身、主袋不朝外、拉鍊不會輕易被拉開。',
    bestFor: '市場、夜市、大眾運輸與人潮密集景點。',
    skipWhen: '已有尺寸合適、可貼身背且開口安全的隨身包。',
    checkBeforeBuying: '背帶固定方式、拉鍊位置、容量、重量與護照收納層。',
    guideHref: '/anti-theft-crossbody-bag-guide',
    guideLabel: '查看防盜斜背包完整指南',
  },
  {
    id: 'packing',
    category: '行李整理',
    choice: '收納方塊與行李秤',
    shortAnswer: '收納方塊解決分類問題，行李秤解決回程超重問題；不需要為了整齊買滿一整套。',
    bestFor: '多城市移動、親子行李、廉航或回程會購物的人。',
    skipWhen: '短程輕裝、固定住同一間飯店，且行李本來就能清楚分類。',
    checkBeforeBuying: '行李箱尺寸、收納袋重量、拉鍊耐用度與秤重上限。',
    guideHref: '/vietnam-packing-list',
    guideLabel: '查看越南打包清單',
  },
];
