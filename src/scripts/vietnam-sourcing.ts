import { analyticsDimensions, createSubmissionGate, readIntake, serializeRFQ, unavailableTransport, validateIntake } from '../lib/vietnam-sourcing/rfq';
import type { RFQ, SourcingEvent } from '../lib/vietnam-sourcing/rfq';

const form = document.querySelector<HTMLFormElement>('#sourcing-form');
const button = document.querySelector<HTMLButtonElement>('#rfq-submit');
const feedback = document.querySelector<HTMLElement>('#rfq-feedback');
if (form && button && feedback) {
  const landingSearch = window.location.search;
  // TODO: replace only this transport after the endpoint and privacy review pass.
  const submit = createSubmissionGate(unavailableTransport);
  let pending: RFQ | undefined;
  let pendingFingerprint = '';
  let started = false;
  let busy = false;
  let complete = false;
  let lastAttempt = -Infinity;
  const track = (event: SourcingEvent) => {
    const input = readIntake(new FormData(form));
    const analyticsWindow = window as Window & { gtag?: (command: string, event: string, dimensions: ReturnType<typeof analyticsDimensions>) => void };
    // Analytics must never prevent intake, even if a tag is blocked or throws.
    try { analyticsWindow.gtag?.('event', event, analyticsDimensions(input.product_category, input.services_requested)); } catch { /* optional analytics */ }
  };
  track('vietnam_sourcing_view');
  document.querySelectorAll<HTMLAnchorElement>('[data-sourcing-cta]').forEach(link => link.addEventListener('click', event => {
    track('vietnam_sourcing_cta_click');
    const target = document.querySelector<HTMLElement>(link.hash);
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      target.focus({ preventScroll: true });
    }
  }));
  form.addEventListener('input', event => {
    if (!started && (event.target as HTMLInputElement).name !== 'website_confirmation') { started = true; track('vietnam_sourcing_form_start'); }
    const target = event.target as HTMLElement;
    target.removeAttribute('aria-invalid');
    const error = document.getElementById(`${target.id}-error`);
    if (error) error.textContent = '';
  });
  button.disabled = false;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || complete) return;
    feedback.textContent = '';
    form.querySelectorAll('.vs-error').forEach(node => { node.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
    const input = readIntake(new FormData(form));
    const validation = validateIntake(input);
    if (!validation.valid) {
      for (const [key, message] of Object.entries(validation.errors)) {
        const field = document.getElementById(key);
        field?.setAttribute('aria-invalid', 'true');
        const error = document.getElementById(`${key}-error`);
        if (error) error.textContent = message;
      }
      feedback.textContent = validation.spam ? validation.errors.form : '資料尚未送出。請檢查下方標示的欄位。';
      const first = form.querySelector<HTMLElement>('[aria-invalid=true]');
      (first ?? feedback).focus();
      return;
    }
    if (Date.now() - lastAttempt < 5000) { feedback.textContent = '資料尚未送出，請稍候幾秒再試。'; return; }
    busy = true;
    lastAttempt = Date.now();
    button.disabled = true;
    button.textContent = '正在處理需求…';
    form.setAttribute('aria-busy', 'true');
    try {
      const fingerprint = JSON.stringify(input);
      if (!pending || pendingFingerprint !== fingerprint) { pending = serializeRFQ(input, landingSearch); pendingFingerprint = fingerprint; }
      track('vietnam_sourcing_form_submit');
      const result = await submit(pending);
      if (result.ok) {
        complete = true;
        track('vietnam_sourcing_form_success');
        feedback.textContent = '您的採購需求已收到。我們將透過您提供的聯絡方式進行需求確認。';
        form.reset();
        pending = undefined;
        pendingFingerprint = '';
      } else {
        feedback.textContent = result.code === 'not_configured' ? '線上需求接收功能尚未開通，資料尚未送出或保存。您填寫的內容仍保留在此頁，請使用現有聯絡方式與我們聯絡。' : '資料尚未確認收到，請稍後再試或使用現有聯絡方式。';
      }
    } catch { feedback.textContent = '無法處理需求，資料尚未送出，請稍後再試。'; }
    finally {
      busy = false;
      button.disabled = complete;
      button.textContent = complete ? '需求已收到' : '提交採購需求（接收功能準備中）';
      form.removeAttribute('aria-busy');
      feedback.focus();
    }
  });
}
