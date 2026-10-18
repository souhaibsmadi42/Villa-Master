'use client';
import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useShell } from '@/components/chrome/AppShell';
import { Button } from '@/components/ui/Button';

/** Opens the assistant with a prepared question. */
export function AskButton({ prompt, children, variant = 'secondary', size = 'sm', className }: {
  prompt: string; children: ReactNode; variant?: 'primary' | 'secondary' | 'ghost'; size?: 'xs' | 'sm' | 'md'; className?: string;
}) {
  const { openAssistant } = useShell();
  return (
    <Button variant={variant} size={size} className={className} icon={<Sparkles size={13} className="text-accent" />} onClick={() => openAssistant(prompt)}>
      {children}
    </Button>
  );
}
