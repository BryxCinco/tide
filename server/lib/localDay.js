// Local-calendar-day helpers for insights. The client sends `tz` = minutes east of UTC
// (-new Date().getTimezoneOffset(), e.g. 480 for the Philippines). Timestamps are stored in
// UTC, so bucketing them by `iso.slice(0, 10)` put everything a UTC+8 user did between
// 00:00 and 08:00 on the previous day. These helpers shift by `tz` first.

const DAY_MS = 24 * 60 * 60 * 1000;

/** Minutes east of UTC, whole and within ±14h; anything else is treated as UTC. */
function parseTz(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < -840 || n > 840) return 0;
  return n;
}

/** The user's local "YYYY-MM-DD" for a UTC ISO timestamp. */
function localKey(iso, tz = 0) {
  return new Date(Date.parse(iso) + tz * 60000).toISOString().slice(0, 10);
}

/** `days` consecutive local date keys ending on `endKey` (inclusive). */
function dateKeysInRange(days, endKey) {
  const end = Date.parse(`${endKey}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, i) => new Date(end - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10));
}

/** UTC bounds covering the local days of the window. */
function windowBounds(days, endKey, tz = 0) {
  const keys = dateKeysInRange(days, endKey);
  const shift = tz * 60000;
  const start = Date.parse(`${keys[0]}T00:00:00.000Z`) - shift;
  const end = Date.parse(`${keys[keys.length - 1]}T00:00:00.000Z`) + DAY_MS - 1 - shift;
  return { startIso: new Date(start).toISOString(), endIso: new Date(end).toISOString(), keys };
}

/** The equal-length window immediately before this one. */
function previousWindow(days, endKey, tz = 0) {
  const prevEndKey = new Date(Date.parse(`${dateKeysInRange(days, endKey)[0]}T00:00:00.000Z`) - DAY_MS).toISOString().slice(0, 10);
  return windowBounds(days, prevEndKey, tz);
}

module.exports = { parseTz, localKey, dateKeysInRange, windowBounds, previousWindow };
