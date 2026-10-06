// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://comebacktraveler.com',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  integrations: [
    sitemap({
      // 刻意 noindex 的草稿、遷移頁與英文預留頁不列入 sitemap。
      filter: (page) =>
        !page.includes('/drink-a-glass-of-water') &&
        !page.endsWith('/vietnam-mosquito-repellent-guide') &&
        !['/en/connectivity', '/en/travel-gear', '/en/vietnam-travel-prep'].includes(new URL(page).pathname),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
