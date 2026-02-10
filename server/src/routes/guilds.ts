import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { io } from '../index';
import { cache } from '../middleware/cache';
import { invalidateCache } from '../lib/redis';

const router = Router();

const GUILD_CREATION_COST = 500;
const RANK_HIERARCHY: Record<string, number> = {
  member: 0,
  officer: 1,
  'co-leader': 2,
  leader: 3,
};

// --- Schemas ---

const createGuildSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(30, 'Name must be at most 30 characters'),
  tag: z.string().min(2, 'Tag must be at least 2 characters').max(4, 'Tag must be at most 4 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Tag must be alphanumeric'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
});

const updateGuildSchema = z.object({
  name: z.string().min(3).max(30).optional(),
  description: z.string().max(500).optional(),
});

const memberActionSchema = z.object({
  characterId: z.string().min(1, 'characterId is required'),
});

const promoteSchema = z.object({
  characterId: z.string().min(1, 'characterId is required'),
  newRank: z.enum(['member', 'officer', 'co-leader']),
});

const donateSchema = z.object({
  amount: z.number().int().min(1, 'Amount must be at least 1'),
});

const transferSchema = z.object({
  characterId: z.string().min(1, 'characterId is required'),
});

// --- Helpers ---

async function getCharacter(userId: string) {
  return prisma.character.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
}

async function getMembership(guildId: string, characterId: string) {
  return prisma.guildMember.findUnique({
    where: { guildId_characterId: { guildId, characterId } },
  });
}

function hasRank(memberRank: string, requiredRank: string): boolean {
  return (RANK_HIERARCHY[memberRank] ?? -1) >= (RANK_HIERARCHY[requiredRank] ?? 999);
}

