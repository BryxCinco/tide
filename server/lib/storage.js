const { supabaseAdmin } = require('./supabaseClient');

const AVATARS_BUCKET = 'avatars';
const JOURNAL_PHOTOS_BUCKET = 'journal-photos';
const MAX_JOURNAL_PHOTOS = 3;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DATA_URI_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

function publicUrlPrefix(bucket) {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/`;
}

// Called once at server startup — idempotent, safe to call on every boot. Table changes
// need the Supabase SQL Editor (no DDL access from a service-role client), but Storage
// buckets ARE reachable through it, so this is one piece of setup the server can just do
// for itself instead of adding another manual "run this in the dashboard first" step.
async function ensureBucket(bucketName, opts) {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    console.error('[storage] Could not list buckets:', listError.message);
    return;
  }
  if (buckets.some((b) => b.name === bucketName)) return;

  const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, opts);

  if (createError) {
    console.error(`[storage] Could not create '${bucketName}' bucket:`, createError.message);
  } else {
    console.log(`[storage] Created '${bucketName}' bucket.`);
  }
}

async function ensureAvatarsBucket() {
  return ensureBucket(AVATARS_BUCKET, { public: true, fileSizeLimit: '5MB', allowedMimeTypes: ALLOWED_MIME_TYPES });
}

async function ensureJournalPhotosBucket() {
  return ensureBucket(JOURNAL_PHOTOS_BUCKET, { public: true, fileSizeLimit: '5MB', allowedMimeTypes: ALLOWED_MIME_TYPES });
}

function parseDataUri(dataUri) {
  const match = DATA_URI_PATTERN.exec(dataUri);
  if (!match) return null;
  const [, mime, base64] = match;
  if (!ALLOWED_MIME_TYPES.includes(mime)) return null;
  return { mime, ext: mime.split('/')[1].replace('jpeg', 'jpg'), buffer: Buffer.from(base64, 'base64') };
}

/**
 * If `value` is a base64 `data:` URI (what imageUpload.ts's pickImage() produces
 * client-side), decodes it and uploads it to Storage, returning the public URL. Anything
 * else — an existing https:// URL, a gradient preset id, a hex color, null, undefined —
 * passes through completely unchanged, so profile.js can call this the same way for both
 * avatar_url and cover_value without needing to know which kind of value it's holding.
 * `pathPrefix-<timestamp>.<ext>` (not a fixed filename) so every upload gets a fresh public
 * URL rather than reusing one a browser/CDN might still have cached.
 */
async function uploadIfDataUri(value, pathPrefix, bucket = AVATARS_BUCKET) {
  if (typeof value !== 'string' || !value.startsWith('data:')) {
    return value;
  }

  const parsed = parseDataUri(value);
  if (!parsed) {
    throw new Error('Unsupported image format — use JPEG, PNG, WEBP, or GIF.');
  }

  const path = `${pathPrefix}-${Date.now()}.${parsed.ext}`;
  const { error: uploadError } = await supabaseAdmin.storage.from(bucket).upload(path, parsed.buffer, {
    contentType: parsed.mime,
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/** The object path inside `bucket` if `value` is one of that bucket's public URLs, else null. */
function bucketPath(value, bucket) {
  if (typeof value !== 'string' || !value.startsWith(publicUrlPrefix(bucket))) return null;
  return value.slice(publicUrlPrefix(bucket).length);
}

/** True only for a path inside `${userId}/` — every upload is written there (see the
 * pathPrefix callers). Decoded first and every segment checked, so "me/../them/x.png" and
 * "me/%2e%2e/them/x.png" don't pass as "starts with me/". */
function isOwnPath(path, userId) {
  if (!userId) return false;
  let segments;
  try {
    segments = decodeURIComponent(path).split('/');
  } catch {
    return false;
  }
  return segments.length > 1 && segments[0] === userId && !segments.some((s) => s === '' || s === '.' || s === '..');
}

/** Throws if `value` points into `bucket` but not into the caller's own folder. Anything that
 * isn't one of this bucket's URLs (a data: URI, a Google avatar URL, a gradient id, a hex
 * color, null) is not this check's concern and passes. */
function assertNotOtherUsersFile(value, bucket, userId) {
  const path = bucketPath(value, bucket);
  if (path !== null && !isOwnPath(path, userId)) {
    throw new Error('That image belongs to another account.');
  }
}

/**
 * Best-effort cleanup for a value a field just got replaced with a new upload — deletes it
 * only if it's a file in this bucket under `userId`'s own folder; a gradient id, hex color,
 * unrelated URL, or another user's file is left alone. Runs with the service key, so the
 * ownership check is the only thing stopping a planted URL from deleting someone else's
 * file. Never throws — a failed cleanup is logged, not allowed to fail the profile/journal
 * update it's called after.
 */
async function deleteIfOwned(previousValue, bucket, userId) {
  const path = bucketPath(previousValue, bucket);
  if (path === null) return;
  if (!isOwnPath(path, userId)) {
    console.warn(`[storage] Refused to delete '${bucket}' file outside ${userId || '(no user)'}'s folder`);
    return;
  }

  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) console.error('[storage] Could not delete previous file:', error.message);
}

