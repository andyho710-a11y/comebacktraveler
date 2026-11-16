export function GET() {
  const site = import.meta.env.STUDIO_SITE_URL;
  const ready = site && !site.includes('.invalid') && import.meta.env.STUDIO_INDEXABLE === 'true';
  if (ready && !/^https:\/\/[^<>"'&\s]+\/?$/.test(site)) throw Error('Use a valid HTTPS origin');
  const urls = ready ? ['', '/privacy'].map(path => `<url><loc>${new URL(path || '/', site)}</loc></url>`).join('') : '';
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
}
