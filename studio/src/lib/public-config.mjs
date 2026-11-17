export function publicConfig(env) {
  const launched = env.STUDIO_LAUNCH_MODE === 'line-only';
  if (!launched) return { launched: false, lineUrl: '', lineId: '', site: env.STUDIO_SITE_URL || 'https://studio.invalid' };
  const site = new URL(env.STUDIO_SITE_URL);
  const line = new URL(env.STUDIO_LINE_URL);
  if (site.protocol !== 'https:' || site.pathname !== '/' || site.search || site.hash || site.username || site.password) throw Error('Public launch requires an HTTPS origin');
  if (line.protocol !== 'https:' || !['line.me', 'lin.ee'].includes(line.hostname) || line.username || line.password || line.search || line.hash || line.pathname === '/') throw Error('Use the approved LINE profile link');
  if (env.STUDIO_LINE_ID && !/^[A-Za-z0-9._-]{4,20}$/.test(env.STUDIO_LINE_ID)) throw Error('Invalid public LINE ID');
  return { launched: true, lineUrl: line.href, lineId: env.STUDIO_LINE_ID || '', site: site.origin };
}
