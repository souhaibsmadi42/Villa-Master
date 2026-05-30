'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { AssistantPanel } from './AssistantPanel';
import { Magnet } from '@/components/ui/Magnet';

export function AssistantLauncher() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Magnet strength={0.18}>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI assistant"
          className="
            fixed bottom-6 right-6 z-40
            inline-flex items-center gap-2 rounded-full
            bg-bark text-cream px-4 py-3 shadow-e4
            hover:shadow-e5 transition-all duration-glide ease-glide
          "
        >
          <Sparkles size={15} className="text-brass" />
          <span className="text-[12.5px] font-semibold tracking-wide">Ask Villa</span>
        </button>
      </Magnet>

      <AnimatePresence>
        {open && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <div onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/30 backdrop-blur-sm" />
            <motion.aside
              key="panel"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ duration: 0.32, ease: [0.22, 0.61, 0.36, 1] }}
              className="absolute right-0 top-0 h-full w-full sm:w-[460px] glass shadow-e5"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-stroke)]">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-olive" />
                  <span className="font-display text-[18px] text-bark">Project Assistant</span>
                </div>
                <button onClick={() => setOpen(false)} className="text-stone hover:text-bark" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <AssistantPanel />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
