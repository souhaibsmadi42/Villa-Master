import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { fmtDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/States';
import { Reveal } from '@/components/marketing/Reveal';
import { ReportGenerator } from '@/components/reports/ReportGenerator';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reports' };

export default async function ReportsPage() {
  const sb = await createClient();
  const profile = await getSessionProfile();
  const canGenerate = profile?.role === 'admin' || profile?.role === 'consultant';

  const { data: reports } = await sb.from('report').select('id,week_of,summary_md,created_at').order('week_of', { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="Oversight" title={<>Weekly <em className="italic text-accent">reports</em></>}
        sub="Owner updates drafted from live project data — an archive of how the build has moved, week by week." />
      <ReportGenerator canGenerate={canGenerate} />
      <ol className="flex flex-col">
        {(reports ?? []).map((r, i) => (
          <Reveal key={r.id} delay={Math.min(i, 4) * 0.05}>
            <li className="grid gap-4 border-b border-line py-8 md:grid-cols-[220px_1fr]">
              <div>
                <div className="eyebrow text-[9.5px]">Week of</div>
                <div className="display mt-1 text-[28px] text-ink">{fmtDate(r.week_of, { day: 'numeric', month: 'short' })}</div>
                <div className="num text-[11px] text-faint">{fmtDate(r.week_of, { year: 'numeric' })} · written {fmtDate(r.created_at, { day: 'numeric', month: 'short' })}</div>
              </div>
              <p className="max-w-[68ch] whitespace-pre-line text-[14.5px] leading-[1.75] text-ink-2">{r.summary_md}</p>
            </li>
          </Reveal>
        ))}
      </ol>
      {(!reports || reports.length === 0) && <Panel><EmptyState title="No reports yet" body={canGenerate ? 'Generate the first weekly update above.' : 'Reports appear here once the team publishes them.'} /></Panel>}
    </div>
  );
}
