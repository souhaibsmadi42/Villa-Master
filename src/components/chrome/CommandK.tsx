'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CornerDownLeft } from 'lucide-react';

type Item = { type: string; label: string; href: string };

const NAV: Item[] = [
  { type: 'Go', label: 'Dashboard', href: '/dashboard' },
  { type: 'Go', label: 'Timeline', href: '/timeline' },
  { type: 'Go', label: 'Project Map', href: '/map' },
  { type: 'Go', label: 'Milestones', href: '/milestones' },
  { type: 'Go', label: 'Documents', href: '/documents' },
  { type: 'Go', label: 'Reports', href: '/reports' },
  { type: 'Go', label: 'Owner portal', href: '/owner' },
];

export function CommandK() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [index, setIndex] = useState<Item[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o); }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open && index.length === 0) {
      fetch('/api/search').then(r => r.json()).then(d => setIndex(d.items ?? [])).catch(() => {});
    }
    if (open) { setQ(''); setActive(0); }
  }, [open]);

  const results = useMemo(() => {
    const all = [...NAV, ...index];
    const t = q.trim().toLowerCase();
    const list = t ? all.filter(i => i.label.toLowerCase().includes(t) || i.type.toLowerCase().includes(t)) : NAV;
    return list.slice(0, 40);
  }, [q, index]);

  function go(i: Item) { setOpen(false); router.push(i.href); }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[200] flex items-start justify-center pt-[14vh] px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }} className="relative w-full max-w-[620px] glass rounded-panel shadow-e4 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--glass-stroke)]">
              <Search size={16} className="text-stone" />
              <input autoFocus value={q} onChange={e => { setQ(e.target.value); setActive(0); }}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
                  if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
                  if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active]); }
                }}
                placeholder="Search activities, contractors, documents…"
                className="flex-1 bg-transparent outline-none text-[14px] text-ink placeholder:text-stone" />
              <kbd className="num text-[10px] text-stone hairline rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <div className="max-h-[55vh] overflow-y-auto py-2">
              {results.map((r, i) => (
                <button key={i} onMouseEnter={() => setActive(i)} onClick={() => go(r)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${i === active ? 'bg-sand/50' : ''}`}>
                  <span className="text-[9.5px] tracking-eyebrow uppercase text-stone w-20 shrink-0">{r.type}</span>
                  <span className="text-[13.5px] text-ink flex-1 truncate">{r.label}</span>
                  {i === active && <CornerDownLeft size={13} className="text-stone" />}
                </button>
              ))}
              {results.length === 0 && <div className="px-5 py-8 text-center text-stone text-[13px] italic">No matches.</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
