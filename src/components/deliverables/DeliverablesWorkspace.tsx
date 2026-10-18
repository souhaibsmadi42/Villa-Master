'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, LayoutList, Columns3, ArrowUpRight, Check, X, Trash2 } from 'lucide-react';
import type { Role } from '@/lib/rbac';
import { cn } from '@/lib/cn';
import { fmtDate, relDays, relTime } from '@/lib/format';
import { DELIVERABLE_STATUSES, PRIORITIES, deliverableStatus, priorityStatus, humanize, isAwaitingDecision, isClosedDeliverable, toneColor } from '@/lib/status';
import { upsertDeliverable, decideDeliverable, deleteDeliverable } from '@/app/(app)/activities/actions';
import { Segmented, Kbd } from '@/components/ui/Controls';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { EmptyState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { rowIn } from '@/motion/variants';

export type DRow = {
  id: string; name: string; status: string; priority: string; category: string | null; due_date: string | null; notes: string | null;
  activity_id: string; project_id: string; contractor_id: string | null; updated_at: string | null; created_at: string | null;
  activity_name: string | null;
  history: { decision: string; at: string | null; by: string | null; comment: string | null }[];
};
type Contractor = { id: string; name: string; color: string };
type Sort = 'due' | 'priority' | 'status' | 'name';
const PRIO_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_RANK = Object.fromEntries(DELIVERABLE_STATUSES.map((s, i) => [s, i]));

export function DeliverablesWorkspace({ rows, contractors, initialStatus, focusId, role, myContractorId }: {
  rows: DRow[]; contractors: Contractor[]; initialStatus: string | null; focusId: string | null; role: Role; myContractorId: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const [items, setItems] = useState(rows);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [contractor, setContractor] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [sort, setSort] = useState<Sort>('due');
  const [view, setView] = useState<'list' | 'board'>('list');
  const [openId, setOpenId] = useState<string | null>(focusId);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => setItems(rows), [rows]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target as HTMLElement).closest('input,textarea,select')) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cOf = useMemo(() => new Map(contractors.map(c => [c.id, c])), [contractors]);
  const isOverdue = (d: DRow) => !!d.due_date && d.due_date < today && !isClosedDeliverable(d.status);
  const canEdit = (d: DRow) => role === 'admin' || role === 'consultant' || (role === 'contractor' && d.contractor_id === myContractorId);
  const canApprove = role === 'admin' || role === 'consultant' || role === 'owner';

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length, awaiting: 0, overdue: 0 };
    for (const d of items) { c[d.status] = (c[d.status] ?? 0) + 1; if (isAwaitingDecision(d.status)) c.awaiting++; if (isOverdue(d)) c.overdue++; }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = items.filter(d =>
      (!t || d.name.toLowerCase().includes(t) || (d.activity_name ?? '').toLowerCase().includes(t) || (cOf.get(d.contractor_id ?? '')?.name ?? '').toLowerCase().includes(t)) &&
      (!status || (status === 'awaiting' ? isAwaitingDecision(d.status) : status === 'overdue' ? isOverdue(d) : d.status === status)) &&
      (!contractor || d.contractor_id === contractor) &&
      (!priority || d.priority === priority));
    return f.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'priority') return PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
      if (sort === 'status') return STATUS_RANK[a.status] - STATUS_RANK[b.status];
      return (a.due_date ?? '9999') < (b.due_date ?? '9999') ? -1 : (a.due_date ?? '9999') > (b.due_date ?? '9999') ? 1 : 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, q, status, contractor, priority, sort, cOf]);

  async function save(d: DRow, patch: Partial<Pick<DRow, 'status' | 'priority' | 'due_date' | 'category'>>, msg = 'Saved') {
    const next = { ...d, ...patch };
    const prev = items;
    setItems(list => list.map(x => (x.id === d.id ? next : x)));
    setBusy(d.id);
    const r = await upsertDeliverable({ id: d.id, activityId: d.activity_id, projectId: d.project_id, contractorId: d.contractor_id, name: d.name, category: next.category, priority: next.priority, status: next.status, due_date: next.due_date });
    setBusy(null);
    if (!r.ok) { setItems(prev); toast.error('Could not save', r.error); return; }
    toast.success(msg, d.name);
    start(() => router.refresh());
  }
  async function decide(d: DRow, decision: 'approved' | 'rejected') {
    setBusy(d.id);
    const r = await decideDeliverable(d.id, decision, d.activity_id);
    setBusy(null);
    if (!r.ok) { toast.error(`Could not ${decision === 'approved' ? 'approve' : 'reject'}`, r.error); return; }
    setItems(list => list.map(x => (x.id === d.id ? { ...x, status: decision, history: [{ decision, at: new Date().toISOString(), by: 'You', comment: null }, ...x.history] } : x)));
    toast.success(decision === 'approved' ? 'Approved' : 'Rejected', d.name);
    start(() => router.refresh());
  }
  async function remove(d: DRow) {
    const ok = await confirm({ title: `Delete “${d.name}”?`, body: 'This removes the deliverable and cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const r = await deleteDeliverable(d.id, d.activity_id);
    if (!r.ok) { toast.error('Could not delete', r.error); return; }
    setOpenId(null);
    setItems(list => list.filter(x => x.id !== d.id));
    toast.success('Deliverable deleted');
  }

  const open = items.find(d => d.id === openId) ?? null;
  const pipeline: { key: string; label: string; tone: string }[] = [
    { key: 'not_started', label: 'Not started', tone: toneColor.neutral },
    { key: 'in_progress', label: 'In progress', tone: toneColor.info },
    { key: 'submitted', label: 'Submitted', tone: toneColor.accent },
    { key: 'under_review', label: 'Under review', tone: toneColor.warning },
    { key: 'approved', label: 'Approved', tone: toneColor.success },
    { key: 'delivered', label: 'Delivered', tone: toneColor.success },
    { key: 'rejected', label: 'Rejected', tone: toneColor.critical },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Pipeline — doubles as a status filter */}
      <div className="overflow-hidden rounded-panel border border-line bg-surface">
        <div className="flex h-1.5 w-full">
          {pipeline.map(p => (counts[p.key] ?? 0) > 0 && (
            <motion.span key={p.key} layout className="h-full" style={{ background: p.tone, width: `${((counts[p.key] ?? 0) / Math.max(1, counts.all)) * 100}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-2 divide-x divide-line sm:grid-cols-4 lg:grid-cols-9">
          {[{ key: null, label: 'All', n: counts.all, tone: 'rgb(var(--c-ink))' },
            { key: 'awaiting', label: 'Awaiting decision', n: counts.awaiting, tone: toneColor.warning },
            ...pipeline.map(p => ({ key: p.key, label: p.label, n: counts[p.key] ?? 0, tone: p.tone }))].map(p => (
            <button key={p.label} onClick={() => setStatus(status === p.key ? null : p.key)} aria-pressed={status === p.key}
              className={cn('relative flex flex-col items-start gap-1 border-b border-line px-4 py-3 text-left transition-colors lg:border-b-0',
                status === p.key ? 'bg-raised' : 'hover:bg-raised/60')}>
              {status === p.key && <motion.span layoutId="pipe-active" className="absolute inset-x-0 top-0 h-[2px]" style={{ background: p.tone }} />}
              <span className="num text-[18px] text-ink">{p.n}</span>
              <span className="text-[11px] text-muted">{p.label}</span>
            </button>
          ))}
        </div>
        {counts.overdue > 0 && (
          <button onClick={() => setStatus(status === 'overdue' ? null : 'overdue')}
            className={cn('flex w-full items-center gap-2 border-t border-line px-4 py-2 text-left text-[12px] transition-colors', status === 'overdue' ? 'bg-critical/10 text-critical' : 'text-critical hover:bg-critical/[0.06]')}>
            <span className="h-1.5 w-1.5 rounded-full bg-critical" /> {counts.overdue} overdue — {status === 'overdue' ? 'showing only overdue · clear' : 'show only overdue'}
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="relative w-full sm:w-[300px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input ref={searchRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search deliverables, activities…" aria-label="Search deliverables" className="field pl-9 pr-9" />
          <Kbd className="absolute right-2.5 top-1/2 -translate-y-1/2">/</Kbd>
        </label>
        <select value={contractor} onChange={e => setContractor(e.target.value)} aria-label="Filter by contractor" className="field w-auto min-w-[170px]">
          <option value="">All contractors</option>
          {contractors.filter(c => items.some(d => d.contractor_id === c.id)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} aria-label="Filter by priority" className="field w-auto capitalize">
          <option value="">Any priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Sort" className="field w-auto">
          <option value="due">Sort: due date</option><option value="priority">Sort: priority</option><option value="status">Sort: status</option><option value="name">Sort: name</option>
        </select>
        <div className="ml-auto flex items-center gap-3">
          <span className="num text-[11.5px] text-faint">{shown.length} shown</span>
          <Segmented label="View" value={view} onChange={setView} size="sm"
            options={[{ value: 'list', label: <span className="flex items-center gap-1.5"><LayoutList size={12} />List</span> }, { value: 'board', label: <span className="flex items-center gap-1.5"><Columns3 size={12} />Board</span> }]} />
        </div>
      </div>

      {view === 'list' ? (
        <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-e1">
          <div className="hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_90px_120px_150px] gap-4 border-b border-line px-5 py-3 md:grid">
            {['Deliverable', 'Contractor', 'Priority', 'Due', 'Status'].map(h => <span key={h} className="eyebrow text-[9.5px]">{h}</span>)}
          </div>
          <motion.ul initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.02 } } }}>
            <AnimatePresence initial={false}>
              {shown.map(d => {
                const st = deliverableStatus(d.status), c = cOf.get(d.contractor_id ?? ''), late = isOverdue(d);
                return (
                  <motion.li key={d.id} variants={rowIn} layout="position" exit="exit"
                    className={cn('border-b border-line last:border-b-0', openId === d.id && 'bg-raised')}>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-raised/60 md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.3fr)_90px_120px_150px]">
                      <button onClick={() => setOpenId(d.id)} className="min-w-0 text-left">
                        <span className="block truncate text-[13.5px] text-ink hover:text-accent">{d.name}</span>
                        <span className="block truncate text-[11.5px] text-muted">{d.activity_name ?? '—'}{d.category ? <span className="capitalize"> · {humanize(d.category)}</span> : null}</span>
                      </button>
                      <span className="hidden min-w-0 items-center gap-2 text-[12.5px] text-ink-2 md:flex">
                        {c && <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: c.color }} />}<span className="truncate">{c?.name ?? '—'}</span>
                      </span>
                      <span className="hidden md:block"><Badge tone={priorityStatus(d.priority).tone}>{d.priority}</Badge></span>
                      <span className="hidden md:block">
                        {d.due_date ? <><span className={cn('num block text-[12px]', late ? 'text-critical' : 'text-ink-2')}>{fmtDate(d.due_date, { day: 'numeric', month: 'short', year: '2-digit' })}</span><span className={cn('block text-[10.5px]', late ? 'text-critical/80' : 'text-faint')}>{relDays(d.due_date)}</span></> : <span className="text-[12px] text-faint">No date</span>}
                      </span>
                      <span className="flex items-center justify-end gap-2 md:justify-start">
                        {canEdit(d) ? (
                          <select value={d.status} disabled={busy === d.id} onChange={e => save(d, { status: e.target.value }, `Marked ${humanize(e.target.value)}`)}
                            aria-label={`Status of ${d.name}`} className="field field-sm w-[140px] capitalize" style={{ color: toneColor[st.tone] }}>
                            {DELIVERABLE_STATUSES.map(s => <option key={s} value={s}>{humanize(s)}</option>)}
                          </select>
                        ) : <Badge tone={st.tone} dot>{st.label}</Badge>}
                      </span>
                      <div className="col-span-2 flex flex-wrap items-center gap-2 md:hidden">
                        <span className="text-[11.5px] text-muted">{c?.name}</span>
                        {d.due_date && <span className={cn('num text-[11px]', late ? 'text-critical' : 'text-faint')}>· due {fmtDate(d.due_date, { day: 'numeric', month: 'short' })}</span>}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
          {shown.length === 0 && <EmptyState compact title="No deliverables match" body="Clear a filter or try another search."
            action={<Button size="sm" onClick={() => { setQ(''); setStatus(null); setContractor(''); setPriority(''); }}>Clear filters</Button>} />}
        </div>
      ) : (
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
          {pipeline.map(p => {
            const col = shown.filter(d => d.status === p.key);
            return (
              <section key={p.key} className="flex w-[272px] shrink-0 flex-col rounded-panel border border-line bg-sunken/50" aria-label={p.label}>
                <header className="flex items-center gap-2 px-3.5 py-3"><span className="h-2 w-2 rounded-full" style={{ background: p.tone }} /><span className="text-[12.5px] font-medium text-ink">{p.label}</span><span className="num ml-auto text-[11px] text-faint">{col.length}</span></header>
                <div className="flex max-h-[62vh] flex-col gap-2 overflow-y-auto px-2.5 pb-2.5">
                  <AnimatePresence initial={false}>
                    {col.map(d => {
                      const c = cOf.get(d.contractor_id ?? ''), late = isOverdue(d);
                      return (
                        <motion.button layout key={d.id} variants={rowIn} initial="hidden" animate="show" exit="exit" onClick={() => setOpenId(d.id)}
                          className="rounded-card border border-line bg-surface p-3 text-left shadow-e1 transition hover:-translate-y-px hover:border-line-strong hover:shadow-e2">
                          <span className="block text-[12.5px] leading-snug text-ink">{d.name}</span>
                          <span className="mt-2 flex items-center gap-2">
                            {c && <span className="h-1.5 w-1.5 rounded-[1px]" style={{ background: c.color }} />}
                            <span className="truncate text-[11px] text-muted">{c?.name}</span>
                            {d.due_date && <span className={cn('num ml-auto shrink-0 text-[10.5px]', late ? 'text-critical' : 'text-faint')}>{fmtDate(d.due_date, { day: 'numeric', month: 'short' })}</span>}
                          </span>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                  {col.length === 0 && <div className="rounded-card border border-dashed border-line px-3 py-6 text-center text-[11.5px] text-faint">Empty</div>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Detail sheet */}
      <Sheet open={!!open} onClose={() => setOpenId(null)} eyebrow="Deliverable" title={open?.name} width="sm:w-[520px]">
        {open && (() => {
          const st = deliverableStatus(open.status), c = cOf.get(open.contractor_id ?? ''), editable = canEdit(open), late = isOverdue(open);
          return (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={st.tone} dot>{st.label}</Badge>
                <Badge tone={priorityStatus(open.priority).tone}>{open.priority} priority</Badge>
                {late && <Badge tone="critical">overdue</Badge>}
              </div>

              <AnimatePresence>
                {canApprove && isAwaitingDecision(open.status) && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="rounded-card border border-warning/30 bg-warning/[0.07] p-4">
                    <div className="text-[13px] font-medium text-ink">Awaiting your decision</div>
                    <p className="mt-1 text-[12px] text-muted">Your decision is recorded in the approval log with your name and time.</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="accent" loading={busy === open.id} icon={<Check size={14} />} onClick={() => decide(open, 'approved')}>Approve</Button>
                      <Button size="sm" variant="danger" disabled={busy === open.id} icon={<X size={14} />} onClick={() => decide(open, 'rejected')}>Reject</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[12.5px]">
                <div><dt className="eyebrow text-[9.5px]">Contractor</dt><dd className="mt-1 flex items-center gap-2 text-ink">{c && <span className="h-2 w-2 rounded-[2px]" style={{ background: c.color }} />}{c ? <Link href={`/contractors/${c.id}`} className="hover:text-accent">{c.name}</Link> : '—'}</dd></div>
                <div><dt className="eyebrow text-[9.5px]">Activity</dt><dd className="mt-1"><Link href={`/activities/${open.activity_id}`} className="inline-flex items-center gap-1 text-ink hover:text-accent">{open.activity_name ?? 'Open'} <ArrowUpRight size={12} /></Link></dd></div>
                <div><dt className="eyebrow text-[9.5px]">Category</dt><dd className="mt-1 capitalize text-ink">{open.category ? humanize(open.category) : '—'}</dd></div>
                <div><dt className="eyebrow text-[9.5px]">Last updated</dt><dd className="num mt-1 text-ink-2">{open.updated_at ? relTime(open.updated_at) : '—'}</dd></div>
              </dl>

              {editable ? (
                <div className="grid grid-cols-1 gap-3 rounded-card border border-line bg-surface p-4 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5"><span className="label">Status</span>
                    <select value={open.status} disabled={busy === open.id} onChange={e => save(open, { status: e.target.value }, `Marked ${humanize(e.target.value)}`)} className="field field-sm capitalize">
                      {DELIVERABLE_STATUSES.map(s => <option key={s} value={s}>{humanize(s)}</option>)}
                    </select></label>
                  <label className="flex flex-col gap-1.5"><span className="label">Priority</span>
                    <select value={open.priority} disabled={busy === open.id} onChange={e => save(open, { priority: e.target.value }, 'Priority updated')} className="field field-sm capitalize">
                      {PRIORITIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select></label>
                  <label className="flex flex-col gap-1.5"><span className="label">Due date</span>
                    <input type="date" value={open.due_date ?? ''} disabled={busy === open.id} onChange={e => save(open, { due_date: e.target.value || null }, 'Due date updated')} className="field field-sm" /></label>
                </div>
              ) : (
                <div className="rounded-card border border-line bg-surface p-4 text-[12.5px] text-muted">
                  Due <span className="num text-ink">{fmtDate(open.due_date)}</span>{open.due_date ? ` (${relDays(open.due_date)})` : ''}. Read-only for your role.
                </div>
              )}

              {open.notes && <div><div className="eyebrow mb-1.5 text-[9.5px]">Notes</div><p className="text-[13px] leading-relaxed text-ink-2">{open.notes}</p></div>}

              <div>
                <div className="eyebrow mb-3 text-[9.5px]">Approval history</div>
                {open.history.length ? (
                  <ol className="relative flex flex-col gap-3 border-l border-line pl-4">
                    {open.history.map((h, i) => (
                      <li key={i} className="relative text-[12.5px]">
                        <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full" style={{ background: h.decision === 'approved' ? toneColor.success : h.decision === 'rejected' ? toneColor.critical : toneColor.neutral }} />
                        <span className="capitalize text-ink">{h.decision}</span>
                        <span className="text-muted"> by {h.by ?? 'reviewer'}</span>
                        {h.at && <span className="num block text-[10.5px] text-faint">{fmtDate(h.at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                        {h.comment && <p className="mt-1 text-muted">{h.comment}</p>}
                      </li>
                    ))}
                  </ol>
                ) : <p className="text-[12.5px] text-faint">No decisions recorded yet.</p>}
              </div>

              {editable && (
                <div className="border-t border-line pt-4">
                  <Button size="sm" variant="ghost" className="text-critical hover:bg-critical/[0.07] hover:text-critical" icon={<Trash2 size={14} />} onClick={() => remove(open)}>Delete deliverable</Button>
                </div>
              )}
            </div>
          );
        })()}
      </Sheet>
      {confirmDialog}
    </div>
  );
}
