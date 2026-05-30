'use client';
import { useEffect } from 'react';

/**
 * Tiny keyboard shortcuts hook.
 * Keys use the format: `mod+k`, `shift+/`, `esc`, `alt+a`.
 * `mod` = Cmd on macOS, Ctrl elsewhere.
 */
export function useGlobalShortcuts(map: Record<string, () => void>) {
  useEffect(() => {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
    function onKey(e: KeyboardEvent) {
      const tokens: string[] = [];
      if (e.metaKey || e.ctrlKey) tokens.push('mod');
      if (e.shiftKey) tokens.push('shift');
      if (e.altKey)   tokens.push('alt');
      const key = e.key.toLowerCase();
      if (!['meta','control','shift','alt'].includes(key)) tokens.push(key === ' ' ? 'space' : key);
      const combo = tokens.join('+');
      const handler = map[combo];
      if (handler) { e.preventDefault(); handler(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(Object.keys(map))]);
}
