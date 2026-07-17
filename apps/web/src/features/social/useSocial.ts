import { useQuery } from '@tanstack/react-query';
import type { SocialLinkDTO } from '@minerskills/shared';
import { api } from '../../lib/api';

export function useSocialLinks() {
  return useQuery({
    queryKey: ['social-links'],
    queryFn: () => api.get<SocialLinkDTO[]>('/social-links'),
    staleTime: 5 * 60_000,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Record<string, string>>('/settings'),
    staleTime: 5 * 60_000,
  });
}
