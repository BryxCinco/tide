# Accurate Insights, Wave Stats, Consistent Backgrounds — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bucket Insights by the user's local day, add a 7-day Low/Mid/High/Tsunami Wave Stats widget, and give every page the same background.

**Architecture:** The client sends `tz` (minutes east of UTC). The server's insightsService turns timestamps into local date keys and builds local-day bounds. A new pure `waves.js` scores each day, and a `/waves` route serves it. The client renders the result with a custom `react-native-svg` WaveGlyph. Backgrounds become transparent so AppLayout's `OceanBackdrop` shows everywhere.

**Tech Stack:** Express + supabase-js + Jest (server); Expo 57 / RN Web / NativeWind / react-native-svg (client).

**Spec:** `docs/superpowers/specs/2026-11-28-insights-waves-backgrounds-design.md`

## Global Constraints
- `tz` is an integer in [-840, 840]; anything else becomes 0. All service functions default `tz = 0` (backward compatible).
- Wave weights: focus 40 (full at 120 min), tasks 20 (full at 5), quests 20 (full at 3), journal 10 (full at 1), distinct activities 10 (full at 3). Score is rounded to an integer 0–100.
- Levels: `low` 0–24, `mid` 25–49, `high` 50–79, `tsunami` 80–100. Display names: Low, Mid, High, Tsunami.
- Motion: opacity only (`FadeInView`); no Reanimated entering presets.
- No DB migrations. Commit and push to `main` (standing preference).

## Review Focus
1. A session ending 04:00 PH time (20:00Z the day before) must count on the local day. Task 1 route test.
2. A missing or garbage `tz` (`"abc"`, `9999`) must not crash and must behave as UTC. Task 1 `parseTz` tests.
3. A day with no activity at all → score 0, level `low`, and the widget still renders 7 columns. Task 2 test plus the Task 4 render.
4. A guest/demo session, or a failing `/waves`, must not break Insights or the Dashboard: the widget hides. Task 4.
5. Score boundaries 24/25, 49/50, 79/80 map to the right level. Task 2 test.

---

### Task 1: Timezone-correct insights on the server
**Files:** Modify `server/lib/insightsService.js`, `server/routes/insights.js`. Create `server/lib/localDay.js`. Test `server/__tests__/insights/localDay.test.js`, `server/__tests__/insights/tz-route.test.js`.

**Interfaces — Produces (`localDay.js`):**
- `parseTz(raw): number`
- `localKey(iso: string, tz: number): string` — "YYYY-MM-DD"
- `dateKeysInRange(days, endKey): string[]`
- `windowBounds(days, endKey, tz): { startIso, endIso, keys }`
- `previousWindow(days, endKey, tz)`

Every service export gains a trailing `tz = 0` argument. Each route reads `parseTz(req.query.tz)`, and `parseEndKey`'s fallback becomes `localKey(new Date().toISOString(), tz)`.

- [ ] Write failing tests:
  - `parseTz('480') === 480`, `parseTz('abc') === 0`, `parseTz('9999') === 0`, `parseTz('-300') === -300`.
  - `localKey('2026-11-27T20:00:00.000Z', 480) === '2026-11-28'`; with `tz = 0` → `'2026-11-27'`.
  - `windowBounds(1, '2026-11-28', 480)` → `startIso === '2026-11-27T16:00:00.000Z'`, `endIso === '2026-11-28T15:59:59.999Z'`.
  - Route test (fakeSupabase + makeApp): seed a `time_logs` row `{ user_id, duration_seconds: 3600, ended_at: '2026-11-27T20:00:00.000Z' }`. Then `GET /api/insights/range?days=1&end=2026-11-28&tz=480` returns `time[0].seconds === 3600`.
- [ ] Run `cd server && npx jest __tests__/insights`. Expected: FAIL (module missing).
- [ ] Implement `localDay.js`, move the date helpers out of insightsService, and replace every `x.slice(0, 10)` on a timestamp with `localKey(x, tz)`.
- [ ] Run `npx jest`. Expected: all pass (existing criticals included).
- [ ] Commit `fix(insights): bucket by the user's local day (tz param)`.

### Task 2: Wave scoring + endpoint
**Files:** Create `server/lib/waves.js`. Modify `server/lib/insightsService.js` (add `getWaves`) and `server/routes/insights.js` (add `GET /waves`). Test `server/__tests__/insights/waves.test.js`.

**Interfaces — Produces:**
- `scoreDay({ focusSeconds, tasks, quests, journal, activities }): number`
- `waveLevel(score): 'low'|'mid'|'high'|'tsunami'`
- `getWaves(userId, days, endKey, tz)` → `[{ date, label, score, level, focusSeconds, tasks, quests, journal, activities }]`
- The route responds `{ waves }`, with `days` capped at 31 (default 7).

