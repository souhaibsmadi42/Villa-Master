/**
 * CLI seed (needs Node). Run: npm run seed
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local
 *
 * No Node locally? Use the one-click endpoint instead: POST /api/seed after deploy
 * (see LAUNCH_CHECKLIST.md).
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { seedDatabase } from '../src/lib/seed-data';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!;
if (!url || !key) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const sb = createClient(url, key, { auth: { persistSession: false } });
seedDatabase(sb)
  .then(r => console.log(`✓ Seeded:`, r))
  .catch(e => { console.error(e); process.exit(1); });
