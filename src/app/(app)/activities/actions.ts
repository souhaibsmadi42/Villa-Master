'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// All mutations run with the user's session → RLS decides if they're allowed.

export async function updateActivity(id: string, patch: { progress?: number; status?: string; actual_start?: string | null; actual_end?: string | null }) {
  const sb = await createClient();
  const clean: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.progress != null) clean.progress = Math.max(0, Math.min(100, Math.round(patch.progress)));
  if (patch.status) clean.status = patch.status;
  if ('actual_start' in patch) clean.actual_start = patch.actual_start;
  if ('actual_end' in patch) clean.actual_end = patch.actual_end;
  const { error } = await sb.from('activity').update(clean).eq('id', id);
  if (error) return { ok: false, error: error.message };
  await logEvent(sb, 'updated', 'activity', id);
  revalidatePath(`/activities/${id}`); revalidatePath('/timeline'); revalidatePath('/dashboard');
  return { ok: true };
}

export async function upsertDeliverable(input: {
  id?: string; activityId: string; projectId: string; contractorId?: string | null;
  name: string; category?: string | null; priority: string; status: string; due_date?: string | null;
}) {
  const sb = await createClient();
  const row = {
    activity_id: input.activityId, project_id: input.projectId, contractor_id: input.contractorId ?? null,
    name: input.name.trim(), category: input.category ?? null, priority: input.priority,
    status: input.status, due_date: input.due_date || null, updated_at: new Date().toISOString(),
  };
  const q = input.id
    ? sb.from('deliverable').update(row).eq('id', input.id)
    : sb.from('deliverable').insert(row);
  const { error } = await q;
  if (error) return { ok: false, error: error.message };
  await logEvent(sb, input.id ? 'updated' : 'created', 'deliverable', input.id ?? input.activityId, input.name);
  revalidatePath(`/activities/${input.activityId}`); revalidatePath('/dashboard');
  return { ok: true };
}

export async function deleteDeliverable(id: string, activityId: string) {
  const sb = await createClient();
  const { error } = await sb.from('deliverable').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/activities/${activityId}`); revalidatePath('/dashboard');
  return { ok: true };
}

// Owner / consultant / admin approve or reject a deliverable (via SECURITY DEFINER fn).
export async function decideDeliverable(id: string, decision: 'approved' | 'rejected', activityId?: string) {
  const sb = await createClient();
  const { error } = await sb.rpc('approve_deliverable', { p_id: id, p_decision: decision });
  if (error) return { ok: false, error: error.message };
  if (activityId) revalidatePath(`/activities/${activityId}`);
  revalidatePath('/owner'); revalidatePath('/dashboard');
  return { ok: true };
}

export async function addComment(input: { projectId: string; subjectType: string; subjectId: string; body: string }) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('comment').insert({
    project_id: input.projectId, subject_type: input.subjectType, subject_id: input.subjectId,
    author: user?.id ?? null, body: input.body.trim(),
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/activities/${input.subjectId}`);
  return { ok: true };
}

async function logEvent(sb: Awaited<ReturnType<typeof createClient>>, verb: string, subjectType: string, subjectId: string, text?: string) {
  try {
    const { data: { user } } = await sb.auth.getUser();
    const { data: prof } = user ? await sb.from('profile').select('full_name,email').eq('user_id', user.id).single() : { data: null };
    // project_id is required; fetch it from the subject lazily is overkill — use the single project.
    const { data: proj } = await sb.from('project').select('id').limit(1).single();
    if (!proj) return;
    await sb.from('event_log').insert({
      project_id: proj.id, actor: user?.id ?? null,
      actor_name: prof?.full_name || prof?.email || 'Someone',
      verb, subject_type: subjectType, subject_id: subjectId, subject_text: text ?? null,
    });
  } catch { /* non-fatal */ }
}
