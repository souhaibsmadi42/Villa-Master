import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { computeMetrics, type ActivityLite } from '@/lib/metrics';
import { isAwaitingDecision, isClosedDeliverable } from '@/lib/status';

export type CActivity = ActivityLite & { id: string; name: string; contractor_id: string | null; is_critical: boolean };
export type CDeliverable = { id: string; name: string; status: string; priority: string; due_date: string | null; contractor_id: string | null; activity_id: string; category: string | null };

export type ContractorRow = {
  id: string; name: string; scope: string | null; color: string; contact_email: string | null;
  people: { email: string; full_name: string | null }[];
  activities: number; earned: number; planned: number; delayed: number; critical: number;
  current: { id: string; name: string; progress: number; status: string; end_date: string }[];
  openDeliverables: number; awaiting: number; overdue: number;
  nextDeadline: { id: string; name: string; due_date: string } | null;
  upcoming: { id: string; name: string; due_date: string; status: string; priority: string }[];
  actions: { id: string; name: string; kind: 'overdue' | 'awaiting'; due_date: string | null; status: string }[];
};

/** Per-contractor workload and performance, computed from RLS-visible data. */
export async function getContractorRows(): Promise<ContractorRow[]> {
  const sb = await createClient();
  const [{ data: contractors }, { data: acts }, { data: dels }, { data: profiles }, { data: team }] = await Promise.all([
    sb.from('contractor').select('id,name,scope,color,contact_email').order('name'),
    sb.from('activity').select('id,name,contractor_id,start_date,end_date,baseline_start,baseline_end,progress,weight,status,is_critical'),
    sb.from('deliverable').select('id,name,status,priority,due_date,contractor_id,activity_id,category'),
    sb.from('profile').select('email,full_name,contractor_id'),
    sb.from('team_member').select('email,full_name,contractor_id'),
  ]);
  const A = (acts ?? []) as CActivity[];
  const D = (dels ?? []) as CDeliverable[];
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10);
  const people = [...(team ?? []), ...(profiles ?? [])];

  return (contractors ?? []).map(c => {
    const own = A.filter(a => a.contractor_id === c.id);
    const m = own.length ? computeMetrics(own) : null;
    const d = D.filter(x => x.contractor_id === c.id);
    const open = d.filter(x => !isClosedDeliverable(x.status));
    const overdue = open.filter(x => x.due_date && x.due_date < today);
    const awaiting = d.filter(x => isAwaitingDecision(x.status));
    const upcoming = open.filter(x => x.due_date && x.due_date >= today).sort((a, b) => (a.due_date! < b.due_date! ? -1 : 1));
    const seen = new Set<string>();
    return {
      id: c.id, name: c.name, scope: c.scope, color: c.color ?? '#777D68', contact_email: c.contact_email,
      people: people.filter(p => p.contractor_id === c.id && !seen.has(p.email) && seen.add(p.email)).map(p => ({ email: p.email, full_name: p.full_name })),
      activities: own.length, earned: m?.progress ?? 0, planned: m?.plannedToday ?? 0, delayed: m?.delayed ?? 0,
      critical: own.filter(a => a.is_critical).length,
      current: own.filter(a => a.status !== 'done' && +new Date(a.start_date) <= now && +new Date(a.end_date) >= now)
        .map(a => ({ id: a.id, name: a.name, progress: a.progress, status: a.status, end_date: a.end_date })),
      openDeliverables: open.length, awaiting: awaiting.length, overdue: overdue.length,
      nextDeadline: upcoming[0] ? { id: upcoming[0].id, name: upcoming[0].name, due_date: upcoming[0].due_date! } : null,
      upcoming: upcoming.slice(0, 5).map(x => ({ id: x.id, name: x.name, due_date: x.due_date!, status: x.status, priority: x.priority })),
      actions: [
        ...overdue.map(x => ({ id: x.id, name: x.name, kind: 'overdue' as const, due_date: x.due_date, status: x.status })),
        ...awaiting.filter(x => !overdue.includes(x)).map(x => ({ id: x.id, name: x.name, kind: 'awaiting' as const, due_date: x.due_date, status: x.status })),
      ],
    };
  });
}
