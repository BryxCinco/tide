import assert from 'node:assert/strict';
import { test } from 'node:test';

import { journalStats } from './journalStats.ts';

const now = new Date('2026-11-28T12:00:00.000Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();

test('counts entries, last 7 days, favorites and plain-text words', () => {
  const stats = journalStats(
    [
      { createdAt: daysAgo(1), isFavorite: true, content: '# Hi\n- [ ] two words' },
      { createdAt: daysAgo(10), isFavorite: false, content: 'one' },
    ],
    now,
  );
  // "Hi" + "two words" + "one" = 4; the "#" and "- [ ]" markers are not words.
  assert.deepEqual(stats, { entries: 2, last7Days: 1, favorites: 1, words: 4 });
});

test('an entry from late yesterday is within the last 7 days', () => {
  assert.equal(journalStats([{ createdAt: daysAgo(0.6), isFavorite: false, content: '' }], now).last7Days, 1);
});

test('no entries → zeros', () => {
  assert.deepEqual(journalStats([], now), { entries: 0, last7Days: 0, favorites: 0, words: 0 });
});
