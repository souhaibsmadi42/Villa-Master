'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

// Slide-in drawer used by the timeline's intercepting route.
export function Drawer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const close = () => router.back();

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, []);

  return (
    <motion.div className="fixed inset-0 z-[150]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={close} />
      <motion.aside
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
        className="absolute right-0 top-0 h-full w-full sm:w-[680px] bg-cream shadow-e5 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 glass border-b border-[var(--glass-stroke)]">
          <span className="text-[11px] tracking-eyebrow uppercase text-stone">Activity</span>
          <button onClick={close} className="text-stone hover:text-bark" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-6">{children}</div>
      </motion.aside>
    </motion.div>
  );
}
