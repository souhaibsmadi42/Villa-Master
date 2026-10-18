'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Check, AlertTriangle, Info, X } from 'lucide-react';
import { spring } from '@/motion/tokens';
import { cn } from '@/lib/cn';

type Kind = 'success' | 'error' | 'info';
type Toast = { id: number; kind: Kind; title: string; body?: string };
type Api = { toast: (t: Omit<Toast, 'id'>) => void; success: (title: string, body?: string) => void; error: (title: string, body?: string) => void };

const Ctx = createContext<Api | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);
  const dismiss = useCallback((id: number) => setItems(p => p.filter(t => t.id !== id)), []);
  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = ++seq.current;
    setItems(p => [...p.slice(-3), { ...t, id }]);
    setTimeout(() => dismiss(id), t.kind === 'error' ? 7000 : 3800);
  }, [dismiss]);
  const api = useMemo<Api>(() => ({
    toast,
    success: (title, body) => toast({ kind: 'success', title, body }),
    error: (title, body) => toast({ kind: 'error', title, body }),
  }), [toast]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-1/2 z-[300] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2 sm:bottom-6 sm:left-6 sm:translate-x-0">
        <AnimatePresence initial={false}>
          {items.map(t => {
            const Icon = t.kind === 'success' ? Check : t.kind === 'error' ? AlertTriangle : Info;
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1, transition: spring.panel }}
                exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
                role={t.kind === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex items-start gap-3 rounded-card border border-line bg-raised p-3.5 pr-2 shadow-e4">
                <span className={cn('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full',
                  t.kind === 'success' && 'bg-success/15 text-success', t.kind === 'error' && 'bg-critical/15 text-critical', t.kind === 'info' && 'bg-info/15 text-info')}>
                  <Icon size={12} strokeWidth={2.4} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-ink">{t.title}</div>
                  {t.body && <div className="mt-0.5 text-[12px] leading-snug text-muted">{t.body}</div>}
                </div>
                <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="rounded p-1 text-faint hover:text-ink"><X size={13} /></button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
