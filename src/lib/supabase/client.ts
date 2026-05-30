'use client';
import { createBrowserClient } from '@supabase/ssr';

// Supports both the new publishable key (sb_publishable_…) and the legacy anon key (ey…).
const KEY = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!;

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, KEY);
}
