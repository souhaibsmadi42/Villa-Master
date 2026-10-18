import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/PageHeader';
import { SiteMap, type BuildingNode } from '@/components/map/SiteMap';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Site map' };

export default async function MapPage() {
  const sb = await createClient();
  const [{ data: buildings }, { data: activities }] = await Promise.all([
    sb.from('building').select('id,key,name,map_x,map_y,map_w,map_h').order('key'),
    sb.from('activity').select('id,name,progress,weight,status,building_id, contractor:contractor_id(name)'),
  ]);

  const acts = activities ?? [];
  const nodes: BuildingNode[] = (buildings ?? []).map(b => {
    const own = acts.filter(a => a.building_id === b.id);
    const W = own.reduce((s, a) => s + (a.weight || 1), 0) || 1;
    const progress = Math.round(own.reduce((s, a) => s + (a.weight || 1) * a.progress, 0) / W);
    const contractors = Array.from(new Set(own.map(a => { const c = a.contractor as { name: string } | { name: string }[] | null; return Array.isArray(c) ? c[0]?.name : c?.name; }).filter((n): n is string => !!n)));
    return {
      id: b.id, key: b.key, name: b.name,
      plan: b.map_x != null && b.map_y != null && b.map_w != null && b.map_h != null ? { x: b.map_x, y: b.map_y, w: b.map_w, h: b.map_h } : null,
      progress: own.length ? progress : 0,
      contractors,
      activities: own.map(a => ({ id: a.id, name: a.name, progress: a.progress, status: a.status })),
      deliverables: 0,
    };
  });

  // deliverable counts per building (via their activities)
  const actToBuilding = new Map(acts.map(a => [a.id, a.building_id]));
  const { data: dels } = await sb.from('deliverable').select('activity_id');
  for (const d of dels ?? []) {
    const bId = actToBuilding.get(d.activity_id);
    const node = nodes.find(n => n.id === bId);
    if (node) node.deliverables++;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="Site" title={<>The site, <em className="italic text-accent">zone by zone</em></>}
        sub="Progress by building, weighted by the activities assigned to each zone. Select a zone to drill in." />
      <SiteMap buildings={nodes} />
    </div>
  );
}
