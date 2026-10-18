'use client';
import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { updateMilestone } from '@/app/(app)/milestones/actions';
import { MILESTONE_STATUSES, milestoneStatus, humanize, toneColor } from '@/lib/status';
import { fmtDate, daysBetween, relDays } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

export type MS = { id: string; name: string; planned_date: string | null; actual_date: string | null; status: string };

export function MilestoneEditor({ ms, canEdit, index, today }: { ms: MS; canEdit: boolean; index: number; today: string }) {
  const toast = useToast();
  const [actual, setActual] = useState(ms.actual_date ?? '');
  const [status, setStatus] = useState(ms.status);
  const [pending, start] = useTransition();
  const delay = ms.planned_date && actual ? daysBetween(ms.planned_date, actual) : null;
  const overdue = !actual && status !== 'achieved' && !!ms.planned_date && ms.planned_date < today;
  const st = milestoneStatus(status);

  function save(next: { actual_date?: string; status?: string }, prev: { actual: string; status: string }) {
    if (!canEdit) return;
    start(async () => {
      const r = await updateMilestone(ms.id, next);
      if (!r.ok) { setActual(prev.actual); setStatus(prev.status); toast.error('Could not update milestone', r.error); return; }
      toast.success('Milestone updated', ms.name);
    });
  }

  return (
    <motion.li initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.04, duration: 0.5 }}
      className="relative grid grid-cols-1 gap-4 border-b border-line py-6 pl-10 md:grid-cols-[1fr_auto] md:items-center">
      <span className={cn('absolute left-[3px] top-[34px] h-3 w-3 rotate-45 border', status === 'achieved' ? 'border-success bg-success' : overdue || status === 'missed' ? 'border-critical bg-canvas' : 'border-accent bg-canvas')} />
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="num text-[11px] text-faint">{String(index + 1).padStart(2, '0')}</span>
          <h3 className={cn('display text-[clamp(22px,2.6vw,32px)]', status === 'achieved' ? 'text-muted' : 'text-ink')}>{ms.name}</h3>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px]">
          <span className="text-muted">Planned <span className="num text-ink-2">{fmtDate(ms.planned_date)}</span></span>
          {!actual && ms.planned_date && status !== 'achieved' && <span className={overdue ? 'text-critical' : 'text-faint'}>{relDays(ms.planned_date)}</span>}
          {delay != null && (
            <span className="num" style={{ color: delay > 0 ? toneColor.critical : toneColor.success }}>
              {delay > 0 ? `+${delay} days late` : delay < 0 ? `${-delay} days early` : 'on the day'}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {pending && <Spinner className="text-muted" />}
        {canEdit ? (
          <>
            <label className="flex items-center gap-2"><span className="label">Actual</span>
              <input type="date" value={actual} onChange={e => { const prev = { actual, status }; setActual(e.target.value); save({ actual_date: e.target.value }, prev); }} className="field field-sm w-auto" /></label>
            <select value={status} aria-label={`Status of ${ms.name}`} onChange={e => { const prev = { actual, status }; setStatus(e.target.value); save({ status: e.target.value }, prev); }}
              className="field field-sm w-auto capitalize" style={{ color: toneColor[st.tone] }}>
              {MILESTONE_STATUSES.map(s => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          </>
        ) : (
          <>
            {actual && <span className="num text-[12px] text-muted">Actual {fmtDate(actual)}</span>}
            <Badge tone={st.tone} dot>{st.label}</Badge>
          </>
        )}
      </div>
    </motion.li>
  );
}
