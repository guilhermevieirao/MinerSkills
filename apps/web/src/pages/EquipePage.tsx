import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Users, X } from 'lucide-react';
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
import {
  Button,
  ChipRow,
  EmptyState,
  Field,
  FilterChip,
  SectionHeading,
  Select,
  Tag,
} from '../components/ui';
import { Avatar } from '../components/ui/Avatar';
import { Quote } from '../components/ui/Quote';
import { QueryState } from '../components/ui/QueryState';
import { CardGridSkeleton } from '../components/ui/skeletons';
import { MediaImage } from '../components/ui/MediaImage';
import { mq } from '../lib/breakpoints';
import { cx, mediaUrl } from '../lib/format';
import { useDocumentHead } from '../lib/useDocumentHead';
import { useFocusTrap } from '../lib/useFocusTrap';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useScrollLock } from '../lib/useScrollLock';
import './EquipePage.scss';

/** Filtro de função como string estável: 'all' | 'robot' | 'tag:<key>'. */
type FilterId = string;
/** Geração: 'all' ou uma das `GENERATIONS`. */
const GEN_ALL = 'all';

type TagMap = Map<string, MemberTagDTO>;

const TEAM_PATH = '/equipe';

const DESCRIPTION =
  'Competidores, treinadores e robôs que constroem a história da MinerSkills.';

/** Primeiro parágrafo do "Sobre", no tamanho de uma meta description. */
function summarize(text: string, max = 160): string {
  const first = text.split('\n\n')[0]?.trim() ?? '';
  return first.length > max ? `${first.slice(0, max - 1).trimEnd()}…` : first;
}

/** Navegação interna da página: troca o membro na URL sem rolar ao topo (ver PublicLayout). */
const KEEP_SCROLL = { preserveScroll: true };

function toFilters(id: FilterId, generation: string): EncyclopediaFilters {
  const f: EncyclopediaFilters = {};
  if (id === 'robot') f.kind = 'robot';
  else if (id.startsWith('tag:')) f.tag = id.slice(4);
  if (generation !== GEN_ALL) f.generation = generation;
  return f;
}

