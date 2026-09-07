import { useRef, useState } from 'react';
import { UploadCloud, ImageOff, Library } from 'lucide-react';
import type { MediaAssetDTO } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { mediaUrl } from '../../lib/format';
import { Button } from '../../components/ui';
import { useToast } from '../../components/ui/Toast';
import { ApiError } from '../../lib/api';
import { MediaLibraryModal } from './MediaLibraryModal';

/**
 * Campo de imagem única: faz upload de um arquivo novo ou escolhe uma imagem
 * já existente na biblioteca; devolve o MediaAsset via onChange.
 */
export function MediaPicker({
  value,
  preview,
  onChange,
  label = 'Imagem',
}: {
  value: string | null;
  preview?: MediaAssetDTO | null;
  onChange: (media: MediaAssetDTO | null) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [current, setCurrent] = useState<MediaAssetDTO | null>(preview ?? null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const toast = useToast();

  const pickFromLibrary = (media: MediaAssetDTO) => {
    setCurrent(media);
    onChange(media);
    setLibraryOpen(false);
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const media = await adminApi.media.upload(file);
      setCurrent(media);
      onChange(media);
      toast.success('Imagem enviada.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Falha no upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="ms-field">
      <span className="ms-field__label">{label}</span>
      <div className="ms-uploader__preview">
        {current || value ? (
          <img
            className="ms-uploader__thumb"
            src={mediaUrl(current?.thumbUrl ?? current?.url ?? '')}
            alt=""
          />
        ) : (
          <div className="ms-uploader__thumb" style={{ display: 'grid', placeItems: 'center' }}>
            <ImageOff style={{ width: 24, height: 24, color: 'var(--ms-text-faint)' }} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 'var(--ms-space-2)', flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud /> Enviar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setLibraryOpen(true)}>
            <Library /> Escolher da biblioteca
          </Button>
          {(current || value) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCurrent(null);
                onChange(null);
              }}
            >
              Remover
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = '';
          }}
        />
      </div>
      {libraryOpen && (
        <MediaLibraryModal onSelect={pickFromLibrary} onClose={() => setLibraryOpen(false)} />
      )}
    </div>
  );
}
