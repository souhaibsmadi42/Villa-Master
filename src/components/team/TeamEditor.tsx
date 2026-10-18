'use client';
import { useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { UserPlus, Pencil, Trash2 } from 'lucide-react';
import { upsertTeamMember, removeTeamMember } from '@/app/(app)/team/actions';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { rowIn } from '@/motion/variants';

type Member = { email: string; role: string; contractor_id: string | null; full_name: string | null };
type Contractor = { id: string; name: string };
const ROLES = [
  { v: 'owner', d: 'Sees everything, read-only; approves decisions' },
  { v: 'consultant', d: 'Edits programme and deliverables; approves' },
  { v: 'contractor', d: 'Sees and updates only their own scope' },
];
const roleTone = (r: string) => (r === 'owner' ? 'accent' : r === 'consultant' ? 'info' : r === 'admin' ? 'warning' : 'neutral') as 'accent' | 'info' | 'warning' | 'neutral';

export function TeamEditor({ members, contractors }: { members: Member[]; contractors: Contractor[] }) {
  const toast = useToast();
  const [confirm, dialog] = useConfirm();
  const [list, setList] = useState(members);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('contractor');
  const [contractorId, setContractorId] = useState('');
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const cname = (id: string | null) => contractors.find(c => c.id === id)?.name ?? 'No scope set';

  function reset() { setEmail(''); setName(''); setRole('contractor'); setContractorId(''); setEditing(false); }

  function save(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await upsertTeamMember({ email, fullName: name, role, contractorId: role === 'contractor' ? contractorId || null : null });
      if (!r.ok) { toast.error('Could not save', r.error); return; }
      const row = { email: email.trim().toLowerCase(), role, contractor_id: role === 'contractor' ? (contractorId || null) : null, full_name: name || null };
      setList(prev => (prev.some(m => m.email === row.email) ? prev.map(m => (m.email === row.email ? { ...m, ...row } : m)) : [...prev, row]));
      toast.success(editing ? 'Access updated' : 'Person added', row.email);
      reset();
    });
  }
  async function remove(em: string) {
    if (!(await confirm({ title: `Remove ${em}?`, body: 'They lose their role and drop to contractor access with no scope.', confirmLabel: 'Remove', danger: true }))) return;
    start(async () => {
      const r = await removeTeamMember(em);
      if (!r.ok) { toast.error('Could not remove', r.error); return; }
      setList(prev => prev.filter(m => m.email !== em));
      toast.success('Access removed', em);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Panel className="h-fit p-6 lg:sticky lg:top-24">
        <PanelHeader label={editing ? 'Edit access' : 'Add a person'} />
        <form onSubmit={save} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5"><span className="label">Email</span>
            <input type="email" required value={email} readOnly={editing} onChange={e => setEmail(e.target.value)} placeholder="person@example.com" className="field" /></label>
          <label className="flex flex-col gap-1.5"><span className="label">Name</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Display name" className="field" /></label>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="label mb-1.5">Role</legend>
            {ROLES.map(r => (
              <label key={r.v} className={`flex cursor-pointer items-start gap-3 rounded-[9px] border p-3 transition ${role === r.v ? 'border-accent bg-accent/[0.05]' : 'border-line hover:border-line-strong'}`}>
                <input type="radio" name="role" value={r.v} checked={role === r.v} onChange={() => setRole(r.v)} className="mt-0.5 accent-[rgb(var(--c-accent))]" />
                <span><span className="block text-[13px] capitalize text-ink">{r.v}</span><span className="block text-[11.5px] text-muted">{r.d}</span></span>
              </label>
            ))}
          </fieldset>
          <AnimatePresence>
            {role === 'contractor' && (
              <motion.label initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-col gap-1.5 overflow-hidden">
                <span className="label">Contractor scope</span>
                <select value={contractorId} onChange={e => setContractorId(e.target.value)} className="field">
                  <option value="">— none —</option>{contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </motion.label>
            )}
          </AnimatePresence>
          <div className="flex gap-2">
            <Button type="submit" variant="primary" loading={pending} icon={<UserPlus size={14} />} className="flex-1">{editing ? 'Save changes' : 'Add person'}</Button>
            {editing && <Button variant="ghost" onClick={reset}>Cancel</Button>}
          </div>
          <p className="text-[11px] leading-relaxed text-faint">The role applies the moment they sign in. You, the admin, always keep full access.</p>
        </form>
      </Panel>

      <Panel className="overflow-hidden p-0">
        <div className="border-b border-line px-5 py-4"><PanelHeader label="People with access" meta={list.length} /></div>
        <ul>
          <AnimatePresence initial={false}>
            {list.map(m => (
              <motion.li key={m.email} variants={rowIn} initial="hidden" animate="show" exit="exit" layout="position"
                className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-5 py-3.5 last:border-0">
                <span className="num grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink/[0.06] text-[10.5px] text-ink-2">{(m.full_name || m.email).slice(0, 2).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink">{m.full_name || m.email}</span>
                  <span className="block truncate text-[11.5px] text-muted">{m.full_name ? m.email : ''}{m.role === 'contractor' ? `${m.full_name ? ' · ' : ''}${cname(m.contractor_id)}` : ''}</span>
                </span>
                <Badge tone={roleTone(m.role)}>{m.role}</Badge>
                <span className="flex gap-1">
                  <IconButton size="sm" label={`Edit ${m.email}`} onClick={() => { setEmail(m.email); setName(m.full_name ?? ''); setRole(m.role); setContractorId(m.contractor_id ?? ''); setEditing(true); }}><Pencil size={13} /></IconButton>
                  <IconButton size="sm" label={`Remove ${m.email}`} onClick={() => remove(m.email)} className="hover:text-critical"><Trash2 size={13} /></IconButton>
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {list.length === 0 && <EmptyState compact title="No team members yet" body="Add people on the left to give them access." />}
      </Panel>
      {dialog}
    </div>
  );
}
