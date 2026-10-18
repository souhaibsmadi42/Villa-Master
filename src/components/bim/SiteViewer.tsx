'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type * as THREE from 'three';
import { Upload, Maximize2, Minimize2, RotateCcw, Camera, X, Eye, EyeOff, Box, Layers3, Scan, Save, FolderOpen, Crosshair } from 'lucide-react';
import { cn } from '@/lib/cn';
import { relTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { recordUpload, getDownloadUrl } from '@/app/(app)/documents/actions';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { Segmented, ProgressBar } from '@/components/ui/Controls';
import { IndeterminateBar } from '@/components/ui/Spinner';
import { Tooltip } from '@/components/ui/Tooltip';
import { useToast } from '@/components/ui/Toast';
import { ACCEPT, MODEL_EXTS, extOf, isModelFile } from './formats';
import type { ModelStats } from './loaders';
import type { DisplayMode, UpAxis } from './ModelCanvas';

// Heavy WebGL code loads only when a model is opened.
const ModelCanvas = dynamic(() => import('./ModelCanvas'), { ssr: false, loading: () => <ViewportMessage title="Preparing the viewer…" busy /> });
const SpeckleCanvas = dynamic(() => import('./speckle/SpeckleCanvas'), { ssr: false });

export type Zone = {
  id: string;
  label: string;
  description?: string;
  camera: { phi: number; theta: number; r: number };
  progress?: number | null;
};
export type SavedModel = { id: string; title: string; version: number; storage_path: string; uploaded_at: string };

type Source = { kind: 'local'; files: File[]; name: string } | { kind: 'saved'; model: SavedModel; name: string };
type Status = { kind: 'idle' } | { kind: 'loading'; name: string; progress: number | null } | { kind: 'error'; message: string } | { kind: 'ready' };

const fmtNum = (n: number) => n.toLocaleString('en-GB');
const fmtLen = (n: number) => (n >= 100 ? n.toFixed(0) : n >= 10 ? n.toFixed(1) : n.toFixed(2));

export function SiteViewer({ streamId, zones, projectId, savedModels, canUpload }: {
  streamId: string; zones: Zone[]; projectId: string; savedModels: SavedModel[]; canUpload: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const frameRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [view, setView] = useState<'model' | 'speckle'>('model');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [mode, setMode] = useState<DisplayMode>('materials');
  const [up, setUp] = useState<UpAxis>('y');
  const [section, setSection] = useState(1);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<THREE.Object3D | null>(null);
  const [reset, setReset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeZone, setActiveZone] = useState<Zone | null>(null);

  useEffect(() => {
    const on = () => setFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  const open = useCallback(async (src: Source) => {
    setStatus({ kind: 'loading', name: src.name, progress: null });
    setSelected(null); setHidden(new Set()); setSection(1); setMode('materials');
    try {
      const { loadModel, modelStats } = await import('./loaders');   // three.js loads on demand
      let obj: THREE.Object3D;
      if (src.kind === 'local') obj = await loadModel({ files: src.files }, p => setStatus({ kind: 'loading', name: src.name, progress: p }));
      else {
        const r = await getDownloadUrl(src.model.id, src.model.storage_path);
        if (!r.ok || !r.url) throw new Error(r.error || 'Could not get a download link for this model.');
        obj = await loadModel({ url: r.url, name: src.model.storage_path }, p => setStatus({ kind: 'loading', name: src.name, progress: p }));
      }
      setModel(obj); setSource(src); setStats(modelStats(obj)); setStatus({ kind: 'ready' }); setView('model');
    } catch (e) {
      setStatus({ kind: 'error', message: e instanceof Error ? e.message : 'The model could not be opened.' });
    }
  }, []);

  function onFiles(list: FileList | File[] | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    const main = files.find(f => isModelFile(f.name));
    if (!main) { setStatus({ kind: 'error', message: `None of these files is a supported model. Use ${MODEL_EXTS.map(e => e.toUpperCase()).join(', ')}.` }); return; }
    open({ kind: 'local', files, name: main.name });
  }

  async function saveToProject() {
    if (!source || source.kind !== 'local') return;
    const main = source.files.find(f => isModelFile(f.name))!;
    setSaving(true);
    try {
      const safe = main.name.replace(/[^\w.\-]/g, '_');
      const path = `${projectId}/models/${Date.now()}-${safe}`;
      const { error } = await createClient().storage.from('documents').upload(path, main, { upsert: false, contentType: main.type || 'application/octet-stream' });
      if (error) throw new Error(error.message);
      const res = await recordUpload({ projectId, title: main.name, category: 'architectural', storagePath: path, sizeBytes: main.size, mime: main.type || undefined });
      if (!res.ok) throw new Error(res.error);
      toast.success('Model saved to the project', `${main.name} is now in Documents and the saved models list.`);
      setSource({ kind: 'saved', name: main.name, model: { id: res.documentId!, title: main.name, version: res.version ?? 1, storage_path: path, uploaded_at: new Date().toISOString() } });
      router.refresh();
    } catch (e) {
      toast.error('Could not save the model', e instanceof Error ? e.message : undefined);
    } finally { setSaving(false); }
  }

  function screenshot() {
    const c = canvasRef.current; if (!c) return;
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = `${(source?.name ?? 'model').replace(/\.[^.]+$/, '')}-view.png`;
    a.click();
  }

  function close() { setModel(null); setSource(null); setStats(null); setSelected(null); setStatus({ kind: 'idle' }); }

  // Companion files (.mtl, .bin, textures) are resolved locally; saving keeps a single file only.
  const saveBlocked = source?.kind === 'local' && source.files.length > 1
    ? 'Multi-file models (with .mtl, .bin or textures) can be viewed but not saved. Export a single GLB to keep it with the project.'
    : null;
  const parts = model ? model.children.filter(c => c.children.length || (c as THREE.Mesh).isMesh) : [];

  return (
    <div className="flex flex-col gap-5">
      {streamId && (
        <Segmented label="Model source" value={view} onChange={setView} size="sm"
          options={[{ value: 'model', label: 'Uploaded models' }, { value: 'speckle', label: 'Speckle stream' }]} />
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Viewport */}
        <div ref={frameRef}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
          onDrop={e => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
          className={cn('relative overflow-hidden bg-[#121311] text-chalk', fullscreen ? 'h-screen w-screen' : 'h-[min(74vh,780px)] min-h-[420px] rounded-hero shadow-e3')}>
          {view === 'speckle' ? (
            <SpeckleCanvas streamId={streamId} activeCamera={activeZone?.camera} />
          ) : model && status.kind === 'ready' ? (
            <ModelCanvas model={model} upAxis={up} mode={mode} section={section} hidden={hidden} selected={selected}
              onSelect={setSelected} resetNonce={reset} onCanvas={c => { canvasRef.current = c; }} />
          ) : status.kind === 'loading' ? (
            <ViewportMessage title={`Opening ${status.name}`} progress={status.progress} busy />
          ) : status.kind === 'error' ? (
            <ViewportMessage title="This model could not be opened" body={status.message} error
              action={<Button variant="inverse" size="sm" icon={<Upload size={14} />} onClick={() => inputRef.current?.click()}>Choose another file</Button>} />
          ) : (
            <DropPrompt onPick={() => inputRef.current?.click()} />
          )}

          {/* drafting grid frame */}
          <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-chalk/[0.06]" />

          {/* Floating controls */}
          {view === 'model' && model && status.kind === 'ready' && (
            <>
              <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2 sm:left-4 sm:top-4">
                <div className="flex items-center rounded-[10px] border border-chalk/10 bg-[#0D0E0C]/70 p-0.5 backdrop-blur-md">
                  {(['materials', 'clay', 'wireframe'] as DisplayMode[]).map(m => (
                    <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m}
                      className={cn('h-7 rounded-[8px] px-2.5 text-[11.5px] capitalize transition', mode === m ? 'bg-chalk text-obsidian' : 'text-chalk/70 hover:text-chalk')}>{m === 'wireframe' ? 'Wire' : m}</button>
                  ))}
                </div>
                <Tooltip content="Switch up-axis (Revit/IFC exports are often Z-up)" side="bottom">
                  <button onClick={() => setUp(u => (u === 'y' ? 'z' : 'y'))}
                    className="num h-8 rounded-[10px] border border-chalk/10 bg-[#0D0E0C]/70 px-2.5 text-[11px] text-chalk/80 backdrop-blur-md hover:text-chalk">{up.toUpperCase()}-up</button>
                </Tooltip>
                <label className="flex h-8 items-center gap-2 rounded-[10px] border border-chalk/10 bg-[#0D0E0C]/70 px-2.5 text-[11px] text-chalk/80 backdrop-blur-md">
                  <Scan size={13} /> <span className="hidden sm:inline">Section</span>
                  <input type="range" min={0.02} max={1} step={0.01} value={section} onChange={e => setSection(+e.target.value)} aria-label="Section cut height"
                    className="h-1 w-20 cursor-pointer accent-[#AE9270] sm:w-28" />
                  <span className="num w-8 text-right">{section >= 0.999 ? 'off' : `${Math.round(section * 100)}%`}</span>
                </label>
              </div>
              <div className="absolute right-3 top-3 flex items-center gap-1 rounded-[10px] border border-chalk/10 bg-[#0D0E0C]/70 p-0.5 backdrop-blur-md sm:right-4 sm:top-4">
                {[
                  { l: 'Reset view', i: RotateCcw, f: () => setReset(n => n + 1) },
                  { l: 'Save view as image', i: Camera, f: screenshot },
                  { l: fullscreen ? 'Exit fullscreen' : 'Fullscreen', i: fullscreen ? Minimize2 : Maximize2, f: () => (fullscreen ? document.exitFullscreen() : frameRef.current?.requestFullscreen()) },
                  { l: 'Close model', i: X, f: close },
                ].map(b => (
                  <Tooltip key={b.l} content={b.l} side="bottom">
                    <button onClick={b.f} aria-label={b.l} className="grid h-7 w-7 place-items-center rounded-[8px] text-chalk/75 transition hover:bg-chalk/10 hover:text-chalk"><b.i size={14} /></button>
                  </Tooltip>
                ))}
              </div>
              <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-140px)] flex-wrap items-center gap-2 sm:bottom-4 sm:left-4">
                <span className="truncate rounded-[8px] border border-chalk/10 bg-[#0D0E0C]/70 px-2.5 py-1.5 text-[12px] text-chalk/90 backdrop-blur-md">{source?.name}</span>
                {source?.kind === 'saved'
                  ? <span className="rounded-[8px] border border-[#8FAB85]/30 bg-[#8FAB85]/10 px-2 py-1.5 text-[11px] text-[#A9C2A0]">Saved to project</span>
                  : <span className="rounded-[8px] border border-chalk/10 bg-[#0D0E0C]/70 px-2 py-1.5 text-[11px] text-chalk/60 backdrop-blur-md">Local only — not saved</span>}
              </div>
            </>
          )}

          {/* Drag-over state */}
          <AnimatePresence>
            {dragging && view === 'model' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-3 z-20 grid place-items-center rounded-[16px] border-2 border-dashed border-bronze/70 bg-[#0D0E0C]/80 backdrop-blur-sm">
                <div className="text-center"><Upload size={22} className="mx-auto text-bronze" /><div className="display mt-3 text-[28px]">Drop to open</div><div className="mt-1 text-[12px] text-stone">Include .mtl, .bin and texture files with the model if it has them</div></div>
              </motion.div>
            )}
          </AnimatePresence>
          <input ref={inputRef} type="file" multiple accept={ACCEPT} hidden onChange={e => { onFiles(e.target.files); e.currentTarget.value = ''; }} />
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-5">
          {view === 'model' && model && stats ? (
            <>
              <Panel className="p-5">
                <PanelHeader label="Model" action={<Button size="xs" variant="ghost" icon={<FolderOpen size={13} />} onClick={() => inputRef.current?.click()}>Open…</Button>} />
                <div className="mt-3 truncate text-[14px] font-medium text-ink" title={source?.name}>{source?.name}</div>
                <dl className="num mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]">
                  {[['Objects', fmtNum(stats.meshes)], ['Triangles', fmtNum(stats.triangles)], ['Vertices', fmtNum(stats.vertices)], ['Materials', fmtNum(stats.materials)]].map(([k, v]) => (
                    <div key={k}><dt className="eyebrow text-[9px]">{k}</dt><dd className="mt-0.5 text-ink">{v}</dd></div>
                  ))}
                  <div className="col-span-2"><dt className="eyebrow text-[9px]">Extents (model units)</dt><dd className="mt-0.5 text-ink">{fmtLen(stats.size.x)} × {fmtLen(stats.size.z)} × {fmtLen(stats.size.y)}</dd></div>
                </dl>
                {source?.kind === 'local' && canUpload && (
                  <div className="mt-5 border-t border-line pt-4">
                    {saveBlocked ? <p className="text-[11.5px] leading-relaxed text-muted">{saveBlocked}</p> : (
                      <>
                        {saving && <IndeterminateBar className="mb-3" />}
                        <Button size="sm" variant="primary" loading={saving} icon={<Save size={14} />} onClick={saveToProject} className="w-full">
                          {saving ? 'Uploading to project storage…' : 'Save to project'}
                        </Button>
                        <p className="mt-2 text-[11px] text-faint">Stored privately in Supabase Storage and listed in Documents.</p>
                      </>
                    )}
                  </div>
                )}
              </Panel>

              <AnimatePresence mode="wait">
                {selected && (
                  <motion.div key={selected.uuid} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Panel className="border-accent/40 p-5">
                      <PanelHeader label="Selected element" action={<IconButton size="sm" label="Clear selection" onClick={() => setSelected(null)}><X size={13} /></IconButton>} />
                      <SelectedInfo obj={selected} />
                    </Panel>
                  </motion.div>
                )}
              </AnimatePresence>

              {parts.length > 1 && (
                <Panel className="p-5">
                  <PanelHeader label="Parts" meta={parts.length} action={hidden.size ? <button onClick={() => setHidden(new Set())} className="text-[11.5px] text-muted hover:text-ink">Show all</button> : undefined} />
                  <ul className="mt-3 flex max-h-[280px] flex-col overflow-y-auto">
                    {parts.map(p => {
                      const off = hidden.has(p.uuid);
                      return (
                        <li key={p.uuid} className="group flex items-center gap-2 rounded-[7px] px-1.5 py-1.5 hover:bg-ink/[0.04]">
                          <button onClick={() => setHidden(h => { const n = new Set(h); if (n.has(p.uuid)) n.delete(p.uuid); else n.add(p.uuid); return n; })}
                            aria-label={`${off ? 'Show' : 'Hide'} ${p.name || 'part'}`} className="grid h-6 w-6 place-items-center rounded text-muted hover:text-ink">
                            {off ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                          <button onClick={() => setSelected(p)} className={cn('min-w-0 flex-1 truncate text-left text-[12.5px]', off ? 'text-faint line-through' : 'text-ink-2 hover:text-ink', selected === p && 'text-accent')}>
                            {p.name || `${p.type} ${p.id}`}
                          </button>
                          <Crosshair size={12} className="text-faint opacity-0 group-hover:opacity-100" />
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              )}
            </>
          ) : (
            <Panel className="p-5">
              <PanelHeader label="Supported formats" />
              <div className="mt-3 flex flex-wrap gap-1.5">{MODEL_EXTS.map(e => <Badge key={e} tone="neutral" className="uppercase">{e}</Badge>)}</div>
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                Files open in your browser — nothing is uploaded until you choose <em>Save to project</em>. For OBJ with materials or glTF with external buffers,
                select the model together with its .mtl / .bin / texture files. GLB is the most reliable single-file format.
              </p>
            </Panel>
          )}

          <Panel className="p-5">
            <PanelHeader label="Saved models" meta={savedModels.length} />
            <ul className="mt-3 flex flex-col divide-y divide-line">
              {savedModels.map(m => {
                const active = source?.kind === 'saved' && source.model.id === m.id;
                return (
                  <li key={m.id}>
                    <button onClick={() => open({ kind: 'saved', model: m, name: m.title })} disabled={status.kind === 'loading'}
                      className="group flex w-full items-center gap-3 py-2.5 text-left disabled:opacity-50">
                      <Box size={15} className={cn('shrink-0', active ? 'text-accent' : 'text-faint')} />
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-[12.5px] group-hover:text-accent', active ? 'text-accent' : 'text-ink')}>{m.title}</span>
                        <span className="num text-[10.5px] text-faint">v{m.version} · {relTime(m.uploaded_at)}</span>
                      </span>
                      <span className="eyebrow text-[9px] text-faint">{extOf(m.storage_path)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {!savedModels.length && <p className="text-[12px] text-muted">No models saved yet.{canUpload ? ' Open one and choose “Save to project”.' : ''}</p>}
          </Panel>

          {zones.length > 0 && (
            <Panel className="p-5">
              <PanelHeader label="Site zones" meta="live progress" />
              <ul className="mt-3 flex flex-col gap-3">
                {zones.map(z => (
                  <li key={z.id}>
                    <button onClick={() => setActiveZone(activeZone?.id === z.id ? null : z)} className="w-full text-left">
                      <span className="flex items-baseline justify-between gap-3 text-[12.5px]"><span className={cn(activeZone?.id === z.id ? 'text-accent' : 'text-ink')}>{z.label}</span><span className="num text-[11px] text-muted">{z.progress != null ? `${z.progress}%` : '—'}</span></span>
                      {z.progress != null && <ProgressBar value={z.progress} height={2} className="mt-1.5" />}
                    </button>
                    <AnimatePresence>
                      {activeZone?.id === z.id && z.description && (
                        <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pt-1.5 text-[11.5px] leading-relaxed text-muted">{z.description}</motion.p>
                      )}
                    </AnimatePresence>
                  </li>
                ))}
              </ul>
              {view === 'speckle' && <p className="mt-3 text-[11px] text-faint">Zones set the camera once the Speckle viewer is connected.</p>}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function SelectedInfo({ obj }: { obj: THREE.Object3D }) {
  const mesh = obj as THREE.Mesh;
  const mat = mesh.isMesh ? (Array.isArray(mesh.userData.__orig ?? mesh.material) ? (mesh.userData.__orig ?? mesh.material)[0] : (mesh.userData.__orig ?? mesh.material)) : null;
  const tris = mesh.isMesh && mesh.geometry ? (mesh.geometry.index ? mesh.geometry.index.count / 3 : (mesh.geometry.getAttribute('position')?.count ?? 0) / 3) : null;
  const ud = Object.entries(obj.userData ?? {}).filter(([k, v]) => !k.startsWith('__') && ['string', 'number', 'boolean'].includes(typeof v)).slice(0, 8);
  return (
    <dl className="mt-3 flex flex-col gap-2 text-[12px]">
      <div className="flex justify-between gap-3"><dt className="text-muted">Name</dt><dd className="truncate text-right text-ink">{obj.name || '—'}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted">Type</dt><dd className="text-ink">{obj.type}</dd></div>
      {mat && <div className="flex justify-between gap-3"><dt className="text-muted">Material</dt><dd className="truncate text-right text-ink">{(mat as THREE.Material).name || (mat as THREE.Material).type}</dd></div>}
      {tris != null && <div className="flex justify-between gap-3"><dt className="text-muted">Triangles</dt><dd className="num text-ink">{Math.round(tris).toLocaleString('en-GB')}</dd></div>}
      {ud.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><dt className="truncate text-muted">{k}</dt><dd className="truncate text-right text-ink">{String(v)}</dd></div>)}
      {ud.length === 0 && <p className="text-[11px] text-faint">No embedded metadata on this element. BIM properties appear here when the export includes them.</p>}
    </dl>
  );
}

function DropPrompt({ onPick }: { onPick: () => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div aria-hidden className="absolute inset-0 opacity-[0.55]" style={{ backgroundImage: 'linear-gradient(rgb(232 225 213 / .05) 1px, transparent 1px), linear-gradient(90deg, rgb(232 225 213 / .05) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      <svg aria-hidden viewBox="0 0 220 140" className="absolute w-[min(70%,520px)] opacity-[0.16]" fill="none" stroke="#E8E1D5" strokeWidth=".7">
        <path d="M30 100 L110 60 L190 100 L110 140 Z" /><path d="M30 100 V60 L110 20 L190 60 V100" /><path d="M110 60 V20 M110 140 V100 L30 60 M110 100 L190 60" strokeDasharray="2 3" />
      </svg>
      <div className="relative px-6 text-center">
        <div className="eyebrow text-stone">Model viewer</div>
        <div className="display mt-3 text-[clamp(30px,4vw,48px)] leading-none text-chalk">Bring the model <em className="italic text-bronze">in.</em></div>
        <p className="mx-auto mt-3 max-w-[40ch] text-[13px] leading-relaxed text-stone">Drop a GLB, glTF, FBX, OBJ, STL, PLY, DAE or 3MF file here — or choose one from your computer.</p>
        <Button variant="inverse" size="md" className="mt-6" icon={<Upload size={15} />} onClick={onPick}>Choose files</Button>
      </div>
    </div>
  );
}

function ViewportMessage({ title, body, progress, busy, error, action }: { title: string; body?: string; progress?: number | null; busy?: boolean; error?: boolean; action?: React.ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <div className="w-full max-w-[360px] text-center">
        {error ? <Layers3 size={22} className="mx-auto text-[#D68679]" /> : <Box size={22} className="mx-auto text-bronze" />}
        <div className="mt-4 text-[15px] text-chalk">{title}</div>
        {body && <p className="mt-2 text-[12.5px] leading-relaxed text-stone">{body}</p>}
        {busy && (
          <div className="mt-5">
            {progress != null ? (
              <><div className="h-[2px] w-full overflow-hidden rounded-full bg-chalk/10"><div className="h-full bg-bronze transition-[width] duration-glide" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
                <div className="num mt-2 text-[11px] text-stone">{Math.round(progress * 100)}%</div></>
            ) : <IndeterminateBar className="bg-chalk/10" />}
          </div>
        )}
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

