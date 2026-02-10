import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authGuard } from '../middleware/auth';
import { requireDailyAction } from '../middleware/daily-action';
import { AuthenticatedRequest } from '../types/express';
import { getGameDay, getTodayTickDate } from '../lib/game-day';
import { isSameAccount } from '../lib/alt-guard';

const router = Router();

const SERVICE_PROFESSIONS = [
  'MERCHANT', 'INNKEEPER', 'HEALER', 'STABLE_MASTER', 'BANKER', 'COURIER', 'MERCENARY_CAPTAIN',
] as const;

const TIER_XP_BONUS: Record<string, number> = {
  APPRENTICE: 0,
  JOURNEYMAN: 0,
  CRAFTSMAN: 2,
  EXPERT: 4,
  MASTER: 6,
  GRANDMASTER: 10,
};

// ---------------------------------------------------------------------------
// POST /perform — Perform a service action (MAJOR daily action)
// ---------------------------------------------------------------------------

router.post('/perform', authGuard, requireDailyAction('SERVICE'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { professionType, actionType, clientId, price, details } = req.body;
    const character = (req as any).character;
    const gameDay = getGameDay();

    // Validate SERVICE profession category
    if (!SERVICE_PROFESSIONS.includes(professionType)) {
      return res.status(400).json({ error: 'Not a service profession' });
    }

    // Validate character has this service profession
    const profession = await prisma.playerProfession.findFirst({
      where: { characterId: character.id, professionType, isActive: true },
    });
    if (!profession) {
      return res.status(400).json({ error: 'You do not have this service profession' });
    }

    // Alt-guard check
    if (clientId) {
      if (await isSameAccount(character.id, clientId)) {
        return res.status(400).json({ error: 'Cannot provide services to your own characters' });
      }
      // Validate client exists and is in same town
      const client = await prisma.character.findUnique({ where: { id: clientId } });
      if (!client) return res.status(404).json({ error: 'Client not found' });
      if (client.currentTownId !== character.currentTownId) {
        return res.status(400).json({ error: 'Client must be in the same town' });
      }
    }

    // Create ServiceAction
    const serviceAction = await prisma.serviceAction.create({
      data: {
        providerId: character.id,
        clientId: clientId || null,
        professionType,
        actionType,
        price: price || 0,
        details: details || null,
        gameDay,
      },
    });

    // Create DailyAction (consume the daily action)
    await prisma.dailyAction.create({
      data: {
        characterId: character.id,
        tickDate: getTodayTickDate(),
        actionType: 'SERVICE',
        actionTarget: { professionType, actionType, clientId },
        status: 'COMPLETED',
      },
    });

    // Award XP: base 8 + tier bonus
    const professionXp = 8 + (TIER_XP_BONUS[profession.tier] || 0);
    const characterXp = Math.floor(professionXp / 2);

    await prisma.playerProfession.update({
      where: { id: profession.id },
      data: { xp: { increment: professionXp } },
    });
    await prisma.character.update({
      where: { id: character.id },
      data: { xp: { increment: characterXp } },
    });

    // Update ServiceReputation
    const repIncrement = clientId ? 1 : 0.5;
    await prisma.serviceReputation.upsert({
      where: { characterId_professionType: { characterId: character.id, professionType } },
      create: { characterId: character.id, professionType, reputation: Math.min(100, Math.floor(repIncrement)), lastActiveDay: gameDay },
      update: { reputation: { increment: Math.floor(repIncrement) }, lastActiveDay: gameDay },
    });

    // Handle gold transfer if clientId and price
    if (clientId && price && price > 0) {
      await prisma.$transaction([
        prisma.character.update({ where: { id: clientId }, data: { gold: { decrement: price } } }),
        prisma.character.update({ where: { id: character.id }, data: { gold: { increment: price } } }),
      ]);
    }

    return res.json({ serviceAction, professionXpGained: professionXp, characterXpGained: characterXp });
  } catch (error) {
    console.error('Service perform error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /reputation — Get character's service reputation
// ---------------------------------------------------------------------------

router.get('/reputation', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await prisma.character.findFirst({ where: { userId: req.user!.userId }, orderBy: { createdAt: 'asc' } });
    if (!character) return res.status(404).json({ error: 'No character found' });

    const reputations = await prisma.serviceReputation.findMany({
      where: { characterId: character.id },
    });
    return res.json({ reputations });
  } catch (error) {
    console.error('Service reputation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /available — List service providers in the character's current town
// ---------------------------------------------------------------------------

router.get('/available', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await prisma.character.findFirst({ where: { userId: req.user!.userId }, orderBy: { createdAt: 'asc' } });
    if (!character) return res.status(404).json({ error: 'No character found' });

    const providers = await prisma.playerProfession.findMany({
      where: {
        professionType: { in: SERVICE_PROFESSIONS as any },
        isActive: true,
        character: { currentTownId: character.currentTownId },
      },
      include: {
        character: { select: { id: true, name: true, level: true } },
      },
    });

    return res.json({ providers });
  } catch (error) {
    console.error('Service available error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
