import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/rbac';
import { AppHeader } from '@/components/chrome/AppHeader';
import { CommandK } from '@/components/chrome/CommandK';

export default async function AppLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile) redirect('/login');

  return (
    <div className="min-h-screen bg-cream">
      <AppHeader email={profile.email} role={profile.role} />
      <main className="mx-auto max-w-[1280px] px-5 py-8">{children}</main>
      {modal}
      <CommandK />
    </div>
  );
}
