import { Router, type Response } from 'express';
import { eq, and, ne, sql, asc, desc, count, gte, gt, lte, inArray } from 'drizzle-orm';
import { db } from '../lib/db';
import { gods, churchChapters, characters, towns, elections, electionCandidates, characterActiveEffects, townPolicies, townTreasuries, priceHistories, itemTemplates, travelRoutes, racialReputations, disputes, referendums, referendumVotes, townHistoryLog } from '@database/tables';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { characterGuard } from '../middleware/character-guard';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { calculateChurchTier, CONVERSION_COOLDOWN_DAYS } from '@shared/data/religion-config';
import { SHRINE_CONSECRATION_COST } from '@shared/data/town-metrics-config';
import { emitGovernanceEvent, getIO } from '../socket/events';
import { getReputationTier } from '@shared/data/reputation-config';
import { isTownUnderMartialLaw } from '../services/religion-buffs';
import { logTownEvent } from '../services/history-logger';
import crypto from 'crypto';

const POLICY_BYPASS_COOLDOWN_DAYS = 30;
const SUMMIT_COOLDOWN_DAYS = 30;
const SUMMIT_DURATION_DAYS = 7;
const SUMMIT_COST = 200;
const REFERENDUM_COOLDOWN_DAYS = 30;
const REFERENDUM_DURATION_DAYS = 3;
const MAX_OPEN_DISPUTES = 3;
const MARTIAL_LAW_COOLDOWN_DAYS = 30;
const MARTIAL_LAW_DURATION_DAYS = 7;
const MARTIAL_LAW_COST = 300;
const BLOOD_MEMORY_DURATION_HOURS = 24;
const BLOOD_MEMORY_COOLDOWN_DAYS = 7;
const RECKONING_COOLDOWN_DAYS = 30;
const RECKONING_COST = 100;
const RECKONING_DURATION_DAYS = 3;

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
        // Valtheris CHAPTER+ members get reduced cooldown (5 days vs 7)
        let cooldownDays = CONVERSION_COOLDOWN_DAYS;
        if (oldGodId === 'valtheris') {
          const valChapter = await tx.query.churchChapters.findFirst({
            where: and(
              eq(churchChapters.godId, 'valtheris'),
              eq(churchChapters.townId, homeTownId),
            ),
            columns: { tier: true },
          });
          if (valChapter && valChapter.tier !== 'MINORITY') {
            cooldownDays = 5;
          }
        }
        const cooldownDate = new Date();
        cooldownDate.setDate(cooldownDate.getDate() + cooldownDays);
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

    // Fire-and-forget historical logging
    logTownEvent(townId, 'BUILDING', `Temple Shrine Consecrated to ${character.patronGodId}`, `${character.name} consecrated a shrine for ${SHRINE_CONSECRATION_COST}g.`, character.id).catch(() => {});

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

// ============================================================
// POST /api/temple/propose-economic-policy — Veradine Shrine: Bypass law process
// ============================================================

