'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

interface ViewTransitionProps {
  children: ReactNode;
  viewKey: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.2,
};

export function ViewTransition({ children, viewKey }: ViewTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className="flex-1"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
