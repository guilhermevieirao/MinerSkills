import { ArrowRight, Trophy } from 'lucide-react';
import type { ContentBlockDTO, MediaAssetDTO } from '@minerskills/shared';
import { cx } from '../../lib/format';
import { LinkButton, SectionHeading, Skeleton } from '../ui';
import { Avatar } from '../ui/Avatar';
import { MediaImage } from '../ui/MediaImage';
import { StatCounter } from '../motion/StatCounter';
import { RevealGroup, RevealItem } from '../motion/Reveal';
import { Parallax } from '../motion/Parallax';
import { useEncyclopedia } from '../../features/encyclopedia/useEncyclopedia';
import './StatsStrip.scss';

/** Números que têm uma página para aprofundar ganham o link no próprio bloco. */
const DEEP_LINKS: Record<string, { to: string; label: string }> = {
  stat_members: { to: '/equipe', label: 'Conheça a equipe' },
  stat_award: { to: '/premios', label: 'Ver prêmios' },
};

/** O número oficial já está no hero e no rodapé: fora da grade (decisão do responsável). */
const HIDDEN = new Set(['stat_team']);

/** Quantos rostos a prévia do bloco de membros mostra. */
const FACES = 6;

/**
 * Números da Home (blocos `stat_*` da página "landing") em grade bento, cada
 * bloco com um conteúdo próprio: o primeiro sobre uma foto da equipe, o de
 * membros com os rostos de quem está no time, o de prêmio com o troféu. Blocos
 * `stat_*` novos do painel entram como blocos simples. Valores que são
 * palavras ("Rising") ficam na voz de título, não na mono dos números.
 */
export function StatsStrip({
  stats,
  loading,
  photo,
}: {
  stats: ContentBlockDTO[];
  loading?: boolean;
  /** Foto do bloco grande (o primeiro número é escrito sobre ela). */
  photo?: MediaAssetDTO | null;
}) {
  const members = useEncyclopedia({ kind: 'member' });
  const shown = stats.filter((s) => !HIDDEN.has(s.key));
  if (shown.length === 0 && !loading) return null;

  const faces = (members.data ?? [])
    .filter((m) => m.photo && !m.isFormer)
    .slice(0, FACES);

  return (
    <section className="ms-section ms-stats" aria-labelledby="ms-stats-title">
      <div className="ms-container">
        <SectionHeading id="ms-stats-title" title="A MinerSkills em números" />
        {shown.length === 0 ? (
          <div className="ms-stats__grid" aria-hidden>
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="ms-stats__item">
                <Skeleton height={48} width="50%" />
                <Skeleton height={14} width="70%" />
              </div>
            ))}
          </div>
        ) : (
          <RevealGroup as="dl" className="ms-stats__grid" stagger={0.1}>
            {shown.map((s, i) => {
              const link = DEEP_LINKS[s.key];
              const withPhoto = i === 0 && photo;
              const isMembers = s.key === 'stat_members' && faces.length > 0;
              const isAward = s.key === 'stat_award';
              return (
                <RevealItem
                  as="div"
                  key={s.key}
                  className={cx(
                    'ms-stats__item',
                    withPhoto && 'ms-stats__item--photo',
                    (isMembers || isAward) && 'ms-stats__item--wide',
                  )}
                >
                  {/* dentro de um <dd>: o <div> de um <dl> só aceita dt/dd */}
                  {withPhoto && (
                    <dd className="ms-stats__photo" aria-hidden>
                      <Parallax>
                        <MediaImage
                          media={photo}
                          alt=""
                          sizes="(max-width: 1023px) 100vw, 50vw"
                        />
                      </Parallax>
                    </dd>
                  )}
                  {isMembers && (
                    <dd className="ms-stats__extra ms-stats__faces" aria-hidden>
                      {faces.map((m) => (
                        <Avatar key={m.id} name={m.name} media={m.photo} size="lg" />
                      ))}
                    </dd>
                  )}
                  {isAward && (
                    <dd className="ms-stats__extra ms-stats__trophy" aria-hidden>
                      <Trophy />
                    </dd>
                  )}
                  <dt className="ms-stats__label">{s.subtitle}</dt>
                  <dd
                    className={cx(
                      'ms-stats__value',
                      !/\d/.test(s.title ?? '') && 'ms-stats__value--word',
                    )}
                  >
                    <StatCounter value={s.title ?? ''} />
                  </dd>
                  {link && (
                    <dd className="ms-stats__link">
                      <LinkButton to={link.to} variant="link">
                        {link.label} <ArrowRight aria-hidden />
                      </LinkButton>
                    </dd>
                  )}
                </RevealItem>
              );
            })}
          </RevealGroup>
        )}
      </div>
    </section>
  );
}
