import { useMutation, useQuery } from '@tanstack/react-query';
import type {
  QuizQuestionPublicDTO,
  QuizResultDTO,
  QuizSubmitInput,
  LeaderboardEntryDTO,
} from '@minerskills/shared';
import { api } from '../../lib/api';

export function useQuizQuestions(enabled: boolean) {
  return useQuery({
    queryKey: ['quiz-questions'],
    queryFn: () => api.get<QuizQuestionPublicDTO[]>('/quiz/questions'),
    enabled,
    staleTime: 0,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.get<LeaderboardEntryDTO[]>('/quiz/leaderboard', { limit: 20 }),
  });
}

export function useSubmitQuiz() {
  return useMutation({
    mutationFn: (input: QuizSubmitInput) =>
      api.post<QuizResultDTO>('/quiz/submit', input),
  });
}
