import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getSocket,
  connectSocket,
  disconnectSocket,
  joinRooms,
  leaveRooms,
  type ElectionNewPayload,
  type ElectionPhaseChangedPayload,
  type ElectionResultsPayload,
  type ImpeachmentResolvedPayload,
  type LawPassedPayload,
  type WarDeclaredPayload,
  type PeaceProposedPayload,
  type TaxChangedPayload,
} from '../services/socket';

interface UsePoliticalEventsOptions {
  isAuthenticated: boolean;
  townId: string | null;
  kingdomId: string | null;
}

/**
 * Subscribes to all political Socket.io events.
 * Shows toast notifications and invalidates relevant React Query caches.
 */
export function usePoliticalEvents({
  isAuthenticated,
  townId,
  kingdomId,
}: UsePoliticalEventsOptions): void {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Track previous room IDs so we can leave old rooms on change
  const prevRooms = useRef<{ townId: string | null; kingdomId: string | null }>({
    townId: null,
    kingdomId: null,
  });

  // Connect / disconnect based on auth state
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket();

    return () => {
      // Clean up listeners on unmount but keep socket alive
      // (other components may still need it)
    };
  }, [isAuthenticated]);

  // Join / leave rooms when town or kingdom changes
  useEffect(() => {
    if (!isAuthenticated) return;

    const prev = prevRooms.current;
    if (prev.townId !== townId || prev.kingdomId !== kingdomId) {
      leaveRooms(prev.townId, prev.kingdomId);
      joinRooms(townId, kingdomId);
      prevRooms.current = { townId, kingdomId };
    }

    return () => {
      leaveRooms(townId, kingdomId);
    };
  }, [isAuthenticated, townId, kingdomId]);

  // Subscribe to political events
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    if (!socket) return;

    // ----- Election events -----

    const onElectionNew = (payload: ElectionNewPayload) => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      toast(
        `New ${payload.type === 'MAYOR' ? 'mayoral' : 'ruler'} election started!`,
        {
          icon: '\u2694\uFE0F',
          duration: 6000,
          style: {
            background: '#1a1a2e',
            color: '#e8d5b7',
            border: '1px solid #3a3a4e',
          },
        },
      );
    };

    const onPhaseChanged = (payload: ElectionPhaseChangedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      const phaseLabel =
        payload.newPhase === 'VOTING'
          ? 'Voting has begun'
          : payload.newPhase === 'COMPLETED'
            ? 'Election concluded'
            : 'Nominations open';
      toast(phaseLabel, {
        icon: '\uD83D\uDDF3\uFE0F',
        duration: 5000,
        style: {
          background: '#1a1a2e',
          color: '#e8d5b7',
          border: '1px solid #3a3a4e',
        },
      });
    };

    const onElectionResults = (payload: ElectionResultsPayload) => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      queryClient.invalidateQueries({ queryKey: ['governance'] });
      toast(`${payload.winnerName} won the election!`, {
        icon: '\uD83D\uDC51',
        duration: 8000,
        style: {
          background: '#1a1a2e',
          color: '#e8d5b7',
          border: '1px solid #c9a84c',
        },
      });
    };

    const onImpeachmentResolved = (payload: ImpeachmentResolvedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      queryClient.invalidateQueries({ queryKey: ['governance'] });
      toast(
        payload.result === 'passed'
          ? 'Impeachment passed -- official removed!'
          : 'Impeachment failed -- official stays.',
        {
          icon: '\u2696\uFE0F',
          duration: 6000,
          style: {
            background: '#1a1a2e',
            color: '#e8d5b7',
            border: `1px solid ${payload.result === 'passed' ? '#ef4444' : '#3a3a4e'}`,
          },
        },
      );
    };

    // ----- Governance events -----

    const onLawPassed = (payload: LawPassedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'laws'] });
      queryClient.invalidateQueries({ queryKey: ['governance', 'kingdom'] });
      toast(`New law enacted: ${payload.title}`, {
        icon: '\uD83D\uDCDC',
        duration: 5000,
        style: {
          background: '#1a1a2e',
          color: '#e8d5b7',
          border: '1px solid #3a3a4e',
        },
      });
    };

    const onWarDeclared = (_payload: WarDeclaredPayload) => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'kingdom'] });
      toast('War has been declared!', {
        icon: '\u2694\uFE0F',
        duration: 8000,
        style: {
          background: '#1a1a2e',
          color: '#fca5a5',
          border: '1px solid #ef4444',
        },
      });
    };

    const onPeaceProposed = (_payload: PeaceProposedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'kingdom'] });
      toast('A peace proposal has been sent.', {
        icon: '\uD83D\uDD4A\uFE0F',
        duration: 5000,
        style: {
          background: '#1a1a2e',
          color: '#e8d5b7',
          border: '1px solid #3a3a4e',
        },
      });
    };

    const onTaxChanged = (payload: TaxChangedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'town-info'] });
      toast(`Tax rate changed to ${Math.round(payload.newRate * 100)}%`, {
        icon: '\uD83D\uDCB0',
        duration: 5000,
        style: {
          background: '#1a1a2e',
          color: '#e8d5b7',
          border: '1px solid #3a3a4e',
        },
      });
    };

    socket.on('election:new', onElectionNew);
    socket.on('election:phase-changed', onPhaseChanged);
    socket.on('election:results', onElectionResults);
    socket.on('impeachment:resolved', onImpeachmentResolved);
    socket.on('governance:law-passed', onLawPassed);
    socket.on('governance:war-declared', onWarDeclared);
    socket.on('governance:peace-proposed', onPeaceProposed);
    socket.on('governance:tax-changed', onTaxChanged);

    return () => {
      socket.off('election:new', onElectionNew);
      socket.off('election:phase-changed', onPhaseChanged);
      socket.off('election:results', onElectionResults);
      socket.off('impeachment:resolved', onImpeachmentResolved);
      socket.off('governance:law-passed', onLawPassed);
      socket.off('governance:war-declared', onWarDeclared);
      socket.off('governance:peace-proposed', onPeaceProposed);
      socket.off('governance:tax-changed', onTaxChanged);
    };
  }, [isAuthenticated, queryClient, navigate]);
}
