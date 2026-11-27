# Notion-style Journal & Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Journal editor into a Notion-style block page and give Tasks a Board/Table database view, all in Tide Ocean style.

**Architecture:** Journal content stays a markdown string. A pure `blocks.ts` module parses/serializes it and holds the editing operations; React components render one borderless `TextInput` per block. Tasks keep `taskStore`; new Board/Table/Peek components sit on top of it, plus a persisted `view` field.

**Tech Stack:** Expo SDK 57, React Native + NativeWind, Zustand, Node 26 built-in test runner (`node --test`, native TS type stripping) for pure modules.

**Spec:** `docs/superpowers/specs/2026-11-27-notion-journal-tasks-design.md`

## Global Constraints

- No server or schema changes. Journal `content` stays a plain string (markdown).
- No new runtime dependencies. Read https://docs.expo.dev/versions/v57.0.0/ before using any Expo/RN API you haven't seen in this repo.
- Motion: `FadeInView` / core `Animated` opacity only. No Reanimated `entering` presets and no `transition-colors` on tiles.
- Reuse the Bento kit (`BentoTile` tones), `ocean` and `gradients.aurora` tokens, `TextInput` from `ui/SoundTextInput`, `Pressable` from `ui/SoundPressable`, and `Icon`/`Text` from `components/ui`.
- Layout uses flex rows only (no CSS grid). It must work at 1440px and 390px, light and dark.
- Done tasks are locked in `taskStore` (`updateTask` and `toggleTaskStatus` no-op on them). The UI must not offer to move or edit them, only delete.
- Moving a task to Done must go through `toggleTaskStatus` (it awards XP and streak). Other status moves use `updateTask(id, { status })`.
- Commit after each task and push to `main` (per the user's standing preference).

## Review Focus

1. Legacy plain-text entries with blank lines and leading `-`/`#` typed as prose must open without losing any text. The round-trip test covers this in Task 1.
2. A user moves a Done card on the Board and expects it to stay put (locked). Task 6 covers this with the `canMoveTask` test.
3. Typing fast in a block must not jump the cursor or drop characters. Block ids stay stable across edits (Task 2 test: `updateBlockText keeps id`).
4. Backspace on the very first block must not delete the block or crash. Task 2 test: `mergeWithPrevious at index 0 reverts type only`.
5. An entry whose only content is a divider or empty to-dos must still save, because the server rejects empty `content`. Task 4 test via `hasMeaningfulContent`, in Task 1's module.

---

### Task 1: Test runner + block model

**Files:**
- Modify: `client/package.json` (add `"test": "node --test \"src/**/*.test.ts\""`)
- Modify: `client/tsconfig.json` (add `"exclude"` entry `"**/*.test.ts"` so `.ts`-extension imports in tests don't trip `tsc`)
- Create: `client/src/utils/blocks.ts`
- Test: `client/src/utils/blocks.test.ts` (imports `./blocks.ts` with explicit extension; `node:test` + `node:assert/strict`)

**Interfaces:**
- Produces:
  ```ts
  export type BlockType = 'text'|'h1'|'h2'|'h3'|'todo'|'bullet'|'numbered'|'quote'|'divider';
  export interface Block { id: string; type: BlockType; text: string; checked?: boolean }
  export function newBlockId(): string;
  export function parseBlocks(md: string): Block[];        // never returns [] — empty input → [one empty text block]
  export function serializeBlocks(blocks: Block[]): string; // joins lines with '\n'
  export function toPlainPreview(md: string): string;       // markers stripped, dividers dropped, lines joined by ' '
  export function todoProgress(md: string): { done: number; total: number };
  export function hasMeaningfulContent(blocks: Block[]): boolean; // any non-empty text, or any todo/divider
  ```
- Markdown mapping (exact): `# `→h1, `## `→h2, `### `→h3, `- [ ] `/`- [x] `→todo, `- `→bullet, `/^\d+\. /`→numbered, `> `→quote, `---` (whole line)→divider, else text (one block per line, empty lines become empty text blocks).

- [ ] **Step 1: Write failing tests**
  - `parseBlocks('# Hi\n- [x] done\n- [ ] not\n- item\n1. one\n> q\n---\nplain')` → types `[h1,todo,todo,bullet,numbered,quote,divider,text]`, `checked` `[_,true,false]`, texts without markers.
  - Round-trip: for that string and for `'line one\n\nline three'`, `serializeBlocks(parseBlocks(s)) === s`.
  - `parseBlocks('')` → length 1, type `text`, text `''`.
  - `toPlainPreview('# Title\n- [ ] buy milk\n---\nok')` === `'Title buy milk ok'`.
  - `todoProgress('- [x] a\n- [ ] b\n- [x] c')` deep-equals `{ done: 2, total: 3 }`.
  - `hasMeaningfulContent(parseBlocks('---'))` === true; `hasMeaningfulContent(parseBlocks('\n\n'))` === false.
- [ ] **Step 2:** Run `cd client && npm test`. Expected: FAIL (module not found).
- [ ] **Step 3:** Implement `blocks.ts` (pure, no imports). Numbered blocks serialize with their position in the current consecutive numbered run (`1.`, `2.`, …).
- [ ] **Step 4:** Run `npm test`. Expected: all pass. Run `npx tsc --noEmit`. Expected: no new errors.
- [ ] **Step 5:** Commit `feat(journal): markdown block model with tests`.

### Task 2: Block editing operations

**Files:**
- Modify: `client/src/utils/blocks.ts`
- Test: `client/src/utils/blocks.test.ts`

**Interfaces:**
- Consumes: `Block`, `BlockType`, `newBlockId` (Task 1)
- Produces (all pure, return a new array plus the index of the block to focus):
  ```ts
  export interface EditResult { blocks: Block[]; focusIndex: number; caret?: number }
  export function updateBlockText(blocks: Block[], index: number, text: string): Block[]; // applies shortcuts, keeps id
  export function splitBlock(blocks: Block[], index: number, caret: number): EditResult;
  export function mergeWithPrevious(blocks: Block[], index: number): EditResult;
  export function setBlockType(blocks: Block[], index: number, type: BlockType): EditResult;
  export function toggleTodo(blocks: Block[], index: number): Block[];
  export const LIST_TYPES: BlockType[]; // ['todo','bullet','numbered']
  ```

- [ ] **Step 1: Write failing tests**
  - `updateBlockText keeps id`: same `id` before and after typing.
  - Shortcut: text block, `updateBlockText(…, '## ')` → type `h2`, text `''`; same for `'[] '`→todo, `'- '`→bullet, `'1. '`→numbered, `'> '`→quote, `'---'`→divider plus a new empty text block after it.
  - `splitBlock` on bullet `'abcd'` at caret 2 → `['ab','cd']`, both bullets, focusIndex = index+1, caret 0. Splitting h1 → the new block is `text`. Splitting a todo → the new block is an unchecked todo.
  - `splitBlock` on an *empty* list block → that block becomes `text` (no new block), focusIndex unchanged.
  - `mergeWithPrevious` on a non-text block → becomes `text`, same position (Notion behaviour).
  - `mergeWithPrevious` on a text block → appended to the previous block's text; focusIndex = index-1, caret = previous text length. A previous divider gets removed instead.
  - `mergeWithPrevious at index 0 reverts type only`: never removes the block.
  - `toggleTodo` flips `checked`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement the operations in `blocks.ts`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(journal): block editing operations`.

### Task 3: Block editor components

**Files:**
- Create: `client/src/components/journal/blocks/BlockRow.tsx`, `SlashMenu.tsx`, `BlockEditor.tsx`, `KeyboardBlockToolbar.tsx`
- Modify: `client/src/components/journal/index.ts` (export `BlockEditor`)

**Interfaces:**
- Consumes: everything from Tasks 1–2.
- Produces:
  ```ts
  export interface BlockEditorProps { value: string; onChange: (markdown: string) => void; placeholder?: string }
  export function BlockEditor(props: BlockEditorProps): JSX.Element;
  export const SLASH_ITEMS: { type: BlockType; label: string; hint: string; icon: IconName; keywords: string[] }[];
  ```
- Behaviour:
  - `BlockEditor` holds `Block[]` in state (parsed once from `value` on mount) and calls `onChange(serializeBlocks(blocks))` on every change. Refs are an array of `TextInput` refs, keyed by block id.
  - Enter: on web use `onKeyPress` (`key === 'Enter'` without shift → `preventDefault` + `splitBlock`). On native use `blurOnSubmit={false}` with `onSubmitEditing` → `splitBlock` at the end. Backspace at caret 0 → `mergeWithPrevious` (track the caret via `onSelectionChange`).
  - Slash menu opens when a block's text is exactly `/` or starts with `/` on an empty block. The text after `/` filters `SLASH_ITEMS` by label/keywords. ArrowUp/Down/Enter/Escape on web; tap on native. Choosing an item calls `setBlockType` and clears the `/query`. Highlighted row: `gradients.aurora` at low opacity.
  - Row styles: h1 28/34 bold, h2 22/28 bold, h3 18/24 semibold, text 16/27 (matches the current editor), quote has a 3px left bar in `ocean.lagoon`, todo has a tappable checkbox (checked → strikethrough + muted), bullet •, numbered shows its run index, divider is a hairline `View`.
  - Placeholder `"Write, or press '/' for commands"` only on the focused empty text block (and on the first block when the page is empty).
  - `KeyboardBlockToolbar` (phone only, shown while a block is focused): buttons `/`, ☐ (todo), • (bullet), H (cycles h1→h2→h3→text). Use `InputAccessoryView` on iOS; elsewhere a bar pinned above the keyboard inside the existing `KeyboardAvoidingView`.

- [ ] **Step 1:** Implement the components.
- [ ] **Step 2:** Run `npx tsc --noEmit` → no new errors. Run `npm test` → PASS.
- [ ] **Step 3:** Commit `feat(journal): block editor with slash menu`.

### Task 4: Journal editor page rewrite

**Files:**
- Modify: `client/src/components/journal/JournalEditor.tsx`
- Create: `client/src/components/journal/PropertiesRow.tsx`

**Interfaces:**
- Consumes: `BlockEditor` (Task 3), `parseBlocks`/`hasMeaningfulContent` (Task 1), existing `MoodSelector`, `InterestTags`, `JournalPhotoPicker`, `useJournalStore`.
- Produces: `JournalEditor` keeps the same props (`entry?`, `onDone`), so `app/journal/new.tsx` and `[id].tsx` stay unchanged.
- Changes:
  - `hasContent()` → `Boolean(title.trim() || photoUris.length || hasMeaningfulContent(parseBlocks(content)))`. Photo-only persistence behaviour stays exactly as it is today.
  - Header: `BackButton` · breadcrumb text (`Journal / {formatWeekdayMonthDay}`) · save status (`Saving…` muted / `Saved` accent / idle hidden) · ⋯ `Pressable` opening a small menu: Favorite toggle (`toggleFavorite`, only when `savedId`), Delete (existing `handleDelete`).
  - Remove the Save button and the `ConfirmationModal`. On Back, if `saveState === 'saving'`, `await persist()` before `onDone()` so nothing typed in the last 3s is lost.
  - Top: if `photoUris[0]`, a 120px (phone) / 180px (desktop) cover image with a rounded bottom; else a 3px `gradients.aurora` hairline.
  - Title: borderless `TextInput`, 32/40 bold, placeholder `Untitled`.
  - `PropertiesRow`: rows `Mood` · `Tags` · `Photos` · `Created`, each with an icon, a muted label (96px wide) and a value summary. Tapping a row expands its picker inline below it (one open at a time, `FadeInView`). Created is read-only (`formatMonthDayYear · formatTime`).
  - Body: `<BlockEditor value={content} onChange={setContent} />`.
  - Footer caption: `{countWords(toPlainPreview(content))} words · {Math.max(1, Math.round(words/200))} min read`.
- [ ] **Step 1:** Implement.
- [ ] **Step 2:** `npx tsc --noEmit` and `npm test` → clean/PASS.
- [ ] **Step 3:** Manual check on web (`npx expo start --web`): new entry → type `# Hi`, Enter, `[] milk`, Enter, Enter (exits list), `/quo` + Enter → quote. Wait 3s → "Saved". Reopen the entry → identical blocks. Open an old entry → paragraphs intact.
- [ ] **Step 4:** Commit `feat(journal): Notion-style entry page`.

### Task 5: Journal list — previews, List view, grouping

**Files:**
- Modify: `client/src/store/journalStore.ts` (add `view: 'gallery' | 'list'`, `setView`, persisted via `partialize`, reset to `'gallery'`)
- Modify: `client/src/store/journalStore.ts` `getVisibleEntries` search: match against `toPlainPreview(entry.content)` as well as the title
- Create: `client/src/utils/groupByRecency.ts` + test `groupByRecency.test.ts`
- Create: `client/src/components/journal/JournalListRow.tsx`, `ViewToggle.tsx` (generic, reused by Tasks)
- Modify: `client/src/components/journal/JournalCard.tsx` (body uses `toPlainPreview`; show `☐ done/total` chip when `todoProgress.total > 0`)
- Modify: `client/src/components/dashboard/RecentJournal.tsx`, `client/src/components/insights/HistoryView.tsx` (use `toPlainPreview` wherever `content` is displayed)
- Modify: `client/app/(tabs)/journal.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type RecencyGroup = 'Today' | 'This week' | 'Earlier';
  export function groupByRecency<T>(items: T[], getDate: (t: T) => string, now: Date): { group: RecencyGroup; items: T[] }[]; // empty groups omitted, order preserved
  export interface ViewToggleProps<V extends string> { value: V; options: { value: V; label: string; icon: IconName }[]; onChange: (v: V) => void }
  export function ViewToggle<V extends string>(p: ViewToggleProps<V>): JSX.Element; // segmented control, active tab has an aurora underline
  ```
- [ ] **Step 1: Failing test** `groupByRecency`: with `now = 2026-11-27T12:00` local, dates today 09:00, 2026-11-24, 2026-10-01 → groups `['Today','This week','Earlier']`, one item each. "This week" = the last 7 days excluding today. An empty input → `[]`.
- [ ] **Step 2:** `npm test` → FAIL. **Step 3:** Implement. **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Wire the screen: `ViewToggle` (Gallery `LayoutGrid` / List `List`) on the right of the search tile row. Gallery = the current bento grid. List = `groupByRecency` sections, each a small muted label plus `JournalListRow`s (mood icon · title · one-line preview · up to 2 tags · short date · favorite star) inside one `BentoTile tone="surface"` with hairline separators.
- [ ] **Step 6:** `npx tsc --noEmit` clean. Commit `feat(journal): list view, grouping and markdown-aware previews`.

### Task 6: Task store view mode + board helpers

**Files:**
- Modify: `client/src/store/taskStore.ts`
- Create: `client/src/utils/taskBoard.ts` + test `taskBoard.test.ts` (imports only `../types/task.ts` types)

**Interfaces:**
- Produces:
  ```ts
  // taskStore
  view: 'board' | 'table';  setView: (v: 'board'|'table') => void;  // persisted, reset → 'board'
  moveTask: (id: string, status: TaskStatus) => void; // 'done' → toggleTaskStatus(id); else updateTask(id, { status }); no-op if locked/same
  // taskBoard.ts
  export const BOARD_COLUMNS: { status: TaskStatus; label: string; color: string }[]; // To do #94A3B8, In progress ocean.lavender hex, Done ocean.lagoon hex
  export function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]>; // keeps input order
  export function canMoveTask(task: Task): boolean; // false when status === 'done'
  export type TableSortKey = 'title'|'status'|'priority'|'dueDate';
  export function sortTasks(tasks: Task[], key: TableSortKey, dir: 'asc'|'desc'): Task[]; // priority rank critical>high>medium>low; missing dueDate sorts last in both directions
  ```
  (Hard-code the two ocean hex values in `taskBoard.ts` so the test doesn't import theme modules. Copy them from `utils/theme.ts`.)
- [ ] **Step 1: Failing tests:** `groupTasksByStatus` puts each status in its bucket with empty arrays present. `canMoveTask` is false for done and true otherwise. `sortTasks` by priority asc gives `critical,high,medium,low`. By dueDate, an undefined value is last for both asc and desc.
- [ ] **Step 2:** FAIL → **Step 3:** implement → **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(tasks): board helpers and persisted view mode`.

### Task 7: Board view with inline add

**Files:**
- Create: `client/src/components/tasks/TaskBoard.tsx`, `BoardCard.tsx`, `InlineTaskInput.tsx`, `StatusMenu.tsx`
- Modify: `client/src/components/tasks/index.ts`

**Interfaces:**
- Consumes: `groupTasksByStatus`, `BOARD_COLUMNS`, `canMoveTask` (Task 6); `moveTask`, `addTask`, `toggleTaskStatus`, `deleteTask`; `PRIORITY_META`.
- Produces:
  ```ts
  export interface TaskBoardProps { tasks: Task[]; onOpen: (task: Task) => void }
  export interface InlineTaskInputProps { onSubmit: (title: string) => void; placeholder?: string } // stays open and clears after submit; Escape/blur with empty text closes
  ```
- Behaviour:
  - Desktop/tablet: 3 equal flex columns, each a `BentoTile tone="surface" dense` with a header (dot, label, count) and a scrollable card list.
  - Phone: a horizontal `ScrollView` with `pagingEnabled` / `snapToInterval` = column width (screen width − 40). Above it, a pill row of column names that scrolls to that column and highlights the visible one.
  - `BoardCard`: checkbox (hidden for done; done shows a lagoon check) · title (tap → `onOpen`) · a chip row: priority dot + label, due chip (`formatDateKeyCompact`; coral when `isTaskOverdue`), up to 2 tags. The status chip opens `StatusMenu` (3 options, current one marked) only when `canMoveTask`.
  - "+ New" at the bottom of each non-Done column → `InlineTaskInput`. Submit → `addTask({ title, status: column.status, priority: 'medium', tags: [] })`. The Done column has no "+ New".
  - An empty column shows a quiet dashed placeholder: "No tasks".
- [ ] **Step 1:** Implement. **Step 2:** `npx tsc --noEmit` clean. **Step 3:** Commit `feat(tasks): board view with inline add`.

### Task 8: Table view

**Files:**
- Create: `client/src/components/tasks/TaskTable.tsx`, `PropertyPicker.tsx` (small anchored list used for status/priority)

**Interfaces:**
- Consumes: `sortTasks`, `TableSortKey`, `canMoveTask`, `moveTask`, `updateTask`, `addTask`, `InlineTaskInput`, existing `CalendarPicker` for due.
- Produces: `export interface TaskTableProps { tasks: Task[]; onOpen: (task: Task) => void }`
- Behaviour:
  - Local state `{ key: TableSortKey, dir }`, default `priority desc`. Clicking a header toggles dir or switches key; it shows ↑/↓.
  - Desktop columns (flex): ☐ 36px · Title flex 3 · Status 130 · Priority 110 · Due 110 · Tags flex 2. Hover row tint on web.
  - Title: tap → becomes a `TextInput` (commit on blur/Enter via `updateTask(id, { title })`, Escape cancels; empty titles revert). An "Open" icon at the end of the title cell → `onOpen`.
  - Status/Priority cells → `PropertyPicker`. Due → `CalendarPicker`. All are disabled for done tasks (rendered muted).
  - Phone (`isPhone`): each row = checkbox + title on the first line, a chip row (status, priority, due) on the second. Tapping a chip opens the same pickers.
  - Bottom row: "+ New" → `InlineTaskInput` → `addTask({ title, status: 'todo', priority: 'medium', tags: [] })`.
- [ ] **Step 1:** Implement. **Step 2:** `npx tsc --noEmit` clean. **Step 3:** Commit `feat(tasks): editable table view`.

### Task 9: Task peek panel + screen wiring

**Files:**
- Create: `client/src/components/tasks/TaskPeek.tsx`
- Modify: `client/app/tasks.tsx`
- Modify: `client/src/components/tasks/TaskFormModal.tsx` (extract its field form into an exported `TaskForm` component (props `{ task?: Task; onSaved: () => void; onCancel: () => void }`) that both the modal and the peek render, so nothing is duplicated)

**Interfaces:**
- Consumes: `TaskBoard`, `TaskTable`, `ViewToggle` (Task 5), `TaskForm`, store `view`/`setView`.
- Produces: `export interface TaskPeekProps { task?: Task; visible: boolean; onClose: () => void }`. Desktop/tablet: a right-side panel, 440px wide, full height, glass surface, fading over a dim backdrop (opacity only). Phone: the existing bottom-sheet `Modal` from `components/ui`. Done tasks show read-only details plus Delete (reuse the current `TaskInfoModal` content for that case).
- Screen changes: keep the header, progress bento, stats, and QuestCard. Replace the filters tile with a row: `ViewToggle` (Board `Columns3` / Table `Table`) + the existing `TaskFilters`. Replace the card grid with `view === 'board' ? <TaskBoard/> : <TaskTable/>`, both receiving `getVisibleTasks(tasks, filter, sort)` and `onOpen={openPeek}`. The header "New" button opens the peek in create mode. Remove `TaskInfoModal` and `TaskFormModal` usage from this screen (the components stay for other callers. Grep first and delete only if unused).
- [ ] **Step 1:** Implement. **Step 2:** `npx tsc --noEmit` clean, `npm test` PASS.
- [ ] **Step 3:** Commit `feat(tasks): Notion-style board/table screen with peek panel`.

### Task 10: Visual verification and release

- [ ] **Step 1:** Run `npx expo start --web`. Screenshot Journal list (Gallery + List), the entry editor (slash menu open), Tasks Board, Tasks Table, and the Peek at 1440px and 390px, in light and dark.
- [ ] **Step 2:** Fix any visual issues found (contrast, overflow, clipped text on 390px).
- [ ] **Step 3:** `npx tsc --noEmit` clean and `npm test` PASS. Commit any fixes and `git push origin main`.
