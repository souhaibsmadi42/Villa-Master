import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/rbac';
import { getShellSummary } from '@/lib/project-data';
import { AppShell } from '@/components/chrome/AppShell';

export default async function AppLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login');
  const summary = await getShellSummary();

  return (
    <AppShell role={profile.role} email={profile.email} summary={summary}>
      {children}
      {modal}
    </AppShell>
  );
}
