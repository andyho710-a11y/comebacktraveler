import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineBoolean, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { error as logError, info as logInfo, warn as logWarn } from 'firebase-functions/logger';
import { FirestoreIntakeStore } from './firestore-store.js';
import { installJsonParserLogPrivacy } from './log-privacy.js';
import { createIntakeHandler, providerClientIp } from './service.js';

installJsonParserLogPrivacy(console, event => logWarn('rfq_intake_security_event', event));

const enabled = defineBoolean('RFQ_INTAKE_ENABLED', { default: false });
const runtimeAccount = defineString('RFQ_SERVICE_ACCOUNT', { description: 'Dedicated runtime service account with access only to the rfq-intake database.' });
const app = initializeApp();
export const vietnamSourcingIntake = onRequest({ region: 'asia-east1', serviceAccount: runtimeAccount, invoker: 'public', cors: false, maxInstances: 2, concurrency: 10, memory: '256MiB', timeoutSeconds: 30 }, async (request, response) => {
  const store = new FirestoreIntakeStore(getFirestore(app, 'rfq-intake'));
  const origins = ['https://comebacktraveler.com', 'https://comeback-traveler-web.web.app', 'https://comeback-traveler-web.firebaseapp.com'];
  if (process.env.FUNCTIONS_EMULATOR === 'true') origins.push('http://localhost:5000', 'http://127.0.0.1:5000');
  const handle = createIntakeHandler({ store, origins, enabled: enabled.value(), onEvent: event => {
    const write = event.http_status === 500 ? logError : event.http_status >= 400 && event.http_status !== 503 ? logWarn : logInfo;
    write('rfq_intake_result', { event: 'rfq_intake_result', ...event });
  } });
  const result = await handle({ method: request.method, origin: request.get('origin') ?? '', contentType: request.get('content-type') ?? '', idempotencyKey: request.get('idempotency-key') ?? '', clientIp: providerClientIp(request.get('x-forwarded-for'), request.socket.remoteAddress), rawBody: request.rawBody ?? new Uint8Array() });
  response.set(result.headers).status(result.status).json(result.body);
});
