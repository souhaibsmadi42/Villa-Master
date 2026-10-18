'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTheme } from '@/components/providers/ThemeProvider';

/** Landing top bar: transparent over the dark hero, glass once the reader scrolls past it. */
export function LandingNav() {
  const { theme, toggle } = useTheme();
  const [past, setPast] = useState(false);
  useEffect(() => {
    const on = () => setPast(window.scrollY > window.innerHeight * 0.82);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header className="anim-fade fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6" style={{ animationDelay: 'calc(var(--intro-delay) + .2s)' }}>
      <div className={cn('mx-auto flex h-14 max-w-[1440px] items-center gap-3 rounded-[12px] border px-3 transition-[background-color,border-color,color,box-shadow] duration-glide sm:px-5',
        past ? 'glass text-ink shadow-e3' : 'border-transparent text-chalk')}>
        <Link href="/" className="display text-[20px] leading-none">Villa <em className={cn('italic', past ? 'text-accent' : 'text-bronze')}>Master</em></Link>
        <nav className="ml-8 hidden items-center gap-6 text-[13px] md:flex" aria-label="Sections">
          {[['#project', 'Project'], ['#programme', 'Programme'], ['#trades', 'Trades'], ['#platform', 'Platform']].map(([h, l]) => (
            <a key={h} href={h} className={cn('transition', past ? 'text-muted hover:text-ink' : 'text-chalk/70 hover:text-chalk')}>{l}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className={cn('grid h-9 w-9 place-items-center rounded-[8px] transition', past ? 'text-muted hover:bg-ink/[0.05] hover:text-ink' : 'text-chalk/75 hover:bg-chalk/10 hover:text-chalk')}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link href="/login" className={cn('inline-flex h-9 items-center rounded-[8px] px-4 text-[13px] font-medium transition',
            past ? 'bg-primary text-on-primary hover:bg-primary/90' : 'bg-chalk text-obsidian hover:bg-limestone')}>
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
