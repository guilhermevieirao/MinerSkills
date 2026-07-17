import './MarqueeStrip.scss';

interface MarqueeStripProps {
  text?: string;
  reverse?: boolean;
}

/** Faixa de texto rolante "MINERSKILLS 10019 FRC" (direto dos pôsteres da marca). */
export function MarqueeStrip({ text = 'MINERSKILLS · 10019 · FRC ·', reverse }: MarqueeStripProps) {
  const content = Array.from({ length: 8 }, (_, i) => (
    <span key={i} className="ms-marquee__item" aria-hidden={i > 0}>
      {text}
    </span>
  ));
  return (
    <div className="ms-marquee" role="marquee">
      <div className={`ms-marquee__track ${reverse ? 'ms-marquee__track--reverse' : ''}`}>
        {content}
      </div>
    </div>
  );
}
