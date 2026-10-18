'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Trash2, ArrowUpRight } from 'lucide-react';
import { upsertDeliverable, deleteDeliverable } from '@/app/(app)/activities/actions';
import { DELIVERABLE_STATUSES, PRIORITIES, deliverableStatus, humanize, toneColor } from '@/lib/status';
import { PanelHeader } from '@/components/ui/Panel';
import { Button, IconButton } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { rowIn } from '@/motion/variants';

export type Deliverable = {
  id: string; name: string; category: string | null; priority: string; status: string; due_date: string | null;
};

export function DeliverableList({
  activityId, projectId, contractorId, canEdit, initial,
}: { activityId: string; projectId: string; contractorId: string | null; canEdit: boolean; initial: Deliverable[] }) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, dialog] = useConfirm();
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();

  function patch(d: Deliverable, key: keyof Deliverable, value: string) {
    const next = { ...d, [key]: value || null } as Deliverable;
    const prev = items;
    setItems(list => list.map(x => (x.id === d.id ? next : x)));
    start(async () => {
      const r = await upsertDeliverable({ id: d.id, activityId, projectId, contractorId, name: next.name, category: next.category, priority: next.priority, status: next.status, due_date: next.due_date });
      if (!r.ok) { setItems(prev); toast.error('Could not save', r.error); return; }
      toast.success('Saved', next.name);
    });
  }
  async function remove(d: Deliverable) {
    if (!(await confirm({ title: `Delete “${d.name}”?`, body: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;
    start(async () => {
      const r = await deleteDeliverable(d.id, activityId);
      if (!r.ok) { toast.error('Could not delete', r.error); return; }
      setItems(list => list.filter(x => x.id !== d.id));
      toast.success('Deliverable deleted');
    });
  }
  function add(name: string) {
    setAdding(false);
    start(async () => {
      const r = await upsertDeliverable({ activityId, projectId, contractorId, name, priority: 'medium', status: 'not_started', category: null, due_date: null });
      if (!r.ok) { toast.error('Could not add', r.error); return; }
      toast.success('Deliverable added', name);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <PanelHeader label="Deliverables" meta={items.length}
        action={canEdit ? <Button size="xs" variant="ghost" icon={<Plus size={13} />} onClick={() => setAdding(true)}>Add</Button> : undefined} />

      <AnimatePresence>
        {adding && canEdit && <AddRow onCancel={() => setAdding(false)} onAdd={add} />}
      </AnimatePresence>

      <ul className="flex flex-col divide-y divide-line">
        <AnimatePresence initial={false}>
          {items.map(d => {
            const st = deliverableStatus(d.status);
            return (
              <motion.li key={d.id} variants={rowIn} initial="hidden" animate="show" exit="exit" layout="position" className="flex flex-col gap-2.5 py-3">
                <div className="flex items-start gap-2">
                  <Link href={`/deliverables?focus=${d.id}`} className="group min-w-0 flex-1 text-[13px] text-ink hover:text-accent">
                    {d.name} <ArrowUpRight size={11} className="inline text-faint group-hover:text-accent" />
                  </Link>
                  {canEdit && <IconButton size="sm" label={`Delete ${d.name}`} onClick={() => remove(d)} className="hover:text-critical"><Trash2 size={13} /></IconButton>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select value={d.status} disabled={!canEdit} onChange={e => patch(d, 'status', e.target.value)} aria-label="Status"
                    className="field field-sm w-auto capitalize" style={{ color: toneColor[st.tone] }}>
                    {DELIVERABLE_STATUSES.map(s => <option key={s} value={s}>{humanize(s)}</option>)}
                  </select>
                  <select value={d.priority} disabled={!canEdit} onChange={e => patch(d, 'priority', e.target.value)} aria-label="Priority" className="field field-sm w-auto capitalize">
                    {PRIORITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input type="date" value={d.due_date ?? ''} disabled={!canEdit} onChange={e => patch(d, 'due_date', e.target.value)} aria-label="Due date" className="field field-sm w-auto" />
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {items.length === 0 && !adding && <p className="text-[12.5px] text-faint">No deliverables yet.</p>}
      {pending && <p className="text-[11px] text-muted">Saving…</p>}
      {dialog}
    </div>
  );
}

function AddRow({ onAdd, onCancel }: { onAdd: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  return (
    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      onSubmit={e => { e.preventDefault(); if (name.trim()) onAdd(name.trim()); }} className="flex gap-2 overflow-hidden">
      <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="New deliverable name…" aria-label="New deliverable name"
        onKeyDown={e => { if (e.key === 'Escape') onCancel(); }} className="field flex-1" />
      <Button type="submit" size="md" variant="primary" disabled={!name.trim()}>Add</Button>
      <Button size="md" variant="ghost" onClick={onCancel}>Cancel</Button>
    </motion.form>
  );
}
