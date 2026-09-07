import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Reorder, useDragControls } from 'motion/react';
import {
  UploadCloud,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Save,
  Undo2,
} from 'lucide-react';
import { galleryPhotoSchema, type GalleryPhotoDTO } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, Loader, EmptyState, Input, Textarea, Field } from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { mediaUrl, cx } from '../../lib/format';
import { ApiError } from '../../lib/api';
import './GallerySection.scss';

/** Toda mutação da galeria afeta o painel e a página pública /galeria. */
function refresh() {
  void queryClient.invalidateQueries({ queryKey: ['admin-gallery'] });
  void queryClient.invalidateQueries({ queryKey: ['gallery'] });
}

function sameOrder(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

export function GallerySection() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-gallery'], queryFn: adminApi.gallery.list });
  const [deleting, setDeleting] = useState<GalleryPhotoDTO | null>(null);
  const [editing, setEditing] = useState<GalleryPhotoDTO | null>(null);
  const [removing, setRemoving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  /** Ordem local ainda não salva; `null` = seguir a ordem do servidor. */
  const [draft, setDraft] = useState<string[] | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const photos = data ?? [];
  const byId = new Map(photos.map((p) => [p.id, p]));
  const serverIds = photos.map((p) => p.id);
  // O rascunho é reconciliado com o servidor a cada render: fotos removidas
  // somem da lista e fotos novas (upload) entram no fim, sem perder o arraste.
  const ids = draft
    ? [...draft.filter((id) => byId.has(id)), ...serverIds.filter((id) => !draft.includes(id))]
    : serverIds;
  const ordered = ids.map((id) => byId.get(id)!);
  const dirty = draft !== null && !sameOrder(ids, serverIds);

  const upload = async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const media = await adminApi.media.upload(file);
        await adminApi.gallery.create({ mediaId: media.id, caption: caption || null, order: 0 });
      }
      setCaption('');
      toast.success('Foto(s) adicionada(s).');
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha no upload.');
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await adminApi.gallery.remove(deleting.id);
      setDeleting(null);
      toast.success('Foto removida.');
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao remover.');
    } finally {
      setRemoving(false);
    }
  };

  /** Troca a foto da posição `index` com a vizinha (teclado / botões). */
  const move = (index: number, delta: -1 | 1) => {
    const current = ids[index];
    const neighbour = ids[index + delta];
    if (current === undefined || neighbour === undefined) return;
    const next = [...ids];
    next[index] = neighbour;
    next[index + delta] = current;
    setDraft(next);
  };

  const saveOrder = async () => {
    setSavingOrder(true);
    try {
      await adminApi.gallery.reorder(ids);
      // Reflete a nova ordem no cache antes do refetch para a lista não
      // "voltar" à ordem antiga por um instante.
      queryClient.setQueryData<GalleryPhotoDTO[]>(
        ['admin-gallery'],
        ordered.map((p, order) => ({ ...p, order })),
      );
      setDraft(null);
      toast.success('Ordem salva.');
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar a ordem.');
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Galeria</h1>
          <p>Envie fotos, edite as legendas e defina a ordem em que aparecem no site.</p>
        </div>
      </div>

      <div className="ms-galadm__upload">
        <div className="ms-uploader__dropzone" onClick={() => inputRef.current?.click()}>
          <UploadCloud />
          <p>{uploading ? 'Enviando…' : 'Clique para enviar imagens (aceita múltiplas)'}</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files?.length) void upload(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        <Input
          placeholder="Legenda opcional para os próximos envios"
          aria-label="Legenda para os próximos envios"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={240}
        />
      </div>

      {isLoading ? (
        <Loader />
      ) : ordered.length === 0 ? (
        <EmptyState title="Galeria vazia" description="Envie a primeira foto pela área acima." />
      ) : (
        <>
          <div className="ms-galadm__toolbar">
            <p className="ms-galadm__count">
              {ordered.length} {ordered.length === 1 ? 'foto' : 'fotos'}. Arraste pela alça ou use
              as setas para reordenar.
              {dirty && <span className="ms-galadm__dirty"> Ordem alterada, ainda não salva.</span>}
            </p>
            <div className="ms-galadm__toolbar-actions">
              <Button
                variant="ghost"
                size="sm"
                disabled={!dirty || savingOrder}
                onClick={() => setDraft(null)}
              >
                <Undo2 /> Descartar
              </Button>
              <Button size="sm" disabled={!dirty} loading={savingOrder} onClick={saveOrder}>
                <Save /> Salvar ordem
              </Button>
            </div>
          </div>

          <Reorder.Group
            as="ul"
            axis="y"
            values={ids}
            onReorder={setDraft}
            className="ms-galadm__list"
            aria-label="Fotos da galeria"
          >
            {ordered.map((photo, index) => (
              <GalleryRow
                key={photo.id}
                photo={photo}
                index={index}
                total={ordered.length}
                onMove={move}
                onEdit={() => setEditing(photo)}
                onDelete={() => setDeleting(photo)}
              />
            ))}
          </Reorder.Group>
        </>
      )}

      {editing && (
        <CaptionForm
          photo={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          message={
            deleting.caption
              ? `Remover a foto "${deleting.caption}" da galeria?`
              : 'Remover esta foto da galeria?'
          }
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
          loading={removing}
        />
      )}
    </div>
  );
}

function GalleryRow({
  photo,
  index,
  total,
  onMove,
  onEdit,
  onDelete,
}: {
  photo: GalleryPhotoDTO;
  index: number;
  total: number;
  onMove: (index: number, delta: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  // O arraste começa só pela alça: assim os botões da linha continuam clicáveis
  // (e o toque em celular não vira arraste por acidente).
  const controls = useDragControls();
  const [dragging, setDragging] = useState(false);
  const alt = photo.media.alt ?? '';

  return (
    <Reorder.Item
      value={photo.id}
      dragListener={false}
      dragControls={controls}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      className={cx('ms-galadm__item', dragging && 'ms-galadm__item--dragging')}
      data-id={photo.id}
      title={alt || undefined}
    >
      <span
        className="ms-galadm__handle"
        title="Arraste para reordenar"
        aria-hidden
        onPointerDown={(e) => controls.start(e)}
      >
        <GripVertical />
      </span>
      <span className="ms-galadm__pos">{index + 1}</span>
      <img
        className="ms-galadm__thumb"
        src={mediaUrl(photo.media.thumbUrl ?? photo.media.url)}
        alt={alt}
      />
      <div className="ms-galadm__info">
        <p className={cx('ms-galadm__caption', !photo.caption && 'ms-galadm__caption--empty')}>
          {photo.caption || 'Sem legenda'}
        </p>
        <p className="ms-galadm__alt">
          {alt ? `Texto alternativo: ${alt}` : 'Sem texto alternativo'}
        </p>
      </div>
      <div className="ms-galadm__actions">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Mover para cima"
          title="Mover para cima"
          disabled={index === 0}
          onClick={() => onMove(index, -1)}
        >
          <ChevronUp />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Mover para baixo"
          title="Mover para baixo"
          disabled={index === total - 1}
          onClick={() => onMove(index, 1)}
        >
          <ChevronDown />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Editar legenda"
          title="Editar legenda"
          onClick={onEdit}
        >
          <Pencil />
        </Button>
        <Button
          variant="danger"
          size="sm"
          aria-label="Remover foto"
          title="Remover foto"
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      </div>
    </Reorder.Item>
  );
}

function CaptionForm({
  photo,
  onClose,
  onSaved,
}: {
  photo: GalleryPhotoDTO;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [caption, setCaption] = useState(photo.caption ?? '');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = galleryPhotoSchema.safeParse({
      mediaId: photo.media.id,
      caption: caption.trim() || null,
      order: photo.order,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Legenda inválida');
      return;
    }
    setSaving(true);
    try {
      await adminApi.gallery.update(photo.id, parsed.data);
      toast.success('Legenda salva.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Editar legenda" onClose={onClose}>
      <form onSubmit={save}>
        <div className="ms-galadm__preview">
          <img
            src={mediaUrl(photo.media.thumbUrl ?? photo.media.url)}
            alt={photo.media.alt ?? ''}
          />
          <p>
            {photo.media.alt
              ? `Texto alternativo: ${photo.media.alt}`
              : 'Esta imagem não tem texto alternativo.'}
          </p>
        </div>
        <Field
          label="Legenda"
          hint="Até 240 caracteres. Deixe em branco para remover a legenda."
          error={error}
        >
          <Textarea
            value={caption}
            onChange={(e) => {
              setCaption(e.target.value);
              setError(undefined);
            }}
            maxLength={240}
            rows={3}
            autoFocus
          />
        </Field>
        <div className="ms-modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
