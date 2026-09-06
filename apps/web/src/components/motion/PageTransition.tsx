import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

/** Transição ao trocar de rota: entrada suave, saída rápida (só opacidade). */
export function PageTransition({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 12 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: reduce ? 0.2 : 0.35, ease: [0.22, 1, 0.36, 1] },
      }}
      exit={{
        opacity: 0,
        transition: { duration: reduce ? 0.1 : 0.15, ease: 'easeOut' },
      }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      {children}
    </motion.div>
  );
}
