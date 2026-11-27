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

import { questColumnBasis, showRail } from './dashboardLayout.ts';

test('rail shows on desktop only when it has something to show', () => {
  assert.equal(showRail({ isDesktop: true, wavesShown: true, railCount: 0 }), true);
  assert.equal(showRail({ isDesktop: true, wavesShown: false, railCount: 2 }), true);
  // Signed in, small widgets off, and the waves request failed → no empty column.
  assert.equal(showRail({ isDesktop: true, wavesShown: false, railCount: 0 }), false);
  assert.equal(showRail({ isDesktop: false, wavesShown: true, railCount: 3 }), false);
});

test('quest columns: before measuring, wide screens start 3-up (no jump), phones 1-up', () => {
  assert.equal(questColumnBasis(undefined, 3, false), '29%');
  assert.equal(questColumnBasis(undefined, 3, true), '96%');
});

test('quest columns follow the measured width (~272px each)', () => {
  assert.equal(questColumnBasis(900, 3, false), '29%');
  assert.equal(questColumnBasis(600, 3, false), '46%');
  assert.equal(questColumnBasis(300, 3, false), '96%');
  assert.equal(questColumnBasis(900, 1, false), '96%');
});
