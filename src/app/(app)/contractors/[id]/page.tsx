import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { getContractorRows } from '@/lib/contractors';
import { fmtDate, relDays } from '@/lib/format';
import { activityStatus, deliverableStatus, priorityStatus, isClosedDeliverable } from '@/lib/status';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Ring } from '@/components/ui/Ring';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/Controls';
import { EmptyState } from '@/components/ui/States';
import { Reveal } from '@/components/marketing/Reveal';
import { AskButton } from '@/components/assistant/AskButton';

export const dynamic = 'force-dynamic';

export default async function ContractorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getSessionProfile();
  const sb = await createClient();
  const rows = await getContractorRows();
  const c = rows.find(r => r.id === id);
  if (!c) notFound();

  const [{ data: acts }, { data: dels }] = await Promise.all([
    sb.from('activity').select('id,name,start_date,end_date,progress,status,is_critical').eq('contractor_id', id).order('start_date'),
    sb.from('deliverable').select('id,name,status,priority,due_date,category').eq('contractor_id', id).order('due_date', { ascending: true }),
  ]);
  const A = acts ?? [];
  const D = dels ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const span = A.length ? { from: A[0].start_date, to: A.reduce((m, a) => (a.end_date > m ? a.end_date : m), A[0].end_date) } : null;
  const s0 = span ? +new Date(span.from) : 0, s1 = span ? +new Date(span.to) : 1;
  const pos = (d: string) => ((+new Date(d) - s0) / Math.max(1, s1 - s0)) * 100;
  const nowPct = span ? pos(today) : -1;

  return (
    <div className="flex flex-col gap-8">
      {profile?.role !== 'contractor' && (
        <Link href="/contractors" className="inline-flex w-fit items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"><ArrowLeft size={14} /> All contractors</Link>
      )}
      <header className="grid gap-6 border-b border-line pb-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="eyebrow flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c.color }} />Contractor workspace</div>
          <h1 className="display mt-3 text-[clamp(38px,5.5vw,68px)] text-ink">{c.name}</h1>
          <p className="mt-2 text-[14px] text-muted">{c.scope ?? 'Scope not recorded'}</p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-[12.5px]">
            {c.contact_email ? <a href={`mailto:${c.contact_email}`} className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink"><Mail size={13} />{c.contact_email}</a> : <span className="text-faint">No contact email on record</span>}
            {c.people.map(p => <span key={p.email} className="text-muted">{p.full_name ?? p.email}</span>)}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Ring value={c.earned / 100} marker={c.planned / 100} size={112} label="earned" color={c.color} />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[['Planned', `${c.planned}%`], ['Activities', c.activities], ['Open items', c.openDeliverables], ['Overdue', c.overdue]].map(([k, v]) => (
              <div key={k as string}><dt className="eyebrow text-[9.5px]">{k}</dt><dd className="num text-[16px] text-ink">{v}</dd></div>
            ))}
          </dl>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Reveal>
          <Panel className="p-6">
            <PanelHeader label="Scope of work" meta={span ? `${fmtDate(span.from, { month: 'short', year: '2-digit' })} → ${fmtDate(span.to, { month: 'short', year: '2-digit' })}` : undefined}
              action={<AskButton prompt={`Summarise ${c.name}'s performance: progress against plan, delays, and what is outstanding.`} size="xs">Summarise</AskButton>} />
            <ul className="relative mt-5 flex flex-col">
              {nowPct >= 0 && nowPct <= 100 && <span aria-hidden className="pointer-events-none absolute inset-y-0 z-[1] w-px bg-critical/60 max-sm:hidden" style={{ left: `calc(40% + ${nowPct} * 0.6%)` }} />}
              {A.map(a => {
                const st = activityStatus(a.status);
                return (
                  <li key={a.id}>
                    <Link href={`/activities/${a.id}`} className="group grid grid-cols-1 items-center gap-2 border-b border-line py-3 sm:grid-cols-[40%_60%]">
                      <span className="min-w-0 pr-4">
                        <span className="block truncate text-[13px] text-ink group-hover:text-accent">{a.name}</span>
                        <span className="flex items-center gap-2 text-[11px] text-muted"><span className="num">{a.progress}%</span><Badge tone={st.tone} className="h-[18px] text-[10px]">{st.label}</Badge>{a.is_critical && <span className="text-[10px] uppercase tracking-[0.1em] text-critical">critical</span>}</span>
                      </span>
                      <span className="relative h-4">
                        <span className="absolute inset-y-1 rounded-[3px]" style={{ left: `${pos(a.start_date)}%`, width: `${Math.max(1.5, pos(a.end_date) - pos(a.start_date))}%`, background: c.color, opacity: 0.25 }} />
                        <span className="absolute inset-y-1 rounded-[3px]" style={{ left: `${pos(a.start_date)}%`, width: `${Math.max(0, (pos(a.end_date) - pos(a.start_date)) * a.progress / 100)}%`, background: c.color }} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {!A.length && <EmptyState compact title="No activities assigned" />}
          </Panel>
        </Reveal>

        <div className="flex flex-col gap-6">
          <Reveal delay={0.06}>
            <Panel className="p-6">
              <PanelHeader label="Outstanding actions" meta={c.actions.length} />
              <ul className="mt-4 flex flex-col divide-y divide-line">
                {c.actions.map(d => (
                  <li key={d.id}>
                    <Link href={`/deliverables?focus=${d.id}`} className="group flex items-center gap-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] text-ink group-hover:text-accent">{d.name}</span>
                        {d.due_date && <span className="num text-[10.5px] text-faint">due {fmtDate(d.due_date, { day: 'numeric', month: 'short' })} · {relDays(d.due_date)}</span>}
                      </span>
                      {d.kind === 'overdue' ? <Badge tone="critical">overdue</Badge> : <Badge tone={deliverableStatus(d.status).tone}>{deliverableStatus(d.status).label}</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
              {!c.actions.length && <EmptyState compact title="All clear" body="Nothing overdue or waiting on a decision." />}
            </Panel>
          </Reveal>
          <Reveal delay={0.1}>
            <Panel className="p-6">
              <PanelHeader label="Deliverables" meta={`${D.filter(d => isClosedDeliverable(d.status)).length} / ${D.length} closed`}
                action={<Link href="/deliverables" className="text-[12px] text-muted hover:text-ink">All →</Link>} />
              <ProgressBar className="mt-4" value={D.length ? (D.filter(d => isClosedDeliverable(d.status)).length / D.length) * 100 : 0} tone={c.color} />
              <ul className="mt-4 flex flex-col divide-y divide-line">
                {D.slice(0, 10).map(d => (
                  <li key={d.id}>
                    <Link href={`/deliverables?focus=${d.id}`} className="group flex items-center gap-3 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink group-hover:text-accent">{d.name}</span>
                      <Badge tone={priorityStatus(d.priority).tone} className="hidden sm:inline-flex">{d.priority}</Badge>
                      <Badge tone={deliverableStatus(d.status).tone}>{deliverableStatus(d.status).label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
              {D.length > 10 && <Link href="/deliverables" className="mt-3 inline-block text-[12px] text-muted hover:text-ink">+{D.length - 10} more in Deliverables →</Link>}
            </Panel>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
