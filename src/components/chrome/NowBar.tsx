'use client';
import { Bell, Command, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Pill } from '@/components/ui/Pill';

export function NowBar({ onOpenPalette }: { onOpenPalette?: () => void }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('va-theme')) as 'light' | 'dark' | null;
    if (saved) { setTheme(saved); document.documentElement.setAttribute('data-theme', saved); }
  }, []);
  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('va-theme', next); } catch {}
  }

  return (
    <header className="fixed top-3 left-1/2 z-50 -translate-x-1/2">
      <div className={cn(
        'glass rounded-full px-2 py-1.5 shadow-e3',
        'flex items-center gap-2 text-[12.5px] text-bark'
      )}>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-bark to-olive text-cream font-display text-[14px]">V</div>
        <span className="hidden sm:inline-flex items-center gap-2 px-1">
          <span className="font-medium">Villa Ajloun</span>
          <span className="text-stone">·</span>
          <span className="num">Week 28</span>
        </span>
        <Pill tone="olive" dot className="hidden md:inline-flex">Health 94</Pill>
        <button
          onClick={onOpenPalette}
          className="hairline flex items-center gap-1.5 rounded-full px-2.5 py-1 text-stone hover:text-bark transition"
          aria-label="Open command palette"
        >
          <Command size={12} />
          <span className="hidden sm:inline text-[11px]">Search</span>
          <kbd className="num hidden md:inline rounded bg-sand/40 px-1 py-0.5 text-[9.5px] text-stone">⌘K</kbd>
        </button>
        <button className="hairline relative flex h-7 w-7 items-center justify-center rounded-full text-stone hover:text-bark transition" aria-label="Notifications">
          <Bell size={13} />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-iron ring-2 ring-cream" />
        </button>
        <button onClick={toggle} className="hairline flex h-7 w-7 items-center justify-center rounded-full text-stone hover:text-bark transition" aria-label="Toggle theme">
          {theme === 'light' ? <Moon size={13} /> : <Sun size={13} />}
        </button>
      </div>
    </header>
  );
}
