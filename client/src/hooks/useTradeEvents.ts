import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../services/socket';

// ---------------------------------------------------------------------------
// Notification payload (matches server emitNotification shape)
// ---------------------------------------------------------------------------
interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Hook — listens for caravan events via notification:new channel
// ---------------------------------------------------------------------------
export function useTradeEvents(): { ambushedCaravanId: string | null; clearAmbush: () => void } {
  const queryClient = useQueryClient();
  const [ambushedCaravanId, setAmbushedCaravanId] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNotification = (payload: NotificationPayload) => {
      if (payload.type === 'caravan:departed' || payload.type === 'caravan:arrived') {
        queryClient.invalidateQueries({ queryKey: ['caravans', 'mine'] });
      } else if (payload.type === 'caravan:ambushed') {
        queryClient.invalidateQueries({ queryKey: ['caravans', 'mine'] });
        const caravanId = (payload.data?.caravanId as string) ?? null;
        if (caravanId) setAmbushedCaravanId(caravanId);
      }
    };

    socket.on('notification:new', handleNotification);

    return () => {
      socket.off('notification:new', handleNotification);
    };
  }, [queryClient]);

  return {
    ambushedCaravanId,
    clearAmbush: () => setAmbushedCaravanId(null),
  };
}
