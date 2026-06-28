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
      // 暫時隱藏的草稿頁不列入 sitemap。
      filter: (page) => !page.includes('/drink-a-glass-of-water'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
