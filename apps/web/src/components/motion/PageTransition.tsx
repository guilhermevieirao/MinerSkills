import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { DUR, EASE } from '../../lib/motion';

/** Transição ao trocar de rota: entrada suave, saída rápida (só opacidade). */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: reduce ? DUR.fast : DUR.base, ease: EASE },
      }}
      exit={{
        opacity: 0,
        transition: { duration: DUR.fast, ease: 'easeOut' },
      }}
      className="ms-page"
    >
      {children}
    </motion.div>
  );
}
