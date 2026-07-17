import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UploadCloud, Trash2 } from 'lucide-react';
import type { GalleryPhotoDTO } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, Loader, EmptyState, Input } from '../../components/ui';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { queryClient } from '../../lib/queryClient';
import { mediaUrl } from '../../lib/format';
import { ApiError } from '../../lib/api';

export function GallerySection() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-gallery'], queryFn: adminApi.gallery.list });
  const [deleting, setDeleting] = useState<GalleryPhotoDTO | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-gallery'] });
    void queryClient.invalidateQueries({ queryKey: ['gallery'] });
  };

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
    await adminApi.gallery.remove(deleting.id);
    setDeleting(null);
    toast.success('Foto removida.');
    refresh();
  };

  return (
    <div>
      <div className="ms-adm__head">
        <div>
          <h1>Galeria</h1>
          <p>Envie fotos para a galeria pública.</p>
        </div>
      </div>

      <div
        className="ms-uploader__dropzone"
        onClick={() => inputRef.current?.click()}
        style={{ marginBottom: 'var(--ms-space-5)' }}
      >
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
      <div style={{ maxWidth: 400, marginBottom: 'var(--ms-space-6)' }}>
        <Input
          placeholder="Legenda opcional para os próximos envios"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </div>

      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Galeria vazia" />
      ) : (
        <div className="ms-adm__grid">
          {data.map((photo) => (
            <div key={photo.id} className="ms-gal-item">
              <img src={mediaUrl(photo.media.thumbUrl ?? photo.media.url)} alt={photo.caption ?? ''} />
              <div className="ms-gal-item__overlay">
                {photo.caption && <span>{photo.caption}</span>}
                <Button variant="danger" size="sm" onClick={() => setDeleting(photo)}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmDialog message="Remover esta foto da galeria?" onConfirm={remove} onCancel={() => setDeleting(null)} />
      )}
    </div>
  );
}
