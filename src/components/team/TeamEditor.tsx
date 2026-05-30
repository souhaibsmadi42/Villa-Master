'use client';
import { useState, useTransition } from 'react';
import { upsertTeamMember, removeTeamMember } from '@/app/(app)/team/actions';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Pill } from '@/components/ui/Pill';

type Member = { email: string; role: string; contractor_id: string | null; full_name: string | null; active?: boolean };
type Contractor = { id: string; name: string };
const ROLES = ['owner', 'consultant', 'contractor'];

export function TeamEditor({ members, contractors }: { members: Member[]; contractors: Contractor[] }) {
  const [list, setList] = useState(members);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('contractor');
  const [contractorId, setContractorId] = useState('');
  const [msg, setMsg] = useState<{ k: 'ok' | 'err'; t: string } | null>(null);
  const [pending, start] = useTransition();
  const cname = (id: string | null) => contractors.find(c => c.id === id)?.name ?? '—';

  function save(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    start(async () => {
      const r = await upsertTeamMember({ email, fullName: name, role, contractorId: role === 'contractor' ? contractorId || null : null });
      if (!r.ok) { setMsg({ k: 'err', t: r.error! }); return; }
      setMsg({ k: 'ok', t: 'Saved.' });
      setList(prev => {
        const ex = prev.find(m => m.email === email.toLowerCase());
        const row = { email: email.toLowerCase(), role, contractor_id: role === 'contractor' ? (contractorId || null) : null, full_name: name || null };
        return ex ? prev.map(m => m.email === row.email ? { ...m, ...row } : m) : [...prev, row];
      });
      setEmail(''); setName(''); setRole('contractor'); setContractorId('');
    });
  }
  function remove(em: string) {
    if (!confirm(`Remove ${em}? They drop to contractor with no scope.`)) return;
    start(async () => { await removeTeamMember(em); setList(prev => prev.filter(m => m.email !== em)); });
  }

  return (
    <div className="flex flex-col gap-5">
      <GlassPanel className="p-6">
        <Eyebrow>Add or update a person</Eyebrow>
        <form onSubmit={save} className="mt-4 flex flex-wrap gap-3 items-end">
          <Field label="Email"><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="person@example.com" className="inp min-w-[220px]" /></Field>
          <Field label="Name"><input value={name} onChange={e => setName(e.target.value)} placeholder="Display name" className="inp" /></Field>
          <Field label="Role">
            <select value={role} onChange={e => setRole(e.target.value)} className="inp capitalize">{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
          </Field>
          {role === 'contractor' && (
            <Field label="Contractor scope">
              <select value={contractorId} onChange={e => setContractorId(e.target.value)} className="inp">
                <option value="">— none —</option>{contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
          <button disabled={pending} className="rounded-xl bg-bark text-cream px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50">Save</button>
        </form>
        {msg && <div className={`mt-3 text-[12.5px] ${msg.k === 'ok' ? 'text-[#3F6B45]' : 'text-iron'}`}>{msg.t}</div>}
        <p className="text-[11.5px] text-stone mt-3">Owners see everything (read-only). Consultants can edit + approve. Contractors see only their scope. The role is applied the moment they sign in.</p>
      </GlassPanel>

      <GlassPanel className="p-0 overflow-hidden">
        <table className="w-full">
          <thead><tr className="text-left text-[9.5px] tracking-eyebrow uppercase text-stone border-b border-border">
            <th className="px-4 py-3">Email</th><th className="px-3">Name</th><th className="px-3">Role</th><th className="px-3">Scope</th><th className="px-4"></th>
          </tr></thead>
          <tbody>
            {list.map(m => (
              <tr key={m.email} className="border-b border-border text-[13px] hover:bg-surface-2">
                <td className="px-4 py-3 text-text">{m.email}</td>
                <td className="px-3 text-stone">{m.full_name ?? '—'}</td>
                <td className="px-3"><Pill tone={m.role === 'owner' ? 'sun' : m.role === 'consultant' ? 'brass' : 'olive'}>{m.role}</Pill></td>
                <td className="px-3 text-stone">{m.role === 'contractor' ? cname(m.contractor_id) : 'all'}</td>
                <td className="px-4 text-right">
                  <button onClick={() => { setEmail(m.email); setName(m.full_name ?? ''); setRole(m.role); setContractorId(m.contractor_id ?? ''); }} className="text-[11.5px] text-olive hover:underline">edit</button>
                  <button onClick={() => remove(m.email)} className="ml-3 text-[11.5px] text-iron hover:underline">remove</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone italic text-[13px]">No team members yet — add one above. (You, the admin, always have full access.)</td></tr>}
          </tbody>
        </table>
      </GlassPanel>

      <style>{`.inp{font-family:inherit;font-size:13px;padding:9px 11px;border:1px solid var(--c-sand);background:var(--c-cream);border-radius:10px;outline:none}.inp:focus{border-color:var(--c-olive)}.field-l{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--c-stone);margin-bottom:5px;display:block}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col"><span className="field-l">{label}</span>{children}</div>;
}
