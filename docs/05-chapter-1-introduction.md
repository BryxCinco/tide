# Chapter 1: Introduction

## 1.1 Background of the Study

Personal productivity — the ability of an individual to effectively manage their time,
habits, tasks, and self-reflection — has become an increasingly prominent concern in an
era characterized by constant digital distraction and information overload. The challenge
is not a lack of tools; rather, it is the *fragmentation* of the tools that already exist.
A typical individual attempting to manage their productivity today might use a separate
app for time tracking (e.g., Toggl), a separate app for task management (e.g., Todoist),
a separate app or physical notebook for journaling (e.g., Day One), and a separate
spreadsheet or app for habit tracking. Each of these tools captures a different slice of
the person's life, but none of them talk to one another — the user is left to manually
synthesize insight across disconnected silos of data.

At the other extreme, general-purpose "all-in-one" workspace tools such as Notion offer
enough flexibility to build a personal productivity system from scratch — but that
flexibility comes at a steep setup cost. A new user is handed a blank canvas and must
design their own database schemas, templates, and views before the tool becomes useful at
all. This high barrier to entry means that many people abandon such tools before they
ever experience their benefit.

A second, more recent development is the rise of large language models (LLMs) and
conversational AI assistants (e.g., ChatGPT, Claude). These tools are extraordinarily
capable at general reasoning and conversation, but on their own they have **no persistent,
structured knowledge of a specific user's actual history** — they cannot, out of the box,
tell a user how many focus hours they logged last week or whether their mood has been
trending downward, because they were never given access to that data in the first place.

This creates a clear gap: there is no existing personal productivity tool that is (a)
simple enough to use with little to no setup, (b) comprehensive enough to cover time
tracking, task management, and journaling in one place, and (c) intelligent enough to
proactively reason about the user's *own* real data and act on their behalf. **TIDE**
(Time, Interest, Diary, Entries) was conceived and developed to address exactly this gap.

## 1.2 Statement of the Problem

This study is anchored on the following central research questions:

1. **How can a personal productivity application be designed to unify time tracking,
   task management, and journaling into a single, low-friction user experience**, rather
   than requiring the user to maintain several disconnected tools?

2. **How can artificial intelligence — specifically, retrieval-augmented generation (RAG)
   and agentic tool-calling — be integrated into a productivity application to provide
   genuinely personalized coaching**, grounded in the user's own real data rather than
   generic, one-size-fits-all advice?

3. **How can such a system be made accessible across both web and mobile platforms**
   from a single, maintainable codebase, without duplicating development effort for each
   target platform?

4. **How can the system be designed to protect user data privacy and integrity**,
   particularly given that it stores sensitive personal information such as journal
   entries and mood logs?

## 1.3 Objectives of the Study

### General Objective

To design, develop, and evaluate **TIDE**, a cross-platform, AI-powered personal
productivity coaching application that unifies time tracking, task management, journaling,
and data-driven insight generation, augmented by a conversational AI Coach capable of
retrieval-grounded reasoning and direct action-taking on the user's behalf.

### Specific Objectives

1. To design and develop a single-codebase, cross-platform (Web, iOS, Android) client
   application using Expo and React Native Web.

2. To design and implement a secure, scalable backend API (Node.js/Express) backed by a
   managed PostgreSQL database (Supabase) with Row-Level Security enforced on all
   user-owned data.

3. To implement an AI Coach subsystem combining:
   a. a **Retrieval-Augmented Generation (RAG)** pipeline that embeds and semantically
      retrieves the user's own journal entries, tasks, sessions, and profile data; and
   b. **agentic tool-calling**, allowing the AI Coach to directly execute actions (create
      a task, log a mood, start a timer, generate a quest, etc.) on the user's behalf
      rather than merely describing what the user should do.

4. To create a responsive, accessible user interface that adapts appropriately across
   phone, tablet, and desktop viewport sizes.

5. To implement core productivity features: focus-session time tracking, custom and
   predefined activities, mood-aware journaling, single-due-date task management with a
   gamified experience-point (XP) and leveling system, and a visual analytics/insights
   dashboard.

6. To evaluate the resulting system's functionality, usability, performance, and
   security through systematic self-testing and iterative bug-fixing.

## 1.4 Significance of the Study

**For individual users.** TIDE offers a genuinely unified alternative to the fragmented
tool-chains most people currently assemble for personal productivity management, lowering
the friction of consistent time tracking, journaling, and task management, while an AI
Coach grounded in the user's own real data offers more relevant guidance than generic
productivity advice.

