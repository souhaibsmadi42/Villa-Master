import { Drawer } from '@/components/ui/Drawer';
import { ActivityDetailContent } from '@/components/activity/ActivityDetailContent';

export const dynamic = 'force-dynamic';

// Intercepts in-app navigation to /activities/[id] and shows it in a drawer.
// A hard load / refresh of that URL renders the full page instead.
export default async function ActivityModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Drawer>
      <ActivityDetailContent id={id} />
    </Drawer>
  );
}
