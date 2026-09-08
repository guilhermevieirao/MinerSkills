import { Link } from 'react-router-dom';
import { TEAM } from '@minerskills/shared';
import { LogoBadge } from '../brand/Logo';
import { SocialIcon } from './SocialIcon';
import { FOOTER_ITEMS } from './navItems';
import { useSocialLinks, useSettings } from '../../features/social/useSocial';
import { useSponsors, groupSponsorsByTier } from '../../features/sponsors/useSponsors';
import './Footer.scss';

const YEAR = new Date().getFullYear();

/** Textos exibidos enquanto a API não respondeu ou quando a chave está vazia. */
const FALLBACK = {
  motto: 'Escavamos conhecimento, construímos o futuro.',
  cityLine: `${TEAM.city} — ${TEAM.state}`,
  sponsors: 'FIEMG · SESI · SENAI',
};

export function Footer() {
  const { data: social } = useSocialLinks();
  const { data: settings } = useSettings();
  const { data: sponsors } = useSponsors();

  const motto = settings?.team_motto?.trim() || FALLBACK.motto;
  const cityLine = settings?.city_line?.trim() || FALLBACK.cityLine;
  const contactEmail = settings?.contact_email?.trim();
  // Patrocinadores ativos, principal primeiro; o texto fixo cobre carregamento e lista vazia.
  const sponsorNames = groupSponsorsByTier(sponsors ?? [])
    .flatMap((g) => g.items)
    .map((s) => s.name)
    .join(' · ');
  const sponsorLine = sponsorNames || FALLBACK.sponsors;

  return (
    <footer className="ms-footer">
      <div className="ms-footer__inner">
        <div className="ms-footer__brand">
          <LogoBadge className="ms-footer__badge" />
          <div>
            <p className="ms-footer__name">MinerSkills #10019</p>
            <p className="ms-footer__tag">{motto}</p>
            <p className="ms-footer__meta">FIRST Robotics Competition · {cityLine}</p>
            {contactEmail && (
              <p className="ms-footer__meta">
                <a href={`mailto:${contactEmail}`} className="ms-footer__mail">
                  {contactEmail}
                </a>
              </p>
            )}
          </div>
        </div>

        <nav className="ms-footer__nav" aria-label="Rodapé">
          <span className="ms-footer__col-title">Navegação</span>
          {FOOTER_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className="ms-footer__link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ms-footer__social">
          <span className="ms-footer__col-title">Redes</span>
          <div className="ms-footer__icons">
            {(social ?? []).map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ms-footer__icon"
                aria-label={link.label}
                title={link.label}
              >
                <SocialIcon platform={link.platform} />
              </a>
            ))}
          </div>
          <p className="ms-footer__credit">Apoio: {sponsorLine}</p>
        </div>
      </div>

      <div className="ms-footer__bottom">
        <span>© {YEAR} MinerSkills #10019. Todos os direitos reservados.</span>
        <span className="ms-footer__mono">FRC · FIRST · STEM</span>
      </div>
    </footer>
  );
}
