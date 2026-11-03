// Critical D — awardXp lost updates.
//   awardXp read total_xp, added in JS, then upserted the sum. Two awards in flight at once
//   (quest completion + streak milestone bonus, two tabs, a double-tap) both read the same
//   total and the later write erased the earlier one. The fix moves the increment into one
//   SQL statement (migrations/014_atomic_xp.sql, called via .rpc('award_xp')).

process.env.SUPABASE_URL = 'https://fake.supabase.co';
jest.mock('../../lib/supabaseClient', () => require('../helpers/fakeSupabase').clientModule);

const fake = require('../helpers/fakeSupabase');
const { awardXp, levelFromXp } = require('../../lib/xpService');

const USER = 'user-xp';
const row = () => fake.table('user_levels').find((r) => r.user_id === USER);

beforeEach(() => fake.reset());

describe('concurrent awards accumulate', () => {
  test('5 concurrent +10 awards on an existing row add up to +50', async () => {
    fake.table('user_levels').push({ user_id: USER, total_xp: 100, level: 2 });
    await Promise.all(Array.from({ length: 5 }, () => awardXp(USER, 10, 'test')));
    expect(row().total_xp).toBe(150);
  });

  test('concurrent awards for a user with no row yet create one row with the full sum', async () => {
    await Promise.all([awardXp(USER, 15, 'quest'), awardXp(USER, 100, 'streak bonus'), awardXp(USER, 25, 'session')]);
    expect(fake.table('user_levels').filter((r) => r.user_id === USER)).toHaveLength(1);
    expect(row().total_xp).toBe(140);
  });

  test('level is recomputed from the final total, not from a stale read', async () => {
    fake.table('user_levels').push({ user_id: USER, total_xp: 380, level: 2 });
    // 380 + 4 x 10 = 420 -> level 3 (level 2 is 100-399 XP, level 3 is 400-899; see levelFromXp)
    await Promise.all(Array.from({ length: 4 }, () => awardXp(USER, 10, 'test')));
    expect(row().total_xp).toBe(420);
    expect(row().level).toBe(levelFromXp(420));
  });
});

describe('return value and edge cases are unchanged', () => {
  test('returns { totalXp, level, leveledUp, xpGained }', async () => {
    fake.table('user_levels').push({ user_id: USER, total_xp: 90, level: 1 });
    const result = await awardXp(USER, 20, 'test');
    expect(result).toEqual({ totalXp: 110, level: 2, leveledUp: true, xpGained: 20 });

    const again = await awardXp(USER, 5, 'test');
    expect(again).toEqual({ totalXp: 115, level: 2, leveledUp: false, xpGained: 5 });
  });

  test('zero, negative or missing amounts are a no-op returning null', async () => {
    for (const amount of [0, -50, undefined, null]) {
      expect(await awardXp(USER, amount, 'test')).toBeNull();
    }
    expect(row()).toBeUndefined();
  });

  test('a database error is thrown, as before', async () => {
    await expect(awardXp(USER, 1.5, 'test')).rejects.toThrow();
  });
});
