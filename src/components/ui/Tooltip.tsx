'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { cloneElement, isValidElement, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Lightweight tooltip: opens after a short delay on hover, immediately on keyboard focus.
 * The child must accept ref-less event props (any DOM element or component that forwards them).
 */
export function Tooltip({ content, children, side = 'top', delay = 350, className }: {
  content: ReactNode; children: ReactElement; side?: 'top' | 'bottom' | 'right'; delay?: number; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>();
  const id = useId();
  if (!isValidElement(children)) return children;

  const show = (now = false) => { clearTimeout(t.current); t.current = setTimeout(() => setOpen(true), now ? 0 : delay); };
  const hide = () => { clearTimeout(t.current); setOpen(false); };
  const pos = side === 'top' ? 'bottom-full left-1/2 mb-2 -translate-x-1/2' : side === 'bottom' ? 'top-full left-1/2 mt-2 -translate-x-1/2' : 'left-full top-1/2 ml-2 -translate-y-1/2';

  const child = children as ReactElement<Record<string, unknown>>;
  return (
    <span className="relative inline-flex">
      {cloneElement(child, {
        'aria-describedby': open ? id : undefined,
        onMouseEnter: () => show(), onMouseLeave: hide, onFocus: () => show(true), onBlur: hide,
      })}
      <AnimatePresence>
        {open && (
          <motion.span role="tooltip" id={id}
            initial={{ opacity: 0, y: side === 'top' ? 3 : -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.14 }}
            className={cn('pointer-events-none absolute z-[400] w-max max-w-[260px] rounded-[7px] bg-obsidian px-2.5 py-1.5 text-[11.5px] leading-snug text-chalk shadow-e3 dark:bg-limestone dark:text-obsidian', pos, className)}>
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
