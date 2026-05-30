import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Supports both the new publishable key (sb_publishable_…) and the legacy anon key (ey…).
const KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

// Server-side Supabase client (RLS enforced via the user's session cookie).
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(list) {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* called from a Server Component — middleware refreshes instead */ }
        },
      },
    }
  );
}
