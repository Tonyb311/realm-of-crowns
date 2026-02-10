import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { isOnline } from '../socket/presence';
import { getPsionSpec, calculateEmotionalState } from '../services/psion-perks';

const router = Router();

// --- GET /api/characters/:id/profile ---

router.get('/:id/profile', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await prisma.character.findUnique({
      where: { id: req.params.id },
      include: {
        currentTown: { select: { id: true, name: true } },
        guildMemberships: {
          include: {
            guild: { select: { id: true, name: true, tag: true } },
          },
          take: 1,
        },
        professions: {
          select: { professionType: true, tier: true, level: true },
          orderBy: { level: 'desc' },
        },
        playerAchievements: {
          include: { achievement: { select: { name: true, description: true } } },
          orderBy: { unlockedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Count PvP stats
    const [pvpWins, pvpLosses] = await Promise.all([
      prisma.combatSession.count({
        where: {
          type: { in: ['DUEL', 'ARENA'] },
          status: 'completed',
          participants: { some: { characterId: character.id } },
          log: { path: ['winnerId'], equals: character.id },
        },
      }),
      prisma.combatSession.count({
        where: {
          type: { in: ['DUEL', 'ARENA'] },
          status: 'completed',
          participants: { some: { characterId: character.id } },
          NOT: { log: { path: ['winnerId'], equals: character.id } },
        },
      }),
    ]);

    const guild = character.guildMemberships[0]?.guild ?? null;

    // Psion Telepath: Surface Read — show emotional state tag
    const viewingCharacter = await prisma.character.findFirst({ where: { userId: req.user!.userId } });
    let psionInsight: { emotionalState?: string } | undefined;
    if (viewingCharacter && viewingCharacter.id !== character.id) {
      const { isPsion, specialization } = await getPsionSpec(viewingCharacter.id);
      if (isPsion && specialization === 'telepath') {
        const emotionalState = await calculateEmotionalState(character.id);
        psionInsight = { emotionalState };
      }
    }

    return res.json({
      profile: {
        id: character.id,
        name: character.name,
        race: character.race,
        dragonBloodline: character.dragonBloodline,
        beastClan: character.beastClan,
        elementalType: character.elementalType,
        level: character.level,
        currentTown: character.currentTown,
        guild,
        professions: character.professions,
        pvp: { wins: pvpWins, losses: pvpLosses },
        achievements: character.playerAchievements.map((pa) => ({
          name: pa.achievement.name,
          description: pa.achievement.description,
          unlockedAt: pa.unlockedAt,
        })),
        online: isOnline(character.id),
        createdAt: character.createdAt,
        ...(psionInsight ? { psionInsight } : {}),
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /api/characters/search ---

router.get('/search', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string, 10) || 10));

    if (q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const characters = await prisma.character.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        race: true,
        level: true,
        currentTownId: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return res.json({
      results: characters.map((c) => ({
        ...c,
        online: isOnline(c.id),
      })),
    });
  } catch (error) {
    console.error('Character search error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
