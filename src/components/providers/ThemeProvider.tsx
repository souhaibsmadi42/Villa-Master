'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({
  theme: 'light', setTheme: () => {}, toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, set] = useState<Theme>('light');

  // The boot script in <head> already applied the theme; adopt it after mount.
  useEffect(() => {
    set((document.documentElement.getAttribute('data-theme') as Theme) || 'light');
  }, []);

  const setTheme = useCallback((t: Theme) => {
    const root = document.documentElement;
    // Briefly disable transitions so every surface flips in the same frame.
    root.classList.add('[&_*]:!transition-none');
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('va-theme', t); } catch {}
    set(t);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('[&_*]:!transition-none')));
  }, []);

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  return <Ctx.Provider value={{ theme, setTheme, toggle }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
