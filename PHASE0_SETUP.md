# Phase 0 — Foundation setup (Supabase + Auth + real data)

This turns the `phase1` scaffold into a running platform foundation:
**Supabase Postgres + RLS**, **OTP email login**, your **real project data** seeded,
and a **live dashboard** that reads from the database with role-based security.

What you get when this is done:
- Sign in with an email one-time code (Supabase Auth).
- A `/dashboard` that shows live activity/deliverable/milestone counts.
- Row-level security: a contractor literally cannot query another contractor's data.

---

## 1. Create a Supabase project
1. Go to <https://supabase.com> → New project. Pick a region near Jordan (e.g. EU).
2. When it's ready, open **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, keep secret)

## 2. Run the schema
Supabase dashboard → **SQL Editor** → paste the contents of
`supabase/migrations/0001_init.sql` → **Run**. This creates all tables, the
role helpers, the auto-profile trigger, the metrics view, and RLS policies.

## 3. Configure env vars
```bash
cd phase1
cp .env.example .env.local
```
Fill in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...     # optional, for AI features later
```

## 4. Make OTP send a 6-digit code (not a magic link)
Supabase dashboard → **Authentication → Email Templates → Magic Link**.
Make sure the template includes the token, e.g.:
```
Your Villa Ajloun sign-in code is: {{ .Token }}
```
(Default templates send a link; adding `{{ .Token }}` enables the 6-digit code
that the login page asks for. The link still works too.)

Also under **Authentication → Providers → Email**, keep "Email OTP" enabled.

## 5. Seed your real project data
```bash
npm install
npm run seed
```
You should see (exact deliverable count is printed):
```
✓ Seeded: 33 activities, ~100 deliverables, 7 milestones, 8 contractors.
```
This imports the actual Villa Ajloun programme (the same data as the current
dashboard) into Postgres.

## 6. Run it
```bash
npm run dev      # http://localhost:3000
```
- Go to `http://localhost:3000/login`.
- Enter your email → check inbox for the 6-digit code → verify.
- You land on `/dashboard` with live data.

## 7. Make yourself admin
New sign-ups default to `contractor`. After your **first** sign-in, set your role
in Supabase → SQL Editor:
```sql
update profile set role = 'admin', full_name = 'Eng. Suhaib'
where email = 'souhaibalsmadi@icloud.com';
```
Refresh the dashboard — you'll now see everything and the Team/Owner nav.

To add teammates later, either invite them (they sign in once, then you set
their role/contractor), or build the Team page (Phase 3) to do it in the UI.

```sql
-- example: make someone a contractor scoped to KONN
update profile
set role = 'contractor',
    contractor_id = (select id from contractor where key = 'konn')
where email = 'konn@example.com';
```

---

## What's wired in Phase 0
| Piece | File |
| --- | --- |
| Full schema + RLS + metrics view | `supabase/migrations/0001_init.sql` |
| Real-data importer | `supabase/seed.ts` (`npm run seed`) |
| Browser/server Supabase clients | `src/lib/supabase/{client,server}.ts` |
| Session refresh + route guard | `src/middleware.ts` |
| Role helpers | `src/lib/rbac.ts` |
| OTP login | `src/app/(auth)/login/page.tsx` |
| Authed app shell + role nav | `src/app/(app)/layout.tsx`, `src/components/chrome/AppHeader.tsx` |
| Live dashboard | `src/app/(app)/dashboard/page.tsx` |

## Phase 1 — the spine (BUILT ✓)
Now included and reading/writing live from the DB:

| Page | What it does |
| --- | --- |
| `/timeline` | **React Gantt** — zoom (year/quarter/month/week), drag-to-scroll, touch, dependency lines, critical-path highlight, baseline-vs-plan overlay, delay colouring, contractor filter chips. Click any bar → activity. |
| `/activities/[id]` | **Activity detail** (URL-addressable). Description, schedule (baseline/plan/actual), dependencies, **editable progress + status**, **full deliverable CRUD** (status/priority/category/due), **comments**. |

Writes go through Server Actions (`src/app/(app)/activities/actions.ts`) and are
governed by RLS: staff can edit anything; a contractor can edit only their own
activities/deliverables; owners are read-only. Re-run `npm run seed` to get the
dependency links + critical-path chain used by the Gantt.

Try it: open `/timeline`, drag across the schedule, switch zoom, filter by a
contractor, click a bar, move the progress slider, add a deliverable, post a comment.

## Phase 2 — control center (BUILT ✓)
| Page | What it does |
| --- | --- |
| `/dashboard` | **Advanced dashboard**: health ring, **SPI** & **CPI**, **S-curve** (planned cumulative vs actual-today, Recharts), pending approvals, upcoming deliverables, delayed activities, live activity feed, milestone rail. |
| `/milestones` | Milestone cards with **planned vs actual + delay days**; staff can set actual date/status. |
| `/map` | **Project map** — building cards with progress; click a zone → responsible contractors, related activities, deliverable count. |
| `/documents` | **Document center** — category filter, **upload to Supabase Storage**, **version history**, **approve/reject** (staff/owner), **download tracking** (signed URLs). |