- [ ] Write failing tests:
  - `scoreDay` of all zeros = 0.
  - `scoreDay({ focusSeconds: 7200, tasks: 5, quests: 3, journal: 1, activities: 3 })` = 100.
  - `scoreDay({ focusSeconds: 3600, tasks: 0, quests: 0, journal: 1, activities: 1 })` = 20 + 10 + 3 = 33.
  - Over-caps are clamped: `focusSeconds: 99999` contributes 40.
  - `waveLevel(24) === 'low'`, `25 → 'mid'`, `49 → 'mid'`, `50 → 'high'`, `79 → 'high'`, `80 → 'tsunami'`.
  - Route: `GET /api/insights/waves?days=7&end=2026-11-28&tz=480` with no data → 7 entries, all `level === 'low'`; the last entry's `date === '2026-11-28'`.
- [ ] Run `npx jest __tests__/insights/waves.test.js`. Expected: FAIL.
- [ ] Implement. Journal = count of `journal_entries` by `localKey(created_at)`. Activities = distinct `activity_name` in `time_logs` per local day. Tasks and quests come from `getAccomplishmentsByDate` (made tz-aware in Task 1).
- [ ] Run `npx jest`. Expected: PASS.
- [ ] Commit `feat(insights): 7-day wave score endpoint`.

### Task 3: Client sends tz; accurate labels
**Files:** Modify `client/src/services/insights.service.ts`, `client/app/(tabs)/insights.tsx`, `client/src/types/insights.ts`.

**Interfaces — Produces:**
- `export const tzOffsetMinutes = (): number => -new Date().getTimezoneOffset();`, added to every request's params.
- `insightsService.getWaves(days: number, end: string): Promise<WaveDay[]>`
- `type WaveLevel = 'low' | 'mid' | 'high' | 'tsunami'`
- `interface WaveDay { date: string; label: string; score: number; level: WaveLevel; focusSeconds: number; tasks: number; quests: number; journal: number; activities: number }`

Changes:
- `TrackedTimeHero`'s `today` uses `toDateKey(new Date())`.
- `rangeLabel`: `week` → `last 7 days`, `month` → `last 30 days`.
- [ ] Implement. Run `npx tsc --noEmit` → clean. Commit `fix(insights): send timezone, accurate range labels`.

### Task 4: Wave Stats SVG widget
**Files:** Create `client/src/components/insights/WaveGlyph.tsx`, `client/src/components/insights/WaveStats.tsx`, and pure `client/src/utils/waves.ts` with test `waves.test.ts`. Modify `components/insights/index.ts`, `app/(tabs)/insights.tsx` (full-width tile above the hero row), and the Dashboard (`app/(tabs)/index.tsx`, a tile after the stat row).

**Interfaces — Produces:**
- `WAVE_META: Record<WaveLevel, { label: string; color: string }>`. Colors: low `#94A3B8`, mid `ocean.aqua`, high `ocean.lagoon`, tsunami = aurora.
- `averageLevel(days: WaveDay[]): { score: number; level: WaveLevel }` (pure, in `utils/waves.ts`; the mean of the scores, rounded).
- `<WaveGlyph level size? />` (SVG).
- `<WaveStats />` fetches its own data (`getWaves(7, toDateKey(new Date()))`) and renders `null` on error. When every day has a score of 0, it still renders a calm "Quiet week" line.

Glyph shapes (viewBox 0 0 48 48, filled path plus a lighter back wave):
- low: a crest at y≈38
- mid: a crest at y≈28
- high: a crest at y≈16
- tsunami: a curling crest that hooks back at y≈8, with 3 foam dots and the aurora `LinearGradient`

- [ ] Write a failing test (`node --test`): `averageLevel([])` → `{ score: 0, level: 'low' }`, and `averageLevel` of scores `[80, 80, 20]` → `{ score: 60, level: 'high' }`.
- [ ] Run `npm test` → FAIL. Implement `utils/waves.ts` (a client copy of `waveLevel` thresholds). Run `npm test` → PASS.
- [ ] Build the glyph and tile. The tile header reads "This week's tide · {Level} · {score}". There are 7 columns (weekday, glyph, level). Today is ringed. Pressing a day shows its breakdown line below the row.
- [ ] Run `npx tsc --noEmit` → clean. Commit `feat(insights): Wave Stats widget`.

### Task 5: Consistent backgrounds + sidebar scroll
**Files:** Modify `client/app/(tabs)/_layout.tsx` (`sceneStyle.backgroundColor: 'transparent'`), `client/app/activities.tsx`, `client/app/journal/new.tsx`, `client/app/journal/[id].tsx` (`bg-base` → `bg-transparent`), and `client/src/components/layout/Sidebar.tsx` (investigate the visible scrollbar on Tasks and fix the root cause).
- [ ] Before changing: screenshot Dashboard and Tasks at 1440 to confirm the mismatch. Find why the sidebar scrolls on the Tasks route but not on the Dashboard.
- [ ] Implement. Screenshot Dashboard, Tasks, Journal, Insights, Activities and AI Coach. The backdrop must be identical, and the sidebar must have no scrollbar at 1440×900.
- [ ] Commit `fix(ui): one ocean background on every page`.

### Task 6: Visual check, review, push
- [ ] Restart Metro. Screenshot Insights and Dashboard (Wave Stats) at 1440 and 390, light and dark.
- [ ] Server `npx jest`, client `npm test` and `npx tsc --noEmit` all pass. Run the whole-branch review. Push.
