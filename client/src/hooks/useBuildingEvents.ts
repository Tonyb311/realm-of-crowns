import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSocket } from '../services/socket';
import { TOAST_STYLE } from '../constants';

// ---------------------------------------------------------------------------
// Payload types (match server/src/socket/events.ts emit shapes)
// ---------------------------------------------------------------------------
interface BuildingConstructedPayload {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  targetLevel: number;
  townName: string;
}

interface BuildingTaxDuePayload {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  townName: string;
  amount: number;
  paid: boolean;
  remainingGold: number;
}

interface BuildingDelinquentPayload {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  townName: string;
  amountOwed: number;
  daysDelinquent: number;
  daysUntilSeizure: number;
}

interface BuildingSeizedPayload {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  townName: string;
  daysDelinquent: number;
  seizedByMayor: boolean;
}

interface BuildingDamagedPayload {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  townName: string;
  damage: number;
  newCondition: number;
  cause: string;
}

interface BuildingConditionLowPayload {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  townName: string;
  condition: number;
  isFunctional: boolean;
  isCondemned: boolean;
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
export function useBuildingEvents(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const invalidateBuildings = (buildingId?: string) => {
      queryClient.invalidateQueries({ queryKey: ['buildings', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['buildings', 'town'] });
      if (buildingId) queryClient.invalidateQueries({ queryKey: ['building', buildingId] });
    };

    const handleBuildingConstructed = (payload: BuildingConstructedPayload) => {
      invalidateBuildings(payload.buildingId);

      const typeName = payload.buildingType
        .split('_')
        .map(w => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ');

      toast(
        `Your ${payload.buildingName || typeName} construction is complete!`,
        { duration: 6000, style: TOAST_STYLE },
      );
    };

    const handleTaxDue = (payload: BuildingTaxDuePayload) => {
      invalidateBuildings(payload.buildingId);
      if (payload.paid) {
        toast(`Tax of ${payload.amount}g paid for ${payload.buildingName}`, {
          duration: 5000, style: TOAST_STYLE,
        });
      } else {
        toast(`Tax due: ${payload.amount}g for ${payload.buildingName}`, {
          duration: 6000, style: WARNING_TOAST_STYLE,
        });
      }
    };

    const handleDelinquent = (payload: BuildingDelinquentPayload) => {
      invalidateBuildings(payload.buildingId);
      toast(
        `Overdue tax on ${payload.buildingName}! ${payload.daysUntilSeizure} days until seizure.`,
        { duration: 8000, style: DANGER_TOAST_STYLE },
      );
    };

    const handleSeized = (payload: BuildingSeizedPayload) => {
      invalidateBuildings(payload.buildingId);
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      toast(
        `Your ${payload.buildingName} has been seized for non-payment!`,
        { duration: 10000, style: DANGER_TOAST_STYLE },
      );
    };

    const handleDamaged = (payload: BuildingDamagedPayload) => {
      invalidateBuildings(payload.buildingId);
      toast(
        `Your ${payload.buildingName} was damaged (${payload.cause}). Condition: ${payload.newCondition}%`,
        { duration: 6000, style: WARNING_TOAST_STYLE },
      );
    };

    const handleConditionLow = (payload: BuildingConditionLowPayload) => {
      invalidateBuildings(payload.buildingId);
      const msg = payload.isCondemned
        ? `Your ${payload.buildingName} has been condemned! Repair immediately.`
        : `Your ${payload.buildingName} needs repair (${payload.condition}% condition).`;
      toast(msg, {
        duration: 7000,
        style: payload.isCondemned ? DANGER_TOAST_STYLE : WARNING_TOAST_STYLE,
      });
    };

    socket.on('building:constructed', handleBuildingConstructed);
    socket.on('building:taxDue', handleTaxDue);
    socket.on('building:delinquent', handleDelinquent);
    socket.on('building:seized', handleSeized);
    socket.on('building:damaged', handleDamaged);
    socket.on('building:conditionLow', handleConditionLow);

    return () => {
      socket.off('building:constructed', handleBuildingConstructed);
      socket.off('building:taxDue', handleTaxDue);
      socket.off('building:delinquent', handleDelinquent);
      socket.off('building:seized', handleSeized);
      socket.off('building:damaged', handleDamaged);
      socket.off('building:conditionLow', handleConditionLow);
    };
  }, [queryClient]);
}
