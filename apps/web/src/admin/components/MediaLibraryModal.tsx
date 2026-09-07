import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Film } from 'lucide-react';
import type { MediaAssetDTO } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, EmptyState, Field, Input, Loader } from '../../components/ui';
import { Modal } from './Modal';
import { cx, mediaUrl } from '../../lib/format';
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

/** Miniatura: imagem (thumb) ou ícone de filme para vídeos. */
export function MediaThumb({ media, className }: { media: MediaAssetDTO; className?: string }) {
  if (media.kind === 'video') {
    return (
      <span className={cx('ms-media__thumb ms-media__thumb--video', className)} aria-hidden>
        <Film />
      </span>
    );
  }
  return (
    <img
      className={cx('ms-media__thumb', className)}
      src={mediaUrl(media.thumbUrl ?? media.url)}
      alt={media.alt ?? ''}
      loading="lazy"
    />
  );
}

/** Navegação 'Anterior' / 'Próxima' das listas paginadas de mídia. */
export function MediaPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  return (
    <nav className="ms-media__pagination" aria-label="Paginação">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Anterior
      </Button>
      <span>
        Página {page} de {totalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Próxima
      </Button>
    </nav>
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

  const params = { kind: 'image' as const, page, perPage: MEDIA_PER_PAGE, q: search || undefined };
  const { data, isLoading } = useQuery({
    queryKey: ['admin-media', params],
    queryFn: () => adminApi.media.list(params),
    placeholderData: keepPreviousData,
  });

  return (
    <Modal title="Escolher da biblioteca" onClose={onClose}>
      <Field label="Buscar">
        <Input
          placeholder="Nome do arquivo"
          value={q}
          autoFocus
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </Field>

      {isLoading ? (
        <Loader />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Nenhuma imagem encontrada"
          description={search ? 'Tente outro termo de busca.' : 'Envie uma imagem pelo botão "Enviar".'}
        />
      ) : (
        <>
          <div className="ms-media__grid ms-media__grid--compact">
            {data.items.map((m) => (
              <button
                key={m.id}
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
            ))}
          </div>
          <MediaPagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </Modal>
  );
}
