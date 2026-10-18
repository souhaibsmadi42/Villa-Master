import 'server-only';
import { computeMetrics } from '@/lib/metrics';
import { isClosedDeliverable } from '@/lib/status';
import type { LiveProjectData } from '@/lib/project-data';

/**
 * Built-in answers used when no AI key is configured. Recognises the common
 * project questions and answers them directly from live records — nothing is
 * generated or guessed, and anything it cannot answer it says so.
 */

const DAY = 86400000;
const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'no date';
const days = (from: string, to: string) => Math.round((+new Date(to) - +new Date(from)) / DAY);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const has = (q: string, ...words: string[]) => words.some(w => q.includes(w));

type Intent = 'behind' | 'awaiting' | 'overdue' | 'milestone' | 'draft' | 'contractor' | 'status' | 'help';

function intentOf(q: string, mode: 'ask' | 'draft', d: LiveProjectData): { intent: Intent; contractorId?: string } {
  const contractor = d.contractors.find(c => {
    const words = c.name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !['contractors', 'structure'].includes(w));
    return q.includes(c.name.toLowerCase()) || words.some(w => q.includes(w));
  });
  if (mode === 'draft' || has(q, 'draft', 'owner update', 'weekly update', 'write', 'report', 'briefing', 'brief me', 'summary of the week')) return { intent: 'draft' };
  if (contractor) return { intent: 'contractor', contractorId: contractor.id };
  if (has(q, 'overdue', 'late deliverable', 'past due', 'missed')) return { intent: 'overdue' };
  if (has(q, 'approv', 'decision', 'awaiting', 'review', 'sign off', 'sign-off')) return { intent: 'awaiting' };
  if (has(q, 'delay', 'behind', 'blocked', 'block', 'slip', 'late', 'risk', 'critical')) return { intent: 'behind' };
  if (has(q, 'milestone', 'handover', 'on track', 'deadline', 'next')) return { intent: 'milestone' };
  if (has(q, 'status', 'progress', 'health', 'overview', 'where are we', 'how is', "how's", 'spi')) return { intent: 'status' };
  return { intent: 'help' };
}

function statusLine(d: LiveProjectData) {
  const m = d.metrics;
  const gap = m.progress - m.plannedToday;
  return `**${m.progress}%** of the work is complete against **${m.plannedToday}%** planned by today (${gap >= 0 ? `${gap} points ahead` : `${-gap} points behind`}, SPI ${m.spi.toFixed(2)}). Health is ${m.health}/100.`;
}

function unlocks(d: LiveProjectData, id: string) {
  return d.deps.filter(x => x.predecessor_id === id).map(x => d.activities.find(a => a.id === x.successor_id)?.name).filter(Boolean) as string[];
}

