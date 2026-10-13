# Important — Read Before Submitting or Presenting

This documentation was drafted with AI assistance. Every **technical** claim in it
(tech stack, database schema, API routes, the AI tool list, the sample bugs in Chapter 6)
was cross-checked directly against this project's real, current source code — it is not
generic placeholder content. However, several sections are **intentionally incomplete**
and require your own direct input before this is genuinely submission-ready. Treat this
file as your checklist.

## 1. Check your institution's required format first

This documentation follows a common, general-purpose thesis/capstone structure. Many
Philippine schools issue their own specific manuscript format (margins, font, exact
chapter titles, required preliminary pages like a Panel Approval Sheet). **Compare this
structure against your own department's required format before doing anything else** —
it is far easier to adjust structure now than after every chapter is filled in.

## 2. Fill in every bracketed placeholder

Search every file in this folder for `[Insert` and `[Figure` — these mark fields only
you can fill in:

- **Cover page** (`00-cover-page.md`): institution, department, degree program, adviser.
- **Acknowledgment** (`02-acknowledgment.md`): this entire chapter is a template —
  rewrite it in your own voice, naming real people.
- **Diagram figures** (Chapter 4 mainly): each `[Figure N: ...]` placeholder includes a
  full textual description of what the diagram should contain — you (or a tool like
  draw.io/Lucidchart/Figma) need to actually draw it. These were deliberately specified
  in enough detail to draw directly from, rather than left vague.
- **Screenshots** (Appendix F): capture these from the real, running application.

## 3. Academic integrity — what to verify yourself

- **Chapter 2, §2.5 ("Related Studies")** is explicitly left as a placeholder. It was
  **not** filled with invented thesis titles or fake authors. You need to search your own
  institution's thesis repository (and/or Google Scholar) for 1–3 genuinely related prior
  studies — this is normally a graded part of the methodology regardless, not something
  that should be delegated away entirely.
- **Every reference in `12-references.md` is real** — verifiable published papers, books,
  or official product/documentation sites. None were invented. The list currently has 28
  entries; if your program requires more, add further *real* sources yourself rather than
  padding the count.
- If you add any additional citations yourself, make sure they're real, too — don't ask
  an AI to "add more references" to hit a number, since that's exactly the situation
  where fabricated-but-plausible-looking citations tend to slip in.

## 4. Sections that reflect this session's actual development, not invented data

Chapter 6 ("Testing and Evaluation"), Table 8 specifically, documents **real defects
that were actually found and fixed** during this project's development — they are not
hypothetical examples. If you want to expand that table, pull from your own project's
real git history / commit messages rather than inventing additional rows.

The ratings in Table 11 (System Evaluation Matrix) and the performance numbers in Table 9
are **self-assessed / observed during development**, explicitly marked as such in the
text — not the output of a formal, independent benchmark or user study. A thesis panel
may reasonably ask you to defend these numbers; be ready to explain how they were
derived (this file, and Chapter 6 itself, already does).

## 5. Write Chapter 7, §7.4 ("Personal Reflection") yourself

This section is deliberately left as a set of guiding prompts rather than pre-written
text. It is usually specifically evaluated for authentic personal voice — write it
yourself.

## 6. Disclose AI assistance per your institution's policy

Many institutions now have an explicit policy on disclosing AI-assisted work in a thesis.
Check whether yours requires a statement (often placed near the Acknowledgment or in a
separate declaration), and add one if so. Being upfront about *how* a document was
produced is generally viewed far more favorably than not being asked and staying silent.

---

Once you've gone through all six items above, you're in a good position to export this
to a single PDF (see `README.md`) and treat it as submission-ready.
