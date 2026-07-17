import { useQuery } from '@tanstack/react-query';
import type { GalleryPhotoDTO } from '@minerskills/shared';
import { api } from '../../lib/api';

export function useGallery() {
  return useQuery({
    queryKey: ['gallery'],
    queryFn: () => api.get<GalleryPhotoDTO[]>('/gallery'),
  });
}
