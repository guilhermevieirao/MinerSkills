import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { MemberTagDTO } from '@minerskills/shared';
import { api } from '../../lib/api';

/** Chave de cache das tags públicas — invalidada pelo painel após cada mutação. */
export const MEMBER_TAGS_QUERY_KEY = ['member-tags'] as const;

/** Tags de membro cadastradas pelo administrador (ordenadas por `order`, `label`). */
export function useMemberTags() {
  return useQuery({
    queryKey: MEMBER_TAGS_QUERY_KEY,
    queryFn: () => api.get<MemberTagDTO[]>('/member-tags'),
  });
}

/** Mapa `key → tag`, para resolver rótulos e ícones a partir das chaves gravadas nos registros. */
export function useMemberTagMap(): Map<string, MemberTagDTO> {
  const { data } = useMemberTags();
  return useMemo(() => new Map((data ?? []).map((t) => [t.key, t])), [data]);
}
