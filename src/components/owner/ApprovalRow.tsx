'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { decideDeliverable } from '@/app/(app)/activities/actions';
import { deliverableStatus } from '@/lib/status';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export function ApprovalRow({ id, name, activityId, status }: { id: string; name: string; activityId: string; status: string }) {
  const toast = useToast();
  const [s, setS] = useState(status);
  const [pending, start] = useTransition();
  function decide(decision: 'approved' | 'rejected') {
    start(async () => {
      const r = await decideDeliverable(id, decision, activityId);
      if (!r.ok) { toast.error('Decision not saved', r.error); return; }
      setS(decision);
      toast.success(decision === 'approved' ? 'Approved' : 'Rejected', name);
    });
  }
  const done = s === 'approved' || s === 'rejected';
  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      <Link href={`/deliverables?focus=${id}`} className="min-w-0 flex-1 truncate text-[13px] text-ink hover:text-accent">{name}</Link>
      <AnimatePresence mode="wait" initial={false}>
        {done ? (
          <motion.span key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}><Badge tone={deliverableStatus(s).tone} dot>{s}</Badge></motion.span>
        ) : (
          <motion.div key="act" exit={{ opacity: 0 }} className="flex gap-2">
            <Button size="xs" variant="accent" loading={pending} icon={<Check size={12} />} onClick={() => decide('approved')}>Approve</Button>
            <Button size="xs" variant="danger" disabled={pending} icon={<X size={12} />} onClick={() => decide('rejected')}>Reject</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
