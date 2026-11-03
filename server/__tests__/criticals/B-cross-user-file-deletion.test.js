// Critical B — cross-user file deletion.
//   deleteIfOwned() only checked that a URL pointed into the bucket, not whose folder it was
//   in. Any non-data: value passed through uploadIfDataUri/uploadJournalPhotos unchanged, so:
//     1. PATCH /api/profile { avatar_url: <victim's avatar URL> }   -> stored as-is
//     2. PATCH /api/profile { avatar_url: <any new data: URI> }    -> "previous" avatar
//        (the victim's) is deleted with the service key.
//   Same for journal photo_urls (edit away the planted URL, or delete the entry).

process.env.SUPABASE_URL = 'https://fake.supabase.co';
jest.mock('../../lib/supabaseClient', () => require('../helpers/fakeSupabase').clientModule);
jest.mock('../../lib/embeddingPipeline', () => ({
  upsertEmbedding: jest.fn(() => Promise.resolve()),
  deleteEmbedding: jest.fn(() => Promise.resolve()),
  buildJournalContent: jest.fn(() => ''),
}));

const request = require('supertest');
const fake = require('../helpers/fakeSupabase');
const { makeApp } = require('../helpers/makeApp');
const { deleteIfOwned, AVATARS_BUCKET, JOURNAL_PHOTOS_BUCKET } = require('../../lib/storage');

const profileApp = makeApp('/api/profile', require('../../routes/profile'));
const journalsApp = makeApp('/api/journal-entries', require('../../routes/journals'));

const ATTACKER = 'user-attacker';
const VICTIM = 'user-victim';
const asAttacker = { Authorization: `Bearer ${ATTACKER}` };

