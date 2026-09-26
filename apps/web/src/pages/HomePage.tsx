import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import type { ContentBlockDTO } from '@minerskills/shared';
import { usePageBlocks } from '../features/content/useContent';
import { useGallery } from '../features/gallery/useGallery';
import { LinkButton, SectionHeading } from '../components/ui';
import { ErrorState } from '../components/ui/ErrorState';
import { MediaImage } from '../components/ui/MediaImage';
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal';
import { TextReveal } from '../components/motion/TextReveal';
import { Parallax } from '../components/motion/Parallax';
import { StatsStrip } from '../components/layout/StatsStrip';
import { NextCompetition } from '../components/layout/NextCompetition';
import { LatestPosts } from '../components/layout/LatestPosts';
import { SponsorsStrip } from '../components/layout/SponsorsStrip';
import { NAV_DIRECT, NAV_GROUPS } from '../components/layout/navItems';
import { LogoBadge } from '../components/brand/Logo';
import { EASE } from '../lib/motion';
import { useDocumentHead } from '../lib/useDocumentHead';
import './HomePage.scss';

const PILLARS = [
  { key: 'frc', word: 'FRC', fallbackTitle: 'FIRST Robotics Competition' },
  { key: 'first', word: 'FIRST', fallbackTitle: 'A FIRST' },
  { key: 'stem', word: 'STEM', fallbackTitle: 'Educação STEM' },
];

/** Atalhos da Home: todos os destinos do site, menos contato (fica no rodapé). */
const SHORTCUTS = [...NAV_GROUPS.flatMap((g) => g.items), NAV_DIRECT[0]!];

/**
 * Home: hero (título + bloco de imagem ligado à rolagem) → atalhos → quem somos →
 * números → próxima competição → FRC/FIRST/STEM → últimas notícias →
 * patrocinadores → chamada final. Um CTA primário por seção.
 */
