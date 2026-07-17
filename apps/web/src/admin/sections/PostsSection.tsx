import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, UploadCloud, Film } from 'lucide-react';
import {
  postSchema,
  type PostListItemDTO,
  type PostInput,
  type MediaAssetDTO,
} from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, Input, Textarea, Field, Loader, EmptyState } from '../../components/ui';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MediaPicker } from '../components/MediaPicker';
import { RichTextEditor } from '../components/RichTextEditor';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { formatDate, mediaUrl } from '../../lib/format';
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
  const { data, isLoading } = useQuery({ queryKey: ['admin-posts'], queryFn: adminApi.posts.list });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<PostListItemDTO | null>(null);
  const toast = useToast();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
    void queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const remove = async () => {
    if (!deleting) return;
    await adminApi.posts.remove(deleting.id);
    setDeleting(null);
    toast.success('Post removido.');
    refresh();
  };

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Blog</h1>
          <p>Notícias, novidades e bastidores da equipe.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus /> Novo post
        </Button>
      </div>

      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Nenhum post" description="Crie o primeiro post do blog." />
      ) : (
        <div className="ms-adm__table-wrap">
          <table className="ms-adm__table">
            <thead>
              <tr>
                <th></th>
                <th>Título</th>
                <th>Status</th>
                <th>Publicado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.cover && (
                      <img className="ms-adm__thumb" src={mediaUrl(p.cover.thumbUrl ?? p.cover.url)} alt="" />
                    )}
                  </td>
                  <td>{p.title}</td>
                  <td>
                    <span className={`ms-adm__status ms-adm__status--${p.published ? 'published' : 'draft'}`}>
                      {p.published ? 'Publicado' : 'Rascunho'}
                    </span>
                  </td>
                  <td>{p.publishedAt ? formatDate(p.publishedAt, 'dd/MM/yyyy') : '—'}</td>
                  <td>
                    <div className="ms-adm__row-actions">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(p.id)}>
                        <Pencil />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleting(p)}>
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
        <ConfirmDialog message={`Remover o post "${deleting.title}"?`} onConfirm={remove} onCancel={() => setDeleting(null)} />
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
  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin-post', id],
    queryFn: () => adminApi.posts.get(id!),
    enabled: !!id,
  });

  if (id && isLoading) {
    return (
      <Modal title="Carregando…" onClose={onClose}>
        <Loader />
      </Modal>
    );
  }

  return <PostFormInner existing={existing ?? null} onClose={onClose} onSaved={onSaved} />;
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
    youtube: existing?.youtube.map((y) => ({ youtubeId: y.youtubeId, title: y.title })) ?? [],
    links: existing?.links.map((l) => ({ label: l.label, url: l.url })) ?? [],
  });
  const [mediaPreview, setMediaPreview] = useState<MediaAssetDTO[]>(existing?.media ?? []);
  const [ytInput, setYtInput] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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
    setForm((f) => ({ ...f, links: [...f.links, { label: linkLabel.trim(), url: linkUrl.trim() }] }));
    setLinkLabel('');
    setLinkUrl('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = postSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[i.path[0] as string] = i.message;
      setErrors(errs);
      toast.error('Verifique os campos do formulário.');
      return;
    }
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
    <Modal title={existing ? 'Editar post' : 'Novo post'} onClose={onClose}>
      <form onSubmit={save}>
        <Field label="Título" error={errors.title}>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Resumo" hint="Texto curto exibido na listagem." error={errors.excerpt}>
          <Textarea
            value={form.excerpt}
            style={{ minHeight: 70 }}
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
          <RichTextEditor value={form.contentHtml} onChange={(html) => setForm({ ...form, contentHtml: html })} />
        </Field>

        {/* Mídia extra (fotos e vídeos) */}
        <div className="ms-field">
          <span className="ms-field__label">Fotos e vídeos do post</span>
          <div className="ms-uploader__dropzone" onClick={() => fileRef.current?.click()}>
            {uploading ? <Film /> : <UploadCloud />}
            <p>{uploading ? 'Enviando…' : 'Clique para enviar fotos ou vídeos (mp4/webm)'}</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/mp4,video/webm"
              multiple
              onChange={(e) => {
                if (e.target.files?.length) void uploadMedia(e.target.files);
                e.target.value = '';
              }}
            />
          </div>
          {mediaPreview.length > 0 && (
            <div className="ms-adm__grid" style={{ marginTop: 'var(--ms-space-3)' }}>
              {mediaPreview.map((m) => (
                <div key={m.id} className="ms-gal-item">
                  {m.kind === 'video' ? (
                    <div style={{ display: 'grid', placeItems: 'center', height: '100%', background: 'var(--ms-surface-2)' }}>
                      <Film style={{ width: 32, height: 32, color: 'var(--ms-green)' }} />
                    </div>
                  ) : (
                    <img src={mediaUrl(m.thumbUrl ?? m.url)} alt="" />
                  )}
                  <div className="ms-gal-item__overlay">
                    <Button variant="danger" size="sm" type="button" onClick={() => removeMedia(m.id)}>
                      <X />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* YouTube */}
        <div className="ms-field">
          <span className="ms-field__label">Vídeos do YouTube</span>
          <div style={{ display: 'flex', gap: 'var(--ms-space-2)' }}>
            <Input
              placeholder="Cole a URL do YouTube"
              value={ytInput}
              onChange={(e) => setYtInput(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={addYoutube}>
              Adicionar
            </Button>
          </div>
          {form.youtube.length > 0 && (
            <div className="ms-repeater" style={{ marginTop: 'var(--ms-space-3)' }}>
              {form.youtube.map((y, i) => (
                <div key={`${y.youtubeId}-${i}`} className="ms-repeater__item">
                  <code style={{ flex: 1 }}>{y.youtubeId}</code>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => setForm((f) => ({ ...f, youtube: f.youtube.filter((_, k) => k !== i) }))}
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Links */}
        <div className="ms-field">
          <span className="ms-field__label">Links relacionados</span>
          <div style={{ display: 'flex', gap: 'var(--ms-space-2)' }}>
            <Input placeholder="Rótulo" value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} />
            <Input placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
            <Button type="button" variant="outline" onClick={addLink}>
              Adicionar
            </Button>
          </div>
          {form.links.length > 0 && (
            <div className="ms-repeater" style={{ marginTop: 'var(--ms-space-3)' }}>
              {form.links.map((l, i) => (
                <div key={`${l.url}-${i}`} className="ms-repeater__item">
                  <span style={{ flex: 1 }}>
                    <strong>{l.label}</strong> — <span style={{ color: 'var(--ms-text-dim)' }}>{l.url}</span>
                  </span>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => setForm((f) => ({ ...f, links: f.links.filter((_, k) => k !== i) }))}
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <label className="ms-checkbox">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />
          Publicado (visível no site)
        </label>

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
