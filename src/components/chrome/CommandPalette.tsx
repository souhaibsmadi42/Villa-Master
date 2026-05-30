'use client';
import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, LayoutDashboard, GanttChartSquare, Users, Files, Map, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  group: 'Navigate' | 'Project' | 'Actions';
  onSelect?: () => void;
};

const DEFAULT_ITEMS: Item[] = [
  { id: 'nav-dash',    label: 'Dashboard',       hint: 'Executive control center', icon: LayoutDashboard, group: 'Navigate' },
  { id: 'nav-tl',      label: 'Timeline',        hint: 'Full Gantt',                icon: GanttChartSquare, group: 'Navigate' },
  { id: 'nav-co',      label: 'Contractors',     hint: 'Roster + scorecards',       icon: Users, group: 'Navigate' },
  { id: 'nav-del',     label: 'Deliverables',    hint: 'Kanban × timeline',         icon: Files, group: 'Navigate' },
  { id: 'nav-site',    label: 'Site Viewer',     hint: 'BIM / massing',             icon: Map, group: 'Navigate' },
  { id: 'ai-ask',      label: 'Ask the Assistant…', hint: 'Claude, project-aware',  icon: Sparkles, group: 'Actions' },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const items = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return DEFAULT_ITEMS;
    return DEFAULT_ITEMS.filter(i =>
      i.label.toLowerCase().includes(t) || (i.hint ?? '').toLowerCase().includes(t)
    );
  }, [q]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[14vh] px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            className="relative w-full max-w-[640px] glass shadow-e4 rounded-panel overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--glass-stroke)]">
              <Search size={16} className="text-stone" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search anything in Villa Ajloun…"
                className="flex-1 bg-transparent outline-none text-[14px] text-ink placeholder:text-stone"
              />
              <kbd className="num text-[10px] text-stone hairline rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <div className="max-h-[52vh] overflow-y-auto py-2">
              {['Navigate', 'Project', 'Actions'].map(group => {
                const list = items.filter(i => i.group === group);
                if (list.length === 0) return null;
                return (
                  <div key={group} className="px-2 py-1.5">
                    <div className="px-3 py-1 eyebrow">{group}</div>
                    {list.map(it => (
                      <button
                        key={it.id}
                        onClick={() => { it.onSelect?.(); onClose(); }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-left',
                          'hover:bg-sand/40 transition'
                        )}
                      >
                        <it.icon size={15} className="text-stone" />
                        <span className="text-[13.5px] font-medium text-ink">{it.label}</span>
                        {it.hint && <span className="text-[11.5px] text-stone">— {it.hint}</span>}
                        <ArrowRight size={13} className="ml-auto text-stone opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="px-5 py-8 text-center text-stone text-[13px]">No matches. Try “delivery”, “KONN”, “week 28”.</div>
              )}
            </div>
            <div className="border-t border-[var(--glass-stroke)] px-4 py-2 flex items-center gap-3 text-[10.5px] text-stone num">
              <span className="hairline rounded px-1.5 py-0.5">↑↓</span> navigate
              <span className="hairline rounded px-1.5 py-0.5">↵</span> select
              <span className="hairline rounded px-1.5 py-0.5">⌘K</span> toggle
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
