'use client';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pill } from '@/components/ui/Pill';
import { Magnet } from '@/components/ui/Magnet';

// Lazy-load the WebGL canvas so the rest of the page stays fast.
const SpeckleCanvas = dynamic(() => import('./speckle/SpeckleCanvas'), {
  ssr: false,
  loading: () => <CanvasSkeleton />,
});

export type Zone = {
  id: string;
  label: string;
  description?: string;
  camera: { phi: number; theta: number; r: number };
};

export function SiteViewer({
  streamId,
  zones,
}: {
  streamId: string;
  zones: Zone[];
}) {
  const [active, setActive] = useState<Zone | null>(null);

  return (
    <section className="relative">
      <Eyebrow>Site &amp; BIM</Eyebrow>
      <div className="mt-2 flex items-baseline justify-between">
        <h2 className="font-display text-[clamp(32px,4vw,52px)] text-bark tracking-tighter">
          The model, live.
        </h2>
        <Pill tone="olive" dot>connected</Pill>
      </div>

      <div className="mt-6 relative">
        <GlassPanel radius="hero" elev={4} className="overflow-hidden">
          <div className="aspect-[16/10] w-full relative">
            <SpeckleCanvas streamId={streamId} activeCamera={active?.camera} />
            {/* Zone chips */}
            <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
              {zones.map(z => (
                <Magnet key={z.id} strength={0.18}>
                  <button
                    onClick={() => setActive(z)}
                    className={`
                      glass rounded-full px-3 py-1.5 text-[11.5px] font-semibold tracking-wide
                      transition shadow-e2 hover:shadow-e3
                      ${active?.id === z.id ? 'bg-bark/90 text-cream' : 'text-bark'}
                    `}
                  >
                    {z.label}
                  </button>
                </Magnet>
              ))}
            </div>

            {/* Zone detail glass panel slides up */}
            <AnimatePresence>
              {active && (
                <motion.div
                  initial={{ y: 32, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 32, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
                  className="absolute bottom-4 right-4 z-10 w-[280px]"
                >
                  <GlassPanel radius="card" elev={3} className="p-4">
                    <Eyebrow>Zone</Eyebrow>
                    <div className="font-display text-[22px] text-bark leading-tight mt-1">
                      {active.label}
                    </div>
                    <p className="mt-2 text-[12.5px] text-stone leading-relaxed">
                      {active.description ?? 'Planned works for this zone will appear here, linked back to the timeline and deliverables.'}
                    </p>
                    <button
                      onClick={() => setActive(null)}
                      className="mt-3 text-[11.5px] text-stone hover:text-bark transition"
                    >
                      ← Back to overview
                    </button>
                  </GlassPanel>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassPanel>
      </div>
    </section>
  );
}

function CanvasSkeleton() {
  return (
    <div className="absolute inset-0 hero-ambient flex items-center justify-center">
      <div className="num text-stone text-[11px] tracking-eyebrow uppercase">Loading model…</div>
    </div>
  );
}
