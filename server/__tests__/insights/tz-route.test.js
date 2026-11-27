process.env.SUPABASE_URL = 'https://fake.supabase.co';
jest.mock('../../lib/supabaseClient', () => require('../helpers/fakeSupabase').clientModule);

const request = require('supertest');
const fake = require('../helpers/fakeSupabase');
const { makeApp } = require('../helpers/makeApp');

const app = makeApp('/api/insights', require('../../routes/insights'));
const USER = 'user-tz';
const auth = { Authorization: `Bearer ${USER}` };

beforeEach(() => fake.reset());

test('a session ending 04:00 PH time counts on the local day', async () => {
  fake.table('time_logs').push({ user_id: USER, duration_seconds: 3600, ended_at: '2026-11-27T20:00:00.000Z', activity_name: 'Study' });
  const res = await request(app).get('/api/insights/range?days=1&end=2026-11-28&tz=480').set(auth);
  expect(res.status).toBe(200);
  expect(res.body.time[0].date).toBe('2026-11-28');
  expect(res.body.time[0].seconds).toBe(3600);
});

test('without tz the same session stays on its UTC day', async () => {
  fake.table('time_logs').push({ user_id: USER, duration_seconds: 3600, ended_at: '2026-11-27T20:00:00.000Z', activity_name: 'Study' });
  const res = await request(app).get('/api/insights/range?days=1&end=2026-11-28').set(auth);
  expect(res.body.time[0].seconds).toBe(0);
});

describe('every endpoint buckets a 04:00 PH session on the local day', () => {
  const seed = () =>
    fake.table('time_logs').push({ user_id: USER, activity_id: 'a1', duration_seconds: 3600, ended_at: '2026-11-27T20:00:00.000Z', activity_name: 'Study' });

  test('summary: 1 active day and Saturday as the best day', async () => {
    seed();
    const res = await request(app).get('/api/insights/summary?days=1&end=2026-11-28&tz=480').set(auth);
    expect(res.body.totalSeconds).toBe(3600);
    const byId = Object.fromEntries(res.body.weeklySummary.map((i) => [i.id, i.value]));
    expect(byId['active-days']).toBe('1 of 1');
    expect(byId['best-day']).toBe('Saturday');
  });

  test('heatmap: the local day holds the hour', async () => {
    seed();
    const res = await request(app).get('/api/insights/heatmap?days=1&end=2026-11-28&tz=480').set(auth);
    expect(res.body.heatmap[0]).toMatchObject({ date: '2026-11-28', seconds: 3600 });
  });

  test('activity breakdown: last session date is local', async () => {
    seed();
    const res = await request(app).get('/api/insights/activity-breakdown?days=1&end=2026-11-28&tz=480').set(auth);
    expect(res.body.activityBreakdown[0]).toMatchObject({ label: 'Study', seconds: 3600, lastSessionDate: '2026-11-28' });
  });

  test('a garbage tz behaves as UTC instead of failing', async () => {
    seed();
    const res = await request(app).get('/api/insights/range?days=1&end=2026-11-27&tz=abc').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.time[0].seconds).toBe(3600);
  });
});
