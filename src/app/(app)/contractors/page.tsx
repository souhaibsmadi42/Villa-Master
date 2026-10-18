import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/rbac';
import { getContractorRows } from '@/lib/contractors';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/States';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { ContractorWorkspace } from '@/components/contractors/ContractorWorkspace';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Contractors' };

export default async function ContractorsPage() {
  const profile = await getSessionProfile();
  // Contractors manage their own scope from their workspace page.
  if (profile?.role === 'contractor') redirect(profile.contractorId ? `/contractors/${profile.contractorId}` : '/dashboard');

  const rows = (await getContractorRows()).filter(r => r.activities > 0 || r.openDeliverables > 0);
  const totals = {
    trades: rows.length,
    behind: rows.filter(r => r.delayed > 0 || r.planned - r.earned >= 10).length,
    open: rows.reduce((s, r) => s + r.openDeliverables, 0),
    overdue: rows.reduce((s, r) => s + r.overdue, 0),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader kicker="Delivery" title={<>The <em className="italic text-accent">contractors</em></>}
        sub="Every trade on the programme: what they are doing now, how they track against plan, and what is waiting on them.">
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
          {[['Trades', totals.trades], ['Behind plan', totals.behind], ['Open deliverables', totals.open], ['Overdue', totals.overdue]].map(([k, v]) => (
            <div key={k as string}><dt className="eyebrow text-[9.5px]">{k}</dt><dd className="mt-0.5 text-[15px] text-ink"><AnimatedNumber value={v as number} className="num" /></dd></div>
          ))}
        </dl>
      </PageHeader>
      {rows.length ? <ContractorWorkspace rows={rows} /> : (
        <Panel><EmptyState title="No contractors yet" body="Contractors appear here once the programme is seeded." /></Panel>
      )}
    </div>
  );
}
