import { useQuery } from '@tanstack/react-query';
import type { AwardDTO } from '@minerskills/shared';
import { api } from '../../lib/api';

export function useAwards() {
  return useQuery({
    queryKey: ['awards'],
    queryFn: () => api.get<AwardDTO[]>('/awards'),
  });
}
