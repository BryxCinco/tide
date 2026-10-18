const { supabaseAdmin } = require('./supabaseClient');

// The headline "day streak": +1 for every day in a row the user accomplishes something —
// completes a task (in the app or through the AI Coach) or completes a quest. Stored in the
// streaks row's task_* columns. Separate from the quest streak (current_streak), which only
// advances when every one of a day's quests is done and drives the quest XP bonuses.
//
// Days are the user's own calendar days (their IANA timezone, sent by the client as the
// X-Timezone header), not UTC — in Manila a UTC key would roll over at 8 AM, so a task done
// at 7 AM would count for "yesterday".

const DEFAULT_TIMEZONE = 'Asia/Manila';

function isValidTimezone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** "YYYY-MM-DD" for the current moment in the given timezone. */
function localDateKey(timezone) {
  const tz = isValidTimezone(timezone) ? timezone : DEFAULT_TIMEZONE;
  return new Date().toLocaleDateString('en-CA', { timeZone: tz });
}

function daysBetween(fromKey, toKey) {
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / (24 * 60 * 60 * 1000));
}

/** The timezone a request was made from (X-Timezone header), if it's a real IANA zone. */
function requestTimezone(req) {
  const tz = req.get('x-timezone');
  return isValidTimezone(tz) ? tz : undefined;
}

/**
 * Credits today to the day streak. The first accomplishment of a day advances it (or
 * restarts it at 1 after a missed day); later ones the same day are no-ops. Creates the
 * streaks row if the account doesn't have one yet. Returns the new streak length, or null
 * when nothing changed.
 */
async function bumpDailyStreak(userId, timezone) {
  const dateKey = localDateKey(timezone);

  let { data: streak, error } = await supabaseAdmin
    .from('streaks')
    .select('task_current_streak, task_longest_streak, task_last_completed_date')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[dailyStreak] fetch failed:', error.message);
    return null;
  }
  if (!streak) {
    const { error: insertError } = await supabaseAdmin.from('streaks').insert({ user_id: userId });
    if (insertError && insertError.code !== '23505') {
      console.error('[dailyStreak] streaks row create failed:', insertError.message);
      return null;
    }
    streak = { task_current_streak: 0, task_longest_streak: 0, task_last_completed_date: null };
  }

  const last = streak.task_last_completed_date;
  if (last === dateKey) return null;
  // A day already credited in the future (a UTC key written by the old code, or a device
  // whose timezone changed) — leave it rather than resetting the streak to 1.
  if (last && daysBetween(last, dateKey) < 0) return null;

  const gap = last ? daysBetween(last, dateKey) : null;
  const nextCurrent = gap === 1 ? (streak.task_current_streak || 0) + 1 : 1;
  const nextLongest = Math.max(streak.task_longest_streak || 0, nextCurrent);

  const { error: updateError } = await supabaseAdmin
    .from('streaks')
    .update({
      task_current_streak: nextCurrent,
      task_longest_streak: nextLongest,
      task_last_completed_date: dateKey,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('[dailyStreak] update failed:', updateError.message);
    return null;
  }
  return nextCurrent;
}

/** The day streak as it reads right now — 0 once a whole day has passed with nothing done. */
function currentDailyStreak(row, timezone) {
  if (!row?.task_last_completed_date) return row?.task_current_streak || 0;
  return daysBetween(row.task_last_completed_date, localDateKey(timezone)) > 1 ? 0 : row.task_current_streak || 0;
}

module.exports = { bumpDailyStreak, currentDailyStreak, localDateKey, requestTimezone, daysBetween };
