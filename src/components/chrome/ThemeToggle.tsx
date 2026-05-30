'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ floating = false }: { floating?: boolean }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const t = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
    setTheme(t);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('va-theme', next); } catch {}
  }

  const base =
    'inline-flex items-center justify-center h-9 w-9 rounded-full transition-all duration-200 ' +
    'border border-[var(--glass-stroke)] text-stone hover:text-ink hover:bg-sand/40';

  if (floating) {
    return (
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="fixed bottom-5 left-5 z-50 h-11 w-11 rounded-full glass shadow-e3 flex items-center justify-center text-bark hover:scale-105 transition"
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    );
  }

  return (
    <button onClick={toggle} aria-label="Toggle theme" className={base}>
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
