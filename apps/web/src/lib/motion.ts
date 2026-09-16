/**
 * Tokens de movimento para o motion/react — espelho de `--ms-ease` e `--ms-dur*`
 * em `styles/_motion.scss` (`styles/tokens.sync.test.ts` garante a igualdade).
 * Animações em CSS usam os tokens; animações em JS usam estas constantes.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Durações em segundos (o motion trabalha em s; o CSS, em ms). */
export const DUR = { fast: 0.15, base: 0.25, slow: 0.5 } as const;
