# Chapter 6: Testing and Evaluation

## 6.1 Testing Methodology

Given the individually-developed nature of this project, testing was conducted primarily
through **structured manual testing** rather than an automated test suite (no unit or
integration test framework was integrated into the codebase at the time of this study —
noted explicitly as a limitation in §7.3). Three complementary testing approaches were
used:

1. **Feature-level manual testing**, performed immediately after implementing each
   feature, exercising the real UI end-to-end against the real backend and database
   (not an isolated mock), including deliberately triggering edge cases (e.g., deleting a
   task to confirm the two-step confirmation flow; disconnecting network access to
   confirm error states render correctly).
2. **Structured audit passes**, in which the entire application was reviewed against a
   fixed checklist spanning functionality, responsive layout, accessibility, and security
   configuration — conducted ahead of the project's v1.1.0 release-readiness milestone —
   rather than relying solely on whatever issues happened to be noticed during ordinary
   feature development.
3. **Live verification against production infrastructure**, including directly querying
   the deployed Supabase project to confirm Row-Level Security policy behavior, and
   exercising the deployed (not local-only) AI Coach against the real Groq API to observe
   genuine network latency and failure modes, rather than trusting local-only testing
   that would not surface deployment-specific issues (e.g., the Vercel build
   configuration defect described in §6.2 was only discoverable by testing the actual
   production deployment).

## 6.2 Test Results

The table below documents a representative, non-exhaustive sample of defects identified
and resolved during the testing phases of this project, selected to illustrate the range
of issue categories encountered (data-loss risk, security configuration, cross-platform
build tooling, UI layout, and AI reliability).

### Table 8: Bugs Identified and Resolved (Representative Sample)

| # | Category | Defect | Resolution |
|---|---|---|---|
| 1 | Data Integrity | The daily quest regeneration routine deleted a user's existing quests *before* confirming the new set was successfully created, risking total quest loss on a mid-generation failure. | Reordered to insert the new quests first, then delete only the previously-superseded rows, inside the same operation. |
| 2 | UI / Theming | Dark-mode users briefly saw a flash of white background during screen navigation transitions, because a Stack navigator's `contentStyle` background was hardcoded to `#FFFFFF` instead of reading the active theme. | Replaced the hardcoded color with the theme system's resolved background color in each affected layout. |
| 3 | Functionality | The "Forgot password?" link was wired to an empty no-op handler — password reset was entirely non-functional. | Implemented a complete password-reset flow using Supabase's PKCE-based `resetPasswordForEmail` / `exchangeCodeForSession` APIs, executed client-side for `code_verifier` continuity, including dedicated screens and a route-based guard preventing an unrelated OAuth-callback handler from intercepting the reset-code redirect. |
| 4 | AI Reliability | Raw provider-level error text (e.g., literal rate-limit/token-count messages) was surfacing directly to end users in the AI Coach chat, including via an internal LLM "tool" response message the model would narrate back verbatim. | Added a bounded retry with backoff for transient provider errors, and mapped every remaining failure path to one of a small set of pre-written, safe user-facing messages — never the provider's raw text. |
| 5 | AI Reliability | The AI Coach's HTTP request timeout (15 seconds, tuned for ordinary CRUD calls) was too short for a multi-round tool-calling completion, and a resulting timeout surfaced as a misleading, literal "Network error — check your connection" message even when connectivity was never the actual problem. | Raised the AI Coach endpoints' request timeout specifically (60 seconds) without changing the shorter default used elsewhere, added a dedicated, accurate timeout error message, and excluded timeouts from the generic "Network error" toast. |
| 6 | Cross-Platform Build | A phantom, undeclared transitive dependency resolved `react-native-gesture-handler` to an incompatible major version, crashing the app in Expo Go with `undefined is not a function`. | Diagnosed via `expo-doctor`/`expo install --check`; explicitly declared the correct SDK-matching version as a direct dependency. |
| 7 | Deployment Configuration | The production web deployment returned HTTP 404 and showed a stale page title, because the hosting platform had no framework-specific build configuration for this project type and was not actually running the application's real build step. | Added an explicit build-command/output-directory configuration file; separately discovered and corrected that the custom HTML-template mechanism used for page metadata only applies under the framework's "static" output mode, not its default "single-page" mode. |
| 8 | Security Configuration | N/A — verification only. | Row-Level Security was directly verified as enabled, with a correct `auth.uid() = user_id` policy, on all ten database tables via the live Supabase project (not only reviewed in the SQL source). |
| 9 | Mobile Layout | Several primary screens (Activities, Tasks) rendered a fixed-position navigation button and the screen's own in-flow action button in the same corner on phone, causing them to visually overlap. | Replaced the fixed-position control with an in-flow sibling sharing the row's normal spacing, eliminating the overlap by construction rather than by further positioning adjustments. |
| 10 | Mobile Layout | A chat screen header's subtitle text had no width constraint or line-truncation, which could force the entire page's layout wider than the device viewport, clipping visible content off-screen. | Constrained the containing column's minimum width and truncated the offending text to a single line. |
| 11 | Touch Accessibility | Several small interactive controls (a password-visibility toggle, per-day habit-tracker cells, task completion-toggle circles) had touch targets meaningfully smaller than common mobile usability guidance (~44px), several with no extra tappable margin at all. | Increased the controls' effective tap area via `hitSlop` and/or explicit sizing, without changing their visual size. |

