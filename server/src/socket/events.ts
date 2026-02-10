import { Server } from 'socket.io';

// ---------------------------------------------------------------------------
// Singleton reference to the Socket.io server - set during init
// ---------------------------------------------------------------------------

let ioInstance: Server | null = null;

export function initEventBroadcaster(io: Server) {
  ioInstance = io;
}

export function getIO(): Server {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized. Call initEventBroadcaster first.');
  }
  return ioInstance;
}

// ---------------------------------------------------------------------------
// Travel events
// ---------------------------------------------------------------------------

export function emitPlayerEnterTown(townId: string, data: {
  characterId: string;
  characterName: string;
}) {
  getIO().to(`town:${townId}`).emit('player:enter-town', data);
}

export function emitPlayerLeaveTown(townId: string, data: {
  characterId: string;
  characterName: string;
  destinationTownId: string;
}) {
  getIO().to(`town:${townId}`).emit('player:leave-town', data);
}

// ---------------------------------------------------------------------------
// Combat events
// ---------------------------------------------------------------------------

export function emitCombatResult(characterIds: string[], data: {
  sessionId: string;
  type: string;
  result: 'victory' | 'defeat' | 'draw';
  summary: string;
}) {
  for (const charId of characterIds) {
    getIO().to(`user:${charId}`).emit('combat:result', data);
  }
}

// ---------------------------------------------------------------------------
// Trade events
// ---------------------------------------------------------------------------

export function emitTradeCompleted(data: {
  townId: string;
  buyerId: string;
  sellerId: string;
  itemName: string;
  quantity: number;
  price: number;
}) {
  // Notify the seller directly
  getIO().to(`user:${data.sellerId}`).emit('trade:completed', {
    buyerId: data.buyerId,
    itemName: data.itemName,
    quantity: data.quantity,
    price: data.price,
  });
}

// ---------------------------------------------------------------------------
// Friend events
// ---------------------------------------------------------------------------

export function emitFriendRequest(recipientCharacterId: string, data: {
  friendshipId: string;
  requesterId: string;
  requesterName: string;
}) {
  getIO().to(`user:${recipientCharacterId}`).emit('friend:request', data);
}

export function emitFriendAccepted(requesterCharacterId: string, data: {
  friendshipId: string;
  acceptedById: string;
  acceptedByName: string;
}) {
  getIO().to(`user:${requesterCharacterId}`).emit('friend:accepted', data);
}

// ---------------------------------------------------------------------------
// Progression events
// ---------------------------------------------------------------------------

export function emitLevelUp(characterId: string, data: {
  characterId: string;
  newLevel: number;
  rewards: {
    statPoints: number;
    skillPoints: number;
    maxHealth: number;
    maxMana: number;
  };
}) {
  getIO().to(`user:${characterId}`).emit('player:level-up', data);
}

export function emitAchievementUnlocked(characterId: string, data: {
  characterId: string;
  achievementId: string;
  name: string;
  description: string;
  reward: Record<string, unknown>;
}) {
  getIO().to(`user:${characterId}`).emit('achievement:unlocked', data);
}

// ---------------------------------------------------------------------------
// Notification events
// ---------------------------------------------------------------------------

export function emitNotification(characterId: string, data: {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: unknown;
}) {
  getIO().to(`user:${characterId}`).emit('notification:new', data);
}

// ---------------------------------------------------------------------------
// Tool events
// ---------------------------------------------------------------------------

export function emitToolBroken(characterId: string, data: {
  itemId: string;
  toolName: string;
  professionType: string;
}) {
  getIO().to(`user:${characterId}`).emit('tool:broken', data);
}

// ---------------------------------------------------------------------------
// Gathering events
// ---------------------------------------------------------------------------

export function emitGatheringReady(characterId: string, data: {
  actionId: string;
  resourceName: string;
}) {
  getIO().to(`user:${characterId}`).emit('gathering:ready', data);
}

export function emitGatheringDepleted(characterId: string, data: {
  townId: string;
  resourceType: string;
  abundance: number;
}) {
  getIO().to(`user:${characterId}`).emit('gathering:depleted', data);
}

