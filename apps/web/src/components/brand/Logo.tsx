import brand from './paths.json';

interface LogoProps {
  className?: string;
  /** Nome acessível (quando a marca é conteúdo, ex.: link para a Home). */
  title?: string;
  /**
   * Marca decorativa — ao lado de um texto que já a nomeia (rodapé, login, hero):
   * sai da árvore de acessibilidade em vez de ser anunciada como imagem.
   */
  decorative?: boolean;
}

/** Atributos ARIA de uma marca: imagem nomeada ou puramente decorativa. */
function a11y(title: string, decorative?: boolean) {
  return decorative
    ? ({ 'aria-hidden': true, focusable: 'false' } as const)
    : ({ role: 'img', 'aria-label': title } as const);
}

/**
 * Cor do "miolo" do selo e da lâmpada do capacete: por padrão o fundo da página;
 * quem coloca a marca sobre outra superfície redefine `--ms-logo-bg`.
 */
const LOGO_BG = 'var(--ms-logo-bg, var(--ms-bg))';

/**
 * Marca "MINERSKILLS": o M é desenhado com o capacete de minerador (ícone da
 * marca) e completa a palavra com "INERSKILLS" em Chakra Petch — fonte self-hosted,
 * sempre presente (a geometria vem de paths.json, compartilhado com o favicon e os
 * ícones PWA). Usa currentColor.
 */
export function LogoWordmark({
  className,
  title = 'MinerSkills',
  decorative,
}: LogoProps) {
  const w = brand.wordmark;
  return (
    <svg
      className={className}
      viewBox={w.viewBox}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...a11y(title, decorative)}
    >
      <path d={w.helmet} />
      <circle cx={w.lamp.cx} cy={w.lamp.cy} r={w.lamp.r} fill={LOGO_BG} />
      <circle
        cx={w.lampLight.cx}
        cy={w.lampLight.cy}
        r={w.lampLight.r}
        fill="currentColor"
      />
      <path d={w.m} />
      <text
        x={w.text.x}
        y={w.text.y}
        fontFamily="'Chakra Petch', system-ui, sans-serif"
        fontWeight="700"
        fontSize={w.text.size}
        letterSpacing={w.text.letterSpacing}
        fill="currentColor"
      >
        {w.text.content}
      </text>
    </svg>
  );
}

/** Selo circular MINERSKILLS-10019. */
export function LogoBadge({
  className,
  title = 'MinerSkills #10019',
  decorative,
}: LogoProps) {
  const b = brand.badge;
  return (
    <svg
      className={className}
      viewBox={b.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      {...a11y(title, decorative)}
    >
      <circle cx="60" cy="60" r={b.ring.outer} fill="currentColor" />
      <circle cx="60" cy="60" r={b.ring.inner} fill={LOGO_BG} />
      <circle
        cx="60"
        cy="60"
        r={b.ring.dashed}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      {/* picaretas cruzadas */}
      <g stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
        {b.picks.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {/* capacete + M */}
      <path d={b.helmet} fill="currentColor" />
      <circle cx={b.lamp.cx} cy={b.lamp.cy} r={b.lamp.r} fill={LOGO_BG} />
      <path d={b.m} fill="currentColor" />
    </svg>
  );
}

/** Mascote: capacete de minerador (ícone compacto). */
export function LogoMark({ className, title = 'MinerSkills', decorative }: LogoProps) {
  const m = brand.mark;
  return (
    <svg
      className={className}
      viewBox={m.viewBox}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...a11y(title, decorative)}
    >
      <path d={m.helmet} />
      <circle cx={m.lamp.cx} cy={m.lamp.cy} r={m.lamp.r} fill={LOGO_BG} />
      <path d={m.m} />
    </svg>
  );
}
