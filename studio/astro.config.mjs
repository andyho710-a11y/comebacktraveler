import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  site: process.env.STUDIO_SITE_URL || 'https://studio.invalid',
  trailingSlash: 'never',
  build: { format: 'file' },
  vite: { tsconfig: fileURLToPath(new URL('./tsconfig.json', import.meta.url)) },
});
