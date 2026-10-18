'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, Sparkles, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Role } from '@/lib/rbac';
import { cn } from '@/lib/cn';
import { spring } from '@/motion/tokens';
import { scrim } from '@/motion/variants';
import { navFor, isActive } from './nav';
import { BrandMark, Wordmark } from './Brand';
import { useShell } from './AppShell';
import { Kbd } from '@/components/ui/Controls';
import { Tooltip } from '@/components/ui/Tooltip';

function useSignOut() {
  const router = useRouter();
  return async () => {
    await createClient().auth.signOut();
    router.push('/login'); router.refresh();
  };
}

function NavList({ role, compact, layoutKey }: { role: Role; compact?: boolean; layoutKey: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-col gap-5">
      {navFor(role).map(group => (
        <div key={group.label} className="flex flex-col gap-0.5">
          {!compact && <div className="eyebrow mb-1.5 px-3 text-[9.5px] text-faint">{group.label}</div>}
          {compact && <div className="mx-auto mb-1.5 h-px w-6 bg-line" aria-hidden />}
          {group.items.map(item => {
            const active = isActive(pathname, item.href);
            const link = (
              <Link href={item.href} aria-current={active ? 'page' : undefined}
                className={cn('group relative flex items-center gap-3 rounded-[8px] text-[13px] transition-colors duration-quick',
                  compact ? 'h-10 w-10 justify-center' : 'h-9 px-3',
                  active ? 'text-ink' : 'text-muted hover:bg-ink/[0.04] hover:text-ink')}>
                {active && (
                  <motion.span layoutId={`nav-active-${layoutKey}`} transition={spring.snappy}
                    className="absolute inset-0 rounded-[8px] bg-raised shadow-e1 ring-1 ring-line">
                    <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
                  </motion.span>
                )}
                <item.icon size={16} strokeWidth={1.6} className="relative shrink-0" />
                {!compact && <span className="relative truncate font-medium">{item.label}</span>}
              </Link>
            );
            return compact
              ? <Tooltip key={item.href} content={item.label} side="right" delay={150}>{link}</Tooltip>
              : <div key={item.href}>{link}</div>;
          })}
        </div>
      ))}
    </nav>
  );
}

function AssistantButton({ compact }: { compact?: boolean }) {
  const { openAssistant } = useShell();
  const btn = (
    <button onClick={() => openAssistant()}
      className={cn('group flex items-center gap-3 rounded-[9px] border border-line bg-raised text-[13px] font-medium text-ink shadow-e1 transition hover:border-line-strong hover:shadow-e2',
        compact ? 'mx-auto h-10 w-10 justify-center' : 'h-10 w-full px-3')}>
      <Sparkles size={15} className="text-accent" />
      {!compact && <><span className="flex-1 text-left">Project assistant</span><Kbd>⌘J</Kbd></>}
    </button>
  );
  return compact ? <Tooltip content="Project assistant (⌘J)" side="right">{btn}</Tooltip> : btn;
}

function UserBlock({ email, role, compact }: { email: string; role: Role; compact?: boolean }) {
  const signOut = useSignOut();
  const initials = email.slice(0, 2).toUpperCase();
  if (compact) return (
    <Tooltip content="Sign out" side="right">
      <button onClick={signOut} aria-label="Sign out" className="mx-auto grid h-10 w-10 place-items-center rounded-[9px] text-muted hover:bg-ink/[0.05] hover:text-ink"><LogOut size={15} /></button>
    </Tooltip>
  );
  return (
    <div className="flex items-center gap-3 rounded-[10px] px-2 py-2">
      <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink/[0.07] text-[10.5px] text-ink-2">{initials}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] text-ink">{email}</span>
        <span className="eyebrow text-[9.5px]">{role}</span>
      </span>
      <button onClick={signOut} aria-label="Sign out" title="Sign out" className="grid h-8 w-8 place-items-center rounded-[8px] text-muted hover:bg-ink/[0.06] hover:text-critical"><LogOut size={14} /></button>
    </div>
  );
}

/** Desktop: full sidebar (lg+), icon rail (md). Hidden on mobile — see MobileNav. */
export function Sidebar({ role, email }: { role: Role; email: string }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-surface/80 backdrop-blur-xl lg:flex">
        <Link href="/dashboard" className="flex items-center gap-3 px-5 pb-5 pt-6"><BrandMark /><Wordmark sub="Villa Ajloun" /></Link>
        <div className="flex-1 overflow-y-auto px-3 pb-4"><NavList role={role} layoutKey="full" /></div>
        <div className="flex flex-col gap-2 border-t border-line p-3"><AssistantButton /><UserBlock email={email} role={role} /></div>
      </aside>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center border-r border-line bg-surface/80 backdrop-blur-xl md:flex lg:hidden">
        <Link href="/dashboard" className="py-5" aria-label="Villa Master home"><BrandMark /></Link>
        <div className="flex-1 overflow-y-auto px-2 pb-4 no-scrollbar"><NavList role={role} compact layoutKey="rail" /></div>
        <div className="flex flex-col gap-2 border-t border-line py-3"><AssistantButton compact /><UserBlock email={email} role={role} compact /></div>
      </aside>
    </>
  );
}

/** Mobile navigation drawer (from the left). */
export function MobileNav({ open, onClose, role, email }: { open: boolean; onClose: () => void; role: Role; email: string }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[160] md:hidden">
          <motion.div variants={scrim} initial="hidden" animate="show" exit="exit" onClick={onClose}
            className="absolute inset-0 backdrop-blur-[2px]" style={{ background: 'var(--scrim)' }} />
          <motion.aside role="dialog" aria-modal="true" aria-label="Navigation"
            initial={{ x: '-100%' }} animate={{ x: 0, transition: spring.panel }} exit={{ x: '-100%', transition: { duration: 0.22 } }}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0.5, right: 0 }}
            onDragEnd={(_, i) => { if (i.offset.x < -80 || i.velocity.x < -500) onClose(); }}
            className="absolute inset-y-0 left-0 flex w-[84%] max-w-[320px] flex-col bg-surface shadow-e5">
            <div className="flex items-center justify-between px-5 pb-4 pt-5">
              <span className="flex items-center gap-3"><BrandMark /><Wordmark sub="Villa Ajloun" /></span>
              <button onClick={onClose} aria-label="Close navigation" className="grid h-9 w-9 place-items-center rounded-[8px] text-muted hover:bg-ink/[0.05]"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4"><NavList role={role} layoutKey="mobile" /></div>
            <div className="flex flex-col gap-2 border-t border-line p-3"><AssistantButton /><UserBlock email={email} role={role} /></div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