**For software developers and students.** This documentation — and the underlying,
publicly-inspectable source code — serves as a concrete, end-to-end reference
implementation of several patterns that are individually well-documented but rarely shown
*integrated* into one real production-style application: a RAG pipeline built on
`pgvector` rather than a dedicated vector database service; agentic LLM tool-calling with
a real multi-round confirmation flow for destructive actions; a single React
Native/Expo codebase serving Web, iOS, and Android; and Row-Level Security as the primary
authorization mechanism for a multi-tenant SaaS-style data model.

**For the academic/research community.** The project serves as a practical case study on
the real engineering trade-offs involved in deploying a RAG-plus-agentic-tools AI
assistant on a constrained budget — e.g., the decision to migrate embedding generation
from a third-party inference API to a locally-run model specifically to control operating
cost, documented in this study's testing chapter.

## 1.5 Scope and Delimitation

### Scope

The TIDE system, as developed and evaluated in this study, includes the following
features:

- User registration and authentication, including Google OAuth sign-in and a local-only
  "Demo" mode that requires no account.
- Focus-session time tracking against predefined or user-created activities.
- Mood-aware journaling with tagging, search, and AI-assisted reflection.
- Task management with due dates, priority levels, overdue/due-today indicators, and an
  XP/leveling gamification layer.
- "Tide's Quest" — a daily, AI-generated micro-goal system.
- A visual analytics/insights dashboard (productivity score, mood trend, activity
  breakdown, a GitHub-style contribution heatmap, and AI-generated suggestions).
- An AI Coach supporting both free-form conversation (RAG-grounded) and direct action
  execution (25 agentic tools).
- Support for 13 languages and both light and dark color themes.
- Responsive layouts for phone, tablet, and desktop viewport sizes, deployed to the Web
  (via Vercel) with a native mobile build pipeline configured through Expo Application
  Services (EAS).

### Delimitation

The following are explicitly **outside** the scope of this study:

- **Multi-user collaboration.** TIDE is single-tenant per account; there is no concept of
  shared workspaces, team task assignment, or collaborative journaling.
- **Enterprise/administrative features.** There is no admin dashboard, organizational
  billing, or user-management-for-others capability.
- **Offline-first / local-first architecture.** Beyond the local-only Demo mode, the
  system assumes network connectivity for all authenticated-account functionality.
- **Native platform-specific features** beyond what Expo's managed workflow exposes out
  of the box (e.g., no custom native modules were written).
- **Third-party calendar or external service integrations** (e.g., Google Calendar
  sync) were not implemented in the version evaluated by this study.

## 1.6 Definition of Terms

For clarity, the following terms are used throughout this documentation as defined below:

- **TIDE** — The name of the system under study; an acronym for *Time, Interest, Diary,
  Entries*, reflecting its four core data domains.
- **LLM (Large Language Model)** — A machine learning model trained on large text corpora
  to generate human-like text; the component responsible for the AI Coach's natural
  language understanding and generation.
- **RAG (Retrieval-Augmented Generation)** — An architecture in which an LLM's response is
  grounded by first retrieving relevant information from an external knowledge source
  (here, the user's own stored data) and supplying it as context to the model, rather
  than relying solely on the model's pre-trained knowledge.
- **Agentic Tool-Calling / Function-Calling** — A capability of certain LLMs to, instead
  of only producing text, output a structured request to invoke a predefined function
  ("tool") with specific arguments, enabling the model to take real actions (e.g.,
  creating a database record) rather than merely describing them.
- **Embedding** — A fixed-length numeric vector representation of a piece of text, such
  that texts with similar meaning produce vectors that are close together in
  vector space, enabling semantic (meaning-based) search rather than exact keyword match.
- **`pgvector`** — A PostgreSQL extension that adds a native vector data type and
  similarity-search operators/indexes, used by Supabase (and, by extension, TIDE) to
  store and query embeddings directly inside the relational database.
- **Groq** — A cloud inference provider used by TIDE to run LLM completions with very low
  latency, via an OpenAI-compatible API.
- **Supabase** — An open-source backend-as-a-service platform providing a managed
  PostgreSQL database, authentication, and file storage, used as TIDE's primary data
  layer.
- **Row-Level Security (RLS)** — A PostgreSQL feature, enforced by Supabase, that
  restricts which rows of a table a given database query may read or write based on the
  identity of the requesting user, used as TIDE's primary data-isolation mechanism.
- **Expo / Expo Router** — A framework and toolchain built on top of React Native that
  simplifies cross-platform (Web, iOS, Android) application development from a single
  codebase, including file-system-based routing.
- **NativeWind** — A library that brings Tailwind CSS-style utility class styling to
  React Native components.
- **JWT (JSON Web Token)** — A compact, signed token format used to represent an
  authenticated session.
