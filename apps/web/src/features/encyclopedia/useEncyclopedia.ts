import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { EncyclopediaEntryDTO } from '@minerskills/shared';
import { api } from '../../lib/api';

export interface EncyclopediaFilters {
  kind?: string;
  tag?: string;
  generation?: string;
  former?: boolean;
}

/**
 * Registros da equipe filtrados. `keepPreviousData`: ao trocar o filtro, a
 * grade atual fica na tela (esmaecida) até a nova lista chegar — sem esqueleto
 * nem contador piscando "0".
 */
export function useEncyclopedia(filters: EncyclopediaFilters) {
  return useQuery({
    queryKey: ['encyclopedia', filters],
    queryFn: () =>
      api.get<EncyclopediaEntryDTO[]>('/encyclopedia', {
        kind: filters.kind,
        tag: filters.tag,
        generation: filters.generation,
        former: filters.former,
      }),
    placeholderData: keepPreviousData,
  });
}
