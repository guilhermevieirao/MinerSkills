import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X, Quote, CalendarDays, Users } from 'lucide-react';
import {
  GENERATIONS,
  GENERATION_LABELS,
  type EncyclopediaEntryDTO,
  type MemberTagDTO,
} from '@minerskills/shared';
import { PageHero } from '../components/layout/PageHero';
import {
  useEncyclopedia,
  type EncyclopediaFilters,
} from '../features/encyclopedia/useEncyclopedia';
import { useMemberTagMap, useMemberTags } from '../features/encyclopedia/useMemberTags';
import { EntryIcon } from '../features/encyclopedia/roleIcons';
import { FilterChip, EmptyState, Loader, Tag } from '../components/ui';
import { mediaUrl } from '../lib/format';
import './EquipePage.scss';

/** Filtro ativo como string estável: 'all' | 'robot' | 'tag:<key>' | 'gen:<geração>'. */
type FilterId = string;

type TagMap = Map<string, MemberTagDTO>;

const TEAM_PATH = '/equipe';

/** Navegação interna da página: troca o membro na URL sem rolar ao topo (ver PublicLayout). */
const KEEP_SCROLL = { state: { preserveScroll: true } };

function toFilters(id: FilterId): EncyclopediaFilters {
  if (id === 'robot') return { kind: 'robot' };
  if (id.startsWith('tag:')) return { tag: id.slice(4) };
  if (id.startsWith('gen:')) return { generation: id.slice(4) };
  return {};
}

/** Chips fixos + uma por tag do banco (na ordem da API); as tags entram quando carregam. */
function buildChips(tags: MemberTagDTO[]): { id: FilterId; label: string }[] {
  return [
    { id: 'all', label: 'Todos' },
    ...tags.map((t) => ({ id: `tag:${t.key}`, label: t.label })),
    ...GENERATIONS.map((g) => ({ id: `gen:${g}`, label: GENERATION_LABELS[g] })),
    { id: 'robot', label: 'Robôs' },
  ];
}

/** Tag principal do registro (a primeira gravada), se ainda existir no banco. */
function primaryTag(
  entry: EncyclopediaEntryDTO,
  tagMap: TagMap,
): MemberTagDTO | undefined {
  const key = entry.tags[0];
  return key ? tagMap.get(key) : undefined;
}

export function EquipePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: tags } = useMemberTags();
  const tagMap = useMemberTagMap();

  // Estado local: a rota '/equipe/:slug?' não remonta ao trocar o slug, então
  // o filtro sobrevive aos cliques nos membros.
  const [chosenFilter, setChosenFilter] = useState<FilterId>('all');
  const chips = useMemo(() => buildChips(tags ?? []), [tags]);
  // tag removida pelo admin enquanto estava selecionada → volta para "Todos"
  const active = chips.some((c) => c.id === chosenFilter) ? chosenFilter : 'all';

  const filters = useMemo(() => toFilters(active), [active]);
  const { data, isLoading } = useEncyclopedia(filters);
  const entries = useMemo(() => data ?? [], [data]);

  // entrada selecionada (via slug na URL, ou a primeira no desktop)
  const selected: EncyclopediaEntryDTO | undefined = useMemo(() => {
    if (slug) return entries.find((e) => e.slug === slug);
    return entries[0];
  }, [entries, slug]);

  // slug que não existe no filtro atual: volta para a lista (sem rolar ao topo)
  useEffect(() => {
    if (slug && data && !data.some((e) => e.slug === slug)) {
      navigate(TEAM_PATH, { replace: true, ...KEEP_SCROLL });
    }
  }, [slug, data, navigate]);

  const openEntry = (e: EncyclopediaEntryDTO) =>
    navigate(`${TEAM_PATH}/${e.slug}`, KEEP_SCROLL);
  const closeMobile = () => navigate(TEAM_PATH, KEEP_SCROLL);

  return (
    <>
      <PageHero
        kicker="Equipe MinerSkills"
        title="Membros & Robôs"
        subtitle="Competidores, treinadores e robôs que constroem a história da MinerSkills."
      />

      <section className="ms-section ms-container">
        <div
          className="ms-enc__filters"
          role="tablist"
          aria-label="Filtrar a equipe por função"
        >
          {chips.map((c) => (
            <FilterChip
              key={c.id}
              active={active === c.id}
              onClick={() => setChosenFilter(c.id)}
            >
              {c.label}
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
                    const primary = primaryTag(e, tagMap);
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
                              <EntryIcon kind={e.kind} icon={primary?.icon} />
                            </div>
                          )}
                        </div>
                        <div className="ms-enc-card__info">
                          <span className="ms-enc-card__name">{e.name}</span>
                          <span className="ms-enc-card__role">
                            <span className="ms-enc-card__dot" />
                            {e.role ?? primary?.label ?? 'Membro'}
                          </span>
                        </div>
                        <EntryIcon
                          kind={e.kind}
                          icon={primary?.icon}
                          className="ms-enc-card__role-icon"
                        />
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          {/* Painel de detalhe — lateral no desktop (a key remonta e anima a troca de membro) */}
          <aside className="ms-enc__detail">
            {selected ? (
              <DetailPanel key={selected.id} entry={selected} tagMap={tagMap} />
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
            <button
              className="ms-enc__mobile-close"
              onClick={closeMobile}
              aria-label="Fechar"
            >
              <X />
            </button>
            <DetailPanel key={selected.id} entry={selected} tagMap={tagMap} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function DetailPanel({ entry, tagMap }: { entry: EncyclopediaEntryDTO; tagMap: TagMap }) {
  const primary = primaryTag(entry, tagMap);
  return (
    <motion.div
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
            <EntryIcon kind={entry.kind} icon={primary?.icon} />
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
          {entry.seasonRef && <Tag variant="muted">{entry.seasonRef.name}</Tag>}
          {entry.generation && (
            <Tag variant="muted">{GENERATION_LABELS[entry.generation as never]}</Tag>
          )}
        </div>

        {(entry.tags.length > 0 || entry.role) && (
          <div className="ms-enc-detail__tags">
            {entry.kind === 'robot' && entry.role ? (
              <Tag>{entry.role}</Tag>
            ) : (
              entry.tags.map((t) => <Tag key={t}>{tagMap.get(t)?.label ?? t}</Tag>)
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
