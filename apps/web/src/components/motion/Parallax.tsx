import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { cx } from '../../lib/format';

/**
 * Paralaxe de foto: o conteúdo (uma imagem) é um pouco maior que a moldura e
 * desliza verticalmente enquanto a moldura atravessa a tela — a foto parece
 * estar atrás do bloco. Só transform; parado com reduced-motion.
 */
export function Parallax({
  children,
  className,
  strength = 8,
}: {
  children: ReactNode;
  className?: string;
  /** Deslocamento máximo em % da altura da moldura, para cada lado. */
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const transform = useTransform(
    scrollYProgress,
    [0, 1],
    [`translateY(${-strength}%) scale(1.18)`, `translateY(${strength}%) scale(1.18)`],
  );

  return (
    <div ref={ref} className={cx('ms-parallax', className)}>
      <motion.div
        className="ms-parallax__inner"
        style={reduce ? undefined : { transform }}
      >
        {children}
      </motion.div>
    </div>
  );
}
