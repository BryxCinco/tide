// Critical C — quest completion race.
//   PATCH /api/quests/:id { is_completed: true } read is_completed, then updated without
//   re-checking it. Two requests fired together (a double-tap, or a script) both pass the read
//   and both award XP, streak bumps, and the completion bonus — and the second can read the
//   xp the first already bonused and bonus it again.
//
// Note: awardXp itself is read-modify-write, so concurrent awards can lose an update and make
// total_xp look right by accident. The tests count awardXp calls, not just the total.

process.env.SUPABASE_URL = 'https://fake.supabase.co';
jest.mock('../../lib/supabaseClient', () => require('../helpers/fakeSupabase').clientModule);
jest.mock('../../lib/xpService', () => {
  const actual = jest.requireActual('../../lib/xpService');
  return { ...actual, awardXp: jest.fn(actual.awardXp) };
});

const request = require('supertest');
const fake = require('../helpers/fakeSupabase');
const { makeApp } = require('../helpers/makeApp');
const { awardXp } = require('../../lib/xpService');
const { applyCompletionBonus, computeQuestXp } = require('../../lib/questXp');

const app = makeApp('/api/quests', require('../../routes/quests'));
const USER = 'user-racer';
const auth = { Authorization: `Bearer ${USER}` };
const TODAY = new Date().toISOString().slice(0, 10);

function completeConcurrently(id, n) {
  return Promise.all(Array.from({ length: n }, () => request(app).patch(`/api/quests/${id}`).set(auth).send({ is_completed: true })));
}

async function createQuest(body = {}) {
  const res = await request(app).post('/api/quests').set(auth).send({ title: 'race me', category: 'focus', ...body });
  return res.body.quest;
}

beforeEach(() => {
  fake.reset();
  awardXp.mockClear();
});

describe('concurrent completion of the same quest', () => {
  test('a-c) two simultaneous completes: exactly one 200, the other 409 quest_locked', async () => {
    const quest = await createQuest();
    const results = await completeConcurrently(quest.id, 2);
    const statuses = results.map((r) => r.status).sort();

    expect(statuses).toEqual([200, 409]);
    expect(results.find((r) => r.status === 409).body.code).toBe('quest_locked');
  });

  test('d) XP is awarded exactly once', async () => {
    const quest = await createQuest();
    await completeConcurrently(quest.id, 2);

    const questAwards = awardXp.mock.calls.filter(([, , reason]) => reason === 'quest completed');
    expect(questAwards).toHaveLength(1);
    expect(questAwards[0][1]).toBe(computeQuestXp(1, 1.0));
  });

  test('d) with streak + diversity bonuses active, the bonus is applied once, not compounded', async () => {
    fake.table('streaks').push({ user_id: USER, current_streak: 5, longest_streak: 5, last_activity_date: null });
    // Two other categories already done today, so this completion brings it to 3 -> diversity.
    fake.table('quests').push(
      { id: 'done-1', user_id: USER, date: TODAY, category: 'journal', is_completed: true, is_active: true, xp: 15 },
      { id: 'done-2', user_id: USER, date: TODAY, category: 'tasks', is_completed: true, is_active: true, xp: 15 },
    );
    const quest = await createQuest({ tier: 5, difficulty: 1.2 });
    const expected = applyCompletionBonus(quest.xp, 5, true); // 420 * 1.5 * 1.2 = 756

    await completeConcurrently(quest.id, 2);

    const questAwards = awardXp.mock.calls.filter(([, , reason]) => reason === 'quest completed');
    expect(questAwards.map(([, amount]) => amount)).toEqual([expected]);
    expect(fake.table('quests').find((q) => q.id === quest.id).xp).toBe(expected);
  });

  test('a burst of 5 still completes once', async () => {
    const quest = await createQuest();
    const results = await completeConcurrently(quest.id, 5);

    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    expect(awardXp.mock.calls.filter(([, , reason]) => reason === 'quest completed')).toHaveLength(1);
  });
});

describe('unchanged behavior', () => {
  test('a single complete still works and returns the bonused quest', async () => {
    const quest = await createQuest();
    const res = await request(app).patch(`/api/quests/${quest.id}`).set(auth).send({ is_completed: true });
    expect(res.status).toBe(200);
    expect(res.body.quest.is_completed).toBe(true);
    expect(res.body.xp.xpGained).toBe(quest.xp);
  });

  test('works whether is_completed is NULL (no DB default) or an explicit false', async () => {
    // The base schema isn't in the repo, so both shapes have to complete exactly once.
    fake.table('quests').push(
      { id: 'q-null', user_id: USER, date: TODAY, category: 'focus', xp: 15, is_active: true },
      { id: 'q-false', user_id: USER, date: TODAY, category: 'focus', xp: 15, is_active: true, is_completed: false },
    );
    for (const id of ['q-null', 'q-false']) {
      const results = await completeConcurrently(id, 2);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    }
  });

  test('completing an already-completed quest is still 409', async () => {
    const quest = await createQuest();
    await request(app).patch(`/api/quests/${quest.id}`).set(auth).send({ is_completed: true });
    const again = await request(app).patch(`/api/quests/${quest.id}`).set(auth).send({ is_completed: true });
    expect(again.status).toBe(409);
  });

  test('editing an open quest still works; unknown id is still 404', async () => {
    const quest = await createQuest();
    const edit = await request(app).patch(`/api/quests/${quest.id}`).set(auth).send({ title: 'renamed' });
    expect(edit.status).toBe(200);
    expect(edit.body.quest.title).toBe('renamed');

    const missing = await request(app).patch('/api/quests/nope').set(auth).send({ is_completed: true });
    expect(missing.status).toBe(404);
  });
});
