import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Paginated, PostListItemDTO, PostDetailDTO } from '@minerskills/shared';
import { api } from '../../lib/api';

/**
 * Lista paginada (com busca). `keepPreviousData`: ao trocar de página ou de
 * termo, a lista atual fica na tela até a nova chegar — a paginação não some.
 */
export function usePosts(page: number, q?: string) {
  return useQuery({
    queryKey: ['posts', page, q ?? ''],
    queryFn: () => api.get<Paginated<PostListItemDTO>>('/posts', { page, perPage: 9, q }),
    placeholderData: keepPreviousData,
  });
}

/** Posts mais recentes (Home e "Leia também"). */
export function useLatestPosts(limit = 3) {
  return useQuery({
    queryKey: ['posts', 'latest', limit],
    queryFn: () =>
      api.get<Paginated<PostListItemDTO>>('/posts', { page: 1, perPage: limit }),
    staleTime: 60_000,
  });
}

export function usePost(slug: string | undefined) {
  return useQuery({
    queryKey: ['post', slug],
    queryFn: () => api.get<PostDetailDTO>(`/posts/${slug}`),
    enabled: !!slug,
  });
}
