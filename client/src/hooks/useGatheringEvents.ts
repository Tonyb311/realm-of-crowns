import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSocket } from '../services/socket';

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------
interface GatheringReadyPayload {
  resourceName?: string;
}

interface GatheringDepletedPayload {
  resourceName?: string;
  newAbundance?: string;
}

interface ToolBrokenPayload {
  toolName: string;
}

// ---------------------------------------------------------------------------
// Toast styling (matches existing social events patterns)
// ---------------------------------------------------------------------------
const TOAST_STYLE = {
  background: '#1a1a2e',
  color: '#e8d5b7',
  border: '1px solid #3a3a4e',
};

const WARNING_TOAST_STYLE = {
  ...TOAST_STYLE,
  border: '1px solid #eab308',
};

const DANGER_TOAST_STYLE = {
  ...TOAST_STYLE,
  border: '1px solid #ef4444',
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useGatheringEvents(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleGatheringReady = (payload: GatheringReadyPayload) => {
      queryClient.invalidateQueries({ queryKey: ['work', 'status'] });
      const msg = payload.resourceName
        ? `Your ${payload.resourceName} gathering is complete! Collect your resources.`
        : 'Your gathering is complete! Collect your resources.';
      toast(msg, {
        duration: 6000,
        icon: '⛏️',
        style: TOAST_STYLE,
      });
    };

    const handleGatheringDepleted = (payload: GatheringDepletedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['town', 'resources'] });
      const msg = payload.resourceName
        ? `${payload.resourceName} abundance is running low${payload.newAbundance ? ` (now ${payload.newAbundance.toLowerCase()})` : ''}.`
        : 'A resource in this area is becoming scarce.';
      toast(msg, {
        duration: 5000,
        style: WARNING_TOAST_STYLE,
      });
    };

    const handleToolBroken = (payload: ToolBrokenPayload) => {
      queryClient.invalidateQueries({ queryKey: ['tools', 'equipped'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      toast(`Your ${payload.toolName} has broken!`, {
        duration: 6000,
        style: DANGER_TOAST_STYLE,
      });
    };

    socket.on('gathering:ready', handleGatheringReady);
    socket.on('gathering:depleted', handleGatheringDepleted);
    socket.on('tool:broken', handleToolBroken);

    return () => {
      socket.off('gathering:ready', handleGatheringReady);
      socket.off('gathering:depleted', handleGatheringDepleted);
      socket.off('tool:broken', handleToolBroken);
    };
  }, [queryClient]);
}
