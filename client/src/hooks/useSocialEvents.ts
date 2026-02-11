import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSocket } from '../services/socket';
import { TOAST_STYLE } from '../constants';

interface ChatMessagePayload {
  id: string;
  channelType: string;
  content: string;
  sender: { id: string; name: string };
  timestamp: string;
}

interface PresencePayload {
  characterId: string;
  characterName: string;
}

interface PlayerTownPayload {
  characterId: string;
  characterName: string;
  townId: string;
}

interface GuildMemberPayload {
  guildId: string;
  characterId: string;
  characterName: string;
}

interface GuildDissolvedPayload {
  guildId: string;
  guildName: string;
}

interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
}

interface CombatResultPayload {
  sessionId: string;
  result: string;
}

interface TradeCompletedPayload {
  listingId: string;
  buyerName: string;
  itemName: string;
}

interface UseSocialEventsOptions {
  isAuthenticated: boolean;
  characterId: string | null;
  onChatMessage?: (msg: ChatMessagePayload) => void;
  onPresenceChange?: (payload: PresencePayload, online: boolean) => void;
  onPlayerTown?: (payload: PlayerTownPayload, entered: boolean) => void;
}

export function useSocialEvents({
  isAuthenticated,
  characterId,
  onChatMessage,
  onPresenceChange,
  onPlayerTown,
}: UseSocialEventsOptions): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    if (!socket) return;

    // Identify this character for chat routing
    if (characterId) {
      socket.emit('chat:identify', { characterId });
    }

    const handleChatMessage = (payload: ChatMessagePayload) => {
      onChatMessage?.(payload);
    };

    const handlePresenceOnline = (payload: PresencePayload) => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      onPresenceChange?.(payload, true);
    };

    const handlePresenceOffline = (payload: PresencePayload) => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      onPresenceChange?.(payload, false);
    };

    const handlePlayerEnterTown = (payload: PlayerTownPayload) => {
      queryClient.invalidateQueries({ queryKey: ['town', payload.townId, 'characters'] });
      onPlayerTown?.(payload, true);
    };

    const handlePlayerLeaveTown = (payload: PlayerTownPayload) => {
      queryClient.invalidateQueries({ queryKey: ['town', payload.townId, 'characters'] });
      onPlayerTown?.(payload, false);
    };

    const handleGuildMemberJoined = (payload: GuildMemberPayload) => {
      queryClient.invalidateQueries({ queryKey: ['guild', payload.guildId] });
      toast(`${payload.characterName} joined the guild!`, {
        duration: 4000,
        style: TOAST_STYLE,
      });
    };

    const handleGuildMemberLeft = (payload: GuildMemberPayload) => {
      queryClient.invalidateQueries({ queryKey: ['guild', payload.guildId] });
    };

    const handleGuildDissolved = (payload: GuildDissolvedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['guilds'] });
      queryClient.invalidateQueries({ queryKey: ['guild', payload.guildId] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      toast(`Guild "${payload.guildName}" has been dissolved.`, {
        duration: 6000,
        style: { ...TOAST_STYLE, border: '1px solid #ef4444' },
      });
    };

    const handleNotification = (payload: NotificationPayload) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast(payload.message || payload.title, {
        duration: 5000,
        style: TOAST_STYLE,
      });
    };

    const handleCombatResult = (_payload: CombatResultPayload) => {
      queryClient.invalidateQueries({ queryKey: ['combat'] });
    };

    const handleTradeCompleted = (payload: TradeCompletedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['market'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast(`${payload.buyerName} purchased ${payload.itemName}`, {
        duration: 4000,
        style: TOAST_STYLE,
      });
    };

    socket.on('chat:message', handleChatMessage);
    socket.on('presence:online', handlePresenceOnline);
    socket.on('presence:offline', handlePresenceOffline);
    socket.on('presence:friends-online', handlePresenceOnline);
    socket.on('player:enter-town', handlePlayerEnterTown);
    socket.on('player:leave-town', handlePlayerLeaveTown);
    socket.on('guild:member-joined', handleGuildMemberJoined);
    socket.on('guild:member-left', handleGuildMemberLeft);
    socket.on('guild:dissolved', handleGuildDissolved);
    socket.on('notification:new', handleNotification);
    socket.on('combat:result', handleCombatResult);
    socket.on('trade:completed', handleTradeCompleted);

    return () => {
      socket.off('chat:message', handleChatMessage);
      socket.off('presence:online', handlePresenceOnline);
      socket.off('presence:offline', handlePresenceOffline);
      socket.off('presence:friends-online', handlePresenceOnline);
      socket.off('player:enter-town', handlePlayerEnterTown);
      socket.off('player:leave-town', handlePlayerLeaveTown);
      socket.off('guild:member-joined', handleGuildMemberJoined);
      socket.off('guild:member-left', handleGuildMemberLeft);
      socket.off('guild:dissolved', handleGuildDissolved);
      socket.off('notification:new', handleNotification);
      socket.off('combat:result', handleCombatResult);
      socket.off('trade:completed', handleTradeCompleted);
    };
  }, [isAuthenticated, characterId, queryClient, onChatMessage, onPresenceChange, onPlayerTown]);
}
