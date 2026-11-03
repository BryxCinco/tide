# Security Fixes

## Bug A — Client-controlled XP (commit 0352155)
- **Root cause:** `POST/PATCH /api/quests` accepted `xp` from `req.body`;
  `POST /api/sessions` accepted unbounded `duration_seconds`.
- **Fix:** Server computes XP (`computeQuestXp`), clamps tier/difficulty,
  caps session at 12h, rejects future timestamps (5-min skew allowance).
- **Tests:** `server/__tests__/criticals/A-client-controlled-xp.test.js` (8)
- **Bonus finding:** `difficulty: 'lots'` produced `xp: null` (NaN persisted).

## Bug A2 — AI timer awards XP at start (commit c21665a)
- **Root cause:** `tools.js` start-timer tool inserted a session and
  awarded XP based on *planned* duration. One chat message = +100000 XP.
- **Fix:** Tool now returns a `navigate` payload only; no DB write, no XP.
  `/api/sessions` is the single source of truth for session XP.
- **Tests:** `server/__tests__/criticals/A2-ai-timer-no-early-xp.test.js` (5)
- **Audit:** All other `awardXp` calls in `tools.js` verified safe
  (`completeTask`/`updateTask` guarded by `claimTaskXp`; `addJournalEntry`
  matches REST behavior).

## Legacy data (pre-fix)
- Audit query:
  ```sql
  select user_id, count(*), sum(duration_seconds), min(ended_at), max(ended_at)
  from time_logs
  where notes = 'Started via AI Coach'
  group by user_id;