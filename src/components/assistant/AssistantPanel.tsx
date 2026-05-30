'use client';
import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Pill } from '@/components/ui/Pill';

type Msg = { role: 'user' | 'assistant'; content: string };

const STARTERS = [
  'What is blocked this week?',
  'Draft an owner weekly update.',
  'Summarise KONN performance.',
  'Which decisions need me?',
];

export function AssistantPanel() {
  const [mode, setMode] = useState<'ask' | 'draft'>('ask');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const next: Msg[] = [...messages, { role: 'user', content: text.trim() }];
    setMessages(next);
    setDraft('');
    setStreaming(true);

    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next, mode }),
    });

    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      setMessages([...next, { role: 'assistant', content: `Error: ${err.message ?? res.statusText}` }]);
      setStreaming(false);
      return;
    }

    // Stream parse Server-Sent Events
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = '';
    let buf = '';
    setMessages([...next, { role: 'assistant', content: '' }]);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const chunks = buf.split('\n\n');
      buf = chunks.pop() ?? '';
      for (const chunk of chunks) {
        const lines = chunk.split('\n');
        const ev   = lines.find(l => l.startsWith('event:'))?.slice(7).trim();
        const data = lines.find(l => l.startsWith('data:'))?.slice(5).trim();
        if (!ev || !data) continue;
        try {
          const parsed = JSON.parse(data);
          if (ev === 'delta' && parsed.text) {
            acc += parsed.text;
            setMessages(prev => {
              const copy = prev.slice();
              copy[copy.length - 1] = { role: 'assistant', content: acc };
              return copy;
            });
          } else if (ev === 'error') {
            acc += `\n\n[error: ${parsed.error}]`;
          }
        } catch { /* ignore */ }
      }
    }
    setStreaming(false);
  }

  return (
    <div className="flex h-[calc(100%-57px)] flex-col">
      {/* Mode toggle */}
      <div className="px-5 pt-3 flex items-center gap-2">
        <button
          onClick={() => setMode('ask')}
          className={cn('rounded-full px-3 py-1 text-[11.5px] font-semibold tracking-wide',
            mode === 'ask' ? 'bg-bark text-cream' : 'text-stone hairline')}
        >Ask</button>
        <button
          onClick={() => setMode('draft')}
          className={cn('rounded-full px-3 py-1 text-[11.5px] font-semibold tracking-wide',
            mode === 'draft' ? 'bg-bark text-cream' : 'text-stone hairline')}
        >Draft</button>
        <span className="ml-auto"><Pill tone="olive" dot>Claude</Pill></span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-stone text-[13px] leading-relaxed">
              Project-aware assistant. Ask about contractors, deliverables, or decisions.
              Switch to <em>Draft</em> mode to generate owner updates and RFI replies.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map(s => (
                <button key={s} onClick={() => send(s)} className="hairline rounded-full px-3 py-1.5 text-[11.5px] text-bark hover:bg-sand/40 transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap',
              m.role === 'user'
                ? 'bg-bark text-cream'
                : 'glass text-ink'
            )}>
              {m.content || (streaming && i === messages.length - 1 ? <Cursor /> : '')}
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(draft); }}
        className="border-t border-[var(--glass-stroke)] px-3 py-3 flex items-end gap-2"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); }
          }}
          rows={1}
          placeholder={mode === 'ask' ? 'Ask about the project…' : 'What should I draft?'}
          className="flex-1 resize-none rounded-2xl bg-cream/60 hairline px-3 py-2.5 text-[13px] text-ink outline-none focus:bg-cream"
        />
        <button
          type="submit"
          disabled={streaming || !draft.trim()}
          className="rounded-full bg-bark text-cream h-9 w-9 flex items-center justify-center disabled:opacity-40"
          aria-label="Send"
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}

function Cursor() {
  return (
    <span className="inline-block h-3.5 w-1.5 align-middle bg-bark animate-pulse" />
  );
}
