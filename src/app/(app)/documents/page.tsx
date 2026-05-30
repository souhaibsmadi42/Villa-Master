import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/rbac';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { DocumentCenter, type Doc } from '@/components/documents/DocumentCenter';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const sb = await createClient();
  const profile = await getSessionProfile();
  const role = profile?.role ?? 'contractor';

  const [{ data: project }, { data: documents }, { data: versions }, { data: downloads }] = await Promise.all([
    sb.from('project').select('id').limit(1).single(),
    sb.from('document').select('id,title,category,current_version,status').order('created_at', { ascending: false }),
    sb.from('document_version').select('document_id,version,storage_path,uploaded_at'),
    sb.from('document_download').select('document_id'),
  ]);

  const dlCount: Record<string, number> = {};
  for (const d of downloads ?? []) dlCount[d.document_id] = (dlCount[d.document_id] ?? 0) + 1;

  const docs: Doc[] = (documents ?? []).map(d => ({
    id: d.id, title: d.title, category: d.category, current_version: d.current_version, status: d.status,
    versions: (versions ?? []).filter(v => v.document_id === d.id).map(v => ({ version: v.version, storage_path: v.storage_path, uploaded_at: v.uploaded_at })),
    downloads: dlCount[d.id] ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Villa Ajloun · Documents</Eyebrow>
        <h1 className="font-display text-[clamp(28px,4vw,44px)] tracking-tighter mt-1">Document Center</h1>
        <p className="text-stone text-[13px]">Drawings, BOQ, RFIs, submittals — with versions, approvals, and download tracking.</p>
      </div>
      <DocumentCenter
        projectId={project?.id ?? ''}
        docs={docs}
        canApprove={role === 'admin' || role === 'consultant' || role === 'owner'}
        canUpload={role !== 'owner'}
      />
    </div>
  );
}
