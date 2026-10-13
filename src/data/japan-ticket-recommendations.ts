// Owner-approved URLs: preserve every character, including the nested encoded target.
export const japanTicketGroups = [
  { title: '大阪／USJ', offers: [
    { key: 'usj-entry', title: 'USJ 日本環球影城入場門票', description: '先買入園門票，再依行程考慮是否需要快速通關。', label: '查看 USJ 入場門票', category: 'theme-park-ticket', destination: 'osaka', url: 'https://afflnk.site/track/clicks/3731/c627c2bc9b0126def183ec23d62e9e45216d49ce63b2a0f90467b10471401de3c021e7e5593c99616c?t=https%253A%252F%252Fwww.klook.com%252Fzh-TW%252Factivity%252F46604-universal-studios-japan-e-ticket-osaka-qr-code-direct-entry%252F%253Futm_source%253Dchatgpt.com%2526dd_referrer%253D' },
    { key: 'usj-express', title: 'USJ Express Pass 快速通關', description: '想少排熱門設施，再看快速通關。', warning: 'Express Pass 快速通關不等於 USJ 入場門票，購買前請確認是否仍需另備入園券。', label: '查看 USJ 快速通關', category: 'theme-park-express', destination: 'osaka', url: 'https://affckr.site/track/clicks/3731/c627c2bc9b0126def183ec23d62e9e45216d49ce63b2a0f90467b10471401de3c021e7e5593c99616c?t=https%253A%252F%252Fwww.klook.com%252Fzh-TW%252Factivity%252F3407-universal-studios-japan-express-pass-osaka%252F%253Futm_source%253Dchatgpt.com' },
  ] },
  { title: '東京熱門景點', offers: [
    { key: 'tokyo-disney', title: '東京迪士尼樂園／DisneySea 一日護照', description: '安排東京迪士尼行程時，先查看樂園與日期選項。', label: '查看東京迪士尼門票', category: 'theme-park-ticket', destination: 'tokyo', url: 'https://aftck.com/track/clicks/3731/c627c2bc9b0126def183ec23d62e9e45216d49ce63b2a0f90467b10471401de3c021e7e5593c99616c?t=https%253A%252F%252Fwww.klook.com%252Fzh-TW%252Factivity%252F695-tokyo-disney-resort-1-day-pass-tokyo%252F%253Futm_source%253Dchatgpt.com' },
    { key: 'shibuya-sky', title: 'SHIBUYA SKY', description: '想排熱門時段／夕陽時段的人，可提前查看方案與可售日期。', label: '查看 SHIBUYA SKY 門票', category: 'attraction-ticket', destination: 'tokyo', url: 'https://twcouponcenter.com/track/clicks/3731/c627c2bc9b0126def183ec23d62e9e45216d49ce63b2a0f90467b10471401de3c021e7e5593c99616c?t=https%253A%252F%252Fwww.klook.com%252Fzh-TW%252Factivity%252F70672-shibuya-sky-tokyo%252F%253Futm_source%253Dchatgpt.com' },
  ] },
  { title: '關西交通', offers: [
    { key: 'haruka', title: 'JR HARUKA 關西機場特快', description: '關西機場往大阪／京都的交通選項，依住宿位置查看路線與方案。', label: '查看 HARUKA 車票', category: 'airport-transport', destination: 'kansai', url: 'https://affckr.site/track/clicks/3731/c627c2bc9b0126def183ec23d62e9e45216d49ce63b2a0f90467b10471401de3c021e7e5593c99616c?t=https%253A%252F%252Fwww.klook.com%252Fzh-TW%252Factivity%252F18400-jr-haruka-airport-express-train-tickets-osaka%252F%253Futm_source%253Dchatgpt.com' },
  ] },
] as const;
