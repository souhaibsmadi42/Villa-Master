'use client';
import { useState, useTransition } from 'react';
import { decideDeliverable } from '@/app/(app)/activities/actions';
import { Pill } from '@/components/ui/Pill';

export function ApprovalRow({ id, name, activityId, status }: { id: string; name: string; activityId: string; status: string }) {
  const [s, setS] = useState(status);
  const [pending, start] = useTransition();
  function decide(decision: 'approved' | 'rejected') {
    start(async () => { const r = await decideDeliverable(id, decision, activityId); if (r.ok) setS(decision); });
  }
  const done = s === 'approved' || s === 'rejected';
  return (
    <div className="flex items-center gap-3 rounded-card bg-surface-2 border border-border px-4 py-3">
      <span className="text-[13px] text-text flex-1">{name}</span>
      {done ? (
        <Pill tone={s === 'approved' ? 'olive' : 'iron'}>{s}</Pill>
      ) : (
        <div className="flex gap-2">
          <button disabled={pending} onClick={() => decide('approved')}
            className="rounded-full bg-olive/15 text-[#3F6B45] border border-olive/30 px-3.5 py-1.5 text-[11.5px] font-semibold hover:bg-olive hover:text-white transition disabled:opacity-50">Approve</button>
          <button disabled={pending} onClick={() => decide('rejected')}
            className="rounded-full bg-iron/12 text-iron border border-iron/30 px-3.5 py-1.5 text-[11.5px] font-semibold hover:bg-iron hover:text-white transition disabled:opacity-50">Reject</button>
        </div>
      )}
    </div>
  );
}
