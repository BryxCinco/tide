# Accurate Insights, Wave Stats, Consistent Backgrounds — Design

Date: 2026-11-28 · Status: approved in chat

## Intent
- Insights must be **accurate** for the user's own day (the user is in the Philippines, UTC+8).
- A signature, non-generic **Wave Stats** visual: the last 7 days rated Low / Mid / High /
  Tsunami from everything the user did (focus, tasks, quests, journal, activities).
- **Every page sits on the same background.**

## Root causes found
1. **Backgrounds:** `app/(tabs)/_layout.tsx` gives every tab scene an opaque
   `sceneStyle.backgroundColor = background.base`, covering AppLayout's `OceanBackdrop`.
   Non-tab pages (Tasks, AI Coach) are transparent and show the aqua gradient. Activities and
   the journal editor use `bg-base` and are flat again.
2. **Insights:** `server/lib/insightsService.js` buckets every timestamp by its UTC date
   (`ended_at.slice(0, 10)`) and builds window bounds at UTC midnight. For UTC+8, anything
   done 00:00–08:00 local lands on the previous day, and "today" excludes those hours.
   The client also highlights "today" with a UTC date and labels trailing windows "this week"
   and "this month" although they are the last 7 and last 30 days.

## Approaches
| Option | Trade-off | Chosen |
|---|---|---|
| **Client sends `tz` (minutes east of UTC); server shifts timestamps before bucketing** | Small and stateless; one extra query param on every insights call | ✅ |
| Store a timezone on the user's profile | Needs a migration and a settings UI; wrong while travelling | |
| Compute insights on the client | Moves heavy queries to the device; duplicates logic | |

| Option (Wave) | Trade-off | Chosen |
|---|---|---|
| **Server `/api/insights/waves`, pure `scoreDay` + `waveLevel` (unit-tested); SVG waves on the client** | Same tz-correct bucketing as the other insights; testable scoring | ✅ |
| Compute on the client from the stores | Stores hold only today/recent data (sessions, quests), so the numbers would be incomplete | |

## Design
### Timezone-correct insights (server)
- `parseTz(raw)`: an integer in [-840, 840], default 0.
- `localKey(iso, tz)` = the date of `iso + tz minutes`; `windowBounds(days, endKey, tz)` gives UTC
  bounds of the local days. All `*.slice(0, 10)` bucketing goes through `localKey`.
- Quests already use their own local `date`, and task `due_date` is a local key, so neither changes.
- Every route accepts `tz`, and every service function takes `tz` (default 0, backward compatible).

### Client
- `insightsService` sends `tz = -new Date().getTimezoneOffset()` on every call.
- "Today" highlight uses `toDateKey(new Date())`.
- Range labels: `today`, `last 7 days`, `last 30 days`, month name, custom.

### Wave score (per local day)
`score = 40·min(1, focusMin/120) + 20·min(1, tasksDone/5) + 20·min(1, questsDone/3) + 10·min(1, journalEntries/1) + 10·min(1, distinctActivities/3)`, rounded.

Levels: `low` 0–24 · `mid` 25–49 · `high` 50–79 · `tsunami` 80–100.

`GET /api/insights/waves?days=7&end=YYYY-MM-DD&tz=480` returns:

`{ waves: [{ date, label, score, level, focusSeconds, tasks, quests, journal, activities }] }`

### Wave Stats widget (client)
- Shared `WaveGlyph` SVG (`react-native-svg`): a filled wave whose height and shape grow with
  the level. Low is a flat ripple, Mid a rolling swell, High a tall peaked wave, and
  Tsunami a curling crest with foam dots and the aurora gradient.
- `WaveStats` tile: seven columns (weekday, glyph, level name), today emphasized, and a
  headline giving the week's average level ("This week's tide: High · 62").
- Tapping or hovering a day shows its breakdown (focus, tasks, quests, journal, activities).
- Placed at the top of Insights (full width) and as a Dashboard tile.
- Motion: opacity fade only (`FadeInView`).

### Backgrounds
- Tab `sceneStyle.backgroundColor: 'transparent'`; `bg-base` → `bg-transparent` on Activities and
  the journal editor routes, so `OceanBackdrop` is the single background everywhere.
- Fix the sidebar showing its own scrollbar/arrows on short windows (investigate in the plan).

## Non-goals
- No broader page layout redesign in this batch (decided after the user sees this).
- No guest-mode (demo) server data; the widget hides itself on error or empty data.

## Testing
- Jest: `scoreDay`, `waveLevel`, `localKey`/`windowBounds` with tz; route test through
  `fakeSupabase` showing a 04:00 PH session lands on the local day.
- Visual check: Insights, Dashboard, Tasks, Journal, Activities at 1440 / 390, light and dark.
