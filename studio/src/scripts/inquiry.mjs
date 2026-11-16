import { validateInquiry, inquiryText, sourceFromSearch, analyticsEvent } from '../lib/domain.mjs';
const form = document.querySelector('#inquiry-form');
const status = document.querySelector('#form-status');
const submit = document.querySelector('#submit-inquiry');
let startedAt = Date.now(), key = crypto.randomUUID(), busy = false, sent = false, started = false, gaReady = false, analyticsFrame;
const source = sourceFromSearch(location.search);
let config;
function event(name) {
  const safe = analyticsEvent(name, source);
  if (!['inquiry_submit', 'quote_request'].includes(name)) fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: name, source }) }).catch(() => {});
  if (gaReady) analyticsFrame.contentWindow.postMessage({ type: 'studio_event', name: safe.name, source: safe.params.source }, location.origin);
}
function data() {
  const values = Object.fromEntries(new FormData(form));
  for (const field of ['waitHours', 'passengers', 'bags']) values[field] = Number(values[field]);
  values.consent = values.consent === 'on'; values.startedAt = startedAt; values.source = source;
  return values;
}
function valid() {
  if (!form.reportValidity()) return null;
  const value = data();
  try { validateInquiry(value); return value; } catch (error) { status.textContent = error.message; return null; }
}
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
form.elements.date.min = today;
form.addEventListener('input', () => {
  if (!started) { started = true; event('inquiry_start'); }
  if (sent) { sent = false; key = crypto.randomUUID(); submit.disabled = !config?.enabled; submit.textContent = config?.enabled ? '送出新的行程詢問' : '收單尚未啟用'; }
});
form.addEventListener('submit', async e => {
  e.preventDefault(); if (busy || sent || !config?.enabled) return;
  const value = valid(); if (!value) return;
  busy = true; submit.disabled = true; status.textContent = '正在安全送出詢問，請稍候…';
  try {
    const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(value), signal: AbortSignal.timeout(15000) });
    const result = await response.json();
    if (!response.ok) { if (response.status === 409) key = crypto.randomUUID(); throw Error(result.error || '暫時無法送出。'); }
    sent = true; status.textContent = result.message; submit.textContent = '已收到詢問 · 等候人工聯繫';
    event('inquiry_submit'); event('quote_request');
  } catch (error) { status.textContent = error.name === 'TimeoutError' ? '連線逾時，可能已收到詢問。請保留目前內容並重試，系統會避免重複建立。' : (error.message || '連線中斷，請保留內容稍後重試。'); }
  finally { busy = false; submit.disabled = sent || !config.enabled; }
});
document.querySelector('#make-text').addEventListener('click', () => {
  const value = valid(); if (!value) return;
  document.querySelector('#message-text').value = inquiryText(value);
  document.querySelector('#message-box').hidden = false; status.textContent = '已在目前頁面產生文字。尚未傳送，也未建立詢單。';
});
document.querySelector('#copy-text').addEventListener('click', async () => {
  const text = document.querySelector('#message-text');
  try { await navigator.clipboard.writeText(text.value); status.textContent = '已複製。請自行在 LINE 確認收件人與內容後傳送。'; }
  catch { text.focus(); text.select(); status.textContent = '請長按或使用複製快捷鍵，複製已選取的文字。'; }
});
try {
  const response = await fetch('/api/config'); if (!response.ok) throw Error(); config = await response.json();
  submit.disabled = !config.enabled; submit.textContent = config.enabled ? (config.demo ? '送出測試詢問' : '送出行程詢問') : '收單尚未啟用';
  if (!config.demo) document.querySelector('#environment').textContent = config.enabled ? '行程詢問 · 人工確認後依法完成正式預約' : '籌備中 · 尚未開放正式收單';
  document.querySelector('#privacy-contact').textContent = `管理者：${config.operator}。個資聯絡：${config.privacyContact}。詢單保留 ${config.retentionDays} 天。`;
  if (config.lineUrl) {
    const link = document.querySelector('#line-link'); link.href = config.lineUrl; link.hidden = false;
    link.textContent = '用個人 LINE 聯繫 ↗'; document.querySelector('#line-status').textContent = `目前使用個人 LINE${config.lineId ? '：' + config.lineId : ''}。若手機未能開啟，請使用經營者提供的加入方式；尚非官方帳號。`;
    link.addEventListener('click', () => event('line_click'));
  }
  if (config.phone) { const phone = document.querySelector('#phone-link'); phone.href = `tel:${config.phone}`; phone.textContent = config.phone; phone.hidden = false; phone.addEventListener('click', () => event('phone_click')); }
  if (config.gaId) {
    const panel = document.createElement('div'); panel.className = 'wrap callout';
    panel.append('是否同意使用 GA4 分析本站的匿名互動事件？');
    const yes = document.createElement('button'), no = document.createElement('button');
    yes.type = no.type = 'button'; yes.className = no.className = 'button secondary'; yes.textContent = '同意分析'; no.textContent = '略過分析';
    yes.onclick = () => {
      analyticsFrame = document.createElement('iframe'); analyticsFrame.hidden = true; analyticsFrame.title = '已同意的匿名互動分析'; analyticsFrame.src = '/analytics';
      window.addEventListener('message', message => { if (message.origin === location.origin && message.source === analyticsFrame.contentWindow && message.data?.type === 'studio_analytics_ready') { gaReady = true; analyticsFrame.contentWindow.postMessage({ type: 'studio_event', name: 'page_view', source }, location.origin); } });
      document.body.append(analyticsFrame); panel.remove();
    };
    no.onclick = () => panel.remove(); panel.append(yes, no); document.querySelector('footer').before(panel);
  }
  event('page_view');
} catch { status.textContent = '安全收單服務尚未連接。可先產生詢問文字，請勿在展示版填入真實個資。'; }
