'use client';
import { useEffect, useRef } from 'react';

/**
 * A faint warm light that follows the pointer — atmosphere, not decoration.
 * Fine pointers only; off for touch and reduced motion. Updates a CSS transform
 * once per frame (no React re-renders).
 */
export function CursorLight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let x = -600, y = -600, tx = x, ty = y, frame = 0;
    const tick = () => {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      el.style.transform = `translate3d(${x - 260}px, ${y - 260}px, 0)`;
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.5) frame = requestAnimationFrame(tick); else frame = 0;
    };
    const onMove = (e: PointerEvent) => { tx = e.clientX; ty = e.clientY; el.style.opacity = '1'; if (!frame) frame = requestAnimationFrame(tick); };
    const onLeave = () => { el.style.opacity = '0'; };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', onMove); document.removeEventListener('pointerleave', onLeave); };
  }, []);

  return (
    <div ref={ref} aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[5] h-[520px] w-[520px] rounded-full opacity-0 mix-blend-soft-light transition-opacity duration-swoop"
      style={{ background: 'radial-gradient(circle, rgb(var(--c-bronze) / .32) 0%, transparent 62%)' }} />
  );
}
