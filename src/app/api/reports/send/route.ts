import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Emails the latest weekly report to owners + admins via Resend.
export async function POST() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { data: prof } = await sb.from('profile').select('role').eq('user_id', user.id).single();
  if (!prof || !['admin', 'consultant'].includes(prof.role)) return Response.json({ error: 'forbidden' }, { status: 403 });

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'no_resend', message: 'Set RESEND_API_KEY to email reports.' }, { status: 400 });
  }

  const [{ data: report }, { data: recipients }, { data: project }] = await Promise.all([
    sb.from('report').select('week_of,summary_md').order('week_of', { ascending: false }).limit(1).single(),
    sb.from('profile').select('email').in('role', ['owner', 'admin']),
    sb.from('project').select('name').limit(1).single(),
  ]);
  if (!report) return Response.json({ error: 'no_report' }, { status: 404 });
  const to = (recipients ?? []).map(r => r.email).filter(Boolean);
  if (!to.length) return Response.json({ error: 'no_recipients' }, { status: 400 });

  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#1E1410">
      <div style="background:linear-gradient(135deg,#4A3728,#2A3E2C);color:#F8F5F0;padding:24px 28px;border-radius:14px 14px 0 0">
        <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;opacity:.8">${project?.name ?? 'Villa Ajloun'} · Weekly update</div>
        <div style="font-size:24px;margin-top:6px">Week of ${report.week_of}</div>
      </div>
      <div style="padding:24px 28px;background:#fff;border:1px solid #E8E0D4;border-top:none;border-radius:0 0 14px 14px;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;white-space:pre-wrap">${(report.summary_md ?? '').replace(/</g, '&lt;')}</div>
    </div>`;

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM || 'Villa Ajloun <onboarding@resend.dev>',
      to, subject: `Villa Ajloun — weekly update (${report.week_of})`, html,
    });
  } catch (e: any) {
    return Response.json({ error: 'send_failed', message: e?.message }, { status: 500 });
  }
  return Response.json({ ok: true, sent: to.length });
}
