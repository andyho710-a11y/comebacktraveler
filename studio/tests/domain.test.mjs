import test from 'node:test';
import assert from 'node:assert/strict';
import { validateInquiry, calculatePrice, analyticsEvent, sourceFromSearch, inquiryText } from '../src/lib/domain.mjs';
import { inquiry, price } from './fixtures.mjs';
test('validation rejects spam, impossible dates, coercion and unnecessary data', () => {
  assert.equal(validateInquiry(inquiry()).passengers, 2);
  for (const patch of [{ consent: false }, { website: 'spam' }, { passengers: '2' }, { passengers: 0 }, { date: '2027-02-30' }, { date: '2000-01-01' }, { time: '25:00' }, { startedAt: Date.now() }, { name: '' }, { contact: {} }, { address: 'unnecessary' }, { source: 'private phone string' }, { notes: 'x'.repeat(501) }]) assert.throws(() => validateInquiry({ ...inquiry(), ...patch }));
});
test('costs include empty return and waiting; bundled mode never double counts fuel', () => {
  const p = price(), result = calculatePrice(p);
  assert.equal(result.km, 150); assert.equal(result.hours, 5.5); assert.equal(result.totalCost, 1000); assert.equal(result.profit, 2000);
  assert.equal(result.hourly, 2000 / 5.5); assert.equal(result.minimumRevenue, 3475); assert.equal(result.eligible, false);
  assert.equal(calculatePrice({ ...p, costMode: 'itemized' }).totalCost, 1150);
  assert.equal(calculatePrice({ ...p, revenue: 5000, legalReviewed: true }).eligible, true);
  assert.equal(calculatePrice({ ...p, revenue: 5000, legalReviewed: true, fareConditions: '' }).eligible, false);
  assert.equal(calculatePrice({ ...p, competitor: 0 }).differencePercent, null);
  for (const patch of [{ loadedKm: -1 }, { revenue: Infinity }, { perKm: NaN }, { discount: 101 }, { driveHours: 0, waitHours: 0, bufferHours: 0 }]) assert.throws(() => calculatePrice({ ...p, ...patch }));
});
test('analytics only allow fixed event/source enums and never include inquiry data', () => {
  assert.deepEqual(analyticsEvent('quote_request', inquiry().contact), { name: 'quote_request', params: { service: 'kaohsiung_transfer', source: 'other' } });
  assert.equal(sourceFromSearch('?utm_source=google&name=private'), 'google'); assert.equal(sourceFromSearch('?utm_source=private-contact'), 'direct');
  assert.throws(() => analyticsEvent('arbitrary')); assert.match(inquiryText(inquiry()), /尚非正式預約/);
});
