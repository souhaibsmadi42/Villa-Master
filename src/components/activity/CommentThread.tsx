'use client';
import { useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { addComment } from '@/app/(app)/activities/actions';
import { relTime } from '@/lib/format';
import { PanelHeader } from '@/components/ui/Panel';
import { useToast } from '@/components/ui/Toast';
import { rowIn } from '@/motion/variants';

export type Comment = { id: string; body: string; created_at: string; author_name?: string | null; pending?: boolean };

export function CommentThread({ projectId, activityId, initial }: { projectId: string; activityId: string; initial: Comment[] }) {
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [body, setBody] = useState('');
  const [, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim(); if (!text) return;
    const tmp = `tmp-${Date.now()}`;
    setBody('');
    setItems(prev => [...prev, { id: tmp, body: text, created_at: new Date().toISOString(), author_name: 'You', pending: true }]);
    start(async () => {
      const r = await addComment({ projectId, subjectType: 'activity', subjectId: activityId, body: text });
      if (!r.ok) { setItems(prev => prev.filter(c => c.id !== tmp)); setBody(text); toast.error('Comment not posted', r.error); return; }
      setItems(prev => prev.map(c => (c.id === tmp ? { ...c, pending: false } : c)));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <PanelHeader label="Comments" meta={items.length} />
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map(c => (
            <motion.li key={c.id} variants={rowIn} initial="hidden" animate="show" className="rounded-card border border-line bg-raised/60 px-3.5 py-2.5">
              <div className="text-[13px] leading-relaxed text-ink-2">{c.body}</div>
              <div suppressHydrationWarning className="num mt-1 text-[10.5px] text-faint">{c.author_name ?? 'Team member'} · {c.pending ? 'posting…' : relTime(c.created_at)}</div>
            </motion.li>
          ))}
        </AnimatePresence>
        {items.length === 0 && <li className="text-[12.5px] text-faint">No comments yet — start the thread.</li>}
      </ul>
      <form onSubmit={submit} className="flex items-center gap-2 rounded-[10px] border border-line bg-raised p-1 pl-3 transition focus-within:border-accent/60">
        <input value={body} onChange={e => setBody(e.target.value)} placeholder="Write a comment…" aria-label="Write a comment"
          className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint" />
        <button type="submit" disabled={!body.trim()} aria-label="Post comment" className="grid h-8 w-8 place-items-center rounded-[8px] bg-primary text-on-primary transition active:scale-95 disabled:opacity-30"><ArrowUp size={14} /></button>
      </form>
    </div>
  );
}
