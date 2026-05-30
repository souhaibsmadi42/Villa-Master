'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Called after the browser has uploaded the file to Storage at `storagePath`.
export async function recordUpload(input: {
  projectId: string; title: string; category: string; storagePath: string;
  sizeBytes?: number; mime?: string; documentId?: string;
}) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  let documentId = input.documentId;
  let version = 1;

  if (documentId) {
    const { data: doc } = await sb.from('document').select('current_version').eq('id', documentId).single();
    version = (doc?.current_version ?? 0) + 1;
    await sb.from('document').update({ current_version: version, status: 'submitted' }).eq('id', documentId);
  } else {
    const { data: doc, error } = await sb.from('document').insert({
      project_id: input.projectId, title: input.title, category: input.category as any,
      current_version: 1, status: 'submitted', created_by: user?.id ?? null,
    }).select().single();
    if (error) return { ok: false, error: error.message };
    documentId = doc!.id;
  }

  const { error: ve } = await sb.from('document_version').insert({
    document_id: documentId, version, storage_path: input.storagePath,
    size_bytes: input.sizeBytes ?? null, mime: input.mime ?? null, uploaded_by: user?.id ?? null,
  });
  if (ve) return { ok: false, error: ve.message };

  revalidatePath('/documents');
  return { ok: true, documentId, version };
}

export async function decideDocument(documentId: string, decision: 'approved' | 'rejected') {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const { error } = await sb.from('document').update({ status: decision }).eq('id', documentId);
  if (error) return { ok: false, error: error.message };
  const { data: doc } = await sb.from('document').select('project_id').eq('id', documentId).single();
  if (doc) await sb.from('approval').insert({
    project_id: doc.project_id, subject_type: 'document', subject_id: documentId,
    reviewer: user?.id ?? null, decision, decided_at: new Date().toISOString(),
  });
  revalidatePath('/documents');
  return { ok: true };
}

// Returns a short-lived signed URL and records the download.
export async function getDownloadUrl(documentId: string, storagePath: string) {
  const sb = await createClient();
  const { data, error } = await sb.storage.from('documents').createSignedUrl(storagePath, 120);
  if (error) return { ok: false, error: error.message };
  const { data: { user } } = await sb.auth.getUser();
  await sb.from('document_download').insert({ document_id: documentId, downloaded_by: user?.id ?? null });
  return { ok: true, url: data.signedUrl };
}
