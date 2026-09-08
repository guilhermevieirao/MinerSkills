import './MarqueeStrip.scss';

interface MarqueeStripProps {
  text?: string;
  reverse?: boolean;
}

/**
 * Faixa de texto rolante "MINERSKILLS 10019 FRC" (direto dos pôsteres da marca).
 * Puramente decorativa: fica fora da árvore de acessibilidade — o texto repetido
 * oito vezes não diz nada ao leitor de tela — e para com prefers-reduced-motion.
 */
export function MarqueeStrip({ text = 'MINERSKILLS · 10019 · FRC ·', reverse }: MarqueeStripProps) {
  const content = Array.from({ length: 8 }, (_, i) => (
    <span key={i} className="ms-marquee__item">
      {text}
    </span>
  ));
  return (
    <div className="ms-marquee" aria-hidden="true">
      <div className={`ms-marquee__track ${reverse ? 'ms-marquee__track--reverse' : ''}`}>
        {content}
      </div>
    </div>
  );
}
