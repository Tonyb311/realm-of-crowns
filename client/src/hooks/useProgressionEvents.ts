import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSocket } from '../services/socket';
import { TOAST_STYLE } from '../constants';

export interface LevelUpPayload {
  characterId: string;
  newLevel: number;
  statPoints: number;
  skillPoints: number;
  maxHealthGain: number;
}

export interface AchievementUnlockedPayload {
  characterId: string;
  achievementId: string;
  name: string;
  description: string;
}

export interface ProfessionLevelUpPayload {
  characterId: string;
  professionType: string;
  newLevel: number;
  newTier?: string;
}

interface UseProgressionEventsOptions {
  isAuthenticated: boolean;
  characterId: string | null;
}

export function useProgressionEvents({
  isAuthenticated,
  characterId,
}: UseProgressionEventsOptions) {
  const queryClient = useQueryClient();
  const [levelUpData, setLevelUpData] = useState<LevelUpPayload | null>(null);

  const dismissLevelUp = useCallback(() => setLevelUpData(null), []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    if (!socket) return;

    const handleLevelUp = (payload: LevelUpPayload) => {
      if (characterId && payload.characterId !== characterId) return;
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      setLevelUpData(payload);
    };

    const handleAchievement = (payload: AchievementUnlockedPayload) => {
      if (characterId && payload.characterId !== characterId) return;
      queryClient.invalidateQueries({ queryKey: ['achievements'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      toast(`Achievement Unlocked: ${payload.name}`, {
        duration: 6000,
        style: TOAST_STYLE,
      });
    };

    const handleNotification = (payload: { type: string; data?: Record<string, unknown> }) => {
      if (payload.type !== 'profession:level-up') return;
      const d = payload.data as ProfessionLevelUpPayload | undefined;
      if (!d) return;
      if (characterId && d.characterId !== characterId) return;
      queryClient.invalidateQueries({ queryKey: ['professions'] });
    };

    socket.on('player:level-up', handleLevelUp);
    socket.on('achievement:unlocked', handleAchievement);
    socket.on('notification:new', handleNotification);

    return () => {
      socket.off('player:level-up', handleLevelUp);
      socket.off('achievement:unlocked', handleAchievement);
      socket.off('notification:new', handleNotification);
    };
  }, [isAuthenticated, characterId, queryClient]);

  return { levelUpData, dismissLevelUp };
}
