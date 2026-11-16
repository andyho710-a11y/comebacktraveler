import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const html = name => readFileSync(new URL(`../dist/${name}`, import.meta.url), 'utf8');
for (const name of ['index.html', 'privacy.html', 'admin.html', 'analytics.html']) assert.match(html(name), /noindex, nofollow/, `${name} must stay private in the default build`);
assert.match(html('robots.txt'), /Disallow: \//);
assert.doesNotMatch(html('sitemap.xml'), /<loc>/);
assert.doesNotMatch(html('admin.html'), /synthetic-contact|自動測試稱呼|瀏覽器假資料驗收/);
assert.doesNotMatch(html('analytics.html'), /<form|name="contact"|line\.me/);
assert.match(html('index.html'), /尚非正式預約|不是正式預約/);
function scan(dir) { for (const file of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, file.name); if (file.isDirectory()) scan(path); else if (/\.(?:js|html|json)$/.test(path)) assert.doesNotMatch(readFileSync(path, 'utf8'), /adminHash|encryptionKey|BEGIN PRIVATE KEY|synthetic-browser-qa-password/, `Private config leaked in ${path}`); } }
scan(new URL('../dist/', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
console.log('Default build is noindex, has no customer data or runtime secrets, and isolates analytics from form markup.');
