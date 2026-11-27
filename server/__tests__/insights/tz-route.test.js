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
