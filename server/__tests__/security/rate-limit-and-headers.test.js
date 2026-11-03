// Rate limiting + security headers, tested through the real app.js so middleware ORDER is
// covered too (trust proxy, CORS before the limiter, preflights not counted).
//
// Each test uses its own client IP via X-Forwarded-For (app.js trusts one proxy hop, as on
// Vercel), so the per-IP limiters don't bleed between tests.

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
  retrieveStats: jest.fn(() => Promise.resolve({})),
  retrieveRelevantContext: jest.fn(() => Promise.resolve([])),
  buildContextString: jest.fn(() => ''),
}));

const request = require('supertest');
const app = require('../../app');
const { LIMITS } = require('../../lib/rateLimits');

// One listening server for the whole file — request(app) would start a new one per request,
// which is what makes a 1000-request test slow.
let server;
beforeAll(() => {
  server = app.listen(0);
});
afterAll(() => new Promise((resolve) => server.close(resolve)));
// The global-limit tests send 1000+ requests each.
jest.setTimeout(60000);

const ORIGIN = 'https://tide-rust.vercel.app';
let ipCounter = 0;
const freshIp = () => `203.0.113.${++ipCounter}`;

async function hit(n, fn) {
  const results = [];
  for (let i = 0; i < n; i++) results.push(await fn(i));
  return results;
}

describe('security headers (helmet)', () => {
  test('responses carry helmet headers and no X-Powered-By', async () => {
    const res = await request(server).get('/').set('X-Forwarded-For', freshIp());
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('global limit: 1000 requests / 15 min per IP', () => {
  const GLOBAL = LIMITS.global.limit;

  test('is sized for a shared Wi-Fi (thesis demo): 1000 per 15 minutes', () => {
    expect(LIMITS.global).toEqual({ windowMs: 15 * 60 * 1000, limit: 1000 });
  });

  test('the request after the limit from one IP is 429 — as JSON, with CORS headers the browser can read', async () => {
    const ip = freshIp();
    const ok = await hit(GLOBAL, () => request(server).get('/').set('X-Forwarded-For', ip).set('Origin', ORIGIN));
    expect(ok.every((r) => r.status === 200)).toBe(true);

    const limited = await request(server).get('/').set('X-Forwarded-For', ip).set('Origin', ORIGIN);
    expect(limited.status).toBe(429);
    expect(limited.body.error).toEqual(expect.any(String));
    expect(limited.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(limited.headers['retry-after']).toBeDefined();
  });

  test('another IP is unaffected', async () => {
    const busy = freshIp();
    await hit(GLOBAL + 1, () => request(server).get('/').set('X-Forwarded-For', busy));
    const other = await request(server).get('/').set('X-Forwarded-For', freshIp());
    expect(other.status).toBe(200);
  });

  test('CORS preflights do not use up the limit', async () => {
    const ip = freshIp();
    await hit(GLOBAL + 50, () =>
      request(server)
        .options('/api/tasks')
        .set('X-Forwarded-For', ip)
        .set('Origin', ORIGIN)
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'authorization'),
    );
    const res = await request(server).get('/').set('X-Forwarded-For', ip);
    expect(res.status).toBe(200);
  });
});

describe('login limit: 5 failed attempts / 15 min per IP', () => {
  const login = (ip, password) =>
    request(server).post('/api/auth/login').set('X-Forwarded-For', ip).send({ email: 'someone@test.local', password });

  test('the 6th failed attempt is 429, even with the right password', async () => {
    const ip = freshIp();
    const failed = await hit(5, () => login(ip, 'wrong'));
    expect(failed.every((r) => r.status === 401)).toBe(true);

    expect((await login(ip, 'wrong')).status).toBe(429);
    expect((await login(ip, 'correct-password')).status).toBe(429);
  });

  test('successful logins do not count (shared Wi-Fi / NAT can keep signing in)', async () => {
    const ip = freshIp();
    const ok = await hit(8, () => login(ip, 'correct-password'));
    expect(ok.every((r) => r.status === 200)).toBe(true);
  });
});

describe('AI Coach limit: 20 requests / minute per user', () => {
  // An empty body is rejected by the handler with 400 before any LLM call — still a request
  // the limiter has to count.
  const chat = (ip, user) => request(server).post('/api/chat').set('X-Forwarded-For', ip).set('Authorization', `Bearer ${user}`).send({});

  test('the 21st request from one user is 429', async () => {
    const ip = freshIp();
    const first = await hit(20, () => chat(ip, 'chatty-user'));
    expect(first.every((r) => r.status === 400)).toBe(true);
    expect((await chat(ip, 'chatty-user')).status).toBe(429);
  });

  test('keyed by user, not IP: another user on the same IP is unaffected', async () => {
    const ip = freshIp();
    await hit(21, () => chat(ip, 'user-one'));
    expect((await chat(ip, 'user-two')).status).toBe(400);
  });

  test('a user switching IPs is still limited', async () => {
    await hit(20, () => chat(freshIp(), 'roaming-user'));
    expect((await chat(freshIp(), 'roaming-user')).status).toBe(429);
  });
});
