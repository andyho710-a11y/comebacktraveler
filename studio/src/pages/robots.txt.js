export function GET() {
  const site = import.meta.env.STUDIO_SITE_URL;
  const ready = site && !site.includes('.invalid') && import.meta.env.STUDIO_INDEXABLE === 'true';
  return new Response(ready ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /analytics\nDisallow: /api/\nUser-agent: OAI-SearchBot\nAllow: /\nDisallow: /admin\nDisallow: /analytics\nDisallow: /api/\n\nUser-agent: GPTBot\nDisallow: /\n\nSitemap: ${new URL('/sitemap.xml', site)}\n` : 'User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
}
