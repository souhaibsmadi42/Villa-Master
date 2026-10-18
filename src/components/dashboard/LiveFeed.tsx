'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { relTime } from '@/lib/format';
import { Badge } from '@/components/ui/Badge';

type Ev = { actor_name: string | null; verb: string; subject_text: string | null; subject_type: string | null; at: string };

/** Project activity log with realtime inserts (Supabase Realtime on event_log). */
export function LiveFeed({ initial }: { initial: Ev[] }) {
  const [events, setEvents] = useState<Ev[]>(initial);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const sb = createClient();
    const ch = sb
      .channel('rt-event-log')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_log' }, payload => {
        setEvents(prev => [payload.new as Ev, ...prev].slice(0, 12));
      })
      .subscribe(status => setLive(status === 'SUBSCRIBED'));
    return () => { sb.removeChannel(ch); };
  }, []);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        {live ? <Badge tone="success" dot="live">Live</Badge> : <Badge tone="neutral" dot>Snapshot</Badge>}
      </div>
      <ol className="relative flex flex-col">
        <span aria-hidden className="absolute bottom-2 left-[3px] top-2 w-px bg-line" />
        <AnimatePresence initial={false}>
          {events.map(e => (
            <motion.li key={`${e.at}-${e.subject_text}`} layout initial={{ opacity: 0, y: -8, backgroundColor: 'rgb(var(--c-bronze) / .14)' }}
              animate={{ opacity: 1, y: 0, backgroundColor: 'rgb(var(--c-bronze) / 0)' }} transition={{ duration: 0.9 }}
              className="relative flex gap-3 rounded-[6px] py-2 pl-4 pr-1">
              <span aria-hidden className="absolute left-0 top-[14px] h-[7px] w-[7px] rounded-full border border-line-strong bg-surface" />
              <span className="flex-1 text-[12.5px] leading-snug text-ink-2">
                <span className="font-medium text-ink">{e.actor_name ?? 'Someone'}</span> {e.verb} {e.subject_type}
                {e.subject_text ? <span className="text-ink"> “{e.subject_text}”</span> : null}
              </span>
              <span suppressHydrationWarning className="num shrink-0 pt-0.5 text-[10.5px] text-faint">{relTime(e.at)}</span>
            </motion.li>
          ))}
        </AnimatePresence>
        {events.length === 0 && <li className="py-6 text-center text-[12.5px] text-muted">No activity recorded yet. Changes made in the platform appear here as they happen.</li>}
      </ol>
    </div>
  );
}
