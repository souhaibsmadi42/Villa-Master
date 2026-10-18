'use client';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IndeterminateBar } from '@/components/ui/Spinner';

/**
 * On-demand "editor's note" from /api/insight. Generated only when asked
 * (no silent API spend) and labelled by source: Claude, or computed from live data.
 */
export function InsightNote() {
  const [state, setState] = useState<{ kind: 'idle' | 'loading' | 'done' | 'error'; text?: string; ai?: boolean; notice?: string }>({ kind: 'idle' });

  async function run() {
    setState({ kind: 'loading' });
    try {
      const r = await fetch('/api/insight');
      const d = await r.json();
      if (!r.ok || !d.paragraph) return setState({ kind: 'error', text: d.message ?? 'The note could not be written.' });
      setState({ kind: 'done', text: d.paragraph, ai: !!d.generated, notice: d.notice });
    } catch { setState({ kind: 'error', text: 'Network error.' }); }
  }

  return (
    <div className="rounded-card border border-line bg-raised/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow flex items-center gap-2"><Sparkles size={11} className="text-accent" /> Editor’s note</span>
        {state.kind === 'done' && <button onClick={run} className="flex items-center gap-1 text-[11px] text-faint hover:text-ink"><RotateCcw size={11} /> Rewrite</button>}
      </div>
      <AnimatePresence mode="wait">
        {state.kind === 'idle' && (
          <motion.div key="idle" exit={{ opacity: 0 }} className="mt-3 flex flex-col gap-3">
            <p className="text-[12.5px] leading-relaxed text-muted">A short dispatch from today’s project data — written by Claude when AI is connected.</p>
            <Button size="xs" onClick={run} className="self-start">Write today’s note</Button>
          </motion.div>
        )}
        {state.kind === 'loading' && (
          <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 flex flex-col gap-2">
            <span className="text-[12px] text-muted">Reading live project data…</span>
            <IndeterminateBar />
          </motion.div>
        )}
        {state.kind === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <p className="display mt-3 text-[19px] leading-[1.35] text-ink">{state.text}</p>
            <p className="mt-2 text-[10.5px] text-faint">{state.ai ? 'Written by Claude from live data · verify before acting' : state.notice ? `Computed from live data · ${state.notice}` : 'Computed from live data · AI not connected'}</p>
          </motion.div>
        )}
        {state.kind === 'error' && (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center gap-3 text-[12.5px] text-critical">
            {state.text} <Button size="xs" variant="ghost" onClick={run}>Retry</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
