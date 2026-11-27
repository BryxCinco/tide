# Focus-first: Journal, Insights, AI Coach, Timer — Design

Date: 2026-11-28 · Status: approved in chat

Same direction as `2026-11-28-focus-first-layout-design.md`: the main tool comes first,
stats sit in a `StatStrip`, and nothing is repeated. No data or server changes.

1. **Journal**
   - The prompt tile becomes a slim one-line banner ("{prompt} → Start writing").
   - The stats tile becomes a `StatStrip`: entries, last 7 days, favorites, words.
   - Search and filters share one toolbar: the search field, then a single horizontally
     scrollable chip row with the date filters, a divider, and the moods.
   - Accuracy: "this week" in the stats used "since Sunday" while the list filter and the
     grouping use the last 7 days. The strip says "last 7 days" and uses the last 7 days. Words
     are counted from the plain text (markdown markers excluded) through a pure, tested
     `journalStats(entries, now)`.
2. **Insights:** demo (guest) users see one "Insights need an account" card instead of several
   error tiles.
3. **AI Coach:** the "What I see today" stats card on the welcome screen becomes a row of small
   context chips under the greeting. The suggestions and chat stay the focus.
4. **Timer:** the "tracked today" and "sessions today" tiles become one `StatStrip`. The timer
   stays first.

Testing: `node --test` for `journalStats`, plus a visual check at 1440 and 390 in light and dark.
