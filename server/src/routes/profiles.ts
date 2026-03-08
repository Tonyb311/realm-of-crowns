import { Router, Response } from 'express';
import { db } from '../lib/db';
import { eq, and, or, inArray, ne, asc, ilike, sql, count } from 'drizzle-orm';
import { characters, combatSessions, combatParticipants } from '@database/tables';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { isOnline } from '../socket/presence';
import { getPsionSpec, calculateEmotionalState } from '../services/psion-perks';

const router = Router();

// --- GET /api/characters/:id/profile ---

router.get('/:id/profile', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = await db.query.characters.findFirst({
      where: eq(characters.id, req.params.id),
      with: {
        town_currentTownId: { columns: { id: true, name: true } },
        guildMembers: {
          with: {
            guild: { columns: { id: true, name: true, tag: true } },
          },
          limit: 1,
        },
        playerProfessions: {
          columns: { professionType: true, tier: true, level: true },
          orderBy: (pp: any, { desc }: any) => [desc(pp.level)],
        },
        playerAchievements: {
          with: { achievement: { columns: { name: true, description: true } } },
          orderBy: (pa: any, { desc }: any) => [desc(pa.unlockedAt)],
          limit: 5,
        },
      },
    });

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    // Count PvP stats using raw SQL for JSON path filter (Drizzle doesn't natively support JSON path queries)
    const [pvpWinsResult] = await db.select({ total: count() })
      .from(combatSessions)
      .innerJoin(combatParticipants, eq(combatParticipants.sessionId, combatSessions.id))
      .where(and(
        inArray(combatSessions.type, ['DUEL', 'ARENA']),
        eq(combatSessions.status, 'COMPLETED'),
        eq(combatParticipants.characterId, character.id),
        sql`${combatSessions.log}->>'winnerId' = ${character.id}`,
      ));

    const [pvpLossesResult] = await db.select({ total: count() })
      .from(combatSessions)
      .innerJoin(combatParticipants, eq(combatParticipants.sessionId, combatSessions.id))
      .where(and(
        inArray(combatSessions.type, ['DUEL', 'ARENA']),
        eq(combatSessions.status, 'COMPLETED'),
        eq(combatParticipants.characterId, character.id),
        sql`${combatSessions.log}->>'winnerId' != ${character.id}`,
      ));

    const pvpWins = pvpWinsResult.total;
    const pvpLosses = pvpLossesResult.total;

    const guild = character.guildMembers[0]?.guild ?? null;

    // Psion Telepath: Surface Read — show emotional state tag
    const viewingCharacter = await db.query.characters.findFirst({
      where: eq(characters.userId, req.user!.userId),
      orderBy: asc(characters.createdAt),
    });
    let psionInsight: { emotionalState?: string } | undefined;
    if (viewingCharacter && viewingCharacter.id !== character.id) {
      const { isPsion, specialization } = await getPsionSpec(viewingCharacter.id);
      if (isPsion && specialization === 'telepath') {
        const emotionalState = await calculateEmotionalState(character.id);
        psionInsight = { emotionalState };
      }
    }

    const rawStats = typeof character.stats === 'string' ? JSON.parse(character.stats) : (character.stats as Record<string, number> || {});
    return res.json({
      profile: {
        id: character.id,
        name: character.name,
        race: character.race,
        dragonBloodline: character.dragonBloodline,
        beastClan: character.beastClan,
        elementalType: character.elementalType,
        level: character.level,
        experience: character.xp,
        stats: {
          strength: rawStats.str ?? 10,
          dexterity: rawStats.dex ?? 10,
          constitution: rawStats.con ?? 10,
          intelligence: rawStats.int ?? 10,
          wisdom: rawStats.wis ?? 10,
          charisma: rawStats.cha ?? 10,
        },
        currentTown: character.town_currentTownId,
        guildId: guild?.id,
        guildName: guild?.name,
        guildTag: guild?.tag,
        professions: character.playerProfessions.map(p => p.professionType),
        pvp: { wins: pvpWins, losses: pvpLosses },
        achievements: character.playerAchievements.map((pa) => ({
          name: pa.achievement.name,
          description: pa.achievement.description,
          unlockedAt: pa.unlockedAt,
        })),
        isOnline: isOnline(character.id),
        createdAt: character.createdAt,
        ...(psionInsight ? { psionInsight } : {}),
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'get profile', req)) return;
    logRouteError(req, 500, 'Get profile error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /api/characters/search ---

router.get('/search', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string, 10) || 10));

    if (q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const characterRows = await db.select({
      id: characters.id,
      name: characters.name,
      race: characters.race,
      level: characters.level,
      currentTownId: characters.currentTownId,
    }).from(characters)
      .where(ilike(characters.name, `%${q}%`))
      .limit(limit)
      .orderBy(asc(characters.name));

    return res.json({
      results: characterRows.map((c) => ({
        ...c,
        online: isOnline(c.id),
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'character search', req)) return;
    logRouteError(req, 500, 'Character search error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
