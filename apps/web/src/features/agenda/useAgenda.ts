import { useQuery } from '@tanstack/react-query';
import type { AgendaEventDTO } from '@minerskills/shared';
import { api } from '../../lib/api';

export function useAgenda() {
  return useQuery({
    queryKey: ['agenda'],
    queryFn: () => api.get<AgendaEventDTO[]>('/agenda'),
  });
}
