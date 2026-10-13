# Chapter 2: Review of Related Literature and Studies

> **Academic integrity note to the student:** Every source cited in this chapter below is
> a real, verifiable work (a published paper, book, or official product/documentation
> page) — none have been invented. However, Philippine thesis conventions typically
> require a **Local Literature** and **Local Studies** subsection citing Philippine-based
> or institution-specific prior research (e.g., from your own university's thesis
> repository). This AI-assisted draft has no access to your institution's local archives
> and therefore cannot responsibly fabricate those citations. Section 2.5 includes a
> placeholder and guidance for you to complete that search yourself — doing so is also an
   expected, graded part of most thesis methodologies, not something that should be
> outsourced wholesale regardless.

## 2.1 Personal Productivity Applications

Personal productivity software has evolved considerably from early single-purpose
calendar and to-do-list utilities into today's broad landscape of specialized and
general-purpose tools.

**Notion**, launched in 2016, popularized the "all-in-one workspace" model: a
block-based document editor combined with a flexible, user-definable database system that
can be configured to behave as a to-do list, a habit tracker, a journal, or essentially
any structured data view the user designs. Its strength — near-total flexibility — is
also its primary usability weakness for personal productivity specifically: a new user is
given no opinionated starting structure and must design their own system before the tool
becomes useful (Notion Labs, Inc., n.d.).

**Todoist** and **TickTick**, by contrast, are purpose-built task managers offering
natural-language due-date parsing, recurring tasks, and priority levels, with TickTick
additionally bundling a basic Pomodoro timer and habit tracker (Doist Inc., n.d.;
Appest Inc., n.d.). These tools excel at their narrow purpose but do not extend into
journaling or deep personal analytics.

**Forest**, a gamified focus-timer application, demonstrates the effectiveness of
lightweight gamification (a virtual tree that grows while the user stays focused, and
withers if the app is abandoned) in sustaining user engagement with time-tracking
behavior (Seekrtech, n.d.) — a design principle TIDE's own XP/leveling system and daily
"Tide's Quest" feature draw on.

### Table 1: Comparison of Existing Personal Productivity Applications

| Application | Time Tracking | Task Mgmt. | Journaling | AI Coaching | Gamification | Setup Effort |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Notion | Manual (DIY) | Manual (DIY) | Manual (DIY) | No | No | High |
| Todoist | No | Yes | No | No | Light (karma pts.) | Low |
| TickTick | Basic (Pomodoro) | Yes | No | No | Light | Low |
| Day One | No | No | Yes | No | No | Low |
| Toggl Track | Yes | No | No | No | No | Low |
| Forest | Yes (focus timer) | No | No | No | Yes (strong) | Low |
| **TIDE** | **Yes** | **Yes** | **Yes** | **Yes** | **Yes** | **Low** |

## 2.2 Time Tracking Systems and Techniques

The **Pomodoro Technique**, introduced by Francesco Cirillo in the late 1980s, structures
work into fixed-length focus intervals (traditionally 25 minutes) separated by short
breaks, as a method of managing attention and combating procrastination (Cirillo, 2006).
**Time-blocking**, a related but distinct technique, instead has the user pre-allocate
specific calendar blocks to specific tasks or categories of work in advance, trading the
Pomodoro method's rigid interval structure for calendar-level intentionality.

Dedicated time-tracking tools such as **Toggl Track**, **RescueTime**, and **Clockify**
implement these techniques with varying degrees of automation — RescueTime, notably,
passively tracks application and website usage in the background rather than requiring
the user to manually start/stop a timer (RescueTime, Inc., n.d.), while Toggl Track and
Clockify rely on explicit, user-initiated start/stop actions similar to TIDE's own focus
session timer (Toggl OÜ, n.d.; CAKE.com Inc., n.d.).

TIDE's timer feature follows the explicit start/stop model (rather than passive
background tracking), consistent with Toggl Track and Clockify, on the basis that
explicit, deliberate session-starting is itself part of the intentionality the Pomodoro
Technique is designed to cultivate.

## 2.3 Journaling and Mood Tracking

A substantial body of psychological research supports the benefits of regular written
reflection. Pennebaker and Beall's (1986) foundational study on expressive writing found
that writing about emotionally significant experiences was associated with measurable
improvements in subsequent physical health outcomes. A later meta-analysis by Smyth
(1998), aggregating multiple studies on written emotional expression, found consistent
(if moderate) positive effects across psychological and physiological outcome measures.

