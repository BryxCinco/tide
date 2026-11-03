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
 * The increment happens in one SQL statement (award_xp, migrations/014_atomic_xp.sql), not a
 * read here followed by a write — two awards in flight at once (a quest completion and its
 * streak bonus) used to both read the same total, and the later write erased the earlier
 * one. It also creates the row if it's missing: `user_levels` rows normally come from the
 * signup trigger (migrations/008_levels_xp.sql), but an account that predates this feature
 * and somehow missed the backfill starts from 0 instead of failing.
 */
async function awardXp(userId, amount, reason) {
  if (!amount || amount <= 0) return null;

  const { data, error } = await supabaseAdmin.rpc('award_xp', { p_user_id: userId, p_amount: amount }).single();

  if (error) throw new Error(error.message);

  const totalXp = data.new_total_xp;
  const level = data.new_level;
  // The total before this award is exactly totalXp - amount (the increment was atomic), so
  // the previous level comes from that rather than from a separate, possibly stale, read.
  const previousLevel = levelFromXp(totalXp - amount);

  console.log(`[xp] +${amount} XP for ${userId} (${reason}) -> ${totalXp} total, level ${level}`);

  return { totalXp, level, leveledUp: level > previousLevel, xpGained: amount };
}

module.exports = { awardXp, levelFromXp, xpForLevel };
