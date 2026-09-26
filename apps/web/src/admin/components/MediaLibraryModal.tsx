import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Film, ImageOff } from 'lucide-react';
import type { MediaAssetDTO } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, EmptyState, SearchField } from '../../components/ui';
import { QueryState } from '../../components/ui/QueryState';
import { CardGridSkeleton } from '../../components/ui/skeletons';
import { MediaImage } from '../../components/ui/MediaImage';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from './Modal';
import { cx } from '../../lib/format';
import '../sections/MediaSection.scss';

/** Itens por página da biblioteca (grade de cards). */
export const MEDIA_PER_PAGE = 24;

/** Tamanho legível: KB até 1 MB, depois MB com uma casa decimal. */
export function formatBytes(bytes: number): string {
  const mb = 1024 * 1024;
  if (bytes < mb) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / mb).toFixed(1).replace('.', ',')} MB`;
}

/** Valor com atraso de `delay` ms — evita uma requisição por tecla na busca. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Miniatura quadrada do card: imagem (thumb) ou ícone de filme para vídeos.
 * Decorativa — o nome do arquivo, ao lado, é o que identifica o card.
 */
export function MediaThumb({
  media,
  className,
}: {
  media: MediaAssetDTO;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'ms-media__thumb',
        media.kind === 'video' && 'ms-media__thumb--video',
        className,
      )}
      aria-hidden
    >
      {media.kind === 'video' ? <Film /> : <MediaImage media={media} alt="" thumb />}
    </span>
  );
}

/**
 * Escolhe uma imagem já enviada em vez de fazer novo upload.
 * Só lista imagens: os campos que usam o <MediaPicker> são todos de imagem.
 */
export function MediaLibraryModal({
  onSelect,
  onClose,
}: {
  onSelect: (media: MediaAssetDTO) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(q.trim());

  const params = {
    kind: 'image' as const,
    page,
    perPage: MEDIA_PER_PAGE,
    q: search || undefined,
  };
  const media = useQuery({
    queryKey: ['admin-media', params],
    queryFn: () => adminApi.media.list(params),
    placeholderData: keepPreviousData,
  });

  return (
    <Modal
      title="Escolher da biblioteca"
      description="Clique em uma imagem para usá-la neste campo."
      size="lg"
      onClose={onClose}
    >
      <div className="ms-toolbar">
        <SearchField
          aria-label="Buscar na biblioteca"
          placeholder="Nome do arquivo"
          value={q}
          autoFocus
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        {media.data && (
          <div className="ms-toolbar__end">
            <span className="ms-toolbar__count">
              {media.data.total} {media.data.total === 1 ? 'imagem' : 'imagens'}
            </span>
          </div>
        )}
      </div>

      <QueryState
        query={media}
        skeleton={<CardGridSkeleton count={8} aspect="1" min={130} body={false} />}
        isEmpty={(data) => data.items.length === 0}
        empty={
          <EmptyState
            size="sm"
            icon={<ImageOff />}
            title="Nenhuma imagem encontrada"
            description={
              search
                ? 'Tente outro termo de busca.'
                : 'Envie uma imagem pelo botão "Enviar".'
            }
            action={
              search ? (
                <Button variant="outline" size="sm" onClick={() => setQ('')}>
                  Limpar busca
                </Button>
              ) : undefined
            }
          />
        }
      >
        {(data) => (
          <ul className="ms-media__grid ms-media__grid--compact" role="list">
            {data.items.map((m) => (
              <li key={m.id} className="ms-media__cell">
                <button
                  type="button"
                  className="ms-media__card"
                  title={m.originalName}
                  onClick={() => onSelect(m)}
                >
                  <MediaThumb media={m} />
                  <span className="ms-media__body">
                    <span className="ms-media__name">{m.originalName}</span>
                    <span className="ms-media__meta">{formatBytes(m.sizeBytes)}</span>
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
        className="ms-media__pagination"
      />
    </Modal>
  );
}
