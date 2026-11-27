# Focus-first Layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put each page's main tool first. Collapse stat tiles into a slim StatStrip. Give the Dashboard a main column plus a right rail. Remove duplicate stats.

**Architecture:** A new `StatStrip` UI component and a pure `splitWidgets` helper. The Dashboard, Tasks and Profile screens are rearranged; no store or server changes.

**Tech Stack:** Expo 57, RN Web, NativeWind, `node --test` for pure helpers.

**Spec:** `docs/superpowers/specs/2026-11-28-focus-first-layout-design.md`

## Global Constraints
- Reuse the Bento kit, `useGlassSurface`, `ocean` tokens and `FadeInView`; motion is opacity only.
- Flex rows only (no CSS grid). Two columns at width ≥ 1024 (`isDesktop`); otherwise one column.
- Customize Dashboard must keep working: a widget's `size === 'sm'` goes to the rail, anything else to main.
- Commit and push to `main`.

## Review Focus
1. A user who disabled every widget still gets a sane Dashboard (Quest + Wave + no empty rail gap). Task 1 test (`splitWidgets([])`).
2. A guest (no Wave Stats) on desktop: the rail must not be an empty column. Task 2 hides the rail when it has nothing.
3. Tasks StatStrip taps still set filters (today / overdue / done). Task 3.
4. Phone layout unchanged in order and nothing clipped at 390. Task 5 visual.
5. Profile still shows level/XP after the duplicate stats are removed. Task 4 visual.

---

### Task 1: StatStrip + splitWidgets
**Files:** Create `client/src/components/ui/StatStrip.tsx` and export it from `ui/index.ts`. Create `client/src/utils/dashboardLayout.ts` with test `dashboardLayout.test.ts`.

**Interfaces — Produces:**
- `interface StatStripItem { id: string; icon: IconName; color: string; value: string; label: string; progress?: number; onPress?: () => void }`
- `function StatStrip(props: { items: StatStripItem[]; index?: number; className?: string })`
- `function splitWidgets<T extends { size: string }>(widgets: T[]): { main: T[]; rail: T[] }` — `sm` goes to rail, everything else to main, order kept.

- [ ] Write a failing test: `splitWidgets([{id:'a',size:'full'},{id:'b',size:'sm'},{id:'c',size:'md'},{id:'d',size:'sm'}])` → main ids `['a','c']`, rail `['b','d']`; `splitWidgets([])` → both empty.
- [ ] `npm test` → FAIL. Implement. `npm test` → PASS.
- [ ] Build `StatStrip`: one glass tile, items in a row with hairline dividers (wrap to 2 per row on phone), a 26px icon chip, value 18px bold, label 11.5px muted, and an optional thin progress bar.
- [ ] `npx tsc --noEmit` clean. Commit `feat(ui): StatStrip and dashboard widget split`.

### Task 2: Dashboard two-column layout
**Files:** Modify `client/app/(tabs)/index.tsx`. Modify `client/src/components/insights/WaveStats.tsx` (add a `compact?: boolean` prop: glyph 40 and a shortened header label).
- Replace the 4 `BentoStat`s with `StatStrip` (same values and onPress).
- If `isDesktop`: `<View className="flex-row items-start gap-3">` with main `flex-[1.7]` (QuestCard, then `WidgetGrid` of `main`) and rail `flex-1` (`<WaveStats compact />`, then the rail widgets stacked in a single column). If the user is not signed in (no Wave) and there are no rail widgets, render main at full width.
- Otherwise: one column — StatStrip, WaveStats, QuestCard, WidgetGrid(all).
- `WidgetGrid` gets an optional `columns?: number` override (rail = 1).
- [ ] Implement, `npx tsc --noEmit` clean. Commit `feat(dashboard): focus-first two-column layout`.

### Task 3: Tasks — strip, board first
**Files:** Modify `client/app/tasks.tsx`.
- Replace the ring tile and 4 BentoStats with `StatStrip`:
  - done `{done}/{total}` with `progress = completion / 100`
  - due today → `setFilter('today')`
  - overdue → `setFilter('overdue')`
  - in progress (no press)
  - completed → `setFilter('done')`
- Remove `QuestCard` from Tasks.
- [ ] Implement, `npx tsc --noEmit` clean. Commit `feat(tasks): stats strip, board first`.

### Task 4: Profile — drop duplicate stats
**Files:** Modify `client/app/(tabs)/profile.tsx` (remove the `StatsRow` usage; keep the component file if used elsewhere, delete it if unused).
- [ ] Implement, `npx tsc --noEmit` clean. Commit `feat(profile): remove stats duplicated from the dashboard`.

### Task 5: Visual check, review, push
- [ ] Restart Metro. Screenshot Dashboard (with mocked `/waves` via the CDP interception, and as a guest), Tasks and Profile at 1440×900 and 390, light and dark. Expected: the Tasks board is visible without scrolling at 1440×900.
- [ ] `npm test`, `npx tsc --noEmit`, whole-branch review, fix pass, push.
