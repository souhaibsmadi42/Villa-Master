'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Upload, Download, ChevronRight, Search, Check, X, Box, FileText, FileImage, FileSpreadsheet, File as FileIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { recordUpload, decideDocument, getDownloadUrl } from '@/app/(app)/documents/actions';
import { DOC_CATEGORIES, deliverableStatus, humanize } from '@/lib/status';
import { fmtDate, relTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Chip } from '@/components/ui/Controls';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IndeterminateBar } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { rowIn } from '@/motion/variants';

export type Doc = {
  id: string; title: string; category: string; current_version: number; status: string;
  versions: { version: number; storage_path: string; uploaded_at: string }[];
  downloads: number;
};

const MODEL_RE = /\.(glb|gltf|fbx|obj|stl|ply|dae|3mf)$/i;
function iconFor(path?: string) {
  if (!path) return FileIcon;
  if (MODEL_RE.test(path)) return Box;
  if (/\.(png|jpe?g|webp|gif|tiff?)$/i.test(path)) return FileImage;
  if (/\.(xlsx?|csv)$/i.test(path)) return FileSpreadsheet;
  if (/\.(pdf|docx?|txt|dwg|dxf)$/i.test(path)) return FileText;
  return FileIcon;
}

export function DocumentCenter({ projectId, docs, canApprove, canUpload, initialQuery = '' }: {
  projectId: string; docs: Doc[]; canApprove: boolean; canUpload: boolean; initialQuery?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState<string | null>(null);
  const [q, setQ] = useState(initialQuery);
  const [items, setItems] = useState(docs);
  const [upload, setUpload] = useState<{ name: string } | null>(null);
  const [cat, setCat] = useState<string>('architectural');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setItems(docs), [docs]);

  const latest = (d: Doc) => d.versions.find(x => x.version === d.current_version) ?? d.versions[d.versions.length - 1];
  const counts = useMemo(() => Object.fromEntries(DOC_CATEGORIES.map(c => [c, items.filter(d => d.category === c).length])), [items]);
  const shown = items.filter(d => (!filter || d.category === filter) && (!q.trim() || d.title.toLowerCase().includes(q.trim().toLowerCase())));

  async function onUpload(file: File, documentId?: string) {
    setUpload({ name: file.name });
    try {
      const safe = file.name.replace(/[^\w.\-]/g, '_');
      const path = `${projectId}/${documentId ?? 'new'}/${Date.now()}-${safe}`;
      const { error } = await createClient().storage.from('documents').upload(path, file, { upsert: false });
      if (error) throw new Error(error.message);
      const existing = documentId ? items.find(d => d.id === documentId) : null;
      const res = await recordUpload({ projectId, title: existing?.title ?? file.name, category: existing?.category ?? cat, storagePath: path, sizeBytes: file.size, mime: file.type, documentId });
      if (!res.ok) throw new Error(res.error);
      toast.success(documentId ? `Version ${res.version} uploaded` : 'Document uploaded', file.name);
      router.refresh();
    } catch (e) {
      toast.error('Upload failed', e instanceof Error ? e.message : undefined);
    } finally { setUpload(null); }
  }

  async function download(d: Doc, version?: { version: number; storage_path: string }) {
    const v = version ?? latest(d);
    if (!v) return toast.error('No file stored for this document');
    setBusy(d.id);
    const res = await getDownloadUrl(d.id, v.storage_path);
    setBusy(null);
    if (res.ok && res.url) {
      window.open(res.url, '_blank', 'noopener');
      setItems(list => list.map(x => (x.id === d.id ? { ...x, downloads: x.downloads + 1 } : x)));
    } else toast.error('Could not get the file', res.error);
  }

  async function decide(d: Doc, decision: 'approved' | 'rejected') {
    setBusy(d.id);
    const r = await decideDocument(d.id, decision);
    setBusy(null);
    if (!r.ok) return toast.error('Decision not saved', r.error);
    setItems(list => list.map(x => (x.id === d.id ? { ...x, status: decision } : x)));
    toast.success(decision === 'approved' ? 'Document approved' : 'Document rejected', d.title);
  }

  return (
    <div className="flex flex-col gap-5"
      onDragOver={e => { if (canUpload) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
      onDrop={e => { if (!canUpload) return; e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onUpload(f); }}>

      {canUpload && (
        <div className={cn('relative overflow-hidden rounded-panel border border-dashed p-5 transition-colors', dragging ? 'border-accent bg-accent/[0.06]' : 'border-line-strong bg-surface')}>
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-sunken text-muted"><Upload size={17} /></span>
            <div className="min-w-[200px] flex-1">
              <div className="text-[13.5px] text-ink">{upload ? <>Uploading <span className="font-medium">{upload.name}</span>…</> : dragging ? 'Drop to upload' : 'Drop a file here, or choose one'}</div>
              <div className="text-[11.5px] text-muted">Stored privately; every upload is versioned and downloads are recorded.</div>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Category for new upload" className="field flex-1 capitalize sm:w-auto sm:flex-none" disabled={!!upload}>
                {DOC_CATEGORIES.map(c => <option key={c} value={c}>{humanize(c)}</option>)}
              </select>
              <Button variant="primary" icon={<Upload size={14} />} loading={!!upload} onClick={() => fileRef.current?.click()}>Upload</Button>
            </div>
            <input ref={fileRef} type="file" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.currentTarget.value = ''; }} />
          </div>
          {upload && <IndeterminateBar className="absolute inset-x-0 bottom-0 rounded-none" />}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <label className="relative w-full sm:w-[320px]">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search documents…" aria-label="Search documents" className="field pl-9" />
        </label>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
          <Chip active={!filter} onClick={() => setFilter(null)} count={items.length}>All</Chip>
          {DOC_CATEGORIES.filter(c => counts[c]).map(c => <Chip key={c} active={filter === c} onClick={() => setFilter(filter === c ? null : c)} count={counts[c]}><span className="capitalize">{humanize(c)}</span></Chip>)}
        </div>
      </div>

      <div className="overflow-hidden rounded-panel border border-line bg-surface shadow-e1">
        <div className="hidden grid-cols-[minmax(0,2.4fr)_140px_70px_130px_70px_auto] gap-4 border-b border-line px-5 py-3 md:grid">
          {['Document', 'Category', 'Ver', 'Status', 'DL', ''].map(h => <span key={h} className="eyebrow text-[9.5px]">{h}</span>)}
        </div>
        <motion.ul initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.025 } } }}>
          {shown.map(d => {
            const v = latest(d); const Icon = iconFor(v?.storage_path); const st = deliverableStatus(d.status); const isOpen = open === d.id;
            return (
              <motion.li key={d.id} variants={rowIn} className="border-b border-line last:border-0">
                <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 md:grid-cols-[minmax(0,2.4fr)_140px_70px_130px_70px_auto]">
                  <button onClick={() => setOpen(isOpen ? null : d.id)} aria-expanded={isOpen} className="flex min-w-0 items-center gap-3 text-left">
                    <ChevronRight size={14} className={cn('shrink-0 text-faint transition-transform duration-glide', isOpen && 'rotate-90 text-ink')} />
                    <Icon size={16} className="shrink-0 text-muted" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] text-ink">{d.title}</span>
                      {v && <span suppressHydrationWarning className="num block text-[10.5px] text-faint">updated {relTime(v.uploaded_at)}</span>}
                    </span>
                  </button>
                  <span className="hidden text-[12.5px] capitalize text-ink-2 md:block">{humanize(d.category)}</span>
                  <span className="num hidden text-[12px] text-muted md:block">v{d.current_version}</span>
                  <span className="hidden md:block"><Badge tone={st.tone} dot>{st.label}</Badge></span>
                  <span className="num hidden text-[12px] text-muted md:block">{d.downloads}</span>
                  <span className="flex items-center justify-end gap-1">
                    {v && MODEL_RE.test(v.storage_path) && <Link href="/site" className="hidden rounded-[7px] px-2 py-1 text-[11.5px] text-muted hover:bg-ink/[0.05] hover:text-ink lg:inline-block">View 3D</Link>}
                    <Button size="xs" variant="ghost" icon={<Download size={13} />} disabled={busy === d.id || !v} onClick={() => download(d)}>Download</Button>
                    {canApprove && d.status !== 'approved' && <Button size="xs" variant="accent" icon={<Check size={12} />} disabled={busy === d.id} onClick={() => decide(d, 'approved')} aria-label={`Approve ${d.title}`}><span className="hidden sm:inline">Approve</span></Button>}
                    {canApprove && d.status !== 'rejected' && <Button size="xs" variant="danger" icon={<X size={12} />} disabled={busy === d.id} onClick={() => decide(d, 'rejected')} aria-label={`Reject ${d.title}`}><span className="hidden sm:inline">Reject</span></Button>}
                  </span>
                </div>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-raised">
                      <div className="grid gap-5 px-5 pb-5 pt-2 md:grid-cols-[1fr_auto] md:pl-[60px]">
                        <div>
                          <div className="eyebrow mb-2 text-[9.5px]">Version history</div>
                          <ol className="flex flex-col divide-y divide-line">
                            {d.versions.slice().reverse().map(x => (
                              <li key={x.version} className="flex items-center gap-4 py-2 text-[12px]">
                                <span className="num w-8 text-ink">v{x.version}</span>
                                <span className="num flex-1 text-muted">{fmtDate(x.uploaded_at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                <button onClick={() => download(d, x)} className="text-[11.5px] text-muted hover:text-ink">Download</button>
                              </li>
                            ))}
                            {!d.versions.length && <li className="py-2 text-[12px] text-faint">No files stored.</li>}
                          </ol>
                        </div>
                        {canUpload && (
                          <div className="flex items-start">
                            <label className={cn('inline-flex h-8 cursor-pointer items-center gap-2 rounded-[7px] border border-line bg-surface px-3 text-[12px] text-ink hover:border-line-strong', upload && 'pointer-events-none opacity-50')}>
                              <Upload size={13} /> Upload new version
                              <input type="file" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f, d.id); e.currentTarget.value = ''; }} />
                            </label>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </motion.ul>
        {shown.length === 0 && (
          <EmptyState compact title={items.length ? 'No documents match' : 'No documents yet'}
            body={items.length ? 'Try another category or search.' : canUpload ? 'Upload drawings, BOQs, RFIs and submittals above.' : 'Documents shared with you will appear here.'} />
        )}
      </div>
    </div>
  );
}

