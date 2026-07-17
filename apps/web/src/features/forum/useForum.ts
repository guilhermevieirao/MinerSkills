import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  Paginated,
  ForumTopicDTO,
  ForumTopicDetailDTO,
  ForumTopicInput,
  ForumReplyInput,
} from '@minerskills/shared';
import { api } from '../../lib/api';

export function useForumTopics(page: number) {
  return useQuery({
    queryKey: ['forum-topics', page],
    queryFn: () => api.get<Paginated<ForumTopicDTO>>('/forum/topics', { page, perPage: 10 }),
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