const publicUrl = (bucket, path) => `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
const VICTIM_AVATAR_PATH = `${VICTIM}/avatar-1.png`;
const VICTIM_PHOTO_PATH = `${VICTIM}/1-0.png`;
const VICTIM_AVATAR_URL = publicUrl(AVATARS_BUCKET, VICTIM_AVATAR_PATH);
const VICTIM_PHOTO_URL = publicUrl(JOURNAL_PHOTOS_BUCKET, VICTIM_PHOTO_PATH);
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

const files = (bucket) => Object.keys(fake.db.storage[bucket] || {});
const tick = () => new Promise((r) => setTimeout(r, 5)); // uploads are named by Date.now()
const settle = () => new Promise((r) => setTimeout(r, 20)); // fire-and-forget cleanups

beforeEach(() => {
  fake.reset();
  fake.db.storage[AVATARS_BUCKET] = { [VICTIM_AVATAR_PATH]: Buffer.from('v') };
  fake.db.storage[JOURNAL_PHOTOS_BUCKET] = { [VICTIM_PHOTO_PATH]: Buffer.from('v') };
  fake.table('profiles').push({ id: VICTIM, avatar_url: VICTIM_AVATAR_URL }, { id: ATTACKER, avatar_url: null });
});

describe('a) deleteIfOwned only deletes files under the caller’s own folder', () => {
  test('another user’s file is left alone', async () => {
    await deleteIfOwned(VICTIM_AVATAR_URL, AVATARS_BUCKET, ATTACKER);
    expect(files(AVATARS_BUCKET)).toContain(VICTIM_AVATAR_PATH);
  });

  test('path traversal out of the caller’s folder is left alone', async () => {
    for (const path of [`${ATTACKER}/../${VICTIM_AVATAR_PATH}`, `${ATTACKER}/%2e%2e/${VICTIM_AVATAR_PATH}`]) {
      await deleteIfOwned(publicUrl(AVATARS_BUCKET, path), AVATARS_BUCKET, ATTACKER);
    }
    expect(files(AVATARS_BUCKET)).toContain(VICTIM_AVATAR_PATH);
  });

  test('without a userId nothing is deleted', async () => {
    await deleteIfOwned(VICTIM_AVATAR_URL, AVATARS_BUCKET);
    expect(files(AVATARS_BUCKET)).toContain(VICTIM_AVATAR_PATH);
  });

  test('the caller’s own file is deleted', async () => {
    fake.db.storage[AVATARS_BUCKET][`${ATTACKER}/avatar-9.png`] = Buffer.from('a');
    await deleteIfOwned(publicUrl(AVATARS_BUCKET, `${ATTACKER}/avatar-9.png`), AVATARS_BUCKET, ATTACKER);
    expect(files(AVATARS_BUCKET)).not.toContain(`${ATTACKER}/avatar-9.png`);
  });
});

describe('b) PATCH /api/profile rejects another user’s storage URL', () => {
  test('the full exploit: plant victim avatar, then upload a new one', async () => {
    const plant = await request(profileApp).patch('/api/profile').set(asAttacker).send({ avatar_url: VICTIM_AVATAR_URL });
    expect(plant.status).toBe(400);

    await request(profileApp).patch('/api/profile').set(asAttacker).send({ avatar_url: PNG });
    expect(files(AVATARS_BUCKET)).toContain(VICTIM_AVATAR_PATH);
  });

  test('cover_value pointing at another user’s file is rejected too', async () => {
    const res = await request(profileApp).patch('/api/profile').set(asAttacker).send({ cover_value: VICTIM_AVATAR_URL });
    expect(res.status).toBe(400);
  });

  test('a previously planted victim URL is still never deleted on replace', async () => {
    // Simulates a row poisoned before this fix shipped.
    fake.table('profiles').find((p) => p.id === ATTACKER).avatar_url = VICTIM_AVATAR_URL;
    await request(profileApp).patch('/api/profile').set(asAttacker).send({ avatar_url: PNG });
    expect(files(AVATARS_BUCKET)).toContain(VICTIM_AVATAR_PATH);
  });

  test('non-storage values still pass: Google avatar URL, gradient id, hex color', async () => {
    const google = 'https://lh3.googleusercontent.com/a/abc123=s96-c';
    const res = await request(profileApp)
      .patch('/api/profile')
      .set(asAttacker)
      .send({ avatar_url: google, cover_type: 'gradient', cover_value: 'aurora' });
    expect(res.status).toBe(200);
    expect(res.body.profile.avatar_url).toBe(google);

    const hex = await request(profileApp).patch('/api/profile').set(asAttacker).send({ cover_type: 'color', cover_value: '#0EA5E9' });
    expect(hex.status).toBe(200);
  });
});

describe('c) journal photo_urls must be uploads or the caller’s own photos', () => {
  test('create with another user’s photo URL is rejected', async () => {
    const res = await request(journalsApp)
      .post('/api/journal-entries')
      .set(asAttacker)
      .send({ title: 't', content: 'c', photo_urls: [VICTIM_PHOTO_URL] });
    expect(res.status).toBe(400);
    expect(fake.table('journal_entries')).toHaveLength(0);
  });

  test('create with an arbitrary external URL is rejected', async () => {
    const res = await request(journalsApp)
      .post('/api/journal-entries')
      .set(asAttacker)
      .send({ title: 't', content: 'c', photo_urls: ['https://evil.example/pixel.png'] });
    expect(res.status).toBe(400);
  });

  test('edit with another user’s photo URL is rejected', async () => {
    const created = await request(journalsApp).post('/api/journal-entries').set(asAttacker).send({ title: 't', content: 'c' });
    const res = await request(journalsApp)
      .patch(`/api/journal-entries/${created.body.entry.id}`)
      .set(asAttacker)
      .send({ photo_urls: [VICTIM_PHOTO_URL] });
    expect(res.status).toBe(400);
  });

  test('a previously planted victim URL is not deleted on edit or on entry delete', async () => {
    fake.table('journal_entries').push({ id: 'e1', user_id: ATTACKER, title: 't', content: 'c', photo_urls: [VICTIM_PHOTO_URL] });

    await request(journalsApp).patch('/api/journal-entries/e1').set(asAttacker).send({ photo_urls: [] });
    await settle();
    expect(files(JOURNAL_PHOTOS_BUCKET)).toContain(VICTIM_PHOTO_PATH);

    fake.table('journal_entries').find((e) => e.id === 'e1').photo_urls = [VICTIM_PHOTO_URL];
    await request(journalsApp).delete('/api/journal-entries/e1').set(asAttacker);
    await settle();
    expect(files(JOURNAL_PHOTOS_BUCKET)).toContain(VICTIM_PHOTO_PATH);
  });
});

describe('d) legit flows still work', () => {
  test('replacing your own avatar saves the new file and deletes the old one', async () => {
    const first = await request(profileApp).patch('/api/profile').set(asAttacker).send({ avatar_url: PNG });
    expect(first.status).toBe(200);
    const firstUrl = first.body.profile.avatar_url;
    const firstPath = firstUrl.split(`/${AVATARS_BUCKET}/`)[1];
    expect(firstPath.startsWith(`${ATTACKER}/`)).toBe(true);
    expect(files(AVATARS_BUCKET)).toContain(firstPath);

    await tick();
    const second = await request(profileApp).patch('/api/profile').set(asAttacker).send({ avatar_url: PNG });
    expect(second.status).toBe(200);
    const secondPath = second.body.profile.avatar_url.split(`/${AVATARS_BUCKET}/`)[1];
    expect(secondPath).not.toBe(firstPath);
    expect(files(AVATARS_BUCKET)).toContain(secondPath);
    expect(files(AVATARS_BUCKET)).not.toContain(firstPath);
    expect(files(AVATARS_BUCKET)).toContain(VICTIM_AVATAR_PATH);
  });

  test('re-sending your own current avatar URL is accepted', async () => {
    const first = await request(profileApp).patch('/api/profile').set(asAttacker).send({ avatar_url: PNG });
    const res = await request(profileApp).patch('/api/profile').set(asAttacker).send({ avatar_url: first.body.profile.avatar_url, name: 'x' });
    expect(res.status).toBe(200);
  });

  test('journal: keep one own photo, drop another — only the dropped one is deleted', async () => {
    const created = await request(journalsApp)
      .post('/api/journal-entries')
      .set(asAttacker)
      .send({ title: 't', content: 'c', photo_urls: [PNG, PNG] });
    expect(created.status).toBe(201);
    const [keep, drop] = created.body.entry.photo_urls;
    const pathOf = (u) => u.split(`/${JOURNAL_PHOTOS_BUCKET}/`)[1];

    const edited = await request(journalsApp)
      .patch(`/api/journal-entries/${created.body.entry.id}`)
      .set(asAttacker)
      .send({ photo_urls: [keep] });
    expect(edited.status).toBe(200);
    await settle();
    expect(files(JOURNAL_PHOTOS_BUCKET)).toContain(pathOf(keep));
    expect(files(JOURNAL_PHOTOS_BUCKET)).not.toContain(pathOf(drop));

    await request(journalsApp).delete(`/api/journal-entries/${created.body.entry.id}`).set(asAttacker);
    await settle();
    expect(files(JOURNAL_PHOTOS_BUCKET)).not.toContain(pathOf(keep));
    expect(files(JOURNAL_PHOTOS_BUCKET)).toContain(VICTIM_PHOTO_PATH);
  });
});
