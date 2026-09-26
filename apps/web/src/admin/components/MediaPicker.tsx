import { useRef, useState } from 'react';
import { Image as ImageIcon, ImageOff, Library, UploadCloud, X } from 'lucide-react';
import type { MediaAssetDTO } from '@minerskills/shared';
import { adminApi } from '../adminApi';
import { Button, FieldGroup } from '../../components/ui';
import { Thumb } from '../../components/ui/tiles';
import { useToast } from '../../components/ui/Toast';
import { ApiError } from '../../lib/api';
import { MediaLibraryModal } from './MediaLibraryModal';
import '../sections/MediaSection.scss';

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
  const hasImage = !!(current || value);

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
    <FieldGroup label={label}>
      <div className="ms-media__picker">
        {/* imagem definida mas sem prévia carregada: ícone neutro, não "sem imagem" */}
        <Thumb media={current} icon={hasImage ? ImageIcon : ImageOff} size="lg" />
        <div className="ms-media__picker-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud aria-hidden /> Enviar
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setLibraryOpen(true)}
          >
            <Library aria-hidden /> Escolher da biblioteca
          </Button>
          {hasImage && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCurrent(null);
                onChange(null);
              }}
            >
              <X aria-hidden /> Remover
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
        <MediaLibraryModal
          onSelect={pickFromLibrary}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </FieldGroup>
  );
}
