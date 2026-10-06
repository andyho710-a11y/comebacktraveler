import { createHash, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { ATTRIBUTION_FIELDS, TEXT_FIELDS, serializeRFQ, validateIntake } from '../../src/lib/vietnam-sourcing/rfq.js';
import type { IntakeInput, RFQ, RFQSubmission } from '../../src/lib/vietnam-sourcing/rfq.js';

export const MAX_PAYLOAD_BYTES = 64 * 1024;
export const RATE_WINDOW_MS = 10 * 60 * 1000;
export const IP_REQUEST_LIMIT = 10;
export const GLOBAL_REQUEST_LIMIT = 100;
export interface StoredRFQ extends RFQ { notification_status: 'pending_manual_review'; }
export interface IntakeStore {
  consumeRate(clientKey: string, now: number): Promise<boolean>;
  persist(record: StoredRFQ, key: string, fingerprint: string): Promise<{ rfq_id: string; replay: boolean } | { conflict: true }>;
}
export interface IntakeRequest { method: string; origin: string; contentType: string; idempotencyKey: string; clientIp: string; rawBody: Uint8Array; }
export interface IntakeResponse { status: number; body: Record<string, unknown>; headers: Record<string, string>; }
export function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
export function generateRFQId(now: Date) { return `RFQ-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(16).toString('hex')}`; }
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value: Record<string, unknown>, keys: readonly string[]) { return Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key)); }
const INPUT_KEYS = [...TEXT_FIELDS, 'product_category', 'frequency', 'oem', 'odm', 'private_label', 'existing_supplier_status', 'services_requested', 'consent', 'website_confirmation'];
export function normalizeSubmission(value: unknown): RFQSubmission | null {
  if (!object(value) || !exactKeys(value, ['schema_version', 'submission_id', 'input', 'attribution']) || value.schema_version !== 1 || typeof value.submission_id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value.submission_id)) return null;
  if (!object(value.input) || !exactKeys(value.input, INPUT_KEYS) || !object(value.attribution) || !exactKeys(value.attribution, ATTRIBUTION_FIELDS)) return null;
  const input = value.input;
  for (const key of INPUT_KEYS.filter(key => !['services_requested', 'consent'].includes(key))) {
    const field = input[key];
    const limit = ['specifications', 'additional_notes'].includes(key) ? 4000 : 300;
    if (typeof field !== 'string' || field.length > limit || /data:[^\s]*;base64,/i.test(field) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(field)) return null;
  }
  if (typeof input.consent !== 'boolean' || !Array.isArray(input.services_requested) || input.services_requested.length > 9 || input.services_requested.some(value => typeof value !== 'string' || value.length > 40)) return null;
  for (const key of ATTRIBUTION_FIELDS) if (typeof value.attribution[key] !== 'string' || value.attribution[key].length > 200) return null;
  const normalized = Object.fromEntries(INPUT_KEYS.map(key => [key, typeof input[key] === 'string' ? input[key].trim() : input[key]])) as IntakeInput;
  normalized.services_requested = [...new Set(normalized.services_requested)].sort();
  const attribution = Object.fromEntries(ATTRIBUTION_FIELDS.map(key => [key, (value.attribution as Record<string, string>)[key].trim()])) as RFQSubmission['attribution'];
  return { schema_version: 1, submission_id: value.submission_id.toLowerCase(), input: normalized, attribution };
}
/** Only provider-appended last address is considered; never accept the first forwarded value. */
export function providerClientIp(forwarded: string | undefined, remote: string | undefined) {
  const candidate = forwarded?.split(',').at(-1)?.trim();
  return candidate && isIP(candidate) ? candidate : remote && isIP(remote) ? remote : 'unknown';
}
export function createIntakeHandler(options: { store: IntakeStore; origins: readonly string[]; enabled: boolean; clock?: () => Date; onStorageFailure?: () => void; onStored?: () => void }) {
  const headers = { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' };
  const error = (status: number, code: string): IntakeResponse => ({ status, body: { stored: false, code }, headers });
  return async (request: IntakeRequest): Promise<IntakeResponse> => {
    if (!options.enabled) return error(503, 'unavailable');
    if (request.method !== 'POST') return { ...error(405, 'method_not_allowed'), headers: { ...headers, Allow: 'POST' } };
    if (!options.origins.includes(request.origin)) return error(403, 'forbidden');
    if (!/^application\/json(?:\s*;.*)?$/i.test(request.contentType)) return error(415, 'unsupported_media_type');
    if (request.rawBody.byteLength > MAX_PAYLOAD_BYTES) return error(413, 'payload_too_large');
    const now = (options.clock ?? (() => new Date()))();
    try {
      if (!await options.store.consumeRate(hash(`ip:${request.clientIp}`), now.getTime())) return { ...error(429, 'rate_limited'), headers: { ...headers, 'Retry-After': '600' } };
      let parsed: unknown;
      try { parsed = JSON.parse(Buffer.from(request.rawBody).toString('utf8')); } catch { return error(400, 'invalid_request'); }
      const submission = normalizeSubmission(parsed);
      if (!submission || request.idempotencyKey.toLowerCase() !== submission.submission_id || !validateIntake(submission.input).valid) return error(400, 'invalid_request');
      const query = new URLSearchParams(submission.attribution).toString();
      const record: StoredRFQ = { ...serializeRFQ(submission.input, query, generateRFQId(now), now.toISOString()), notification_status: 'pending_manual_review' };
      const fingerprint = hash(JSON.stringify({ input: submission.input, attribution: submission.attribution }));
      const receipt = await options.store.persist(record, hash(submission.submission_id), fingerprint);
      if ('conflict' in receipt) return error(409, 'idempotency_conflict');
      if (!receipt.replay) { try { options.onStored?.(); } catch { /* a log failure cannot undo persistence */ } }
      return { status: receipt.replay ? 200 : 201, headers, body: { stored: true, submission_id: submission.submission_id, rfq_id: receipt.rfq_id } };
    } catch {
      // Log only a constant event name through the injected callback, never error/body/IP.
      try { options.onStorageFailure?.(); } catch { /* logging must not disclose or change the response */ }
      return error(500, 'temporarily_unavailable');
    }
  };
}
