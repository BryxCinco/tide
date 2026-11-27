import assert from 'node:assert/strict';
import { test } from 'node:test';

import { splitWidgets } from './dashboardLayout.ts';

test('small widgets go to the rail, everything else to main, order kept', () => {
  const { main, rail } = splitWidgets([
    { id: 'a', size: 'full' },
    { id: 'b', size: 'sm' },
    { id: 'c', size: 'md' },
    { id: 'd', size: 'sm' },
  ]);
  assert.deepEqual(main.map((w) => w.id), ['a', 'c']);
  assert.deepEqual(rail.map((w) => w.id), ['b', 'd']);
});

test('no widgets → both columns empty', () => {
  assert.deepEqual(splitWidgets([]), { main: [], rail: [] });
});
