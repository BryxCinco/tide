# TIDE — Thesis/Capstone Documentation

This folder contains a complete, thesis-style academic documentation package for
**TIDE** (Time, Interest, Diary, Entries), generated with AI assistance and grounded in
the project's actual, real source code (tech stack, database schema, API endpoints, the
25 AI Coach tools, and a representative sample of real bugs found and fixed during
development).

## How to use this documentation

1. **Read `IMPORTANT-READ-FIRST.md`** (in this same folder) before submitting or
   presenting any of this — it lists every section that genuinely needs your own input,
   review, or completion.
2. Fill in every `[Insert ...]` and `[Figure N: ...]` placeholder throughout the
   chapters — institution/adviser names, actual diagrams, and actual screenshots.
3. Complete Chapter 2, §2.5 ("Related Studies") with real citations from your own
   institution's thesis repository.
4. Write Chapter 7, §7.4 ("Personal Reflection") in your own authentic voice.
5. Export to a single PDF (see below) once all of the above is done.

## Chapter Index

| # | File | Title |
|---|---|---|
| — | [`00-cover-page.md`](00-cover-page.md) | Cover Page |
| — | [`01-abstract.md`](01-abstract.md) | Abstract (English + Filipino) |
| — | [`02-acknowledgment.md`](02-acknowledgment.md) | Acknowledgment |
| — | [`03-table-of-contents.md`](03-table-of-contents.md) | Table of Contents |
| — | [`04-list-of-figures-tables.md`](04-list-of-figures-tables.md) | List of Figures and Tables |
| 1 | [`05-chapter-1-introduction.md`](05-chapter-1-introduction.md) | Introduction |
| 2 | [`06-chapter-2-review-of-related-literature.md`](06-chapter-2-review-of-related-literature.md) | Review of Related Literature and Studies |
| 3 | [`07-chapter-3-methodology.md`](07-chapter-3-methodology.md) | Methodology |
| 4 | [`08-chapter-4-system-design.md`](08-chapter-4-system-design.md) | System Design |
| 5 | [`09-chapter-5-implementation.md`](09-chapter-5-implementation.md) | Implementation |
| 6 | [`10-chapter-6-testing-and-evaluation.md`](10-chapter-6-testing-and-evaluation.md) | Testing and Evaluation |
| 7 | [`11-chapter-7-conclusion-and-recommendations.md`](11-chapter-7-conclusion-and-recommendations.md) | Conclusion and Recommendations |
| — | [`12-references.md`](12-references.md) | References (APA 7th ed.) |
| — | [`13-appendices.md`](13-appendices.md) | Appendices A–G |

## Exporting to a single PDF

These are separate Markdown files by design (one per chapter, matching your original
request), which also makes them easy to combine. Two common options:

### Option 1 — Pandoc (recommended, produces a clean, real PDF)

```bash
# Requires Pandoc + a LaTeX engine (e.g. MiKTeX on Windows, or `choco install pandoc miktex`)
cd docs
pandoc 00-cover-page.md 01-abstract.md 02-acknowledgment.md 03-table-of-contents.md ^
  04-list-of-figures-tables.md 05-chapter-1-introduction.md ^
  06-chapter-2-review-of-related-literature.md 07-chapter-3-methodology.md ^
  08-chapter-4-system-design.md 09-chapter-5-implementation.md ^
  10-chapter-6-testing-and-evaluation.md 11-chapter-7-conclusion-and-recommendations.md ^
  12-references.md 13-appendices.md ^
  -o TIDE-Thesis-Documentation.pdf --toc --number-sections -V geometry:margin=1in
```

### Option 2 — Any Markdown-to-Word/PDF converter

Tools such as [Typora](https://typora.io), [Obsidian](https://obsidian.md) (with an
export plugin), or VS Code's "Markdown PDF" extension can open each file and export it
individually, which you then combine in Word/Google Docs/Acrobat — more manual, but
needs no command-line tooling.

## A note on how this was produced

This documentation was drafted with AI assistance (Claude), cross-referenced against the
project's real, current source code for every technical claim (tech stack versions,
database table/column names, API endpoint paths, the AI tool list, and the sample bugs
in Chapter 6's test results) so that the technical content is accurate as of the time it
was written — **not** a generic, templated thesis with placeholder technical details.

That said, AI-assisted drafting is not a substitute for your own academic ownership of
this work. See `IMPORTANT-READ-FIRST.md` for exactly what still needs your direct
attention before this is submission-ready.
