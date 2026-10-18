'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { popIn } from '@/motion/variants';
import { cn } from '@/lib/cn';

/** Click-triggered popover. Closes on outside click, Escape, or when `close()` is called by content. */
export function Popover({ trigger, children, align = 'right', className, onOpenChange }: {
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const set = (v: boolean) => { setOpen(v); onOpenChange?.(v); };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) set(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') set(false); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => set(!open) })}
      <AnimatePresence>
        {open && (
          <motion.div variants={popIn} initial="hidden" animate="show" exit="exit"
            className={cn('absolute top-full z-[120] mt-2 origin-top rounded-panel border border-line bg-raised shadow-e4',
              align === 'right' ? 'right-0' : 'left-0', className)}>
            {children(() => set(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
