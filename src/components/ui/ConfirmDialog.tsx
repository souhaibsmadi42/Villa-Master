'use client';
import { useMounted } from '@/lib/use-mounted';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { popIn, scrim } from '@/motion/variants';
import { Button } from './Button';

type Opts = { title: string; body?: string; confirmLabel?: string; danger?: boolean };

/**
 * Promise-based confirmation for destructive actions:
 *   const [confirm, dialog] = useConfirm();  …  if (await confirm({ title })) …
 */
export function useConfirm() {
  const [state, setState] = useState<(Opts & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback((o: Opts) => new Promise<boolean>(resolve => setState({ ...o, resolve })), []);
  const close = (v: boolean) => { state?.resolve(v); setState(null); };
  const dialog = <ConfirmDialog state={state} onClose={close} />;
  return [confirm, dialog] as const;
}

function ConfirmDialog({ state, onClose }: { state: (Opts & { resolve: (v: boolean) => void }) | null; onClose: (v: boolean) => void }) {
  const mounted = useMounted();
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!state) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(false); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [state, onClose]);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {state && (
        <div className="fixed inset-0 z-[250] grid place-items-center p-4">
          <motion.div variants={scrim} initial="hidden" animate="show" exit="exit" className="absolute inset-0 backdrop-blur-[3px]"
            style={{ background: 'var(--scrim)' }} onClick={() => onClose(false)} />
          <motion.div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" variants={popIn} initial="hidden" animate="show" exit="exit"
            className="relative w-full max-w-[400px] rounded-panel border border-line bg-raised p-6 shadow-e5">
            <h2 id="confirm-title" className="text-[15px] font-medium text-ink">{state.title}</h2>
            {state.body && <p className="mt-2 text-[13px] leading-relaxed text-muted">{state.body}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <Button ref={cancelRef} size="sm" variant="ghost" onClick={() => onClose(false)}>Cancel</Button>
              <Button size="sm" variant={state.danger ? 'danger' : 'primary'} onClick={() => onClose(true)}>{state.confirmLabel ?? 'Confirm'}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
