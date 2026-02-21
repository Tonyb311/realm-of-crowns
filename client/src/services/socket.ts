import { io, Socket } from 'socket.io-client';

// ---------------------------------------------------------------------------
// Event payload types
// ---------------------------------------------------------------------------
export interface ElectionNewPayload {
  townId: string;
  electionId: string;
  type: 'MAYOR' | 'RULER';
}

export interface ElectionPhaseChangedPayload {
  electionId: string;
  townId: string;
  newPhase: 'NOMINATIONS' | 'VOTING' | 'COMPLETED';
}

export interface ElectionResultsPayload {
  electionId: string;
  townId: string;
  winnerId: string;
  winnerName: string;
}

export interface ImpeachmentResolvedPayload {
  impeachmentId: string;
  targetId: string;
  result: 'passed' | 'failed';
}

export interface LawPassedPayload {
  lawId: string;
  title: string;
  kingdomId: string;
}

export interface WarDeclaredPayload {
  attackerKingdomId: string;
  defenderKingdomId: string;
}

export interface PeaceProposedPayload {
  warId: string;
  proposerKingdomId: string;
}

export interface TaxChangedPayload {
  townId: string;
  newRate: number;
}

export interface PoliticalEvents {
  'election:new': (payload: ElectionNewPayload) => void;
  'election:phase-changed': (payload: ElectionPhaseChangedPayload) => void;
  'election:results': (payload: ElectionResultsPayload) => void;
  'impeachment:resolved': (payload: ImpeachmentResolvedPayload) => void;
  'governance:law-passed': (payload: LawPassedPayload) => void;
  'governance:war-declared': (payload: WarDeclaredPayload) => void;
  'governance:peace-proposed': (payload: PeaceProposedPayload) => void;
  'governance:tax-changed': (payload: TaxChangedPayload) => void;
}

// ---------------------------------------------------------------------------
// Social event payload types
// ---------------------------------------------------------------------------
export interface ChatMessagePayload {
  id: string;
  channelType: string;
  content: string;
  sender: { id: string; name: string };
  timestamp: string;
  recipientId?: string;
}

export interface PresencePayload {
  characterId: string;
  characterName: string;
}

export interface PlayerTownPayload {
  characterId: string;
  characterName: string;
  townId?: string;
  destinationTownId?: string;
}

export interface GuildMemberEventPayload {
  guildId: string;
  characterId: string;
  characterName: string;
}

export interface GuildDissolvedPayload {
  guildId: string;
  guildName: string;
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
}

export interface CombatResultPayload {
  sessionId: string;
  result: string;
}

export interface TradeCompletedPayload {
  buyerId: string;
  itemName: string;
  quantity: number;
  price: number;
}

// ---------------------------------------------------------------------------
// Progression event payload types
// ---------------------------------------------------------------------------
export interface LevelUpPayload {
  characterId: string;
  newLevel: number;
  statPoints: number;
  skillPoints: number;
  maxHealthGain: number;
}

export interface AchievementUnlockedPayload {
  characterId: string;
  achievementId: string;
  name: string;
  description: string;
}

export interface ProgressionEvents {
  'player:level-up': (payload: LevelUpPayload) => void;
  'achievement:unlocked': (payload: AchievementUnlockedPayload) => void;
}

export interface SocialEvents {
  'chat:message': (payload: ChatMessagePayload) => void;
  'presence:online': (payload: PresencePayload) => void;
  'presence:offline': (payload: PresencePayload) => void;
  'presence:friends-online': (payload: { friends: PresencePayload[] }) => void;
  'player:enter-town': (payload: PlayerTownPayload) => void;
  'player:leave-town': (payload: PlayerTownPayload) => void;
  'guild:member-joined': (payload: GuildMemberEventPayload) => void;
  'guild:member-left': (payload: GuildMemberEventPayload) => void;
  'guild:dissolved': (payload: GuildDissolvedPayload) => void;
  'notification:new': (payload: NotificationPayload) => void;
  'combat:result': (payload: CombatResultPayload) => void;
  'trade:completed': (payload: TradeCompletedPayload) => void;
}

// ---------------------------------------------------------------------------
// Socket singleton
// ---------------------------------------------------------------------------
let socket: Socket | null = null;

// MAJ-15 / P2 #46: Track connection status for UI indicator
type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';
let connectionStatus: ConnectionStatus = 'disconnected';
const statusListeners: Set<(status: ConnectionStatus) => void> = new Set();

export function getConnectionStatus(): ConnectionStatus {
  return connectionStatus;
}

function setConnectionStatus(status: ConnectionStatus) {
  connectionStatus = status;
  statusListeners.forEach((fn) => fn(status));
}

export function onConnectionStatusChange(listener: (status: ConnectionStatus) => void): () => void {
  statusListeners.add(listener);
  return () => { statusListeners.delete(listener); };
}

export function getSocket(): Socket | null {
  return socket;
}

// Rooms to rejoin on reconnect
let lastTownId: string | null = null;
let lastKingdomId: string | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = localStorage.getItem('roc_token');

  socket = io(window.location.origin, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    setConnectionStatus('connected');
    // MAJ-15: Auto-rejoin rooms after reconnect
    if (lastTownId) socket?.emit('join:town', lastTownId);
    if (lastKingdomId) socket?.emit('join:kingdom', lastKingdomId);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    setConnectionStatus('disconnected');
  });

  socket.io.on('reconnect_attempt', () => {
    setConnectionStatus('reconnecting');
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
    setConnectionStatus('disconnected');
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinRooms(townId: string | null, kingdomId: string | null): void {
  if (!socket) return;
  // MAJ-15: Track rooms for auto-rejoin on reconnect
  if (townId) { lastTownId = townId; socket.emit('join:town', townId); }
  if (kingdomId) { lastKingdomId = kingdomId; socket.emit('join:kingdom', kingdomId); }
}

export function leaveRooms(townId: string | null, kingdomId: string | null): void {
  if (!socket) return;
  if (townId) { socket.emit('leave:town', townId); lastTownId = null; }
  if (kingdomId) { socket.emit('leave:kingdom', kingdomId); lastKingdomId = null; }
}

export function joinGuildRoom(guildId: string): void {
  if (!socket) return;
  socket.emit('join:guild', guildId);
}

export function leaveGuildRoom(guildId: string): void {
  if (!socket) return;
  socket.emit('leave:guild', guildId);
}
