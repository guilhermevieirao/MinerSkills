import { useId, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Images, Trash2 } from 'lucide-react';
import {
  updateMediaSchema,
  type MediaLibraryItemDTO,
  type MediaUsageDTO,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import {
  Button,
  ChipRow,
  EmptyState,
  Field,
  FilterChip,
  Input,
  LinkButton,
  SearchField,
  Tag,
} from '../../components/ui';
import { QueryState } from '../../components/ui/QueryState';
import { CardGridSkeleton, ListSkeleton } from '../../components/ui/skeletons';
import { MediaImage } from '../../components/ui/MediaImage';
import { Pagination } from '../../components/ui/Pagination';
import { DateText } from '../../components/ui/DateText';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  MEDIA_PER_PAGE,
  MediaThumb,
  formatBytes,
  useDebouncedValue,
} from '../components/MediaLibraryModal';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { ApiError } from '../../lib/api';
import { mediaUrl } from '../../lib/format';
import { fieldErrors, focusFirstInvalid } from '../../lib/forms';
import './MediaSection.scss';

type KindFilter = 'all' | 'image' | 'video';

const KIND_FILTERS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'image', label: 'Imagens' },
  { value: 'video', label: 'Vídeos' },
];

/** Segundo passo da exclusão: o que acontece com cada tipo de referência. */
const FORCE_WARNING =
  'Fotos da galeria e mídias de posts serão removidas; capas, fotos de membros e badges ficarão sem imagem.';

/**
 * Uma mídia pode aparecer em qualquer tela do painel e do site. Depois de
 * alterar o alt ou remover, invalida tudo o que a exibe (as chaves públicas
 * com parâmetros — ['pages', p], ['posts', page, q] — casam pelo prefixo).
 */
const MEDIA_CONSUMER_KEYS = [
  'admin-media',
  'admin-media-usage',
  'admin-dashboard',
  'admin-gallery',
  'gallery',
  'admin-posts',
  'admin-post',
  'posts',
  'post',
  'admin-timeline',
  'timeline',
  'admin-blocks',
  'pages',
  'admin-encyclopedia',
  'encyclopedia',
  'admin-awards',
  'awards',
];

function invalidateMediaQueries() {
  for (const key of MEDIA_CONSUMER_KEYS) {
    void queryClient.invalidateQueries({ queryKey: [key] });
  }
}

