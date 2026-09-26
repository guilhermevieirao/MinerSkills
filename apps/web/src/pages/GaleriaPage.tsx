import { useMemo, useState } from 'react';
import { Images } from 'lucide-react';
import { PageHero } from '../components/layout/PageHero';
import { useGallery } from '../features/gallery/useGallery';
import { EmptyState } from '../components/ui';
import { QueryState } from '../components/ui/QueryState';
import { CardGridSkeleton } from '../components/ui/skeletons';
import { MediaImage } from '../components/ui/MediaImage';
import { Lightbox } from '../components/ui/Lightbox';
import { useDocumentHead } from '../lib/useDocumentHead';
import './GaleriaPage.scss';

const DESCRIPTION = 'Momentos da equipe: bancada, competições, bastidores e conquistas.';

/**
 * Galeria em grade de quadrados (4 → 3 → 2 colunas), na ORDEM definida no
 * painel — colunas CSS liam em ziguezague. A legenda aparece ao pousar/focar
 * no desktop e fica sempre visível no celular; cada foto abre o lightbox.
 */
export function GaleriaPage() {
  const gallery = useGallery();
  const [index, setIndex] = useState<number | null>(null);

  useDocumentHead({
    title: 'Galeria',
    description: DESCRIPTION,
    canonicalPath: '/galeria',
  });

  const items = useMemo(
    () =>
      (gallery.data ?? []).map((p) => ({
        url: p.media.url,
        alt: p.media.alt,
        caption: p.caption,
      })),
    [gallery.data],
  );

  return (
    <>
      <PageHero kicker="Registros" title="Galeria" subtitle={DESCRIPTION} />

      <section className="ms-section ms-container">
        <QueryState
          query={gallery}
          skeleton={<CardGridSkeleton count={8} aspect="1" min={220} body={false} />}
          isEmpty={(photos) => photos.length === 0}
          empty={
            <EmptyState
              icon={<Images />}
              title="Galeria vazia"
              description="Em breve, novas fotos."
            />
          }
        >
          {(photos) => (
            <ul className="ms-gallery" role="list">
              {photos.map((photo, i) => (
                <li key={photo.id}>
                  <button
                    type="button"
                    className="ms-gallery__item"
                    onClick={() => setIndex(i)}
                    aria-label={
                      photo.caption ?? `Ampliar foto ${i + 1} de ${photos.length}`
                    }
                  >
                    <MediaImage
                      media={photo.media}
                      alt={photo.media.alt ?? photo.caption ?? ''}
                      thumb
                      sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                    />
                    {photo.caption && (
                      <span className="ms-gallery__caption">{photo.caption}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </section>

      <Lightbox
        items={items}
        index={index}
        onClose={() => setIndex(null)}
        onNavigate={setIndex}
      />
    </>
  );
}
