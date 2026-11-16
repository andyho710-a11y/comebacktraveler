import { createServer } from 'node:http';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { STATUSES, SOURCES, validateInquiry, calculatePrice } from '../src/lib/domain.mjs';

export function hashPassword(password, salt = randomBytes(16).toString('hex')) { return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
function checkPassword(password, hash) {
  const [salt, expected] = hash.split(':');
  const actual = scryptSync(password, salt, 64), target = Buffer.from(expected, 'hex');
  return actual.length === target.length && timingSafeEqual(actual, target);
}
const sessionHash = value => createHash('sha256').update(value).digest('hex');
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const fail = (status, message) => Object.assign(Error(message), { status });
async function body(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] || '')) throw fail(415, '需要 JSON 格式。');
  const chunks = []; let size = 0;
  for await (const chunk of request) { size += chunk.length; if (size > 16384) throw fail(413, '表單資料過大。'); chunks.push(chunk); }
  try { const value = JSON.parse(Buffer.concat(chunks).toString()); if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(); return value; }
  catch { throw fail(400, '資料格式錯誤。'); }
}
function safeLine(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && ['line.me', 'lin.ee'].includes(url.hostname) && !url.username && !url.password && !url.search && !url.hash ? url.href : ''; } catch { return ''; }
}
export function createApp({ store, config, dist }) {
  const origin = new URL(config.origin).origin;
  const secure = origin.startsWith('https:');
  if (config.mode !== 'demo' && !secure) throw Error('Production requires HTTPS');
  if (config.mode !== 'demo' && config.enabled && (!config.operator || !config.privacyContact || !config.legalApproved)) throw Error('Confirm operator, privacy contact and operating rules before intake');
  const cookieName = secure ? '__Host-studio' : 'studio_demo';
  const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
  function admin(request) {
    const value = (request.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!value || !/^[a-f0-9]{64}$/.test(value)) throw fail(401, '請先登入管理後台。');
    const session = store.db.prepare('SELECT expires FROM sessions WHERE key=?').get(sessionHash(value));
    if (!session || session.expires <= Date.now()) throw fail(401, '登入已到期，請重新登入。');
    return value;
  }
  return createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    const analytics = config.analyticsApproved && /^G-[A-Z0-9]+$/.test(config.gaId || '');
    const analyticsDocument = req.url === '/analytics' || req.url === '/analytics.html';
    res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'${analytics && analyticsDocument ? ' https://www.googletagmanager.com' : ''}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'${analytics && analyticsDocument ? ' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com' : ''}; frame-ancestors ${analyticsDocument ? "'self'" : "'none'"}; base-uri 'none'; object-src 'none'; form-action 'self'`);
    if (analyticsDocument) res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    if (config.mode === 'demo' || !config.indexable || req.url?.startsWith('/admin') || req.url?.startsWith('/api') || analyticsDocument) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    try {
      const url = new URL(req.url, origin);
      if (req.headers.host !== new URL(origin).host) throw fail(403, '主機不符。');
      const path = url.pathname;
      if (path.startsWith('/api/')) {
        if (!store.rate(`all:${store.hash(req.socket.remoteAddress || '')}`, 300, 60000)) throw fail(429, '操作過於頻繁，請稍候。');
        if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) throw fail(405, '不支援此方法。');
        if (req.method !== 'GET' && (req.headers.origin !== origin || !['same-origin', 'none', undefined].includes(req.headers['sec-fetch-site']))) throw fail(403, '請從本站操作。');
        if (req.method === 'GET' && path === '/api/config') return json(res, 200, { enabled: !!config.enabled, demo: config.mode === 'demo', lineUrl: safeLine(config.lineUrl), lineId: /^[A-Za-z0-9._-]{4,20}$/.test(config.lineId || '') ? config.lineId : '', phone: /^\+886[0-9]{8,9}$/.test(config.phone || '') ? config.phone : '', operator: config.operator || '待確認', privacyContact: config.privacyContact || '待設定；目前僅供測試，請勿填入真實個資', retentionDays: config.retentionDays, gaId: analytics ? config.gaId : '' });
        if (req.method === 'POST' && path === '/api/inquiries') {
          if (!config.enabled) throw fail(503, '目前尚未開放正式收單。');
          const ipKey = store.hash(req.socket.remoteAddress || ''); // Only direct peer; forwarded headers are untrusted.
          if (!store.rate(`intake:${ipKey}`, 5, 3600000) || !store.rate('intake:global', 100, 3600000)) throw fail(429, '詢問次數已達上限，請稍後再試。');
          const key = req.headers['idempotency-key'];
          if (!uuid(key)) throw fail(400, '缺少安全重試識別碼。');
          let data; try { data = validateInquiry(await body(req)); } catch (error) { if (error.status) throw error; throw fail(400, error.message); }
          const result = store.persist(key, data);
          if (result.conflict) throw fail(409, '內容已變更，請開始新詢問。');
          return json(res, result.replay ? 200 : 201, { message: '已收到行程詢問，尚非預約成功。請等候人工聯繫。', id: result.id });
        }
        if (req.method === 'POST' && path === '/api/events') {
          const data = await body(req);
          if (Object.keys(data).some(key => !['event', 'source'].includes(key)) || !['page_view', 'line_click', 'inquiry_start', 'phone_click'].includes(data.event) || !SOURCES.includes(data.source)) throw fail(400, '事件格式錯誤。');
          if (!store.rate(`events:${store.hash(req.socket.remoteAddress || '')}`, 60, 3600000)) throw fail(429, '事件次數已達上限。');
          store.metric(data.event, data.source); return json(res, 200, { ok: true });
        }
        if (req.method === 'POST' && path === '/api/login') {
          if (!store.rate(`login:${store.hash(req.socket.remoteAddress || '')}`, 5, 900000) || !store.rate('login:global', 30, 900000)) throw fail(429, '登入嘗試過多，請 15 分鐘後再試。');
          const data = await body(req);
          if (typeof data.password !== 'string' || data.password.length > 256 || !checkPassword(data.password, config.adminHash)) throw fail(401, '登入資料不正確。');
          const token = randomBytes(32).toString('hex');
          store.db.prepare('INSERT INTO sessions VALUES(?,?)').run(sessionHash(token), Date.now() + 8 * 3600000);
          res.setHeader('Set-Cookie', `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure ? '; Secure' : ''}`);
          return json(res, 200, { ok: true });
        }
        admin(req);
        if (req.method === 'POST' && path === '/api/logout') {
          store.db.prepare('DELETE FROM sessions WHERE key=?').run(sessionHash(admin(req)));
          res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`);
          return json(res, 200, { ok: true });
        }
        if (req.method === 'GET' && path === '/api/admin/inquiries') return json(res, 200, { items: store.list() });
        if (req.method === 'GET' && path === '/api/admin/metrics') return json(res, 200, { events: store.db.prepare('SELECT * FROM metrics ORDER BY day DESC').all(), statuses: store.db.prepare('SELECT status,count(*) AS count FROM inquiries GROUP BY status').all(), visitors: null });
        const match = path.match(/^\/api\/admin\/inquiries\/([a-f0-9-]{36})$/);
        if (match && req.method === 'DELETE') { store.remove(match[1]); return json(res, 200, { ok: true }); }
        if (match && req.method === 'PATCH') {
          const data = await body(req);
          if (!STATUSES.includes(data.status) || !Number.isSafeInteger(data.version) || typeof data.bookingReference !== 'string' || data.bookingReference.length > 200) throw fail(400, '請檢查處理狀態。');
          let calculation = null;
          if (data.calculation !== null) {
            try { const input = data.calculation; if (typeof input.vehicle !== 'string' || input.vehicle.length > 100 || typeof input.fareConditions !== 'string' || input.fareConditions.length > 300 || typeof input.legalReviewed !== 'boolean') throw Error(); calculation = { input, result: calculatePrice(input) }; }
            catch { throw fail(400, '請檢查試算欄位。'); }
          }
          const result = store.update(match[1], data.version, data.status, calculation, data.bookingReference);
          if (result.conflict) throw fail(409, '資料已更新，請重新載入後再操作。');
          if (result.missing) throw fail(404, '查無詢單。');
          if (result.needsReference) throw fail(400, '請填寫已依法確認的預約紀錄依據，再標記預約或成交。');
          return json(res, 200, { ok: true });
        }
        throw fail(404, '找不到此功能。');
      }
      if (!['GET', 'HEAD'].includes(req.method)) throw fail(405, '不支援此方法。');
      let pathname; try { pathname = decodeURIComponent(path); } catch { throw fail(400, '無效網址。'); }
      if (pathname.includes('\\') || pathname.split('/').some(part => part.startsWith('.'))) throw fail(404, '找不到頁面。');
      const root = resolve(dist), relative = pathname === '/' ? 'index.html' : pathname.slice(1);
      let file = resolve(root, relative);
      if (!file.startsWith(root + sep)) throw fail(404, '找不到頁面。');
      if (!extname(file)) file += '.html';
      let buffer; try { if (!statSync(file).isFile()) throw Error(); buffer = readFileSync(file); } catch { throw fail(404, '找不到頁面。'); }
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };
      res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(req.method === 'HEAD' ? undefined : buffer);
    } catch (error) { if (!res.headersSent) json(res, error.status || 500, { error: error.status ? error.message : '目前無法處理，請稍後再試。' }); else res.end(); }
  });
}
