export const STATUSES = ['new', 'pending', 'replied', 'booked', 'won', 'cancelled', 'unsuitable'];
export const STATUS_LABELS = { new: '新詢單', pending: '待確認', replied: '已回覆', booked: '已完成合法預約', won: '已成交', cancelled: '已取消', unsuitable: '不符合接案條件' };
export const SOURCES = ['direct', 'google', 'line', 'referral', 'social', 'other'];
export function sourceFromSearch(search) {
  const value = new URLSearchParams(search).get('utm_source');
  return SOURCES.includes(value) ? value : 'direct';
}
const limits = { date: 10, time: 5, pickup: 100, destination: 100, trip: 12, stops: 300, name: 40, contact: 80, notes: 500, website: 100, source: 10 };
export function validateInquiry(input, now = new Date()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('請檢查表單內容。');
  const allowed = [...Object.keys(limits), 'waitHours', 'passengers', 'bags', 'consent', 'startedAt'];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw Error('表單含有未支援的欄位。');
  const data = {};
  for (const [key, max] of Object.entries(limits)) {
    if (typeof input[key] !== 'string' || input[key].length > max) throw Error('請檢查文字欄位長度。');
    data[key] = input[key].trim();
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(data[key])) throw Error('文字含有無效字元。');
  }
  if (data.website) throw Error('無法接受此筆詢問。');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const parsed = new Date(`${data.date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== data.date || data.date < today || parsed.getTime() > now.getTime() + 366 * 86400000) throw Error('請選擇今天起一年內的有效日期。');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)) throw Error('請填寫有效出發時間。');
  if (!['oneway', 'return'].includes(data.trip) || !SOURCES.includes(data.source)) throw Error('請選擇行程類型。');
  if (!data.pickup || !data.destination || !data.name || !data.contact) throw Error('請填寫日期、路線及聯絡方式。');
  for (const [key, max, integer] of [['waitHours', 24, false], ['passengers', 9, true], ['bags', 20, true]]) {
    if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < (key === 'passengers' ? 1 : 0) || input[key] > max || (integer && !Number.isInteger(input[key]))) throw Error('請檢查人數、行李或等候時間。');
    data[key] = input[key];
  }
  if (input.consent !== true) throw Error('請閱讀並同意個資告知。');
  if (!Number.isSafeInteger(input.startedAt) || now.getTime() - input.startedAt < 2500 || now.getTime() - input.startedAt > 86400000) throw Error('請稍候再送出，或重新整理表單。');
  delete data.website;
  return data;
}
export function inquiryText(data) {
  return `您好，我想詢問接送行程（尚非正式預約）：\n日期：${data.date} ${data.time}\n上車地區：${data.pickup}\n目的地：${data.destination}\n行程：${data.trip === 'return' ? '來回' : '單程'}，等候 ${data.waitHours} 小時\n其他停靠：${data.stops || '無'}\n乘客 ${data.passengers} 人／行李 ${data.bags} 件\n稱呼：${data.name}\n聯絡：${data.contact}\n其他需求：${data.notes || '無'}\n請協助確認車型容量、檔期及依法預約方式。`;
}
export function calculatePrice(input) {
  const numeric = ['revenue', 'competitor', 'discount', 'loadedKm', 'emptyKm', 'driveHours', 'waitHours', 'bufferHours', 'perKm', 'fuelPerKm', 'maintenancePerKm', 'depreciationPerKm', 'tolls', 'parking', 'fleet', 'other', 'minimumHourly'];
  for (const key of numeric) if (typeof input[key] !== 'number' || !Number.isFinite(input[key]) || input[key] < 0 || input[key] > 10000000) throw Error('成本輸入必須是有限的非負數。');
  if (input.discount > 100 || !['bundled', 'itemized'].includes(input.costMode)) throw Error('請檢查成本模式及折扣。');
  const km = input.loadedKm + input.emptyKm;
  const hours = input.driveHours + input.waitHours + input.bufferHours;
  if (hours <= 0) throw Error('總工時必須大於 0。');
  const vehicleCost = km * (input.costMode === 'bundled' ? input.perKm : input.fuelPerKm + input.maintenancePerKm + input.depreciationPerKm);
  const totalCost = vehicleCost + input.tolls + input.parking + input.fleet + input.other;
  const profit = input.revenue - totalCost;
  const hourly = profit / hours;
  const profitable = profit >= 0 && hourly >= input.minimumHourly;
  return { km, hours, totalCost, revenue: input.revenue, profit, hourly, differencePercent: input.competitor > 0 ? (input.revenue / input.competitor - 1) * 100 : null, comparisonTarget: input.competitor * (1 - input.discount / 100), minimumRevenue: totalCost + hours * input.minimumHourly, profitable, eligible: profitable && input.legalReviewed === true && !!input.vehicle?.trim() && !!input.fareConditions?.trim(), needsReview: true };
}
export function analyticsEvent(name, source = 'direct') {
  if (!['page_view', 'line_click', 'inquiry_start', 'inquiry_submit', 'phone_click', 'quote_request', 'confirmed_booking'].includes(name)) throw Error('Unknown analytics event');
  return { name, params: { service: 'kaohsiung_transfer', source: SOURCES.includes(source) ? source : 'other' } };
}