/** Uploads any data: URIs in `values` (what pickImage() produces client-side) to the
 * journal-photos bucket under `${userId}/`, passing through the caller's own existing photo
 * URLs unchanged — an existing photo kept across an edit is re-sent as its own URL, not
 * re-uploaded. Anything else (another user's photo, an external URL) is rejected: a journal
 * photo is always an upload. Caps at MAX_JOURNAL_PHOTOS defensively even though the route
 * validates this too. */
async function uploadJournalPhotos(values, userId) {
  const capped = (values || []).slice(0, MAX_JOURNAL_PHOTOS);
  for (const value of capped) {
    const isDataUri = typeof value === 'string' && value.startsWith('data:');
    const path = bucketPath(value, JOURNAL_PHOTOS_BUCKET);
    if (!isDataUri && (path === null || !isOwnPath(path, userId))) {
      throw new Error('Journal photos must be new uploads or photos already on this account.');
    }
  }
  const uploaded = [];
  for (let i = 0; i < capped.length; i++) {
    uploaded.push(await uploadIfDataUri(capped[i], `${userId}/${Date.now()}-${i}`, JOURNAL_PHOTOS_BUCKET));
  }
  return uploaded;
}

/** Deletes whichever journal photos were present before an edit but aren't in the new list —
 * i.e. ones the user removed. Never throws (delegates to deleteIfOwned's own try/catch-free
 * but logged-not-thrown behavior). */
async function deleteRemovedJournalPhotos(previousUrls, newUrls, userId) {
  const kept = new Set(newUrls || []);
  const removed = (previousUrls || []).filter((u) => !kept.has(u));
  await Promise.all(removed.map((u) => deleteIfOwned(u, JOURNAL_PHOTOS_BUCKET, userId)));
}

/**
 * Removes every file a user has ever uploaded — avatar/cover and journal photos, current and
 * any orphaned replaced ones — everything under their `${userId}/` prefix in each bucket. Used
 * by account deletion, where leaving files behind would be a real (if small) storage leak:
 * nothing else ever points at a deleted user's folder again to clean it up later. Best-effort,
 * same as deleteIfOwned — a failure here is logged, not allowed to block account deletion.
 */
async function deleteAllUserFiles(userId) {
  for (const bucket of [AVATARS_BUCKET, JOURNAL_PHOTOS_BUCKET]) {
    const { data: files, error: listError } = await supabaseAdmin.storage.from(bucket).list(userId);
    if (listError) {
      console.error(`[storage] Could not list '${bucket}' files for deletion:`, listError.message);
      continue;
    }
    if (!files || files.length === 0) continue;

    const paths = files.map((f) => `${userId}/${f.name}`);
    const { error: removeError } = await supabaseAdmin.storage.from(bucket).remove(paths);
    if (removeError) console.error(`[storage] Could not delete '${bucket}' files:`, removeError.message);
  }
}

module.exports = {
  AVATARS_BUCKET,
  JOURNAL_PHOTOS_BUCKET,
  MAX_JOURNAL_PHOTOS,
  ensureAvatarsBucket,
  ensureJournalPhotosBucket,
  uploadIfDataUri,
  assertNotOtherUsersFile,
  deleteIfOwned,
  uploadJournalPhotos,
  deleteRemovedJournalPhotos,
  deleteAllUserFiles,
};
