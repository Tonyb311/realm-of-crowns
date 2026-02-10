import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { getPsionSpec } from '../services/psion-perks';

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

// --- Helpers ---

async function getCharacter(userId: string) {
  return prisma.character.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
}

function parsePagination(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

const messageSelect = {
  id: true,
  channelType: true,
  content: true,
  senderId: true,
  recipientId: true,
  guildId: true,
  townId: true,
  isRead: true,
  timestamp: true,
  sender: { select: { id: true, name: true } },
  recipient: { select: { id: true, name: true } },
};

// POST /api/messages/send
router.post('/send', authGuard, validate(sendMessageSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { channelType, content, recipientId, guildId, townId } = req.body;
    const character = await getCharacter(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    // Channel-specific validation
    let farWhisper = false;
    if (channelType === 'WHISPER') {
      if (!recipientId) {
        return res.status(400).json({ error: 'recipientId is required for whisper messages' });
      }
      if (recipientId === character.id) {
        return res.status(400).json({ error: 'You cannot whisper to yourself' });
      }
      const recipient = await prisma.character.findUnique({ where: { id: recipientId } });
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
      const membership = await prisma.guildMember.findUnique({
        where: { guildId_characterId: { guildId, characterId: character.id } },
      });
      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this guild' });
      }
    }

    if (channelType === 'GLOBAL') {
      const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
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

    const message = await prisma.message.create({
      data: {
        channelType,
        content,
        senderId: character.id,
        recipientId: channelType === 'WHISPER' ? recipientId : null,
        guildId: channelType === 'GUILD' ? guildId : null,
        townId: channelType === 'TOWN' ? resolvedTownId : null,
      },
      select: messageSelect,
    });

    return res.status(201).json({
      message,
      ...(farWhisper ? { farWhisper: true } : {}),
    });
  } catch (error) {
    console.error('Message send error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/inbox
router.get('/inbox', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const { page, limit, skip } = parsePagination(req.query);

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          channelType: 'WHISPER',
          OR: [
            { recipientId: character.id },
            { senderId: character.id },
          ],
        },
        select: messageSelect,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({
        where: {
          channelType: 'WHISPER',
          OR: [
            { recipientId: character.id },
            { senderId: character.id },
          ],
        },
      }),
    ]);

    return res.json({
      messages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Message inbox error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/conversation/:characterId
router.get('/conversation/:characterId', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const { characterId: otherId } = req.params;
    const { page, limit, skip } = parsePagination(req.query);

    const where = {
      channelType: 'WHISPER' as const,
      OR: [
        { senderId: character.id, recipientId: otherId },
        { senderId: otherId, recipientId: character.id },
      ],
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        select: messageSelect,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);

    return res.json({
      messages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Message conversation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/channel/:channelType
router.get('/channel/:channelType', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const { channelType } = req.params;
    const validChannels = ['GLOBAL', 'TOWN', 'GUILD', 'PARTY', 'TRADE', 'SYSTEM'];
    if (!validChannels.includes(channelType)) {
      return res.status(400).json({ error: `Invalid channel type. Must be one of: ${validChannels.join(', ')}` });
    }

    const { page, limit, skip } = parsePagination(req.query);
    const { townId, guildId } = req.query;

    const where: Record<string, unknown> = { channelType };

    if (channelType === 'TOWN') {
      const resolvedTownId = (townId as string) || character.currentTownId;
      if (!resolvedTownId) {
        return res.status(400).json({ error: 'townId is required or you must be in a town' });
      }
      where.townId = resolvedTownId;
    }

    if (channelType === 'GUILD') {
      if (!guildId) {
        return res.status(400).json({ error: 'guildId is required for guild channel' });
      }
      const membership = await prisma.guildMember.findUnique({
        where: { guildId_characterId: { guildId: guildId as string, characterId: character.id } },
      });
      if (!membership) {
        return res.status(403).json({ error: 'You are not a member of this guild' });
      }
      where.guildId = guildId;
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        select: messageSelect,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);

    return res.json({
      messages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Message channel error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/messages/:id/read
router.patch('/:id/read', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.recipientId !== character.id) {
      return res.status(403).json({ error: 'You can only mark your own received messages as read' });
    }

    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { isRead: true },
      select: messageSelect,
    });

    return res.json({ message: updated });
  } catch (error) {
    console.error('Message read error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/messages/:id
router.delete('/:id', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== character.id) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await prisma.message.delete({ where: { id: req.params.id } });

    return res.json({ success: true });
  } catch (error) {
    console.error('Message delete error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
