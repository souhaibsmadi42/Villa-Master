# Villa Master — Villa Ajloun

The project intelligence platform for the Villa Ajloun build (Ajloun, Jordan): programme, contractors,
deliverables, documents, the 3D model and an AI project assistant — Next.js 15 + Supabase.

## Run it

```bash
npm install
# .env.local
#   NEXT_PUBLIC_SUPABASE_URL=…            NEXT_PUBLIC_SUPABASE_ANON_KEY=…   (or _PUBLISHABLE_KEY)
#   ANTHROPIC_API_KEY=…                    (assistant, insight note, weekly reports)
#   optional: ANTHROPIC_MODEL, RESEND_API_KEY, RESEND_FROM, CRON_SECRET, SUPABASE_SECRET_KEY,
#             NEXT_PUBLIC_SPECKLE_STREAM_ID
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run build        # type errors fail the build
```

Seed the database with `npm run seed` (CLI) or `/api/seed?secret=$CRON_SECRET` after deploying.

## Routes

| Route | What it is |
| --- | --- |
| `/` | Public landing — cinematic opening, project, programme to scale, trades, milestones. Figures come from `PROGRAMME` in `lib/seed-data.ts`. |
| `/login` | One-time-code sign-in (Supabase OTP). |
| `/dashboard` | Overview: completion vs plan, building progress on the elevation, needs-attention list, milestones, S-curve, contractor progress, computed insights, live activity feed. |
| `/timeline` | Gantt: zoom, colour by contractor/status, baseline, critical path, milestone lane, dependency tracing, today marker, docked detail. Admins can **Reschedule** the whole programme to a new start date (needs migration `0004_reschedule.sql`). |
| `/contractors`, `/contractors/[id]` | Contractor workspace: standing vs plan, current tasks, deadlines, outstanding actions, scope chart. |
| `/deliverables` | List / board, search (`/`), status pipeline filter, approvals with history, inline edits, delete with confirmation. Supports `?status=awaiting|overdue|<status>` and `?focus=<id>`. |
| `/documents` | Versioned documents: drag-and-drop upload, version history, download tracking, approve/reject. Supports `?q=`. |
| `/milestones`, `/map`, `/reports`, `/owner`, `/team` | Milestone road with delay tracking; site map by zone; weekly reports; owner executive view; team & access (admin). |
| `/site` | **Model viewer** — open GLB, glTF, FBX, OBJ (+MTL/textures), STL, PLY, DAE, 3MF in the browser; orbit, clay/wire modes, Y/Z-up, section cut, part visibility, element details, screenshot, fullscreen; *Save to project* stores single-file models in Supabase Storage (`documents` bucket) as documents. |
| `/activities/[id]` | Activity detail (also opens as a drawer from in-app links). |

## Design system

- **Tokens** — `src/app/globals.css` (RGB-channel CSS variables, light + dark themes) mapped in `tailwind.config.ts`
  (`canvas`, `surface`, `raised`, `ink`, `muted`, `accent`, `success`, `warning`, `critical`, brand constants `obsidian`, `limestone`, `bronze`, …).
- **Type** — Instrument Serif (display), Geist (interface), Geist Mono (technical). All self-hosted — no build-time font downloads.
- **Motion** — `src/motion/tokens.ts` (durations, easings, springs) and `src/motion/variants.ts`. `MotionConfig reducedMotion="user"` plus a CSS
  reduced-motion rule make every animation respect `prefers-reduced-motion`. Landing intro runs once; returning visitors get the short version.
- **Primitives** — `src/components/ui/`: Button, Panel, Badge, Ring, AnimatedNumber, Segmented/Switch/Chip/ProgressBar, Sheet, Drawer,
  ConfirmDialog (`useConfirm`), Toast (`useToast`), Tooltip, Popover, PageHeader, EmptyState/ErrorState/Skeleton.
- **Shell** — `src/components/chrome/`: sidebar (rail on tablet, drawer on mobile), floating status bar (live health, week, phase, notifications,
  theme, account), ⌘K / Ctrl+K command palette (navigation, recent, actions, project search), ⌘J / Ctrl+J assistant.

## AI assistant

`/api/assistant` streams Claude's answer (SSE: `context`, `delta`, `done`, `error`) grounded in a live, RLS-scoped snapshot
built by `getLiveSnapshotText()` in `src/lib/project-data.ts`. It requires a signed-in user. Suggestions are visibly separated
from recorded facts. **Without `ANTHROPIC_API_KEY`** it still works: `src/lib/offline-assistant.ts` answers the common
questions (status, delays and what they hold up, approvals, overdue items, next milestone, any contractor, a weekly-update draft)
directly from the same live data, and the UI labels those answers "Computed from live data · not AI-written". Add the key and the
same panel switches to Claude automatically.

## Notes

- The hero / overview image is an **original illustrative SVG elevation** (`components/scenes/Elevation.tsx`), labelled as such.
  It is not site photography or the design model.
- Speckle streaming remains optional (`components/bim/speckle/`, see `BIM_VIEWER.md`); uploaded models need no extra packages.
- The site map uses `building.map_x/y/w/h` when recorded; otherwise it shows a labelled schematic arrangement.
