import assert from 'node:assert/strict';
import { test } from 'node:test';

import { averageLevel, waveLevel } from './waves.ts';

test('no days → a calm low tide', () => {
  assert.deepEqual(averageLevel([]), { score: 0, level: 'low' });
});

test('average of 80, 80, 20 is 60 → high', () => {
  assert.deepEqual(averageLevel([{ score: 80 }, { score: 80 }, { score: 20 }]), { score: 60, level: 'high' });
});

test('client thresholds match the server: 24 low, 25 mid, 50 high, 80 tsunami', () => {
  assert.deepEqual([24, 25, 49, 50, 79, 80].map(waveLevel), ['low', 'mid', 'mid', 'high', 'high', 'tsunami']);
});
