import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSocket } from '../services/socket';
import { TOAST_STYLE } from '../constants';

// ---------------------------------------------------------------------------
// Payload types (match server/src/socket/events.ts emit shapes)
// ---------------------------------------------------------------------------
interface TravelTickProcessedPayload {
  currentNodeId: string;
  currentNodeName: string;
  nodesRemaining: number;
  routeId: string;
}

interface TravelGroupUpdatePayload {
  groupId: string;
  memberIds: string[];
  currentNodeId: string;
  nodesRemaining: number;
}

interface TravelPlayerPayload {
  characterId: string;
  characterName: string;
  nodeName: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useTravelEvents(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTickProcessed = (_payload: TravelTickProcessedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['travel'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
    };

    const handleGroupUpdate = (_payload: TravelGroupUpdatePayload) => {
      queryClient.invalidateQueries({ queryKey: ['travel'] });
      queryClient.invalidateQueries({ queryKey: ['party'] });
    };

    const handlePlayerEntered = (payload: TravelPlayerPayload) => {
      toast(`${payload.characterName} arrived at ${payload.nodeName}`, {
        duration: 3000,
        style: TOAST_STYLE,
      });
    };

    const handlePlayerLeft = (payload: TravelPlayerPayload) => {
      toast(`${payload.characterName} left ${payload.nodeName}`, {
        duration: 3000,
        style: TOAST_STYLE,
      });
    };

    socket.on('travel:tick-processed', handleTickProcessed);
    socket.on('travel:group-update', handleGroupUpdate);
    socket.on('travel:player-entered', handlePlayerEntered);
    socket.on('travel:player-left', handlePlayerLeft);

    return () => {
      socket.off('travel:tick-processed', handleTickProcessed);
      socket.off('travel:group-update', handleGroupUpdate);
      socket.off('travel:player-entered', handlePlayerEntered);
      socket.off('travel:player-left', handlePlayerLeft);
    };
  }, [queryClient]);
}
