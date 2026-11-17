import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { publicConfig } from './src/lib/public-config.mjs';
publicConfig(process.env);
export default defineConfig({
  site: process.env.STUDIO_SITE_URL || 'https://studio.invalid',
  trailingSlash: 'never',
  build: { format: 'file' },
  vite: { tsconfig: fileURLToPath(new URL('./tsconfig.json', import.meta.url)) },
});
