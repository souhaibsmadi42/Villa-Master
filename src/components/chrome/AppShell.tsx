'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { Role } from '@/lib/rbac';
import type { ShellSummary } from '@/lib/project-data';
import { Sidebar, MobileNav } from './Sidebar';
import { StatusBar } from './StatusBar';
import { CommandK } from './CommandK';
import { AssistantPanel } from '@/components/assistant/AssistantPanel';
import { AssistantLauncher } from '@/components/assistant/AssistantLauncher';

type ShellCtx = {
  role: Role;
  email: string;
  summary: ShellSummary;
  openPalette: () => void;
  openAssistant: (prompt?: string) => void;
};
const Ctx = createContext<ShellCtx | null>(null);
export const useShell = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useShell must be used inside <AppShell>');
  return c;
};
/** Safe variant for components that may also render outside the app shell. */
export const useOptionalShell = () => useContext(Ctx);

export function AppShell({ role, email, summary, children }: { role: Role; email: string; summary: ShellSummary; children: React.ReactNode }) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [assistant, setAssistant] = useState<{ open: boolean; prompt?: string; nonce: number }>({ open: false, nonce: 0 });

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const openAssistant = useCallback((prompt?: string) => setAssistant(a => ({ open: true, prompt, nonce: a.nonce + 1 })), []);

  // Global shortcuts: ⌘/Ctrl+K palette, ⌘/Ctrl+J assistant.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === 'k') { e.preventDefault(); setPaletteOpen(o => !o); }
      if (k === 'j') { e.preventDefault(); setAssistant(a => ({ ...a, open: !a.open, prompt: undefined })); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { setMobileNav(false); }, [pathname]);

  const ctx = useMemo(() => ({ role, email, summary, openPalette, openAssistant }), [role, email, summary, openPalette, openAssistant]);

  return (
    <Ctx.Provider value={ctx}>
      <div className="app-bg min-h-screen">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[500] focus:rounded-md focus:bg-raised focus:px-3 focus:py-2 focus:text-[13px] focus:shadow-e3">Skip to content</a>
        <Sidebar role={role} email={email} />
        <MobileNav open={mobileNav} onClose={() => setMobileNav(false)} role={role} email={email} />
        <div className="md:pl-[72px] lg:pl-[248px]">
          <StatusBar onMenu={() => setMobileNav(true)} />
          <main id="main" className="mx-auto w-full max-w-content px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pt-8">{children}</main>
        </div>
        <CommandK open={paletteOpen} onOpenChange={setPaletteOpen} />
        <AssistantLauncher />
        <AssistantPanel open={assistant.open} initialPrompt={assistant.prompt} promptNonce={assistant.nonce}
          onClose={() => setAssistant(a => ({ ...a, open: false, prompt: undefined }))} />
      </div>
    </Ctx.Provider>
  );
}
