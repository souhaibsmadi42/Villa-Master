import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ActivityDetailContent } from '@/components/activity/ActivityDetailContent';

export const dynamic = 'force-dynamic';

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-6">
      <Link href="/timeline" className="inline-flex w-fit items-center gap-1.5 text-[12.5px] text-muted hover:text-ink"><ArrowLeft size={14} /> Back to timeline</Link>
      <ActivityDetailContent id={id} />
    </div>
  );
}
