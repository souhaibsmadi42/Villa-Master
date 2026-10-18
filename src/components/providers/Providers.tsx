'use client';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';

// Global client providers. `reducedMotion="user"` makes every framer-motion
// animation honour prefers-reduced-motion (transforms are skipped, opacity kept).
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
