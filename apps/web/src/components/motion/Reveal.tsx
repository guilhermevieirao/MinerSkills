import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';
import { DUR, EASE } from '../../lib/motion';

interface RevealProps {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
  once?: boolean;
}

/** Envolve conteúdo com animação de entrada no viewport. Respeita reduced-motion. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = 'div',
  once = true,
}: RevealProps) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];

  const variants: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : y },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: DUR.slow, ease: EASE, delay },
    },
  };

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.2 }}
      variants={variants}
    >
      {children}
    </MotionTag>
  );
}

/** Container que escalona a entrada dos filhos (usar com <RevealItem>). */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ visible: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
  y = 20,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduce ? 0 : y },
        visible: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}
