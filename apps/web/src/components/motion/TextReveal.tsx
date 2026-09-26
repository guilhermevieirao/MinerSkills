import { Fragment } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EASE } from '../../lib/motion';
import './TextReveal.scss';

/**
 * Título que entra por partes: cada palavra (ou letra) sobe de dentro de uma
 * máscara, em sequência. Por palavras, o texto fica no DOM como texto corrido
 * (espaços reais entre elas). Por letras, as partes viram `aria-hidden` e o
 * texto inteiro vai numa cópia só para leitores de tela — letras em
 * `inline-block` fariam o nome acessível virar "M I N E R…".
 * `trigger="mount"` anima ao montar (cabeçalhos no topo da página);
 * `"view"` anima quando entra na tela, uma vez.
 */
export function TextReveal({
  text,
  split = 'words',
  trigger = 'view',
  delay = 0,
}: {
  text: string;
  split?: 'words' | 'chars';
  trigger?: 'view' | 'mount';
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);
  const step = split === 'chars' ? 0.035 : 0.06;

  const hidden = reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(105%)' };
  const shown = { opacity: 1, transform: 'translateY(0%)' };
  const play = trigger === 'mount' ? { animate: 'shown' } : { whileInView: 'shown' };

  const chars = split === 'chars';
  let n = 0;
  return (
    <span className="ms-reveal-text">
      {chars && <span className="ms-visually-hidden">{text}</span>}
      <motion.span
        aria-hidden={chars || undefined}
        initial="hidden"
        {...play}
        viewport={{ once: true, amount: 0.6 }}
      >
        {words.map((word, wi) => {
          const parts = chars ? [...word] : [word];
          return (
            <Fragment key={wi}>
              {wi > 0 && ' '}
              <span className="ms-reveal-text__word">
                {parts.map((part, pi) => (
                  <motion.span
                    key={pi}
                    className="ms-reveal-text__part"
                    variants={{
                      hidden,
                      shown: {
                        ...shown,
                        transition: {
                          duration: 0.8,
                          ease: EASE,
                          delay: delay + n++ * step,
                        },
                      },
                    }}
                  >
                    {part}
                  </motion.span>
                ))}
              </span>
            </Fragment>
          );
        })}
      </motion.span>
    </span>
  );
}
