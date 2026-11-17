import { Store } from './store.mjs';
import { createApp } from './app.mjs';
import { loadConfig, databasePath } from './runtime.mjs';
import { resolve } from 'node:path';
const config = loadConfig(), store = new Store(databasePath(), config.encryptionKey);
store.purge(config.retentionDays);
const timer = setInterval(() => store.purge(config.retentionDays), 3600000); timer.unref();
const app = createApp({ config, store, dist: resolve('dist') });
app.requestTimeout = 15000; app.headersTimeout = 10000;
app.listen(Number(process.env.PORT || 4330), '127.0.0.1', () => console.log(`接送工作室：${config.origin}（${config.mode === 'demo' ? '測試版，請勿填寫真實個資' : '依已核准設定運作'}）`));
function shutdown() { clearInterval(timer); app.close(() => { store.close(); process.exit(0); }); }
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
