import { defineConfig } from 'astro/config';
export default defineConfig({
  site: process.env.STUDIO_SITE_URL || 'https://studio.invalid',
  trailingSlash: 'never',
  build: { format: 'file' },
});
