import { createClient } from '@/lib/supabase/server';
import { anthropic, ANTHROPIC_MODEL } from '@/lib/anthropic';
import { computeMetrics } from '@/lib/metrics';

export const runtime = 'nodejs';

export async function POST() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { data: prof } = await sb.from('profile').select('role').eq('user_id', user.id).single();
  if (!prof || !['admin', 'consultant'].includes(prof.role)) return Response.json({ error: 'forbidden' }, { status: 403 });

  const [{ data: project }, { data: activities }, { data: dels }, { data: events }, { data: milestones }, { data: costs }] = await Promise.all([
    sb.from('project').select('id,name,location,end_date').limit(1).single(),
    sb.from('activity').select('name,progress,weight,status,start_date,end_date,baseline_start,baseline_end'),
    sb.from('deliverable').select('name,status,due_date'),
    sb.from('event_log').select('actor_name,verb,subject_text,at').order('at', { ascending: false }).limit(12),
    sb.from('milestone').select('name,planned_date,status').order('ord'),
    sb.from('cost_line').select('budget,actual_cost'),
  ]);

  if (!project) return Response.json({ error: 'no_project', message: 'No project found — run the seed first.' }, { status: 404 });

  const acts = activities ?? [];
  const m = computeMetrics(acts as any, (costs ?? []) as any);
  const pending = (dels ?? []).filter(d => d.status === 'submitted' || d.status === 'under_review');
  const delayed = acts.filter(a => a.status === 'delayed').map(a => a.name);
  const nextMs = (milestones ?? []).find(x => x.status !== 'achieved');

  const context = [
    `Project: ${project?.name} — ${project?.location}. Target handover ${project?.end_date}.`,
    `Overall progress ${m.progress}% (planned ${m.plannedToday}% by today). SPI ${m.spi}. Health ${m.health}/100.`,
    `Activities: ${acts.length}. Delayed: ${delayed.length}${delayed.length ? ' (' + delayed.slice(0, 5).join('; ') + ')' : ''}.`,
    `Deliverables awaiting approval: ${pending.length}${pending.length ? ' (' + pending.slice(0, 6).map(d => d.name).join('; ') + ')' : ''}.`,
    `Next milestone: ${nextMs ? `${nextMs.name} (planned ${nextMs.planned_date})` : 'none'}.`,
    `Recent activity: ${(events ?? []).map(e => `${e.actor_name} ${e.verb} ${e.subject_text ?? ''}`).join('; ') || 'none recorded'}.`,
  ].join('\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    const fallback = `Week of ${new Date().toLocaleDateString('en-GB')}. ${context.split('\n')[1]} ${delayed.length ? `${delayed.length} activities are delayed.` : 'No activities are delayed.'} ${pending.length} deliverables await approval. Next milestone: ${nextMs?.name ?? '—'}.`;
    await save(sb, user.id, project!.id, fallback, m);
    return Response.json({ ok: true, summary: fallback, generated: false });
  }

  const out = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 700,
    system: `You write the weekly owner update for the Villa Ajloun construction project.
Tone: calm, executive, Financial-Times-like. Three short paragraphs, ~180 words total.
First paragraph: where the project stands (progress vs plan, schedule health).
Second: what moved this week and what is blocked or delayed.
Third: the decisions or milestones the owner should focus on next.
No emoji, no headings, no lists. Cite specific names, numbers, and dates.`,
    messages: [{ role: 'user', content: `Write this week's owner update from these facts:\n\n${context}` }],
  });
  const summary = out.content.filter((b): b is { type: 'text'; text: string } => b.type === 'text').map(b => b.text).join('').trim();

  await save(sb, user.id, project!.id, summary, m);
  return Response.json({ ok: true, summary, generated: true });
}

async function save(sb: Awaited<ReturnType<typeof createClient>>, userId: string, projectId: string, summary: string, metrics: object) {
  const monday = new Date(); const day = monday.getDay(); monday.setDate(monday.getDate() - ((day + 6) % 7));
  await sb.from('report').insert({ project_id: projectId, week_of: monday.toISOString().slice(0, 10), summary_md: summary, metrics, created_by: userId });
}