const answers: Record<Intent, (d: LiveProjectData, q: string, contractorId?: string) => string> = {
  status(d) {
    const lines = [
      `${d.project?.name ?? 'The project'}${d.week ? ` is in week ${d.week.week}${d.week.total ? ` of ${d.week.total}` : ''}` : ''}${d.phase ? `, in **${d.phase}**` : ''}.`,
      statusLine(d),
      '',
      `- ${plural(d.active.length, 'activity', 'activities')} scheduled for today`,
      `- ${plural(d.delayed.length, 'activity', 'activities')} marked delayed, ${d.behind.length} at least 15 points behind plan`,
      `- ${plural(d.awaiting.length, 'deliverable')} awaiting a decision, ${d.overdue.length} overdue`,
    ];
    return lines.join('\n');
  },

  behind(d) {
    const map = new Map<string, { a: LiveProjectData['activities'][number]; gap: number }>();
    d.behind.forEach(b => map.set(b.a.id, b));
    d.delayed.forEach(a => { if (!map.has(a.id)) map.set(a.id, { a, gap: 0 }); });
    const list = [...map.values()].sort((x, y) => Number(y.a.is_critical) - Number(x.a.is_critical) || y.gap - x.gap);
    if (!list.length) return `No activity is marked delayed or running 15 or more points behind its baseline. ${statusLine(d)}`;
    return [
      `${plural(list.length, 'activity', 'activities')} ${list.length === 1 ? 'is' : 'are'} delayed or behind plan:`,
      '',
      ...list.slice(0, 8).map(({ a, gap }) => {
        const next = unlocks(d, a.id);
        return `- **${a.name}** (${d.contractorName(a.contractor_id)}): ${a.progress}% done${gap > 0 ? `, ${gap} points behind plan` : ''}${a.status === 'delayed' ? ', marked delayed' : ''}${a.is_critical ? ', on the critical path' : ''}; due ${fmt(a.end_date)}.${next.length ? ` Holds up: ${next.join(', ')}.` : ''}`;
      }),
      ...(list.length > 8 ? [`- …and ${list.length - 8} more on the Timeline.`] : []),
    ].join('\n');
  },

  awaiting(d) {
    if (!d.awaiting.length) return 'No deliverables are waiting for a decision right now.';
    return [
      `${plural(d.awaiting.length, 'deliverable')} ${d.awaiting.length === 1 ? 'is' : 'are'} waiting for a decision:`,
      '',
      ...d.awaiting.slice(0, 10).map(x => `- **${x.name}** (${d.contractorName(x.contractor_id)}), ${x.status.replace(/_/g, ' ')}${x.due_date ? `, due ${fmt(x.due_date)}${x.due_date < d.today ? ' (overdue)' : ''}` : ''}`),
      '',
      'Approve or reject them from Deliverables → Awaiting decision.',
    ].join('\n');
  },

  overdue(d) {
    if (!d.overdue.length) return 'Nothing is overdue — every dated deliverable is either closed or still within its due date.';
    const by = new Map<string, typeof d.overdue>();
    d.overdue.forEach(x => { const k = d.contractorName(x.contractor_id); by.set(k, [...(by.get(k) ?? []), x]); });
    return [
      `${plural(d.overdue.length, 'deliverable')} ${d.overdue.length === 1 ? 'is' : 'are'} overdue:`,
      '',
      ...[...by.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 6).map(([who, items]) =>
        `- **${who}** — ${items.length}: ${items.slice(0, 3).map(x => `${x.name} (${days(x.due_date!, d.today)} days late)`).join('; ')}${items.length > 3 ? `; +${items.length - 3} more` : ''}`),
    ].join('\n');
  },

  milestone(d) {
    const next = d.milestones.find(m => m.status !== 'achieved');
    const achieved = d.milestones.filter(m => m.status === 'achieved').length;
    if (!next) return `All ${d.milestones.length} milestones are achieved.`;
    const lines = [`${achieved} of ${d.milestones.length} milestones are achieved. The next is **${next.name}**, planned for ${fmt(next.planned_date)}${next.planned_date ? ` (${days(d.today, next.planned_date) >= 0 ? `in ${days(d.today, next.planned_date)} days` : `${-days(d.today, next.planned_date)} days late`})` : ''}.`];
    if (next.planned_date) {
      const before = d.activities.filter(a => a.status !== 'done' && a.end_date <= next.planned_date!);
      const atRisk = before.filter(a => a.status === 'delayed' || d.behind.some(b => b.a.id === a.id));
      lines.push(`${plural(before.length, 'unfinished activity', 'unfinished activities')} ${before.length === 1 ? 'is' : 'are'} scheduled to finish before then${atRisk.length ? `; ${atRisk.length} of them ${atRisk.length === 1 ? 'is' : 'are'} behind plan: ${atRisk.slice(0, 4).map(a => a.name).join(', ')}` : ', none of them behind plan'}.`);
    }
    lines.push(statusLine(d));
    return lines.join('\n\n');
  },

  contractor(d, _q, id) {
    const c = d.contractors.find(x => x.id === id)!;
    const own = d.activities.filter(a => a.contractor_id === id);
    const dels = d.deliverables.filter(x => x.contractor_id === id);
    if (!own.length && !dels.length) return `${c.name} has no activities or deliverables visible to you.`;
    const cm = own.length ? computeMetrics(own) : null;
    const open = dels.filter(x => !isClosedDeliverable(x.status));
    const late = d.overdue.filter(x => x.contractor_id === id);
    const now = d.active.filter(a => a.contractor_id === id);
    return [
      `**${c.name}**${c.scope ? ` — ${c.scope}` : ''}.`,
      cm ? `${plural(own.length, 'activity', 'activities')}: ${cm.progress}% earned against ${cm.plannedToday}% planned by today${cm.delayed ? `, ${cm.delayed} marked delayed` : ''}.` : '',
      `${open.length} open deliverable${open.length === 1 ? '' : 's'}${late.length ? `, ${late.length} overdue` : ''}.`,
      ...(now.length ? ['', 'In progress now:', ...now.map(a => `- ${a.name}: ${a.progress}%, due ${fmt(a.end_date)}`)] : []),
    ].filter(Boolean).join('\n');
  },

  draft(d) {
    const m = d.metrics;
    const gap = m.progress - m.plannedToday;
    const late = [...new Set([...d.delayed, ...d.behind.map(b => b.a)])];
    const next = d.milestones.find(x => x.status !== 'achieved');
    const recent = d.events.slice(0, 3).map(e => `${e.actor_name ?? 'The team'} ${e.verb} ${e.subject_text ?? ''}`.trim());
    return [
      `${d.project?.name ?? 'The project'} is ${m.progress}% complete against ${m.plannedToday}% planned${d.week ? ` in week ${d.week.week}` : ''}${d.phase ? `, with ${d.phase} the current focus` : ''}. ${gap >= 0 ? 'The programme is at or ahead of plan.' : `Progress is ${-gap} points behind plan (SPI ${m.spi.toFixed(2)}).`}`,
      `${recent.length ? `Recent updates: ${recent.join('; ')}. ` : ''}${late.length ? `${plural(late.length, 'activity', 'activities')} ${late.length === 1 ? 'needs' : 'need'} attention, led by ${late.slice(0, 2).map(a => a.name).join(' and ')}.` : 'No activity is running behind plan.'} ${d.overdue.length ? `${plural(d.overdue.length, 'deliverable is', 'deliverables are')} overdue.` : ''}`.trim(),
      `${d.awaiting.length ? `${plural(d.awaiting.length, 'deliverable awaits', 'deliverables await')} the owner's decision, including ${d.awaiting.slice(0, 2).map(x => x.name).join(' and ')}. ` : 'No decisions are waiting on the owner. '}${next ? `The next milestone is ${next.name}, planned for ${fmt(next.planned_date)}.` : 'All milestones are achieved.'}`,
    ].join('\n\n');
  },

  help(d) {
    return [
      'I can answer these from the live project data:',
      '',
      '- overall status and progress against plan',
      '- what is delayed or behind, and what it holds up',
      '- deliverables awaiting a decision, and what is overdue',
      '- the next milestone and whether it is at risk',
      '- any contractor by name (for example “how is KONN doing?”)',
      '- a draft of the weekly owner update',
      '',
      statusLine(d),
    ].join('\n');
  },
};

export function answerOffline(question: string, mode: 'ask' | 'draft', d: LiveProjectData) {
  const q = question.toLowerCase();
  const { intent, contractorId } = intentOf(q, mode, d);
  return answers[intent](d, q, contractorId);
}