/** Chips fixos + uma por tag do banco (na ordem da API); as tags entram quando carregam. */
function buildChips(tags: MemberTagDTO[]): { id: FilterId; label: string }[] {
  return [
    { id: 'all', label: 'Todos' },
    ...tags.map((t) => ({ id: `tag:${t.key}`, label: t.label })),
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

/**
 * Equipe: filtros por função (chips) e geração (select) no cabeçalho, grade de
 * cards-link e ficha do registro selecionado — painel lateral fixo no desktop,
 * tela cheia (diálogo) abaixo de 1024px. A rota '/equipe/:slug?' não remonta ao
 * trocar o slug, então filtros e rolagem sobrevivem aos cliques nos cards.
 */
export function EquipePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: tags } = useMemberTags();
  const tagMap = useMemberTagMap();

  const [chosenFilter, setChosenFilter] = useState<FilterId>('all');
  const [generation, setGeneration] = useState<string>(GEN_ALL);
  const chips = useMemo(() => buildChips(tags ?? []), [tags]);
  // tag removida pelo admin enquanto estava selecionada → volta para "Todos"
  const active = chips.some((c) => c.id === chosenFilter) ? chosenFilter : 'all';

  const filters = useMemo(() => toFilters(active, generation), [active, generation]);
  const query = useEncyclopedia(filters);
  const data = query.data;
  const entries = useMemo(() => data ?? [], [data]);

  // entrada selecionada (via slug na URL, ou a primeira no desktop)
  const selected: EncyclopediaEntryDTO | undefined = useMemo(() => {
    if (slug) return entries.find((e) => e.slug === slug);
    return entries[0];
  }, [entries, slug]);

  // head: a lista é "Equipe"; com slug na URL, a página é do membro (perfil)
  const headEntry = slug ? selected : undefined;
  useDocumentHead(
    headEntry
      ? {
          title: headEntry.name,
          description: summarize(headEntry.about) || DESCRIPTION,
          canonicalPath: `${TEAM_PATH}/${headEntry.slug}`,
          image: headEntry.photo ? mediaUrl(headEntry.photo.url) : undefined,
          type: 'profile',
        }
      : { title: 'Equipe', description: DESCRIPTION, canonicalPath: TEAM_PATH },
  );

  // slug que não existe no filtro atual: volta para a lista (sem rolar ao topo)
  useEffect(() => {
    if (slug && data && !data.some((e) => e.slug === slug)) {
      navigate(TEAM_PATH, { replace: true, state: KEEP_SCROLL });
    }
  }, [slug, data, navigate]);

  const closeMobile = () => navigate(TEAM_PATH, { state: KEEP_SCROLL });

  // Painel de tela cheia do celular é um diálogo modal: o foco entra nele, Tab
  // cicla dentro, Esc fecha e o foco volta ao card que o abriu. O trap só vale
  // abaixo de 1024px — no desktop a ficha é o painel lateral, sempre visível.
  const isMobile = useMediaQuery(mq.below('lg'));
  const mobileRef = useRef<HTMLDivElement>(null);
  const mobileTitleId = useId();
  const mobileOpen = isMobile && !!slug && !!selected;
  useFocusTrap(mobileRef, mobileOpen, { onEscape: closeMobile });
  useScrollLock(mobileOpen);

  const clearFilters = () => {
    setChosenFilter('all');
    setGeneration(GEN_ALL);
  };

  return (
    <>
      <PageHero
        kicker="Equipe MinerSkills"
        title="Membros & Robôs"
        subtitle={DESCRIPTION}
        toolbar={
          <>
            {/* group (não tablist): as chips são botões com aria-pressed, não abas */}
            <ChipRow
              label="Filtrar a equipe por função"
              scroll
              className="ms-enc__filters"
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
            </ChipRow>
            <Field label="Geração" visuallyHiddenLabel className="ms-enc__generation">
              <Select value={generation} onChange={(e) => setGeneration(e.target.value)}>
                <option value={GEN_ALL}>Todas as gerações</option>
                {GENERATIONS.map((g) => (
                  <option key={g} value={g}>
                    {GENERATION_LABELS[g]}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        }
      />

      <section className="ms-section ms-container">
        <div className="ms-enc__layout">
          <div className="ms-enc__main">
            <QueryState
              query={query}
              skeleton={<CardGridSkeleton count={9} aspect="4 / 5" min={200} />}
              isEmpty={(list) => list.length === 0}
              empty={
                <EmptyState
                  icon={<Users />}
                  title="Nenhum registro"
                  description="Nenhum membro ou robô corresponde aos filtros escolhidos."
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  }
                />
              }
            >
              {(list) => (
                <>
                  <p className="ms-enc__count" aria-live="polite">
                    <Users aria-hidden /> {list.length}{' '}
                    {list.length === 1 ? 'registro encontrado' : 'registros encontrados'}
                  </p>
                  <ul
                    className="ms-enc__grid"
                    role="list"
                    aria-busy={query.isFetching || undefined}
                  >
                    {list.map((e) => (
                      <li key={e.id}>
                        <EntryCard
                          entry={e}
                          tagMap={tagMap}
                          active={selected?.id === e.id}
                        />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </QueryState>
          </div>

          {/* Ficha — painel lateral fixo no desktop */}
          <aside className="ms-enc__detail" aria-label="Detalhes do registro selecionado">
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

      {/* Ficha — tela cheia abaixo de 1024px (diálogo modal; ver useFocusTrap acima) */}
      {mobileOpen && selected && (
        <div
          ref={mobileRef}
          className="ms-enc__mobile"
          role="dialog"
          aria-modal="true"
          aria-labelledby={mobileTitleId}
        >
          <div className="ms-enc__mobile-bar">
            <span className="ms-enc__mobile-name">{selected.name}</span>
            <button
              type="button"
              className="ms-enc__mobile-close"
              onClick={closeMobile}
              aria-label="Fechar"
            >
              <X aria-hidden />
            </button>
          </div>
          <div className="ms-enc__mobile-body">
            <DetailPanel
              key={selected.id}
              entry={selected}
              tagMap={tagMap}
              titleId={mobileTitleId}
            />
          </div>
        </div>
      )}
    </>
  );
}

/** Card da grade: o link inteiro navega para a ficha; foto 4/5 ou avatar de iniciais. */
function EntryCard({
  entry,
  tagMap,
  active,
}: {
  entry: EncyclopediaEntryDTO;
  tagMap: TagMap;
  active: boolean;
}) {
  const primary = primaryTag(entry, tagMap);
  const role = entry.role ?? primary?.label ?? 'Membro';
  return (
    <Link
      to={`${TEAM_PATH}/${entry.slug}`}
      state={KEEP_SCROLL}
      className={cx('ms-enc-card', active && 'ms-enc-card--active')}
      aria-current={active ? 'true' : undefined}
    >
      <div className="ms-enc-card__photo">
        {entry.photo ? (
          <MediaImage
            media={entry.photo}
            alt=""
            thumb
            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 20vw"
          />
        ) : (
          <Avatar name={entry.name} size="xl" tone="brand" />
        )}
      </div>
      <div className="ms-enc-card__info">
        <span className="ms-enc-card__name">{entry.name}</span>
        <span className="ms-enc-card__role">
          <EntryIcon
            kind={entry.kind}
            icon={primary?.icon}
            className="ms-enc-card__role-icon"
          />
          {role}
        </span>
      </div>
    </Link>
  );
}

function DetailPanel({
  entry,
  tagMap,
  titleId,
}: {
  entry: EncyclopediaEntryDTO;
  tagMap: TagMap;
  /** Id do título — rótulo (`aria-labelledby`) do diálogo mobile. */
  titleId?: string;
}) {
  const primary = primaryTag(entry, tagMap);
  const generation = entry.generation
    ? GENERATION_LABELS[entry.generation as (typeof GENERATIONS)[number]]
    : undefined;
  return (
    <div className="ms-enc-detail">
      <div className="ms-enc-detail__photo">
        {entry.photo ? (
          <MediaImage
            media={entry.photo}
            alt={entry.name}
            sizes="(max-width: 1023px) 100vw, 400px"
          />
        ) : (
          <div className="ms-enc-detail__photo-fallback">
            <EntryIcon kind={entry.kind} icon={primary?.icon} />
          </div>
        )}
      </div>

      <div className="ms-enc-detail__body">
        <h2 className="ms-enc-detail__name" id={titleId}>
          {entry.name}
        </h2>

        <div className="ms-enc-detail__meta">
          {entry.age != null && (
            <span className="ms-meta">
              <CalendarDays aria-hidden /> {entry.age} anos
            </span>
          )}
          {entry.season && <span className="ms-meta">{entry.season}</span>}
          {entry.seasonRef && <Tag tone="neutral">{entry.seasonRef.name}</Tag>}
          {generation && <Tag tone="neutral">{generation}</Tag>}
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
          <SectionHeading as="h3" size="sm" title="Sobre" dense />
          <div className="ms-prose ms-enc-detail__about">
            {entry.about.split('\n\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>

        {entry.quote && <Quote>{entry.quote}</Quote>}
      </div>
    </div>
  );
}
