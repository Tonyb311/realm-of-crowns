import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, or, desc, count } from 'drizzle-orm';
import { messages, characters, guildMembers, users } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { getPsionSpec } from '../services/psion-perks';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';

const router = Router();

const DEFAULT_PAGE_SIZE = 50;
const MAX_CONTENT_LENGTH = 2000;

// --- Schemas ---

const sendMessageSchema = z.object({
  channelType: z.enum(['GLOBAL', 'TOWN', 'GUILD', 'PARTY', 'WHISPER', 'TRADE', 'SYSTEM']),
  content: z.string().min(1, 'Message cannot be empty').max(MAX_CONTENT_LENGTH, `Message cannot exceed ${MAX_CONTENT_LENGTH} characters`),
  recipientId: z.string().optional(),
  guildId: z.string().optional(),
  townId: z.string().optional(),
});

function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

// POST /api/messages/send
router.post('/send', authGuard, characterGuard, validate(sendMessageSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { channelType, content, recipientId, guildId, townId } = req.body;
    const character = req.character!;

    // Channel-specific validation
    let farWhisper = false;
    if (channelType === 'WHISPER') {
      if (!recipientId) {
        return res.status(400).json({ error: 'recipientId is required for whisper messages' });
      }
      if (recipientId === character.id) {
        return res.status(400).json({ error: 'You cannot whisper to yourself' });
      }
      const recipient = await db.query.characters.findFirst({ where: eq(characters.id, recipientId) });
      if (!recipient) {
        return res.status(404).json({ error: 'Recipient not found' });
      }

      // Nomad Far Whisper: flag for client UI indicator
      const { isPsion, specialization } = await getPsionSpec(character.id);
      if (isPsion && specialization === 'nomad') {
        farWhisper = true;
      }
    }

    if (channelType === 'GUILD') {
      if (!guildId) {
        return res.status(400).json({ error: 'guildId is required for guild messages' });
      }
      const membership = await db.query.guildMembers.findFirst({
        where: and(eq(guildMembers.guildId, guildId), eq(guildMembers.characterId, character.id)),
      });
      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this guild' });
      }
    }

    if (channelType === 'GLOBAL') {
      const user = await db.query.users.findFirst({ where: eq(users.id, req.user!.userId) });
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can send global messages' });
      }
    }

    // Resolve townId for TOWN channel
    let resolvedTownId = townId;
    if (channelType === 'TOWN') {
      resolvedTownId = character.currentTownId;
      if (!resolvedTownId) {
        return res.status(400).json({ error: 'You must be in a town to send town messages' });
      }
    }

    const [message] = await db.insert(messages).values({
      id: crypto.randomUUID(),
      channelType,
      content,
      senderId: character.id,
      recipientId: channelType === 'WHISPER' ? recipientId : null,
      guildId: channelType === 'GUILD' ? guildId : null,
      townId: channelType === 'TOWN' ? resolvedTownId : null,
    }).returning();

    // Fetch with sender/recipient for response
    const fullMessage = await db.query.messages.findFirst({
      where: eq(messages.id, message.id),
      columns: {
        id: true,
        channelType: true,
        content: true,
        senderId: true,
        recipientId: true,
        guildId: true,
        townId: true,
        isRead: true,
        timestamp: true,
      },
      with: {
        character_senderId: { columns: { id: true, name: true } },
        character_recipientId: { columns: { id: true, name: true } },
      },
    });

    // Reshape to match original API response format
    const responseMessage = fullMessage ? {
      ...fullMessage,
      sender: fullMessage.character_senderId,
      recipient: fullMessage.character_recipientId,
      character_senderId: undefined,
      character_recipientId: undefined,
    } : message;

    return res.status(201).json({
      message: responseMessage,
      ...(farWhisper ? { farWhisper: true } : {}),
    });
  } catch (error) {
    if (handleDbError(error, res, 'message-send', req)) return;
    logRouteError(req, 500, 'Message send error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper to fetch messages with sender/recipient
async function fetchMessages(whereClause: any, orderBy: any, offset: number, limit: number) {
  const rows = await db.query.messages.findMany({
    where: whereClause,
    columns: {
      id: true,
      channelType: true,
      content: true,
      senderId: true,
      recipientId: true,
      guildId: true,
      townId: true,
      isRead: true,
      timestamp: true,
    },
    with: {
      character_senderId: { columns: { id: true, name: true } },
      character_recipientId: { columns: { id: true, name: true } },
    },
    orderBy,
    offset,
    limit,
  });
  return rows.map(r => ({
    ...r,
    sender: r.character_senderId,
    recipient: r.character_recipientId,
    character_senderId: undefined,
    character_recipientId: undefined,
  }));
}

// GET /api/messages/inbox
router.get('/inbox', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const { page, limit, offset } = parsePagination(req.query);

    const whereClause = and(
      eq(messages.channelType, 'WHISPER'),
      or(
        eq(messages.recipientId, character.id),
        eq(messages.senderId, character.id),
      ),
    );

    const [messageRows, [{ total }]] = await Promise.all([
      fetchMessages(whereClause, desc(messages.timestamp), offset, limit),
      db.select({ total: count() }).from(messages).where(whereClause),
    ]);

    return res.json({
      messages: messageRows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (handleDbError(error, res, 'message-inbox', req)) return;
    logRouteError(req, 500, 'Message inbox error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/conversation/:characterId
router.get('/conversation/:characterId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const { characterId: otherId } = req.params;
    const { page, limit, offset } = parsePagination(req.query);

    const whereClause = and(
      eq(messages.channelType, 'WHISPER'),
      or(
        and(eq(messages.senderId, character.id), eq(messages.recipientId, otherId)),
        and(eq(messages.senderId, otherId), eq(messages.recipientId, character.id)),
      ),
    );

    const [messageRows, [{ total }]] = await Promise.all([
      fetchMessages(whereClause, desc(messages.timestamp), offset, limit),
      db.select({ total: count() }).from(messages).where(whereClause),
    ]);

    return res.json({
      messages: messageRows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (handleDbError(error, res, 'message-conversation', req)) return;
    logRouteError(req, 500, 'Message conversation error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/channel/:channelType
router.get('/channel/:channelType', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const { channelType } = req.params;
    const validChannels = ['GLOBAL', 'TOWN', 'GUILD', 'PARTY', 'TRADE', 'SYSTEM'];
    if (!validChannels.includes(channelType)) {
      return res.status(400).json({ error: `Invalid channel type. Must be one of: ${validChannels.join(', ')}` });
    }

    const { page, limit, offset } = parsePagination(req.query);
    const { townId, guildId } = req.query;

    const conditions = [eq(messages.channelType, channelType as any)];

    if (channelType === 'TOWN') {
      const resolvedTownId = (townId as string) || character.currentTownId;
      if (!resolvedTownId) {
        return res.status(400).json({ error: 'townId is required or you must be in a town' });
      }
      conditions.push(eq(messages.townId, resolvedTownId));
    }

    if (channelType === 'GUILD') {
      if (!guildId) {
        return res.status(400).json({ error: 'guildId is required for guild channel' });
      }
      const membership = await db.query.guildMembers.findFirst({
        where: and(eq(guildMembers.guildId, guildId as string), eq(guildMembers.characterId, character.id)),
      });
      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this guild' });
      }
      conditions.push(eq(messages.guildId, guildId as string));
    }

    const whereClause = and(...conditions);

    const [messageRows, [{ total }]] = await Promise.all([
      fetchMessages(whereClause, desc(messages.timestamp), offset, limit),
      db.select({ total: count() }).from(messages).where(whereClause),
    ]);

    return res.json({
      messages: messageRows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    if (handleDbError(error, res, 'message-channel', req)) return;
    logRouteError(req, 500, 'Message channel error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/messages/:id/read
router.patch('/:id/read', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const message = await db.query.messages.findFirst({ where: eq(messages.id, req.params.id) });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.recipientId !== character.id) {
      return res.status(403).json({ error: 'You can only mark your own received messages as read' });
    }

    await db.update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, req.params.id));

    const updated = await db.query.messages.findFirst({
      where: eq(messages.id, req.params.id),
      columns: {
        id: true,
        channelType: true,
        content: true,
        senderId: true,
        recipientId: true,
        guildId: true,
        townId: true,
        isRead: true,
        timestamp: true,
      },
      with: {
        character_senderId: { columns: { id: true, name: true } },
        character_recipientId: { columns: { id: true, name: true } },
      },
    });

    const responseMessage = updated ? {
      ...updated,
      sender: updated.character_senderId,
      recipient: updated.character_recipientId,
      character_senderId: undefined,
      character_recipientId: undefined,
    } : null;

    return res.json({ message: responseMessage });
  } catch (error) {
    if (handleDbError(error, res, 'message-read', req)) return;
    logRouteError(req, 500, 'Message read error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/messages/:id
router.delete('/:id', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const message = await db.query.messages.findFirst({ where: eq(messages.id, req.params.id) });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== character.id) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await db.delete(messages).where(eq(messages.id, req.params.id));

    return res.json({ success: true });
  } catch (error) {
    if (handleDbError(error, res, 'message-delete', req)) return;
    logRouteError(req, 500, 'Message delete error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
