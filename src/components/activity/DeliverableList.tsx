'use client';
import { useState, useTransition } from 'react';
import { upsertDeliverable, deleteDeliverable } from '@/app/(app)/activities/actions';
import { Pill } from '@/components/ui/Pill';

export type Deliverable = {
  id: string; name: string; category: string | null; priority: string; status: string; due_date: string | null;
};

const STATUSES = ['not_started', 'in_progress', 'submitted', 'under_review', 'approved', 'rejected', 'delivered'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const CATEGORIES = ['', 'architectural', 'structural', 'mep', 'landscape', 'boq', 'rfi', 'shop_drawings', 'material_submittals', 'contracts', 'reports'];

const statusTone: Record<string, 'olive' | 'sun' | 'iron' | 'brass' | 'stone'> = {
  approved: 'olive', delivered: 'olive', submitted: 'brass', under_review: 'brass',
  in_progress: 'sun', rejected: 'iron', not_started: 'stone',
};

export function DeliverableList({
  activityId, projectId, contractorId, canEdit, initial,
}: { activityId: string; projectId: string; contractorId: string | null; canEdit: boolean; initial: Deliverable[] }) {
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [pending, start] = useTransition();

  function save(d: Deliverable) {
    start(async () => {
      await upsertDeliverable({ id: d.id, activityId, projectId, contractorId, name: d.name, category: d.category, priority: d.priority, status: d.status, due_date: d.due_date });
    });
  }
  function patch(id: string, key: keyof Deliverable, value: string) {
    setItems(prev => {
      const next = prev.map(d => d.id === id ? { ...d, [key]: value || null } : d);
      const changed = next.find(d => d.id === id)!; save(changed);
      return next;
    });
  }
  function remove(id: string) {
    if (!confirm('Delete this deliverable?')) return;
    start(async () => { await deleteDeliverable(id, activityId); setItems(prev => prev.filter(d => d.id !== id)); });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Deliverables · {items.length}</span>
        {canEdit && <button onClick={() => setAdding(true)} className="text-[12px] font-semibold text-olive hover:underline">+ Add</button>}
      </div>

      {adding && canEdit && (
        <AddRow onCancel={() => setAdding(false)} onAdd={(name) => {
          setAdding(false);
          start(async () => {
            await upsertDeliverable({ activityId, projectId, contractorId, name, priority: 'medium', status: 'not_started', category: null, due_date: null });
            // optimistic-ish: rely on revalidate; add a temp row
            setItems(prev => [...prev, { id: `tmp-${Date.now()}`, name, category: null, priority: 'medium', status: 'not_started', due_date: null }]);
          });
        }} />
      )}

      {items.map(d => (
        <div key={d.id} className="rounded-card border border-border bg-surface-2 p-3 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[13px] font-medium text-text flex-1">{d.name}</div>
            <Pill tone={statusTone[d.status] ?? 'stone'}>{d.status.replace('_', ' ')}</Pill>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select value={d.status} disabled={!canEdit} onChange={e => patch(d.id, 'status', e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-[11.5px] capitalize disabled:opacity-50">
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
            <select value={d.priority} disabled={!canEdit} onChange={e => patch(d.id, 'priority', e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-[11.5px] capitalize disabled:opacity-50">
              {PRIORITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input type="date" value={d.due_date ?? ''} disabled={!canEdit} onChange={e => patch(d.id, 'due_date', e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-[11.5px] disabled:opacity-50" />
            {canEdit && <button onClick={() => remove(d.id)} className="ml-auto text-[11px] text-iron hover:underline">remove</button>}
          </div>
        </div>
      ))}
      {items.length === 0 && !adding && <p className="text-stone text-[12.5px] italic">No deliverables yet.</p>}
      {pending && <p className="text-[11px] text-stone">saving…</p>}
    </div>
  );
}

function AddRow({ onAdd, onCancel }: { onAdd: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  return (
    <form onSubmit={e => { e.preventDefault(); if (name.trim()) onAdd(name.trim()); }}
      className="rounded-card border border-olive/40 bg-surface p-3 flex gap-2">
      <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="New deliverable name…"
        className="flex-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-[12.5px] outline-none focus:border-olive" />
      <button className="rounded-lg bg-bark text-cream px-3 text-[12px] font-semibold">Add</button>
      <button type="button" onClick={onCancel} className="text-[12px] text-stone">cancel</button>
    </form>
  );
}
