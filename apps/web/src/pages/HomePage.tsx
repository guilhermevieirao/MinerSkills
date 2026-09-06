import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Cpu,
  Cog,
  Rocket,
  GraduationCap,
  Trophy,
  Users,
} from 'lucide-react';
import { usePageBlocks } from '../features/content/useContent';
import { LinkButton, SectionHeading } from '../components/ui';
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal';
import { MarqueeStrip } from '../components/motion/MarqueeStrip';
import { HexPattern } from '../components/motion/HexPattern';
import { StatCounter } from '../components/motion/StatCounter';
import { LogoBadge } from '../components/brand/Logo';
import { mediaUrl } from '../lib/format';
import './HomePage.scss';

const PILLARS = [
  { key: 'frc', icon: Cog, fallbackTitle: 'FIRST Robotics Competition' },
  { key: 'first', icon: Rocket, fallbackTitle: 'A FIRST' },
  { key: 'stem', icon: GraduationCap, fallbackTitle: 'Educação STEM' },
];

const STAT_ICONS = [Cpu, Trophy, Users, GraduationCap];

export function HomePage() {
  const { byKey, data } = usePageBlocks('landing');
  const reduce = useReducedMotion();

  const hero = byKey('hero');
  const about = byKey('about');
  const cta = byKey('cta');
  const stats = (data ?? []).filter((b) => b.key.startsWith('stat_'));

  return (
    <>
      {/* ─── HERO ─────────────────────────────────────────── */}
      <section className="ms-hero">
        <HexPattern />
        {hero?.media && (
          <div className="ms-hero__bg" aria-hidden>
            <img src={mediaUrl(hero.media.url)} alt="" />
            <div className="ms-hero__bg-overlay" />
          </div>
        )}
        <div className="ms-hero__inner ms-container">
          <motion.p
            className="ms-hero__kicker"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {hero?.subtitle ?? '#10019 · FIRST Robotics Competition'}
          </motion.p>
          <motion.h1
            className="ms-hero__title"
            initial={{ opacity: 0, y: reduce ? 0 : 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          >
            <span className="ms-gradient-text">{hero?.title ?? 'MINERSKILLS'}</span>
          </motion.h1>
          <motion.p
            className="ms-hero__lead"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            {hero?.body ??
              'Robótica de porte industrial feita por estudantes mineiros.'}
          </motion.p>
          <motion.div
            className="ms-hero__actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <LinkButton to="/como-entrar" size="lg">
              Faça parte <ArrowRight />
            </LinkButton>
            <LinkButton to="/historia" size="lg" variant="outline">
              Nossa história
            </LinkButton>
          </motion.div>
        </div>
        <motion.div
          className="ms-hero__badge"
          initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <LogoBadge />
        </motion.div>
      </section>

      <MarqueeStrip />

      {/* ─── SOBRE ────────────────────────────────────────── */}
      <section className="ms-section ms-container" id="sobre">
        <div className="ms-about">
          <Reveal className="ms-about__text">
            <SectionHeading
              kicker="Quem Somos"
              title={about?.title ?? 'Quem Somos'}
              subtitle={about?.subtitle ?? undefined}
            />
            <p className="ms-about__body">{about?.body}</p>
            <LinkButton to="/equipe" variant="outline">
              Conheça a equipe <ArrowRight />
            </LinkButton>
          </Reveal>
          <RevealGroup className="ms-stats">
            {stats.map((s, i) => {
              const Icon = STAT_ICONS[i % STAT_ICONS.length]!;
              return (
                <RevealItem key={s.key} className="ms-stat">
                  <Icon className="ms-stat__icon" />
                  <span className="ms-stat__value">
                    <StatCounter value={s.title ?? ''} />
                  </span>
                  <span className="ms-stat__label">{s.subtitle}</span>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      {/* ─── PILARES: FRC / FIRST / STEM ──────────────────── */}
      <section className="ms-section ms-pillars-wrap">
        <div className="ms-container">
          <SectionHeading
            center
            kicker="O Ecossistema"
            title="FRC · FIRST · STEM"
            subtitle="Onde a MinerSkills se conecta a um movimento global de ciência e tecnologia."
          />
          <RevealGroup className="ms-pillars">
            {PILLARS.map((p) => {
              const block = byKey(p.key);
              const Icon = p.icon;
              return (
                <RevealItem key={p.key} className="ms-pillar">
                  <div className="ms-pillar__icon">
                    <Icon />
                  </div>
                  <h3 className="ms-pillar__title">{block?.title ?? p.fallbackTitle}</h3>
                  {block?.subtitle && (
                    <p className="ms-pillar__sub">{block.subtitle}</p>
                  )}
                  <p className="ms-pillar__body">{block?.body}</p>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────── */}
      <section className="ms-section ms-container">
        <Reveal>
          <div className="ms-cta">
            <HexPattern />
            <div className="ms-cta__content">
              <h2 className="ms-cta__title">{cta?.title ?? 'Faça parte da mina'}</h2>
              <p className="ms-cta__body">{cta?.body ?? cta?.subtitle}</p>
              <div className="ms-cta__actions">
                <LinkButton to="/como-entrar" size="lg">
                  Quero participar <ArrowRight />
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
