'use client';
import { Fragment, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { recordUpload, decideDocument, getDownloadUrl } from '@/app/(app)/documents/actions';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pill } from '@/components/ui/Pill';

const CATEGORIES = ['architectural', 'structural', 'mep', 'landscape', 'boq', 'rfi', 'shop_drawings', 'material_submittals', 'contracts', 'reports'];
const CAT_LABEL = (c: string) => c.replace('_', ' ');

export type Doc = {
  id: string; title: string; category: string; current_version: number; status: string;
  versions: { version: number; storage_path: string; uploaded_at: string }[];
  downloads: number;
};

const tone = (s: string) => s === 'approved' ? 'olive' : s === 'rejected' ? 'iron' : 'brass';

export function DocumentCenter({ projectId, docs, canApprove, canUpload }: {
  projectId: string; docs: Doc[]; canApprove: boolean; canUpload: boolean;
}) {
  const sb = createClient();
  const [filter, setFilter] = useState<string | null>(null);
  const [items, setItems] = useState(docs);
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null);

  const shown = filter ? items.filter(d => d.category === filter) : items;

  async function onUpload(file: File, category: string, documentId?: string) {
    setBusy(true);
    const safe = file.name.replace(/[^\w.\-]/g, '_');
    const path = `${projectId}/${documentId ?? 'new'}/${Date.now()}-${safe}`;
    const { error } = await sb.storage.from('documents').upload(path, file, { upsert: false });
    if (error) { alert('Upload failed: ' + error.message); setBusy(false); return; }
    const res = await recordUpload({ projectId, title: documentId ? items.find(d => d.id === documentId)!.title : file.name, category, storagePath: path, sizeBytes: file.size, mime: file.type, documentId });
    setBusy(false);
    if (!res.ok) { alert('Save failed: ' + res.error); return; }
    location.reload();
  }

  async function download(d: Doc) {
    const v = d.versions.find(x => x.version === d.current_version) ?? d.versions[d.versions.length - 1];
    if (!v) return;
    const res = await getDownloadUrl(d.id, v.storage_path);
    if (res.ok && res.url) window.open(res.url, '_blank');
    else alert(res.error || 'Could not get file');
  }

  function decide(id: string, decision: 'approved' | 'rejected') {
    start(async () => { await decideDocument(id, decision); setItems(prev => prev.map(d => d.id === id ? { ...d, status: decision } : d)); });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip active={!filter} onClick={() => setFilter(null)} label="All" />
        {CATEGORIES.map(c => <Chip key={c} active={filter === c} onClick={() => setFilter(c)} label={CAT_LABEL(c)} />)}
        {canUpload && <UploadButton busy={busy} onUpload={onUpload} />}
      </div>

      <GlassPanel className="p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-[9.5px] tracking-eyebrow uppercase text-stone border-b border-border">
              <th className="px-4 py-3">Title</th><th className="px-3">Category</th><th className="px-3">Ver</th>
              <th className="px-3">Status</th><th className="px-3">DL</th><th className="px-4"></th>
            </tr>
          </thead>
          <tbody>
            {shown.map(d => (
              <Fragment key={d.id}>
                <tr className="border-b border-border text-[13px] hover:bg-surface-2">
                  <td className="px-4 py-3 text-text">{d.title}</td>
                  <td className="px-3 text-stone capitalize">{CAT_LABEL(d.category)}</td>
                  <td className="px-3 num text-stone">v{d.current_version}</td>
                  <td className="px-3"><Pill tone={tone(d.status) as any}>{d.status.replace('_', ' ')}</Pill></td>
                  <td className="px-3 num text-stone">{d.downloads}</td>
                  <td className="px-4 text-right whitespace-nowrap">
                    <button onClick={() => download(d)} className="text-[11.5px] text-olive hover:underline">download</button>
                    <button onClick={() => setOpen(open === d.id ? null : d.id)} className="ml-3 text-[11.5px] text-stone hover:underline">versions</button>
                    {canApprove && d.status !== 'approved' && <button onClick={() => decide(d.id, 'approved')} className="ml-3 text-[11.5px] text-olive hover:underline">approve</button>}
                    {canApprove && d.status !== 'rejected' && <button onClick={() => decide(d.id, 'rejected')} className="ml-2 text-[11.5px] text-iron hover:underline">reject</button>}
                  </td>
                </tr>
                {open === d.id && (
                  <tr className="bg-surface-2 border-b border-border"><td colSpan={6} className="px-4 py-3">
                    <Eyebrow>Version history</Eyebrow>
                    <ul className="mt-2 flex flex-col gap-1">
                      {d.versions.slice().reverse().map(v => (
                        <li key={v.version} className="num text-[11.5px] text-stone">v{v.version} · {new Date(v.uploaded_at).toLocaleString()}</li>
                      ))}
                    </ul>
                  </td></tr>
                )}
              </Fragment>
            ))}
            {shown.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone italic text-[13px]">No documents in this category.</td></tr>}
          </tbody>
        </table>
      </GlassPanel>
    </div>
  );
}

function UploadButton({ busy, onUpload }: { busy: boolean; onUpload: (f: File, cat: string) => void }) {
  const [cat, setCat] = useState('architectural');
  return (
    <div className="ml-auto flex items-center gap-2">
      <select value={cat} onChange={e => setCat(e.target.value)} className="rounded-lg border border-border bg-surface px-2 py-1.5 text-[11.5px] capitalize">
        {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABEL(c)}</option>)}
      </select>
      <label className={`rounded-full bg-bark text-cream px-4 py-2 text-[12px] font-semibold cursor-pointer ${busy ? 'opacity-50' : ''}`}>
        {busy ? 'Uploading…' : '⬆ Upload'}
        <input type="file" hidden disabled={busy} onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f, cat); e.currentTarget.value = ''; }} />
      </label>
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} className={`rounded-full border px-3 py-1.5 text-[11.5px] font-medium capitalize transition ${active ? 'bg-bark text-cream border-bark' : 'bg-surface text-text-2 border-border hover:border-border-2'}`}>{label}</button>;
}
