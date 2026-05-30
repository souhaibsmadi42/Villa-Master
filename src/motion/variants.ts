import type { Variants } from 'framer-motion';

export const swoopIn: Variants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0,
            transition: { duration: 0.48, ease: [0.16, 1, 0.3, 1] } },
};

export const staggerKids: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const drawerIn: Variants = {
  hidden: { x: '100%' },
  show:   { x: 0, transition: { duration: 0.32, ease: [0.22, 0.61, 0.36, 1] } },
};

export const cinematicReveal: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(8px)' },
  show:   { opacity: 1, y: 0, filter: 'blur(0px)',
            transition: { duration: 0.9, ease: [0.85, 0, 0.15, 1] } },
};

export const splitLineUp: Variants = {
  hidden: { y: '100%' },
  show:   { y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
