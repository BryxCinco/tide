import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canUseServerData, setGuestMode, setHasAuthToken } from './authFlags.ts';

test('a guest (demo) session never calls the server — its fake token would 401 and log them out', () => {
  setGuestMode(true);
  setHasAuthToken(true);
  assert.equal(canUseServerData(), false);
});

test('a signed-in user with a token can', () => {
  setGuestMode(false);
  setHasAuthToken(true);
  assert.equal(canUseServerData(), true);
});

test('no token yet → no server calls', () => {
  setGuestMode(false);
  setHasAuthToken(false);
  assert.equal(canUseServerData(), false);
});
