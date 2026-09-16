import type { SponsorDTO } from '@minerskills/shared';
import { SectionHeading, Skeleton } from '../ui';
import { MediaImage } from '../ui/MediaImage';
import { useSponsors, groupSponsorsByTier } from '../../features/sponsors/useSponsors';
import { isWebUrl } from '../../lib/format';
import './SponsorsStrip.scss';

/** Logo do patrocinador ou, sem imagem, o nome em destaque. */
function SponsorContent({ sponsor }: { sponsor: SponsorDTO }) {
  const logo = sponsor.logo;
  if (!logo) return <span className="ms-sponsors__name">{sponsor.name}</span>;
  return (
    <MediaImage className="ms-sponsors__logo" media={logo} alt={sponsor.name} thumb />
  );
}

/**
 * Faixa de patrocinadores da Home: grupos por nível (principal → apoio →
 * parceiro), cada um com link para o site quando houver. Reserva a altura
 * enquanto carrega; sem patrocinador ativo (ou com erro) não renderiza nada.
 * `.ms-sponsors`, `a.ms-sponsors__card` e `span.ms-sponsors__card` são lidos
 * pela suíte e2e.
 */
export function SponsorsStrip() {
  const sponsors = useSponsors();

  if (sponsors.data === undefined) {
    if (sponsors.isError || sponsors.fetchStatus === 'paused') return null;
    return (
      <section className="ms-section ms-sponsors ms-sponsors--loading" aria-hidden>
        <div className="ms-container ms-sponsors__skeleton">
          <Skeleton height={12} width={120} />
          <Skeleton height={32} width={320} />
          <div className="ms-sponsors__list">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} height={88} width={180} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const groups = groupSponsorsByTier(sponsors.data);
  if (groups.length === 0) return null;

  return (
    <section className="ms-section ms-sponsors" aria-labelledby="ms-sponsors-title">
      <div className="ms-container">
        <SectionHeading
          id="ms-sponsors-title"
          center
          kicker="Apoio"
          title="Patrocinadores e parceiros"
        />
        {groups.map((group) => (
          <div
            key={group.tier}
            className={`ms-sponsors__group ms-sponsors__group--${group.tier}`}
          >
            <h3 className="ms-sponsors__tier">{group.label}</h3>
            <ul className="ms-sponsors__list" role="list">
              {group.items.map((s) => (
                <li key={s.id} className="ms-sponsors__item">
                  {isWebUrl(s.url) ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ms-sponsors__card"
                      aria-label={`${s.name} (abre em nova aba)`}
                    >
                      <SponsorContent sponsor={s} />
                    </a>
                  ) : (
                    <span className="ms-sponsors__card">
                      <SponsorContent sponsor={s} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
