process.env.SUPABASE_URL = 'https://fake.supabase.co';
jest.mock('../../lib/supabaseClient', () => require('../helpers/fakeSupabase').clientModule);

const request = require('supertest');
const fake = require('../helpers/fakeSupabase');
const { makeApp } = require('../helpers/makeApp');
const { scoreDay, waveLevel } = require('../../lib/waves');

const zero = { focusSeconds: 0, tasks: 0, quests: 0, journal: 0, activities: 0 };

describe('scoreDay', () => {
  test('an empty day scores 0', () => expect(scoreDay(zero)).toBe(0));
  test('everything at its cap scores 100', () => {
    expect(scoreDay({ focusSeconds: 7200, tasks: 5, quests: 3, journal: 1, activities: 3 })).toBe(100);
  });
  test('weights: 1h focus (20) + a journal (10) + one activity (3) = 33', () => {
    expect(scoreDay({ ...zero, focusSeconds: 3600, journal: 1, activities: 1 })).toBe(33);
  });
  test('over-cap values are clamped', () => {
    expect(scoreDay({ ...zero, focusSeconds: 99999 })).toBe(40);
    expect(scoreDay({ ...zero, tasks: 50, quests: 50 })).toBe(40);
  });
});

describe('waveLevel boundaries', () => {
  test.each([
    [0, 'low'], [24, 'low'], [25, 'mid'], [49, 'mid'], [50, 'high'], [79, 'high'], [80, 'tsunami'], [100, 'tsunami'],
  ])('%i → %s', (score, level) => expect(waveLevel(score)).toBe(level));
});

describe('GET /api/insights/waves', () => {
  const app = makeApp('/api/insights', require('../../routes/insights'));
  const USER = 'user-waves';
  const auth = { Authorization: `Bearer ${USER}` };
  beforeEach(() => fake.reset());

  test('no data → 7 calm days ending on the requested local day', async () => {
    const res = await request(app).get('/api/insights/waves?days=7&end=2026-11-28&tz=480').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.waves).toHaveLength(7);
    expect(res.body.waves.every((w) => w.level === 'low' && w.score === 0)).toBe(true);
    expect(res.body.waves[6].date).toBe('2026-11-28');
  });

  test('counts focus, tasks, quests, journal and activities on the local day', async () => {
    fake.table('time_logs').push(
      { user_id: USER, duration_seconds: 3600, ended_at: '2026-11-27T20:00:00.000Z', activity_name: 'Study' },
      { user_id: USER, duration_seconds: 3600, ended_at: '2026-11-28T03:00:00.000Z', activity_name: 'Code' },
    );
    fake.table('tasks').push({ user_id: USER, status: 'done', completed_at: '2026-11-28T01:00:00.000Z' });
    fake.table('quests').push({ user_id: USER, is_completed: true, date: '2026-11-28', is_active: true });
    fake.table('journal_entries').push({ user_id: USER, created_at: '2026-11-27T23:00:00.000Z', mood: 'good' });
    const res = await request(app).get('/api/insights/waves?days=7&end=2026-11-28&tz=480').set(auth);
    const today = res.body.waves[6];
    expect(today).toMatchObject({ date: '2026-11-28', focusSeconds: 7200, tasks: 1, quests: 1, journal: 1, activities: 2 });
    // 40 + 4 + 6.67 + 10 + 6.67 = 67.3 → 67
    expect(today.score).toBe(67);
    expect(today.level).toBe('high');
  });
});
