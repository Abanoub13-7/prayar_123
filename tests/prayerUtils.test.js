import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanPrayerTime, formatCountdown, getPrayerState } from '../src/utils/prayerUtils.js';

const timings = { Fajr: '04:30 (EET)', Dhuhr: '12:00', Asr: '15:30', Maghrib: '18:00', Isha: '19:30' };

test('cleans API time strings and rejects invalid values', () => {
  assert.equal(cleanPrayerTime('4:05 (EET)'), '04:05');
  assert.equal(cleanPrayerTime('23:59'), '23:59');
  assert.equal(cleanPrayerTime('25:90'), null);
  assert.equal(cleanPrayerTime(undefined), null);
});

test('finds current and next prayers between prayer times', () => {
  const state = getPrayerState(timings, new Date(2026, 0, 2, 13, 0, 0));
  assert.equal(state.current.key, 'Dhuhr');
  assert.equal(state.next.key, 'Asr');
  assert.ok(state.progress > 0 && state.progress < 100);
});

test('handles the period after Isha and before next-day Fajr', () => {
  const state = getPrayerState(timings, new Date(2026, 0, 2, 22, 0, 0));
  assert.equal(state.current.key, 'Isha');
  assert.equal(state.next.key, 'Fajr');
  assert.equal(state.nextDateTime.getDate(), 3);
  assert.ok(state.progress > 0 && state.progress < 100);
});

test('countdown formatting is stable', () => {
  assert.equal(formatCountdown(3_723_000), '01:02:03');
  assert.equal(formatCountdown(-500), '00:00:00');
});
