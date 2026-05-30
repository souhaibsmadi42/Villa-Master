'use client';
import { useState, useTransition } from 'react';
import { updateMilestone } from '@/app/(app)/milestones/actions';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Pill } from '@/components/ui/Pill';

export type MS = { id: string; name: string; planned_date: string | null; actual_date: string | null; status: string };
const STATUS = ['planned', 'in_progress', 'achieved', 'missed'];

function delayDays(planned: string | null, actual: string | null) {
  if (!planned || !actual) return null;
  return Math.round((+new Date(actual) - +new Date(planned)) / 86400000);
}

export function MilestoneEditor({ ms, canEdit }: { ms: MS; canEdit: boolean }) {
  const [actual, setActual] = useState(ms.actual_date ?? '');
  const [status, setStatus] = useState(ms.status);
  const [pending, start] = useTransition();
  const delay = delayDays(ms.planned_date, actual || null);

  function save(next: { actual_date?: string; status?: string }) {
    if (!canEdit) return;
    start(async () => { await updateMilestone(ms.id, next); });
  }

  return (
    <GlassPanel className="p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-[18px] leading-tight">{ms.name}</div>
          <div className="num text-[11px] text-stone mt-1">planned {ms.planned_date ?? '—'}</div>
        </div>
        <Pill tone={status === 'achieved' ? 'olive' : status === 'missed' ? 'iron' : 'stone'}>{status.replace('_', ' ')}</Pill>
      </div>

      {delay != null && (
        <div className={`text-[12px] font-semibold ${delay > 0 ? 'text-iron' : 'text-olive'}`}>
          {delay > 0 ? `+${delay} days late` : delay < 0 ? `${-delay} days early` : 'on time'}
        </div>
      )}

      {canEdit ? (
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-[11px] text-stone">Actual</label>
          <input type="date" value={actual} onChange={e => { setActual(e.target.value); save({ actual_date: e.target.value }); }}
            className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11.5px]" />
          <select value={status} onChange={e => { setStatus(e.target.value); save({ status: e.target.value }); }}
            className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11.5px] capitalize">
            {STATUS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          {pending && <span className="text-[11px] text-stone">saving…</span>}
        </div>
      ) : (
        <div className="num text-[11px] text-stone">actual {ms.actual_date ?? '—'}</div>
      )}
    </GlassPanel>
  );
}
