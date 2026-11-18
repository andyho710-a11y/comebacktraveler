import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
const root = resolve('dist-public');
const release = JSON.parse(readFileSync(join(root, 'release.json'), 'utf8'));
const expected = process.env.STUDIO_EXPECTED_ORIGIN || 'https://kaohsiung-safe-transfer.web.app';
assert.equal(release.site, expected); assert.equal(release.mode, 'line-only'); assert.equal(release.serverStorage, false);
const paths = ['', 'privacy', 'cross-county', 'senior-round-trip', 'half-day-charter'];
for (const path of paths) {
  const html = readFileSync(join(root, path ? `${path}.html` : 'index.html'), 'utf8');
  assert.match(html, /index, follow/); assert.ok(!new RegExp('noindex|/admin|展示與測試版|官方帳號待設定').test(html), path + ': public page contains draft/private markup');
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.ok(html.includes(`rel="canonical" href="${expected}/${path}"`));
  assert.ok(html.includes(`property="og:image" content="${expected}/share.png"`));
  const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s); assert.ok(json); assert.ok(JSON.parse(json[1])['@graph']);
}
assert.equal(existsSync(join(root, 'admin.html')), false); assert.equal(existsSync(join(root, 'analytics.html')), false);
const index = readFileSync(join(root, 'index.html'), 'utf8');
const pricing = JSON.parse(readFileSync('src/data/pricing.json', 'utf8'));
for (const plan of pricing.packages) assert.ok(index.includes(plan.price.toLocaleString('en-US')), 'Missing published price');
assert.ok(index.includes('2 小時 $800 起，交通另計'));
assert.ok(index.includes('試營運優惠'));
assert.doesNotMatch(index, /LINE\s*GO|linego\.me|相較|基本價少|省\s*\$/i);
assert.doesNotMatch(index, /無醫療、長照特約、陪診或/);
assert.match(index, /data-launch-mode="line-only"/); assert.match(index, /網站不儲存行程資料|網站不儲存/);
const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8'); assert.equal((sitemap.match(/<loc>/g) || []).length, 5);
for (const path of paths) assert.ok(sitemap.includes(`${expected}/${path}`));
const robots = readFileSync(join(root, 'robots.txt'), 'utf8'); assert.match(robots, /OAI-SearchBot\nAllow: \//); assert.match(robots, /GPTBot\nDisallow: \//);
for (const file of readdirSync(join(root, '_astro'))) { assert.doesNotMatch(file, /^admin\.|^analytics-frame\./); }
function scan(dir) { for (const entry of readdirSync(dir, { withFileTypes: true })) { const file = join(dir, entry.name); if (entry.isDirectory()) scan(file); else if (/\.(html|js|json)$/.test(file)) assert.doesNotMatch(readFileSync(file, 'utf8'), /adminHash|encryptionKey|BEGIN PRIVATE KEY|synthetic-browser-qa-password/, `Private data in ${file}`); } }
scan(root);
const hosting = JSON.parse(readFileSync('firebase.public.json')).hosting;
assert.equal(hosting.site, 'kaohsiung-safe-transfer'); assert.equal(hosting.public, 'dist-public'); assert.equal(hosting.rewrites, undefined);
assert.ok(hosting.headers[0].headers.find(item => item.key === 'Content-Security-Policy').value.includes("connect-src 'none'"));
console.log('Public release passed: five indexable pages, canonical/OG/schema, no admin/backend/secrets, and no form/network collection.');
