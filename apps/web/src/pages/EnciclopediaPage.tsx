import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X, Quote, CalendarDays, Users } from 'lucide-react';
import {
  MEMBER_TAGS,
  MEMBER_TAG_LABELS,
  GENERATIONS,
  GENERATION_LABELS,
  type EncyclopediaEntryDTO,
} from '@minerskills/shared';
import { PageHero } from '../components/layout/PageHero';
import { useEncyclopedia, type EncyclopediaFilters } from '../features/encyclopedia/useEncyclopedia';
import { RoleIcon } from '../features/encyclopedia/roleIcons';
import { FilterChip, EmptyState, Loader, Tag } from '../components/ui';
import { mediaUrl } from '../lib/format';
import './EnciclopediaPage.scss';

type FilterKey =
  | { type: 'all' }
  | { type: 'tag'; value: string }
  | { type: 'generation'; value: string }
  | { type: 'robot' };

const FILTERS: { label: string; key: FilterKey }[] = [
  { label: 'Todos', key: { type: 'all' } },
  ...MEMBER_TAGS.map((t) => ({
    label: MEMBER_TAG_LABELS[t],
    key: { type: 'tag' as const, value: t },
  })),
  ...GENERATIONS.map((g) => ({
    label: GENERATION_LABELS[g],
    key: { type: 'generation' as const, value: g },
  })),
  { label: 'Robôs', key: { type: 'robot' } },
];

function toFilters(key: FilterKey): EncyclopediaFilters {
  switch (key.type) {
    case 'tag':
      return { tag: key.value };
    case 'generation':
      return { generation: key.value };
    case 'robot':
      return { kind: 'robot' };
    default:
      return {};
  }
}

export function EnciclopediaPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const filters = toFilters(FILTERS[activeIndex]!.key);
  const { data, isLoading } = useEncyclopedia(filters);

  const entries = useMemo(() => data ?? [], [data]);

  // entrada selecionada (via slug na URL, ou a primeira no desktop)
  const selected: EncyclopediaEntryDTO | undefined = useMemo(() => {
    if (slug) return entries.find((e) => e.slug === slug);
    return entries[0];
  }, [entries, slug]);

  // se o slug não existe no filtro atual, limpa
  useEffect(() => {
    if (slug && entries.length && !entries.some((e) => e.slug === slug)) {
      navigate('/enciclopedia', { replace: true });
    }
  }, [slug, entries, navigate]);

  const openEntry = (e: EncyclopediaEntryDTO) => navigate(`/enciclopedia/${e.slug}`);
  const closeMobile = () => navigate('/enciclopedia');

  return (
    <>
      <PageHero
        kicker="Enciclopédia da Equipe"
        title="Membros & Robôs"
        subtitle="Competidores, treinadores e robôs que constroem a história da MinerSkills."
      />

      <section className="ms-section ms-container">
        <div className="ms-enc__filters" role="tablist" aria-label="Filtrar por função">
          {FILTERS.map((f, i) => (
            <FilterChip key={f.label} active={activeIndex === i} onClick={() => setActiveIndex(i)}>
              {f.label}
            </FilterChip>
          ))}
        </div>

        <p className="ms-enc__count">
          <Users /> {entries.length}{' '}
          {entries.length === 1 ? 'registro encontrado' : 'registros encontrados'}
        </p>

        <div className="ms-enc__layout">
          <div className="ms-enc__grid-wrap">
            {isLoading ? (
              <Loader />
            ) : entries.length === 0 ? (
              <EmptyState title="Nenhum registro" description="Ajuste os filtros." />
            ) : (
              <motion.div className="ms-enc__grid" layout>
                <AnimatePresence mode="popLayout">
                  {entries.map((e) => {
                    const primaryTag = e.kind === 'robot' ? 'robot' : e.tags[0] ?? 'competidor';
                    return (
                      <motion.button
                        key={e.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className={`ms-enc-card ${selected?.id === e.id ? 'ms-enc-card--active' : ''}`}
                        onClick={() => openEntry(e)}
                      >
                        <div className="ms-enc-card__photo">
                          {e.photo ? (
                            <img
                              src={mediaUrl(e.photo.thumbUrl ?? e.photo.url)}
                              alt={e.name}
                              loading="lazy"
                            />
                          ) : (
                            <div className="ms-enc-card__photo-fallback">
                              <RoleIcon tag={primaryTag} />
                            </div>
                          )}
                        </div>
                        <div className="ms-enc-card__info">
                          <span className="ms-enc-card__name">{e.name}</span>
                          <span className="ms-enc-card__role">
                            <span className="ms-enc-card__dot" />
                            {e.role ?? MEMBER_TAG_LABELS[primaryTag as never] ?? 'Membro'}
                          </span>
                        </div>
                        <RoleIcon tag={primaryTag} className="ms-enc-card__role-icon" />
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          {/* Painel de detalhe — lateral no desktop */}
          <aside className="ms-enc__detail">
            {selected ? (
              <DetailPanel entry={selected} />
            ) : (
              <div className="ms-enc__detail-empty">
                <p>Selecione um membro para ver os detalhes.</p>
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* Painel de detalhe — fullscreen no mobile */}
      <AnimatePresence>
        {slug && selected && (
          <motion.div
            className="ms-enc__mobile-detail"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3 }}
          >
            <button className="ms-enc__mobile-close" onClick={closeMobile} aria-label="Fechar">
              <X />
            </button>
            <DetailPanel entry={selected} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function DetailPanel({ entry }: { entry: EncyclopediaEntryDTO }) {
  return (
    <motion.div
      key={entry.id}
      className="ms-enc-detail"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="ms-enc-detail__photo">
        {entry.photo ? (
          <img src={mediaUrl(entry.photo.url)} alt={entry.name} />
        ) : (
          <div className="ms-enc-detail__photo-fallback">
            <RoleIcon tag={entry.kind === 'robot' ? 'robot' : entry.tags[0] ?? 'competidor'} />
          </div>
        )}
      </div>

      <div className="ms-enc-detail__body">
        <h2 className="ms-enc-detail__name">{entry.name}</h2>
        <div className="ms-enc-detail__meta">
          {entry.age != null && (
            <span>
              <CalendarDays /> {entry.age} anos
            </span>
          )}
          {entry.season && (
            <span>
              <CalendarDays /> {entry.season}
            </span>
          )}
          {entry.generation && <Tag variant="muted">{GENERATION_LABELS[entry.generation as never]}</Tag>}
        </div>

        {(entry.tags.length > 0 || entry.role) && (
          <div className="ms-enc-detail__tags">
            {entry.kind === 'robot' && entry.role ? (
              <Tag>{entry.role}</Tag>
            ) : (
              entry.tags.map((t) => <Tag key={t}>{MEMBER_TAG_LABELS[t as never] ?? t}</Tag>)
            )}
          </div>
        )}

        <div className="ms-enc-detail__section">
          <span className="ms-enc-detail__section-title">» Sobre</span>
          {entry.about.split('\n\n').map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {entry.quote && (
          <blockquote className="ms-enc-detail__quote">
            <Quote />
            <p>{entry.quote}</p>
          </blockquote>
        )}
      </div>
    </motion.div>
  );
}
