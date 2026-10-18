'use client';
import { motion } from 'framer-motion';
import { pageEnter } from '@/motion/variants';

// Re-mounts on every navigation inside the app: a brief, controlled content reveal.
export default function Template({ children }: { children: React.ReactNode }) {
  return <motion.div variants={pageEnter} initial="hidden" animate="show">{children}</motion.div>;
}