## 6.3 Performance Evaluation

### Table 9: Performance Evaluation Results

| Metric | Observation |
|---|---|
| AI Coach embedding generation (local model, warm) | ~5 ms per call once the model is loaded into memory |
| AI Coach embedding model load (first call after process start) | ~300–400 ms (one-time, per server process) |
| Web production JS bundle size | ~12 MB total (documented known limitation — see §7.3) |
| AI Coach end-to-end response time | Variable; bounded by the configured 60-second client timeout, accommodating up to three rounds of tool-calling plus a bounded provider-side retry |

*[Table 9 reports observations gathered during development/testing rather than a
formal, statistically-repeated benchmark suite; the student may wish to supplement this
with a more rigorous load-testing pass — e.g., using a tool such as `autocannon` or
`k6` against the deployed API — before citing specific numbers in a formal defense.]*

## 6.4 Security Evaluation

### Table 10: Security Evaluation Checklist

| Check | Status | Notes |
|---|---|---|
| Row-Level Security enabled on all user-data tables | ✅ Verified | All 10 tables confirmed directly against the live Supabase project |
| Service-role / admin credentials never exposed client-side | ✅ By design | All privileged Supabase operations occur server-side only, via the backend's own admin client |
| Passwords never stored/transmitted in plaintext at rest | ✅ By design | Authentication delegated entirely to Supabase Auth |
| CORS restricted in production | ✅ Verified | Backend restricts allowed origins rather than permitting `*` |
| Destructive actions require explicit confirmation | ✅ By design | Two-step confirmation protocol for task deletion and similar actions, enforced both in the UI and the AI Coach's own tool-calling contract |
| Secrets excluded from version control | ✅ Verified | `.env` files git-ignored; `.env.example` documents required variables without values |

## 6.5 Usability Evaluation

Usability evaluation for this study was conducted primarily through self-directed manual
testing across device form factors rather than a formal, independently-recruited
usability study. Testing covered:

- **Mobile (phone) testing**, including on a physical iPhone 14 via Expo Go during
  development, surfacing and resolving issues such as a development-server connectivity
  false alarm (a transient cold-start timing issue, not a genuine configuration defect)
  and the layout/touch-target issues listed in Table 8.
- **Web testing** across the Chrome and Firefox desktop browsers, at phone, tablet, and
  desktop viewport widths via the responsive breakpoint system described in Chapter 4.

*[The student should insert a description of any additional usability testing performed
— e.g., a System Usability Scale (SUS) questionnaire administered to a small group of
test users — if this was conducted; if not, this is an appropriate, honestly-stated
limitation to carry into Chapter 7's recommendations.]*

## 6.6 System Evaluation Matrix

### Table 11: System Evaluation Matrix

| Criterion | Self-Assessed Rating (out of 10) | Justification |
|---|:---:|---|
| Functionality | 9 | All specified core features (time tracking, journaling, tasks, gamification, AI Coach, insights) are implemented and functioning; one dashboard widget still uses placeholder data (see §7.3). |
| Usability | 8 | Responsive across phone/tablet/desktop with a dedicated mobile-polish testing pass completed; no formal independent usability study was conducted. |
| Performance | 7 | Core interactions are fast (sub-10ms local embedding inference once warm); overall web bundle size exceeds the project's own original target and remains a documented limitation. |
| Security | 9 | Row-Level Security independently verified across all data tables; no formal third-party penetration test was conducted. |

*[These are the student's own self-assessed ratings, offered as a starting point — a
thesis panel will very likely form and state their own independent assessment during
defense, and the student should be prepared to justify or revise these figures rather
than treat them as final.]*
