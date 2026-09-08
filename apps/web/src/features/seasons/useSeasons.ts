import { useQuery } from '@tanstack/react-query';
import type { SeasonDTO, SeasonDetailDTO } from '@minerskills/shared';
import { api } from '../../lib/api';

/** Chave de cache da lista pública — invalidada pelo painel após cada mutação. */
export const SEASONS_QUERY_KEY = ['seasons'] as const;

/** Temporadas ordenadas por `order`, ano ↓, com contagem de robôs e prêmios. */
export function useSeasons() {
  return useQuery({
    queryKey: SEASONS_QUERY_KEY,
    queryFn: () => api.get<SeasonDTO[]>('/seasons'),
  });
}

/**
 * Detalhe de uma temporada (robôs, prêmios e eventos publicados do ano).
 * Não busca enquanto `slug` for null — a página só carrega o card expandido.
 */
export function useSeason(slug: string | null) {
  return useQuery({
    queryKey: ['seasons', slug],
    queryFn: () => api.get<SeasonDetailDTO>(`/seasons/${slug}`),
    enabled: !!slug,
  });
}
