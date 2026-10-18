const { supabaseAdmin } = require('./supabaseClient');

/** True the first time a task is completed — and marks it, so un-checking and re-checking
 * the same task never awards XP twice. `task` is the row as it was before this update. */
async function claimTaskXp(task) {
  if (!('xp_awarded' in task)) return true; // migration 013 not applied yet
  if (task.xp_awarded) return false;
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update({ xp_awarded: true })
    .eq('id', task.id)
    .eq('xp_awarded', false)
    .select('id');
  if (error) {
    console.error('[taskXp] xp_awarded update failed:', error.message);
    return false;
  }
  return (data || []).length > 0;
}

module.exports = { claimTaskXp };
