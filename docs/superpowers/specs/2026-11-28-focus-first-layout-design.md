# Focus-first Layout — Design

Date: 2026-11-28 · Status: direction "A: Focus-first" chosen in chat; awaiting design approval

## Intent
Each page leads with its main tool. Stats shrink into one slim strip. Nothing is repeated
across pages. Keep the Tide Ocean look: bento, aurora, Wave Stats.

## Problems (from screenshots, 1440 and 390)
1. Pages are long stacks of equal-weight cards, so there is no hierarchy.
2. The main tool is below the fold. On Tasks, a progress ring, 4 stat tiles and Tide's Quest
   come before the board.
3. Stats repeat: streak, level, focus and journal appear on Dashboard, Profile, Timer and AI Coach.
4. Big cards for little content, e.g. Dashboard's 4 separate stat tiles.

## Approaches
| | Option | Trade-off | Chosen |
|---|---|---|---|
| A | **Focus-first**: main tool first, a slim `StatStrip`, and a two-column Dashboard (main + right rail) | Keeps the design system; clearer hierarchy | ✅ (user) |
| B | Calm Notion: minimal sections, few cards | Cleaner, but loses the Tide Ocean identity | |

## Design
### Shared: `StatStrip` (`components/ui/StatStrip.tsx`)
- A single glass tile with 3–5 compact stats (icon chip, value, label) in one row, with hairline
  dividers. On phone it wraps 2 per row. Each stat has an optional `onPress`.
- It replaces groups of separate `BentoStat` tiles.

### Dashboard (`app/(tabs)/index.tsx`)
- **Row 1, unchanged:** greeting hero (2/3) and Today's focus (1/3).
- **Row 2:** `StatStrip` with streak, level (with XP progress), open tasks (overdue noted) and journal.
- **Row 3, desktop/tablet ≥ 1024:** two columns.
  - **Main (flex 1.7):** Tide's Quest, then every enabled widget whose size is not `sm`
    (Today's tasks, Focus flow, …).
  - **Right rail (flex 1):** Wave Stats in compact form, then `sm` widgets (time, streak,
    calendar, …), stacked.
- **Phone and narrow tablet:** one column in this order: hero, strip, Wave Stats, Quest,
  widgets.
- The pure split `splitWidgets(widgets) → { main, rail }` lives in `utils/dashboardLayout.ts`
  and is unit-tested. Customize dashboard keeps working; size decides the column.

### Tasks (`app/tasks.tsx`)
- Header, then `StatStrip`: % done (ring-less, with a progress bar), due today, overdue, in
  progress, completed. The tappable ones still set the filter.
- Toolbar (Board/Table + filters), then the board/table. **Tide's Quest is removed from Tasks**
  because it already lives on the Dashboard.

### Profile (`app/(tabs)/profile.tsx`)
- Remove the 4-tile stats row (focus/sessions/journal/streak), which duplicates the Dashboard.
  Keep the hero, level/XP tile, Preferences and Account.

### Not in this batch
Timer, Journal, Insights and AI Coach keep their layouts. They already lead with their main
tool. Revisit after the user sees this.

## Testing
- `node --test`: `splitWidgets` (sm → rail, others → main, order kept, empty input).
- Visual: Dashboard, Tasks and Profile at 1440 and 390, light and dark. On Tasks the board must
  be visible without scrolling at 1440×900.
