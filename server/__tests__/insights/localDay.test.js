const { parseTz, localKey, windowBounds } = require('../../lib/localDay');

describe('parseTz', () => {
  test('accepts whole minutes within ±14h', () => {
    expect(parseTz('480')).toBe(480);
    expect(parseTz('-300')).toBe(-300);
  });
  test('garbage or out-of-range falls back to UTC', () => {
    expect(parseTz('abc')).toBe(0);
    expect(parseTz('9999')).toBe(0);
    expect(parseTz(undefined)).toBe(0);
  });
});

describe('localKey', () => {
  test('a 04:00 PH session (20:00Z the day before) is on the local day', () => {
    expect(localKey('2026-11-27T20:00:00.000Z', 480)).toBe('2026-11-28');
    expect(localKey('2026-11-27T20:00:00.000Z', 0)).toBe('2026-11-27');
  });
});

describe('windowBounds', () => {
  test('one local PH day spans 16:00Z to 15:59:59.999Z', () => {
    const b = windowBounds(1, '2026-11-28', 480);
    expect(b.startIso).toBe('2026-11-27T16:00:00.000Z');
    expect(b.endIso).toBe('2026-11-28T15:59:59.999Z');
    expect(b.keys).toEqual(['2026-11-28']);
  });
});