router.post('/propose-economic-policy', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId, policyType, policyValue } = req.body as {
      townId: string;
      policyType: 'tax_rate' | 'building_permits' | 'trade_policy';
      policyValue: unknown;
    };

    if (!townId || !policyType) {
      return res.status(400).json({ error: 'townId and policyType are required' });
    }

    // Must be HP of Veradine dominant chapter with shrine
    const chapter = await db.query.churchChapters.findFirst({
      where: and(
        eq(churchChapters.godId, 'veradine'),
        eq(churchChapters.townId, townId),
      ),
    });

    if (!chapter) {
      return res.status(400).json({ error: 'No Veradine chapter in this town' });
    }
    if (chapter.highPriestId !== character.id) {
      return res.status(403).json({ error: 'Only the High Priest of Veradine can propose economic policies' });
    }
    if (!chapter.isDominant) {
      return res.status(400).json({ error: 'Veradine must be the dominant church' });
    }
    if (!chapter.isShrine) {
      return res.status(400).json({ error: 'The Veradine shrine must be consecrated' });
    }

    // Check 30-day cooldown
    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
    });
    const tradeP = (policy?.tradePolicy as Record<string, unknown>) ?? {};
    const lastBypass = tradeP.veradinePolicyBypassAt as string | undefined;
    if (lastBypass) {
      const daysSince = Math.floor((Date.now() - new Date(lastBypass).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince < POLICY_BYPASS_COOLDOWN_DAYS) {
        const daysLeft = POLICY_BYPASS_COOLDOWN_DAYS - daysSince;
        return res.status(400).json({
          error: `Economic policy bypass was used recently. ${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining.`,
          cooldownDaysLeft: daysLeft,
        });
      }
    }

    // Validate and apply based on policy type
    let description = '';

    if (policyType === 'tax_rate') {
      const rate = Number(policyValue);
      if (isNaN(rate) || rate < 0.05 || rate > 0.25) {
        return res.status(400).json({ error: 'Tax rate must be between 0.05 (5%) and 0.25 (25%)' });
      }

      // Apply tax rate (mirrors governance.ts set-tax logic)
      if (policy) {
        await db.update(townPolicies).set({ taxRate: rate }).where(eq(townPolicies.townId, townId));
      } else {
        await db.insert(townPolicies).values({ id: crypto.randomUUID(), townId, taxRate: rate });
      }

      // Sync to town treasury
      const existingTreasury = await db.query.townTreasuries.findFirst({
        where: eq(townTreasuries.townId, townId),
      });
      if (existingTreasury) {
        await db.update(townTreasuries).set({ taxRate: rate }).where(eq(townTreasuries.townId, townId));
      } else {
        await db.insert(townTreasuries).values({ id: crypto.randomUUID(), townId, taxRate: rate });
      }

      description = `Set tax rate to ${Math.round(rate * 100)}%`;
      emitGovernanceEvent('governance:tax-changed', `town:${townId}`, {
        townId,
        taxRate: rate,
        setBy: `${character.name} (Veradine High Priest)`,
      });
    } else if (policyType === 'trade_policy') {
      const tradeChanges = policyValue as Record<string, unknown> | null;
      if (!tradeChanges || typeof tradeChanges !== 'object') {
        return res.status(400).json({ error: 'trade_policy requires an object value' });
      }
      // Merge into existing tradePolicy
      const existingTp = (policy?.tradePolicy as Record<string, unknown>) ?? {};
      const merged = { ...existingTp, ...tradeChanges };
      if (policy) {
        await db.update(townPolicies).set({ tradePolicy: merged }).where(eq(townPolicies.townId, townId));
      } else {
        await db.insert(townPolicies).values({ id: crypto.randomUUID(), townId, tradePolicy: merged });
      }
      description = 'Modified trade policy';
    } else {
      return res.status(400).json({ error: `Unknown policy type: ${policyType}` });
    }

    // Record the bypass in tradePolicy JSONB (cooldown + log)
    const refreshedPolicy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
    });
    const currentTp = (refreshedPolicy?.tradePolicy as Record<string, unknown>) ?? {};
    const policyLog = (currentTp.veradinePolicyLog as Array<Record<string, unknown>>) ?? [];
    policyLog.push({
      type: policyType,
      value: policyValue,
      by: character.name,
      characterId: character.id,
      at: new Date().toISOString(),
      description,
    });
    // Keep last 20 entries
    const trimmedLog = policyLog.slice(-20);

    await db.update(townPolicies)
      .set({
        tradePolicy: {
          ...currentTp,
          veradinePolicyBypassAt: new Date().toISOString(),
          veradinePolicyLog: trimmedLog,
        },
      })
      .where(eq(townPolicies.townId, townId));

    // Fire-and-forget historical logging
    logTownEvent(townId, 'LAW', `Economic Policy Enacted by ${character.name}`, description, character.id).catch(() => {});

    return res.json({
      success: true,
      message: `Economic policy enacted: ${description}`,
      description,
      cooldownDays: POLICY_BYPASS_COOLDOWN_DAYS,
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-economic-policy', req)) return;
    logRouteError(req, 500, 'Temple economic policy error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/temple/economic-policy-status/:townId — Check policy bypass cooldown
// ============================================================

router.get('/economic-policy-status/:townId', async (req, res: Response) => {
  try {
    const { townId } = req.params;

    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
      columns: { tradePolicy: true },
    });
    const tp = policy?.tradePolicy as Record<string, unknown> | null;
    const lastBypass = tp?.veradinePolicyBypassAt as string | undefined;

    let available = true;
    let cooldownDaysLeft = 0;
    let lastUsed: string | null = null;

    if (lastBypass) {
      const daysSince = Math.floor((Date.now() - new Date(lastBypass).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince < POLICY_BYPASS_COOLDOWN_DAYS) {
        available = false;
        cooldownDaysLeft = POLICY_BYPASS_COOLDOWN_DAYS - daysSince;
      }
      lastUsed = lastBypass;
    }

    const recentLog = ((tp?.veradinePolicyLog as Array<Record<string, unknown>>) ?? []).slice(-5);

    return res.json({ available, cooldownDaysLeft, lastUsed, recentLog });
  } catch (error) {
    logRouteError(req, 500, 'Temple economic policy status error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/temple/price-trends/:townId — Tessivane CHAPTER+ price trends
// ============================================================

router.get('/price-trends/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId } = req.params;

    // Must be Tessivane member at CHAPTER+ tier
    if (character.patronGodId !== 'tessivane') {
      return res.status(403).json({ error: 'Only followers of Tessivane can view price trends' });
    }
    const chapter = await db.query.churchChapters.findFirst({
      where: and(eq(churchChapters.godId, 'tessivane'), eq(churchChapters.townId, character.homeTownId ?? '')),
      columns: { tier: true },
    });
    const tier = chapter?.tier ?? 'MINORITY';
    if (tier === 'MINORITY') {
      return res.status(403).json({ error: 'Price trends require CHAPTER tier or higher' });
    }

    // Query last 7 days of price history for this town
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];

    const history = await db.query.priceHistories.findMany({
      where: and(
        eq(priceHistories.townId, townId),
        gte(priceHistories.date, cutoffDate),
      ),
      with: {
        itemTemplate: { columns: { id: true, name: true } },
      },
      orderBy: [asc(priceHistories.itemTemplateId), asc(priceHistories.date)],
    });

    // Group by itemTemplateId
    const byItem = new Map<string, Array<{ date: string; avgPrice: number; volume: number }>>();
    const itemNames = new Map<string, string>();
    for (const row of history) {
      const key = row.itemTemplateId;
      if (!byItem.has(key)) byItem.set(key, []);
      byItem.get(key)!.push({ date: row.date, avgPrice: row.avgPrice, volume: row.volume });
      if (row.itemTemplate) itemNames.set(key, row.itemTemplate.name);
    }

    // Calculate trends: avg last 3 days vs avg previous 4 days
    const today = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(today.getDate() - 3);
    const threeDayStr = threeDaysAgo.toISOString().split('T')[0];

    const items: Array<{
      templateId: string;
      itemName: string;
      currentAvgPrice: number;
      previousAvgPrice: number;
      trend: 'RISING' | 'FALLING' | 'STABLE';
      percentChange: number;
      recentVolume: number;
    }> = [];

    for (const [templateId, entries] of byItem) {
      // Need at least 3 data points in the 7-day window
      if (entries.length < 3) continue;

      const recent = entries.filter(e => e.date >= threeDayStr);
      const previous = entries.filter(e => e.date < threeDayStr);

      if (recent.length === 0 || previous.length === 0) continue;

      const recentAvg = recent.reduce((s, e) => s + e.avgPrice * e.volume, 0) /
        recent.reduce((s, e) => s + e.volume, 0);
      const prevAvg = previous.reduce((s, e) => s + e.avgPrice * e.volume, 0) /
        previous.reduce((s, e) => s + e.volume, 0);

      const pctChange = prevAvg > 0 ? ((recentAvg - prevAvg) / prevAvg) * 100 : 0;
      let trend: 'RISING' | 'FALLING' | 'STABLE' = 'STABLE';
      if (pctChange >= 10) trend = 'RISING';
      else if (pctChange <= -10) trend = 'FALLING';

      items.push({
        templateId,
        itemName: itemNames.get(templateId) ?? templateId,
        currentAvgPrice: Math.round(recentAvg),
        previousAvgPrice: Math.round(prevAvg),
        trend,
        percentChange: Math.round(pctChange),
        recentVolume: recent.reduce((s, e) => s + e.volume, 0),
      });
    }

    // Sort by volume descending (most traded first)
    items.sort((a, b) => b.recentVolume - a.recentVolume);

    return res.json({ townId, items });
  } catch (error) {
    if (handleDbError(error, res, 'temple-price-trends', req)) return;
    logRouteError(req, 500, 'Temple price trends error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/temple/cross-town-prices — Tessivane ESTABLISHED+ cross-town visibility
// ============================================================

router.get('/cross-town-prices', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    // Must be Tessivane member at ESTABLISHED+ tier
    if (character.patronGodId !== 'tessivane') {
      return res.status(403).json({ error: 'Only followers of Tessivane can view cross-town prices' });
    }
    const chapter = await db.query.churchChapters.findFirst({
      where: and(eq(churchChapters.godId, 'tessivane'), eq(churchChapters.townId, character.homeTownId ?? '')),
      columns: { tier: true },
    });
    const tier = chapter?.tier ?? 'MINORITY';
    if (tier === 'MINORITY' || tier === 'CHAPTER') {
      return res.status(403).json({ error: 'Cross-town price visibility requires ESTABLISHED tier or higher' });
    }

    // Query last 3 days of price history across all towns
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoffDate = threeDaysAgo.toISOString().split('T')[0];

    const history = await db.query.priceHistories.findMany({
      where: gte(priceHistories.date, cutoffDate),
      with: {
        itemTemplate: { columns: { id: true, name: true } },
      },
    });

    // Get town names
    const townIds = [...new Set(history.map(h => h.townId))];
    const townRows = townIds.length > 0
      ? await db.query.towns.findMany({
          where: inArray(towns.id, townIds),
          columns: { id: true, name: true },
        })
      : [];
    const townNameMap = new Map(townRows.map(t => [t.id, t.name]));

    // Group by itemTemplateId → townId → aggregate
    const byItem = new Map<string, Map<string, { totalPrice: number; totalVolume: number }>>();
    const itemNames = new Map<string, string>();

    for (const row of history) {
      if (!byItem.has(row.itemTemplateId)) byItem.set(row.itemTemplateId, new Map());
      const townMap = byItem.get(row.itemTemplateId)!;
      const existing = townMap.get(row.townId) ?? { totalPrice: 0, totalVolume: 0 };
      existing.totalPrice += row.avgPrice * row.volume;
      existing.totalVolume += row.volume;
      townMap.set(row.townId, existing);
      if (row.itemTemplate) itemNames.set(row.itemTemplateId, row.itemTemplate.name);
    }

    // Only include items traded in 2+ towns
    const items: Array<{
      templateId: string;
      itemName: string;
      prices: Array<{ townId: string; townName: string; avgPrice: number }>;
    }> = [];

    for (const [templateId, townMap] of byItem) {
      if (townMap.size < 2) continue;
      const prices = [...townMap.entries()].map(([tId, data]) => ({
        townId: tId,
        townName: townNameMap.get(tId) ?? tId,
        avgPrice: Math.round(data.totalPrice / data.totalVolume),
      }));
      prices.sort((a, b) => a.avgPrice - b.avgPrice);
      items.push({
        templateId,
        itemName: itemNames.get(templateId) ?? templateId,
        prices,
      });
    }

    items.sort((a, b) => a.itemName.localeCompare(b.itemName));

    return res.json({ items });
  } catch (error) {
    if (handleDbError(error, res, 'temple-cross-town-prices', req)) return;
    logRouteError(req, 500, 'Temple cross-town prices error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/temple/reputation — View character's racial reputations
// ============================================================

router.get('/reputation', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const reps = await db.query.racialReputations.findMany({
      where: eq(racialReputations.characterId, character.id),
    });

    const reputations = reps
      .filter(r => r.score !== 0)
      .map(r => {
        const tier = getReputationTier(r.score);
        return {
          race: r.race,
          score: Math.round(r.score * 10) / 10,
          tier: tier.id,
          tierLabel: tier.label,
          tierColor: tier.color,
          updatedAt: r.updatedAt,
        };
      })
      .sort((a, b) => b.score - a.score);

    return res.json({ reputations });
  } catch (error) {
    if (handleDbError(error, res, 'temple-reputation', req)) return;
    logRouteError(req, 500, 'Temple reputation error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// POST /api/temple/diplomatic-summit — Host Diplomatic Summit (Valtheris HP only)
// ============================================================

router.post('/diplomatic-summit', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId } = req.body as { townId: string };

    if (!townId) {
      return res.status(400).json({ error: 'townId is required' });
    }

    // Must be HP of dominant Valtheris chapter with shrine
    const chapter = await db.query.churchChapters.findFirst({
      where: and(
        eq(churchChapters.godId, 'valtheris'),
        eq(churchChapters.townId, townId),
      ),
    });

    if (!chapter) {
      return res.status(400).json({ error: 'No Valtheris chapter in this town' });
    }
    if (chapter.highPriestId !== character.id) {
      return res.status(403).json({ error: 'Only the High Priest of Valtheris can host diplomatic summits' });
    }
    if (!chapter.isDominant) {
      return res.status(400).json({ error: 'Valtheris must be the dominant church' });
    }
    if (!chapter.isShrine) {
      return res.status(400).json({ error: 'The Valtheris shrine must be consecrated' });
    }

    // Check treasury
    if ((chapter.treasury ?? 0) < SUMMIT_COST) {
      return res.status(400).json({
        error: `Insufficient church treasury. Need ${SUMMIT_COST}g, have ${chapter.treasury ?? 0}g.`,
      });
    }

    // Check 30-day cooldown
    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
    });
    const tradeP = (policy?.tradePolicy as Record<string, unknown>) ?? {};
    const lastSummit = tradeP.valtherisSummitAt as string | undefined;
    if (lastSummit) {
      const daysSince = Math.floor((Date.now() - new Date(lastSummit).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince < SUMMIT_COOLDOWN_DAYS) {
        const daysLeft = SUMMIT_COOLDOWN_DAYS - daysSince;
        return res.status(400).json({
          error: `A diplomatic summit was held recently. ${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining.`,
          cooldownDaysLeft: daysLeft,
        });
      }
    }

    // Get adjacent towns (1 hop via travel routes)
    const routes = await db.query.travelRoutes.findMany({
      where: eq(travelRoutes.fromTownId, townId),
      columns: { toTownId: true },
    });
    const reverseRoutes = await db.query.travelRoutes.findMany({
      where: eq(travelRoutes.toTownId, townId),
      columns: { fromTownId: true },
    });
    const adjacentTownIds = [...new Set([
      ...routes.map(r => r.toTownId),
      ...reverseRoutes.map(r => r.fromTownId),
    ])];

    const summitUntil = new Date();
    summitUntil.setDate(summitUntil.getDate() + SUMMIT_DURATION_DAYS);
    const summitUntilStr = summitUntil.toISOString();
    const summitData = {
      valtherisSummitAt: new Date().toISOString(),
      valtherisSummitUntil: summitUntilStr,
      valtherisSummitStartedBy: character.id,
    };

    await db.transaction(async (tx) => {
      // Deduct from treasury
      await tx.update(churchChapters)
        .set({ treasury: sql`${churchChapters.treasury} - ${SUMMIT_COST}` })
        .where(eq(churchChapters.id, chapter.id));

      // Update host town's tradePolicy
      const allAffectedTowns = [townId, ...adjacentTownIds];
      for (const tid of allAffectedTowns) {
        const existingPolicy = await tx.query.townPolicies.findFirst({
          where: eq(townPolicies.townId, tid),
        });

        if (existingPolicy) {
          const existing = (existingPolicy.tradePolicy as Record<string, unknown>) ?? {};
          await tx.update(townPolicies)
            .set({ tradePolicy: { ...existing, ...summitData } })
            .where(eq(townPolicies.townId, tid));
        } else {
          await tx.insert(townPolicies).values({
            id: crypto.randomUUID(),
            townId: tid,
            tradePolicy: summitData,
          });
        }
      }
    });

    // Get town names for response
    const affectedTowns = await db.query.towns.findMany({
      where: inArray(towns.id, [townId, ...adjacentTownIds]),
      columns: { id: true, name: true },
    });

    // Fire-and-forget historical logging
    logTownEvent(townId, 'SUMMIT', `Diplomatic Summit Hosted by ${character.name}`, `Reputation gains boosted for ${SUMMIT_DURATION_DAYS} days across ${affectedTowns.length} towns.`, character.id).catch(() => {});

    return res.json({
      success: true,
      message: `Diplomatic Summit hosted! Reputation gains boosted for ${SUMMIT_DURATION_DAYS} days.`,
      summitEndsAt: summitUntilStr,
      cost: SUMMIT_COST,
      affectedTowns: affectedTowns.map(t => ({ id: t.id, name: t.name })),
      cooldownDays: SUMMIT_COOLDOWN_DAYS,
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-diplomatic-summit', req)) return;
    logRouteError(req, 500, 'Temple diplomatic summit error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// GET /api/temple/summit-status/:townId — Check if summit is active
// ============================================================

router.get('/summit-status/:townId', async (req, res: Response) => {
  try {
    const { townId } = req.params;

    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
      columns: { tradePolicy: true },
    });

    const tp = (policy?.tradePolicy as Record<string, unknown>) ?? {};
    const summitUntil = tp.valtherisSummitUntil as string | undefined;
    const startedBy = tp.valtherisSummitStartedBy as string | undefined;

    const active = !!summitUntil && new Date(summitUntil).getTime() > Date.now();

    let startedByName: string | null = null;
    if (active && startedBy) {
      const starter = await db.query.characters.findFirst({
        where: eq(characters.id, startedBy),
        columns: { name: true },
      });
      startedByName = starter?.name ?? null;
    }

    return res.json({
      active,
      endsAt: active ? summitUntil : null,
      startedBy: active ? startedByName : null,
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-summit-status', req)) return;
    logRouteError(req, 500, 'Temple summit status error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// DISPUTE ENDPOINTS (Solimene — formal dispute resolution)
// ============================================================

// POST /api/temple/file-dispute — File a formal dispute (Solimene ESTABLISHED+)
router.post('/file-dispute', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId, targetId, title, description } = req.body;

    if (!townId || !title || !description) {
      return res.status(400).json({ error: 'townId, title, and description are required' });
    }

    // Must be Solimene member at ESTABLISHED+
    const chapter = await db.query.churchChapters.findFirst({
      where: and(eq(churchChapters.townId, townId), eq(churchChapters.godId, 'solimene')),
    });
    if (!chapter) {
      return res.status(400).json({ error: 'No Solimene chapter in this town' });
    }

    // Check character is Solimene follower
    if (character.patronGodId !== 'solimene') {
      return res.status(403).json({ error: 'Must be a follower of Solimene' });
    }

    if (chapter.tier !== 'ESTABLISHED' && chapter.tier !== 'DOMINANT') {
      return res.status(403).json({ error: 'Solimene chapter must be at ESTABLISHED or DOMINANT tier' });
    }

    // Check max open disputes per character
    const openDisputeCount = await db.select({ count: count() })
      .from(disputes)
      .where(and(
        eq(disputes.filerId, character.id),
        ne(disputes.status, 'DISMISSED'),
        ne(disputes.status, 'RESOLVED'),
      ));

    if (openDisputeCount[0].count >= MAX_OPEN_DISPUTES) {
      return res.status(400).json({ error: `Maximum ${MAX_OPEN_DISPUTES} open disputes per character` });
    }

    const disputeId = crypto.randomUUID();
    await db.insert(disputes).values({
      id: disputeId,
      townId,
      filerId: character.id,
      targetId: targetId || null,
      title,
      description,
      status: 'OPEN',
    });

    return res.json({ disputeId, message: 'Dispute filed successfully' });
  } catch (error) {
    if (handleDbError(error, res, 'temple-file-dispute', req)) return;
    logRouteError(req, 500, 'Temple file dispute error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/temple/disputes/:townId — View disputes in town (public)
router.get('/disputes/:townId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const townDisputes = await db.query.disputes.findMany({
      where: and(
        eq(disputes.townId, townId),
        ne(disputes.status, 'DISMISSED'),
      ),
      orderBy: desc(disputes.createdAt),
      with: {
        filer: { columns: { id: true, name: true } },
        target: { columns: { id: true, name: true } },
        arbiter: { columns: { id: true, name: true } },
      },
    });

    return res.json(townDisputes);
  } catch (error) {
    if (handleDbError(error, res, 'temple-disputes', req)) return;
    logRouteError(req, 500, 'Temple disputes error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/temple/arbitrate-dispute — Resolve a dispute (Solimene HP only)
router.post('/arbitrate-dispute', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { disputeId, resolution } = req.body;

    if (!disputeId || !resolution) {
      return res.status(400).json({ error: 'disputeId and resolution are required' });
    }

    // Look up the dispute
    const dispute = await db.query.disputes.findFirst({
      where: eq(disputes.id, disputeId),
    });
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }
    if (dispute.status === 'RESOLVED' || dispute.status === 'DISMISSED') {
      return res.status(400).json({ error: 'Dispute already resolved or dismissed' });
    }

    // Must be HP of Solimene in this town
    const chapter = await db.query.churchChapters.findFirst({
      where: and(eq(churchChapters.townId, dispute.townId), eq(churchChapters.godId, 'solimene')),
    });
    if (!chapter || chapter.highPriestId !== character.id) {
      return res.status(403).json({ error: 'Must be the High Priest of Solimene in this town' });
    }

    const now = new Date().toISOString();
    await db.update(disputes).set({
      status: 'RESOLVED',
      resolution,
      arbiterId: character.id,
      resolvedAt: now,
    }).where(eq(disputes.id, disputeId));

    return res.json({ message: 'Dispute resolved', disputeId });
  } catch (error) {
    if (handleDbError(error, res, 'temple-arbitrate-dispute', req)) return;
    logRouteError(req, 500, 'Temple arbitrate dispute error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/temple/dismiss-dispute — Dismiss a dispute (Solimene HP only)
router.post('/dismiss-dispute', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { disputeId } = req.body;

    if (!disputeId) {
      return res.status(400).json({ error: 'disputeId is required' });
    }

    const dispute = await db.query.disputes.findFirst({
      where: eq(disputes.id, disputeId),
    });
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }
    if (dispute.status === 'RESOLVED' || dispute.status === 'DISMISSED') {
      return res.status(400).json({ error: 'Dispute already resolved or dismissed' });
    }

    // Must be HP of Solimene in this town
    const chapter = await db.query.churchChapters.findFirst({
      where: and(eq(churchChapters.townId, dispute.townId), eq(churchChapters.godId, 'solimene')),
    });
    if (!chapter || chapter.highPriestId !== character.id) {
      return res.status(403).json({ error: 'Must be the High Priest of Solimene in this town' });
    }

    const now = new Date().toISOString();
    await db.update(disputes).set({
      status: 'DISMISSED',
      resolvedAt: now,
    }).where(eq(disputes.id, disputeId));

    return res.json({ message: 'Dispute dismissed', disputeId });
  } catch (error) {
    if (handleDbError(error, res, 'temple-dismiss-dispute', req)) return;
    logRouteError(req, 500, 'Temple dismiss dispute error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// REFERENDUM ENDPOINTS (Solimene — binding town-wide votes)
// ============================================================

// POST /api/temple/propose-referendum — Propose a binding referendum (Solimene HP with Shrine)
router.post('/propose-referendum', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId, question, policyType, policyValue } = req.body;

    if (!townId || !question || !policyType || policyValue === undefined) {
      return res.status(400).json({ error: 'townId, question, policyType, and policyValue are required' });
    }

    // Validate policy type
    const validPolicyTypes = ['tax_rate', 'building_permits', 'trade_policy'];
    if (!validPolicyTypes.includes(policyType)) {
      return res.status(400).json({ error: `Invalid policy type. Must be one of: ${validPolicyTypes.join(', ')}` });
    }

    // Validate tax rate range
    if (policyType === 'tax_rate') {
      const taxRate = typeof policyValue === 'object' ? policyValue.taxRate : policyValue;
      if (typeof taxRate !== 'number' || taxRate < 0.05 || taxRate > 0.25) {
        return res.status(400).json({ error: 'Tax rate must be between 0.05 and 0.25' });
      }
    }

    // Must be HP of dominant Solimene chapter with shrine
    const chapter = await db.query.churchChapters.findFirst({
      where: and(eq(churchChapters.townId, townId), eq(churchChapters.godId, 'solimene')),
    });
    if (!chapter || chapter.highPriestId !== character.id) {
      return res.status(403).json({ error: 'Must be the High Priest of Solimene in this town' });
    }

    if (chapter.tier !== 'DOMINANT') {
      return res.status(403).json({ error: 'Solimene chapter must be at DOMINANT tier' });
    }

    if (!chapter.isShrine) {
      return res.status(403).json({ error: 'Solimene shrine must be active' });
    }

    // Check cooldown (30 days) — stored in townPolicies.tradePolicy JSONB
    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
    });
    if (policy?.tradePolicy) {
      const tp = policy.tradePolicy as Record<string, any>;
      if (tp.solimenReferendumAt) {
        const lastReferendum = new Date(tp.solimenReferendumAt);
        const cooldownEnd = new Date(lastReferendum.getTime() + REFERENDUM_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
        if (new Date() < cooldownEnd) {
          return res.status(400).json({
            error: `Referendum cooldown active until ${cooldownEnd.toISOString().split('T')[0]}`,
            cooldownEndsAt: cooldownEnd.toISOString(),
          });
        }
      }
    }

    // Check martial law
    if (await isTownUnderMartialLaw(townId)) {
      return res.status(400).json({ error: 'Cannot propose referendums during martial law' });
    }

    // Check no active referendum in this town
    const activeRef = await db.query.referendums.findFirst({
      where: and(eq(referendums.townId, townId), eq(referendums.status, 'VOTING')),
    });
    if (activeRef) {
      return res.status(400).json({ error: 'A referendum is already active in this town' });
    }

    const now = new Date();
    const endsAt = new Date(now.getTime() + REFERENDUM_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const referendumId = crypto.randomUUID();
    await db.insert(referendums).values({
      id: referendumId,
      townId,
      proposedById: character.id,
      question,
      policyType,
      policyValue: typeof policyValue === 'object' ? policyValue : { value: policyValue },
      status: 'VOTING',
      votesFor: 0,
      votesAgainst: 0,
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
    });

    // Update cooldown in townPolicies tradePolicy JSONB
    const existingPolicy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
    });
    if (existingPolicy) {
      const existingTp = (existingPolicy.tradePolicy as Record<string, any>) || {};
      await db.update(townPolicies).set({
        tradePolicy: { ...existingTp, solimenReferendumAt: now.toISOString() },
      }).where(eq(townPolicies.townId, townId));
    }

    return res.json({ referendumId, endsAt: endsAt.toISOString(), message: 'Referendum proposed successfully' });
  } catch (error) {
    if (handleDbError(error, res, 'temple-propose-referendum', req)) return;
    logRouteError(req, 500, 'Temple propose referendum error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/temple/vote-referendum — Vote on an active referendum (town resident)
router.post('/vote-referendum', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { referendumId, vote } = req.body;

    if (!referendumId || typeof vote !== 'boolean') {
      return res.status(400).json({ error: 'referendumId and vote (boolean) are required' });
    }

    const referendum = await db.query.referendums.findFirst({
      where: eq(referendums.id, referendumId),
    });
    if (!referendum) {
      return res.status(404).json({ error: 'Referendum not found' });
    }
    if (referendum.status !== 'VOTING') {
      return res.status(400).json({ error: 'Referendum is no longer active' });
    }

    // Must be a resident (homeTownId)
    if (character.homeTownId !== referendum.townId) {
      return res.status(403).json({ error: 'Must be a resident of this town to vote' });
    }

    // One vote per character per referendum (unique constraint handles race condition)
    const voteId = crypto.randomUUID();
    try {
      await db.insert(referendumVotes).values({
        id: voteId,
        referendumId,
        characterId: character.id,
        vote,
      });
    } catch (err: any) {
      if (err?.code === '23505' || err?.constraint?.includes('referendum_votes_referendum_id_character_id_key')) {
        return res.status(400).json({ error: 'You have already voted on this referendum' });
      }
      throw err;
    }

    // Update vote counts
    if (vote) {
      await db.update(referendums).set({
        votesFor: sql`${referendums.votesFor} + 1`,
      }).where(eq(referendums.id, referendumId));
    } else {
      await db.update(referendums).set({
        votesAgainst: sql`${referendums.votesAgainst} + 1`,
      }).where(eq(referendums.id, referendumId));
    }

    return res.json({ message: `Vote recorded: ${vote ? 'FOR' : 'AGAINST'}` });
  } catch (error) {
    if (handleDbError(error, res, 'temple-vote-referendum', req)) return;
    logRouteError(req, 500, 'Temple vote referendum error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/temple/referendums/:townId — View referendums in town (public)
router.get('/referendums/:townId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Active + recent (last 30 days)
    const townReferendums = await db.query.referendums.findMany({
      where: and(
        eq(referendums.townId, townId),
        gte(referendums.startedAt, thirtyDaysAgo),
      ),
      orderBy: desc(referendums.startedAt),
      with: {
        proposedBy: { columns: { id: true, name: true } },
      },
    });

    return res.json(townReferendums);
  } catch (error) {
    if (handleDbError(error, res, 'temple-referendums', req)) return;
    logRouteError(req, 500, 'Temple referendums error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// MARTIAL LAW ENDPOINTS (Domakhar — suspend democratic processes)
// ============================================================

// POST /api/temple/declare-martial-law — Declare martial law (Domakhar HP with Shrine)
router.post('/declare-martial-law', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId } = req.body;

    if (!townId) {
      return res.status(400).json({ error: 'townId is required' });
    }

    // Must be HP of dominant Domakhar chapter with shrine
    const chapter = await db.query.churchChapters.findFirst({
      where: and(eq(churchChapters.townId, townId), eq(churchChapters.godId, 'domakhar')),
    });
    if (!chapter || chapter.highPriestId !== character.id) {
      return res.status(403).json({ error: 'Must be the High Priest of Domakhar in this town' });
    }

    if (chapter.tier !== 'DOMINANT') {
      return res.status(403).json({ error: 'Domakhar chapter must be at DOMINANT tier' });
    }

    if (!chapter.isShrine) {
      return res.status(403).json({ error: 'Domakhar shrine must be active' });
    }

    // Check not already under martial law
    if (await isTownUnderMartialLaw(townId)) {
      return res.status(400).json({ error: 'Town is already under martial law' });
    }

    // Check cooldown (30 days)
    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
    });
    if (policy?.tradePolicy) {
      const tp = policy.tradePolicy as Record<string, any>;
      if (tp.domakharMartialLawAt) {
        const lastDeclaration = new Date(tp.domakharMartialLawAt);
        const cooldownEnd = new Date(lastDeclaration.getTime() + MARTIAL_LAW_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
        if (new Date() < cooldownEnd) {
          return res.status(400).json({
            error: `Martial law cooldown active until ${cooldownEnd.toISOString().split('T')[0]}`,
            cooldownEndsAt: cooldownEnd.toISOString(),
          });
        }
      }
    }

    // Deduct 300g from church treasury
    if (chapter.treasury < MARTIAL_LAW_COST) {
      return res.status(400).json({ error: `Church treasury needs at least ${MARTIAL_LAW_COST}g (has ${chapter.treasury}g)` });
    }

    await db.update(churchChapters).set({
      treasury: chapter.treasury - MARTIAL_LAW_COST,
    }).where(eq(churchChapters.id, chapter.id));

    // Set martial law in townPolicies.tradePolicy JSONB
    const now = new Date();
    const endsAt = new Date(now.getTime() + MARTIAL_LAW_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const existingTp = (policy?.tradePolicy as Record<string, any>) || {};
    const newTp = {
      ...existingTp,
      martialLawUntil: endsAt.toISOString(),
      martialLawDeclaredBy: character.id,
      martialLawDeclaredAt: now.toISOString(),
      domakharMartialLawAt: now.toISOString(),
    };

    if (policy) {
      await db.update(townPolicies).set({ tradePolicy: newTp }).where(eq(townPolicies.townId, townId));
    } else {
      await db.insert(townPolicies).values({ id: crypto.randomUUID(), townId, tradePolicy: newTp });
    }

    // Emit socket event
    getIO().emit('martial-law:declared', {
      townId,
      endsAt: endsAt.toISOString(),
      declaredBy: character.name,
    });

    // Fire-and-forget historical logging
    logTownEvent(townId, 'MARTIAL_LAW', `Martial Law Declared by ${character.name}`, `Martial law imposed for ${MARTIAL_LAW_DURATION_DAYS} days. All elections, impeachments, and referendums suspended.`, character.id).catch(() => {});

    return res.json({ message: 'Martial law declared', endsAt: endsAt.toISOString() });
  } catch (error) {
    if (handleDbError(error, res, 'temple-declare-martial-law', req)) return;
    logRouteError(req, 500, 'Temple declare martial law error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/temple/martial-law-status/:townId — Check martial law status (public)
router.get('/martial-law-status/:townId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
      columns: { tradePolicy: true },
    });

    const tp = policy?.tradePolicy as Record<string, any> | null;
    const active = !!tp?.martialLawUntil && new Date(tp.martialLawUntil) > new Date();

    let declaredByName: string | null = null;
    if (active && tp?.martialLawDeclaredBy) {
      const declarer = await db.query.characters.findFirst({
        where: eq(characters.id, tp.martialLawDeclaredBy),
        columns: { name: true },
      });
      declaredByName = declarer?.name ?? null;
    }

    return res.json({
      active,
      endsAt: active ? tp!.martialLawUntil : null,
      declaredBy: active ? declaredByName : null,
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-martial-law-status', req)) return;
    logRouteError(req, 500, 'Temple martial law status error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================
// Seraphiel: Historical Records, Blood Memory, Reckoning
// ============================================================

// GET /api/temple/history/:townId — View historical records (Seraphiel MINORITY+)
router.get('/history/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const eventType = req.query.eventType as string | undefined;

    // Must be Seraphiel member (any tier = MINORITY+)
    if (character.patronGodId !== 'seraphiel') {
      return res.status(403).json({ error: 'Only followers of Seraphiel may access the historical records' });
    }

    const conditions: any[] = [eq(townHistoryLog.townId, townId)];
    if (eventType) {
      conditions.push(eq(townHistoryLog.eventType, eventType));
    }

    const offset = (page - 1) * limit;

    const events = await db.query.townHistoryLog.findMany({
      where: and(...conditions),
      orderBy: desc(townHistoryLog.occurredAt),
      limit,
      offset,
      with: {
        involvedCharacter: { columns: { id: true, name: true } },
      },
    });

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(townHistoryLog)
      .where(and(...conditions));

    return res.json({
      events: events.map(e => ({
        id: e.id,
        eventType: e.eventType,
        title: e.title,
        description: e.description,
        involvedCharacter: e.involvedCharacter,
        involvedRace: e.involvedRace,
        metadata: e.metadata,
        occurredAt: e.occurredAt,
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-history', req)) return;
    logRouteError(req, 500, 'Temple history error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/temple/blood-memory/:townId — View blood memory (Seraphiel CHAPTER+)
router.get('/blood-memory/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId } = req.params;

    // Must be Seraphiel CHAPTER+
    if (character.patronGodId !== 'seraphiel') {
      return res.status(403).json({ error: 'Only followers of Seraphiel may access blood memory' });
    }
    const chapter = await db.query.churchChapters.findFirst({
      where: and(eq(churchChapters.godId, 'seraphiel'), eq(churchChapters.townId, character.homeTownId ?? '')),
      columns: { tier: true },
    });
    const tier = chapter?.tier ?? 'MINORITY';
    if (tier === 'MINORITY') {
      return res.status(403).json({ error: 'Blood memory requires CHAPTER tier or higher' });
    }

    // Aggregate racial reputations for characters in this town
    const townCharacters = await db.query.characters.findMany({
      where: eq(characters.homeTownId, townId),
      columns: { id: true, race: true },
    });
    const charIds = townCharacters.map(c => c.id);
    const charRaceMap = new Map(townCharacters.map(c => [c.id, c.race]));

    if (charIds.length === 0) {
      return res.json({ racePairs: [], activeBloodMemory: null });
    }

    const reps = await db.query.racialReputations.findMany({
      where: inArray(racialReputations.characterId, charIds),
    });

    // Group by race pair (characterRace ↔ targetRace)
    const pairMap = new Map<string, { total: number; count: number }>();
    for (const rep of reps) {
      const charRace = charRaceMap.get(rep.characterId);
      if (!charRace) continue;
      const races = [charRace, rep.race].sort();
      const key = `${races[0]}:${races[1]}`;
      const existing = pairMap.get(key) ?? { total: 0, count: 0 };
      existing.total += rep.score;
      existing.count += 1;
      pairMap.set(key, existing);
    }

    const racePairs = Array.from(pairMap.entries()).map(([key, data]) => {
      const [raceA, raceB] = key.split(':');
      const avgReputation = Math.round(data.total / data.count);
      let tension: 'HIGH' | 'MEDIUM' | 'LOW' | 'FRIENDLY' = 'LOW';
      if (avgReputation <= -30) tension = 'HIGH';
      else if (avgReputation <= -10) tension = 'MEDIUM';
      else if (avgReputation >= 10) tension = 'FRIENDLY';
      return { raceA, raceB, avgReputation, tension, interactions: data.count };
    }).sort((a, b) => a.avgReputation - b.avgReputation);

    // Check active blood memory
    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
      columns: { tradePolicy: true },
    });
    const tp = policy?.tradePolicy as Record<string, any> | null;
    let activeBloodMemory = null;
    if (tp?.bloodMemoryUntil && new Date(tp.bloodMemoryUntil) > new Date()) {
      activeBloodMemory = {
        raceA: tp.bloodMemoryRaceA,
        raceB: tp.bloodMemoryRaceB,
        modifier: tp.bloodMemoryModifier,
        expiresAt: tp.bloodMemoryUntil,
      };
    }

    return res.json({ racePairs, activeBloodMemory });
  } catch (error) {
    if (handleDbError(error, res, 'temple-blood-memory', req)) return;
    logRouteError(req, 500, 'Temple blood memory error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/temple/invoke-blood-memory — Invoke Blood Memory (Seraphiel ESTABLISHED+)
router.post('/invoke-blood-memory', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId, targetRace, modifier } = req.body as { townId: string; targetRace: string; modifier: 'positive' | 'negative' };

    if (!townId || !targetRace || !modifier) {
      return res.status(400).json({ error: 'townId, targetRace, and modifier are required' });
    }
    if (modifier !== 'positive' && modifier !== 'negative') {
      return res.status(400).json({ error: 'modifier must be "positive" or "negative"' });
    }

    // Must be Seraphiel ESTABLISHED+
    if (character.patronGodId !== 'seraphiel') {
      return res.status(403).json({ error: 'Only followers of Seraphiel may invoke blood memory' });
    }
    const chapter = await db.query.churchChapters.findFirst({
      where: and(eq(churchChapters.godId, 'seraphiel'), eq(churchChapters.townId, character.homeTownId ?? '')),
      columns: { tier: true },
    });
    const tier = chapter?.tier ?? 'MINORITY';
    if (tier === 'MINORITY' || tier === 'CHAPTER') {
      return res.status(403).json({ error: 'Invoking blood memory requires ESTABLISHED tier or higher' });
    }

    // Check if there's already an active blood memory in this town
    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
    });
    const tp = (policy?.tradePolicy as Record<string, any>) || {};
    if (tp.bloodMemoryUntil && new Date(tp.bloodMemoryUntil) > new Date()) {
      return res.status(400).json({ error: 'A blood memory is already active in this town' });
    }

    // Check 7-day per-character cooldown
    const cooldownKey = `bloodMemoryCooldown_${character.id}`;
    if (tp[cooldownKey]) {
      const lastInvoke = new Date(tp[cooldownKey]);
      const cooldownEnd = new Date(lastInvoke.getTime() + BLOOD_MEMORY_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
      if (new Date() < cooldownEnd) {
        return res.status(400).json({
          error: `Blood memory cooldown active until ${cooldownEnd.toISOString().split('T')[0]}`,
          cooldownEndsAt: cooldownEnd.toISOString(),
        });
      }
    }

    // Set blood memory in tradePolicy JSONB
    const expiresAt = new Date(Date.now() + BLOOD_MEMORY_DURATION_HOURS * 60 * 60 * 1000).toISOString();
    const newTp = {
      ...tp,
      bloodMemoryUntil: expiresAt,
      bloodMemoryRaceA: character.race,
      bloodMemoryRaceB: targetRace,
      bloodMemoryModifier: modifier,
      [cooldownKey]: new Date().toISOString(),
    };

    if (policy) {
      await db.update(townPolicies).set({ tradePolicy: newTp }).where(eq(townPolicies.townId, townId));
    } else {
      await db.insert(townPolicies).values({ id: crypto.randomUUID(), townId, tradePolicy: newTp });
    }

    // Fire-and-forget historical logging
    logTownEvent(townId, 'SUMMIT', `Blood Memory Invoked by ${character.name}`, `${modifier === 'positive' ? 'Positive' : 'Negative'} blood memory invoked between ${character.race} and ${targetRace} for ${BLOOD_MEMORY_DURATION_HOURS} hours.`, character.id, targetRace).catch(() => {});

    return res.json({
      success: true,
      message: `Blood memory invoked — ${modifier} modifier on ${character.race}↔${targetRace} interactions for ${BLOOD_MEMORY_DURATION_HOURS}h`,
      expiresAt,
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-invoke-blood-memory', req)) return;
    logRouteError(req, 500, 'Temple invoke blood memory error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/temple/call-reckoning — Call a Reckoning (Seraphiel HP with Shrine)
router.post('/call-reckoning', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;
    const { townId, targetRace, grievance } = req.body as { townId: string; targetRace: string; grievance: string };

    if (!townId || !targetRace || !grievance) {
      return res.status(400).json({ error: 'townId, targetRace, and grievance are required' });
    }

    // Must be HP of dominant Seraphiel chapter with shrine
    const chapter = await db.query.churchChapters.findFirst({
      where: and(
        eq(churchChapters.godId, 'seraphiel'),
        eq(churchChapters.townId, townId),
      ),
    });
    if (!chapter) {
      return res.status(400).json({ error: 'No Seraphiel chapter in this town' });
    }
    if (chapter.highPriestId !== character.id) {
      return res.status(403).json({ error: 'Only the High Priest of Seraphiel can call a Reckoning' });
    }
    if (!chapter.isDominant) {
      return res.status(400).json({ error: 'Seraphiel must be the dominant church' });
    }
    if (!chapter.isShrine) {
      return res.status(400).json({ error: 'The Seraphiel shrine must be consecrated' });
    }

    // Check martial law
    if (await isTownUnderMartialLaw(townId)) {
      return res.status(400).json({ error: 'Cannot call a Reckoning during martial law' });
    }

    // Check cooldown (30 days)
    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
    });
    const tp = (policy?.tradePolicy as Record<string, any>) || {};
    if (tp.seraphielReckoningAt) {
      const lastReckoning = new Date(tp.seraphielReckoningAt);
      const cooldownEnd = new Date(lastReckoning.getTime() + RECKONING_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
      if (new Date() < cooldownEnd) {
        return res.status(400).json({
          error: `Reckoning cooldown active until ${cooldownEnd.toISOString().split('T')[0]}`,
          cooldownEndsAt: cooldownEnd.toISOString(),
        });
      }
    }

    // Check treasury
    if (chapter.treasury < RECKONING_COST) {
      return res.status(400).json({ error: `Church treasury needs at least ${RECKONING_COST}g (has ${chapter.treasury}g)` });
    }

    // Deduct cost
    await db.update(churchChapters).set({
      treasury: chapter.treasury - RECKONING_COST,
    }).where(eq(churchChapters.id, chapter.id));

    // Create a referendum with policyType='RECKONING'
    const now = new Date();
    const endsAt = new Date(now.getTime() + RECKONING_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const [referendum] = await db.insert(referendums).values({
      id: crypto.randomUUID(),
      townId,
      proposedById: character.id,
      question: `Reckoning: ${grievance} — Shall we hold ${targetRace} accountable?`,
      policyType: 'RECKONING',
      policyValue: { targetRace, grievance, penalty: -10 },
      status: 'VOTING',
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
    }).returning();

    // Set cooldown in tradePolicy
    const newTp = { ...tp, seraphielReckoningAt: now.toISOString() };
    if (policy) {
      await db.update(townPolicies).set({ tradePolicy: newTp }).where(eq(townPolicies.townId, townId));
    } else {
      await db.insert(townPolicies).values({ id: crypto.randomUUID(), townId, tradePolicy: newTp });
    }

    // Socket event
    getIO().emit('reckoning:called', {
      townId,
      referendumId: referendum.id,
      targetRace,
      grievance,
      calledBy: character.name,
      endsAt: endsAt.toISOString(),
    });

    // Fire-and-forget historical logging
    logTownEvent(townId, 'RECKONING', `Reckoning Called Against ${targetRace}`, `${character.name} called a Reckoning: "${grievance}". Town-wide vote for ${RECKONING_DURATION_DAYS} days.`, character.id, targetRace, { grievance, penalty: -10 }).catch(() => {});

    return res.json({
      success: true,
      message: `Reckoning called! The town will vote for ${RECKONING_DURATION_DAYS} days.`,
      referendumId: referendum.id,
      endsAt: endsAt.toISOString(),
      cost: RECKONING_COST,
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-call-reckoning', req)) return;
    logRouteError(req, 500, 'Temple call reckoning error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/temple/reckoning-status/:townId — Check if a Reckoning is active
router.get('/reckoning-status/:townId', async (req, res: Response) => {
  try {
    const { townId } = req.params;

    const activeReckoning = await db.query.referendums.findFirst({
      where: and(
        eq(referendums.townId, townId),
        eq(referendums.policyType, 'RECKONING'),
        eq(referendums.status, 'VOTING'),
      ),
      with: {
        proposedBy: { columns: { id: true, name: true } },
      },
    });

    if (!activeReckoning) {
      return res.json({ active: false });
    }

    const pv = activeReckoning.policyValue as Record<string, any>;
    return res.json({
      active: true,
      referendumId: activeReckoning.id,
      targetRace: pv.targetRace,
      grievance: pv.grievance,
      calledBy: activeReckoning.proposedBy?.name,
      votesFor: activeReckoning.votesFor,
      votesAgainst: activeReckoning.votesAgainst,
      endsAt: activeReckoning.endsAt,
    });
  } catch (error) {
    if (handleDbError(error, res, 'temple-reckoning-status', req)) return;
    logRouteError(req, 500, 'Temple reckoning status error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
