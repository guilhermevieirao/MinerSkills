import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Film, Newspaper, Plus, UploadCloud, X } from 'lucide-react';
import {
  postSchema,
  type MediaAssetDTO,
  type PostInput,
  type PostListItemDTO,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import {
  Button,
  EmptyState,
  Field,
  IconButton,
  Input,
  StatusBadge,
  Switch,
  Textarea,
} from '../../components/ui';
import { QueryState } from '../../components/ui/QueryState';
import { ListSkeleton } from '../../components/ui/skeletons';
import { Thumb } from '../../components/ui/tiles';
import { DateText } from '../../components/ui/DateText';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { DataTable } from '../components/DataTable';
import { RowActions } from '../components/RowActions';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaPicker } from '../components/MediaPicker';
import { RichTextEditor } from '../components/RichTextEditor';
import { useNewParam } from '../lib/useNewParam';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { mediaUrl } from '../../lib/format';
import { fieldErrors, focusFirstInvalid } from '../../lib/forms';
import { ApiError } from '../../lib/api';

/** Extrai o ID de uma URL do YouTube (ou aceita o próprio ID). */
function parseYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{5,20}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{5,20})/,
  );
  return m?.[1] ?? null;
}

export function PostsSection() {
  const posts = useQuery({
    queryKey: ['admin-posts'],
    queryFn: adminApi.posts.list,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PostListItemDTO | null>(null);
  const [removing, setRemoving] = useState(false);
  const toast = useToast();

  useNewParam(() => setCreating(true));

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
    void queryClient.invalidateQueries({ queryKey: ['posts'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
  };

  const remove = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await adminApi.posts.remove(deleting.id);
      setDeleting(null);
      toast.success('Post removido.');
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao remover o post.');
    } finally {
      setRemoving(false);
    }
  };

  const newPost = (
    <Button onClick={() => setCreating(true)}>
      <Plus aria-hidden /> Novo post
    </Button>
  );

  return (
    <div>
      <AdminPageHeader
        title="Blog"
        description="Notícias, novidades e bastidores da equipe."
        actions={newPost}
      />

      <QueryState
        query={posts}
        skeleton={<ListSkeleton rows={5} lead={48} />}
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState
            icon={<Newspaper />}
            title="Nenhum post"
            description="Crie o primeiro post do blog."
            action={newPost}
          />
        }
      >
        {(list) => (
          <DataTable
            caption="Posts do blog"
            rows={list}
            rowKey={(p) => p.id}
            rowLabel={(p) => p.title}
            columns={[
              {
                key: 'cover',
                header: 'Capa',
                hideHeader: true,
                lead: true,
                width: '72px',
                render: (p) => <Thumb media={p.cover} />,
              },
              { key: 'title', header: 'Título', primary: true, render: (p) => p.title },
              {
                key: 'status',
                header: 'Status',
                render: (p) => (
                  <StatusBadge status={p.published ? 'published' : 'draft'} />
                ),
              },
              {
                key: 'date',
                header: 'Publicado em',
                render: (p) =>
                  p.publishedAt ? <DateText iso={p.publishedAt} format="short" /> : '—',
              },
            ]}
            actions={(p) => (
              <RowActions
                label={p.title}
                onEdit={() => setEditingId(p.id)}
                onRemove={() => setDeleting(p)}
              />
            )}
          />
        )}
      </QueryState>

      {(creating || editingId) && (
        <PostForm
          id={editingId}
          onClose={() => {
            setCreating(false);
            setEditingId(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditingId(null);
            refresh();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir post"
          message={`O post "${deleting.title}" sai do blog e não pode ser recuperado.`}
          loading={removing}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function PostForm({
  id,
  onClose,
  onSaved,
}: {
  id: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const existing = useQuery({
    queryKey: ['admin-post', id],
    queryFn: () => adminApi.posts.get(id!),
    enabled: !!id,
  });

  // editar: o mesmo modal mostra o esqueleto até o registro chegar
  if (id && !existing.data) {
    return (
      <Modal title="Editar post" size="lg" onClose={onClose}>
        <QueryState query={existing} skeleton={<ListSkeleton rows={4} lead={0} />}>
          {() => null}
        </QueryState>
      </Modal>
    );
  }

  return (
    <PostFormInner existing={existing.data ?? null} onClose={onClose} onSaved={onSaved} />
  );
}

function PostFormInner({
  existing,
  onClose,
  onSaved,
}: {
  existing: Awaited<ReturnType<typeof adminApi.posts.get>> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PostInput>({
    title: existing?.title ?? '',
    excerpt: existing?.excerpt ?? '',
    contentHtml: existing?.contentHtml ?? '<p></p>',
    published: existing?.published ?? false,
    coverId: existing?.cover?.id ?? null,
    mediaIds: existing?.media.map((m) => m.id) ?? [],
    youtube:
      existing?.youtube.map((y) => ({ youtubeId: y.youtubeId, title: y.title })) ?? [],
    links: existing?.links.map((l) => ({ label: l.label, url: l.url })) ?? [],
  });
  const [mediaPreview, setMediaPreview] = useState<MediaAssetDTO[]>(
    existing?.media ?? [],
  );
  const [ytInput, setYtInput] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const toast = useToast();

  const uploadMedia = async (files: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const media = await adminApi.media.upload(file);
        setMediaPreview((prev) => [...prev, media]);
        setForm((f) => ({ ...f, mediaIds: [...f.mediaIds, media.id] }));
      }
      toast.success('Mídia adicionada.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha no upload.');
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (id: string) => {
    setMediaPreview((prev) => prev.filter((m) => m.id !== id));
    setForm((f) => ({ ...f, mediaIds: f.mediaIds.filter((x) => x !== id) }));
  };

  const addYoutube = () => {
    const ytId = parseYoutubeId(ytInput);
    if (!ytId) {
      toast.error('URL ou ID do YouTube inválido.');
      return;
    }
    setForm((f) => ({ ...f, youtube: [...f.youtube, { youtubeId: ytId, title: null }] }));
    setYtInput('');
  };

  const addLink = () => {
    if (!linkLabel.trim() || !linkUrl.trim()) return;
    setForm((f) => ({
      ...f,
      links: [...f.links, { label: linkLabel.trim(), url: linkUrl.trim() }],
    }));
    setLinkLabel('');
    setLinkUrl('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = postSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      requestAnimationFrame(() => focusFirstInvalid(formRef.current));
      toast.error('Verifique os campos do formulário.');
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      if (existing) await adminApi.posts.update(existing.id, parsed.data);
      else await adminApi.posts.create(parsed.data);
      toast.success('Post salvo.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={existing ? 'Editar post' : 'Novo post'}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            Salvar
          </Button>
        </>
      }
    >
      <form id={formId} ref={formRef} onSubmit={save} noValidate>
        <Field label="Título" required error={errors.title}>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field
          label="Resumo"
          required
          hint="Texto curto exibido na listagem."
          error={errors.excerpt}
        >
          <Textarea
            rows={3}
            value={form.excerpt}
            onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
          />
        </Field>

        <MediaPicker
          value={form.coverId ?? null}
          preview={existing?.cover}
          onChange={(m) => setForm({ ...form, coverId: m?.id ?? null })}
          label="Imagem de capa"
        />

        <Field label="Conteúdo" error={errors.contentHtml}>
          <RichTextEditor
            value={form.contentHtml}
            onChange={(html) => setForm({ ...form, contentHtml: html })}
          />
        </Field>

        <div className="ms-form-section">
          <span className="ms-form-section__title">Fotos e vídeos do post</span>
          <button
            type="button"
            className="ms-uploader__dropzone"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Film aria-hidden /> : <UploadCloud aria-hidden />}
            <span>
              {uploading ? 'Enviando…' : 'Clique para enviar fotos ou vídeos (mp4/webm)'}
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/mp4,video/webm"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void uploadMedia(e.target.files);
              e.target.value = '';
            }}
          />
          {mediaPreview.length > 0 && (
            <ul className="ms-thumb-grid" role="list">
              {mediaPreview.map((m, i) => (
                <li key={m.id} className="ms-thumb-grid__item">
                  {m.kind === 'video' ? (
                    <Film aria-hidden />
                  ) : (
                    <img src={mediaUrl(m.thumbUrl ?? m.url)} alt="" />
                  )}
                  <IconButton
                    aria-label={`Remover mídia ${i + 1}`}
                    size="sm"
                    variant="danger"
                    type="button"
                    onClick={() => removeMedia(m.id)}
                  >
                    <X aria-hidden />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ms-form-section">
          <span className="ms-form-section__title">Vídeos do YouTube</span>
          <div className="ms-inline-add">
            <Field label="URL ou ID do vídeo" visuallyHiddenLabel>
              <Input
                placeholder="Cole a URL do YouTube"
                value={ytInput}
                onChange={(e) => setYtInput(e.target.value)}
              />
            </Field>
            <Button type="button" variant="outline" onClick={addYoutube}>
              Adicionar
            </Button>
          </div>
          {form.youtube.length > 0 && (
            <ul className="ms-repeater" role="list">
              {form.youtube.map((y, i) => (
                <li key={`${y.youtubeId}-${i}`} className="ms-repeater__item">
                  <code className="ms-repeater__text">{y.youtubeId}</code>
                  <IconButton
                    type="button"
                    size="sm"
                    variant="danger"
                    aria-label={`Remover vídeo ${y.youtubeId}`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        youtube: f.youtube.filter((_, k) => k !== i),
                      }))
                    }
                  >
                    <X aria-hidden />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ms-form-section">
          <span className="ms-form-section__title">Links relacionados</span>
          <div className="ms-inline-add">
            <Field label="Rótulo do link" visuallyHiddenLabel>
              <Input
                placeholder="Rótulo"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
              />
            </Field>
            <Field label="Endereço do link" visuallyHiddenLabel>
              <Input
                placeholder="https://…"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
            </Field>
            <Button type="button" variant="outline" onClick={addLink}>
              Adicionar
            </Button>
          </div>
          {form.links.length > 0 && (
            <ul className="ms-repeater" role="list">
              {form.links.map((l, i) => (
                <li key={`${l.url}-${i}`} className="ms-repeater__item">
                  <span className="ms-repeater__text">
                    <strong>{l.label}</strong>{' '}
                    <span className="ms-adm__muted ms-adm__truncate">{l.url}</span>
                  </span>
                  <IconButton
                    type="button"
                    size="sm"
                    variant="danger"
                    aria-label={`Remover link ${l.label}`}
                    onClick={() =>
                      setForm((f) => ({ ...f, links: f.links.filter((_, k) => k !== i) }))
                    }
                  >
                    <X aria-hidden />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Switch
          checked={form.published}
          onChange={(e) => setForm({ ...form, published: e.target.checked })}
        >
          Publicado (visível no site)
        </Switch>
      </form>
    </Modal>
  );
}
