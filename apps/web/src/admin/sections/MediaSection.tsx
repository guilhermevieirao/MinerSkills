import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { updateMediaSchema, type MediaLibraryItemDTO, type MediaUsageDTO } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, EmptyState, Field, FilterChip, Input, Loader, Tag } from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  MEDIA_PER_PAGE,
  MediaPagination,
  MediaThumb,
  formatBytes,
  useDebouncedValue,
} from '../components/MediaLibraryModal';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { ApiError } from '../../lib/api';
import { formatDateTime, mediaUrl } from '../../lib/format';
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

  const params = {
    page,
    perPage: MEDIA_PER_PAGE,
    q: search || undefined,
    kind: kind === 'all' ? undefined : kind,
  };
  const { data, isLoading } = useQuery({
    queryKey: ['admin-media', params],
    queryFn: () => adminApi.media.list(params),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Biblioteca de mídia</h1>
          <p>Imagens e vídeos enviados; veja onde cada arquivo é usado.</p>
        </div>
      </div>

      <div className="ms-media__toolbar">
        <div className="ms-media__filters" role="group" aria-label="Tipo de mídia">
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
        </div>
        <div className="ms-media__search">
          <Field label="Buscar">
            <Input
              type="search"
              placeholder="Nome do arquivo"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </Field>
        </div>
      </div>

      {isLoading ? (
        <Loader />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Nenhuma mídia encontrada"
          description={
            search
              ? 'Tente outro termo de busca.'
              : 'Os arquivos enviados pela galeria, pelos posts e pelos formulários com imagem aparecem aqui.'
          }
        />
      ) : (
        <>
          <p className="ms-media__count">
            {data.total} {data.total === 1 ? 'arquivo' : 'arquivos'}
          </p>
          <div className="ms-media__grid">
            {data.items.map((m) => (
              <button
                key={m.id}
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
                    <Tag>{`Usada em ${m.usage.total}`}</Tag>
                  ) : (
                    <Tag variant="muted">Sem uso</Tag>
                  )}
                </span>
              </button>
            ))}
          </div>
          <MediaPagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}

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
      items: usage.gallery > 0 ? [`${usage.gallery} ${usage.gallery === 1 ? 'foto' : 'fotos'}`] : [],
    },
    { label: 'Timeline', items: usage.timeline.map((t) => t.title) },
    { label: 'Blocos de conteúdo', items: usage.contentBlocks.map((b) => `${b.page} / ${b.key}`) },
    { label: 'Equipe', items: usage.encyclopedia.map((e) => e.name) },
    { label: 'Prêmios', items: usage.awards.map((a) => a.title) },
  ].filter((g) => g.items.length > 0);
}

function MediaDetail({ item, onClose }: { item: MediaLibraryItemDTO; onClose: () => void }) {
  const [alt, setAlt] = useState(item.alt ?? '');
  const [altError, setAltError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [forceMessage, setForceMessage] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ['admin-media-usage', item.id],
    queryFn: () => adminApi.media.usage(item.id),
  });

  const saveAlt = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = updateMediaSchema.safeParse({ alt: alt.trim() || null });
    if (!parsed.success) {
      setAltError('Máximo de 240 caracteres.');
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

  const groups = usage ? usageGroups(usage) : [];

  return (
    <>
      <Modal title="Detalhes da mídia" onClose={onClose}>
        <div className="ms-media__detail">
          <div className="ms-media__preview">
            {item.kind === 'video' ? (
              <video src={mediaUrl(item.url)} controls preload="metadata" />
            ) : (
              <img src={mediaUrl(item.url)} alt={item.alt ?? ''} />
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
              <dd>{formatDateTime(item.createdAt)}</dd>
            </div>
          </dl>

          <form className="ms-media__alt" onSubmit={saveAlt}>
            <Field
              label="Texto alternativo (alt)"
              hint="Descrição curta da imagem para leitores de tela."
              error={altError}
            >
              <Input value={alt} maxLength={240} onChange={(e) => setAlt(e.target.value)} />
            </Field>
            <Button type="submit" variant="outline" loading={saving}>
              Salvar
            </Button>
          </form>

          <section className="ms-media__usage" aria-label="Onde é usada">
            <h3>Onde é usada</h3>
            {usageLoading ? (
              <Loader />
            ) : groups.length === 0 ? (
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
            )}
          </section>

          <div className="ms-modal__actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Fechar
            </Button>
            <Button type="button" variant="danger" onClick={() => setConfirming(true)}>
              <Trash2 /> Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {confirming && (
        <ConfirmDialog
          message={`Remover "${item.originalName}"? O arquivo e a miniatura serão apagados do servidor.`}
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
