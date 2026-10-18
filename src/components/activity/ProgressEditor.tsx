'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { updateActivity } from '@/app/(app)/activities/actions';
import { ACTIVITY_STATUSES, activityStatus, humanize, toneColor } from '@/lib/status';
import { Ring } from '@/components/ui/Ring';
import { Spinner } from '@/components/ui/Spinner';
import { PanelHeader } from '@/components/ui/Panel';
import { useToast } from '@/components/ui/Toast';

export function ProgressEditor({ id, progress, status, canEdit }: { id: string; progress: number; status: string; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [p, setP] = useState(progress);
  const [committed, setCommitted] = useState(progress);
  const [s, setS] = useState(status);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function commit(next: { progress?: number; status?: string }) {
    if (!canEdit) return;
    if (next.progress != null && next.progress === committed) return;
    start(async () => {
      const r = await updateActivity(id, next);
      if (!r.ok) { toast.error('Could not save', r.error); setP(committed); setS(status); return; }
      if (next.progress != null) setCommitted(next.progress);
      setSaved(true); setTimeout(() => setSaved(false), 1600);
      router.refresh();
    });
  }

  const tone = activityStatus(s).tone;
  return (
    <div className="flex flex-col gap-4">
      <PanelHeader label="Progress" action={
        <AnimatePresence mode="wait">
          {pending ? <motion.span key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-[11px] text-muted"><Spinner size={11} /> Saving</motion.span>
            : saved ? <motion.span key="s" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-[11px] text-success"><Check size={12} /> Saved</motion.span> : null}
        </AnimatePresence>
      } />
      <div className="flex items-center gap-5">
        <Ring value={p / 100} size={92} stroke={5} color={toneColor[tone]} />
        <div className="flex-1">
          <input type="range" min={0} max={100} step={5} value={p} disabled={!canEdit} aria-label="Progress percent"
            onChange={e => setP(+e.target.value)}
            onPointerUp={() => commit({ progress: p })}
            onKeyUp={e => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) commit({ progress: p }); }}
            className="w-full cursor-pointer accent-[rgb(var(--c-accent))] disabled:cursor-not-allowed disabled:opacity-50" />
          <div className="num mt-1 flex justify-between text-[10px] text-faint"><span>0</span><span>50</span><span>100</span></div>
        </div>
      </div>
      <label className="flex items-center justify-between gap-3">
        <span className="label">Status</span>
        <select value={s} disabled={!canEdit || pending} onChange={e => { setS(e.target.value); commit({ status: e.target.value }); }}
          className="field field-sm w-auto min-w-[150px] capitalize" style={{ color: toneColor[tone] }}>
          {ACTIVITY_STATUSES.map(x => <option key={x} value={x}>{humanize(x)}</option>)}
        </select>
      </label>
      {!canEdit && <p className="text-[11px] text-faint">Read-only for your role.</p>}
    </div>
  );
}
