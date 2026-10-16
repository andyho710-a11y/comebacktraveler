// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
const servicesEnv = {...loadEnv('production',process.cwd(),'PUBLIC_'),...process.env};
const servicesIndexable = servicesEnv.PUBLIC_ENVIRONMENT === 'production' && servicesEnv.PUBLIC_PILOT_ENABLED === 'true';

export default defineConfig({
  site: 'https://comebacktraveler.com',
  trailingSlash: 'never',
  // Preserve Astro 6 HTML whitespace semantics during the Astro 7 migration.
  compressHTML: true,
  build: {
    format: 'file',
  },
  integrations: [
    sitemap({
      // 刻意 noindex 的草稿、遷移頁與英文預留頁不列入 sitemap。
      filter: (page) =>
        (!new URL(page).pathname.match(/^\/services(?:\/|$)/) || (servicesIndexable && new URL(page).pathname === '/services')) &&
        !page.includes('/drink-a-glass-of-water') &&
        !page.endsWith('/vietnam-mosquito-repellent-guide') &&
        !['/en/connectivity', '/en/travel-gear', '/en/vietnam-travel-prep'].includes(new URL(page).pathname),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
