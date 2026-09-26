import { motion, useReducedMotion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';
import { EASE } from '../../lib/motion';

/** Entrada de vitrine: longa o bastante para ser lida como movimento, não como piscada. */
const REVEAL_DUR = 0.8;

/** Estado escondido: um pouco abaixo e desfocado — o conteúdo "entra em foco". */
function hiddenState(reduce: boolean | null, y: number) {
  return reduce ? { opacity: 0 } : { opacity: 0, y, filter: 'blur(8px)' };
}
const shown = { opacity: 1, y: 0, filter: 'blur(0px)' };

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
  y = 28,
  className,
  as = 'div',
  once = true,
}: RevealProps) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];

  const variants: Variants = {
    hidden: hiddenState(reduce, y),
    visible: { ...shown, transition: { duration: REVEAL_DUR, ease: EASE, delay } },
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

/**
 * Lista que escalona a entrada dos filhos (usar com <RevealItem>). Renderiza a
 * própria lista (`ul` por padrão) para os itens continuarem `li` semânticos.
 */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  as = 'ul',
  busy,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  as?: 'ul' | 'dl' | 'div';
  /** Lista trocando de conteúdo (paginação/filtro): `aria-busy`. */
  busy?: boolean;
}) {
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      aria-busy={busy || undefined}
      role={as === 'ul' ? 'list' : undefined}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ visible: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </MotionTag>
  );
}

export function RevealItem({
  children,
  className,
  y = 24,
  as = 'li',
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  as?: 'li' | 'div';
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      variants={{
        hidden: hiddenState(reduce, y),
        visible: { ...shown, transition: { duration: REVEAL_DUR, ease: EASE } },
      }}
    >
      {children}
    </MotionTag>
  );
}