// POST /api/guilds - Create guild
router.post('/', authGuard, validate(createGuildSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, tag, description } = req.body;
    const character = await getCharacter(req.user!.userId);

    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    if (character.gold < GUILD_CREATION_COST) {
      return res.status(400).json({ error: `Insufficient gold. Need ${GUILD_CREATION_COST}, have ${character.gold}` });
    }

    // Check if character already leads a guild
    const existingLed = await prisma.guild.findUnique({ where: { leaderId: character.id } });
    if (existingLed) {
      return res.status(400).json({ error: 'You already lead a guild' });
    }

    const guild = await prisma.$transaction(async (tx) => {
      // Deduct gold
      await tx.character.update({
        where: { id: character.id },
        data: { gold: { decrement: GUILD_CREATION_COST } },
      });

      // Create guild
      const newGuild = await tx.guild.create({
        data: {
          name,
          tag: tag.toUpperCase(),
          leaderId: character.id,
          description: description || null,
        },
      });

      // Add creator as leader member
      await tx.guildMember.create({
        data: {
          guildId: newGuild.id,
          characterId: character.id,
          rank: 'leader',
        },
      });

      return newGuild;
    });

    return res.status(201).json({ guild });
  } catch (error: any) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      return res.status(409).json({ error: `A guild with that ${field || 'name or tag'} already exists` });
    }
    console.error('Guild create error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/guilds - List guilds (paginated, searchable)
router.get('/', authGuard, cache(60), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { tag: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [guilds, total] = await Promise.all([
      prisma.guild.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          leader: { select: { id: true, name: true } },
          _count: { select: { members: true } },
        },
      }),
      prisma.guild.count({ where }),
    ]);

    return res.json({
      guilds: guilds.map(g => ({
        id: g.id,
        name: g.name,
        tag: g.tag,
        level: g.level,
        description: g.description,
        leader: g.leader,
        memberCount: g._count.members,
        createdAt: g.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Guild list error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/guilds/:id - Get guild details
router.get('/:id', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({
      where: { id: req.params.id },
      include: {
        leader: { select: { id: true, name: true, level: true, race: true } },
        members: {
          include: {
            character: { select: { id: true, name: true, level: true, race: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }

    return res.json({
      guild: {
        id: guild.id,
        name: guild.name,
        tag: guild.tag,
        level: guild.level,
        treasury: guild.treasury,
        description: guild.description,
        leader: guild.leader,
        createdAt: guild.createdAt,
        members: guild.members.map(m => ({
          characterId: m.characterId,
          name: m.character.name,
          level: m.character.level,
          race: m.character.race,
          rank: m.rank,
          joinedAt: m.joinedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Guild get error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/guilds/:id - Update guild info (leader/officer only)
router.patch('/:id', authGuard, validate(updateGuildSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });

    const membership = await getMembership(req.params.id, character.id);
    if (!membership || !hasRank(membership.rank, 'officer')) {
      return res.status(403).json({ error: 'Only officers and above can update guild info' });
    }

    const { name, description } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const guild = await prisma.guild.update({
      where: { id: req.params.id },
      data,
    });

    return res.json({ guild });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'A guild with that name already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Guild not found' });
    }
    console.error('Guild update error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/guilds/:id - Disband guild (leader only)
router.delete('/:id', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });

    const guild = await prisma.guild.findUnique({ where: { id: req.params.id } });
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    if (guild.leaderId !== character.id) {
      return res.status(403).json({ error: 'Only the guild leader can disband the guild' });
    }

    await prisma.$transaction(async (tx) => {
      // Return treasury to leader
      if (guild.treasury > 0) {
        await tx.character.update({
          where: { id: character.id },
          data: { gold: { increment: guild.treasury } },
        });
      }

      // Delete all members (cascade handles this, but explicit for clarity)
      await tx.guildMember.deleteMany({ where: { guildId: guild.id } });

      // Delete guild
      await tx.guild.delete({ where: { id: guild.id } });
    });

    // Emit dissolution event
    io.to(`guild:${guild.id}`).emit('guild:dissolved', { guildId: guild.id, guildName: guild.name });

    return res.json({ message: 'Guild disbanded successfully' });
  } catch (error) {
    console.error('Guild disband error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/invite - Invite player to guild (officer+ only)
router.post('/:id/invite', authGuard, validate(memberActionSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });

    const membership = await getMembership(req.params.id, character.id);
    if (!membership || !hasRank(membership.rank, 'officer')) {
      return res.status(403).json({ error: 'Only officers and above can invite members' });
    }

    const { characterId } = req.body;

    // Check target exists
    const target = await prisma.character.findUnique({ where: { id: characterId } });
    if (!target) return res.status(404).json({ error: 'Character not found' });

    // Check not already a member
    const existing = await getMembership(req.params.id, characterId);
    if (existing) return res.status(409).json({ error: 'Character is already a member of this guild' });

    const newMember = await prisma.guildMember.create({
      data: {
        guildId: req.params.id,
        characterId,
        rank: 'member',
      },
      include: {
        character: { select: { id: true, name: true } },
      },
    });

    // Emit join event
    io.to(`guild:${req.params.id}`).emit('guild:member-joined', {
      guildId: req.params.id,
      character: newMember.character,
    });

    return res.status(201).json({ member: newMember });
  } catch (error) {
    console.error('Guild invite error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/join - Join guild (open join)
router.post('/:id/join', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });

    const guild = await prisma.guild.findUnique({ where: { id: req.params.id } });
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const existing = await getMembership(req.params.id, character.id);
    if (existing) return res.status(409).json({ error: 'You are already a member of this guild' });

    const newMember = await prisma.guildMember.create({
      data: {
        guildId: req.params.id,
        characterId: character.id,
        rank: 'member',
      },
      include: {
        character: { select: { id: true, name: true } },
      },
    });

    io.to(`guild:${req.params.id}`).emit('guild:member-joined', {
      guildId: req.params.id,
      character: newMember.character,
    });

    return res.status(201).json({ member: newMember });
  } catch (error) {
    console.error('Guild join error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/kick - Kick member (officer+ only, can't kick leader)
router.post('/:id/kick', authGuard, validate(memberActionSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });

    const membership = await getMembership(req.params.id, character.id);
    if (!membership || !hasRank(membership.rank, 'officer')) {
      return res.status(403).json({ error: 'Only officers and above can kick members' });
    }

    const { characterId } = req.body;
    const targetMembership = await getMembership(req.params.id, characterId);
    if (!targetMembership) return res.status(404).json({ error: 'Target is not a member of this guild' });

    if (targetMembership.rank === 'leader') {
      return res.status(403).json({ error: 'Cannot kick the guild leader' });
    }

    // Can only kick someone of lower rank
    if (RANK_HIERARCHY[targetMembership.rank] >= RANK_HIERARCHY[membership.rank]) {
      return res.status(403).json({ error: 'Cannot kick a member of equal or higher rank' });
    }

    await prisma.guildMember.delete({ where: { id: targetMembership.id } });

    io.to(`guild:${req.params.id}`).emit('guild:member-left', {
      guildId: req.params.id,
      characterId,
    });

    return res.json({ message: 'Member kicked from guild' });
  } catch (error) {
    console.error('Guild kick error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/leave - Leave guild
router.post('/:id/leave', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });

    const membership = await getMembership(req.params.id, character.id);
    if (!membership) return res.status(404).json({ error: 'You are not a member of this guild' });

    if (membership.rank === 'leader') {
      return res.status(400).json({ error: 'Leader cannot leave. Transfer leadership first or disband the guild' });
    }

    await prisma.guildMember.delete({ where: { id: membership.id } });

    io.to(`guild:${req.params.id}`).emit('guild:member-left', {
      guildId: req.params.id,
      characterId: character.id,
    });

    return res.json({ message: 'You have left the guild' });
  } catch (error) {
    console.error('Guild leave error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/promote - Change member rank (leader only)
router.post('/:id/promote', authGuard, validate(promoteSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });

    const membership = await getMembership(req.params.id, character.id);
    if (!membership || membership.rank !== 'leader') {
      return res.status(403).json({ error: 'Only the guild leader can change member ranks' });
    }

    const { characterId, newRank } = req.body;
    const targetMembership = await getMembership(req.params.id, characterId);
    if (!targetMembership) return res.status(404).json({ error: 'Target is not a member of this guild' });

    if (targetMembership.rank === 'leader') {
      return res.status(400).json({ error: 'Cannot change leader rank. Use transfer instead' });
    }

    const updated = await prisma.guildMember.update({
      where: { id: targetMembership.id },
      data: { rank: newRank },
      include: {
        character: { select: { id: true, name: true } },
      },
    });

    return res.json({ member: updated });
  } catch (error) {
    console.error('Guild promote error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/donate - Donate gold to guild treasury
router.post('/:id/donate', authGuard, validate(donateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });

    const membership = await getMembership(req.params.id, character.id);
    if (!membership) return res.status(404).json({ error: 'You are not a member of this guild' });

    const { amount } = req.body;

    if (character.gold < amount) {
      return res.status(400).json({ error: `Insufficient gold. Have ${character.gold}, need ${amount}` });
    }

    const guild = await prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: { gold: { decrement: amount } },
      });

      return tx.guild.update({
        where: { id: req.params.id },
        data: { treasury: { increment: amount } },
      });
    });

    return res.json({ treasury: guild.treasury, donated: amount });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Guild not found' });
    }
    console.error('Guild donate error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/guilds/:id/quests - List guild quests (placeholder)
router.get('/:id/quests', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const guild = await prisma.guild.findUnique({ where: { id: req.params.id } });
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    return res.json({ quests: [] });
  } catch (error) {
    console.error('Guild quests error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/transfer - Transfer leadership
router.post('/:id/transfer', authGuard, validate(transferSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await getCharacter(req.user!.userId);
    if (!character) return res.status(404).json({ error: 'No character found' });

    const guild = await prisma.guild.findUnique({ where: { id: req.params.id } });
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    if (guild.leaderId !== character.id) {
      return res.status(403).json({ error: 'Only the guild leader can transfer leadership' });
    }

    const { characterId } = req.body;
    if (characterId === character.id) {
      return res.status(400).json({ error: 'You are already the leader' });
    }

    const targetMembership = await getMembership(req.params.id, characterId);
    if (!targetMembership) return res.status(404).json({ error: 'Target is not a member of this guild' });

    await prisma.$transaction(async (tx) => {
      // Update guild leader
      await tx.guild.update({
        where: { id: guild.id },
        data: { leaderId: characterId },
      });

      // Promote target to leader rank
      await tx.guildMember.update({
        where: { id: targetMembership.id },
        data: { rank: 'leader' },
      });

      // Demote old leader to co-leader
      const oldLeaderMembership = await tx.guildMember.findUnique({
        where: { guildId_characterId: { guildId: guild.id, characterId: character.id } },
      });
      if (oldLeaderMembership) {
        await tx.guildMember.update({
          where: { id: oldLeaderMembership.id },
          data: { rank: 'co-leader' },
        });
      }
    });

    return res.json({ message: 'Leadership transferred successfully' });
  } catch (error) {
    console.error('Guild transfer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
