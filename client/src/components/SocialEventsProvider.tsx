import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useSocialEvents } from '../hooks/useSocialEvents';
import api from '../services/api';

interface CharacterInfo {
  id: string;
  currentTownId: string | null;
  guildId: string | null;
}

/**
 * Mounts once in the app and subscribes to all social Socket.io events.
 * Renders nothing visible.
 */
export default function SocialEventsProvider() {
  const { isAuthenticated } = useAuth();

  const { data: character } = useQuery<CharacterInfo>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      try { return (await api.get('/characters/me')).data; }
      catch (e: any) { if (e.response?.status === 404) return null; throw e; }
    },
    enabled: isAuthenticated,
  });

  useSocialEvents({
    isAuthenticated,
    characterId: character?.id ?? null,
  });

  return null;
}
