import { Server } from 'socket.io';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import type { AuthenticatedSocket } from './middleware';

// ---------------------------------------------------------------------------
// Presence tracking (Redis-backed with in-memory fallback)
// ---------------------------------------------------------------------------

interface PresenceEntry {
  userId: string;
  characterId: string;
  characterName: string;
  currentTownId: string | null;
  socketId: string;
  connectedAt: Date;
}

// In-memory fallback (always kept for fast local lookups)
const onlineUsers = new Map<string, PresenceEntry>();
// Map: socketId -> characterId (for cleanup on disconnect)
const socketToCharacter = new Map<string, string>();

const PRESENCE_TTL = 3600; // 1 hour
const PRESENCE_KEY = 'presence:online';

async function addPresenceRedis(entry: PresenceEntry): Promise<void> {
  if (!redis) return;
  try {
    await redis.hset(PRESENCE_KEY, entry.characterId, JSON.stringify(entry));
  } catch { /* ignore */ }
}

async function removePresenceRedis(characterId: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.hdel(PRESENCE_KEY, characterId);
  } catch { /* ignore */ }
}

async function updatePresenceFieldRedis(characterId: string, field: string, value: string | null): Promise<void> {
  if (!redis) return;
  try {
    const raw = await redis.hget(PRESENCE_KEY, characterId);
    if (raw) {
      const entry = JSON.parse(raw);
      entry[field] = value;
      await redis.hset(PRESENCE_KEY, characterId, JSON.stringify(entry));
    }
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getOnlineUsers(townId?: string): PresenceEntry[] {
  const entries = [...onlineUsers.values()];
  if (townId) {
    return entries.filter((e) => e.currentTownId === townId);
  }
  return entries;
}

export function isOnline(characterId: string): boolean {
  return onlineUsers.has(characterId);
}

export function getPresenceEntry(characterId: string): PresenceEntry | undefined {
  return onlineUsers.get(characterId);
}

export function updatePresenceTown(characterId: string, townId: string | null): void {
  const entry = onlineUsers.get(characterId);
  if (entry) {
    entry.currentTownId = townId;
    updatePresenceFieldRedis(characterId, 'currentTownId', townId);
  }
}

// ---------------------------------------------------------------------------
// Get friend IDs for a character (accepted friends only)
// ---------------------------------------------------------------------------

async function getFriendCharacterIds(characterId: string): Promise<string[]> {
  const friends = await prisma.friend.findMany({
    where: {
      status: 'ACCEPTED',
      OR: [{ requesterId: characterId }, { recipientId: characterId }],
    },
    select: { requesterId: true, recipientId: true },
  });

  return friends.map((f) =>
    f.requesterId === characterId ? f.recipientId : f.requesterId
  );
}

// ---------------------------------------------------------------------------
// Socket event handlers
// ---------------------------------------------------------------------------

export function setupPresence(io: Server) {
  io.on('connection', async (rawSocket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const userId = socket.data.userId;

    if (!userId) return;

    // Look up the user's character
    const character = await prisma.character.findFirst({
      where: { userId },
      select: { id: true, name: true, currentTownId: true },
    });

    if (!character) return;

    // Register presence
    const entry: PresenceEntry = {
      userId,
      characterId: character.id,
      characterName: character.name,
      currentTownId: character.currentTownId,
      socketId: socket.id,
      connectedAt: new Date(),
    };

    onlineUsers.set(character.id, entry);
    socketToCharacter.set(socket.id, character.id);
    addPresenceRedis(entry);

    // Auto-join town room if in a town
    if (character.currentTownId) {
      socket.join(`town:${character.currentTownId}`);
    }

    // Join personal room for direct notifications
    socket.join(`user:${character.id}`);

    // Broadcast presence:online to friends
    const friendIds = await getFriendCharacterIds(character.id);
    for (const friendId of friendIds) {
      if (isOnline(friendId)) {
        const friendEntry = onlineUsers.get(friendId);
        if (friendEntry) {
          io.to(`user:${friendId}`).emit('presence:online', {
            characterId: character.id,
            characterName: character.name,
          });
        }
      }
    }

    // Send current online friends to the connecting user
    const onlineFriends = friendIds
      .filter((id) => isOnline(id))
      .map((id) => {
        const e = onlineUsers.get(id)!;
        return { characterId: e.characterId, characterName: e.characterName };
      });

    socket.emit('presence:friends-online', { friends: onlineFriends });

    // Handle join/leave town (for presence tracking)
    socket.on('join:town', (townId: string) => {
      socket.join(`town:${townId}`);
      updatePresenceTown(character.id, townId);
    });

    socket.on('leave:town', (townId: string) => {
      socket.leave(`town:${townId}`);
    });

    socket.on('join:kingdom', (kingdomId: string) => {
      socket.join(`kingdom:${kingdomId}`);
    });

    socket.on('leave:kingdom', (kingdomId: string) => {
      socket.leave(`kingdom:${kingdomId}`);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      const charId = socketToCharacter.get(socket.id);
      if (charId) {
        onlineUsers.delete(charId);
        socketToCharacter.delete(socket.id);
        removePresenceRedis(charId);

        // Broadcast presence:offline to friends
        const offlineFriendIds = await getFriendCharacterIds(charId);
        for (const friendId of offlineFriendIds) {
          if (isOnline(friendId)) {
            io.to(`user:${friendId}`).emit('presence:offline', {
              characterId: charId,
            });
          }
        }
      }
    });
  });
}
