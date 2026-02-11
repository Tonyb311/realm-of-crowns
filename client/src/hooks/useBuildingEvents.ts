import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSocket } from '../services/socket';
import { TOAST_STYLE } from '../constants';

// ---------------------------------------------------------------------------
// Payload types
// ---------------------------------------------------------------------------
interface BuildingConstructedPayload {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  level: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useBuildingEvents(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleBuildingConstructed = (payload: BuildingConstructedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['buildings', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['buildings', 'town'] });
      queryClient.invalidateQueries({ queryKey: ['building', payload.buildingId] });

      const typeName = payload.buildingType
        .split('_')
        .map(w => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ');

      toast(
        `Your ${payload.buildingName || typeName} construction is complete!`,
        {
          duration: 6000,
          icon: '🏠',
          style: TOAST_STYLE,
        },
      );
    };

    socket.on('building:constructed', handleBuildingConstructed);

    return () => {
      socket.off('building:constructed', handleBuildingConstructed);
    };
  }, [queryClient]);
}
