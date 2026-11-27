# Notion-style Journal & Tasks — Design

Date: 2026-11-27 · Status: awaiting approval

## Intent

Make TIDE's Journal and Tasks feel like Notion — very usable, fast, easy, and
impressive — while staying visually in sync with the Tide Ocean design system
(Bento kit, aurora gradient, calm opacity-only motion).

- **Journal → "writing feel":** a clean page, not a form. Type, and use `/` or
  markdown shortcuts for structure.
- **Tasks → "database feel":** the same tasks seen as a Board or a Table, edited
  in place, no modal hopping.

## Goals

- Writing an entry feels like typing on a page: big title, properties row,
  then blocks.
- Structure without friction: `/` menu plus markdown shortcuts.
- Tasks are quick to add and change in place (title, status, priority, due).
- Works the same on web (1440px) and phone (390px), light and dark.

## Non-goals

- No inline rich text (bold/italic/links mid-line) in v1.
- No drag-and-drop (board moves happen by tapping the status chip).
- No Calendar view in v1.
- No server or database schema changes.
- No nested pages, sub-tasks, or collaborative editing.

## Anti-goals (a failure even if it "works")

- Old entries look broken or lose text.
- Typing lags, the cursor jumps, or Enter/Backspace behave unpredictably.
- It looks like a generic Notion clone instead of TIDE (no bento/aurora).
- Jumpy motion, or Reanimated `entering` presets (they stall on web).

## Constraints

- Expo SDK 57 + NativeWind; check the versioned Expo docs before using any API.
- Journal `content` stays a plain string (server needs a non-empty `content`,
  counts words, and builds AI embeddings from it). Markdown is the storage format.
- Reuse the existing stores (`journalStore`, `taskStore`: `addTask`,
  `updateTask`, `toggleTaskStatus`, `deleteTask`) with optimistic updates as they
  do today.
- Reuse `TextInput` from `ui/SoundTextInput`, the Bento kit, `FadeInView`, and theme
  tokens (`ocean`, `gradients.aurora`).

## Approaches considered

| | Option | Trade-off | Chosen |
|---|---|---|---|
| Journal | **A. Own block editor serialized to markdown** | Works on web + native, no deps or schema changes; no inline bold/italic in v1 | ✅ |
| Journal | B. Rich-text lib (Tiptap/10tap via webview) | Full formatting, but heavy, risky on Expo 57 native, hard to theme | |
| Journal | C. Textarea + markdown preview | Cheapest, but doesn't feel like Notion | |
| Tasks | **A. Board / Table toggle over existing store, tap-to-move, inline edit** | Simple and reliable on touch and web | ✅ |
| Tasks | B. Same + drag-and-drop | More "wow", but buggy on web/touch and slower to build | |

The user picked **A + A**.

## Design — Journal

### Block model (`src/utils/blocks.ts`)
```ts
type BlockType = 'text' | 'h1' | 'h2' | 'h3' | 'todo' | 'bullet' | 'numbered' | 'quote' | 'divider';
interface Block { id: string; type: BlockType; text: string; checked?: boolean }
```
- `parseBlocks(markdown) → Block[]` / `serializeBlocks(blocks) → string`, round-trip safe.
- Markdown mapping: `# `, `## `, `### `, `- [ ] ` / `- [x] `, `- `, `1. `, `> `, `---`.
  Everything else is a `text` block (one per line). Old plain-text entries
  therefore open unchanged, as text blocks.
- `toPlainPreview(markdown)` strips the markers for cards, search, and word counts
  shown in the client.

### Editor page (rewrite of `JournalEditor.tsx`)
- Header: Back · date breadcrumb · "Saved / Saving…" · ⋯ menu (Favorite, Delete).
  Autosave stays as it is (3s); the manual Save button and "Entry Saved!" modal
  are replaced by the always-visible saved status. ⋯ → Done returns.
- Optional cover: the first photo shown as a soft cover strip; otherwise an
  aurora hairline at the top.
