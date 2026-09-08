import type { SponsorDTO } from '@minerskills/shared';
import { SectionHeading } from '../ui';
import { Reveal } from '../motion/Reveal';
import { useSponsors, groupSponsorsByTier } from '../../features/sponsors/useSponsors';
import { isWebUrl, mediaUrl } from '../../lib/format';
import './SponsorsStrip.scss';

/** Logo do patrocinador ou, sem imagem, o nome em destaque. */
function SponsorContent({ sponsor }: { sponsor: SponsorDTO }) {
  const logo = sponsor.logo;
  if (!logo) return <span className="ms-sponsors__name">{sponsor.name}</span>;
  return (
    <img
      className="ms-sponsors__logo"
      src={mediaUrl(logo.thumbUrl ?? logo.url)}
      alt={sponsor.name}
      width={logo.width ?? undefined}
      height={logo.height ?? undefined}
      loading="lazy"
    />
  );
}

/**
 * Faixa de patrocinadores da Home: grupos por nível (principal → apoio →
 * parceiro), cada um com link para o site quando houver. Não renderiza nada
 * enquanto carrega ou quando não há patrocinador ativo.
 */
export function SponsorsStrip() {
  const { data } = useSponsors();
  if (!data || data.length === 0) return null;
  const groups = groupSponsorsByTier(data);
  if (groups.length === 0) return null;

  return (
    <section className="ms-section ms-sponsors" aria-label="Patrocinadores e parceiros">
      <div className="ms-container">
        <Reveal>
          <SectionHeading center kicker="Apoio" title="Patrocinadores e parceiros" />
        </Reveal>
        {groups.map((group, i) => (
          <Reveal
            key={group.tier}
            delay={0.1 * (i + 1)}
            className={`ms-sponsors__group ms-sponsors__group--${group.tier}`}
          >
            <h3 className="ms-sponsors__tier">{group.label}</h3>
            <ul className="ms-sponsors__list">
              {group.items.map((s) => (
                <li key={s.id} className="ms-sponsors__item">
                  {isWebUrl(s.url) ? (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ms-sponsors__card"
                      title={s.name}
                    >
                      <SponsorContent sponsor={s} />
                    </a>
                  ) : (
                    <span className="ms-sponsors__card" title={s.name}>
                      <SponsorContent sponsor={s} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
