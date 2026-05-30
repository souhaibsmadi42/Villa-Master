import { Eyebrow } from '@/components/ui/Eyebrow';
import { SiteViewer, type Zone } from '@/components/bim/SiteViewer';

export const dynamic = 'force-dynamic';

const ZONES: Zone[] = [
  { id: 'entry', label: 'Entry & Boundary', description: 'Stone-clad boundary wall, gate, and guard house.', camera: { phi: 1.0, theta: -0.5, r: 20 } },
  { id: 'main',  label: 'Main Chalet',      description: 'Two-storey steel-framed duplex — the heart of the villa.', camera: { phi: 0.7, theta: 0.2, r: 24 } },
  { id: 'suite', label: 'Private Suite',    description: 'Standalone KONN precast suite.', camera: { phi: 0.8, theta: 0.9, r: 18 } },
  { id: 'wellness', label: 'Wellness & Gym', description: 'Lower jacuzzi/sauna/steam, upper-floor gym.', camera: { phi: 0.9, theta: 1.3, r: 20 } },
  { id: 'courts', label: 'Courts',          description: 'Football and paddle courts with glass enclosure.', camera: { phi: 1.1, theta: 1.6, r: 26 } },
  { id: 'pool',  label: 'Pool',             description: '12 m × 5 m pool and plant room.', camera: { phi: 0.9, theta: 0.5, r: 14 } },
];

export default function SitePage() {
  const streamId = process.env.NEXT_PUBLIC_SPECKLE_STREAM_ID || '';
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Villa Ajloun · Model</Eyebrow>
        <h1 className="font-display text-[clamp(28px,4vw,44px)] tracking-tighter mt-1">3D Site &amp; BIM</h1>
        <p className="text-stone text-[13px]">The live model. Connect a Speckle stream in <code className="num">.env.local</code> to load real geometry; otherwise a styled placeholder renders. See <code className="num">BIM_VIEWER.md</code>.</p>
      </div>
      <SiteViewer streamId={streamId} zones={ZONES} />
    </div>
  );
}
