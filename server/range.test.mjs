import test from 'node:test';
import assert from 'node:assert/strict';
import { getRange, parseCalendarDate } from './range.mjs';

const now = new Date('2026-01-15T13:14:15.456Z');

test('relative ranges use stable cache keys and UTC day boundaries', () => {
  const sevenDay = getRange(new URLSearchParams('range=7d'), now);
  assert.equal(sevenDay.cacheKey, '7d');
  assert.equal(sevenDay.from.toISOString(), '2026-01-09T00:00:00.000Z');
  assert.equal(sevenDay.to.toISOString(), '2026-01-16T00:00:00.000Z');

  const thirtyDay = getRange(new URLSearchParams('range=30d'), now);
  assert.equal(thirtyDay.cacheKey, '30d');
  assert.equal(thirtyDay.from.toISOString(), '2025-12-17T00:00:00.000Z');
  assert.equal(thirtyDay.to.toISOString(), '2026-01-16T00:00:00.000Z');

  const ninetyDay = getRange(new URLSearchParams('range=90d'), now);
  assert.equal(ninetyDay.cacheKey, '90d');
  assert.equal(ninetyDay.from.toISOString(), '2025-10-18T00:00:00.000Z');
  assert.equal(ninetyDay.to.toISOString(), '2026-01-16T00:00:00.000Z');
});

test('custom range builds deterministic cache key and ISO bounds', () => {
  const custom = getRange(new URLSearchParams('range=custom&from=2026-01-01&to=2026-01-05'), now);
  assert.equal(custom.cacheKey, 'custom:2026-01-01:2026-01-05');
  assert.equal(custom.from.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(custom.to.toISOString(), '2026-01-05T23:59:59.999Z');
});

test('calendar parser accepts only strict real YYYY-MM-DD dates', () => {
  assert.ok(parseCalendarDate('2026-02-28'));
  assert.equal(parseCalendarDate('2026-02-31'), null);
  assert.equal(parseCalendarDate('2026-2-01'), null);
  assert.equal(parseCalendarDate('not-a-date'), null);
});

test('custom range rejects missing and invalid values', () => {
  const missing = getRange(new URLSearchParams('range=custom&from=2026-01-01'), now);
  assert.match(missing.error, /requires valid from and to/i);

  const invalidDate = getRange(new URLSearchParams('range=custom&from=bad&to=2026-01-05'), now);
  assert.match(invalidDate.error, /strict YYYY-MM-DD calendar dates/i);

  const impossibleDate = getRange(new URLSearchParams('range=custom&from=2026-02-31&to=2026-03-02'), now);
  assert.match(impossibleDate.error, /strict YYYY-MM-DD calendar dates/i);

  const invalidOrder = getRange(new URLSearchParams('range=custom&from=2026-01-07&to=2026-01-05'), now);
  assert.match(invalidOrder.error, /from must be before or equal to to/i);
});
