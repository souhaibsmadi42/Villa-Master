import { createClient } from '@/lib/supabase/server';
import { computeMetrics } from '@/lib/metrics';

export const runtime = 'nodejs';

// Records today's earned/planned/SPI so the S-curve can show a real actual line.
// Auth: an admin/consultant session, OR a cron caller with x-cron-secret == CRON_SECRET.
export async function POST(req: Request) {
  const sb = await createClient();
  const secret = req.headers.get('x-cron-secret');
  const bearer = req.headers.get('authorization'); // Vercel Cron sends "Bearer $CRON_SECRET"
  let allowed = false;

  if (process.env.CRON_SECRET && (secret === process.env.CRON_SECRET || bearer === `Bearer ${process.env.CRON_SECRET}`)) {
    allowed = true;
  } else {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const { data: prof } = await sb.from('profile').select('role').eq('user_id', user.id).single();
      allowed = !!prof && ['admin', 'consultant'].includes(prof.role);
    }
  }
  if (!allowed) return Response.json({ error: 'forbidden' }, { status: 403 });

  const [{ data: project }, { data: activities }, { data: costs }] = await Promise.all([
    sb.from('project').select('id').limit(1).single(),
    sb.from('activity').select('progress,weight,status,start_date,end_date,baseline_start,baseline_end'),
    sb.from('cost_line').select('budget,actual_cost'),
  ]);
  if (!project) return Response.json({ error: 'no_project' }, { status: 404 });

  const m = computeMetrics((activities ?? []) as any, (costs ?? []) as any);
  const at = new Date().toISOString().slice(0, 10);
  const { error } = await sb.from('progress_snapshot')
    .upsert({ project_id: project.id, at, earned: m.progress, planned: m.plannedToday, spi: m.spi }, { onConflict: 'project_id,at' });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, at, earned: m.progress, planned: m.plannedToday, spi: m.spi });
}
