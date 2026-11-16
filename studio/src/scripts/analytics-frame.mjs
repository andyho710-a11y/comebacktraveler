import { analyticsEvent } from '../lib/domain.mjs';
const config = await fetch('/api/config').then(response => response.json());
if (config.gaId && /^G-[A-Z0-9]+$/.test(config.gaId) && parent !== window) {
  // GA runs in an empty document with no form, contact links or customer text.
  window.dataLayer = []; window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', config.gaId, { send_page_view: false, page_location: location.origin + '/', page_referrer: '', allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement('script'); script.async = true; script.src = `https://www.googletagmanager.com/gtag/js?id=${config.gaId}`; document.head.append(script);
  window.addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin || !event.data || event.data.type !== 'studio_event') return;
    try { const safe = analyticsEvent(event.data.name, event.data.source); if (safe.name === 'confirmed_booking') return; window.gtag('event', safe.name, { ...safe.params, page_location: location.origin + '/', page_referrer: '' }); } catch { /* Ignore non-allowlisted messages. */ }
  });
  parent.postMessage({ type: 'studio_analytics_ready' }, location.origin);
}
