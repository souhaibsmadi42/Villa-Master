'use client';
import { useState, useTransition } from 'react';
import { addComment } from '@/app/(app)/activities/actions';

export type Comment = { id: string; body: string; created_at: string; author_name?: string | null };

export function CommentThread({ projectId, activityId, initial }: { projectId: string; activityId: string; initial: Comment[] }) {
  const [items, setItems] = useState(initial);
  const [body, setBody] = useState('');
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim(); if (!text) return;
    setBody('');
    setItems(prev => [...prev, { id: `tmp-${Date.now()}`, body: text, created_at: new Date().toISOString(), author_name: 'You' }]);
    start(async () => { await addComment({ projectId, subjectType: 'activity', subjectId: activityId, body: text }); });
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="eyebrow">Comments · {items.length}</span>
      <div className="flex flex-col gap-2">
        {items.map(c => (
          <div key={c.id} className="rounded-card bg-surface-2 border border-border px-3 py-2">
            <div className="text-[12.5px] text-text-2">{c.body}</div>
            <div className="num text-[10px] text-stone mt-1">{c.author_name ?? 'Someone'} · {new Date(c.created_at).toLocaleString()}</div>
          </div>
        ))}
        {items.length === 0 && <p className="text-stone text-[12.5px] italic">No comments yet.</p>}
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <input value={body} onChange={e => setBody(e.target.value)} placeholder="Write a comment…"
          className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-[13px] outline-none focus:border-olive" />
        <button disabled={pending} className="rounded-xl bg-bark text-cream px-4 text-[12.5px] font-semibold disabled:opacity-50">Post</button>
      </form>
    </div>
  );
}
