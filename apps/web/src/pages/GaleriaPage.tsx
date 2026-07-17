import { useState } from 'react';
import { Images } from 'lucide-react';
import { motion } from 'motion/react';
import { PageHero } from '../components/layout/PageHero';
import { useGallery } from '../features/gallery/useGallery';
import { EmptyState, Loader } from '../components/ui';
import { Lightbox } from '../components/ui/Lightbox';
import { mediaUrl } from '../lib/format';
import './GaleriaPage.scss';

export function GaleriaPage() {
  const { data, isLoading } = useGallery();
  const [index, setIndex] = useState<number | null>(null);

  const items = (data ?? []).map((p) => ({
    url: p.media.url,
    alt: p.media.alt,
    caption: p.caption,
  }));

  return (
    <>
      <PageHero
        kicker="Registros"
        title="Galeria"
        subtitle="Momentos da equipe: bancada, competições, bastidores e conquistas."
      />

      <section className="ms-section ms-container">
        {isLoading ? (
          <Loader />
        ) : items.length === 0 ? (
          <EmptyState icon={<Images />} title="Galeria vazia" description="Em breve, novas fotos." />
        ) : (
          <div className="ms-gallery">
            {(data ?? []).map((photo, i) => (
              <motion.button
                key={photo.id}
                className="ms-gallery__item"
                onClick={() => setIndex(i)}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.4, delay: (i % 6) * 0.03 }}
                aria-label={photo.caption ?? 'Ampliar foto'}
              >
                <img
                  src={mediaUrl(photo.media.thumbUrl ?? photo.media.url)}
                  alt={photo.media.alt ?? photo.caption ?? ''}
                  loading="lazy"
                />
                {photo.caption && <span className="ms-gallery__caption">{photo.caption}</span>}
              </motion.button>
            ))}
          </div>
        )}
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
