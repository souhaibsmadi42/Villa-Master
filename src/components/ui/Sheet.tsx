'use client';
import { useMounted } from '@/lib/use-mounted';
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { drawerIn, scrim } from '@/motion/variants';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  width?: string;
  children: ReactNode;
  /** Accessible name when `title` is not plain text. */
  label?: string;
  bodyClassName?: string;
};

/**
 * Right-hand sheet with dimmed, blurred backdrop. Escape and backdrop click close it;
 * on touch it can be swiped right to dismiss. Focus moves in on open and returns on close.
 */
export function Sheet({ open, onClose, title, eyebrow, actions, width = 'sm:w-[560px]', children, label, bodyClassName }: Props) {
  const mounted = useMounted();
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useDragControls();
  // Callers often pass inline handlers; keep the latest without re-running the open effect.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); } };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => panelRef.current?.focus());
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [open]);

  const onDragEnd = (_: unknown, info: PanInfo) => { if (info.offset.x > 120 || info.velocity.x > 600) onClose(); };

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150]">
          <motion.div variants={scrim} initial="hidden" animate="show" exit="exit"
            className="absolute inset-0 backdrop-blur-[3px]" style={{ background: 'var(--scrim)' }} onClick={onClose} />
          <motion.aside
            ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label ?? (typeof title === 'string' ? title : undefined)}
            variants={drawerIn} initial="hidden" animate="show" exit="exit"
            drag="x" dragListener={false} dragControls={drag} dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0, right: 0.6 }} onDragEnd={onDragEnd}
            className={cn('absolute right-0 top-0 flex h-full w-full flex-col bg-canvas shadow-e5 outline-none sm:border-l sm:border-line', width)}>
            <header className="flex items-center gap-3 border-b border-line px-5 py-3.5 sm:px-6"
              onPointerDown={e => { if (e.pointerType === 'touch') drag.start(e); }}>
              <div className="min-w-0 flex-1">
                {eyebrow && <div className="eyebrow mb-0.5">{eyebrow}</div>}
                {title && <div className="truncate text-[15px] font-medium text-ink">{title}</div>}
              </div>
              {actions}
              <IconButton label="Close" onClick={onClose}><X size={17} /></IconButton>
            </header>
            <motion.div className={cn('flex-1 overflow-y-auto overscroll-contain', bodyClassName ?? 'p-5 sm:p-6')}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.12, duration: 0.36 } }}>
              {children}
            </motion.div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
