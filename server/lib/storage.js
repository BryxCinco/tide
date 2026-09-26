const { supabaseAdmin } = require('./supabaseClient');

const AVATARS_BUCKET = 'avatars';
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DATA_URI_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;

function publicUrlPrefix() {
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${AVATARS_BUCKET}/`;
}

// Called once at server startup — idempotent, safe to call on every boot. Table changes
// need the Supabase SQL Editor (no DDL access from a service-role client), but Storage
// buckets ARE reachable through it, so this is one piece of setup the server can just do
// for itself instead of adding another manual "run this in the dashboard first" step.
async function ensureAvatarsBucket() {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    console.error('[storage] Could not list buckets:', listError.message);
    return;
  }
  if (buckets.some((b) => b.name === AVATARS_BUCKET)) return;

  const { error: createError } = await supabaseAdmin.storage.createBucket(AVATARS_BUCKET, {
    public: true,
    fileSizeLimit: '5MB',
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });

  if (createError) {
    console.error(`[storage] Could not create '${AVATARS_BUCKET}' bucket:`, createError.message);
  } else {
    console.log(`[storage] Created '${AVATARS_BUCKET}' bucket.`);
  }
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
async function uploadIfDataUri(value, pathPrefix) {
  if (typeof value !== 'string' || !value.startsWith('data:')) {
    return value;
  }

  const parsed = parseDataUri(value);
  if (!parsed) {
    throw new Error('Unsupported image format — use JPEG, PNG, WEBP, or GIF.');
  }

  const path = `${pathPrefix}-${Date.now()}.${parsed.ext}`;
  const { error: uploadError } = await supabaseAdmin.storage.from(AVATARS_BUCKET).upload(path, parsed.buffer, {
    contentType: parsed.mime,
    upsert: true,
  });
  if (uploadError) throw uploadError;

  const { data } = supabaseAdmin.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Best-effort cleanup for a value a field just got replaced with a new upload — deletes it
 * only if it's actually a file this bucket owns (matched by URL prefix); a gradient id, hex
 * color, or unrelated URL is silently left alone. Never throws — a failed cleanup is logged,
 * not allowed to fail the profile update it's called after.
 */
async function deleteIfOwned(previousValue) {
  if (typeof previousValue !== 'string' || !previousValue.startsWith(publicUrlPrefix())) return;

  const path = previousValue.slice(publicUrlPrefix().length);
  const { error } = await supabaseAdmin.storage.from(AVATARS_BUCKET).remove([path]);
  if (error) console.error('[storage] Could not delete previous file:', error.message);
}

module.exports = { AVATARS_BUCKET, ensureAvatarsBucket, uploadIfDataUri, deleteIfOwned };
