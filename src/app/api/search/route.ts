import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lightweight search index for the ⌘K palette. RLS-scoped to the caller.
// Response: { items: [{ type, label, href, sub? }] }
export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ items: [] }, { status: 401 });

  const [{ data: activities }, { data: contractors }, { data: documents }, { data: deliverables }] = await Promise.all([
    sb.from('activity').select('id,name,contractor:contractor_id(name)').order('sort'),
    sb.from('contractor').select('id,name,scope'),
    sb.from('document').select('id,title,category'),
    sb.from('deliverable').select('id,name,status'),
  ]);

  type Named = { name: string } | { name: string }[] | null;
  const nameOf = (c: Named) => (Array.isArray(c) ? c[0]?.name : c?.name) ?? undefined;

  const items = [
    ...(activities ?? []).map(a => ({ type: 'Activity', label: a.name, href: `/activities/${a.id}`, sub: nameOf(a.contractor as Named) })),
    ...(contractors ?? []).map(c => ({ type: 'Contractor', label: c.name, href: `/contractors/${c.id}`, sub: c.scope ?? undefined })),
    ...(deliverables ?? []).map(d => ({ type: 'Deliverable', label: d.name, href: `/deliverables?focus=${d.id}`, sub: d.status.replace(/_/g, ' ') })),
    ...(documents ?? []).map(d => ({ type: 'Document', label: d.title, href: `/documents?q=${encodeURIComponent(d.title)}`, sub: d.category?.replace(/_/g, ' ') })),
  ];
  return Response.json({ items });
}
