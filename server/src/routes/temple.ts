import { Router, type Response } from 'express';
import { eq, and, sql, asc, desc, count } from 'drizzle-orm';
import { db } from '../lib/db';
import { gods, churchChapters, characters, towns } from '@database/tables';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import { characterGuard } from '../middleware/character-guard';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { calculateChurchTier, CONVERSION_COOLDOWN_DAYS } from '@shared/data/religion-config';
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

    const enrichedChapters = chapters.map(ch => ({
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
      highPriestName: ch.highPriest?.name ?? null,
      treasury: ch.treasury,
    }));

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

export default router;
