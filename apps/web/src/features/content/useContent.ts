import { useQuery } from '@tanstack/react-query';
import type {
  ContentBlockDTO,
  TimelineItemDTO,
  EditablePage,
} from '@minerskills/shared';
import { api } from '../../lib/api';

export function usePageBlocks(page: EditablePage) {
  const query = useQuery({
    queryKey: ['pages', page],
    queryFn: () => api.get<ContentBlockDTO[]>(`/pages/${page}`),
  });

  /** Helper para acessar um bloco pelo key. */
  const byKey = (key: string) => query.data?.find((b) => b.key === key);
  return { ...query, byKey };
}

export function useTimeline() {
  return useQuery({
    queryKey: ['timeline'],
    queryFn: () => api.get<TimelineItemDTO[]>('/timeline'),
  });
}
