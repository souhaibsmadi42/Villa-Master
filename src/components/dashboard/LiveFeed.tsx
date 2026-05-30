'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Ev = { actor_name: string | null; verb: string; subject_text: string | null; subject_type: string | null; at: string };

export function LiveFeed({ initial }: { initial: Ev[] }) {
  const [events, setEvents] = useState<Ev[]>(initial);
  const [flash, setFlash] = useState(0);

  useEffect(() => {
    const sb = createClient();
    const ch = sb
      .channel('rt-event-log')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'event_log' }, payload => {
        setEvents(prev => [payload.new as Ev, ...prev].slice(0, 12));
        setFlash(f => f + 1);
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, []);

  return (
    <div className="mt-3 flex flex-col gap-2.5">
      {events.map((e, i) => (
        <div key={i} className={`text-[12.5px] text-text-2 flex gap-2 ${i === 0 && flash ? 'animate-[fadeIn_1.2s_ease]' : ''}`}>
          <span className="num text-[10px] text-stone whitespace-nowrap">{new Date(e.at).toLocaleDateString()}</span>
          <span><strong className="text-text">{e.actor_name ?? 'Someone'}</strong> {e.verb} {e.subject_type} {e.subject_text ? `“${e.subject_text}”` : ''}</span>
        </div>
      ))}
      {events.length === 0 && <p className="text-stone text-[12.5px] italic">No activity yet — edit something to see it appear here live.</p>}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px);background:rgba(201,168,119,.15)}to{opacity:1;transform:none;background:transparent}}`}</style>
    </div>
  );
}
