import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, or, ilike, desc, asc, sql, count } from 'drizzle-orm';
import { guilds, guildMembers, characters } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { emitGuildEvent } from '../socket/events';
import { cache } from '../middleware/cache';
import { invalidateCache } from '../lib/redis';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import crypto from 'crypto';

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

async function getMembership(guildId: string, characterId: string) {
  return db.query.guildMembers.findFirst({
    where: and(eq(guildMembers.guildId, guildId), eq(guildMembers.characterId, characterId)),
  });
}

function hasRank(memberRank: string, requiredRank: string): boolean {
  return (RANK_HIERARCHY[memberRank] ?? -1) >= (RANK_HIERARCHY[requiredRank] ?? 999);
}

// POST /api/guilds - Create guild
router.post('/', authGuard, characterGuard, validate(createGuildSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, tag, description } = req.body;
    const character = req.character!;

    if (character.gold < GUILD_CREATION_COST) {
      return res.status(400).json({ error: `Insufficient gold. Need ${GUILD_CREATION_COST}, have ${character.gold}` });
    }

    // Check if character already leads a guild
    const existingLed = await db.query.guilds.findFirst({ where: eq(guilds.leaderId, character.id) });
    if (existingLed) {
      return res.status(400).json({ error: 'You already lead a guild' });
    }

    const guild = await db.transaction(async (tx) => {
      // Deduct gold
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} - ${GUILD_CREATION_COST}` })
        .where(eq(characters.id, character.id));

      // Create guild
      const [newGuild] = await tx.insert(guilds).values({
        id: crypto.randomUUID(),
        name,
        tag: tag.toUpperCase(),
        leaderId: character.id,
        description: description || null,
      }).returning();

      // Add creator as leader member
      await tx.insert(guildMembers).values({
        id: crypto.randomUUID(),
        guildId: newGuild.id,
        characterId: character.id,
        rank: 'leader',
      });

      return newGuild;
    });

    return res.status(201).json({ guild });
  } catch (error) {
    if (handleDbError(error, res, 'guild-create', req)) return;
    logRouteError(req, 500, 'Guild create error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/guilds - List guilds (paginated, searchable)
router.get('/', authGuard, cache(60), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    const whereCondition = search
      ? or(ilike(guilds.name, `%${search}%`), ilike(guilds.tag, `%${search}%`))
      : undefined;

    const [guildRows, [totalResult]] = await Promise.all([
      db.query.guilds.findMany({
        where: whereCondition,
        offset,
        limit,
        orderBy: desc(guilds.createdAt),
        with: {
          character: { columns: { id: true, name: true } }, // leader
          guildMembers: true,
        },
      }),
      db.select({ value: count() }).from(guilds).where(whereCondition ?? sql`true`),
    ]);

    const total = totalResult.value;

    return res.json({
      guilds: guildRows.map(g => ({
        id: g.id,
        name: g.name,
        tag: g.tag,
        level: g.level,
        description: g.description,
        leader: g.character, // leader via guilds.leaderId
        memberCount: g.guildMembers.length,
        createdAt: g.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (handleDbError(error, res, 'guild-list', req)) return;
    logRouteError(req, 500, 'Guild list error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/guilds/:id - Get guild details
router.get('/:id', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const guild = await db.query.guilds.findFirst({
      where: eq(guilds.id, req.params.id),
      with: {
        character: { columns: { id: true, name: true, level: true, race: true } }, // leader
        guildMembers: {
          with: {
            character: { columns: { id: true, name: true, level: true, race: true } },
          },
          orderBy: asc(guildMembers.joinedAt),
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
        leader: guild.character, // leader via guilds.leaderId
        createdAt: guild.createdAt,
        members: guild.guildMembers.map(m => ({
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
    if (handleDbError(error, res, 'guild-get', req)) return;
    logRouteError(req, 500, 'Guild get error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/guilds/:id - Update guild info (leader/officer only)
router.patch('/:id', authGuard, characterGuard, validate(updateGuildSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

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

    const [guild] = await db.update(guilds)
      .set(data)
      .where(eq(guilds.id, req.params.id))
      .returning();

    return res.json({ guild });
  } catch (error) {
    if (handleDbError(error, res, 'guild-update', req)) return;
    logRouteError(req, 500, 'Guild update error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/guilds/:id - Disband guild (leader only)
router.delete('/:id', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const guild = await db.query.guilds.findFirst({ where: eq(guilds.id, req.params.id) });
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    if (guild.leaderId !== character.id) {
      return res.status(403).json({ error: 'Only the guild leader can disband the guild' });
    }

    await db.transaction(async (tx) => {
      // Return treasury to leader
      if (guild.treasury > 0) {
        await tx.update(characters)
          .set({ gold: sql`${characters.gold} + ${guild.treasury}` })
          .where(eq(characters.id, character.id));
      }

      // Delete all members (cascade handles this, but explicit for clarity)
      await tx.delete(guildMembers).where(eq(guildMembers.guildId, guild.id));

      // Delete guild
      await tx.delete(guilds).where(eq(guilds.id, guild.id));
    });

    // Emit dissolution event
    emitGuildEvent(`guild:${guild.id}`, 'guild:dissolved', { guildId: guild.id, guildName: guild.name });

    return res.json({ message: 'Guild disbanded successfully' });
  } catch (error) {
    if (handleDbError(error, res, 'guild-disband', req)) return;
    logRouteError(req, 500, 'Guild disband error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/invite - Invite player to guild (officer+ only)
router.post('/:id/invite', authGuard, characterGuard, validate(memberActionSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const membership = await getMembership(req.params.id, character.id);
    if (!membership || !hasRank(membership.rank, 'officer')) {
      return res.status(403).json({ error: 'Only officers and above can invite members' });
    }

    const { characterId } = req.body;

    // Check target exists
    const target = await db.query.characters.findFirst({ where: eq(characters.id, characterId) });
    if (!target) return res.status(404).json({ error: 'Character not found' });

    // Check not already a member
    const existing = await getMembership(req.params.id, characterId);
    if (existing) return res.status(409).json({ error: 'Character is already a member of this guild' });

    const [inserted] = await db.insert(guildMembers).values({
      id: crypto.randomUUID(),
      guildId: req.params.id,
      characterId,
      rank: 'member',
    }).returning();

    // Fetch with character relation
    const newMember = await db.query.guildMembers.findFirst({
      where: eq(guildMembers.id, inserted.id),
      with: { character: { columns: { id: true, name: true } } },
    });

    // Emit join event
    emitGuildEvent(`guild:${req.params.id}`, 'guild:member-joined', {
      guildId: req.params.id,
      character: newMember?.character,
    });

    return res.status(201).json({ member: newMember });
  } catch (error) {
    if (handleDbError(error, res, 'guild-invite', req)) return;
    logRouteError(req, 500, 'Guild invite error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/join - Join guild (open join)
router.post('/:id/join', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const guild = await db.query.guilds.findFirst({ where: eq(guilds.id, req.params.id) });
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const existing = await getMembership(req.params.id, character.id);
    if (existing) return res.status(409).json({ error: 'You are already a member of this guild' });

    const [inserted] = await db.insert(guildMembers).values({
      id: crypto.randomUUID(),
      guildId: req.params.id,
      characterId: character.id,
      rank: 'member',
    }).returning();

    const newMember = await db.query.guildMembers.findFirst({
      where: eq(guildMembers.id, inserted.id),
      with: { character: { columns: { id: true, name: true } } },
    });

    emitGuildEvent(`guild:${req.params.id}`, 'guild:member-joined', {
      guildId: req.params.id,
      character: newMember?.character,
    });

    return res.status(201).json({ member: newMember });
  } catch (error) {
    if (handleDbError(error, res, 'guild-join', req)) return;
    logRouteError(req, 500, 'Guild join error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/kick - Kick member (officer+ only, can't kick leader)
router.post('/:id/kick', authGuard, characterGuard, validate(memberActionSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

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

    await db.delete(guildMembers).where(eq(guildMembers.id, targetMembership.id));

    emitGuildEvent(`guild:${req.params.id}`, 'guild:member-left', {
      guildId: req.params.id,
      characterId,
    });

    return res.json({ message: 'Member kicked from guild' });
  } catch (error) {
    if (handleDbError(error, res, 'guild-kick', req)) return;
    logRouteError(req, 500, 'Guild kick error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/leave - Leave guild
router.post('/:id/leave', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const membership = await getMembership(req.params.id, character.id);
    if (!membership) return res.status(404).json({ error: 'You are not a member of this guild' });

    if (membership.rank === 'leader') {
      return res.status(400).json({ error: 'Leader cannot leave. Transfer leadership first or disband the guild' });
    }

    await db.delete(guildMembers).where(eq(guildMembers.id, membership.id));

    emitGuildEvent(`guild:${req.params.id}`, 'guild:member-left', {
      guildId: req.params.id,
      characterId: character.id,
    });

    return res.json({ message: 'You have left the guild' });
  } catch (error) {
    if (handleDbError(error, res, 'guild-leave', req)) return;
    logRouteError(req, 500, 'Guild leave error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/promote - Change member rank (leader only)
router.post('/:id/promote', authGuard, characterGuard, validate(promoteSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

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

    await db.update(guildMembers)
      .set({ rank: newRank })
      .where(eq(guildMembers.id, targetMembership.id));

    const updated = await db.query.guildMembers.findFirst({
      where: eq(guildMembers.id, targetMembership.id),
      with: { character: { columns: { id: true, name: true } } },
    });

    return res.json({ member: updated });
  } catch (error) {
    if (handleDbError(error, res, 'guild-promote', req)) return;
    logRouteError(req, 500, 'Guild promote error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/donate - Donate gold to guild treasury
router.post('/:id/donate', authGuard, characterGuard, validate(donateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const membership = await getMembership(req.params.id, character.id);
    if (!membership) return res.status(404).json({ error: 'You are not a member of this guild' });

    const { amount } = req.body;

    if (character.gold < amount) {
      return res.status(400).json({ error: `Insufficient gold. Have ${character.gold}, need ${amount}` });
    }

    const [updatedGuild] = await db.transaction(async (tx) => {
      await tx.update(characters)
        .set({ gold: sql`${characters.gold} - ${amount}` })
        .where(eq(characters.id, character.id));

      return tx.update(guilds)
        .set({ treasury: sql`${guilds.treasury} + ${amount}` })
        .where(eq(guilds.id, req.params.id))
        .returning();
    });

    return res.json({ treasury: updatedGuild.treasury, donated: amount });
  } catch (error) {
    if (handleDbError(error, res, 'guild-donate', req)) return;
    logRouteError(req, 500, 'Guild donate error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/guilds/:id/quests - List guild quests (placeholder)
router.get('/:id/quests', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const guild = await db.query.guilds.findFirst({ where: eq(guilds.id, req.params.id) });
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    return res.json({ quests: [] });
  } catch (error) {
    if (handleDbError(error, res, 'guild-quests', req)) return;
    logRouteError(req, 500, 'Guild quests error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/guilds/:id/transfer - Transfer leadership
router.post('/:id/transfer', authGuard, characterGuard, validate(transferSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const guild = await db.query.guilds.findFirst({ where: eq(guilds.id, req.params.id) });
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

    await db.transaction(async (tx) => {
      // Update guild leader
      await tx.update(guilds)
        .set({ leaderId: characterId })
        .where(eq(guilds.id, guild.id));

      // Promote target to leader rank
      await tx.update(guildMembers)
        .set({ rank: 'leader' })
        .where(eq(guildMembers.id, targetMembership.id));

      // Demote old leader to co-leader
      const oldLeaderMembership = await tx.query.guildMembers.findFirst({
        where: and(eq(guildMembers.guildId, guild.id), eq(guildMembers.characterId, character.id)),
      });
      if (oldLeaderMembership) {
        await tx.update(guildMembers)
          .set({ rank: 'co-leader' })
          .where(eq(guildMembers.id, oldLeaderMembership.id));
      }
    });

    return res.json({ message: 'Leadership transferred successfully' });
  } catch (error) {
    if (handleDbError(error, res, 'guild-transfer', req)) return;
    logRouteError(req, 500, 'Guild transfer error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
