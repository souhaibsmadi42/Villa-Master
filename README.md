# Villa Ajloun — Phase 1

The first build slice of the strategy in `../DESIGN_STRATEGY.md`. A Next.js 15 app with the design tokens, primitives, Hero Scene 1, the global chrome (cursor light, Now Bar, ⌘K command palette), and a working AI Project Assistant streaming from Claude.

```
phase1/
├── package.json
├── next.config.mjs · tsconfig.json · tailwind.config.ts · postcss.config.mjs
├── .env.example
├── supabase/migrations/0001_init.sql      Postgres schema + RLS
├── BIM_VIEWER.md                          Speckle integration brief + code
├── AI_ASSISTANT.md                        Wiring, prompts, roadmap
└── src/
    ├── app/
    │   ├── layout.tsx · page.tsx · globals.css
    │   └── api/
    │       ├── assistant/route.ts         Streaming Claude endpoint
    │       └── insight/route.ts           Dashboard "editor's note"
    ├── components/
    │   ├── ui/                            GlassPanel, Eyebrow, Pill, Ring,
    │   │                                  Magnet, MetricBlock
    │   ├── chrome/                        CursorLight, NowBar, CommandPalette
    │   ├── scenes/                        HeroThreshold
    │   ├── assistant/                     AssistantLauncher, AssistantPanel
    │   └── bim/                           SiteViewer + Speckle adapter
    ├── lib/                               cn, fonts, anthropic, project-context,
    │                                      use-shortcuts
    ├── motion/variants.ts                 swoopIn, splitLineUp, drawerIn, …
    └── styles/tokens.css                  Ajloun Stone palette + motion tokens
```

## Run it

```bash
cd phase1
cp .env.example .env.local       # add ANTHROPIC_API_KEY
pnpm install                     # or npm install
pnpm dev                         # http://localhost:3000
```

You should see:

- A cinematic hero ("A villa is being built in Ajloun.") with parallax, particles, three floating glass cards, magnetic CTAs, scroll cue.
- A **Now Bar** floating at top — Villa Ajloun · Week 28 · Health 94 · ⌘K · 🔔 · theme toggle.
- A **cursor light** following the mouse.
- A **floating "Ask Villa"** button bottom-right → opens a side drawer with a streaming chat against Claude.
- `⌘K` (Mac) / `Ctrl+K` opens the **command palette**.

## What's wired vs. stubbed

| Wired & working | Stubbed for Phase 2 |
| --- | --- |
| Tokens, fonts, glass system, motion variants | Routes for `/dashboard`, `/timeline`, `/contractors`, `/deliverables` |
| Hero Scene 1 (Threshold) | Scenes 2–12 |
| Cursor light · Now Bar · Command Palette | Palette result actions (currently navigates by label only) |
| AI Assistant streaming (`/api/assistant`) | Tool calling (function-call style "do X" actions) |
| Smart Insight endpoint (`/api/insight`) | Live snapshot from Supabase (currently uses `DEMO_SNAPSHOT`) |
| BIM `SiteViewer` shell with Speckle adapter | Real model load (requires `@speckle/viewer` install + stream id) |
| Supabase schema + RLS | Auth flow + page-level guards |

## Next steps (in order)

1. **Get the assistant talking.** Set `ANTHROPIC_API_KEY`, run `pnpm dev`, click "Ask Villa", ask *"What's blocked this week?"*. You'll see the snapshot-grounded answer stream in.
2. **Apply the Supabase schema.** `supabase db reset` or paste `0001_init.sql` into the SQL editor. Then swap `DEMO_SNAPSHOT` for `getLiveSnapshot()` (sketched in `AI_ASSISTANT.md`).
3. **Add a Speckle stream.** Push your first model to <https://speckle.xyz>, set `NEXT_PUBLIC_SPECKLE_*` env vars, `pnpm add @speckle/viewer`. The `SiteViewer` is already wired.
4. **Build Scene 2 (The Brief).** Use the same pattern as `HeroThreshold` — `motion/variants.ts` already has `splitLineUp` and `swoopIn`. Should take an afternoon.

The strategy doc has the week-by-week roadmap. This Phase 1 slice corresponds to Weeks 1–3 of that roadmap, executed in a single pass so you can feel the system before committing to the rest.
