import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, or, desc } from 'drizzle-orm';
import { characters, friends, notifications } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { isOnline } from '../socket/presence';
import { emitFriendRequest, emitFriendAccepted, emitNotification } from '../socket/events';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import crypto from 'crypto';

const router = Router();

// --- Schemas ---

const requestSchema = z.object({
  characterId: z.string().min(1, 'characterId is required'),
});

// --- POST /api/friends/request ---

router.post('/request', authGuard, characterGuard, validate(requestSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { characterId: targetId } = req.body;
    const character = req.character!;

    if (character.id === targetId) {
      return res.status(400).json({ error: 'Cannot send a friend request to yourself' });
    }

    const target = await db.query.characters.findFirst({
      where: eq(characters.id, targetId),
    });
    if (!target) {
      return res.status(404).json({ error: 'Target character not found' });
    }

    // Check if a friendship already exists in either direction
    const existing = await db.query.friends.findFirst({
      where: or(
        and(eq(friends.requesterId, character.id), eq(friends.recipientId, targetId)),
        and(eq(friends.requesterId, targetId), eq(friends.recipientId, character.id)),
      ),
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return res.status(400).json({ error: 'Already friends' });
      }
      if (existing.status === 'PENDING') {
        return res.status(400).json({ error: 'Friend request already pending' });
      }
      if (existing.status === 'BLOCKED') {
        return res.status(400).json({ error: 'Cannot send friend request' });
      }
      // DECLINED -> allow re-request by deleting old and creating new
      await db.delete(friends).where(eq(friends.id, existing.id));
    }

    const [friendship] = await db.insert(friends).values({
      id: crypto.randomUUID(),
      requesterId: character.id,
      recipientId: targetId,
      status: 'PENDING',
    }).returning();

    // Create notification for recipient
    const [notification] = await db.insert(notifications).values({
      id: crypto.randomUUID(),
      characterId: targetId,
      type: 'friend_request',
      title: 'Friend Request',
      message: `${character.name} wants to be your friend!`,
      data: { friendshipId: friendship.id, requesterId: character.id },
    }).returning();

    // Real-time: emit to recipient
    emitFriendRequest(targetId, {
      friendshipId: friendship.id,
      requesterId: character.id,
      requesterName: character.name,
    });

    emitNotification(targetId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
    });

    return res.status(201).json({
      friendship: {
        id: friendship.id,
        recipientId: targetId,
        status: friendship.status,
        createdAt: friendship.createdAt,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'friend-request', req)) return;
    logRouteError(req, 500, 'Friend request error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- POST /api/friends/:id/accept ---

router.post('/:id/accept', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const friendship = await db.query.friends.findFirst({
      where: eq(friends.id, req.params.id),
      with: { character_requesterId: { columns: { id: true, name: true } } },
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friendship.recipientId !== character.id) {
      return res.status(403).json({ error: 'Only the recipient can accept' });
    }

    if (friendship.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request is no longer pending' });
    }

    const [updated] = await db.update(friends).set({ status: 'ACCEPTED' }).where(eq(friends.id, friendship.id)).returning();

    // Notify the requester
    const [notification] = await db.insert(notifications).values({
      id: crypto.randomUUID(),
      characterId: friendship.requesterId,
      type: 'friend_accepted',
      title: 'Friend Request Accepted',
      message: `${character.name} accepted your friend request!`,
      data: { friendshipId: friendship.id, acceptedById: character.id },
    }).returning();

    emitFriendAccepted(friendship.requesterId, {
      friendshipId: friendship.id,
      acceptedById: character.id,
      acceptedByName: character.name,
    });

    emitNotification(friendship.requesterId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
    });

    return res.json({
      friendship: {
        id: updated.id,
        status: updated.status,
        friendId: friendship.requesterId,
        friendName: friendship.character_requesterId.name,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'friend-accept', req)) return;
    logRouteError(req, 500, 'Friend accept error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- POST /api/friends/:id/decline ---

router.post('/:id/decline', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const friendship = await db.query.friends.findFirst({
      where: eq(friends.id, req.params.id),
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friendship.recipientId !== character.id) {
      return res.status(403).json({ error: 'Only the recipient can decline' });
    }

    if (friendship.status !== 'PENDING') {
      return res.status(400).json({ error: 'Request is no longer pending' });
    }

    const [updated] = await db.update(friends).set({ status: 'DECLINED' }).where(eq(friends.id, friendship.id)).returning();

    return res.json({ friendship: { id: updated.id, status: updated.status } });
  } catch (error) {
    if (handleDbError(error, res, 'friend-decline', req)) return;
    logRouteError(req, 500, 'Friend decline error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- DELETE /api/friends/:id ---

router.delete('/:id', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const friendship = await db.query.friends.findFirst({
      where: eq(friends.id, req.params.id),
    });

    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    // Either party can remove/cancel
    if (friendship.requesterId !== character.id && friendship.recipientId !== character.id) {
      return res.status(403).json({ error: 'Not your friendship' });
    }

    await db.delete(friends).where(eq(friends.id, friendship.id));

    return res.json({ message: 'Friend removed' });
  } catch (error) {
    if (handleDbError(error, res, 'friend-remove', req)) return;
    logRouteError(req, 500, 'Friend delete error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /api/friends ---

router.get('/', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const friendships = await db.query.friends.findMany({
      where: and(
        eq(friends.status, 'ACCEPTED'),
        or(eq(friends.requesterId, character.id), eq(friends.recipientId, character.id)),
      ),
      with: {
        character_requesterId: { columns: { id: true, name: true, level: true, race: true, currentTownId: true } },
        character_recipientId: { columns: { id: true, name: true, level: true, race: true, currentTownId: true } },
      },
      orderBy: desc(friends.createdAt),
    });

    const friendList = friendships.map((f) => {
      const friend = f.requesterId === character.id ? f.character_recipientId : f.character_requesterId;
      return {
        friendshipId: f.id,
        character: {
          id: friend.id,
          name: friend.name,
          level: friend.level,
          race: friend.race,
          currentTownId: friend.currentTownId,
        },
        online: isOnline(friend.id),
        since: f.createdAt,
      };
    });

    return res.json({ friends: friendList });
  } catch (error) {
    if (handleDbError(error, res, 'friend-list', req)) return;
    logRouteError(req, 500, 'Friends list error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /api/friends/requests ---

router.get('/requests', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const incoming = await db.query.friends.findMany({
      where: and(eq(friends.recipientId, character.id), eq(friends.status, 'PENDING')),
      with: {
        character_requesterId: { columns: { id: true, name: true, level: true, race: true } },
      },
      orderBy: desc(friends.createdAt),
    });

    const outgoing = await db.query.friends.findMany({
      where: and(eq(friends.requesterId, character.id), eq(friends.status, 'PENDING')),
      with: {
        character_recipientId: { columns: { id: true, name: true, level: true, race: true } },
      },
      orderBy: desc(friends.createdAt),
    });

    return res.json({
      incoming: incoming.map((f) => ({
        id: f.id,
        from: f.character_requesterId,
        createdAt: f.createdAt,
      })),
      outgoing: outgoing.map((f) => ({
        id: f.id,
        to: f.character_recipientId,
        createdAt: f.createdAt,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'friend-requests', req)) return;
    logRouteError(req, 500, 'Friend requests error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
