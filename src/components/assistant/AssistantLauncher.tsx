'use client';
import { Sparkles } from 'lucide-react';
import { Magnet } from '@/components/ui/Magnet';
import { useShell } from '@/components/chrome/AppShell';

/** Floating launcher for the project assistant (also ⌘J / Ctrl+J). */
export function AssistantLauncher() {
  const { openAssistant } = useShell();
  return (
    <div className="fixed bottom-5 right-5 z-[90] sm:bottom-6 sm:right-6">
      <Magnet strength={0.16} radius={90}>
        <button onClick={() => openAssistant()} aria-label="Open project assistant"
          className="group flex h-12 items-center gap-2.5 rounded-full bg-primary pl-4 pr-5 text-on-primary shadow-e4 ring-1 ring-black/5 transition-[box-shadow,transform] duration-glide ease-glide hover:shadow-e5 active:scale-[0.97]">
          <Sparkles size={15} className="text-bronze transition-transform duration-swoop ease-swoop group-hover:rotate-[20deg]" />
          <span className="text-[13px] font-medium">Ask Villa</span>
        </button>
      </Magnet>
    </div>
  );
}
