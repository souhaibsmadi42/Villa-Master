import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { ReportGenerator } from '@/components/reports/ReportGenerator';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const sb = await createClient();
  const profile = await getSessionProfile();
  const canGenerate = profile?.role === 'admin' || profile?.role === 'consultant';

  const { data: reports } = await sb.from('report').select('id,week_of,summary_md,created_at').order('week_of', { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Villa Ajloun · Reports</Eyebrow>
        <h1 className="font-display text-[clamp(28px,4vw,44px)] tracking-tighter mt-1">Weekly Reports</h1>
        <p className="text-stone text-[13px]">AI-drafted owner updates from live project data.</p>
      </div>

      <ReportGenerator canGenerate={canGenerate} />

      <div className="flex flex-col gap-4">
        {(reports ?? []).map(r => (
          <GlassPanel key={r.id} className="p-6">
            <div className="flex items-center justify-between">
              <Eyebrow>Week of {r.week_of}</Eyebrow>
              <span className="num text-[11px] text-stone">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <p className="mt-3 text-[14px] text-text-2 leading-relaxed whitespace-pre-wrap">{r.summary_md}</p>
          </GlassPanel>
        ))}
        {(!reports || reports.length === 0) && <p className="text-stone italic">No reports yet{canGenerate ? ' — generate one above.' : '.'}</p>}
      </div>
    </div>
  );
}
