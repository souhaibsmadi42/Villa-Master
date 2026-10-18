'use client';
import { useMounted } from '@/lib/use-mounted';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CornerDownLeft, Clock, Moon, Sun, Sparkles, FileText, HardHat, FileCheck2, Activity as ActivityIcon, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { popIn, scrim } from '@/motion/variants';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Kbd } from '@/components/ui/Controls';
import { Spinner } from '@/components/ui/Spinner';
import { navFor } from './nav';
import { useShell } from './AppShell';

type SearchItem = { type: string; label: string; href: string; sub?: string };
type Cmd = { id: string; group: string; label: string; hint?: string; icon: LucideIcon; run: () => void; keywords?: string };

const RECENT_KEY = 'vm-recent';
const PLURAL: Record<string, string> = { Activity: 'Activities', Contractor: 'Contractors', Document: 'Documents', Deliverable: 'Deliverables' };
const TYPE_ICON: Record<string, LucideIcon> = { Activity: ActivityIcon, Contractor: HardHat, Document: FileText, Deliverable: FileCheck2 };

function readRecent(): SearchItem[] { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; } }
function pushRecent(i: SearchItem) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([i, ...readRecent().filter(r => r.href !== i.href)].slice(0, 5))); } catch {}
}

export function CommandK({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const mounted = useMounted();
  const router = useRouter();
  const { role, openAssistant } = useShell();
  const { theme, toggle } = useTheme();
  const [q, setQ] = useState('');
  const [index, setIndex] = useState<SearchItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [recent, setRecent] = useState<SearchItem[]>([]);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const close = () => onOpenChange(false);

  // Reset on open only — the index arriving later must not clear what was typed.
  useEffect(() => {
    if (!open) return;
    setQ(''); setActive(0); setRecent(readRecent());
  }, [open]);
  useEffect(() => {
    if (!open || index !== null) return;
    fetch('/api/search').then(r => (r.ok ? r.json() : Promise.reject())).then(d => setIndex(d.items ?? [])).catch(() => { setIndex([]); setLoadError(true); });
  }, [open, index]);

  const go = (i: SearchItem) => { pushRecent(i); close(); router.push(i.href); };

  const commands = useMemo<Cmd[]>(() => {
    const t = q.trim().toLowerCase();
    const match = (s: string) => !t || s.toLowerCase().includes(t);
    const out: Cmd[] = [];
    if (!t) recent.forEach(r => out.push({ id: `r-${r.href}`, group: 'Recent', label: r.label, hint: r.type, icon: Clock, run: () => go(r) }));
    navFor(role).forEach(g => g.items.forEach(n => {
      if (match(n.label) || match(n.hint)) out.push({ id: `n-${n.href}`, group: 'Navigate', label: n.label, hint: n.hint, icon: n.icon, run: () => go({ type: 'Page', label: n.label, href: n.href }) });
    }));
    const actions: Cmd[] = [
      { id: 'a-ask', group: 'Actions', label: t ? `Ask the assistant: “${q.trim()}”` : 'Ask the project assistant', hint: '⌘J', icon: Sparkles, keywords: 'ai claude ask', run: () => { close(); openAssistant(t ? q.trim() : undefined); } },
      { id: 'a-theme', group: 'Actions', label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme', icon: theme === 'dark' ? Sun : Moon, keywords: 'theme dark light mode', run: () => { toggle(); close(); } },
    ];
    actions.forEach(a => { if (a.id === 'a-ask' || match(a.label) || match(a.keywords ?? '')) out.push(a); });
    if (t && index) {
      index.filter(i => i.label.toLowerCase().includes(t) || i.type.toLowerCase().includes(t) || (i.sub ?? '').toLowerCase().includes(t))
        .slice(0, 30)
        .forEach((i, k) => out.push({ id: `s-${k}-${i.href}`, group: PLURAL[i.type] ?? i.type, label: i.label, hint: i.sub, icon: TYPE_ICON[i.type] ?? FileText, run: () => go(i) }));
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, index, recent, role, theme]);

  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const groups = useMemo(() => {
    const m = new Map<string, { c: Cmd; i: number }[]>();
    commands.forEach((c, i) => { if (!m.has(c.group)) m.set(c.group, []); m.get(c.group)!.push({ c, i }); });
    return [...m.entries()];
  }, [commands]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, commands.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && commands[active]) { e.preventDefault(); commands[active].run(); }
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  }

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center px-3 pt-[12vh]">
          <motion.div variants={scrim} initial="hidden" animate="show" exit="exit" className="absolute inset-0 backdrop-blur-[3px]" style={{ background: 'var(--scrim)' }} onClick={close} />
          <motion.div role="dialog" aria-modal="true" aria-label="Command palette" variants={popIn} initial="hidden" animate="show" exit="exit"
            className="relative w-full max-w-[640px] overflow-hidden rounded-panel border border-line bg-raised shadow-e5">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={16} className="shrink-0 text-muted" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey}
                role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-activedescendant={commands[active] ? `cmd-${active}` : undefined}
                placeholder="Search activities, contractors, documents — or jump to…"
                className="h-14 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-faint" />
              {q && index === null && <Spinner className="text-muted" />}
              <Kbd>esc</Kbd>
            </div>
            <div ref={listRef} id="cmdk-list" role="listbox" className="max-h-[min(60vh,440px)] overflow-y-auto p-2">
              {groups.map(([group, items]) => (
                <div key={group} className="mb-1">
                  <div className="eyebrow px-2.5 pb-1 pt-2 text-[9.5px] text-faint">{group}</div>
                  {items.map(({ c, i }) => (
                    <button key={c.id} id={`cmd-${i}`} data-idx={i} role="option" aria-selected={i === active}
                      onMouseMove={() => setActive(i)} onClick={c.run}
                      className={cn('relative flex w-full items-center gap-3 rounded-[8px] px-2.5 py-2 text-left transition-colors duration-tap',
                        i === active ? 'bg-ink/[0.06]' : '')}>
                      <c.icon size={15} strokeWidth={1.6} className={cn('shrink-0', i === active ? 'text-ink' : 'text-muted')} />
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{c.label}</span>
                      {c.hint && <span className="hidden max-w-[40%] truncate text-[11.5px] text-faint sm:inline">{c.hint}</span>}
                      {i === active && <CornerDownLeft size={13} className="shrink-0 text-muted" />}
                    </button>
                  ))}
                </div>
              ))}
              {commands.length === 0 && <div className="px-4 py-10 text-center text-[13px] text-muted">No matches for “{q}”.</div>}
              {loadError && q && <div className="px-3 py-2 text-[11.5px] text-faint">Project search is unavailable right now — navigation still works.</div>}
            </div>
            <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-faint">
              <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
              <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> open</span>
              <span className="ml-auto flex items-center gap-1.5"><Kbd>⌘K</Kbd> / <Kbd>Ctrl K</Kbd></span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
