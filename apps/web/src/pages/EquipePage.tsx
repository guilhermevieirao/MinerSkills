import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CalendarDays, Quote as QuoteIcon, ScrollText, Users, X } from 'lucide-react';
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
import { Button, ChipRow, EmptyState, FilterChip, Tag } from '../components/ui';
import { Avatar } from '../components/ui/Avatar';
import { QueryState } from '../components/ui/QueryState';
import { TextReveal } from '../components/motion/TextReveal';
import { EASE } from '../lib/motion';
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
 * Equipe (enciclopédia): dois painéis lado a lado a partir de 1024px — à
 * esquerda os filtros (função e geração, tudo em chips) e a grade de cards; à
 * direita a ficha do registro selecionado, fixa durante a rolagem. Abaixo de
 * 1024px a ficha vira um diálogo de tela cheia. A grade reorganiza os cards com
 * animação ao filtrar e o anel de seleção desliza de um card para o outro.
 * A rota '/equipe/:slug?' não remonta ao trocar o slug, então filtros e
 * rolagem sobrevivem aos cliques nos cards.
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
      <PageHero title="Membros & Robôs" subtitle={DESCRIPTION} className="ms-enc__hero" />

      <section className="ms-section ms-container ms-container--wide">
        <div className="ms-enc__layout">
          <div className="ms-enc__main">
            <div className="ms-enc__toolbar">
              {/* group (não tablist): as chips são botões com aria-pressed, não abas */}
              <ChipRow label="Filtrar a equipe por função" className="ms-enc__filters">
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
              <ChipRow label="Filtrar a equipe por geração" className="ms-enc__gens">
                {GENERATIONS.map((g) => (
                  <FilterChip
                    key={g}
                    active={generation === g}
                    // clicar de novo na geração ativa volta para todas
                    onClick={() => setGeneration(generation === g ? GEN_ALL : g)}
                  >
                    {GENERATION_LABELS[g]}
                  </FilterChip>
                ))}
              </ChipRow>
            </div>

            <QueryState
              query={query}
              skeleton={<CardGridSkeleton count={8} aspect="4 / 5" min={140} />}
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
                  <ul
                    className="ms-enc__grid"
                    role="list"
                    aria-busy={query.isFetching || undefined}
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {list.map((e, i) => (
                        <motion.li
                          key={e.id}
                          layout
                          initial={{ opacity: 0, scale: 0.94 }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            transition: { duration: 0.35, ease: EASE, delay: i * 0.02 },
                          }}
                          exit={{
                            opacity: 0,
                            scale: 0.94,
                            transition: { duration: 0.2 },
                          }}
                          transition={{ layout: { duration: 0.4, ease: EASE } }}
                        >
                          <EntryCard
                            entry={e}
                            tagMap={tagMap}
                            active={selected?.id === e.id}
                          />
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                  <p className="ms-enc__count" aria-live="polite">
                    <Users aria-hidden /> {list.length}{' '}
                    {list.length === 1 ? 'registro encontrado' : 'registros encontrados'}
                  </p>
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

/**
 * Card da grade: o link inteiro navega para a ficha. Foto 4/5 (ou iniciais),
 * nome, função com o ponto verde e o ícone da função à direita. O card ativo
 * carrega o anel de seleção (`layoutId`): ao escolher outro card, o anel
 * desliza até ele em vez de piscar.
 */
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
      {active && (
        <motion.span
          layoutId="ms-enc-active"
          className="ms-enc-card__ring"
          aria-hidden
          transition={{ type: 'spring', duration: 0.45, bounce: 0.15 }}
        />
      )}
      <div className="ms-enc-card__photo">
        {entry.photo ? (
          <MediaImage
            media={entry.photo}
            alt=""
            thumb
            sizes="(max-width: 767px) 50vw, (max-width: 1279px) 25vw, 12vw"
          />
        ) : (
          <Avatar name={entry.name} size="xl" tone="brand" />
        )}
      </div>
      <div className="ms-enc-card__info">
        <span className="ms-enc-card__name">{entry.name}</span>
        <span className="ms-enc-card__row">
          <span className="ms-enc-card__role">{role}</span>
          <EntryIcon
            kind={entry.kind}
            icon={primary?.icon}
            className="ms-enc-card__role-icon"
          />
        </span>
      </div>
    </Link>
  );
}

