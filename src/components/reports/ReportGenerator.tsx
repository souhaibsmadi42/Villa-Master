'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Eyebrow } from '@/components/ui/Eyebrow';

export function ReportGenerator({ canGenerate }: { canGenerate: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [snapMsg, setSnapMsg] = useState<string | null>(null);

  async function snapshot() {
    setSnapMsg('Capturing…');
    try {
      const r = await fetch('/api/snapshot', { method: 'POST' });
      const d = await r.json();
      setSnapMsg(r.ok ? `Snapshot saved: earned ${d.earned}% · SPI ${d.spi}` : (d.error || 'Failed'));
      router.refresh();
    } catch { setSnapMsg('Network error'); }
  }

  async function email() {
    setSnapMsg('Sending…');
    try {
      const r = await fetch('/api/reports/send', { method: 'POST' });
      const d = await r.json();
      setSnapMsg(r.ok ? `Emailed to ${d.sent} recipient(s).` : (d.message || d.error || 'Failed'));
    } catch { setSnapMsg('Network error'); }
  }

  async function generate() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch('/api/reports/generate', { method: 'POST' });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || 'Failed'); return; }
      setDraft(d.summary);
      router.refresh(); // the saved report appears in the list below
    } catch { setErr('Network error'); }
    finally { setBusy(false); }
  }

  if (!canGenerate) return null;
  return (
    <GlassPanel className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div><Eyebrow>AI weekly report</Eyebrow><p className="text-stone text-[12.5px] mt-1">Drafts a 3-paragraph owner update from live project metrics.</p></div>
        <button onClick={generate} disabled={busy}
          className="rounded-full bg-bark text-cream px-5 py-2.5 text-[12.5px] font-semibold disabled:opacity-50">
          {busy ? 'Generating…' : '✦ Generate this week\'s report'}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={snapshot} className="rounded-full border border-border px-3.5 py-1.5 text-[11.5px] font-semibold text-text-2 hover:border-border-2">Capture progress snapshot</button>
        <button onClick={email} className="rounded-full border border-border px-3.5 py-1.5 text-[11.5px] font-semibold text-text-2 hover:border-border-2">Email latest to owner</button>
        {snapMsg && <span className="text-[11.5px] text-stone">{snapMsg}</span>}
      </div>
      {err && <div className="mt-3 text-[12.5px] text-iron">{err}</div>}
      {draft && (
        <div className="mt-4 rounded-card bg-surface-2 border border-border p-4 text-[13.5px] text-text-2 leading-relaxed whitespace-pre-wrap">{draft}</div>
      )}
    </GlassPanel>
  );
}
