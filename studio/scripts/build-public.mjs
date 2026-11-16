import { readFileSync, rmSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { publicConfig } from '../src/lib/public-config.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
let contact = {};
if (!process.env.STUDIO_LINE_URL) contact = JSON.parse(readFileSync(new URL('../.runtime/config.json', import.meta.url), 'utf8'));
const env = { ...process.env, STUDIO_LAUNCH_MODE: 'line-only', STUDIO_INDEXABLE: 'true', STUDIO_LINE_URL: process.env.STUDIO_LINE_URL || contact.lineUrl, STUDIO_LINE_ID: process.env.STUDIO_LINE_ID || contact.lineId || '' };
const config = publicConfig(env);
const result = spawnSync(process.execPath, [resolve(root, 'node_modules/astro/bin/astro.mjs'), 'build', '--outDir', 'dist-public'], { cwd: root, env, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
const out = resolve(root, 'dist-public');
mkdirSync(new URL('../.runtime/', import.meta.url), { recursive: true, mode: 0o700 });
const keyPath = new URL('../.runtime/indexnow-key.txt', import.meta.url);
let indexKey;
try { indexKey = readFileSync(keyPath, 'utf8').trim(); }
catch { indexKey = randomBytes(16).toString('hex'); writeFileSync(keyPath, indexKey, { mode: 0o600 }); }
if (!/^[a-f0-9]{32}$/.test(indexKey)) throw Error('Invalid IndexNow verification file');
writeFileSync(join(out, `${indexKey}.txt`), indexKey);
for (const file of ['admin.html', 'analytics.html']) rmSync(join(out, file), { force: true });
// Neither private API, database, admin UI bundle nor optional analytics is published.
for (const file of readdirSync(join(out, '_astro'))) if (/^admin\.|^analytics-frame\./.test(file)) rmSync(join(out, '_astro', file));
writeFileSync(join(out, 'release.json'), JSON.stringify({ mode: 'line-only', site: config.site, date: new Date().toISOString().slice(0, 10), serverStorage: false, analytics: false }));
console.log('Public LINE-only build complete. No backend or credentials included.');
