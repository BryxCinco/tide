const { supabaseAdmin } = require('./supabaseClient');

/** Inverse of xpForLevel — mirrors client/src/utils/xp.ts's levelFromXp exactly (no shared
 * package between the two projects, so this is deliberately kept in lockstep by hand). */
function levelFromXp(xp) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

/** XP required to REACH this level — mirrors client/src/utils/xp.ts's xpForLevel. */
function xpForLevel(level) {
  return (level - 1) ** 2 * 100;
}

/**
 * Adds `amount` XP to a user's total, recalculates their level from the new total, and
 * persists both. A no-op (returns null) for a zero/falsy amount — several callers compute
 * XP from something that can legitimately be zero (e.g. a sub-minute timer session), and
 * this keeps them from needing to guard that themselves.
 *
 * Upserts rather than requiring a pre-existing row: `user_levels` rows are normally created
 * by the signup trigger (see migrations/008_levels_xp.sql), but an account that predates
 * this feature and somehow missed the migration's backfill would otherwise 404 here instead
 * of just starting from 0.
 */
async function awardXp(userId, amount, reason) {
  if (!amount || amount <= 0) return null;

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('user_levels')
    .select('total_xp, level')
    .eq('user_id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') throw new Error(fetchError.message);

  const previousLevel = existing?.level ?? 1;
  const totalXp = (existing?.total_xp ?? 0) + amount;
  const level = levelFromXp(totalXp);

  const { data, error } = await supabaseAdmin
    .from('user_levels')
    .upsert({ user_id: userId, total_xp: totalXp, level, updated_at: new Date().toISOString() })
    .select('total_xp, level')
    .single();

  if (error) throw new Error(error.message);

  console.log(`[xp] +${amount} XP for ${userId} (${reason}) -> ${data.total_xp} total, level ${data.level}`);

  return { totalXp: data.total_xp, level: data.level, leveledUp: data.level > previousLevel, xpGained: amount };
}

module.exports = { awardXp, levelFromXp, xpForLevel };
