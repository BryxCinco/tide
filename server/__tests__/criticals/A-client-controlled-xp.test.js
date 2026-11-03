// Critical A — XP is taken from the client.
//   POST/PATCH /api/quests accept `xp` from req.body, and POST /api/sessions turns an
//   uncapped `duration_seconds` straight into XP (1 per minute). Either one puts any account
//   at the top of the leaderboard in two requests.

process.env.SUPABASE_URL = 'https://fake.supabase.co';
jest.mock('../../lib/supabaseClient', () => require('../helpers/fakeSupabase').clientModule);
jest.mock('../../lib/embeddingPipeline', () => ({
  upsertEmbedding: jest.fn(() => Promise.resolve()),
  deleteEmbedding: jest.fn(() => Promise.resolve()),
  buildSessionContent: jest.fn(() => ''),
}));

const request = require('supertest');
const fake = require('../helpers/fakeSupabase');
const { makeApp } = require('../helpers/makeApp');
const { computeQuestXp } = require('../../lib/questXp');

const questsApp = makeApp('/api/quests', require('../../routes/quests'));
const sessionsApp = makeApp('/api/sessions', require('../../routes/sessions'));

const USER = 'user-attacker';
const auth = { Authorization: `Bearer ${USER}` };

// Most XP one legit quest can ever pay out: tier 5 (350) x max difficulty (1.2) x max streak
// bonus (1.5) x diversity bonus (1.2).
const MAX_LEGIT_QUEST_XP = Math.round(350 * 1.2 * 1.5 * 1.2);
const TWELVE_HOURS = 12 * 60 * 60;

function totalXp() {
  return fake.table('user_levels').find((r) => r.user_id === USER)?.total_xp ?? 0;
}

beforeEach(() => fake.reset());

describe('quests: XP is computed server-side, never taken from the body', () => {
  test('POST ignores a client-supplied xp and completing it pays a legit amount', async () => {
    const created = await request(questsApp).post('/api/quests').set(auth).send({ title: 'free xp', xp: 9999999 });
    expect(created.status).toBe(201);
    expect(created.body.quest.xp).toBe(computeQuestXp(1, 1.0));

    const done = await request(questsApp).patch(`/api/quests/${created.body.quest.id}`).set(auth).send({ is_completed: true });
    expect(done.status).toBe(200);
    expect(totalXp()).toBeLessThanOrEqual(MAX_LEGIT_QUEST_XP);
  });

  test('PATCH cannot set xp before completing', async () => {
    const created = await request(questsApp).post('/api/quests').set(auth).send({ title: 'edit me' });
    const id = created.body.quest.id;

    await request(questsApp).patch(`/api/quests/${id}`).set(auth).send({ xp: 9999999 });
    await request(questsApp).patch(`/api/quests/${id}`).set(auth).send({ is_completed: true });

    expect(totalXp()).toBeLessThanOrEqual(MAX_LEGIT_QUEST_XP);
  });

  test('tier outside 1-5 is rejected', async () => {
    for (const tier of [0, 6, 99, -1, 2.5, 'legendary']) {
      const res = await request(questsApp).post('/api/quests').set(auth).send({ title: 't', tier });
      expect(res.status).toBe(400);
    }
    const patch = await request(questsApp)
      .patch(`/api/quests/${(await request(questsApp).post('/api/quests').set(auth).send({ title: 'p' })).body.quest.id}`)
      .set(auth)
      .send({ tier: 99 });
    expect(patch.status).toBe(400);
  });

  test('difficulty is clamped to 0.8-1.2 and a non-number falls back to 1.0', async () => {
    const high = await request(questsApp).post('/api/quests').set(auth).send({ title: 'h', tier: 5, difficulty: 50 });
    expect(high.body.quest.xp).toBe(computeQuestXp(5, 1.2));

    const junk = await request(questsApp).post('/api/quests').set(auth).send({ title: 'j', tier: 2, difficulty: 'lots' });
    expect(junk.body.quest.xp).toBe(computeQuestXp(2, 1.0));
  });
});

describe('sessions: duration and timestamps are validated', () => {
  test('a huge duration is rejected and awards nothing', async () => {
    const res = await request(sessionsApp).post('/api/sessions').set(auth).send({ duration_seconds: 99999999 });
    expect(res.status).toBe(400);
    expect(totalXp()).toBe(0);
    expect(fake.table('time_logs')).toHaveLength(0);
  });

  test('12h is the cap: exactly 12h is accepted, one second more is not', async () => {
    expect((await request(sessionsApp).post('/api/sessions').set(auth).send({ duration_seconds: TWELVE_HOURS })).status).toBe(201);
    expect((await request(sessionsApp).post('/api/sessions').set(auth).send({ duration_seconds: TWELVE_HOURS + 1 })).status).toBe(400);
  });

  test('non-positive or non-numeric durations are rejected', async () => {
    for (const duration_seconds of [-600, 'abc', '3600', 12.5e9]) {
      const res = await request(sessionsApp).post('/api/sessions').set(auth).send({ duration_seconds });
      expect(res.status).toBe(400);
    }
  });

  test('future started_at / ended_at are rejected, a normal session is not', async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect((await request(sessionsApp).post('/api/sessions').set(auth).send({ duration_seconds: 60, ended_at: tomorrow })).status).toBe(400);
    expect((await request(sessionsApp).post('/api/sessions').set(auth).send({ duration_seconds: 60, started_at: tomorrow })).status).toBe(400);
    expect((await request(sessionsApp).post('/api/sessions').set(auth).send({ duration_seconds: 60, ended_at: 'not a date' })).status).toBe(400);

    const now = new Date();
    const ok = await request(sessionsApp)
      .post('/api/sessions')
      .set(auth)
      .send({ duration_seconds: 1500, started_at: new Date(now - 1500 * 1000).toISOString(), ended_at: now.toISOString() });
    expect(ok.status).toBe(201);
    expect(ok.body.xp.xpGained).toBe(25);
  });
});
