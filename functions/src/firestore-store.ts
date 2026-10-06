import type { Firestore } from 'firebase-admin/firestore';
import { GLOBAL_REQUEST_LIMIT, IP_REQUEST_LIMIT, RATE_WINDOW_MS } from './service.js';
import type { IntakeStore, StoredRFQ } from './service.js';

/** All intake/receipt writes are atomic. Admin SDK access is authorized by runtime IAM. */
export class FirestoreIntakeStore implements IntakeStore {
  constructor(private readonly database: Firestore) {}
  async consumeRate(clientKey: string, now: number) {
    const refs = [this.database.collection('_rfq_abuse').doc(clientKey), this.database.collection('_rfq_abuse').doc('global')];
    return this.database.runTransaction(async transaction => {
      const snapshots = await transaction.getAll(...refs);
      const counts = snapshots.map(snapshot => {
        const value = snapshot.data();
        return value && value.reset_at > now && Number.isSafeInteger(value.count) && value.count >= 0 ? { count: value.count as number, reset_at: value.reset_at as number } : { count: 0, reset_at: now + RATE_WINDOW_MS };
      });
      if (counts[0].count >= IP_REQUEST_LIMIT || counts[1].count >= GLOBAL_REQUEST_LIMIT) return false;
      refs.forEach((ref, index) => transaction.set(ref, { count: counts[index].count + 1, reset_at: counts[index].reset_at, expires_at: new Date(counts[index].reset_at + RATE_WINDOW_MS) }));
      return true;
    });
  }
  async persist(record: StoredRFQ, key: string, fingerprint: string) {
    const receiptRef = this.database.collection('_rfq_receipts').doc(key);
    const recordRef = this.database.collection('rfqs').doc(record.rfq_id);
    return this.database.runTransaction(async transaction => {
      const previous = await transaction.get(receiptRef);
      if (previous.exists) {
        const data = previous.data()!;
        if (data.fingerprint !== fingerprint) return { conflict: true as const };
        // Confirm the original record still exists before acknowledging a retry.
        const stored = await transaction.get(this.database.collection('rfqs').doc(data.rfq_id));
        if (!stored.exists) throw new Error('Receipt without RFQ');
        return { rfq_id: data.rfq_id as string, replay: true };
      }
      transaction.create(recordRef, record);
      transaction.create(receiptRef, { fingerprint, rfq_id: record.rfq_id, created_at: record.created_at });
      return { rfq_id: record.rfq_id, replay: false };
    });
  }
}
