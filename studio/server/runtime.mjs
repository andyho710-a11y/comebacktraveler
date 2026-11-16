import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
export function loadConfig() {
  const config = JSON.parse(readFileSync(process.env.STUDIO_CONFIG || new URL('../.runtime/config.json', import.meta.url), 'utf8'));
  if (!['demo', 'production'].includes(config.mode) || !/^[a-f0-9]{64}$/.test(config.encryptionKey || '') || !/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(config.adminHash || '') || !Number.isInteger(config.retentionDays) || config.retentionDays < 1 || config.retentionDays > 365) throw Error('Invalid runtime configuration');
  return config;
}
export const databasePath = () => process.env.STUDIO_DATABASE || resolve('.runtime/inquiries.sqlite');
