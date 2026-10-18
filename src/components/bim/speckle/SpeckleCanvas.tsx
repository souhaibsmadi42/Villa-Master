'use client';
/**
 * Speckle viewer mount — placeholder build.
 *
 * The real Speckle viewer (`@speckle/viewer`) is an optional, heavy dependency that is
 * NOT installed by default (so deploys stay fast). Until it is installed this renders
 * an honest "not connected" state — it never pretends a stream is loading.
 *
 * To enable live streams:
 *   1) npm install @speckle/viewer
 *   2) set NEXT_PUBLIC_SPECKLE_URL / _STREAM_ID / _TOKEN
 *   3) restore the loader (see BIM_VIEWER.md)
 *
 * Uploaded models (GLB, FBX, OBJ…) are handled by ModelCanvas and need none of this.
 */

type Camera = { phi: number; theta: number; r: number };

export default function SpeckleCanvas({ streamId }: { streamId: string; activeCamera?: Camera }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <div className="max-w-[380px] text-center">
        <div className="eyebrow text-stone">Speckle stream</div>
        <div className="num mt-2 text-[12px] text-limestone">{streamId}</div>
        <p className="mt-4 text-[13px] leading-relaxed text-stone">
          A stream is configured, but the Speckle viewer package is not installed on this deployment, so the live model
          cannot be displayed. Install <code className="num text-limestone">@speckle/viewer</code> (see <code className="num text-limestone">BIM_VIEWER.md</code>),
          or export the model to GLB and open it under “Uploaded models”.
        </p>
      </div>
    </div>
  );
}