/**
 * Ficha do registro: foto grande numa moldura de cantos, nome, idade, funções,
 * "Sobre" e a frase do membro numa faixa no rodapé. Remonta a cada troca
 * (`key`), então a foto abre por uma máscara e o texto entra em sequência.
 */
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
  const reduce = useReducedMotion();
  const primary = primaryTag(entry, tagMap);
  const generation = entry.generation
    ? GENERATION_LABELS[entry.generation as (typeof GENERATIONS)[number]]
    : undefined;

  // blocos de texto entram em sequência depois da foto
  const rise = (order: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, transform: 'translateY(12px)' },
          animate: {
            opacity: 1,
            transform: 'translateY(0px)',
            transition: { duration: 0.5, ease: EASE, delay: 0.25 + order * 0.07 },
          },
        };

  return (
    <div className="ms-enc-detail">
      <div className="ms-enc-detail__frame">
        <motion.div
          className="ms-enc-detail__photo"
          initial={reduce ? false : { clipPath: 'inset(0% 0% 100% 0%)' }}
          animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {entry.photo ? (
            <motion.div
              className="ms-enc-detail__img"
              initial={reduce ? false : { transform: 'scale(1.08)' }}
              animate={{ transform: 'scale(1)' }}
              transition={{ duration: 1.1, ease: EASE }}
            >
              <MediaImage
                media={entry.photo}
                alt={entry.name}
                sizes="(max-width: 1023px) 100vw, 50vw"
              />
            </motion.div>
          ) : (
            <div className="ms-enc-detail__photo-fallback">
              <EntryIcon kind={entry.kind} icon={primary?.icon} />
            </div>
          )}
        </motion.div>
        {/* cantos da moldura: fecham sobre a foto depois que ela abre */}
        {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
          <motion.span
            key={c}
            className={`ms-enc-detail__corner ms-enc-detail__corner--${c}`}
            aria-hidden
            initial={reduce ? false : { opacity: 0, scale: 1.25 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
          />
        ))}
      </div>

      <div className="ms-enc-detail__body">
        <h2 className="ms-enc-detail__name" id={titleId}>
          <TextReveal text={entry.name} trigger="mount" delay={0.15} />
        </h2>

        <motion.div className="ms-enc-detail__meta" {...rise(0)}>
          {entry.age != null && (
            <span className="ms-meta">
              <CalendarDays aria-hidden /> {entry.age} anos
            </span>
          )}
          {entry.season && <span className="ms-meta">{entry.season}</span>}
          {entry.seasonRef && <Tag tone="neutral">{entry.seasonRef.name}</Tag>}
          {generation && <Tag tone="neutral">{generation}</Tag>}
        </motion.div>

        {(entry.tags.length > 0 || entry.role) && (
          <motion.div className="ms-enc-detail__tags" {...rise(1)}>
            {entry.kind === 'robot' && entry.role ? (
              <Tag>{entry.role}</Tag>
            ) : (
              entry.tags.map((t) => <Tag key={t}>{tagMap.get(t)?.label ?? t}</Tag>)
            )}
          </motion.div>
        )}

        <motion.div className="ms-enc-detail__section" {...rise(2)}>
          <h3 className="ms-enc-detail__label">
            <ScrollText aria-hidden />
            Sobre
          </h3>
          <div className="ms-prose ms-enc-detail__about">
            {entry.about.split('\n\n').map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </motion.div>
      </div>

      {entry.quote && (
        <motion.blockquote className="ms-enc-detail__quote" {...rise(3)}>
          <QuoteIcon aria-hidden />
          <p>{entry.quote}</p>
        </motion.blockquote>
      )}
    </div>
  );
}
