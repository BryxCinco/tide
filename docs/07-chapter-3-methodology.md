# Chapter 3: Methodology

## 3.1 Research Design

This study follows an **Agile, iterative, phase-based development methodology** rather
than a strict linear (Waterfall) model. The system was built incrementally across
thirteen (13) distinct development phases, each delivering a working, testable increment
of functionality before the next phase began. This approach was chosen specifically
because the project's scope — a full-stack application spanning UI, backend, database,
and an AI subsystem — benefits from early, continuous validation of each layer before
building further layers on top of it, and because requirements for the AI subsystem in
particular (Phase 11) were expected to, and did, evolve based on what was learned while
implementing the simpler, foundational phases first.

### Table 3: Development Phases Summary

| Phase | Focus | Representative Deliverables |
|---|---|---|
| 1 | Setup & Foundation | Project scaffolding, Expo Router navigation structure, theming system |
| 2 | UI Component Library | Reusable Button, Input, Modal, Card, Text, Icon primitives |
| 3 | Authentication | Email/password + Google OAuth login, registration, Demo mode |
| 4 | Dashboard | Profile header, quick stats, widget-based home screen |
| 5 | Timer | Focus-session start/stop/pause, activity selection |
| 6 | Journal | Entry editor, mood selector, tagging, search |
| 7 | Insights | Productivity score, mood trend, activity breakdown, heatmap |
| 8 | Profile | Settings, theme/language preferences, account management |
| 9 | Responsive Design | Phone/tablet/desktop breakpoint handling, Sidebar/Drawer navigation |
| 10 | Backend API | Express route modules, Supabase integration, JWT/session handling |
| 11 | AI (RAG + Agentic) | Embedding pipeline, vector similarity search, 25-tool agentic chat |
| 12 | Polish | Animation, sound feedback, accessibility, bug fixes |
| 13 | Additional Features & Hardening | Password reset flow, EAS mobile build setup, release-readiness audit and fixes |

## 3.2 Development Framework

The system is built on a modern JavaScript/TypeScript full-stack foundation:

- **Frontend:** Expo (React Native framework) with Expo Router for file-system-based
  navigation, compiled to Web (via React Native Web), iOS, and Android from one
  TypeScript codebase. NativeWind provides Tailwind CSS-style utility styling across all
  three targets.
- **Backend:** Node.js with the Express web framework, exposing a REST API consumed by
  the frontend.
- **Database & Auth:** Supabase, a managed PostgreSQL platform providing the relational
  database itself, user authentication, and file storage, with Row-Level Security (RLS)
  as the primary data-isolation mechanism.
- **AI:** Groq's hosted inference API for LLM chat completions and tool-calling; a
  locally-run `Xenova/all-MiniLM-L6-v2` sentence-embedding model (via the
  `@xenova/transformers` library) for generating the vector embeddings used in
  retrieval; and PostgreSQL's `pgvector` extension (via Supabase) for storing and
  similarity-searching those embeddings.

### Table 4: Technology Stack Summary

| Layer | Technology |
|---|---|
| Frontend Framework | Expo (React Native + React Native Web) |
| Routing | Expo Router (file-system-based, with route groups) |
| Language | TypeScript |
| Styling | NativeWind (Tailwind CSS for React Native) |
| State Management | Zustand |
| Forms & Validation | React Hook Form + Zod |
| Backend Framework | Node.js + Express |
| Database | PostgreSQL (managed via Supabase) |
| Vector Search | `pgvector` PostgreSQL extension |
| Authentication | Supabase Auth (email/password, Google OAuth) + JWT |
| LLM Inference | Groq (`qwen/qwen3.8-27b` model) |
| Embeddings | `Xenova/all-MiniLM-L6-v2` (local, via `@xenova/transformers`) |
| Frontend Hosting | Vercel (static web export) |
| Backend Hosting | Vercel (serverless Node.js function) |
| Native Mobile Build | Expo Application Services (EAS Build) |

