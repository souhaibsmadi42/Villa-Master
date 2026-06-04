'use client';
import { useRouter, usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login'); router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 glass border-b border-[var(--glass-stroke)] shadow-e1">
      <div className="flex items-center gap-4 px-5 h-16">
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <span className="h-8 w-8 rounded-[10px] bg-gradient-to-br from-bark to-olive text-cream grid place-items-center font-display text-[15px] shadow-e1">V</span>
          <span className="font-display text-[17px] hidden sm:block leading-none">Villa Ajloun</span>
        </Link>

        <nav className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {NAV.filter(n => n.roles.includes(role)).map(n => {
            const active = pathname === n.href || pathname.startsWith(n.href + '/');
            return (
              <Link key={n.href} href={n.href}
                className={`px-3 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap transition ${
                  active ? 'bg-bark text-cream shadow-e1' : 'text-stone hover:text-ink hover:bg-sand/40'
                }`}>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5 shrink-0">
          <Pill tone="olive" className="hidden sm:inline-flex">{role}</Pill>
          <span className="text-[12px] text-stone hidden lg:block max-w-[160px] truncate">{email}</span>
          <button onClick={signOut}
            className="rounded-full border border-iron/40 text-iron px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wide hover:bg-iron hover:text-white transition">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
