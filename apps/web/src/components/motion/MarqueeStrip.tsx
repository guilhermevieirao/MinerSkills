import { cx } from '../../lib/format';
import './MarqueeStrip.scss';

interface MarqueeStripProps {
  text?: string;
  reverse?: boolean;
}

const REPEAT = 6;

/**
 * Faixa de texto rolante "MinerSkills · #10019 · FRC" (direto dos pôsteres da
 * marca). Puramente decorativa: fica fora da árvore de acessibilidade e para
 * com prefers-reduced-motion. O trilho tem DUAS cópias do mesmo grupo e anda
 * exatamente metade da largura: o laço fecha sem emenda em qualquer tela.
 */
export function MarqueeStrip({
  text = 'MinerSkills · #10019 · FRC ·',
  reverse,
}: MarqueeStripProps) {
  const group = (key: string) => (
    <div key={key} className="ms-marquee__group">
      {Array.from({ length: REPEAT }, (_, i) => (
        <span key={i} className="ms-marquee__item">
          {text}
        </span>
      ))}
    </div>
  );
  return (
    <div className="ms-marquee" aria-hidden="true">
      <div className={cx('ms-marquee__track', reverse && 'ms-marquee__track--reverse')}>
        {group('a')}
        {group('b')}
      </div>
    </div>
  );
}
