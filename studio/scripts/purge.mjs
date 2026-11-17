import { Store } from '../server/store.mjs';
import { loadConfig, databasePath } from '../server/runtime.mjs';
const config = loadConfig(), store = new Store(databasePath(), config.encryptionKey);
console.log(`已依 ${config.retentionDays} 天保留政策清除 ${store.purge(config.retentionDays)} 筆過期詢單。`);
store.close();
