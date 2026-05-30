import Link from 'next/link';
import { ActivityDetailContent } from '@/components/activity/ActivityDetailContent';

export const dynamic = 'force-dynamic';

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-6">
      <Link href="/timeline" className="text-[12px] text-stone hover:text-bark">← Back to timeline</Link>
      <ActivityDetailContent id={id} />
    </div>
  );
}
