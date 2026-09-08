import { useId } from 'react';
import './HexPattern.scss';

/**
 * Textura hexagonal de fundo (SVG inline) — decorativa, ecoa os pôsteres.
 * O id do `<pattern>` é único por instância: a Home renderiza várias e ids
 * repetidos fazem todos os `fill="url(#…)"` apontarem para o primeiro SVG.
 */
export function HexPattern({ className }: { className?: string }) {
  // useId devolve ':r1:' — os dois-pontos não são válidos dentro de url(#…).
  const patternId = `ms-hex-pat${useId().replace(/:/g, '-')}`;
  return (
    <div className={`ms-hex ${className ?? ''}`} aria-hidden="true">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={patternId} width="56" height="64" patternUnits="userSpaceOnUse">
            <path
              d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}
