'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, Camera, Send } from 'lucide-react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { IndeterminateBar } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

export function ReportGenerator({ canGenerate }: { canGenerate: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<null | 'generate' | 'snapshot' | 'email'>(null);
  const [draft, setDraft] = useState<{ text: string; generated: boolean } | null>(null);

  async function call(kind: 'generate' | 'snapshot' | 'email') {
    setBusy(kind);
    const url = kind === 'generate' ? '/api/reports/generate' : kind === 'snapshot' ? '/api/snapshot' : '/api/reports/send';
    try {
      const r = await fetch(url, { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { toast.error(kind === 'email' ? 'Email not sent' : kind === 'snapshot' ? 'Snapshot not saved' : 'Report not generated', d.message || d.error || `Error ${r.status}`); return; }
      if (kind === 'generate') { setDraft({ text: d.summary, generated: !!d.generated }); toast.success('Weekly report saved'); }
      if (kind === 'snapshot') toast.success('Progress snapshot recorded', `Earned ${d.earned}% · planned ${d.planned}% · SPI ${d.spi}`);
      if (kind === 'email') toast.success('Report emailed', `Sent to ${d.sent} recipient${d.sent === 1 ? '' : 's'}.`);
      router.refresh();
    } catch { toast.error('Network error'); }
    finally { setBusy(null); }
  }

  if (!canGenerate) return null;
  return (
    <Panel className="relative overflow-hidden p-6">
      {busy === 'generate' && <IndeterminateBar className="absolute inset-x-0 top-0 rounded-none" />}
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="eyebrow">This week</div>
          <div className="display mt-2 text-[28px] text-ink">Draft the owner update</div>
          <p className="mt-1 max-w-[52ch] text-[12.5px] text-muted">Three short paragraphs written from live metrics, saved to the report archive. Without an AI key, a factual summary is saved instead.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={<Sparkles size={14} />} loading={busy === 'generate'} disabled={!!busy} onClick={() => call('generate')}>{busy === 'generate' ? 'Writing…' : 'Generate report'}</Button>
          <Button variant="secondary" icon={<Camera size={14} />} loading={busy === 'snapshot'} disabled={!!busy} onClick={() => call('snapshot')}>Capture snapshot</Button>
          <Button variant="secondary" icon={<Send size={14} />} loading={busy === 'email'} disabled={!!busy} onClick={() => call('email')}>Email latest</Button>
        </div>
      </div>
      <AnimatePresence>
        {draft && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
            <div className="mt-6 border-t border-line pt-5">
              <div className="eyebrow mb-2 text-[9.5px]">{draft.generated ? 'Written by Claude from live data' : 'Factual summary (AI not configured)'}</div>
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{draft.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="mt-5 text-[11px] text-faint">Snapshots record today’s earned vs planned progress so the S-curve can plot an actual line. A weekly snapshot also runs automatically (Vercel cron).</p>
    </Panel>
  );
}
