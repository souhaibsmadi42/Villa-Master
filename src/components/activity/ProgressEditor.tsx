'use client';
import { useState, useTransition } from 'react';
import { updateActivity } from '@/app/(app)/activities/actions';

const STATUSES = ['not_started', 'in_progress', 'on_hold', 'done', 'delayed'];

export function ProgressEditor({ id, progress, status, canEdit }: { id: string; progress: number; status: string; canEdit: boolean }) {
  const [p, setP] = useState(progress);
  const [s, setS] = useState(status);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function commit(next: { progress?: number; status?: string }) {
    if (!canEdit) return;
    start(async () => {
      await updateActivity(id, next);
      setSaved(true); setTimeout(() => setSaved(false), 1200);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Progress</span>
        <span className="num text-[13px] text-text-2">{p}%{pending && ' · saving…'}{saved && ' · saved'}</span>
      </div>
      <input type="range" min={0} max={100} value={p} disabled={!canEdit}
        onChange={e => setP(+e.target.value)}
        onMouseUp={() => commit({ progress: p })}
        onTouchEnd={() => commit({ progress: p })}
        className="w-full accent-[var(--c-olive)] disabled:opacity-50" />
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">Status</span>
        <select value={s} disabled={!canEdit}
          onChange={e => { setS(e.target.value); commit({ status: e.target.value }); }}
          className="rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-[12.5px] capitalize disabled:opacity-50">
          {STATUSES.map(x => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}
        </select>
      </div>
      {!canEdit && <p className="text-[11px] text-stone italic">Read-only for your role.</p>}
    </div>
  );
}