Metrics math lives in `src/lib/metrics.ts` (SPI/CPI/health/S-curve — pure functions).
The migration auto-creates a private **`documents`** Storage bucket + policies, so
uploads work after you run `0001_init.sql` — no manual storage setup.

> CPI shows "—" until you add budget/actual figures to the `cost_line` table.
> The S-curve plots the planned cumulative curve plus a dot for today's actual
> (honest: historical earned-value needs progress snapshots, which Phase 3 adds).

## Phase 3 — owner, AI reports, team, snapshots (BUILT ✓)
Run the **second migration** first: SQL Editor → paste `supabase/migrations/0002_phase3.sql` → Run.

| Page / endpoint | What it does |
| --- | --- |
| `/owner` | **Owner portal** (admin/owner): progress ring, S-curve, **one-tap approve/reject** of deliverables, financial summary (budget vs spend), contractor performance, upcoming milestones, latest report. |
| `/reports` | **AI weekly reports** — admin/consultant click *Generate* → Claude drafts a 3-paragraph owner update from live metrics, saved to the `report` table. Past reports listed. |
| `/team` | **Team management** (admin) — add people by email, set role (owner/consultant/contractor) + contractor scope. Applied the moment they sign in (via the `team_member` roster + signup trigger). |
| `POST /api/snapshot` | Records today's earned/planned/SPI → the S-curve gains a real **actual line**. Trigger from `/reports` ("Capture progress snapshot") or from cron with header `x-cron-secret: $CRON_SECRET`. |

New env (optional): `CRON_SECRET` (for scheduled snapshots), `RESEND_API_KEY`
(if you later email reports). The AI report falls back to a templated summary if
`ANTHROPIC_API_KEY` is absent, so it never hard-fails.

Security note: owner approvals use a `SECURITY DEFINER` function
(`approve_deliverable`) so owners can approve **without** broad write access —
RLS still blocks them from editing anything else.

### Weekly snapshot via cron (optional)
Point any scheduler (Vercel Cron, GitHub Action, cron-job.org) at:
```
POST https://your-app/api/snapshot   header  x-cron-secret: <CRON_SECRET>
```
Weekly is plenty — each call adds one point to the earned-value curve.

## Phase 4 — polish (BUILT ✓)
Run `supabase/migrations/0003_realtime.sql` (enables the live feed).

| Feature | Where |
| --- | --- |
| **⌘K command palette** | Press ⌘K / Ctrl-K anywhere in the app — search activities, contractors, documents, jump to any page. (`CommandK`, `/api/search`) |
| **Realtime activity feed** | Dashboard "Recent activity · live" updates instantly via Supabase Realtime as anyone edits. (`LiveFeed`) |
| **Drawer over timeline** | Clicking a Gantt bar opens the activity in a slide-in **drawer** (Next.js intercepting route); refreshing that URL shows the full page. (`@modal/(.)activities/[id]`, `Drawer`) |
| **3D Site / BIM** | `/site` — Speckle viewer with clickable zones; styled placeholder until a stream is configured (`BIM_VIEWER.md`). |
| **Report emailing** | `/reports` → "Email latest to owner" sends via Resend to owners + admins. |
| **Marketing homepage** | `/` — public luxury landing (hero, stats, journey, contractors, milestones, CTA) with scroll reveals. "Sign in" → `/login`. |

## Deploy to Vercel (recommended for the Next.js app)
1. Push `phase1/` to a Git repo. In Vercel: **New Project** → import it → Framework **Next.js** (auto).
2. **Environment Variables** — add the same keys as `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `ANTHROPIC_API_KEY`, `CRON_SECRET`, and (optional) `RESEND_API_KEY`, `RESEND_FROM`.
3. **Deploy.** `vercel.json` registers a weekly cron (`Mon 06:00`) that POSTs `/api/snapshot`;
   Vercel auto-sends `Authorization: Bearer $CRON_SECRET`, which the route accepts.
4. In Supabase → **Authentication → URL Configuration**, add your Vercel domain to
   the allowed redirect/site URLs so OTP sign-in works in production.

(The static `ksvilla.netlify.app` site is the older single-page version; this
Next.js app is the full platform and replaces it once you're ready to switch.)

## What's done (Phases 0–4) — the whole blueprint
Auth + RLS · activity/deliverable spine · interactive Gantt with drawer · advanced
dashboard (SPI/CPI/S-curve + earned-value) · milestones · project map · document
center · owner portal · AI weekly reports + email · team management · progress
snapshots · ⌘K palette · realtime feed · 3D/BIM frame · marketing homepage · Vercel
cron. Future niceties only: real BIM geometry, voice/AI assistant, multi-project.

## Notes
- **Security:** RLS is enforced in the database, so even direct API calls respect
  roles. The `service_role` key (used only by the seed) bypasses RLS — never ship
  it to the browser; it stays in `.env.local`.
- **Deploy:** this is a Next.js app — deploy to Vercel (recommended) or Netlify
  with the Next runtime. The static `ks-villa-netlify` site is separate; this
  Phase 0 app is the migration target, run it locally first.
