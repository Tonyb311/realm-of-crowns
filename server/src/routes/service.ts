import { Router, Response } from 'express';
import { db } from '../lib/db';
import { eq, and, asc, inArray, sql } from 'drizzle-orm';
import { characters, playerProfessions, serviceActions, dailyActions, serviceReputations } from '@database/tables';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { requireDailyAction } from '../middleware/daily-action';
import { AuthenticatedRequest } from '../types/express';
import { getGameDay, getTodayTickDate } from '../lib/game-day';
import { isSameAccount } from '../lib/alt-guard';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';

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

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    // Validate SERVICE profession category
    if (!SERVICE_PROFESSIONS.includes(professionType)) {
      return res.status(400).json({ error: 'Not a service profession' });
    }

    // Validate character has this service profession
    const profession = await db.query.playerProfessions.findFirst({
      where: and(eq(playerProfessions.characterId, character.id), eq(playerProfessions.professionType, professionType), eq(playerProfessions.isActive, true)),
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
      const client = await db.query.characters.findFirst({ where: eq(characters.id, clientId) });
      if (!client) return res.status(404).json({ error: 'Client not found' });
      if (client.currentTownId !== character.currentTownId) {
        return res.status(400).json({ error: 'Client must be in the same town' });
      }
    }

    // Create ServiceAction
    const [serviceAction] = await db.insert(serviceActions).values({
      id: crypto.randomUUID(),
      providerId: character.id,
      clientId: clientId || null,
      professionType,
      actionType,
      price: price || 0,
      details: details || null,
      gameDay,
    }).returning();

    // Create DailyAction (consume the daily action)
    await db.insert(dailyActions).values({
      id: crypto.randomUUID(),
      characterId: character.id,
      tickDate: getTodayTickDate().toISOString(),
      actionType: 'SERVICE',
      actionTarget: { professionType, actionType, clientId },
      status: 'COMPLETED',
    });

    // Award XP: base 8 + tier bonus
    const professionXp = 8 + (TIER_XP_BONUS[profession.tier] || 0);
    const characterXp = Math.floor(professionXp / 2);

    await db.update(playerProfessions)
      .set({ xp: sql`${playerProfessions.xp} + ${professionXp}` })
      .where(eq(playerProfessions.id, profession.id));
    await db.update(characters)
      .set({ xp: sql`${characters.xp} + ${characterXp}` })
      .where(eq(characters.id, character.id));

    // Update ServiceReputation
    const repIncrement = clientId ? 1 : 0.5;
    const existingRep = await db.query.serviceReputations.findFirst({
      where: and(eq(serviceReputations.characterId, character.id), eq(serviceReputations.professionType, professionType)),
    });

    if (existingRep) {
      await db.update(serviceReputations)
        .set({
          reputation: sql`${serviceReputations.reputation} + ${Math.floor(repIncrement)}`,
          lastActiveDay: gameDay,
        })
        .where(eq(serviceReputations.id, existingRep.id));
    } else {
      await db.insert(serviceReputations).values({
        id: crypto.randomUUID(),
        characterId: character.id,
        professionType,
        reputation: Math.min(100, Math.floor(repIncrement)),
        lastActiveDay: gameDay,
      });
    }

    // Handle gold transfer if clientId and price
    if (clientId && price && price > 0) {
      await db.transaction(async (tx) => {
        await tx.update(characters)
          .set({ gold: sql`${characters.gold} - ${price}` })
          .where(eq(characters.id, clientId));
        await tx.update(characters)
          .set({ gold: sql`${characters.gold} + ${price}` })
          .where(eq(characters.id, character.id));
      });
    }

    return res.json({ serviceAction, professionXpGained: professionXp, characterXpGained: characterXp });
  } catch (error) {
    if (handleDbError(error, res, 'service-perform', req)) return;
    logRouteError(req, 500, 'Service perform error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /reputation — Get character's service reputation
// ---------------------------------------------------------------------------

router.get('/reputation', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await db.query.characters.findFirst({
      where: eq(characters.userId, req.user!.userId),
      orderBy: asc(characters.createdAt),
    });
    if (!character) return res.status(404).json({ error: 'No character found' });

    const reputations = await db.query.serviceReputations.findMany({
      where: eq(serviceReputations.characterId, character.id),
    });
    return res.json({ reputations });
  } catch (error) {
    if (handleDbError(error, res, 'service-reputation', req)) return;
    logRouteError(req, 500, 'Service reputation error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /available — List service providers in the character's current town
// ---------------------------------------------------------------------------

router.get('/available', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await db.query.characters.findFirst({
      where: eq(characters.userId, req.user!.userId),
      orderBy: asc(characters.createdAt),
    });
    if (!character) return res.status(404).json({ error: 'No character found' });

    // Get service providers in the same town using a join
    const providers = await db.query.playerProfessions.findMany({
      where: and(
        inArray(playerProfessions.professionType, [...SERVICE_PROFESSIONS]),
        eq(playerProfessions.isActive, true),
      ),
      with: {
        character: { columns: { id: true, name: true, level: true, currentTownId: true } },
      },
    });

    // Filter to same town in app code (Drizzle doesn't support nested where on relations in findMany)
    const filtered = providers.filter(p => p.character.currentTownId === character.currentTownId);

    return res.json({
      providers: filtered.map(p => ({
        ...p,
        character: { id: p.character.id, name: p.character.name, level: p.character.level },
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'service-available', req)) return;
    logRouteError(req, 500, 'Service available error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
