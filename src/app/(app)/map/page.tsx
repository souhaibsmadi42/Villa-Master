import { createClient } from '@/lib/supabase/server';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { SiteMap, type BuildingNode } from '@/components/map/SiteMap';

export const dynamic = 'force-dynamic';

export default async function MapPage() {
  const sb = await createClient();
  const [{ data: buildings }, { data: activities }] = await Promise.all([
    sb.from('building').select('id,key,name').order('key'),
    sb.from('activity').select('id,name,progress,weight,status,building_id, contractor:contractor_id(name)'),
  ]);

  const acts = activities ?? [];
  const nodes: BuildingNode[] = (buildings ?? []).map(b => {
    const own = acts.filter(a => a.building_id === b.id);
    const W = own.reduce((s, a) => s + (a.weight || 1), 0) || 1;
    const progress = Math.round(own.reduce((s, a) => s + (a.weight || 1) * a.progress, 0) / W);
    const contractors = Array.from(new Set(own.map((a: any) => a.contractor?.name).filter(Boolean)));
    return {
      id: b.id, key: b.key, name: b.name,
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
      <div>
        <Eyebrow>Villa Ajloun · Site</Eyebrow>
        <h1 className="font-display text-[clamp(28px,4vw,44px)] tracking-tighter mt-1">Project Map</h1>
        <p className="text-stone text-[13px]">Progress by building. Click a zone to drill in.</p>
      </div>
      <SiteMap buildings={nodes} />
    </div>
  );
}
