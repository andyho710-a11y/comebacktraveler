import { readIntake, serializeRFQ, submissionEnvelope } from '../lib/src/lib/vietnam-sourcing/rfq.js';
import { IP_REQUEST_LIMIT, GLOBAL_REQUEST_LIMIT, RATE_WINDOW_MS } from '../lib/functions/src/service.js';
export function validEnvelope() {
  const data = new FormData();
  for (const [key, value] of Object.entries({ company_name: 'QA fictitious company', contact_name: 'QA fictitious buyer', email: 'qa@example.com', phone: '+886 900000000', product_name: 'QA test product', specifications: 'QA nonconfidential specification', quantity: '100 units', product_category: 'other', frequency: 'once', oem: 'no', odm: 'no', private_label: 'no', existing_supplier_status: 'none', consent: 'yes' })) data.set(key, value);
  data.append('services_requested', 'supplier_search');
  return submissionEnvelope(serializeRFQ(readIntake(data), '?utm_source=qa'));
}
export function request(body = validEnvelope(), overrides = {}) {
  return { method: 'POST', origin: 'http://localhost:5000', contentType: 'application/json', clientIp: '192.0.2.1', idempotencyKey: body.submission_id, rawBody: Buffer.from(JSON.stringify(body)), ...overrides };
}
export class MemoryStore {
  records = new Map(); receipts = new Map(); counters = new Map(); fail = false;
  async consumeRate(client, now) {
    if (this.fail) throw new Error('secret database stack');
    const keys = [client, 'global']; const counts = keys.map(key => { const counter = this.counters.get(key); return counter && counter.reset_at > now ? counter : { count: 0, reset_at: now + RATE_WINDOW_MS }; });
    if (counts[0].count >= IP_REQUEST_LIMIT || counts[1].count >= GLOBAL_REQUEST_LIMIT) return false;
    keys.forEach((key, i) => this.counters.set(key, { count: counts[i].count + 1, reset_at: counts[i].reset_at })); return true;
  }
  async persist(record, key, fingerprint) {
    if (this.fail) throw new Error('secret database stack');
    const receipt = this.receipts.get(key);
    if (receipt) return receipt.fingerprint === fingerprint ? { rfq_id: receipt.rfq_id, replay: true } : { conflict: true };
    this.records.set(record.rfq_id, structuredClone(record)); this.receipts.set(key, { fingerprint, rfq_id: record.rfq_id });
    return { rfq_id: record.rfq_id, replay: false };
  }
}
