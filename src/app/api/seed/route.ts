import { createClient } from '@supabase/supabase-js';
import { seedDatabase } from '@/lib/seed-data';

export const runtime = 'nodejs';
export const maxDuration = 60;

// One-click seed (no local Node needed). Protect with CRON_SECRET.
// Usage after deploy:  POST /api/seed   header  x-seed-secret: <CRON_SECRET>
//             or open  /api/seed?secret=<CRON_SECRET>  in the browser.
async function run(secret: string | null) {
  if (!process.env.CRON_SECRET) return { status: 500, body: { error: 'no_secret', message: 'Set CRON_SECRET in env first.' } };
  if (secret !== process.env.CRON_SECRET) return { status: 403, body: { error: 'forbidden', message: 'Wrong or missing secret.' } };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // New secret key (sb_secret_…) or legacy service_role key (ey…) — both bypass RLS for seeding.
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { status: 500, body: { error: 'config', message: 'Missing Supabase URL or secret/service-role key.' } };

  const sb = createClient(url, key, { auth: { persistSession: false } });
  try {
    const result = await seedDatabase(sb);
    return { status: 200, body: { ok: true, seeded: result } };
  } catch (e: any) {
    return { status: 500, body: { error: 'seed_failed', message: e?.message ?? String(e) } };
  }
}

export async function POST(req: Request) {
  const r = await run(req.headers.get('x-seed-secret') ?? new URL(req.url).searchParams.get('secret'));
  return Response.json(r.body, { status: r.status });
}
export async function GET(req: Request) {
  const r = await run(new URL(req.url).searchParams.get('secret'));
  return Response.json(r.body, { status: r.status });
}