- Title: a large borderless input ("Untitled").
- **Properties row** (Notion-style, compact): Mood · Tags · Photos · Created.
  Each one is a single line that opens the existing picker inline
  (`MoodSelector`, `InterestTags`, `JournalPhotoPicker`) in a popover or sheet.
- **Blocks:** one borderless `TextInput` per block, styled per type, with a
  leading checkbox, bullet, number, or quote bar.
  - Enter → split into a new block (continuing the list type; an empty list item
    turns back into text).
  - Backspace at the start → merge with the previous block (or revert type → text).
  - Shortcut + space at line start converts the type (`#`, `##`, `###`, `[]`, `-`, `1.`, `>`, `---`).
  - `/` on an empty block opens the **slash menu** (filterable list with icons:
    Text, Heading 1-3, To-do, Bullet, Numbered, Quote, Divider). Arrow/Enter on
    web, tap on phone.
  - Empty-page placeholder: "Write, or press '/' for commands".
- Bottom quiet line: word count · reading time.
- Phone: a small keyboard-top toolbar (`/`, ☐, •, H) because typing `/` is less
  natural on mobile.

### Journal list (`(tabs)/journal.tsx`)
- Keep the header, prompt tile, and stats bento (those are TIDE).
- Entries become a Notion-like **page list**: a toggle between Gallery (the current
  cards, using the plain preview) and List (compact rows: mood icon · title · first
  line · tags · date), grouped Today / This week / Earlier.
- Search and filters stay as they are; search matches the plain preview.
- Card previews show checklist progress (e.g. "☐ 2/5") when an entry has to-dos.

## Design — Tasks

### View switcher (`app/tasks.tsx`)
- Keep the header, progress ring, stat tiles, and QuestCard.
- Under them, a segmented control: **Board | Table** (remembered in `taskStore`,
  persisted). Filters and sort apply to both views.

### Board (`TaskBoard.tsx`)
- Three columns: To do · In progress · Done, each with a count and a colored
  header dot. Desktop: side by side. Phone: horizontally paged columns with
  snap, plus a column pill switcher.
- Compact cards: title, priority dot, due chip (coral if overdue), tags.
- Tap the status chip → a small menu to move the card (To do / In progress / Done).
  The checkbox still toggles done.
- "+ New" at the bottom of each column → an inline input; Enter creates the task in
  that status (medium priority by default) and keeps the input open for the next one.

### Table (`TaskTable.tsx`)
- Columns: ☐ · Title · Status · Priority · Due · Tags. Click a header to sort
  (reuses `setSort`).
- Title is editable in place. Status, priority, and due open small pickers.
- "+ New" row at the bottom.
- Phone: the table collapses to rows of title + chips (no horizontal table).

### Task detail
- Tapping a task title opens the details as a **side peek panel** on desktop and a
  bottom sheet on phone (Notion-style "peek"), replacing the centered modal. It
  reuses the `TaskFormModal` fields: description, linked activity, tags, delete.

## Visual sync with Tide Ocean
- Surfaces use `BentoTile` tones (glass for toolbars, surface for columns/table).
- Aurora gradient only for statement accents: the editor's top hairline, the active
  view-tab underline, the slash-menu highlight.
- Motion: `FadeInView` / core `Animated` opacity only; no `transition-colors` on tiles.
- Verify at 1440px and 390px, light and dark.

## Testing
- Unit tests for `parseBlocks` / `serializeBlocks` round-trips (including legacy
  plain text, empty lines, and checked to-dos) and for `toPlainPreview`.
- Unit tests for the block-editing reducer (split, merge, convert by shortcut).
- Manual and visual checks of the editor and both task views on web and phone.

## Left to the builder
- Exact component split, file names beyond those listed, and icon choices.
- Popover vs sheet for the properties row on each breakpoint.
- Whether the keyboard toolbar uses `InputAccessoryView` (iOS) or a custom
  bar; check the Expo 57 docs.

## Calls I made (please check)
- The manual Save button and "Entry Saved!" modal are removed in favour of the
  always-visible autosave status.
- The task modal is replaced by a peek panel or sheet.
- New inline tasks default to medium priority.
- The server's word count will include markdown markers. Accepted as minor (no
  server change).