// ---------------------------------------------------------------------------
// Crafting events
// ---------------------------------------------------------------------------

export function emitCraftingReady(characterId: string, data: {
  actionId: string;
  recipeName: string;
  queuePosition: number;
}) {
  getIO().to(`user:${characterId}`).emit('crafting:ready', data);
}

// ---------------------------------------------------------------------------
// Item durability events
// ---------------------------------------------------------------------------

export function emitItemLowDurability(characterId: string, data: {
  itemId: string;
  itemName: string;
  currentDurability: number;
  maxDurability: number;
  percentRemaining: number;
}) {
  getIO().to(`user:${characterId}`).emit('item:lowDurability', data);
}

export function emitItemBroken(characterId: string, data: {
  itemId: string;
  itemName: string;
  wasEquipped: boolean;
  slot: string | null;
}) {
  getIO().to(`user:${characterId}`).emit('item:broken', data);
}

// ---------------------------------------------------------------------------
// Building events
// ---------------------------------------------------------------------------

export function emitBuildingConstructed(characterId: string, data: {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  targetLevel: number;
  townName: string;
}) {
  getIO().to(`user:${characterId}`).emit('building:constructed', data);
}

export function emitBuildingTaxDue(characterId: string, data: {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  townName: string;
  amount: number;
  paid: boolean;
  remainingGold: number;
}) {
  getIO().to(`user:${characterId}`).emit('building:taxDue', data);
}

export function emitBuildingDelinquent(characterId: string, data: {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  townName: string;
  amountOwed: number;
  daysDelinquent: number;
  daysUntilSeizure: number;
}) {
  getIO().to(`user:${characterId}`).emit('building:delinquent', data);
}

export function emitBuildingSeized(characterId: string, data: {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  townName: string;
  daysDelinquent: number;
  seizedByMayor: boolean;
}) {
  getIO().to(`user:${characterId}`).emit('building:seized', data);
}

export function emitBuildingDamaged(characterId: string, data: {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  townName: string;
  damage: number;
  newCondition: number;
  cause: string;
}) {
  getIO().to(`user:${characterId}`).emit('building:damaged', data);
}

export function emitBuildingConditionLow(characterId: string, data: {
  buildingId: string;
  buildingName: string;
  buildingType: string;
  townName: string;
  condition: number;
  isFunctional: boolean;
  isCondemned: boolean;
}) {
  getIO().to(`user:${characterId}`).emit('building:conditionLow', data);
}

// ---------------------------------------------------------------------------
// World event broadcasts
// ---------------------------------------------------------------------------

export function emitWorldEvent(data: {
  id: string;
  eventType: string;
  title: string;
  description: string;
  metadata: unknown;
  createdAt: string;
}) {
  getIO().emit('world-event:new', data);
}

export function emitStateReport(data: {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}) {
  getIO().emit('world-event:state-report', data);
}

export function emitHeraldAnnouncement(data: {
  type: string;
  title: string;
  message: string;
  races?: string[];
  timestamp: string;
}) {
  getIO().emit('herald:announcement', data);
}

export function emitWarBulletinUpdate(data: {
  warId: string;
  attackerScore: number;
  defenderScore: number;
}) {
  getIO().emit('war:bulletin-update', data);
}

// ---------------------------------------------------------------------------
// Action lock-in events
// ---------------------------------------------------------------------------

export function emitActionLockedIn(characterId: string, data: {
  actionType: string;
  actionTarget: Record<string, unknown>;
}) {
  getIO().to(`user:${characterId}`).emit('action:locked-in', data);
}

export function emitActionCancelled(characterId: string, data: {
  defaultAction: string;
}) {
  getIO().to(`user:${characterId}`).emit('action:cancelled', data);
}

// ---------------------------------------------------------------------------
// Daily report events
// ---------------------------------------------------------------------------

export function emitDailyReportReady(characterId: string, data: {
  tickDate: string;
  summary: string;
}) {
  getIO().to(`user:${characterId}`).emit('daily-report:ready', data);
}

export function emitTickComplete(data: {
  tickDate: string;
  characterCount: number;
  timestamp: string;
}) {
  getIO().emit('tick:complete', data);
}
