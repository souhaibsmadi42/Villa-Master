import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lightweight search index for the ⌘K palette. RLS-scoped to the caller.
export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ items: [] }, { status: 401 });

  const [{ data: activities }, { data: contractors }, { data: documents }] = await Promise.all([
    sb.from('activity').select('id,name').order('sort'),
    sb.from('contractor').select('id,name'),
    sb.from('document').select('id,title'),
  ]);

  const items = [
    ...(activities ?? []).map(a => ({ type: 'Activity', label: a.name, href: `/activities/${a.id}` })),
    ...(contractors ?? []).map(c => ({ type: 'Contractor', label: c.name, href: `/contractors/${c.id}` })),
    ...(documents ?? []).map(d => ({ type: 'Document', label: d.title, href: `/documents` })),
  ];
  return Response.json({ items });
}
