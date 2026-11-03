// Critical A2 — the AI Coach's startTimer tool awarded XP at session START from the
// PLANNED duration ("start a 100000-minute timer" = +100000 XP from one chat message), and
// wrote a time_logs row ending in the future. The tool must only tell the client to open the
// Timer screen; POST /api/sessions (on stop) stays the single source of session XP.
//
// Payload contract under test (what the handler returns):
//   {
//     navigate: { route: '/timer', params: { activityName: string, durationMinutes: number | null } },
//     message: string,
//   }

process.env.SUPABASE_URL = 'https://fake.supabase.co';
jest.mock('../../lib/supabaseClient', () => require('../helpers/fakeSupabase').clientModule);
jest.mock('../../lib/embeddingPipeline', () => ({
  upsertEmbedding: jest.fn(() => Promise.resolve()),
  deleteEmbedding: jest.fn(() => Promise.resolve()),
  buildTaskContent: jest.fn(() => ''),
  buildJournalContent: jest.fn(() => ''),
  buildSessionContent: jest.fn(() => ''),
}));
jest.mock('../../lib/ragService', () => ({
  retrieveStats: jest.fn(),
  retrieveRelevantContext: jest.fn(),
}));
jest.mock('../../lib/xpService', () => {
  const actual = jest.requireActual('../../lib/xpService');
  return { ...actual, awardXp: jest.fn(actual.awardXp) };
});

const fake = require('../helpers/fakeSupabase');
const { awardXp } = require('../../lib/xpService');
const { toolHandlers } = require('../../lib/tools');

const USER = 'user-attacker';
const STARTING_XP = 50;

function totalXp() {
  return fake.table('user_levels').find((r) => r.user_id === USER)?.total_xp ?? 0;
}

beforeEach(() => {
  fake.reset();
  awardXp.mockClear();
  fake.table('user_levels').push({ user_id: USER, total_xp: STARTING_XP, level: 1 });
});

describe('AI startTimer: never logs a session, never awards XP', () => {
  test('a) durationMinutes: 100000 awards 0 XP', async () => {
    await toolHandlers.startTimer({ userId: USER, activityName: 'Reading', durationMinutes: 100000 });
    expect(awardXp).not.toHaveBeenCalled();
    expect(totalXp()).toBe(STARTING_XP);
  });

  test('b) it does not insert a time_logs row', async () => {
    await toolHandlers.startTimer({ userId: USER, activityName: 'Reading', durationMinutes: 100000 });
    expect(fake.table('time_logs')).toHaveLength(0);
  });

  test('c) it returns a navigate payload that opens the Timer screen', async () => {
    const withDuration = await toolHandlers.startTimer({ userId: USER, activityName: 'Deep work', durationMinutes: 25 });
    expect(withDuration).toEqual({
      navigate: { route: '/timer', params: { activityName: 'Deep work', durationMinutes: 25 } },
      message: expect.any(String),
    });

    const openEnded = await toolHandlers.startTimer({ userId: USER, activityName: 'Deep work' });
    expect(openEnded.navigate).toEqual({ route: '/timer', params: { activityName: 'Deep work', durationMinutes: null } });
    // No session exists yet, so the reply must not claim one was logged/started.
    expect(openEnded.session).toBeUndefined();
  });

  test('d) a normal 25-minute call also awards 0 XP and inserts nothing', async () => {
    await toolHandlers.startTimer({ userId: USER, activityName: 'Deep work', durationMinutes: 25 });
    expect(awardXp).not.toHaveBeenCalled();
    expect(totalXp()).toBe(STARTING_XP);
    expect(fake.table('time_logs')).toHaveLength(0);
  });

  test('missing activityName still returns the existing error', async () => {
    const res = await toolHandlers.startTimer({ userId: USER, activityName: '  ' });
    expect(res.error).toBe('activityName is required');
  });
});
