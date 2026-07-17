import './HexPattern.scss';

/** Textura hexagonal de fundo (SVG inline) — decorativa, ecoa os pôsteres. */
export function HexPattern({ className }: { className?: string }) {
  return (
    <div className={`ms-hex ${className ?? ''}`} aria-hidden="true">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="ms-hex-pat" width="56" height="64" patternUnits="userSpaceOnUse">
            <path
              d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ms-hex-pat)" />
      </svg>
    </div>
  );
}
