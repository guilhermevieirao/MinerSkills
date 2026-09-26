import { NavLink } from 'react-router-dom';
import { TEAM } from '@minerskills/shared';
import { LogoBadge } from '../brand/Logo';
import { SocialIcon } from './SocialIcon';
import { InstallPrompt } from '../pwa/InstallPrompt';
import { FOOTER_COLUMNS } from './navItems';
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

/**
 * Rodapé: marca, contato, redes e app à esquerda; três colunas de links que
 * espelham a navegação (A equipe · Conteúdo · Participe) à direita. Os títulos
 * das colunas são `<h2>` de verdade (visual de kicker) e cada link tem alvo de
 * toque. Classes `.ms-footer__link`, `.ms-footer__icons` e `.ms-footer__credit`
 * são lidas pela suíte e2e.
 */
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
      <div className="ms-container ms-footer__inner">
        <div className="ms-footer__brand">
          <div className="ms-footer__identity">
            <LogoBadge decorative className="ms-footer__badge" />
            <div>
              <p className="ms-footer__name">MinerSkills #10019</p>
              <p className="ms-footer__tag">{motto}</p>
            </div>
          </div>
          <p className="ms-footer__meta">FIRST Robotics Competition · {cityLine}</p>
          {contactEmail && (
            <a href={`mailto:${contactEmail}`} className="ms-footer__mail">
              {contactEmail}
            </a>
          )}

          {(social?.length ?? 0) > 0 && (
            <ul className="ms-footer__icons" role="list" aria-label="Redes sociais">
              {(social ?? []).map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    {...(/^https?:/i.test(link.url) ? { target: '_blank' } : {})}
                    rel="noopener noreferrer"
                    className="ms-footer__icon"
                    aria-label={
                      /^https?:/i.test(link.url)
                        ? `${link.label} (abre em nova aba)`
                        : link.label
                    }
                    title={link.label}
                  >
                    <SocialIcon platform={link.platform} />
                  </a>
                </li>
              ))}
            </ul>
          )}

          <p className="ms-footer__credit">Apoio: {sponsorLine}</p>

          {/* Só aparece quando o navegador oferece instalar o PWA */}
          <InstallPrompt
            className="ms-footer__install"
            description="Instale o site como aplicativo: abre direto da tela inicial, mesmo sem rede."
          />
        </div>

        <nav className="ms-footer__nav" aria-label="Rodapé">
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.key} className="ms-footer__col">
              <h2 className="ms-footer__col-title">{col.label}</h2>
              <ul role="list">
                {col.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end} className="ms-footer__link">
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="ms-footer__bottom">
        <div className="ms-container ms-footer__bottom-inner">
          <span>© {YEAR} MinerSkills #10019. Todos os direitos reservados.</span>
          <span className="ms-footer__mono">FRC · FIRST · STEM</span>
        </div>
      </div>
    </footer>
  );
}