export function HomePage() {
  const blocks = usePageBlocks('landing');
  const { byKey, data } = blocks;

  const hero = byKey('hero');
  const about = byKey('about');
  const cta = byKey('cta');
  const stats = (data ?? []).filter((b) => b.key.startsWith('stat_'));
  // foto do bloco grande dos números: a do "Quem Somos" ou uma da galeria —
  // nunca a do hero, para a mesma imagem não aparecer duas vezes seguidas
  const gallery = useGallery();
  const statsPhoto =
    about?.media ??
    gallery.data?.find((p) => p.media.id !== hero?.media?.id)?.media ??
    null;

  // título vazio = só o nome do site; a descrição vem do bloco "Quem Somos"
  useDocumentHead({
    title: '',
    description: about?.subtitle || about?.body || undefined,
    canonicalPath: '/',
  });

  return (
    <>
      <HomeHero hero={hero} />

      {/* ─── ATALHOS ──────────────────────────────────────── */}
      <nav className="ms-shortcuts" aria-label="Explore o site">
        <RevealGroup className="ms-container ms-shortcuts__list" stagger={0.05}>
          {SHORTCUTS.map((item) => (
            <RevealItem key={item.to} y={16}>
              <Link to={item.to} className="ms-shortcuts__link">
                <span className="ms-shortcuts__icon">
                  <item.icon aria-hidden />
                </span>
                {item.label}
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </nav>

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
        {about?.media ? (
          <div className="ms-about">
            <MaskReveal className="ms-about__media">
              <Parallax strength={6}>
                <MediaImage
                  media={about.media}
                  alt={about.media.alt ?? ''}
                  sizes="(max-width: 1023px) 100vw, 50vw"
                />
              </Parallax>
            </MaskReveal>
            <AboutText about={about} />
          </div>
        ) : (
          // sem foto: composição editorial só de texto (título à esquerda, texto à direita)
          <div className="ms-about ms-about--text">
            <AboutText about={about} />
          </div>
        )}
      </section>

      <StatsStrip stats={stats} loading={blocks.isPending} photo={statsPhoto} />

      {/* Próxima competição (contador regressivo); não renderiza sem evento futuro */}
      <NextCompetition />

      {/* ─── PILARES: FRC / FIRST / STEM ──────────────────── */}
      <section className="ms-section ms-pillars" aria-labelledby="ms-pillars-title">
        <div className="ms-container">
          <SectionHeading
            id="ms-pillars-title"
            title="FRC · FIRST · STEM"
            subtitle="Onde a MinerSkills se conecta a um movimento global de ciência e tecnologia."
          />
          <RevealGroup className="ms-pillars__row" stagger={0.12}>
            {PILLARS.map((p) => (
              <RevealItem key={p.key} className="ms-pillar">
                <PillarColumn pillar={p} block={byKey(p.key)} />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ─── ÚLTIMAS NOTÍCIAS ─────────────────────────────── */}
      <LatestPosts />

      {/* ─── PATROCINADORES ───────────────────────────────── */}
      <SponsorsStrip />

      {/* ─── CHAMADA FINAL ────────────────────────────────── */}
      <section className="ms-section ms-container" aria-labelledby="ms-cta-title">
        <Reveal className="ms-cta">
          <CtaGlow />
          <SectionHeading
            id="ms-cta-title"
            center
            size="lg"
            title={cta?.title ?? 'Faça parte da mina'}
            subtitle={cta?.body ?? cta?.subtitle ?? undefined}
          />
          <div className="ms-cta__actions">
            <LinkButton to="/como-entrar" size="lg">
              Quero participar <ArrowRight aria-hidden />
            </LinkButton>
            <LinkButton to="/quiz" variant="link">
              Teste seus conhecimentos no Quiz <ArrowRight aria-hidden />
            </LinkButton>
          </div>
        </Reveal>
      </section>
    </>
  );
}

/**
 * Abertura: título, texto e ações entram em sequência (CSS); abaixo, o bloco de
 * imagem nasce um pouco recolhido e cresce até a largura cheia enquanto a página
 * rola, com a foto em paralaxe por dentro — o momento de movimento da Home.
 */
function HomeHero({ hero }: { hero: ContentBlockDTO | undefined }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: stageRef,
    offset: ['start end', 'end start'],
  });
  const scale = useTransform(scrollYProgress, [0, 0.45], [0.86, 1]);
  const radius = useTransform(scrollYProgress, [0, 0.45], [56, 28]);
  const photoY = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);

  return (
    <section className="ms-hero" aria-labelledby="ms-hero-title">
      <div className="ms-container ms-hero__head">
        <h1 id="ms-hero-title" className="ms-hero__title">
          <TextReveal text={hero?.title ?? 'MINERSKILLS'} split="chars" trigger="mount" />
        </h1>
        <div className="ms-hero__side">
          <p className="ms-hero__lead">
            {hero?.body ?? 'Robótica de porte industrial feita por estudantes mineiros.'}
          </p>
          <div className="ms-hero__actions">
            <LinkButton to="/como-entrar" size="lg">
              Faça parte <ArrowRight aria-hidden />
            </LinkButton>
            <LinkButton to="/historia" variant="link" size="lg">
              Nossa história <ArrowRight aria-hidden />
            </LinkButton>
          </div>
        </div>
      </div>

      <div ref={stageRef} className="ms-hero__stage">
        <motion.figure
          className="ms-hero__media"
          style={reduce ? undefined : { scale, borderRadius: radius }}
        >
          {hero?.media ? (
            <motion.div
              className="ms-hero__photo"
              style={reduce ? undefined : { y: photoY }}
              aria-hidden
            >
              <MediaImage media={hero.media} alt="" priority sizes="100vw" />
            </motion.div>
          ) : (
            <div className="ms-hero__placeholder" aria-hidden>
              <LogoBadge decorative className="ms-hero__badge" />
            </div>
          )}
          <figcaption className="ms-hero__caption">
            {hero?.subtitle ?? '#10019 · FIRST Robotics Competition'}
          </figcaption>
        </motion.figure>
      </div>
    </section>
  );
}

/**
 * Luz verde da chamada final: cresce e acende conforme o bloco sobe na tela,
 * como se o convite "acendesse" quando chega ao centro.
 */
function CtaGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  });
  const transform = useTransform(scrollYProgress, [0, 1], ['scale(0.55)', 'scale(1)']);
  const opacity = useTransform(scrollYProgress, [0, 1], [0.2, 1]);
  return (
    <motion.div
      ref={ref}
      className="ms-cta__glow"
      aria-hidden
      style={reduce ? undefined : { transform, opacity }}
    />
  );
}

/** Imagem que se revela por uma máscara que abre (clip-path) ao entrar na tela. */
function MaskReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { clipPath: 'inset(14% 10% 14% 10% round 28px)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0% round 28px)' }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 1.1, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Coluna de um pilar: a sigla inteira no alto, depois título, subtítulo e texto. */
function PillarColumn({
  pillar,
  block,
}: {
  pillar: (typeof PILLARS)[number];
  block: ContentBlockDTO | undefined;
}) {
  return (
    <>
      <span className="ms-pillar__word" aria-hidden>
        {pillar.word}
      </span>
      <h3 className="ms-pillar__title">{block?.title ?? pillar.fallbackTitle}</h3>
      {block?.subtitle && <p className="ms-pillar__sub">{block.subtitle}</p>}
      {block?.body && <p className="ms-pillar__body">{block.body}</p>}
    </>
  );
}

/** Texto do "Quem Somos" (título, subtítulo, corpo e link) — igual com ou sem foto. */
function AboutText({ about }: { about: ContentBlockDTO | undefined }) {
  return (
    <Reveal className="ms-about__text">
      <SectionHeading
        id="ms-about-title"
        title={about?.title ?? 'Quem Somos'}
        subtitle={about?.subtitle ?? undefined}
        dense
      />
      {about?.body && <p className="ms-about__body">{about.body}</p>}
      <LinkButton to="/equipe" variant="link">
        Conheça a equipe <ArrowRight aria-hidden />
      </LinkButton>
    </Reveal>
  );
}
