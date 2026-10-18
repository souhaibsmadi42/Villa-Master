'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock } from 'lucide-react';
import { rescheduleProgramme } from '@/app/(app)/timeline/actions';
import { Popover } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { daysBetween, fmtDate } from '@/lib/format';

const DAY = 86400000;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Admin control: move every planned date in the programme so it starts on a chosen day. */
export function RescheduleControl({ projectId, start, today }: { projectId: string; start: string; today: string }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, dialog] = useConfirm();
  const [date, setDate] = useState(() => isoDay(+new Date(today) + 14 * DAY));
  const [pending, run] = useTransition();
  const shift = date ? daysBetween(start, date) : 0;
  const shiftText = `${Math.abs(shift)} day${Math.abs(shift) === 1 ? '' : 's'} ${shift > 0 ? 'later' : 'earlier'}`;

  async function apply(close: () => void) {
    if (!shift) return;
    close();
    const ok = await confirm({
      title: `Start the programme on ${fmtDate(date)}?`,
      body: `Every activity, baseline, milestone and deliverable due date moves ${shiftText}. Progress and recorded actual dates stay as they are.`,
      confirmLabel: 'Reschedule',
    });
    if (!ok) return;
    run(async () => {
      const r = await rescheduleProgramme(projectId, date);
      if (!r.ok) { toast.error('Could not reschedule', r.error); return; }
      toast.success('Programme rescheduled', `Now starts ${fmtDate(date)}`);
      router.refresh();
    });
  }

  return (
    <>
      <Popover align="right" className="w-[300px] p-4"
        trigger={({ toggle }) => <Button size="sm" variant="secondary" icon={<CalendarClock size={14} />} onClick={toggle} disabled={pending}>{pending ? 'Rescheduling…' : 'Reschedule'}</Button>}>
        {close => (
          <div className="flex flex-col gap-3">
            <div>
              <p className="eyebrow">Programme start</p>
              <p className="mt-1 text-[12px] text-muted">Currently <span className="num text-ink-2">{fmtDate(start)}</span></p>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="label">New start date</span>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="field field-sm" />
            </label>
            <p className="text-[11.5px] text-faint">{shift ? <>Moves all planned dates <span className="text-ink-2">{shiftText}</span>.</> : 'Same as the current start.'}</p>
            <Button size="sm" variant="primary" disabled={!shift} onClick={() => apply(close)}>Apply</Button>
          </div>
        )}
      </Popover>
      {dialog}
    </>
  );
}
