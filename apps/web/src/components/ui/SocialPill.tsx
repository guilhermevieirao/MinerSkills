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
  // e-mail e telefone abrem o app do sistema, não uma aba nova
  const external = /^https?:/i.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: '_blank' } : {})}
      rel="noopener noreferrer"
      className={cx('ms-socialpill', className)}
    >
      <SocialIcon platform={platform} />
      <span>{label}</span>
      {external && <span className="ms-visually-hidden"> (abre em nova aba)</span>}
    </a>
  );
}
