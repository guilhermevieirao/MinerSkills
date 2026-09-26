import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import type {
  Paginated,
  ForumTopicDTO,
  ForumTopicDetailDTO,
  ForumTopicInput,
  ForumReplyInput,
  ForumReportInput,
} from '@minerskills/shared';
import { api } from '../../lib/api';

/** Tópicos aprovados, paginados; a lista atual fica na tela enquanto a próxima página chega. */
export function useForumTopics(page: number) {
  return useQuery({
    queryKey: ['forum-topics', page],
    queryFn: () =>
      api.get<Paginated<ForumTopicDTO>>('/forum/topics', { page, perPage: 10 }),
    placeholderData: keepPreviousData,
  });
}

export function useForumTopic(id: string | undefined) {
  return useQuery({
    queryKey: ['forum-topic', id],
    queryFn: () => api.get<ForumTopicDetailDTO>(`/forum/topics/${id}`),
    enabled: !!id,
  });
}

export function useCreateTopic() {
  return useMutation({
    mutationFn: (input: ForumTopicInput) =>
      api.post<{ message: string }>('/forum/topics', input),
  });
}

export function useCreateReply(topicId: string) {
  return useMutation({
    mutationFn: (input: ForumReplyInput) =>
      api.post<{ message: string }>(`/forum/topics/${topicId}/replies`, input),
  });
}

/** Denúncia de um tópico aprovado. A API sempre responde 202 (nunca revela dedupe/honeypot). */
export function useReportTopic(topicId: string) {
  return useMutation({
    mutationFn: (input: ForumReportInput) =>
      api.post<{ message: string }>(`/forum/topics/${topicId}/report`, input),
  });
}

/** Denúncia de uma resposta aprovada. */
export function useReportReply(replyId: string) {
  return useMutation({
    mutationFn: (input: ForumReportInput) =>
      api.post<{ message: string }>(`/forum/replies/${replyId}/report`, input),
  });
}
