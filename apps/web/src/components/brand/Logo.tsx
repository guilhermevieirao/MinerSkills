interface LogoProps {
  className?: string;
  title?: string;
}

/**
 * Marca "MINERSKILLS": o M é desenhado com o capacete de minerador (ícone da
 * marca) e completa a palavra com "INERSKILLS" — lê-se MINERSKILLS.
 * Usa currentColor.
 */
export function LogoWordmark({ className, title = 'MinerSkills' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 330 64"
      role="img"
      aria-label={title}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* capacete sobre o M */}
      <path d="M6 20 a21 16 0 0 1 42 0 l0 3 -42 0 z" />
      <circle cx="27" cy="15" r="5" fill="var(--ms-black, #0a0a0a)" />
      <circle cx="28.6" cy="13.4" r="1.7" fill="currentColor" />
      {/* letra M (altura total, alinhada ao texto) */}
      <path d="M5 26 h10 v33 h-10 z M39 26 h10 v33 h-10 z M15 26 h7 l5 11 l5 -11 h7 v11 l-8 14 h-8 l-8 -14 z" />
      {/* restante da palavra */}
      <text
        x="55"
        y="59"
        fontFamily="'Chakra Petch', sans-serif"
        fontWeight="700"
        fontSize="42"
        letterSpacing="0.5"
        fill="currentColor"
      >
        INERSKILLS
      </text>
    </svg>
  );
}

/** Selo circular MINERSKILLS-10019. */
export function LogoBadge({ className, title = 'MinerSkills #10019' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="60" cy="60" r="58" fill="currentColor" />
      <circle cx="60" cy="60" r="48" fill="var(--ms-black, #0a0a0a)" />
      <circle
        cx="60"
        cy="60"
        r="44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      {/* picaretas cruzadas */}
      <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
        <path d="M32 80 L78 42" />
        <path d="M88 80 L42 42" />
      </g>
      {/* capacete + M */}
      <path d="M44 44 a16 12 0 0 1 32 0 l0 3 -32 0 z" fill="currentColor" />
      <circle cx="60" cy="40" r="4" fill="var(--ms-black, #0a0a0a)" />
      <path
        d="M42 50 h6 v30 h-6 z M72 50 h6 v30 h-6 z M48 50 h5 l7 12 l7 -12 h5 v9 l-7 11 h-5 l-7 -11 z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Mascote: capacete de minerador (ícone compacto). */
export function LogoMark({ className, title = 'MinerSkills' }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20 22 a12 9 0 0 1 24 0 l0 3 -24 0 z" />
      <circle cx="32" cy="18" r="3.4" fill="var(--ms-black, #0a0a0a)" />
      <path d="M18 28 h6 v20 h-6 z M40 28 h6 v20 h-6 z M24 28 h4 l4 8 l4 -8 h4 v7 l-4 7 h-4 l-4 -7 z" />
    </svg>
  );
}
