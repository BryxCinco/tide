# Focus-first Remaining Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Focus-first to Journal, Insights (for guests), AI Coach and Timer.
**Architecture:** Screen rearrangements plus the existing `StatStrip`; one new pure helper.
**Tech Stack:** Expo 57 / RN Web / NativeWind; `node --test`.
**Spec:** `docs/superpowers/specs/2026-11-28-focus-first-remaining-pages-design.md`

## Global Constraints
- No server/store changes. Opacity-only motion. Commit and push to `main`.

## Review Focus
1. A journal entry written yesterday at 23:00 counts in "last 7 days" (Task 1 test).
2. Markdown markers are not counted as words (Task 1 test).
3. The Journal mood chip still toggles the mood filter (tapping the active one clears it).
4. A guest on Insights sees a single card and no network calls (already guarded).
5. AI Coach chips show the same numbers the old card did.

### Task 1: Journal
- Create `client/src/utils/journalStats.ts`:
  `journalStats(entries: { createdAt: string; isFavorite: boolean; content: string }[], now: Date): { entries: number; last7Days: number; favorites: number; words: number }`,
  where last 7 days = `createdAt >= now - 7×24h`. It imports `./blocks.ts`, so enable `allowImportingTsExtensions` in tsconfig (noEmit is already on).
- Test `journalStats.test.ts`: two entries (one 1 day old and favorite with content `'# Hi\n- [ ] two words'`, one 10 days old with content `'one'`) → `{ entries: 2, last7Days: 1, favorites: 1, words: 4 }`.
- Journal screen:
  - A `JournalPromptBanner` (slim, aurora-tinted, prompt text plus a "Start writing" button) replaces the prompt and stats row.
  - `StatStrip` (entries, last 7 days, favorites, words).
  - `JournalFilters` gets a `compact` prop: one horizontal `ScrollView` row of date chips, then a divider, then mood chips.
  - The search bar and compact filters sit in one glass toolbar.
- Commit `feat(journal): focus-first header`.

### Task 2: Insights guest card
- When `!canUseServerData()`, render the header plus one `EmptyState`-style card ("Insights need an account", with a sign-up button that routes to `/(auth)/register`) instead of the tiles.
- Commit.

### Task 3: AI Coach context chips
- In `ChatWelcome.tsx`, replace the "What I see today" card with a row of chips (focus today, open tasks, day streak, journal entries), with the same values and sources as before.
- Commit.

### Task 4: Timer strip
- In `timer.tsx`, replace the two stat tiles with a `StatStrip` (tracked today, sessions today).
- Commit.

### Task 5: Visual check, review, push
