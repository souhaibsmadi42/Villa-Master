'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Pill } from '@/components/ui/Pill';
import type { Role } from '@/lib/rbac';

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: '/dashboard',   label: 'Dashboard',   roles: ['admin', 'owner', 'consultant', 'contractor'] },
  { href: '/timeline',    label: 'Timeline',    roles: ['admin', 'owner', 'consultant', 'contractor'] },
  { href: '/map',         label: 'Map',         roles: ['admin', 'owner', 'consultant', 'contractor'] },
  { href: '/site',        label: '3D',          roles: ['admin', 'owner', 'consultant', 'contractor'] },
  { href: '/milestones',  label: 'Milestones',  roles: ['admin', 'owner', 'consultant', 'contractor'] },
  { href: '/documents',   label: 'Documents',   roles: ['admin', 'owner', 'consultant', 'contractor'] },
  { href: '/contractors', label: 'Contractors', roles: ['admin', 'owner', 'consultant'] },
  { href: '/reports',     label: 'Reports',     roles: ['admin', 'owner', 'consultant'] },
  { href: '/owner',       label: 'Owner',       roles: ['admin', 'owner'] },
  { href: '/team',        label: 'Team',        roles: ['admin'] },
];

export function AppHeader({ email, role }: { email: string; role: Role }) {
  const router = useRouter();
  const supabase = createClient();
  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login'); router.refresh();
  }
  return (
    <header className="sticky top-0 z-50 glass border-b border-[var(--glass-stroke)]">
      <div className="flex items-center gap-4 px-5 h-14">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-bark to-olive text-cream grid place-items-center font-display text-[14px]">V</span>
          <span className="font-display text-[16px] hidden sm:block">Villa Ajloun</span>
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {NAV.filter(n => n.roles.includes(role)).map(n => (
            <Link key={n.href} href={n.href}
              className="px-3 py-1.5 rounded-full text-[12.5px] font-medium text-stone hover:text-ink hover:bg-sand/40 transition">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Pill tone="olive">{role}</Pill>
          <span className="text-[12px] text-stone hidden md:block max-w-[180px] truncate">{email}</span>
          <button onClick={signOut}
            className="rounded-full border border-iron/40 text-iron px-3 py-1 text-[10.5px] font-bold uppercase tracking-wide hover:bg-iron hover:text-white transition">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
