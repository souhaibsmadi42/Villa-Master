'use client';
import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Search, ArrowUpRight, Mail } from 'lucide-react';
import type { ContractorRow } from '@/lib/contractors';
import { cn } from '@/lib/cn';
import { fmtDate, relDays } from '@/lib/format';
import { activityStatus, deliverableStatus, toneColor } from '@/lib/status';
import { Segmented, ProgressBar } from '@/components/ui/Controls';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { rowIn } from '@/motion/variants';

type Sort = 'attention' | 'progress' | 'name';

const standing = (c: ContractorRow) => {
  if (!c.activities) return { label: 'No activities', tone: 'neutral' as const };
  if (c.delayed > 0 || c.planned - c.earned >= 10) return { label: 'Behind', tone: 'critical' as const };
  if (c.planned - c.earned >= 3 || c.overdue > 0) return { label: 'Watch', tone: 'warning' as const };
  return { label: 'On track', tone: 'success' as const };
};
const attention = (c: ContractorRow) => c.overdue * 3 + c.delayed * 3 + c.awaiting + Math.max(0, c.planned - c.earned) / 5;

export function ContractorWorkspace({ rows }: { rows: ContractorRow[] }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('attention');
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const f = rows.filter(r => !t || r.name.toLowerCase().includes(t) || (r.scope ?? '').toLowerCase().includes(t));
    return [...f].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name)
      : sort === 'progress' ? b.earned - a.earned
      : attention(b) - attention(a));
  }, [rows, q, sort]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative w-full sm:w-[280px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search contractors or scope…" aria-label="Search contractors" className="field pl-9" />
        </label>
        <Segmented label="Sort contractors" value={sort} onChange={setSort} size="sm"
          options={[{ value: 'attention', label: 'Needs attention' }, { value: 'progress', label: 'Progress' }, { value: 'name', label: 'Name' }]} />
        <span className="num ml-auto text-[11.5px] text-faint">{list.length} of {rows.length}</span>
      </div>

      <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-e1">
        {/* header */}
        <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_110px_110px_150px_28px] items-center gap-4 border-b border-line px-5 py-3 lg:grid">
          {['Contractor', 'Progress · earned vs planned', 'Standing', 'Open items', 'Next deadline', ''].map(h => <span key={h} className="eyebrow text-[9.5px]">{h}</span>)}
        </div>
        <motion.ul initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.035 } } }}>
          {list.map(c => {
            const s = standing(c);
            const isOpen = open === c.id;
            return (
              <motion.li key={c.id} variants={rowIn} layout="position" className="border-b border-line last:border-b-0">
                <button onClick={() => setOpen(isOpen ? null : c.id)} aria-expanded={isOpen}
                  className={cn('grid w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 text-left transition-colors lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_110px_110px_150px_28px]',
                    isOpen ? 'bg-raised' : 'hover:bg-raised/60')}>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: c.color }} />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-ink">{c.name}</span>
                      <span className="block truncate text-[12px] text-muted">{c.scope ?? '—'} · {c.activities} activit{c.activities === 1 ? 'y' : 'ies'}</span>
                    </span>
                  </span>
                  <span className="hidden lg:block">
                    <span className="num flex justify-between text-[11px] text-muted"><span className="text-ink">{c.earned}%</span><span>{c.planned}% planned</span></span>
                    <ProgressBar className="mt-1.5" value={c.earned} marker={c.planned} height={3} tone={c.color} />
                  </span>
                  <span className="hidden lg:block"><Badge tone={s.tone} dot>{s.label}</Badge></span>
                  <span className="num hidden text-[12px] text-ink-2 lg:block">
                    {c.openDeliverables}
                    {c.overdue > 0 && <span className="text-critical"> · {c.overdue} late</span>}
                  </span>
                  <span className="hidden min-w-0 lg:block">
                    {c.nextDeadline ? (
                      <><span className="num block text-[12px] text-ink-2">{fmtDate(c.nextDeadline.due_date, { day: 'numeric', month: 'short' })}</span><span className="block truncate text-[11px] text-faint">{relDays(c.nextDeadline.due_date)}</span></>
                    ) : <span className="text-[12px] text-faint">—</span>}
                  </span>
                  <span className="flex items-center gap-2 lg:block">
                    <span className="lg:hidden"><Badge tone={s.tone} dot>{s.label}</Badge></span>
                    <ChevronRight size={16} className={cn('text-faint transition-transform duration-glide', isOpen && 'rotate-90 text-ink')} />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }} className="overflow-hidden bg-raised">
                      <div className="grid gap-6 px-5 pb-6 pt-2 md:grid-cols-3 lg:pl-9">
                        <div className="lg:hidden md:col-span-3">
                          <span className="num flex justify-between text-[11px] text-muted"><span className="text-ink">{c.earned}% earned</span><span>{c.planned}% planned</span></span>
                          <ProgressBar className="mt-1.5" value={c.earned} marker={c.planned} height={3} tone={c.color} />
                        </div>
                        <Section title="Current tasks" empty="Nothing scheduled for today.">
                          {c.current.map(a => (
                            <Link key={a.id} href={`/activities/${a.id}`} className="group flex items-center gap-3 py-1.5">
                              <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink group-hover:text-accent">{a.name}</span>
                              <span className="num text-[11px] text-muted">{a.progress}%</span>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: toneColor[activityStatus(a.status).tone] }} />
                            </Link>
                          ))}
                        </Section>
                        <Section title="Upcoming deadlines" empty="No dated deliverables ahead.">
                          {c.upcoming.map(d => (
                            <Link key={d.id} href={`/deliverables?focus=${d.id}`} className="group flex items-center gap-3 py-1.5">
                              <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink group-hover:text-accent">{d.name}</span>
                              <span className="num shrink-0 text-[11px] text-muted">{fmtDate(d.due_date, { day: 'numeric', month: 'short' })}</span>
                            </Link>
                          ))}
                        </Section>
                        <Section title="Outstanding actions" empty="No overdue or pending decisions.">
                          {c.actions.slice(0, 6).map(d => (
                            <Link key={d.id} href={`/deliverables?focus=${d.id}`} className="group flex items-center gap-3 py-1.5">
                              <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink group-hover:text-accent">{d.name}</span>
                              {d.kind === 'overdue' ? <Badge tone="critical">overdue</Badge> : <Badge tone={deliverableStatus(d.status).tone}>{deliverableStatus(d.status).label}</Badge>}
                            </Link>
                          ))}
                          {c.actions.length > 6 && <span className="text-[11.5px] text-faint">+{c.actions.length - 6} more</span>}
                        </Section>
                        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4 md:col-span-3">
                          {c.contact_email && <a href={`mailto:${c.contact_email}`} className="inline-flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink"><Mail size={13} />{c.contact_email}</a>}
                          {c.people.length > 0 && <span className="text-[12px] text-muted">{c.people.length} team member{c.people.length === 1 ? '' : 's'} with access</span>}
                          <Link href={`/contractors/${c.id}`} className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-ink hover:text-accent">Open workspace <ArrowUpRight size={13} /></Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </motion.ul>
        {list.length === 0 && <EmptyState compact title="No contractors match" body="Try a different search." />}
      </div>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.flat().filter(Boolean) : children ? [children] : [];
  return (
    <div>
      <div className="eyebrow mb-2 text-[9.5px]">{title}</div>
      <div className="flex flex-col divide-y divide-line/70">
        {items.length ? <Fragment>{children}</Fragment> : <span className="py-1.5 text-[12px] text-faint">{empty}</span>}
      </div>
    </div>
  );
}
