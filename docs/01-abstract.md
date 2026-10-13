# Abstract

Personal productivity management — the practice of tracking time, building habits, and
reflecting on one's own progress — remains a persistent challenge for individuals despite
the proliferation of digital tools designed to address it. Existing solutions tend to fall
into one of two categories: general-purpose knowledge-management platforms (e.g., Notion)
that offer great flexibility but demand significant manual setup and discipline from the
user, or single-purpose tools (e.g., a time tracker, or a journaling app) that solve one
piece of the problem in isolation, leaving the user to manually synthesize insight across
several disconnected applications. Neither category offers an integrated, low-friction
experience paired with intelligent, personalized guidance.

This study presents the design, development, and evaluation of **TIDE** (an acronym for
*Time, Interest, Diary, Entries*), a cross-platform personal productivity application that
unifies focus-session time tracking, mood-aware journaling, task management with a
gamified leveling system, and data-driven analytics into a single, cohesive product — and
augments all of it with an **AI Coach**: a conversational assistant capable of answering
questions about the user's own real history (via Retrieval-Augmented Generation, or RAG)
and of taking direct action on the user's behalf (via agentic function/tool calling), such
as creating a task, logging a mood, or regenerating a daily quest.

The system was developed using an iterative, phase-based methodology across thirteen (13)
development phases. The frontend was built with Expo and React Native Web, producing a
single TypeScript codebase that targets Web, iOS, and Android from one source tree. The
backend is a Node.js/Express REST API backed by Supabase (PostgreSQL with Row-Level
Security, Authentication, and Storage). The AI subsystem combines a locally-run sentence
embedding model (`Xenova/all-MiniLM-L6-v2`, via `@xenova/transformers`) for semantic
retrieval over a `pgvector`-backed similarity index, with Groq's hosted inference API for
low-latency large language model (LLM) completions and twenty-five (25) distinct callable
tools spanning tasks, mood, time tracking, quests, and productivity statistics.

The resulting system was evaluated across functionality, usability, performance, and
security dimensions through iterative self-testing, structured bug-fixing passes, and
direct verification of Row-Level Security policies across all ten (10) database tables.
Findings indicate that a single, tightly-integrated application — rather than a collection
of disjoint tools — meaningfully lowers the friction of personal productivity tracking,
and that a RAG-plus-tool-calling architecture allows a conversational AI assistant to give
genuinely personalized, data-grounded guidance rather than generic advice. The study
concludes with a discussion of the system's current limitations (e.g., bundle size,
partial mock data in one dashboard widget) and recommendations for future work, including
multi-user collaboration features, deeper analytics, and expanded platform-native
capabilities.

**Keywords:** personal productivity, time tracking, journaling, retrieval-augmented
generation, agentic AI, large language models, cross-platform development, React Native,
Expo, Supabase.

---

## Abstrak *(Filipino Translation)*

Ang pamamahala ng personal na produktibidad — ang pagsubaybay sa oras, pagbuo ng mga
magandang gawi, at pagninilay sa sariling pag-unlad — ay nananatiling hamon para sa
maraming indibidwal, sa kabila ng dumaraming bilang ng mga digital na tool na nilayon
upang tugunan ito. Ang mga kasalukuyang solusyon ay karaniwang nahahati sa dalawang
kategorya: ang mga pangkalahatang-layunin na platform para sa pamamahala ng kaalaman
(tulad ng Notion) na flexible ngunit nangangailangan ng malaking pagsisikap mula sa user,
at ang mga tool na may iisang layunin lamang (tulad ng time tracker o journaling app) na
hiwalay-hiwalay, kaya't ang user mismo ang kailangang mag-ugnay-ugnay ng impormasyon mula
sa iba't ibang application.

Ipinakikilala ng pag-aaral na ito ang disenyo, pagbuo, at pagsusuri ng **TIDE**
(*Time, Interest, Diary, Entries*), isang cross-platform na personal productivity
application na pinagsasama ang pagsubaybay ng oras, journaling, pamamahala ng gawain, at
analytics sa iisang produkto — pinalakas pa ng isang **AI Coach**: isang conversational
assistant na may kakayahang sumagot batay sa tunay na datos ng user (sa pamamagitan ng
Retrieval-Augmented Generation) at direktang gumawa ng aksyon (sa pamamagitan ng agentic
tool-calling), tulad ng paggawa ng gawain, pagre-record ng mood, o pagbuo ng bagong
pang-araw-araw na quest.

Binuo ang sistema gamit ang paulit-ulit (iterative) na metodolohiya sa labintatlong (13)
yugto ng pag-unlad. Natapos ang pag-aaral sa pagtukoy na ang isang mahigpit na
pinagsamang aplikasyon, kaysa sa magkakahiwalay na tool, ay makabuluhang nagpapababa sa
hirap ng pagsubaybay ng personal na produktibidad.

**Mga Susing Salita:** personal na produktibidad, pagsubaybay ng oras, journaling,
retrieval-augmented generation, agentic AI, cross-platform development.
