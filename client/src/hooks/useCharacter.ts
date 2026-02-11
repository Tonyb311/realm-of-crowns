import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const CHARACTER_QUERY_KEY = ['character', 'me'] as const;

export function useCharacter<T = Record<string, unknown>>() {
  return useQuery<T>({
    queryKey: CHARACTER_QUERY_KEY,
    queryFn: async () => (await api.get('/characters/me')).data,
  });
}
