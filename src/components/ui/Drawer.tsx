'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Maximize2 } from 'lucide-react';
import { Sheet } from './Sheet';
import { IconButton } from './Button';

/**
 * Route drawer for the activity intercepting route. Plays its exit animation
 * before navigating back so the transition never cuts.
 */
export function Drawer({ children, eyebrow = 'Activity', fullHref }: { children: React.ReactNode; eyebrow?: string; fullHref?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(true); }, []);
  const close = useCallback(() => { setOpen(false); setTimeout(() => router.back(), 260); }, [router]);

  return (
    <Sheet open={open} onClose={close} eyebrow={eyebrow} label={eyebrow} width="sm:w-[720px]"
      actions={fullHref ? (
        <IconButton label="Open as full page" onClick={() => { window.location.href = fullHref; }}><Maximize2 size={15} /></IconButton>
      ) : undefined}>
      {children}
    </Sheet>
  );
}