## 3.3 System Architecture

TIDE follows a **three-tier client-server architecture** augmented with a distinct AI
processing layer:

1. **Presentation Tier (Client):** The Expo/React Native Web application, responsible for
   all UI rendering and client-side state, communicating with the backend exclusively
   over a REST API secured by bearer-token (JWT) authentication.
2. **Application Tier (Server):** The Express.js API, responsible for business logic,
   request validation, orchestrating calls to Supabase (for data) and Groq (for AI
   completions), and enforcing server-side authorization checks in addition to the
   database's own Row-Level Security.
3. **Data Tier (Database):** Supabase-managed PostgreSQL, storing all persistent
   application data across ten (10) tables, with RLS policies ensuring a user can only
   ever read or write their own rows regardless of what the application tier requests.
4. **AI Processing Layer:** A cross-cutting layer spanning both the application tier (the
   Express routes and tool-calling orchestration logic) and an external managed service
   (Groq, for the LLM itself), plus a locally-executed embedding model running
   in-process within the backend server.

*[Figure 2: High-Level System Architecture Diagram — a box-and-arrow diagram showing the
Client (Expo app) communicating via HTTPS/REST to the Express API, which in turn
communicates with Supabase (Postgres + Auth + Storage) and Groq (LLM inference), with the
local embedding model shown as a component running within the Express API process itself.]*

## 3.4 Development Tools

| Tool | Purpose |
|---|---|
| Visual Studio Code | Primary code editor |
| Claude Code (Anthropic) | AI-assisted pair-programming / coding agent used throughout development |
| Git & GitHub | Version control and source code hosting |
| Expo CLI / EAS CLI | Local development server, builds, and native app packaging |
| Vercel CLI / Dashboard | Frontend and backend deployment |
| Supabase Dashboard | Database schema management, RLS policy configuration, auth provider setup |
| Postman / `curl` | Manual API endpoint testing during backend development |

## 3.5 Data Gathering Procedure

Given the nature of this project as an individually-developed capstone/thesis system,
primary evaluation data was gathered through the following procedures rather than a
large-scale external user study:

1. **Continuous self-testing** during each development phase, in which every new feature
   was manually exercised end-to-end (through the actual UI, not only via isolated unit
   tests) immediately after implementation.
2. **Structured bug-audit passes**, conducted at defined milestones (notably, ahead of
   the v1.1.0 release-readiness milestone documented in Chapter 6), in which the entire
   application was systematically reviewed against a checklist spanning functionality,
   responsive layout correctness, and security configuration, rather than relying solely
   on ad hoc testing during feature development.
3. **Direct verification against the live backend**, including manually confirming Row
   Level Security policy behavior against the actual Supabase project (rather than only
   reviewing the SQL policy definitions), and live-testing the deployed AI Coach against
   the production Groq API to observe real response latency and tool-calling behavior.
4. ***(If applicable)* Peer/usability testing** — *[the student should insert a
   description here if any outside individuals were asked to use the app and give
   feedback; if this did not occur, this item should be removed or explicitly noted as a
   limitation in Chapter 7]*.

## 3.6 Evaluation Criteria

The system was evaluated against four criteria, each elaborated in Chapter 6:

- **Functionality** — Does each documented feature behave correctly, including its edge
  cases (e.g., does task deletion correctly require a two-step confirmation; does a
  failed AI Coach request show a safe, user-appropriate error message rather than a raw
  internal one)?
- **Usability** — Is the interface navigable and legible across phone, tablet, and
  desktop; do interactive elements meet reasonable touch-target size guidelines on
  mobile; is error/loading feedback clear?
- **Performance** — What is the observed response latency of representative operations,
  particularly the AI Coach's RAG retrieval and LLM completion round-trip; what is the
  deployed web bundle size?
- **Security** — Is Row-Level Security correctly enforced on every table containing
  user-owned data; are secrets (API keys, service-role credentials) kept server-side and
  never exposed to the client; is CORS correctly restricted in production?