These findings motivate the inclusion of a first-class journaling feature in TIDE, rather
than treating written reflection as a peripheral add-on. TIDE's journal further pairs
each entry with an explicit mood selection, aligning with purpose-built digital mood
trackers such as **Daylio** and **MoodPanda**, which use simple, low-friction mood
selection (an icon or short scale) as a lightweight alternative to unstructured
free-text-only mood logging (Daylio s.r.o., n.d.). TIDE's own Insights dashboard mood
trend chart is directly inspired by this pattern of making mood data visually trackable
over time, rather than leaving it buried in unstructured prose.

## 2.4 Artificial Intelligence in Productivity Tools

The transformer architecture introduced by Vaswani et al. (2017) underlies the large
language models (LLMs) — such as the GPT family (Brown et al., 2020) — that have driven
the recent wave of conversational AI assistants. Two specific capabilities of modern LLMs
are directly relevant to TIDE's AI Coach design:

**Retrieval-Augmented Generation (RAG).** Lewis et al. (2020) introduced RAG as a method
of combining a pre-trained language model with a non-parametric retrieval mechanism over
an external corpus, allowing the model's output to be grounded in specific retrieved
documents rather than relying solely on knowledge encoded in the model's parameters at
training time. This directly addresses the core limitation identified in Chapter 1:
general-purpose LLMs have no inherent knowledge of a specific user's personal data. TIDE
implements this pattern by embedding the user's journal entries, tasks, sessions, and
profile information, storing those embeddings in a `pgvector`-backed table, and
retrieving the most semantically relevant records at query time to ground the AI Coach's
response.

**Tool-Augmented / Agentic Language Models.** Schick et al. (2023), in their *Toolformer*
work, demonstrated that language models can be trained (or, in production systems,
prompted) to decide when and how to call external tools/APIs to accomplish a task beyond
their own built-in capabilities. Modern commercial LLM providers — including Groq, the
provider used by TIDE — expose this as a first-class "function calling" / "tool calling"
API feature. TIDE's AI Coach uses this capability extensively: twenty-five (25) distinct
tools are exposed to the model, allowing it to directly create a task, log a mood, start
a timer, or take other concrete actions, rather than only describing what the user should
do themselves.

## 2.5 Related Studies

> **To be completed by the student.** This subsection should cite specific prior
> theses, capstone projects, or published case studies — ideally including at least one
> or two from your own institution's thesis repository (a "Local Studies" requirement in
> most Philippine thesis formats) — that relate to one or more of: personal productivity
> applications, AI-assisted coaching/recommendation systems, or RAG/agentic-AI system
> implementations. Consult your university library's thesis archive or a research
> database (Google Scholar, ResearchGate) for these; they should not be fabricated.

As a globally-documented (non-local) reference point, production engineering teams at
companies such as Notion and Shopify have published public case studies and conference
talks describing their own RAG-based AI assistant implementations, which corroborate the
general architectural pattern (embed → retrieve → augment prompt → generate) that TIDE's
own AI Coach follows, though the specifics of TIDE's implementation — particularly its
use of a locally-run embedding model rather than a hosted embedding API, discussed in
Chapter 6 — were a response to this project's own operating-cost constraints rather than
a pattern drawn directly from those case studies.

## 2.6 Synthesis

The literature reviewed above points to a consistent gap: existing personal productivity
tools are strong in one specific dimension (task management, time tracking, *or*
journaling) but weak or entirely absent in the others, and none of the reviewed tools
combine their core functionality with an AI assistant that is both grounded in the user's
actual personal data (via RAG) and capable of taking direct action (via agentic tool
calling) rather than only offering generic text-based suggestions.

TIDE directly addresses this gap by: (1) unifying time tracking, task management, and
journaling into one application rather than requiring several specialized tools; (2)
applying evidence-based techniques from the time-tracking and journaling literature
(Pomodoro-style explicit sessions, mood-paired journal entries) rather than inventing
mechanisms without grounding; and (3) implementing a genuinely RAG-grounded, agentic AI
Coach, rather than a generic chatbot bolted onto an otherwise unrelated application.
