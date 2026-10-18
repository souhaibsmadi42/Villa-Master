'use client';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Copy, Check, RotateCcw, Square, Sparkles, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { spring } from '@/motion/tokens';
import { rowIn } from '@/motion/variants';
import { Segmented } from '@/components/ui/Controls';
import { IndeterminateBar } from '@/components/ui/Spinner';
import { useShell } from '@/components/chrome/AppShell';
import { RichText } from './RichText';

type Msg = { role: 'user' | 'assistant'; content: string; error?: boolean };
type Phase = 'idle' | 'connecting' | 'streaming';
type Grounding = { activities: number; deliverables: number; milestones: number; generatedAt: string };

export function AssistantPanel({ open, onClose, initialPrompt, promptNonce }: {
  open: boolean; onClose: () => void; initialPrompt?: string; promptNonce: number;
}) {
  const { summary } = useShell();
  const [mode, setMode] = useState<'ask' | 'draft'>('ask');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [grounding, setGrounding] = useState<Grounding | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Suggested questions derived from the live summary — only those the data supports.
  const starters = useMemo(() => {
    const s: { q: string; mode: 'ask' | 'draft' }[] = [];
    const m = summary.metrics;
    if (m && m.delayed > 0) s.push({ q: `Which ${m.delayed === 1 ? 'activity is' : `${m.delayed} activities are`} delayed, and what do they hold up?`, mode: 'ask' });
    else if (m) s.push({ q: 'Which activities are furthest behind plan?', mode: 'ask' });
    if (summary.awaitingDecision > 0) s.push({ q: `Summarise the ${summary.awaitingDecision} deliverable${summary.awaitingDecision === 1 ? '' : 's'} awaiting a decision.`, mode: 'ask' });
    if (summary.overdue > 0) s.push({ q: `What is overdue, and who owns each item?`, mode: 'ask' });
    s.push({ q: 'Are we on track for the next milestone?', mode: 'ask' });
    s.push({ q: "Draft this week's owner update.", mode: 'draft' });
    return s.slice(0, 5);
  }, [summary]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: phase === 'streaming' ? 'auto' : 'smooth' });
  }, [messages, phase]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 250);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  const send = useCallback(async (text: string, history: Msg[], sendMode = mode) => {
    if (!text.trim() || abortRef.current) return;
    const next: Msg[] = [...history, { role: 'user', content: text.trim() }];
    setMessages(next); setDraft(''); setPhase('connecting');
    const ctrl = new AbortController(); abortRef.current = ctrl;

    const fail = (content: string) => setMessages([...next, { role: 'assistant', content, error: true }]);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ messages: next.filter(m => !m.error).map(({ role, content }) => ({ role, content })), mode: sendMode }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        fail(err.message ?? `The assistant could not respond (${res.status}).`);
        return;
      }
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      let acc = '', buf = '', errored = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split('\n\n'); buf = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const ev = chunk.split('\n').find(l => l.startsWith('event:'))?.slice(6).trim();
          const data = chunk.split('\n').find(l => l.startsWith('data:'))?.slice(5).trim();
          if (!ev || !data) continue;
          let parsed: Record<string, unknown>; try { parsed = JSON.parse(data); } catch { continue; }
          if (ev === 'context') setGrounding(parsed as unknown as Grounding);
          if (ev === 'delta' && typeof parsed.text === 'string') {
            acc += parsed.text; setPhase('streaming');
            setMessages([...next, { role: 'assistant', content: acc }]);
          }
          if (ev === 'error') {
            errored = true;
            const notice: Msg = { role: 'assistant', content: `${acc ? 'The answer was interrupted: ' : ''}${String(parsed.error)}`, error: true };
            setMessages(acc ? [...next, { role: 'assistant', content: acc }, notice] : [...next, notice]);
          }
        }
      }
      if (!acc && !errored) fail('The assistant returned an empty answer. Try rephrasing.');
    } catch (e) {
      // A user-initiated stop keeps whatever was already streamed.
      if ((e as Error).name !== 'AbortError') fail('Network error — check your connection and retry.');
    } finally {
      abortRef.current = null; setPhase('idle');
    }
  }, [mode]);

  // A prompt passed in from elsewhere (palette, dashboard) is sent on open.
  useEffect(() => {
    if (open && initialPrompt) send(initialPrompt, messages, /draft/i.test(initialPrompt) ? 'draft' : mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptNonce]);

  const stop = () => abortRef.current?.abort();
  const retry = () => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    const idx = messages.lastIndexOf(lastUser);
    send(lastUser.content, messages.slice(0, idx));
  };
  const busy = phase !== 'idle';

  return (
    <AnimatePresence>
      {open && (
        <motion.aside role="dialog" aria-label="Project assistant"
          initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1, transition: spring.panel }} exit={{ x: 40, opacity: 0, transition: { duration: 0.2 } }}
          className="fixed inset-0 z-[140] flex flex-col bg-canvas sm:inset-y-3 sm:left-auto sm:right-3 sm:w-[440px] sm:rounded-hero sm:border sm:border-line sm:shadow-e5">
          {/* Header */}
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="relative grid h-8 w-8 place-items-center rounded-[9px] bg-primary text-on-primary">
              <Sparkles size={14} />
              {busy && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-bronze" style={{ animation: 'vm-pulse-ring 1.4s infinite' }} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium leading-tight text-ink">Project assistant</div>
              <div className="num truncate text-[10.5px] text-muted">
                {phase === 'connecting' ? 'Reading live project data…' : phase === 'streaming' ? 'Writing…' : 'Claude · grounded in live project data'}
              </div>
            </div>
            {messages.length > 0 && !busy && (
              <button onClick={() => { setMessages([]); setGrounding(null); }} aria-label="Clear conversation" title="Clear conversation"
                className="grid h-8 w-8 place-items-center rounded-[8px] text-muted hover:bg-ink/[0.05] hover:text-ink"><Trash2 size={14} /></button>
            )}
            <button onClick={onClose} aria-label="Close assistant" className="grid h-8 w-8 place-items-center rounded-[8px] text-muted hover:bg-ink/[0.05] hover:text-ink"><X size={16} /></button>
          </header>
          {phase === 'connecting' && <IndeterminateBar className="rounded-none" />}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5" aria-live="polite">
            {messages.length === 0 ? (
              <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }} className="flex flex-col gap-5">
                <motion.div variants={rowIn}>
                  <div className="display text-[30px] leading-[1.05] text-ink">Ask about the <em className="italic text-accent">programme</em>, the people, the decisions.</div>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                    Answers are written by Claude from the project data you can see, read at the moment you ask.
                    Recommendations are marked as suggestions — verify before acting.
                  </p>
                </motion.div>
                <motion.div variants={rowIn} className="flex flex-col gap-1.5">
                  <span className="eyebrow mb-1">Suggested from current data</span>
                  {starters.map(s => (
                    <motion.button variants={rowIn} key={s.q} onClick={() => { setMode(s.mode); send(s.q, [], s.mode); }}
                      className="group flex items-center gap-3 rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-left text-[12.5px] text-ink-2 transition hover:border-line-strong hover:bg-raised hover:text-ink">
                      <span className="flex-1">{s.q}</span>
                      {s.mode === 'draft' && <span className="eyebrow text-[9px]">draft</span>}
                      <ArrowUp size={13} className="rotate-45 text-faint transition group-hover:text-accent" />
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-5">
                {grounding && (
                  <div className="num flex items-center gap-2 text-[10.5px] text-faint">
                    <span className="h-px flex-1 bg-line" />
                    grounded in {grounding.activities} activities · {grounding.deliverables} deliverables · {grounding.milestones} milestones
                    <span className="h-px flex-1 bg-line" />
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => (
                    <motion.div key={i} variants={rowIn} initial="hidden" animate="show" className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {m.role === 'user' ? (
                        <div className="max-w-[85%] rounded-[14px] rounded-br-[4px] bg-primary px-3.5 py-2.5 text-[13px] leading-relaxed text-on-primary">{m.content}</div>
                      ) : (
                        <AssistantMessage m={m} streaming={phase === 'streaming' && i === messages.length - 1} onRetry={m.error ? retry : undefined} />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {phase === 'connecting' && (
                  <div className="flex items-center gap-2 text-[12px] text-muted">
                    <span className="flex gap-1">{[0, 1, 2].map(k => <span key={k} className="h-1 w-1 rounded-full bg-muted" style={{ animation: `vm-caret 1s ${k * 0.18}s infinite` }} />)}</span>
                    Reading live project data
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={e => { e.preventDefault(); send(draft, messages); }} className="border-t border-line p-3">
            <div className="mb-2 flex items-center justify-between">
              <Segmented size="sm" label="Assistant mode" value={mode} onChange={setMode}
                options={[{ value: 'ask', label: 'Ask' }, { value: 'draft', label: 'Draft' }]} />
              <span className="text-[10.5px] text-faint">{mode === 'ask' ? 'Questions about the project' : 'Owner updates, RFI replies, summaries'}</span>
            </div>
            <div className="flex items-end gap-2 rounded-[12px] border border-line bg-raised p-1.5 transition focus-within:border-accent/60 focus-within:shadow-[0_0_0_3px_rgb(var(--c-accent)/.14)]">
              <textarea ref={inputRef} value={draft} rows={1}
                onChange={e => { setDraft(e.target.value); e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = `${Math.min(140, e.currentTarget.scrollHeight)}px`; }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft, messages); } }}
                placeholder={mode === 'ask' ? 'Ask about the project…' : 'What should I draft?'}
                aria-label="Message the assistant"
                className="max-h-[140px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] text-ink outline-none placeholder:text-faint" />
              {busy ? (
                <button type="button" onClick={stop} aria-label="Stop generating" className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-ink/[0.08] text-ink hover:bg-ink/[0.14]"><Square size={11} fill="currentColor" /></button>
              ) : (
                <button type="submit" disabled={!draft.trim()} aria-label="Send" className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-primary text-on-primary transition active:scale-95 disabled:opacity-30"><ArrowUp size={15} /></button>
              )}
            </div>
          </form>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function AssistantMessage({ m, streaming, onRetry }: { m: Msg; streaming: boolean; onRetry?: () => void }) {
  const [copied, setCopied] = useState(false);
  if (m.error) return (
    <div role="alert" className="w-full rounded-[12px] border border-critical/25 bg-critical/[0.05] px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-2">
      {m.content}
      {onRetry && <button onClick={onRetry} className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-ink hover:text-accent"><RotateCcw size={12} /> Retry</button>}
    </div>
  );
  return (
    <div className="group w-full text-[13.5px] leading-[1.65] text-ink-2">
      <RichText text={m.content} />
      {streaming && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-accent" style={{ animation: 'vm-caret 1s infinite' }} />}
      {!streaming && m.content && (
        <button onClick={() => { navigator.clipboard?.writeText(m.content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }); }}
          className="mt-2 flex items-center gap-1.5 text-[11px] text-faint opacity-70 transition hover:text-ink group-hover:opacity-100">
          {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
        </button>
      )}
    </div>
  );
}
