'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Menu, Moon, Search, Sun, LogOut, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { relTime } from '@/lib/format';
import { toneColor } from '@/lib/status';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Popover } from '@/components/ui/Popover';
import { Kbd } from '@/components/ui/Controls';
import { Tooltip } from '@/components/ui/Tooltip';
import { useShell } from './AppShell';
import { BrandMark } from './Brand';

const SEEN_KEY = 'vm-notif-seen';

export function StatusBar({ onMenu }: { onMenu: () => void }) {
  const { summary, openPalette } = useShell();
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 6);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  const m = summary.metrics;

  return (
    <div className="sticky top-0 z-30 px-3 pt-3 sm:px-5 lg:px-8">
      <header className={cn(
        'mx-auto flex h-[52px] max-w-content items-center gap-2 rounded-[12px] border pl-2 pr-1.5 transition-[background-color,box-shadow,border-color] duration-glide sm:gap-3 sm:pl-3',
        scrolled ? 'glass shadow-e3' : 'border-transparent bg-transparent',
      )}>
        <button onClick={onMenu} aria-label="Open navigation" className="grid h-9 w-9 place-items-center rounded-[8px] text-ink-2 hover:bg-ink/[0.05] md:hidden"><Menu size={18} /></button>
        <Link href="/dashboard" className="md:hidden" aria-label="Overview"><BrandMark size={24} /></Link>

        {/* Project identity + phase */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium leading-tight text-ink">{summary.projectName}</div>
            <div className="num hidden truncate text-[10.5px] leading-tight text-muted sm:block">
              {summary.week ? (summary.week.startsIn ? `STARTS IN ${summary.week.startsIn}D` : `WK ${String(summary.week.week).padStart(2, '0')}${summary.week.total ? ` / ${summary.week.total}` : ''}`) : 'Programme not set'}
              {summary.phase && <span className="text-faint"> · </span>}{summary.phase}
            </div>
          </div>

          {m && (
            <Tooltip side="bottom" content={<>Health {m.health}/100 — blends schedule performance (SPI {m.spi.toFixed(2)}), on-time ratio and progress. {m.progress}% earned vs {m.plannedToday}% planned.</>}>
              <Link href="/dashboard" className="hidden h-7 items-center gap-2 rounded-[7px] border border-line bg-raised/70 px-2.5 text-[11.5px] text-ink-2 transition hover:border-line-strong sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: toneColor[summary.health.tone] }} />
                {summary.health.label}
                {(m.plannedToday > 0 || m.progress > 0) && <span className="num text-faint">{m.health}</span>}
              </Link>
            </Tooltip>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button onClick={openPalette}
            className="hidden h-8 items-center gap-2 rounded-[8px] border border-line bg-raised/70 pl-2.5 pr-1.5 text-[12px] text-muted transition hover:border-line-strong hover:text-ink sm:inline-flex">
            <Search size={13} /> <span className="hidden lg:inline">Search or jump to…</span><span className="lg:hidden">Search</span>
            <Kbd className="ml-2">⌘K</Kbd>
          </button>
          <button onClick={openPalette} aria-label="Search" className="grid h-9 w-9 place-items-center rounded-[8px] text-ink-2 hover:bg-ink/[0.05] sm:hidden"><Search size={16} /></button>
          <Notifications />
          <button onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="grid h-9 w-9 place-items-center rounded-[8px] text-ink-2 transition hover:bg-ink/[0.05] hover:text-ink">
            <span className="relative block h-4 w-4">
              <Sun size={16} className={cn('absolute inset-0 transition-all duration-glide', theme === 'dark' ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0')} />
              <Moon size={16} className={cn('absolute inset-0 transition-all duration-glide', theme === 'dark' ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100')} />
            </span>
          </button>
          <UserMenu />
        </div>
      </header>
    </div>
  );
}

function Notifications() {
  const { summary, role } = useShell();
  const [unread, setUnread] = useState(false);
  const newest = summary.events[0]?.at;

  useEffect(() => {
    try { setUnread(!!newest && newest > (localStorage.getItem(SEEN_KEY) ?? '')); } catch {}
  }, [newest]);

  const markSeen = (open: boolean) => {
    if (!open || !newest) return;
    try { localStorage.setItem(SEEN_KEY, newest); } catch {}
    setUnread(false);
  };
  const approver = role !== 'contractor';

  return (
    <Popover onOpenChange={markSeen} className="w-[min(92vw,360px)]"
      trigger={({ toggle }) => (
        <button onClick={toggle} aria-label={`Notifications${unread ? ' (new)' : ''}`}
          className="relative grid h-9 w-9 place-items-center rounded-[8px] text-ink-2 transition hover:bg-ink/[0.05] hover:text-ink">
          <Bell size={16} />
          {unread && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-canvas" />}
        </button>
      )}>
      {close => (
        <div className="p-2">
          <div className="flex items-center justify-between px-2 pb-2 pt-1"><span className="eyebrow">Notifications</span></div>
          {(summary.awaitingDecision > 0 || summary.overdue > 0) && (
            <div className="mb-2 flex flex-col gap-1">
              {summary.awaitingDecision > 0 && (
                <Link onClick={close} href="/deliverables?status=awaiting" className="flex items-center gap-3 rounded-[8px] bg-warning/[0.08] px-3 py-2.5 text-[12.5px] text-ink hover:bg-warning/[0.13]">
                  <span className="num text-[15px] text-warning">{summary.awaitingDecision}</span>
                  <span className="flex-1">deliverable{summary.awaitingDecision === 1 ? '' : 's'} awaiting {approver ? 'a decision' : 'review'}</span>
                </Link>
              )}
              {summary.overdue > 0 && (
                <Link onClick={close} href="/deliverables?status=overdue" className="flex items-center gap-3 rounded-[8px] bg-critical/[0.07] px-3 py-2.5 text-[12.5px] text-ink hover:bg-critical/[0.12]">
                  <span className="num text-[15px] text-critical">{summary.overdue}</span>
                  <span className="flex-1">overdue deliverable{summary.overdue === 1 ? '' : 's'}</span>
                </Link>
              )}
            </div>
          )}
          <div className="eyebrow px-2 pb-1 pt-1 text-[9.5px] text-faint">Recent activity</div>
          <ul className="max-h-[320px] overflow-y-auto">
            {summary.events.map((e, i) => (
              <li key={i} className="flex gap-3 rounded-[8px] px-2 py-2 text-[12.5px] leading-snug">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
                <span className="flex-1 text-ink-2"><span className="text-ink">{e.actor_name ?? 'Someone'}</span> {e.verb} {e.subject_type}{e.subject_text ? <> “{e.subject_text}”</> : null}</span>
                <span suppressHydrationWarning className="num shrink-0 text-[10.5px] text-faint">{relTime(e.at)}</span>
              </li>
            ))}
            {summary.events.length === 0 && <li className="px-2 py-6 text-center text-[12.5px] text-muted">No recorded activity yet.</li>}
          </ul>
        </div>
      )}
    </Popover>
  );
}

function UserMenu() {
  const { email, role, openAssistant } = useShell();
  const router = useRouter();
  async function signOut() { await createClient().auth.signOut(); router.push('/login'); router.refresh(); }
  return (
    <Popover className="w-[240px]"
      trigger={({ toggle }) => (
        <button onClick={toggle} aria-label="Account menu" className="num ml-0.5 grid h-8 w-8 place-items-center rounded-full bg-ink/[0.07] text-[10.5px] text-ink-2 ring-1 ring-line transition hover:ring-line-strong">
          {email.slice(0, 2).toUpperCase()}
        </button>
      )}>
      {close => (
        <div className="p-1.5">
          <div className="px-2.5 py-2">
            <div className="truncate text-[12.5px] text-ink">{email}</div>
            <div className="eyebrow mt-0.5 text-[9.5px]">{role} · Villa Ajloun</div>
          </div>
          <div className="my-1 h-px bg-line" />
          <button onClick={() => { close(); openAssistant(); }} className="flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[12.5px] text-ink-2 hover:bg-ink/[0.05] hover:text-ink"><Sparkles size={14} /> Project assistant <Kbd className="ml-auto">⌘J</Kbd></button>
          {role === 'admin' && <Link onClick={close} href="/team" className="flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[12.5px] text-ink-2 hover:bg-ink/[0.05] hover:text-ink">Team &amp; access</Link>}
          <button onClick={signOut} className="flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[12.5px] text-critical hover:bg-critical/[0.07]"><LogOut size={14} /> Sign out</button>
        </div>
      )}
    </Popover>
  );
}
