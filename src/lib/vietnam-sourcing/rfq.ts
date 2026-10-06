/** Shared intake contract. Reuse validation on a future server before persisting. */
export const RFQ_STATUSES = ['new', 'reviewing', 'qualified', 'supplier_search', 'rfq_sent', 'quotation_received', 'sample', 'negotiation', 'won', 'lost'] as const;
export const CATEGORIES = { textiles: '紡織 / 服飾', furniture: '家具 / 家居', packaging: '包裝 / 紙品', plastics: '塑膠 / 橡膠', metal: '金屬 / 機械零件', electronics: '電子 / 電器', food: '食品 / 農產品', other: '其他 / 尚未分類' } as const;
export const SERVICES = { supplier_search: '尋找候選供應商', rfq: 'RFQ 詢價', quotation_comparison: '報價比較', samples: '樣品安排', oem_odm: 'OEM / ODM 確認', video_visit: '視訊訪廠', factory_visit: '實地驗廠安排', negotiation: '議價協助', logistics: '物流 / 進口協助' } as const;
export const FREQUENCIES = { once: '單次', monthly: '每月', quarterly: '每季', yearly: '每年', unsure: '尚未確定' } as const;
export const SUPPLIER_STATUSES = { none: '沒有', second_supplier: '有，想增加第二供應商', replace: '有，但希望更換', comparing: '正在比較' } as const;
export type Choice = 'yes' | 'no' | 'unsure';
export interface AttachmentMetadata {
  attachment_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  status: 'pending_scan' | 'ready' | 'rejected';
}
export interface RFQ {
  schema_version: 1;
  rfq_id: string;
  created_at: string;
  company: { name: string; tax_id: string; website: string };
  contact: { name: string; title: string; email: string; phone: string; line_id: string };
  product: { name: string; category: keyof typeof CATEGORIES; purpose: string };
  specifications: string;
  quantity: string;
  frequency: keyof typeof FREQUENCIES;
  target_price: string;
  moq: string;
  oem: Choice;
  odm: Choice;
  private_label: Choice;
  certifications: string;
  order_timeline: string;
  existing_supplier_status: keyof typeof SUPPLIER_STATUSES;
  services_requested: (keyof typeof SERVICES)[];
  additional_notes: string;
  attachments: AttachmentMetadata[];
  source: 'vietnam-sourcing';
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  landing_page: '/vietnam-sourcing';
  status: typeof RFQ_STATUSES[number];
  consent: { accepted: true; accepted_at: string; text_version: 'rfq-v1'; privacy_policy_path: '/privacy' };
}
export const TEXT_FIELDS = ['company_name', 'tax_id', 'website', 'contact_name', 'title', 'email', 'phone', 'line_id', 'product_name', 'purpose', 'specifications', 'quantity', 'target_price', 'moq', 'certifications', 'order_timeline', 'additional_notes'] as const;
export const REQUIRED_FIELDS = ['company_name', 'contact_name', 'email', 'phone', 'product_name', 'specifications', 'quantity'] as const;
export type IntakeInput = Record<typeof TEXT_FIELDS[number], string> & {
  product_category: string; frequency: string; oem: string; odm: string; private_label: string;
  existing_supplier_status: string; services_requested: string[]; consent: boolean; website_confirmation: string;
};
export type ValidationResult = { valid: boolean; spam: boolean; errors: Record<string, string> };
export function readIntake(data: FormData): IntakeInput {
  const text = (key: string) => typeof data.get(key) === 'string' ? String(data.get(key)).trim() : '';
  return {
    ...Object.fromEntries(TEXT_FIELDS.map(key => [key, text(key)])) as Record<typeof TEXT_FIELDS[number], string>,
    product_category: text('product_category'), frequency: text('frequency'), oem: text('oem'), odm: text('odm'), private_label: text('private_label'),
    existing_supplier_status: text('existing_supplier_status'), services_requested: data.getAll('services_requested').filter((value): value is string => typeof value === 'string'),
    consent: data.get('consent') === 'yes', website_confirmation: text('website_confirmation'),
  };
}
export function validateIntake(input: IntakeInput): ValidationResult {
  const errors: Record<string, string> = {};
  if (input.website_confirmation) return { valid: false, spam: true, errors: { form: '無法處理這次需求，資料尚未送出。' } };
  for (const key of TEXT_FIELDS) {
    if (typeof input[key] !== 'string') errors[key] = '請輸入文字。';
    else if (input[key].length > (['specifications', 'additional_notes'].includes(key) ? 4000 : 300)) errors[key] = '內容過長，請縮短後再試。';
  }
  for (const key of REQUIRED_FIELDS) if (!input[key]?.trim()) errors[key] = '請填寫此必填欄位。';
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = '請輸入有效的 Email。';
  if (input.tax_id && !/^\d{8}$/.test(input.tax_id)) errors.tax_id = '統一編號請填寫 8 位數字。';
  if (input.website) {
    try { if (!['https:', 'http:'].includes(new URL(input.website).protocol)) errors.website = '請輸入 http 或 https 網址。'; }
    catch { errors.website = '請輸入完整網址，例如 https://example.com。'; }
  }
  for (const [key, options] of Object.entries({ product_category: CATEGORIES, frequency: FREQUENCIES, existing_supplier_status: SUPPLIER_STATUSES })) {
    if (!Object.hasOwn(options, input[key as 'product_category'])) errors[key] = '請選擇有效選項。';
  }
  for (const key of ['oem', 'odm', 'private_label'] as const) if (!['yes', 'no', 'unsure'].includes(input[key])) errors[key] = '請選擇有效選項。';
  if (!Array.isArray(input.services_requested) || input.services_requested.length > Object.keys(SERVICES).length || input.services_requested.some(key => !Object.hasOwn(SERVICES, key))) errors.services_requested = '請選擇有效的服務。';
  if (input.consent !== true) errors.consent = '請勾選同意後再提交。';
  return { valid: Object.keys(errors).length === 0, spam: false, errors };
}
export function serializeRFQ(input: IntakeInput, search = '', id = crypto.randomUUID(), now = new Date().toISOString()): RFQ {
  if (!validateIntake(input).valid) throw new Error('Invalid RFQ');
  const params = new URLSearchParams(search);
  const attribution = (name: string) => (params.get(name) ?? '').slice(0, 200);
  return {
    schema_version: 1, rfq_id: id, created_at: now,
    company: { name: input.company_name.trim(), tax_id: input.tax_id, website: input.website },
    contact: { name: input.contact_name.trim(), title: input.title, email: input.email, phone: input.phone, line_id: input.line_id },
    product: { name: input.product_name, category: input.product_category as RFQ['product']['category'], purpose: input.purpose },
    specifications: input.specifications, quantity: input.quantity, frequency: input.frequency as RFQ['frequency'], target_price: input.target_price, moq: input.moq,
    oem: input.oem as Choice, odm: input.odm as Choice, private_label: input.private_label as Choice,
    certifications: input.certifications, order_timeline: input.order_timeline, existing_supplier_status: input.existing_supplier_status as RFQ['existing_supplier_status'],
    services_requested: [...new Set(input.services_requested)] as RFQ['services_requested'], additional_notes: input.additional_notes, attachments: [],
    source: 'vietnam-sourcing', utm_source: attribution('utm_source'), utm_medium: attribution('utm_medium'), utm_campaign: attribution('utm_campaign'), utm_content: attribution('utm_content'), utm_term: attribution('utm_term'),
    landing_page: '/vietnam-sourcing', status: 'new', consent: { accepted: true, accepted_at: now, text_version: 'rfq-v1', privacy_policy_path: '/privacy' },
  };
}
export type SourcingEvent = 'vietnam_sourcing_view' | 'vietnam_sourcing_cta_click' | 'vietnam_sourcing_form_start' | 'vietnam_sourcing_form_submit' | 'vietnam_sourcing_form_success';
/** Never spread input/payload, URLs, query strings, IDs, or free text into GA4. */
export function analyticsDimensions(category = '', services: readonly string[] = []) {
  return { page_path: '/vietnam-sourcing', product_category: Object.hasOwn(CATEGORIES, category) ? category : 'unspecified', services_requested: [...new Set(services.filter(key => Object.hasOwn(SERVICES, key)))].join(',') || 'none' };
}
export type SubmissionResult = { ok: true; rfq_id: string } | { ok: false; code: 'not_configured' | 'network' | 'rejected' };
export type RFQTransport = (payload: RFQ) => Promise<SubmissionResult>;
/** TODO: inject a transport backed by durable server storage. Never fake success. */
export const unavailableTransport: RFQTransport = async () => ({ ok: false, code: 'not_configured' });
/** Future same-origin endpoint contract: acknowledge only after durable storage. */
export function createHttpTransport(endpoint: string, request: typeof fetch = fetch): RFQTransport {
  if (!/^\/api\/[a-z0-9/-]+$/i.test(endpoint)) throw new Error('A same-origin /api/ endpoint is required');
  return async payload => {
    try {
      const response = await request(endpoint, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': payload.rfq_id }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
      if (!response.ok) return { ok: false, code: 'rejected' };
      const receipt = await response.json();
      return receipt?.stored === true && receipt.rfq_id === payload.rfq_id ? { ok: true, rfq_id: receipt.rfq_id } : { ok: false, code: 'rejected' };
    } catch { return { ok: false, code: 'network' }; }
  };
}
export function createSubmissionGate(transport: RFQTransport) {
  let busy = false;
  let lastAttempt = -Infinity;
  let complete = false;
  return async (payload: RFQ, now = Date.now()): Promise<SubmissionResult | { ok: false; code: 'busy' }> => {
    if (busy || complete || now - lastAttempt < 5000) return { ok: false, code: 'busy' };
    busy = true;
    lastAttempt = now;
    try { const result = await transport(payload); complete = result.ok; return result; }
    catch { return { ok: false, code: 'network' }; }
    finally { busy = false; }
  };
}
