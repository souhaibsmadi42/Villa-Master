import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { computeMetrics, type ActivityLite } from '@/lib/metrics';
import { PageHeader } from '@/components/ui/PageHeader';
import { SiteViewer, type Zone, type SavedModel } from '@/components/bim/SiteViewer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Model viewer' };

const ZONES: (Zone & { buildings: string[] })[] = [
  { id: 'entry', label: 'Entry & Boundary', description: 'Stone-clad boundary wall, gate, and guard house.', camera: { phi: 1.0, theta: -0.5, r: 20 }, buildings: ['boundary_wall', 'guard_house'] },
  { id: 'main',  label: 'Main Chalet',      description: 'Two-storey steel-framed duplex — the heart of the villa.', camera: { phi: 0.7, theta: 0.2, r: 24 }, buildings: ['main_chalet'] },
  { id: 'suite', label: 'Private Suite',    description: 'Standalone KONN precast suite.', camera: { phi: 0.8, theta: 0.9, r: 18 }, buildings: ['private_suite'] },
  { id: 'wellness', label: 'Wellness & Gym', description: 'Lower jacuzzi/sauna/steam, upper-floor gym.', camera: { phi: 0.9, theta: 1.3, r: 20 }, buildings: ['wellness'] },
  { id: 'courts', label: 'Courts',          description: 'Football and paddle courts with glass enclosure.', camera: { phi: 1.1, theta: 1.6, r: 26 }, buildings: ['courts'] },
  { id: 'pool',  label: 'Pool',             description: '12 m × 5 m pool and plant room.', camera: { phi: 0.9, theta: 0.5, r: 14 }, buildings: ['pool'] },
];
const MODEL_RE = /\.(glb|gltf|fbx|obj|stl|ply|dae|3mf)$/i;

export default async function SitePage() {
  const streamId = process.env.NEXT_PUBLIC_SPECKLE_STREAM_ID || '';
  const sb = await createClient();
  const profile = await getSessionProfile();

  const [{ data: project }, { data: buildings }, { data: acts }, { data: docs }, { data: versions }] = await Promise.all([
    sb.from('project').select('id').limit(1).maybeSingle(),
    sb.from('building').select('id,key'),
    sb.from('activity').select('building_id,start_date,end_date,baseline_start,baseline_end,progress,weight,status'),
    sb.from('document').select('id,title,current_version').order('created_at', { ascending: false }),
    sb.from('document_version').select('document_id,version,storage_path,uploaded_at'),
  ]);

  const A = (acts ?? []) as (ActivityLite & { building_id: string | null })[];
  const idOf = new Map((buildings ?? []).map(b => [b.key, b.id]));
  const zones: Zone[] = ZONES.map(({ buildings: keys, ...z }) => {
    const ids = keys.map(k => idOf.get(k)).filter(Boolean);
    const own = A.filter(a => a.building_id && ids.includes(a.building_id));
    return { ...z, progress: own.length ? computeMetrics(own).progress : null };
  });

  // Saved models = documents whose current version is a 3D model file.
  const saved: SavedModel[] = (docs ?? []).flatMap(d => {
    const v = (versions ?? []).find(x => x.document_id === d.id && x.version === d.current_version);
    return v && MODEL_RE.test(v.storage_path)
      ? [{ id: d.id, title: d.title, version: v.version, storage_path: v.storage_path, uploaded_at: v.uploaded_at }]
      : [];
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="Model" title={<>The model, <em className="italic text-accent">in the room.</em></>}
        sub="Open BIM and 3D exports directly in the browser — orbit, cut a section, inspect elements — and keep approved models with the project." />
      <SiteViewer streamId={streamId} zones={zones} projectId={project?.id ?? ''} savedModels={saved}
        canUpload={!!project?.id && profile?.role !== 'owner'} />
    </div>
  );
}
