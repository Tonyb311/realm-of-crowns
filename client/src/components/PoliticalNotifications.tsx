import { useQuery } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { usePoliticalEvents } from '../hooks/usePoliticalEvents';
import api from '../services/api';

interface CharacterInfo {
  id: string;
  currentTownId: string | null;
  kingdomId: string | null;
}

/**
 * Mounts the toast container and subscribes to political Socket.io events.
 * Should be placed once in the app layout, inside AuthProvider and QueryClientProvider.
 */
export default function PoliticalNotifications() {
  const { isAuthenticated } = useAuth();

  // Fetch character to know which rooms to join
  const { data: character } = useQuery<CharacterInfo>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      try { return (await api.get('/characters/me')).data; }
      catch (e: any) { if (e.response?.status === 404) return null; throw e; }
    },
    enabled: isAuthenticated,
  });

  usePoliticalEvents({
    isAuthenticated,
    townId: character?.currentTownId ?? null,
    kingdomId: character?.kingdomId ?? null,
  });

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#1a1a2e',
          color: '#e8d5b7',
          border: '1px solid #3a3a4e',
          fontFamily: 'inherit',
          fontSize: '0.875rem',
        },
      }}
    />
  );
}
