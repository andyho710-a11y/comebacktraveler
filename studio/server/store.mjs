import { DatabaseSync } from 'node:sqlite';
import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class Store {
  constructor(path, key) {
    this.key = Buffer.from(key, 'hex');
    if (this.key.length !== 32) throw Error('A 32-byte encryption key is required');
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    if (path !== ':memory:') chmodSync(path, 0o600);
    this.db.exec(`PRAGMA journal_mode=DELETE; PRAGMA secure_delete=ON;
      CREATE TABLE IF NOT EXISTS inquiries(id TEXT PRIMARY KEY, payload TEXT NOT NULL, status TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 1, confirmed INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS receipts(key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, inquiry TEXT NOT NULL REFERENCES inquiries(id));
      CREATE TABLE IF NOT EXISTS rates(key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(key TEXT PRIMARY KEY, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS metrics(day TEXT NOT NULL, event TEXT NOT NULL, source TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(day,event,source));
      PRAGMA foreign_keys=ON;`);
  }
  hash(value) { return createHmac('sha256', this.key).update(value).digest('hex'); }
  encrypt(data, id) {
    const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(id));
    const body = Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]);
    return [iv, cipher.getAuthTag(), body].map(part => part.toString('base64')).join('.');
  }
  decrypt(value, id) {
    const [iv, tag, body] = value.split('.').map(part => Buffer.from(part, 'base64'));
    const cipher = createDecipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(id)); cipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([cipher.update(body), cipher.final()]).toString());
  }
  transaction(fn) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  rate(key, limit, duration, now = Date.now()) {
    return this.transaction(() => {
      this.db.prepare('DELETE FROM rates WHERE reset < ?').run(now);
      const row = this.db.prepare('SELECT * FROM rates WHERE key=?').get(key);
      if (row && row.reset > now && row.count >= limit) return false;
      this.db.prepare('INSERT INTO rates VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET count=excluded.count,reset=excluded.reset').run(key, row && row.reset > now ? row.count + 1 : 1, row && row.reset > now ? row.reset : now + duration);
      return true;
    });
  }
  metric(event, source, now = Date.now()) {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
    this.db.prepare('INSERT INTO metrics VALUES(?,?,?,1) ON CONFLICT(day,event,source) DO UPDATE SET count=count+1').run(day, event, source);
  }
  persist(key, data, now = Date.now()) {
    return this.transaction(() => {
      const fingerprint = this.hash(JSON.stringify(data));
      const previous = this.db.prepare('SELECT * FROM receipts WHERE key=?').get(key);
      if (previous) {
        if (previous.fingerprint !== fingerprint) return { conflict: true };
        return { id: previous.inquiry, replay: true };
      }
      const id = randomUUID();
      this.db.prepare('INSERT INTO inquiries(id,payload,status,created,updated) VALUES(?,?,?,?,?)').run(id, this.encrypt({ ...data, consentEvidence: { version: '2026-11-16-v1', acceptedAt: now }, calculation: null, bookingReference: '' }, id), 'new', now, now);
      this.db.prepare('INSERT INTO receipts VALUES(?,?,?)').run(key, fingerprint, id);
      this.metric('inquiry_submit', data.source, now);
      this.metric('quote_request', data.source, now);
      return { id, replay: false };
    });
  }
  list() {
    return this.db.prepare('SELECT * FROM inquiries ORDER BY created DESC LIMIT 1000').all().map(({ payload, ...row }) => ({ ...row, ...this.decrypt(payload, row.id) }));
  }
  update(id, version, status, calculation, bookingReference, now = Date.now()) {
    return this.transaction(() => {
      const row = this.db.prepare('SELECT * FROM inquiries WHERE id=?').get(id);
      if (!row) return { missing: true };
      if (row.version !== version) return { conflict: true };
      const data = this.decrypt(row.payload, id);
      const firstConfirmation = ['booked', 'won'].includes(status) && !row.confirmed;
      if (['booked', 'won'].includes(status) && !bookingReference.trim()) return { needsReference: true };
      const payload = this.encrypt({ ...data, calculation, bookingReference }, id);
      this.db.prepare('UPDATE inquiries SET payload=?,status=?,updated=?,version=version+1,confirmed=? WHERE id=?').run(payload, status, now, firstConfirmation ? 1 : row.confirmed, id);
      if (firstConfirmation) this.metric('confirmed_booking', data.source, now);
      return { ok: true };
    });
  }
  remove(id) {
    return this.transaction(() => {
      this.db.prepare('DELETE FROM receipts WHERE inquiry=?').run(id);
      this.db.prepare('DELETE FROM inquiries WHERE id=?').run(id);
    });
  }
  purge(days, now = Date.now()) {
    return this.transaction(() => {
      const cutoff = now - days * 86400000;
      this.db.prepare('DELETE FROM receipts WHERE inquiry IN (SELECT id FROM inquiries WHERE created < ?)').run(cutoff);
      const count = this.db.prepare('DELETE FROM inquiries WHERE created < ?').run(cutoff).changes;
      this.db.prepare('DELETE FROM sessions WHERE expires < ?').run(now);
      this.db.prepare('DELETE FROM rates WHERE reset < ?').run(now);
      this.db.prepare("DELETE FROM metrics WHERE day < ?").run(new Date(now - 400 * 86400000).toISOString().slice(0, 10));
      return count;
    });
  }
  close() { this.db.close(); }
}
