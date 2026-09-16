import { SocialIcon } from '../layout/SocialIcon';
import { cx } from '../../lib/format';

/** Link para uma rede social com ícone e rótulo (Como entrar, Contato). */
export function SocialPill({
  platform,
  label,
  href,
  className,
}: {
  platform: string;
  label: string;
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx('ms-socialpill', className)}
    >
      <SocialIcon platform={platform} />
      <span>{label}</span>
      <span className="ms-visually-hidden"> (abre em nova aba)</span>
    </a>
  );
}
