import { useQuery, useMutation } from '@tanstack/react-query';
import type { AdminMe, LoginInput } from '@minerskills/shared';
import { api } from '../lib/api';
import { queryClient } from '../lib/queryClient';

export function useAdminMe() {
  return useQuery({
    queryKey: ['admin-me'],
    queryFn: () => api.get<AdminMe>('/admin/auth/me'),
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => api.post<AdminMe>('/admin/auth/login', input),
    onSuccess: (me) => queryClient.setQueryData(['admin-me'], me),
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: () => api.post('/admin/auth/logout'),
    onSuccess: () => {
      queryClient.setQueryData(['admin-me'], null);
      queryClient.clear();
    },
  });
}
