import { STATUSES, STATUS_LABELS, SOURCES, calculatePrice } from '../lib/domain.mjs';
const $ = selector => document.querySelector(selector);
const state = { items: [], calculation: null, calcTarget: null, notified: null, notifications: false, loading: false };
const status = $('#admin-status');
const sourceLabels = { direct: '直接／未知', google: 'Google', line: 'LINE', referral: '轉介紹', social: '社群', other: '其他' };
function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
async function api(path, method = 'GET', data) {
  const response = await fetch(path, { method, headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(15000) });
  let value; try { value = await response.json(); } catch { throw Error('伺服器未回傳有效內容。'); }
  if (response.status === 401) { clearPrivate(); }
  if (!response.ok) throw Error(value.error || '暫時無法處理。'); return value;
}
function clearPrivate() { state.items = []; state.notified = null; state.calculation = null; state.calcTarget = null; $('#orders').replaceChildren(); $('#metrics').replaceChildren(); $('#channels').replaceChildren(); $('#search').value = ''; $('#calculator').reset(); $('#calc-result').hidden = true; $('#workspace').hidden = true; $('#login').hidden = false; }
$('#login').addEventListener('submit', async event => {
  event.preventDefault(); const button = $('#login button'); button.disabled = true;
  try { await api('/api/login', 'POST', { password: $('#login').elements.password.value }); $('#login').reset(); await load(); status.textContent = '已登入。'; } catch (error) { status.textContent = error.message; } finally { button.disabled = false; }
});
$('#logout').onclick = async () => { try { await api('/api/logout', 'POST', {}); clearPrivate(); status.textContent = '已登出。'; } catch (error) { status.textContent = error.message; } };
$('#refresh').onclick = () => load().catch(error => { status.textContent = error.message; });
$('#notify').onclick = () => {
  state.notifications = !state.notifications;
  $('#notify').textContent = state.notifications ? '關閉本頁通知提醒' : '開啟本頁通知提醒';
  status.textContent = state.notifications ? '已啟用本頁標題與畫面提醒。保持本頁開啟；不保證手機背景通知。' : '已關閉本頁提醒。';
};
async function load(quiet = false) {
  if (state.loading) return; state.loading = true;
  try {
    const [orders, metrics] = await Promise.all([api('/api/admin/inquiries'), api('/api/admin/metrics')]);
    if (state.notifications && state.notified && orders.items.some(item => !state.notified.has(item.id))) { document.title = '有新的行程詢問｜管理工作台'; status.textContent = '有新的行程詢問，請在工作區查看。'; }
    state.items = orders.items; state.notified = new Set(orders.items.map(item => item.id));
    $('#login').hidden = true; $('#workspace').hidden = false; render(); renderMetrics(metrics);
    if (!quiet) status.textContent = '詢單已更新。';
  } finally { state.loading = false; }
}
setInterval(() => { if (!$('#workspace').hidden && document.visibilityState === 'visible') load(true).catch(error => { status.textContent = error.message; }); }, 30000);
window.addEventListener('pagehide', clearPrivate);
window.addEventListener('pageshow', e => { if (e.persisted) clearPrivate(); });
function renderMetrics(data) {
  const sums = event => data.events.filter(row => row.event === event).reduce((total, row) => total + row.count, 0);
  const count = names => data.statuses.filter(row => names.includes(row.status)).reduce((sum, row) => sum + row.count, 0);
  const metric = (label, value) => { const card = el('div', undefined, 'metric'); card.append(el('span', label), el('strong', value)); return card; };
  $('#metrics').replaceChildren(metric('網站訪客（GA4 未串接）', '尚無資料'), metric('LINE 點擊次數', sums('line_click') || '尚無資料'), metric('歷來表單詢問件數', sums('inquiry_submit') || '尚無資料'), metric('有效詢單（目前）', count(['replied', 'booked', 'won'])), metric('已成交（目前）', count(['won'])), metric('合法預約（歷來首次標記）', sums('confirmed_booking') || '尚無資料'), metric('頁面瀏覽次數', sums('page_view') || '尚無資料'));
  const table = el('table', undefined, 'source-table'), head = el('tr');
  ['來源', '瀏覽次數', 'LINE 點擊', '表單詢問', '首次合法預約'].forEach(text => head.append(el('th', text))); table.append(head);
  for (const source of SOURCES) { const row = el('tr'); row.append(el('td', sourceLabels[source])); for (const event of ['page_view', 'line_click', 'inquiry_submit', 'confirmed_booking']) { const count = data.events.filter(item => item.source === source && item.event === event).reduce((sum, item) => sum + item.count, 0); row.append(el('td', count || '尚無資料')); } table.append(row); } $('#channels').replaceChildren(table);
}
function render() {
  const search = $('#search').value.trim().toLocaleLowerCase(), filter = $('#status-filter').value;
  const items = state.items.filter(item => (filter === 'all' || filter === item.status) && [item.name, item.pickup, item.destination, item.contact, item.date].join(' ').toLocaleLowerCase().includes(search));
  $('#orders').replaceChildren(...(items.length ? items.map(order) : [el('p', '目前沒有符合條件的詢單。', 'admin-card')]));
}
$('#search').oninput = render; $('#status-filter').onchange = render;
function order(item) {
  const card = el('article', undefined, 'admin-card'), heading = el('div', undefined, 'order-heading');
  heading.append(el('h3', `${item.date} ${item.time}｜${item.pickup} → ${item.destination}`), el('span', STATUS_LABELS[item.status], 'badge')); card.append(heading);
  const details = el('div', undefined, 'order-details');
  [`聯絡：${item.name}／${item.contact}`, `行程：${item.trip === 'return' ? '來回' : '單程'}・等候 ${item.waitHours} 小時`, `乘客 ${item.passengers} 人・行李 ${item.bags} 件`, `停靠點：${item.stops || '無'}`, `來源：${sourceLabels[item.source]}`, `其他需求：${item.notes || '無'}`, item.calculation ? `預估成本：NT$${item.calculation.result.totalCost.toFixed(0)}／貢獻利潤：NT$${item.calculation.result.profit.toFixed(0)}` : '預估成本／利潤：尚無試算'].forEach(text => details.append(el('p', text))); card.append(details);
  const controls = el('div', undefined, 'order-actions'), selectLabel = el('label', '處理狀態'), select = el('select');
  select.setAttribute('aria-label', `更新 ${item.date} ${item.name} 的狀態`); for (const name of STATUSES) { const option = el('option', STATUS_LABELS[name]); option.value = name; option.selected = name === item.status; select.append(option); } selectLabel.append(select);
  const refLabel = el('label', '合法預約紀錄依據'), reference = el('input'); reference.value = item.bookingReference; reference.maxLength = 200; reference.placeholder = '僅填已完成的車隊預約紀錄摘要'; refLabel.append(reference); controls.append(selectLabel, refLabel);
  const use = el('button', '載入此單試算', 'button secondary'); use.type = 'button'; use.onclick = () => {
    $('#calculator').reset(); state.calculation = null; state.calcTarget = item.id; $('#calc-result').hidden = true;
    if (item.calculation) for (const [key, value] of Object.entries(item.calculation.input)) { const field = $('#calculator').elements.namedItem(key); if (field) { if (field.type === 'checkbox') field.checked = value; else field.value = value; } }
    $('#calculator').scrollIntoView({ behavior: 'smooth', block: 'start' }); status.textContent = '已載入此單試算；重新計算後，回到該詢單按「儲存狀態與目前試算」。';
  };
  const save = el('button', '儲存狀態與目前試算', 'button'); save.type = 'button';
  save.onclick = async () => { save.disabled = true; try { await api(`/api/admin/inquiries/${item.id}`, 'PATCH', { version: item.version, status: select.value, bookingReference: reference.value, calculation: (state.calcTarget === item.id ? state.calculation : null) || item.calculation?.input || null }); await load(); status.textContent = '已儲存。尚未傳送任何訊息給客人。'; } catch (error) { status.textContent = error.message; save.disabled = false; } };
  const remove = el('button', '刪除此筆個資', 'button secondary danger'); remove.type = 'button';
  remove.onclick = () => {
    const confirmation = el('div', undefined, 'callout'); confirmation.append(el('p', '刪除將移除本機資料庫與重試紀錄，無法復原。請確認已依資料處理規定處理。'));
    const yes = el('button', '確認刪除', 'button'), no = el('button', '保留詢單', 'button secondary'); yes.type = no.type = 'button'; no.onclick = () => confirmation.remove();
    yes.onclick = async () => { yes.disabled = true; try { await api(`/api/admin/inquiries/${item.id}`, 'DELETE'); await load(); status.textContent = '已刪除本機詢單個資；LINE 對話或備份需另依政策處理。'; } catch (error) { status.textContent = error.message; yes.disabled = false; } }; confirmation.append(yes, no); card.append(confirmation);
  };
  controls.append(use, save, remove); card.append(controls); return card;
}
$('#calculator').addEventListener('input', () => { state.calculation = null; $('#calc-result').hidden = true; });
$('#calculator').addEventListener('submit', event => {
  event.preventDefault(); const form = $('#calculator'); const input = Object.fromEntries(new FormData(form));
  for (const key of Object.keys(input)) if (!['costMode', 'vehicle', 'fareConditions', 'legalReviewed'].includes(key)) input[key] = Number(input[key]); input.legalReviewed = form.elements.legalReviewed.checked;
  try { const result = calculatePrice(input); state.calculation = input; const money = n => `NT$${n.toFixed(0)}`; const output = $('#calc-result'); output.hidden = false; output.textContent = `總工時 ${result.hours} 小時／總里程 ${result.km} 公里\n預估總成本：${money(result.totalCost)}\n預估收入：${money(result.revenue)}\n預估貢獻利潤：${money(result.profit)}\n每小時報酬估算：${money(result.hourly)}\n成本＋目標報酬所需收入：${money(result.minimumRevenue)}\n與競品差異：${result.differencePercent === null ? '尚無參考' : result.differencePercent.toFixed(1) + '%'}\n比較用折扣目標：${money(result.comparisonTarget)}（不自動套用）\n成本門檻：${result.profitable ? '達標' : '未達標'}\n接案條件：${result.eligible ? '可供人工評估' : '未完成或未達標'}\n仍須人工重新檢查報價；這不是正式報價。`; }
  catch (error) { status.textContent = error.message; }
});
load(true).catch(() => {});
