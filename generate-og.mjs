import sharp from 'sharp';

const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#faf8f3"/>
      <stop offset="100%" stop-color="#f2ede0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Left accent bar -->
  <rect x="0" y="0" width="12" height="630" fill="#c0392b"/>

  <!-- Top border line -->
  <rect x="12" y="0" width="1188" height="4" fill="#1a1208"/>

  <!-- Bottom border line -->
  <rect x="12" y="626" width="1188" height="4" fill="#1a1208"/>

  <!-- Decorative dot grid (top right) -->
  <g opacity="0.08">
    ${Array.from({length: 6}, (_, row) =>
      Array.from({length: 10}, (_, col) =>
        `<circle cx="${850 + col * 36}" cy="${60 + row * 36}" r="3" fill="#1a1208"/>`
      ).join('')
    ).join('')}
  </g>

  <!-- Category tag -->
  <rect x="80" y="72" width="8" height="36" fill="#c0392b" rx="2"/>
  <text x="104" y="97" font-family="serif" font-size="22" fill="#c0392b" letter-spacing="4">出國上網 · eSIM 攻略</text>

  <!-- Main title line 1 -->
  <text x="80" y="210" font-family="serif" font-size="82" font-weight="900" fill="#1a1208">出國 eSIM</text>

  <!-- Main title line 2 -->
  <text x="80" y="310" font-family="serif" font-size="82" font-weight="900" fill="#1a1208">怎麼選？</text>

  <!-- Subtitle -->
  <text x="80" y="388" font-family="sans-serif" font-size="34" fill="#4a3f2f">住越南 10 年的台灣人，幫你整理好了</text>

  <!-- Divider -->
  <rect x="80" y="430" width="1040" height="1.5" fill="#d4c9b0"/>

  <!-- Brand tags row -->
  <rect x="80" y="460" width="130" height="40" rx="20" fill="#1a1208"/>
  <text x="145" y="487" font-family="sans-serif" font-size="20" fill="#faf8f3" text-anchor="middle">JOYTEL</text>

  <rect x="228" y="460" width="90" height="40" rx="20" fill="#1a1208"/>
  <text x="273" y="487" font-family="sans-serif" font-size="20" fill="#faf8f3" text-anchor="middle">DJB</text>

  <rect x="336" y="460" width="100" height="40" rx="20" fill="#1a1208"/>
  <text x="386" y="487" font-family="sans-serif" font-size="20" fill="#faf8f3" text-anchor="middle">Klook</text>

  <rect x="454" y="460" width="110" height="40" rx="20" fill="#1a1208"/>
  <text x="509" y="487" font-family="sans-serif" font-size="20" fill="#faf8f3" text-anchor="middle">KKday</text>

  <rect x="582" y="460" width="140" height="40" rx="20" fill="#1a1208"/>
  <text x="652" y="487" font-family="sans-serif" font-size="20" fill="#faf8f3" text-anchor="middle">WaySim</text>

  <rect x="740" y="460" width="110" height="40" rx="20" fill="#1a1208"/>
  <text x="795" y="487" font-family="sans-serif" font-size="20" fill="#faf8f3" text-anchor="middle">Airalo</text>

  <!-- 6 brands badge -->
  <text x="920" y="487" font-family="sans-serif" font-size="22" fill="#4a3f2f">共 6 家完整比較</text>

  <!-- Author area -->
  <circle cx="112" cy="569" r="28" fill="#1a1208"/>
  <text x="112" y="578" font-family="serif" font-size="22" font-weight="900" fill="#faf8f3" text-anchor="middle">旅</text>
  <text x="156" y="560" font-family="sans-serif" font-size="22" font-weight="600" fill="#1a1208">重來的旅人</text>
  <text x="156" y="586" font-family="sans-serif" font-size="18" fill="#4a3f2f">越南住了 10 年，現在重新出發</text>

  <!-- Site URL -->
  <text x="1120" y="586" font-family="sans-serif" font-size="17" fill="#888" text-anchor="end">cerulean-pie-07bb29.netlify.app</text>
</svg>`;

await sharp(Buffer.from(svg))
  .resize(1200, 630)
  .jpeg({ quality: 92 })
  .toFile('./public/esim-cover.jpg');

console.log('OG image generated: public/esim-cover.jpg');
