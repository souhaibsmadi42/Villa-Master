import type { Variants } from 'framer-motion';
import { duration, ease, spring, stagger } from './tokens';

// Reveal content rising into place — the default entrance.
export const swoopIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: duration.swoop, ease: ease.swoop } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.glide, ease: ease.glide } },
};

export const staggerKids: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: stagger.base, delayChildren: 0.04 } },
};

export const staggerTight: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: stagger.tight } },
};

// Line-by-line headline reveal; wrap each line in an overflow-hidden span.
export const splitLineUp: Variants = {
  hidden: { y: '105%' },
  show: { y: 0, transition: { duration: 0.9, ease: ease.swoop } },
};

// Architectural image mask: opens from a horizontal slit.
export const maskReveal: Variants = {
  hidden: { clipPath: 'inset(48% 0% 48% 0%)' },
  show: { clipPath: 'inset(0% 0% 0% 0%)', transition: { duration: duration.cinematic, ease: ease.cinematic } },
};

export const cinematicReveal: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: ease.swoop } },
};

// Side sheets and drawers (from the right).
export const drawerIn: Variants = {
  hidden: { x: '100%' },
  show: { x: 0, transition: spring.panel },
  exit: { x: '100%', transition: { duration: duration.glide, ease: ease.glide } },
};

// Overlay scrim
export const scrim: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: duration.glide } },
  exit: { opacity: 0, transition: { duration: duration.quick } },
};

// Modals, palettes, popovers — small scale + lift.
export const popIn: Variants = {
  hidden: { opacity: 0, y: -6, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: spring.panel },
  exit: { opacity: 0, y: -4, scale: 0.985, transition: { duration: duration.quick, ease: ease.glide } },
};

// Route-level content entrance (see app/(app)/template.tsx).
export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: ease.swoop } },
};

// List rows entering / leaving (filters, live feeds).
export const rowIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: duration.glide, ease: ease.swoop } },
  exit: { opacity: 0, transition: { duration: duration.quick } },
};
