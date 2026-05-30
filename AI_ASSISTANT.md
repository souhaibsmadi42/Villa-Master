# AI Project Assistant — Wiring

The assistant is the difference between "a construction app" and "an operating system." This doc explains exactly how it's wired, what it can already do, and where it grows.

---

## What ships in Phase 1

- **Floating launcher** (`Sparkles · Ask Villa`) in the bottom-right of every page.
- **Side drawer** that slides in with a `cinematic` motion (320 ms, easing `0.22, 0.61, 0.36, 1`).
- **Two modes:**
  - `Ask` — answers questions about the project.
  - `Draft` — writes weekly updates, RFI replies, decision summaries.
- **Streaming output** via Server-Sent Events from `/api/assistant`. Tokens render as they arrive.
- **Project-aware** — a compact snapshot (contractors, deliverables, risks, activity) is injected into the system prompt every call.
- **Smart Insight panel** (`/api/insight`) — non-streaming JSON endpoint that returns one FT-style paragraph for the dashboard.

---

## The data flow

```
┌─────────────────────────────────────────────────────────────┐
│  AssistantPanel (client)                                    │
│  ──────────────────────────────────────────────────────     │
│  state: { messages, mode, streaming }                       │
│  fetch('/api/assistant', POST, {messages, mode})            │
└────────────────────────┬────────────────────────────────────┘
                         │  SSE: event: delta, data: {text}
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  /api/assistant  (Next.js Route Handler, runtime: nodejs)   │
│  ──────────────────────────────────────────────────────     │
│  1. Build system prompt:                                    │
│     SYSTEM_BASE + snapshotForSystem(currentProjectState)    │
│  2. anthropic.messages.stream({                             │
│       model: 'claude-sonnet-4-5',                           │
│       max_tokens, system, messages                          │
│     })                                                      │
│  3. Pipe text_delta events out as SSE                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                Anthropic API (Claude)
```

---

## The system prompt (verbatim philosophy)

```
You are the Villa Ajloun construction intelligence assistant.
You speak with calm authority: short declarative sentences, specific names,
dates, and numbers. Tone: editorial, owner-respectful, never breathless.
Avoid emoji and exclamation marks.

You have a project snapshot below. Treat it as ground truth for the current
state of the project. If asked something the snapshot cannot answer, say so
plainly and suggest the smallest next step.

When the user is in "draft" mode, you write deliverable artefacts:
- weekly owner updates (3 paragraphs, ~180 words, no bullet vomit)
- contractor RFI replies (one paragraph, direct, no hedging)
- decision summaries (one short paragraph + the three options on the table)

When the user is in "ask" mode, you answer questions about the project.
Prefer 2–5 short sentences. Cite the contractor or deliverable by name when
relevant.

PROJECT SNAPSHOT:
… (auto-generated from Supabase / DEMO_SNAPSHOT) …
```

This prompt is the *voice* of the platform. Treat it like UX copy — version it, review it, A/B it.

---

## Project context: from demo to live

Right now `lib/project-context.ts` exports `DEMO_SNAPSHOT` so the assistant works without a database. To go live:

```ts
// lib/project-context.ts
import { createClient } from '@/lib/supabase';

export async function getLiveSnapshot(): Promise<ProjectSnapshot> {
  const sb = createClient();
  const [{ data: project }, { data: contractors }, { data: deliv }, { data: risks }, { data: activity }] =
    await Promise.all([
      sb.from('project').select('*').single(),
      sb.from('contractor').select('*'),
      sb.from('deliverable').select('*').gte('due_date', new Date().toISOString()).order('due_date').limit(6),
      sb.from('risk').select('*').eq('open', true),
      sb.from('activity').select('*').order('at', { ascending: false }).limit(8),
    ]);

  return {
    project: { /* map */ },
    contractors: (contractors ?? []).map(/* map + derive openDeliverables, onTimePct */),
    upcomingDeliverables: (deliv ?? []).map(/* map */),
    risks: (risks ?? []).map(/* map */),
    recentActivity: (activity ?? []).map(/* map */),
  };
}
```

Then in the route, swap `DEMO_SNAPSHOT` for `await getLiveSnapshot()`.

---

## When to add tools (function calling)

Phase 1 deliberately does not give the model tools. The snapshot is enough for 90% of questions. Add tools when you hit one of these:

| Trigger | Tool to add |
| --- | --- |
| Users ask "show me all deliverables tagged X" | `query_deliverables({status?, contractor?, dueBefore?})` |
| Users ask "what files are attached to deliverable Y" | `get_deliverable_files(id)` |
| Users say "approve this" or "defer this 3 days" | `update_deliverable(id, patch)` — gated by RLS |
| The drawer should auto-deep-link | `open_in_app({ route, params })` — client-side intent |

Tools live in `lib/tools/*.ts`, each exporting `{ name, description, input_schema, run() }`. The route loops `anthropic.messages.stream` with `tools: [...]` and handles `tool_use` blocks. Spec: <https://docs.anthropic.com/en/docs/build-with-claude/tool-use>.

---

## Cost & latency budget

- **Sonnet 4.5** is the default. Streaming first token typically lands in 700–1100 ms.
- Snapshot prompt is ~600 tokens. User messages are short. A typical "ask" turn is ~1.5k input + ≤ 600 output.
- For the Smart Insight cron, prefer the **non-streaming** call so we can cache the result for 60 s.
- Switch to **Haiku 4** for the Smart Insight panel if latency / cost matter more than tone (paragraph quality drops noticeably though).

Enable **prompt caching** on the system prompt once you have a live snapshot — it changes infrequently:

```ts
system: [
  { type: 'text', text: SYSTEM_BASE },
  { type: 'text', text: snapshotForSystem(snapshot),
    cache_control: { type: 'ephemeral' } },
],
```

This cuts ~75% of input cost on rapid back-to-back turns.

---

## Privacy

- The API route is server-only; the key never reaches the browser.
- We send the snapshot only — not full file contents, not personal data beyond names + emails.
- For file Q&A in the future, send *summaries* through Claude's [file API](https://docs.anthropic.com/en/docs/build-with-claude/files) and link out to Supabase Storage for the source.

---

## Smart Insight panel (the editor's note)

`GET /api/insight` returns:

```json
{
  "paragraph": "Week 28. Foundations on schedule. KONN remains the bottleneck on shop drawings…",
  "generated": true
}
```

This is what powers the dashboard's *Smart Insight* card. Cache for 60 s with React Query, refetch on focus, hard refresh on user click. Three inline entity links inside the paragraph open the corresponding drawers.

---

## Roadmap

| Week | Add |
| --- | --- |
| 1 | (shipped) Streaming chat, snapshot prompt, two modes, Smart Insight |
| 2 | Live snapshot from Supabase, prompt caching |
| 3 | Tools: `query_deliverables`, `open_in_app` |
| 4 | Saved threads (so the owner can come back to a draft) |
| 5 | Voice mode (Web Speech API → text) and TTS reply |
| 6 | Weekly auto-report cron — generates the PDF + draft email |

When the assistant can write a usable owner update *and* link straight to the right deliverable from inside its answer, the platform crosses a threshold. That's the goal of Phase 2.
