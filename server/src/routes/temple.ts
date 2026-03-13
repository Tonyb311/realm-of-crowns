import { Router, type Response } from 'express';
import { eq, and, ne, sql, asc, desc, count, gte } from 'drizzle-orm';
import { db } from '../lib/db';
import { gods, churchChapters, characters, towns, elections, electionCandidates, characterActiveEffects, townPolicies } from '@database/tables';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { characterGuard } from '../middleware/character-guard';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { calculateChurchTier, CONVERSION_COOLDOWN_DAYS } from '@shared/data/religion-config';
import { SHRINE_CONSECRATION_COST } from '@shared/data/town-metrics-config';
import crypto from 'crypto';

const router = Router();

// ============================================================
// GET /api/temple/gods — List all gods (public reference data)
// ============================================================

router.get('/gods', async (_req, res: Response) => {
  try {
    const allGods = await db.query.gods.findMany({
      orderBy: asc(gods.sortOrder),
    });
    return res.json({ gods: allGods });
  } catch (error) {
    if (handleDbError(error, res, 'temple-gods', _req)) return;
    logRouteError(_req, 500, 'Temple gods error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/temple/town/:townId — View temple status for a town
// ============================================================

router.get('/town/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId } = req.params;

    // Count total residents (characters with homeTownId in this town)
    const [{ value: totalResidents }] = await db
      .select({ value: count() })
      .from(characters)
      .where(eq(characters.homeTownId, townId));

    // Get all church chapters in this town with god info and high priest
    const chapters = await db.query.churchChapters.findMany({
      where: eq(churchChapters.townId, townId),
      with: {
        god: true,
        highPriest: { columns: { id: true, name: true } },
      },
      orderBy: desc(churchChapters.memberCount),
    });

    // Fetch active HIGH_PRIEST elections for this town
    const activeHPElections = await db.query.elections.findMany({
      where: and(
        eq(elections.townId, townId),
        eq(elections.type, 'HIGH_PRIEST'),
        ne(elections.phase, 'COMPLETED'),
      ),
      with: {
        electionCandidates: { columns: { id: true } },
      },
    });
    const electionByGod = new Map(activeHPElections.map(e => [e.godId, e]));

    const enrichedChapters = chapters.map(ch => {
      const activeElection = electionByGod.get(ch.godId);
      return {
        id: ch.id,
        godId: ch.godId,
        godName: ch.god.name,
        godTitle: ch.god.title,
        godDomain: ch.god.domain,
        godPhilosophy: ch.god.philosophy,
        godIconName: ch.god.iconName,
        godColorHex: ch.god.colorHex,
        churchName: ch.god.churchName,
        memberCount: ch.memberCount,
        percentage: totalResidents > 0 ? Math.round((ch.memberCount / totalResidents) * 100) : 0,
        tier: ch.tier,
        isDominant: ch.isDominant,
        isShrine: ch.isShrine,
        highPriestId: ch.highPriestId ?? null,
        highPriestName: ch.highPriest?.name ?? null,
        treasury: ch.treasury,
        election: activeElection ? {
          id: activeElection.id,
          phase: activeElection.phase,
          candidateCount: activeElection.electionCandidates.length,
          endDate: activeElection.endDate,
        } : null,
      };
    });

    // Find dominant church if any
    const dominant = enrichedChapters.find(ch => ch.isDominant) ?? null;

    return res.json({
      townId,
      totalResidents,
      patronGodId: character.patronGodId,
      chapters: enrichedChapters,
      dominant,
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-town', req)) return;
    logRouteError(req, 500, 'Temple town error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/temple/choose-patron — Choose or change patron god
// ============================================================

router.post('/choose-patron', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { godId } = req.body as { godId: string | null };

    // Validate godId if not null
    if (godId !== null && godId !== undefined) {
      const god = await db.query.gods.findFirst({ where: eq(gods.id, godId) });
      if (!god) {
        return res.status(400).json({ error: 'Unknown god' });
      }
    }

    const oldGodId = character.patronGodId;
    const newGodId = godId ?? null;

    // No change
    if (oldGodId === newGodId) {
      return res.status(400).json({ error: 'You already follow this path' });
    }

    // Cooldown check: only for god-to-god switches (not null→god or god→null)
    if (oldGodId && newGodId) {
      if (character.conversionCooldownUntil) {
        const cooldownEnd = new Date(character.conversionCooldownUntil);
        if (cooldownEnd > new Date()) {
          const daysLeft = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return res.status(400).json({
            error: `You must wait ${daysLeft} more day${daysLeft > 1 ? 's' : ''} before changing your faith`,
            cooldownUntil: character.conversionCooldownUntil,
          });
        }
      }
    }

    const homeTownId = character.homeTownId;
    if (!homeTownId) {
      return res.status(400).json({ error: 'You must have a home town to join a church' });
    }

    await db.transaction(async (tx) => {
      // Decrement old chapter
      if (oldGodId) {
        const oldChapter = await tx.query.churchChapters.findFirst({
          where: and(
            eq(churchChapters.godId, oldGodId),
            eq(churchChapters.townId, homeTownId),
          ),
        });
        if (oldChapter && oldChapter.memberCount > 0) {
          await tx.update(churchChapters)
            .set({ memberCount: sql`${churchChapters.memberCount} - 1` })
            .where(eq(churchChapters.id, oldChapter.id));
        }
      }

      // Increment new chapter (lazy create)
      if (newGodId) {
        const existingChapter = await tx.query.churchChapters.findFirst({
          where: and(
            eq(churchChapters.godId, newGodId),
            eq(churchChapters.townId, homeTownId),
          ),
        });

        if (existingChapter) {
          await tx.update(churchChapters)
            .set({ memberCount: sql`${churchChapters.memberCount} + 1` })
            .where(eq(churchChapters.id, existingChapter.id));
        } else {
          await tx.insert(churchChapters).values({
            id: crypto.randomUUID(),
            godId: newGodId,
            townId: homeTownId,
            memberCount: 1,
            tier: 'MINORITY',
          });
        }
      }

      // Update character
      const updateData: Record<string, unknown> = {
        patronGodId: newGodId,
      };

      // Set cooldown only for god-to-god switches
      if (oldGodId && newGodId) {
        const cooldownDate = new Date();
        cooldownDate.setDate(cooldownDate.getDate() + CONVERSION_COOLDOWN_DAYS);
        updateData.conversionCooldownUntil = cooldownDate.toISOString();
      }

      await tx.update(characters)
        .set(updateData)
        .where(eq(characters.id, character.id));
    });

    // Fetch updated patron god info
    const patronGod = newGodId
      ? await db.query.gods.findFirst({ where: eq(gods.id, newGodId) })
      : null;

    return res.json({
      success: true,
      message: newGodId
        ? `You now follow ${patronGod?.name ?? 'a new god'}`
        : 'You have renounced your faith',
      patronGod,
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-choose-patron', req)) return;
    logRouteError(req, 500, 'Temple choose patron error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/temple/set-tithe — Set tithe rate (0-20%)
// ============================================================

router.post('/set-tithe', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { rate } = req.body as { rate: number };

    // Validate rate
    if (rate == null || !Number.isInteger(rate) || rate < 0 || rate > 20) {
      return res.status(400).json({ error: 'Tithe rate must be an integer between 0 and 20' });
    }

    // Must have a patron god
    if (!character.patronGodId) {
      return res.status(400).json({ error: 'You must follow a god to set a tithe rate' });
    }

    await db.update(characters)
      .set({ titheRate: rate })
      .where(eq(characters.id, character.id));

    return res.json({ success: true, titheRate: rate });
  } catch (error) {
    if (handleDbError(error, res, 'temple-set-tithe', req)) return;
    logRouteError(req, 500, 'Temple set-tithe error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/temple/my-faith — View current character's religion status
// ============================================================

router.get('/my-faith', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const patronGod = character.patronGodId
      ? await db.query.gods.findFirst({ where: eq(gods.id, character.patronGodId) })
      : null;

    // Get home chapter info if has a god and home town
    let homeChapter = null;
    if (character.patronGodId && character.homeTownId) {
      const chapter = await db.query.churchChapters.findFirst({
        where: and(
          eq(churchChapters.godId, character.patronGodId),
          eq(churchChapters.townId, character.homeTownId),
        ),
      });
      if (chapter) {
        const [{ value: totalResidents }] = await db
          .select({ value: count() })
          .from(characters)
          .where(eq(characters.homeTownId, character.homeTownId));

        homeChapter = {
          memberCount: chapter.memberCount,
          tier: chapter.tier,
          isDominant: chapter.isDominant,
          percentage: totalResidents > 0 ? Math.round((chapter.memberCount / totalResidents) * 100) : 0,
          treasury: chapter.treasury,
        };
      }
    }

    // Calculate cooldown remaining
    let cooldownDaysRemaining = 0;
    if (character.conversionCooldownUntil) {
      const cooldownEnd = new Date(character.conversionCooldownUntil);
      if (cooldownEnd > new Date()) {
        cooldownDaysRemaining = Math.ceil((cooldownEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      }
    }

    return res.json({
      patronGod,
      homeChapter,
      cooldownDaysRemaining,
      titheRate: character.titheRate,
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-my-faith', req)) return;
    logRouteError(req, 500, 'Temple my-faith error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/temple/consecrate — Consecrate the Shrine (High Priest only)
// ============================================================

router.post('/consecrate', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId } = req.body as { townId: string };

    if (!townId) {
      return res.status(400).json({ error: 'townId is required' });
    }
    if (!character.patronGodId) {
      return res.status(400).json({ error: 'You must follow a god to consecrate a shrine' });
    }

    // Find the chapter for this god in this town
    const chapter = await db.query.churchChapters.findFirst({
      where: and(
        eq(churchChapters.godId, character.patronGodId),
        eq(churchChapters.townId, townId),
      ),
    });

    if (!chapter) {
      return res.status(400).json({ error: 'No church chapter found for your god in this town' });
    }
    if (chapter.highPriestId !== character.id) {
      return res.status(403).json({ error: 'Only the High Priest can consecrate the shrine' });
    }
    if (!chapter.isDominant) {
      return res.status(400).json({ error: 'Only a dominant church can consecrate a shrine' });
    }
    if (chapter.isShrine) {
      return res.status(400).json({ error: 'The shrine is already consecrated' });
    }
    if (chapter.treasury < SHRINE_CONSECRATION_COST) {
      return res.status(400).json({
        error: `Insufficient treasury (need ${SHRINE_CONSECRATION_COST}g, have ${chapter.treasury}g)`,
      });
    }

    await db.transaction(async (tx) => {
      await tx.update(churchChapters)
        .set({
          treasury: sql`${churchChapters.treasury} - ${SHRINE_CONSECRATION_COST}`,
          isShrine: true,
        })
        .where(eq(churchChapters.id, chapter.id));
    });

    return res.json({
      success: true,
      message: 'The shrine has been consecrated',
      treasuryRemaining: chapter.treasury - SHRINE_CONSECRATION_COST,
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-consecrate', req)) return;
    logRouteError(req, 500, 'Temple consecrate error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/temple/deconsecrate — Remove the Shrine (High Priest only)
// ============================================================

router.post('/deconsecrate', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId } = req.body as { townId: string };

    if (!townId) {
      return res.status(400).json({ error: 'townId is required' });
    }
    if (!character.patronGodId) {
      return res.status(400).json({ error: 'You must follow a god to manage a shrine' });
    }

    const chapter = await db.query.churchChapters.findFirst({
      where: and(
        eq(churchChapters.godId, character.patronGodId),
        eq(churchChapters.townId, townId),
      ),
    });

    if (!chapter) {
      return res.status(400).json({ error: 'No church chapter found for your god in this town' });
    }
    if (chapter.highPriestId !== character.id) {
      return res.status(403).json({ error: 'Only the High Priest can deconsecrate the shrine' });
    }
    if (!chapter.isShrine) {
      return res.status(400).json({ error: 'The shrine is not consecrated' });
    }

    await db.update(churchChapters)
      .set({ isShrine: false })
      .where(eq(churchChapters.id, chapter.id));

    return res.json({
      success: true,
      message: 'The shrine has been deconsecrated',
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-deconsecrate', req)) return;
    logRouteError(req, 500, 'Temple deconsecrate error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/temple/healing-house — Kethara Shrine: Restore HP
// ============================================================

router.post('/healing-house', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    // Must follow Kethara
    if (character.patronGodId !== 'kethara') {
      return res.status(400).json({ error: 'Only followers of Kethara may use the Healing House' });
    }

    // Must be in a town with a Kethara shrine
    const currentTownId = character.currentTownId;
    if (!currentTownId) {
      return res.status(400).json({ error: 'You must be in a town to visit the Healing House' });
    }

    const ketharaShrine = await db.query.churchChapters.findFirst({
      where: and(
        eq(churchChapters.godId, 'kethara'),
        eq(churchChapters.townId, currentTownId),
        eq(churchChapters.isShrine, true),
      ),
    });

    if (!ketharaShrine) {
      return res.status(400).json({ error: 'There is no Kethara shrine in this town' });
    }

    // Check daily usage: look for a marker effect created today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existingMarker = await db.query.characterActiveEffects.findFirst({
      where: and(
        eq(characterActiveEffects.characterId, character.id),
        eq(characterActiveEffects.effectType, 'healing_house_used'),
        gte(characterActiveEffects.createdAt, todayStart.toISOString()),
      ),
    });

    if (existingMarker) {
      return res.status(400).json({ error: 'You have already visited the Healing House today' });
    }

    // Restore HP to full and create daily marker
    const maxHealth = character.maxHealth ?? 100;
    const currentHealth = character.health ?? maxHealth;
    const healed = maxHealth - currentHealth;

    await db.transaction(async (tx) => {
      // Restore health
      if (healed > 0) {
        await tx.update(characters)
          .set({ health: maxHealth })
          .where(eq(characters.id, character.id));
      }

      // Insert daily usage marker (expires in 24h)
      await tx.insert(characterActiveEffects).values({
        id: crypto.randomUUID(),
        characterId: character.id,
        sourceType: 'SCROLL',
        effectType: 'healing_house_used',
        magnitude: 0,
        itemName: 'Healing House',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    });

    return res.json({
      success: true,
      message: healed > 0
        ? `The Healing House restored ${healed} HP`
        : 'You are already at full health, but the visit has been blessed',
      healed,
      health: maxHealth,
      maxHealth,
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-healing-house', req)) return;
    logRouteError(req, 500, 'Temple healing-house error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/temple/set-tariff — Set tariff rate (Vareth HP only)
// ============================================================

router.post('/set-tariff', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId, rate } = req.body as { townId: string; rate: number };

    if (!townId || rate == null) {
      return res.status(400).json({ error: 'townId and rate are required' });
    }
    if (typeof rate !== 'number' || rate < 0.10 || rate > 0.25) {
      return res.status(400).json({ error: 'Tariff rate must be between 0.10 (10%) and 0.25 (25%)' });
    }

    // Must be HP of Vareth in this town with dominant + shrine
    const chapter = await db.query.churchChapters.findFirst({
      where: and(
        eq(churchChapters.godId, 'vareth'),
        eq(churchChapters.townId, townId),
      ),
    });

    if (!chapter) {
      return res.status(400).json({ error: 'No Vareth chapter in this town' });
    }
    if (chapter.highPriestId !== character.id) {
      return res.status(403).json({ error: 'Only the High Priest of Vareth can set tariffs' });
    }
    if (!chapter.isDominant) {
      return res.status(400).json({ error: 'Vareth must be the dominant church to set tariffs' });
    }
    if (!chapter.isShrine) {
      return res.status(400).json({ error: 'The Vareth shrine must be consecrated to set tariffs' });
    }

    // Store in townPolicies.tradePolicy JSONB
    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
    });

    if (policy) {
      const existingTp = (policy.tradePolicy as Record<string, unknown>) ?? {};
      await db.update(townPolicies)
        .set({ tradePolicy: { ...existingTp, varethTariffRate: rate } })
        .where(eq(townPolicies.id, policy.id));
    } else {
      await db.insert(townPolicies).values({
        id: crypto.randomUUID(),
        townId,
        tradePolicy: { varethTariffRate: rate },
      });
    }

    return res.json({
      success: true,
      message: `Tariff rate set to ${Math.round(rate * 100)}%`,
      tariffRate: rate,
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-set-tariff', req)) return;
    logRouteError(req, 500, 'Temple set-tariff error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/temple/tariff/:townId — View current tariff rate
// ============================================================

router.get('/tariff/:townId', async (req, res: Response) => {
  try {
    const { townId } = req.params;

    // Check if Vareth is dominant + shrine in this town
    const chapter = await db.query.churchChapters.findFirst({
      where: and(
        eq(churchChapters.godId, 'vareth'),
        eq(churchChapters.townId, townId),
        eq(churchChapters.isDominant, true),
      ),
    });

    if (!chapter) {
      return res.json({ tariffRate: 0, active: false });
    }

    let tariffRate = 0.10; // default when dominant
    if (chapter.isShrine) {
      const policy = await db.query.townPolicies.findFirst({
        where: eq(townPolicies.townId, townId),
        columns: { tradePolicy: true },
      });
      const tp = policy?.tradePolicy as Record<string, unknown> | null;
      if (typeof tp?.varethTariffRate === 'number') {
        tariffRate = Math.max(0.10, Math.min(0.25, tp.varethTariffRate));
      }
    }

    return res.json({
      tariffRate,
      active: true,
      hasShrine: chapter.isShrine,
    });
  } catch (error) {
    logRouteError(req, 500, 'Temple tariff error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
