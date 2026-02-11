import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSocket } from '../services/socket';
import { TOAST_STYLE } from '../constants';

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------
interface CaravanDepartedPayload {
  caravanId: string;
  toTownId: string;
  arrivesAt: string;
}

interface CaravanArrivedPayload {
  caravanId: string;
  toTownId: string;
  cargoValue: number;
  xpAmount: number;
}

interface CaravanAmbushedPayload {
  caravanId: string;
  caravanName: string;
  routeDescription: string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useTradeEvents(): { ambushedCaravanId: string | null; clearAmbush: () => void } {
  const queryClient = useQueryClient();
  const [ambushedCaravanId, setAmbushedCaravanId] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleDeparted = (payload: CaravanDepartedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['caravans', 'mine'] });
      toast('Your caravan has departed!', {
        duration: 5000,
        icon: '\u{1F6B6}',
        style: TOAST_STYLE,
      });
    };

    const handleArrived = (payload: CaravanArrivedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['caravans', 'mine'] });
      toast(`Caravan arrived! Earned ${payload.xpAmount} Merchant XP.`, {
        duration: 6000,
        icon: '\u{1F4E6}',
        style: TOAST_STYLE,
      });
    };

    const handleAmbushed = (payload: CaravanAmbushedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['caravans', 'mine'] });
      setAmbushedCaravanId(payload.caravanId);
      toast('Your caravan has been ambushed!', {
        duration: 8000,
        icon: '\u{26A0}\u{FE0F}',
        style: { ...TOAST_STYLE, border: '1px solid #b91c1c' },
      });
    };

    socket.on('caravan:departed', handleDeparted);
    socket.on('caravan:arrived', handleArrived);
    socket.on('caravan:ambushed', handleAmbushed);

    return () => {
      socket.off('caravan:departed', handleDeparted);
      socket.off('caravan:arrived', handleArrived);
      socket.off('caravan:ambushed', handleAmbushed);
    };
  }, [queryClient]);

  return {
    ambushedCaravanId,
    clearAmbush: () => setAmbushedCaravanId(null),
  };
}
