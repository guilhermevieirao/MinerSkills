import { useQuery } from '@tanstack/react-query';
import type { SettingKey, SocialLinkDTO } from '@minerskills/shared';
import { api } from '../../lib/api';

export function useSocialLinks() {
  return useQuery({
    queryKey: ['social-links'],
    queryFn: () => api.get<SocialLinkDTO[]>('/social-links'),
    staleTime: 5 * 60_000,
  });
}

/** Query key das configurações públicas — invalidada pelo painel após salvar. */
export const SETTINGS_QUERY_KEY = ['settings'] as const;

/** Mapa chave → valor de `GET /api/settings` (as chaves estão em `SETTING_DEFINITIONS`). */
export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => api.get<Record<string, string>>('/settings'),
    staleTime: 5 * 60_000,
  });
}

/**
 * Valor de UMA configuração, já sem espaços nas pontas. `undefined` enquanto a
 * API não respondeu, quando a chave não existe no banco ou quando está vazia —
 * o componente decide o fallback.
 */
export function useSetting(key: SettingKey): string | undefined {
  const { data } = useSettings();
  const value = data?.[key]?.trim();
  return value ? value : undefined;
}
