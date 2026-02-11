import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSocket } from '../services/socket';
import { TOAST_STYLE } from '../constants';

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------
interface CraftingReadyPayload {
  recipeName?: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useCraftingEvents(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCraftingReady = (payload: CraftingReadyPayload) => {
      queryClient.invalidateQueries({ queryKey: ['crafting', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['crafting', 'queue'] });
      const msg = payload.recipeName
        ? `Your ${payload.recipeName} is ready to collect!`
        : 'Your crafting is complete! Collect your item.';
      toast(msg, {
        duration: 6000,
        icon: '\u2692\uFE0F',
        style: TOAST_STYLE,
      });
    };

    socket.on('crafting:ready', handleCraftingReady);

    return () => {
      socket.off('crafting:ready', handleCraftingReady);
    };
  }, [queryClient]);
}
