# Villa Ajloun Platform — Launch Checklist (full Next.js app)

The complete platform (Gantt, SPI/CPI dashboard, owner portal, AI reports,
documents, map, team) — deployed **entirely from the browser**, no Node on your
machine needed. ~30 minutes.

> This is the **full platform** and is separate from the static `DRAG-THIS-TO-NETLIFY`
> Netlify site. The platform needs a build + a database, so it goes to **Vercel**,
> not Netlify drag-and-drop.

---

## STEP 1 — Create the database (Supabase)  ~5 min
1. Go to <https://supabase.com> → **New project**. Choose a region near Jordan (EU). Set a DB password (save it).
2. When ready, open **Project Settings → API** and copy three values (keep this tab open):
   - **Project URL**
   - **Publishable key** (`sb_publishable_…`) — on older projects this is the **anon** key (`ey…`)
   - **Secret key** (`sb_secret_…`) — on older projects this is the **service_role** key (`ey…`)

## STEP 2 — Create the tables  ~3 min
Supabase → **SQL Editor** → **New query**. Run these **in order** (paste each, Run, repeat):
1. `supabase/migrations/0001_init.sql`  (tables, RLS, storage bucket)
2. `supabase/migrations/0002_phase3.sql`  (team, approvals, snapshots)
3. `supabase/migrations/0003_realtime.sql`  (live feed)

Open each file from the `phase1/supabase/migrations` folder, copy all, paste, Run.

## STEP 3 — Make OTP send a code  ~1 min
Supabase → **Authentication → Email Templates → Magic Link** → make sure the body
contains the token, e.g. add this line:
```
Your Villa Ajloun sign-in code is: {{ .Token }}
```

## STEP 4 — Put the code on GitHub (browser only)  ~5 min
1. <https://github.com/new> → create an empty repo (e.g. `villa-ajloun-platform`), **no** README.
2. On the new repo page → **uploading an existing file**.
3. Drag the **contents of the `phase1` folder** into the upload area (you can drag the
   whole folder; GitHub keeps the structure). Wait for it to finish → **Commit changes**.
   - Make sure `src/`, `supabase/`, `package.json`, `next.config.mjs`, `vercel.json` are at the repo root (not inside a `phase1/` subfolder).

## STEP 5 — Deploy on Vercel  ~5 min
1. <https://vercel.com> → sign in with GitHub → **Add New → Project** → import your repo.
2. Framework preset auto-detects **Next.js**. Leave build settings default.
3. **Environment Variables** — add these (from Step 1 + your own values):

   | Key | Value |
   | --- | ----- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the `sb_publishable_…` key (or use `NEXT_PUBLIC_SUPABASE_ANON_KEY` if older) |
   | `SUPABASE_SECRET_KEY` | the `sb_secret_…` key (or use `SUPABASE_SERVICE_ROLE_KEY` if older) |
   | `CRON_SECRET` | any long random string (you choose) |
   | `ANTHROPIC_API_KEY` | for AI reports (optional) |
   | `RESEND_API_KEY` | for emailing reports (optional) |
   | `RESEND_FROM` | `Villa Ajloun <noreply@yourdomain>` (optional) |

   > Your project (`iqfdiytjkniwufdndhtc`) uses the **new** keys, so use
   > `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SECRET_KEY`. The code accepts
   > either naming, so you don't need to change any files.

4. Click **Deploy**. Wait for the build to finish → you get a URL like `villa-ajloun.vercel.app`.

## STEP 6 — Tell Supabase about the Vercel URL  ~1 min
Supabase → **Authentication → URL Configuration** → set **Site URL** to your Vercel
URL and add it under **Redirect URLs**. (So sign-in works in production.)

## STEP 7 — Load the real project data (one click)  ~1 min
Open this in your browser (replace the domain + your `CRON_SECRET`):
```
https://YOUR-APP.vercel.app/api/seed?secret=YOUR_CRON_SECRET
```
You should see JSON: `{ "ok": true, "seeded": { "activities": 33, ... } }`.
(Run it once. Running again wipes + re-seeds the Villa Ajloun project.)

## STEP 8 — Sign in & become admin  ~2 min
1. Open `https://YOUR-APP.vercel.app` → **Sign in** → enter your email → check inbox for the code → verify.
2. Make yourself admin: Supabase → SQL Editor →
   ```sql
   update profile set role = 'admin', full_name = 'Eng. Suhaib'
   where email = 'souhaibalsmadi@icloud.com';
   ```
3. Refresh — you now see Dashboard, Timeline, Map, 3D, Milestones, Documents, Contractors, Reports, Owner, Team.

## STEP 9 — Add your team (in the app)
Go to **Team** → add people by email, choose role (owner / consultant / contractor)
and contractor scope. They get that access the moment they first sign in.

---

## Verify it's working
- `https://YOUR-APP.vercel.app/dashboard` → SPI/CPI, S-curve, live feed.
- `/timeline` → drag the Gantt, click a bar → drawer opens.
- `/reports` → Generate (needs `ANTHROPIC_API_KEY`) + Capture snapshot.
- `/owner` → approve a deliverable.
- ⌘K → search.

## Notes
- **Storage bucket** for documents is created by `0001_init.sql` automatically.
- **Weekly snapshot**: `vercel.json` runs a Monday cron hitting `/api/snapshot`; Vercel
  sends the `CRON_SECRET` automatically. Nothing to wire.
- **No AI key?** Reports fall back to a templated summary; everything else works.
- This replaces the static `ksvilla.netlify.app` site when you're ready — they can
  run in parallel until then.
