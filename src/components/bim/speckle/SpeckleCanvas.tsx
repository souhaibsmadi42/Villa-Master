'use client';
/**
 * Speckle viewer mount — placeholder build.
 *
 * The real 3D viewer (`@speckle/viewer`) is an optional, heavy dependency that is
 * NOT installed by default (so deploys stay fast). Until you connect a Speckle
 * stream, this renders a styled placeholder.
 *
 * To enable real geometry later:
 *   1) npm install @speckle/viewer
 *   2) set NEXT_PUBLIC_SPECKLE_URL / _STREAM_ID / _TOKEN
 *   3) restore the loader (see BIM_VIEWER.md)
 */

type Camera = { phi: number; theta: number; r: number };

export default function SpeckleCanvas(_props: { streamId: string; activeCamera?: Camera }) {
  return (
    <div className="absolute inset-0 hero-ambient">
      <div className="absolute inset-x-0 bottom-1/3 h-px bg-stone/40" />
      <svg className="absolute inset-x-10 bottom-1/3" height="80" viewBox="0 0 800 80" preserveAspectRatio="none">
        <path
          d="M0 60 L80 40 L160 50 L260 22 L360 38 L460 18 L560 36 L660 28 L760 44 L800 40"
          fill="none" stroke="var(--c-bark)" strokeWidth="1.5" opacity="0.5"
        />
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="eyebrow mb-1">Awaiting model</div>
        <div className="text-[12.5px] text-stone max-w-[280px]">
          Connect a Speckle stream and install <code className="num text-bark">@speckle/viewer</code> to render
          the live model here (see <code className="num text-bark">BIM_VIEWER.md</code>).
        </div>
      </div>
    </div>
  );
}
