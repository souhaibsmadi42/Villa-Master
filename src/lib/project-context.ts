/**
 * Compact, model-friendly snapshot of the project state.
 *
 * This is the *only* place we summarize project facts for the LLM. Keep it short
 * enough to fit in a system prompt comfortably; the assistant can request
 * deeper data via tools if we add them later.
 *
 * In a real deployment, build this from Supabase queries. For Phase 1 we
 * return a curated static snapshot that mirrors the schema in
 * `supabase/migrations/0001_init.sql`.
 */

export type ProjectSnapshot = {
  project: {
    name: string;
    location: string;
    start: string;
    end: string;
    currentWeek: number;
    phase: string;
    health: number; // 0..100
  };
  contractors: Array<{
    id: string; name: string; scope: string;
    openDeliverables: number; onTimePct: number; avgReviewDays: number;
    onSiteToday: boolean;
  }>;
  upcomingDeliverables: Array<{
    id: string; title: string; contractor: string; due: string;
    status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'delivered';
    priority: 'low' | 'med' | 'high';
  }>;
  risks: Array<{ id: string; summary: string; severity: 'low' | 'med' | 'high' }>;
  recentActivity: Array<{ at: string; actor: string; action: string; subject: string }>;
};

export const DEMO_SNAPSHOT: ProjectSnapshot = {
  project: {
    name: 'Villa Ajloun',
    location: 'Ajloun, Jordan',
    start: '2026-06-01',
    end:   '2027-12-15',
    currentWeek: 28,
    phase: 'Foundations',
    health: 94,
  },
  contractors: [
    { id: 'konn',    name: 'KONN',    scope: 'Steel & envelope',  openDeliverables: 8,  onTimePct: 82, avgReviewDays: 2.3, onSiteToday: true  },
    { id: 'courts',  name: 'Courts',  scope: 'Site & tennis',     openDeliverables: 4,  onTimePct: 91, avgReviewDays: 1.8, onSiteToday: false },
    { id: 'design',  name: 'Atelier', scope: 'Design package',    openDeliverables: 11, onTimePct: 76, avgReviewDays: 3.1, onSiteToday: false },
    { id: 'fitout',  name: 'Fitout',  scope: 'Interior & joinery', openDeliverables: 2,  onTimePct: 100, avgReviewDays: 1.2, onSiteToday: false },
    { id: 'boundary',name: 'Boundary',scope: 'Walls, gates, lights', openDeliverables: 3, onTimePct: 88, avgReviewDays: 2.0, onSiteToday: true },
  ],
  upcomingDeliverables: [
    { id: 'd-1', title: 'Steel package shop drawings',     contractor: 'KONN',    due: '2026-08-14', status: 'in_progress', priority: 'high' },
    { id: 'd-2', title: 'Pool tile sample 03',             contractor: 'Atelier', due: '2026-07-22', status: 'submitted',   priority: 'med'  },
    { id: 'd-3', title: 'Stair stone finish decision',     contractor: 'Atelier', due: '2026-07-03', status: 'pending',     priority: 'high' },
    { id: 'd-4', title: 'Entry gate fabrication review',   contractor: 'Boundary',due: '2026-07-30', status: 'pending',     priority: 'med'  },
  ],
  risks: [
    { id: 'r-1', summary: 'Envelope handover likely +4 days due to shop-drawing turnaround.', severity: 'med'  },
    { id: 'r-2', summary: 'Material price volatility on imported stone.',                     severity: 'low'  },
  ],
  recentActivity: [
    { at: '2026-05-27T11:42Z', actor: 'KONN',     action: 'uploaded', subject: 'Steel-DET-014.dwg' },
    { at: '2026-05-27T11:08Z', actor: 'Architect',action: 'approved', subject: 'Pool tile sample 03' },
    { at: '2026-05-27T09:55Z', actor: 'Owner',    action: 'commented on', subject: 'Courts deliverable' },
  ],
};

export function snapshotForSystem(s: ProjectSnapshot): string {
  return [
    `PROJECT: ${s.project.name} — ${s.project.location}`,
    `Schedule: ${s.project.start} → ${s.project.end}`,
    `Currently: Week ${s.project.currentWeek}, phase "${s.project.phase}", health ${s.project.health}/100.`,
    ``,
    `CONTRACTORS:`,
    ...s.contractors.map(c =>
      `- ${c.name} (${c.scope}) — ${c.openDeliverables} open, ${c.onTimePct}% on-time, avg review ${c.avgReviewDays}d${c.onSiteToday ? ', on site today' : ''}`
    ),
    ``,
    `UPCOMING DELIVERABLES:`,
    ...s.upcomingDeliverables.map(d =>
      `- [${d.priority}/${d.status}] "${d.title}" — ${d.contractor}, due ${d.due}`
    ),
    ``,
    `OPEN RISKS:`,
    ...s.risks.map(r => `- (${r.severity}) ${r.summary}`),
    ``,
    `RECENT ACTIVITY:`,
    ...s.recentActivity.map(a => `- ${a.at}  ${a.actor} ${a.action} ${a.subject}`),
  ].join('\n');
}
