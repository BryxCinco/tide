import assert from 'node:assert/strict';
import { test } from 'node:test';

import { groupByRecency } from './groupByRecency.ts';

const now = new Date(2026, 10, 27, 12, 0);
const at = (y: number, m: number, d: number, h = 9) => new Date(y, m, d, h).toISOString();

test('splits items into Today, This week and Earlier', () => {
  const items = [{ d: at(2026, 10, 27) }, { d: at(2026, 10, 24) }, { d: at(2026, 9, 1) }];
  const groups = groupByRecency(items, (i) => i.d, now);
  assert.deepEqual(groups.map((g) => g.group), ['Today', 'This week', 'Earlier']);
  assert.deepEqual(groups.map((g) => g.items.length), [1, 1, 1]);
});

test('"This week" covers the 7 days before today', () => {
  const groups = groupByRecency([{ d: at(2026, 10, 20, 13) }, { d: at(2026, 10, 19, 23) }], (i) => i.d, now);
  assert.deepEqual(groups.map((g) => [g.group, g.items.length]), [['This week', 1], ['Earlier', 1]]);
});

test('omits empty groups and keeps input order inside a group', () => {
  const items = [{ d: at(2026, 10, 27, 11), n: 1 }, { d: at(2026, 10, 27, 8), n: 2 }];
  const groups = groupByRecency(items, (i) => i.d, now);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].items.map((i) => i.n), [1, 2]);
});

test('empty input gives no groups', () => {
  assert.deepEqual(groupByRecency([], () => '', now), []);
});