export function MediaSection() {
  const [kind, setKind] = useState<KindFilter>('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MediaLibraryItemDTO | null>(null);
  const search = useDebouncedValue(q.trim());
  const filtered = !!search || kind !== 'all';

  const params = {
    page,
    perPage: MEDIA_PER_PAGE,
    q: search || undefined,
    kind: kind === 'all' ? undefined : kind,
  };
  const media = useQuery({
    queryKey: ['admin-media', params],
    queryFn: () => adminApi.media.list(params),
    placeholderData: keepPreviousData,
  });

  const clearFilters = () => {
    setQ('');
    setKind('all');
    setPage(1);
  };

  return (
    <div>
      <AdminPageHeader
        title="Biblioteca de mídia"
        description="Imagens e vídeos enviados; veja onde cada arquivo é usado."
      />

      <div className="ms-toolbar">
        <ChipRow label="Tipo de mídia">
          {KIND_FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={kind === f.value}
              onClick={() => {
                setKind(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </FilterChip>
          ))}
        </ChipRow>
        <SearchField
          aria-label="Buscar"
          placeholder="Buscar pelo nome do arquivo"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        {media.data && (
          <div className="ms-toolbar__end">
            <span className="ms-toolbar__count">
              {media.data.total} {media.data.total === 1 ? 'arquivo' : 'arquivos'}
            </span>
          </div>
        )}
      </div>

      <QueryState
        query={media}
        skeleton={<CardGridSkeleton count={12} aspect="1" min={180} />}
        isEmpty={(data) => data.items.length === 0}
        empty={
          <EmptyState
            icon={<Images />}
            title="Nenhuma mídia encontrada"
            description={
              filtered
                ? 'Nenhum arquivo corresponde à busca ou ao filtro.'
                : 'Os arquivos enviados pela galeria, pelos posts e pelos formulários com imagem aparecem aqui.'
            }
            action={
              filtered ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : (
                <LinkButton to="/admin/galeria" variant="outline">
                  Enviar fotos pela galeria
                </LinkButton>
              )
            }
          />
        }
      >
        {(data) => (
          <ul className="ms-media__grid" role="list">
            {data.items.map((m) => (
              <li key={m.id} className="ms-media__cell">
                <button
                  type="button"
                  className="ms-media__card"
                  onClick={() => setSelected(m)}
                >
                  <MediaThumb media={m} />
                  <span className="ms-media__body">
                    <span className="ms-media__name" title={m.originalName}>
                      {m.originalName}
                    </span>
                    <span className="ms-media__meta">{formatBytes(m.sizeBytes)}</span>
                  </span>
                  <span className="ms-media__badge">
                    {m.usage.total > 0 ? (
                      <Tag tone="success">{`Usada em ${m.usage.total}`}</Tag>
                    ) : (
                      <Tag tone="neutral">Sem uso</Tag>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </QueryState>

      <Pagination
        page={media.data?.page ?? page}
        totalPages={media.data?.totalPages ?? 1}
        onChange={setPage}
        loading={media.isPlaceholderData}
      />

      {selected && <MediaDetail item={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/** Agrupa o MediaUsageDTO em blocos rotulados, descartando os vazios. */
function usageGroups(usage: MediaUsageDTO): { label: string; items: string[] }[] {
  return [
    { label: 'Capa de post', items: usage.posts.map((p) => p.title) },
    { label: 'Fotos do post', items: usage.postMedia.map((p) => p.title) },
    {
      label: 'Galeria',
      items:
        usage.gallery > 0
          ? [`${usage.gallery} ${usage.gallery === 1 ? 'foto' : 'fotos'}`]
          : [],
    },
    { label: 'Timeline', items: usage.timeline.map((t) => t.title) },
    {
      label: 'Blocos de conteúdo',
      items: usage.contentBlocks.map((b) => `${b.page} / ${b.key}`),
    },
    { label: 'Equipe', items: usage.encyclopedia.map((e) => e.name) },
    { label: 'Prêmios', items: usage.awards.map((a) => a.title) },
    { label: 'Patrocinadores', items: usage.sponsors.map((s) => s.name) },
    { label: 'Temporadas', items: usage.seasons.map((s) => s.name) },
  ].filter((g) => g.items.length > 0);
}

function MediaDetail({
  item,
  onClose,
}: {
  item: MediaLibraryItemDTO;
  onClose: () => void;
}) {
  const [alt, setAlt] = useState(item.alt ?? '');
  const [altError, setAltError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [forceMessage, setForceMessage] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const altFormRef = useRef<HTMLFormElement>(null);
  const altFormId = useId();
  const toast = useToast();

  const usage = useQuery({
    queryKey: ['admin-media-usage', item.id],
    queryFn: () => adminApi.media.usage(item.id),
  });

  const saveAlt = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = updateMediaSchema.safeParse({ alt: alt.trim() || null });
    if (!parsed.success) {
      setAltError(fieldErrors(parsed.error).alt ?? 'Máximo de 240 caracteres.');
      requestAnimationFrame(() => focusFirstInvalid(altFormRef.current));
      return;
    }
    setAltError(undefined);
    setSaving(true);
    try {
      await adminApi.media.update(item.id, parsed.data);
      toast.success('Mídia atualizada.');
      invalidateMediaQueries();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (force: boolean) => {
    setRemoving(true);
    try {
      await adminApi.media.remove(item.id, force);
      toast.success('Mídia removida.');
      invalidateMediaQueries();
      onClose();
    } catch (err) {
      if (!force && err instanceof ApiError && err.status === 409) {
        // em uso: a API exige confirmação explícita (segundo diálogo)
        setConfirming(false);
        setForceMessage(err.message);
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Erro ao remover.');
      }
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
      <Modal
        title="Detalhes da mídia"
        onClose={onClose}
        footer={
          <>
            {/* destrutivo à esquerda, longe do fechar */}
            <Button type="button" variant="danger" onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden /> Excluir
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </>
        }
      >
        <div className="ms-media__detail">
          <div className="ms-media__preview">
            {item.kind === 'video' ? (
              <video src={mediaUrl(item.url)} controls preload="metadata" />
            ) : (
              <MediaImage media={item} alt={item.alt ?? ''} />
            )}
          </div>

          <dl className="ms-media__facts">
            <div>
              <dt>Arquivo</dt>
              <dd>{item.originalName}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>{item.mimeType}</dd>
            </div>
            <div>
              <dt>Tamanho</dt>
              <dd>{formatBytes(item.sizeBytes)}</dd>
            </div>
            {item.width && item.height && (
              <div>
                <dt>Dimensões</dt>
                <dd>
                  {item.width} x {item.height} px
                </dd>
              </div>
            )}
            <div>
              <dt>Enviado em</dt>
              <dd>
                <DateText iso={item.createdAt} format="datetime" meta={false} />
              </dd>
            </div>
          </dl>

          <form
            id={altFormId}
            ref={altFormRef}
            className="ms-media__alt"
            onSubmit={saveAlt}
            noValidate
          >
            <Field
              label="Texto alternativo (alt)"
              optional
              hint="Descrição curta da imagem para leitores de tela."
              error={altError}
            >
              <Input
                value={alt}
                maxLength={240}
                onChange={(e) => setAlt(e.target.value)}
              />
            </Field>
            <Button type="submit" variant="outline" loading={saving}>
              Salvar
            </Button>
          </form>

          <section className="ms-media__usage" aria-labelledby={`${altFormId}-usage`}>
            <h3 id={`${altFormId}-usage`}>Onde é usada</h3>
            <QueryState
              query={usage}
              compact
              skeleton={<ListSkeleton rows={2} lead={0} />}
            >
              {(data) => {
                const groups = usageGroups(data);
                return groups.length === 0 ? (
                  <p className="ms-media__none">Não é usada em nenhum lugar.</p>
                ) : (
                  <dl>
                    {groups.map((g) => (
                      <div key={g.label}>
                        <dt>{g.label}</dt>
                        {g.items.map((label, i) => (
                          <dd key={`${g.label}-${i}`}>{label}</dd>
                        ))}
                      </div>
                    ))}
                  </dl>
                );
              }}
            </QueryState>
          </section>
        </div>
      </Modal>

      {confirming && (
        <ConfirmDialog
          title="Excluir mídia"
          message={`"${item.originalName}" e a miniatura serão apagados do servidor. Isso não pode ser desfeito.`}
          onConfirm={() => void remove(false)}
          onCancel={() => setConfirming(false)}
          loading={removing}
        />
      )}

      {forceMessage && (
        <ConfirmDialog
          title="Mídia em uso"
          message={`${forceMessage} ${FORCE_WARNING}`}
          confirmLabel="Excluir mesmo assim"
          onConfirm={() => void remove(true)}
          onCancel={() => setForceMessage(null)}
          loading={removing}
        />
      )}
    </>
  );
}
