import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface CharacterProgression {
  level: number;
  xp: number;
}

export default function XpBar() {
  const { isAuthenticated } = useAuth();

  const { data: character } = useQuery<CharacterProgression>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
    enabled: isAuthenticated,
  });

  if (!isAuthenticated || !character) return null;

  const xpForNextLevel = character.level * 100;
  const pct = xpForNextLevel > 0
    ? Math.min(100, (character.xp / xpForNextLevel) * 100)
    : 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 h-6 bg-dark-400/90 border-b border-dark-50 flex items-center px-4">
      <span className="text-[10px] font-display text-parchment-400 mr-3 whitespace-nowrap">
        Level {character.level}
      </span>
      <div className="flex-1 h-2 bg-dark-500 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-400/80 to-primary-300 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-parchment-500 ml-3 whitespace-nowrap">
        {character.xp} / {xpForNextLevel} XP
      </span>
    </div>
  );
}
