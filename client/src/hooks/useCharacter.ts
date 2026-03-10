import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useImpersonateStore } from '../stores/impersonateStore';

export const CHARACTER_QUERY_KEY = ['character', 'me'] as const;

export function useCharacter<T = Record<string, unknown>>() {
  const { characterId: impersonateId, isImpersonating } = useImpersonateStore();

  return useQuery<T>({
    queryKey: isImpersonating
      ? ['character', 'view-as', impersonateId]
      : CHARACTER_QUERY_KEY,
    queryFn: async () => {
      if (isImpersonating && impersonateId) {
        return (await api.get(`/admin/characters/${impersonateId}/view-as`)).data;
      }
      return (await api.get('/characters/me')).data;
    },
  });
}
