import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useProgressionEvents } from '../hooks/useProgressionEvents';
import LevelUpCelebration from './LevelUpCelebration';
import api from '../services/api';

interface CharacterInfo {
  id: string;
}

export default function ProgressionEventsProvider() {
  const { isAuthenticated } = useAuth();

  const { data: character } = useQuery<CharacterInfo>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      try { return (await api.get('/characters/me')).data; }
      catch (e: any) { if (e.response?.status === 404) return null; throw e; }
    },
    enabled: isAuthenticated,
  });

  const { levelUpData, dismissLevelUp } = useProgressionEvents({
    isAuthenticated,
    characterId: character?.id ?? null,
  });

  return (
    <>
      {levelUpData && (
        <LevelUpCelebration data={levelUpData} onDismiss={dismissLevelUp} />
      )}
    </>
  );
}
