import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSocket } from '../services/socket';
import { TOAST_STYLE } from '../constants';

// ---------------------------------------------------------------------------
// Payload types (match server/src/socket/events.ts emit shapes)
// ---------------------------------------------------------------------------
interface ItemLowDurabilityPayload {
  itemId: string;
  itemName: string;
  currentDurability: number;
  maxDurability: number;
  percentRemaining: number;
}

interface ItemBrokenPayload {
  itemId: string;
  itemName: string;
  wasEquipped: boolean;
  slot: string | null;
}

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
export function useItemEvents(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleLowDurability = (payload: ItemLowDurabilityPayload) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      const pct = Math.round(payload.percentRemaining * 100);
      toast(`Your ${payload.itemName} is wearing out (${pct}% remaining)`, {
        duration: 5000,
        style: WARNING_TOAST_STYLE,
      });
    };

    const handleBroken = (payload: ItemBrokenPayload) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      toast(`Your ${payload.itemName} broke!`, {
        duration: 6000,
        style: DANGER_TOAST_STYLE,
      });
    };

    socket.on('item:lowDurability', handleLowDurability);
    socket.on('item:broken', handleBroken);

    return () => {
      socket.off('item:lowDurability', handleLowDurability);
      socket.off('item:broken', handleBroken);
    };
  }, [queryClient]);
}
