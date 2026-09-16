import { Link } from 'react-router-dom';
import { ArrowRight, Cog, GraduationCap, Rocket } from 'lucide-react';
import { usePageBlocks } from '../features/content/useContent';
import { LinkButton, SectionHeading } from '../components/ui';
import { ErrorState } from '../components/ui/ErrorState';
import { MediaImage } from '../components/ui/MediaImage';
import { IconTile } from '../components/ui/tiles';
import { Reveal } from '../components/motion/Reveal';
import { MarqueeStrip } from '../components/motion/MarqueeStrip';
import { HexPattern } from '../components/motion/HexPattern';
import { StatsStrip } from '../components/layout/StatsStrip';
import { NextCompetition } from '../components/layout/NextCompetition';
import { LatestPosts } from '../components/layout/LatestPosts';
import { SponsorsStrip } from '../components/layout/SponsorsStrip';
import { LogoBadge } from '../components/brand/Logo';
import { cx } from '../lib/format';
import { useDocumentHead } from '../lib/useDocumentHead';
import './HomePage.scss';

const PILLARS = [
  { key: 'frc', icon: Cog, fallbackTitle: 'FIRST Robotics Competition' },
  { key: 'first', icon: Rocket, fallbackTitle: 'A FIRST' },
  { key: 'stem', icon: GraduationCap, fallbackTitle: 'Educação STEM' },
];

/**
 * Home: hero → números → marquee → próxima competição → quem somos → pilares →
 * últimas notícias → patrocinadores → chamada final. Um CTA primário por seção;
 * a cor da marca vira superfície só na chamada final.
 */
export function HomePage() {
  const blocks = usePageBlocks('landing');
  const { byKey, data } = blocks;

  const hero = byKey('hero');
  const about = byKey('about');
  const cta = byKey('cta');
  const stats = (data ?? []).filter((b) => b.key.startsWith('stat_'));

  // título vazio = só o nome do site; a descrição vem do bloco "Quem Somos"
  useDocumentHead({
    title: '',
    description: about?.subtitle || about?.body || undefined,
    canonicalPath: '/',
  });

  return (
    <>
      {/* ─── HERO (sob a navbar transparente) ─────────────── */}
      <section className={cx('ms-hero', hero?.media && 'ms-hero--photo')}>
        {hero?.media && (
          <div className="ms-hero__bg" aria-hidden>
            <MediaImage media={hero.media} alt="" priority sizes="100vw" />
          </div>
        )}
        <HexPattern />
        <div className="ms-container ms-hero__inner">
          <p className="ms-hero__kicker">
            {hero?.subtitle ?? '#10019 · FIRST Robotics Competition'}
          </p>
          <h1 className="ms-hero__title">
            <span className="ms-gradient-text">{hero?.title ?? 'MINERSKILLS'}</span>
          </h1>
          <p className="ms-hero__lead">
            {hero?.body ?? 'Robótica de porte industrial feita por estudantes mineiros.'}
          </p>
          <div className="ms-hero__actions">
            <LinkButton to="/como-entrar" size="lg">
              Faça parte <ArrowRight aria-hidden />
            </LinkButton>
            <LinkButton to="/historia" size="lg" variant="outline">
              Nossa história
            </LinkButton>
          </div>
        </div>
      </section>

      <StatsStrip stats={stats} loading={blocks.isPending} />

      <MarqueeStrip />

      {/* Próxima competição (contador regressivo); não renderiza sem evento futuro */}
      <NextCompetition />

      {/* ─── QUEM SOMOS ───────────────────────────────────── */}
      <section className="ms-section ms-container" aria-labelledby="ms-about-title">
        {/* Os textos têm fallback: um erro na API vira uma faixa discreta, não uma tela vazia */}
        {blocks.isError && (
          <div className="ms-home__notice">
            <ErrorState
              compact
              error={blocks.error}
              title="Não foi possível carregar os textos da página"
              onRetry={() => void blocks.refetch()}
              retrying={blocks.isFetching}
            />
          </div>
        )}
        <Reveal className="ms-about">
          <div className="ms-about__text">
            <SectionHeading
              id="ms-about-title"
              kicker="Sobre a equipe"
              title={about?.title ?? 'Quem Somos'}
              subtitle={about?.subtitle ?? undefined}
              dense
            />
            {about?.body && (
              <div className="ms-prose">
                <p>{about.body}</p>
              </div>
            )}
            <LinkButton to="/equipe" variant="outline">
              Conheça a equipe <ArrowRight aria-hidden />
            </LinkButton>
          </div>
          <div className="ms-about__media">
            {about?.media ? (
              <MediaImage
                media={about.media}
                alt={about.media.alt ?? ''}
                sizes="(max-width: 1023px) 100vw, 40vw"
              />
            ) : (
              <LogoBadge decorative className="ms-about__badge" />
            )}
          </div>
        </Reveal>
      </section>

      {/* ─── PILARES: FRC / FIRST / STEM ──────────────────── */}
      <section className="ms-section ms-pillars-wrap" aria-labelledby="ms-pillars-title">
        <div className="ms-container">
          <SectionHeading
            id="ms-pillars-title"
            center
            kicker="O ecossistema"
            title="FRC · FIRST · STEM"
            subtitle="Onde a MinerSkills se conecta a um movimento global de ciência e tecnologia."
          />
          <Reveal>
            <ul className="ms-pillars" role="list">
              {PILLARS.map((p) => {
                const block = byKey(p.key);
                return (
                  <li key={p.key} className="ms-pillar">
                    <IconTile icon={p.icon} />
                    <h3 className="ms-pillar__title">
                      {block?.title ?? p.fallbackTitle}
                    </h3>
                    {block?.subtitle && (
                      <p className="ms-pillar__sub">{block.subtitle}</p>
                    )}
                    {block?.body && <p className="ms-pillar__body">{block.body}</p>}
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ─── ÚLTIMAS NOTÍCIAS ─────────────────────────────── */}
      <LatestPosts />

      {/* ─── PATROCINADORES ───────────────────────────────── */}
      <SponsorsStrip />

      {/* ─── CHAMADA FINAL ────────────────────────────────── */}
      <section className="ms-section ms-container" aria-labelledby="ms-cta-title">
        <Reveal>
          <div className="ms-cta">
            <HexPattern />
            <div className="ms-cta__content">
              <SectionHeading
                id="ms-cta-title"
                center
                dense
                tone="on-green"
                title={cta?.title ?? 'Faça parte da mina'}
                subtitle={cta?.body ?? cta?.subtitle ?? undefined}
              />
              <div className="ms-cta__actions">
                <LinkButton to="/como-entrar" size="lg" className="ms-cta__btn">
                  Quero participar <ArrowRight aria-hidden />
                </LinkButton>
                <Link to="/quiz" className="ms-cta__link">
                  Teste seus conhecimentos no Quiz
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
