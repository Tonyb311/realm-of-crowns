import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, or, desc, sql, count, inArray } from 'drizzle-orm';
import { towns, townPolicies, townTreasuries, characters, councilMembers, townTreaties, townTreatyVotes } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { getIO } from '../socket/events';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { logTownEvent } from '../services/history-logger';
import {
  TREATY_TYPES, MAX_ACTIVE_TREATIES, RATIFICATION_DAYS,
  CANCEL_NOTICE_DAYS, RENEWAL_WINDOW_DAYS, DEFAULT_TREATY_DURATION,
  MIN_TREATY_DURATION, MAX_TREATY_DURATION,
  MIN_TARIFF_REDUCTION, MAX_TARIFF_REDUCTION,
  MIN_RESOURCE_SHARING_GOLD, MAX_RESOURCE_SHARING_GOLD,
  type TownTreatyType,
} from '@shared/data/treaty-config';
import crypto from 'crypto';

const router = Router();

// =========================================================================
// POST /treaties/propose — Mayor proposes a treaty
// =========================================================================

const proposeSchema = z.object({
  townAId: z.string().min(1),
  townBId: z.string().min(1),
  treatyType: z.string().min(1),
  terms: z.record(z.string(), z.unknown()).optional().default({}),
  duration: z.number().int().min(MIN_TREATY_DURATION).max(MAX_TREATY_DURATION).optional().default(DEFAULT_TREATY_DURATION),
});

router.post('/propose', authGuard, characterGuard, requireTown, validate(proposeSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townAId, townBId, treatyType, terms, duration } = req.body;
    const character = req.character!;

    // 1. Verify treatyType is valid
    if (!(treatyType in TREATY_TYPES)) {
      return res.status(400).json({ error: `Invalid treaty type: ${treatyType}` });
    }

    // 2. Verify character is mayor of townA
    const townA = await db.query.towns.findFirst({ where: eq(towns.id, townAId), columns: { id: true, mayorId: true, name: true } });
    if (!townA || townA.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor of the proposing town can propose treaties' });
    }

    // 3. Verify townB exists and is different
    if (townAId === townBId) {
      return res.status(400).json({ error: 'Cannot propose a treaty with your own town' });
    }
    const townB = await db.query.towns.findFirst({ where: eq(towns.id, townBId), columns: { id: true, name: true, mayorId: true } });
    if (!townB) {
      return res.status(404).json({ error: 'Partner town not found' });
    }

    // 4. Check max active treaties for townA (ACTIVE + PENDING_RATIFICATION)
    const activeTreatyCount = await db.select({ count: count() }).from(townTreaties)
      .where(and(
        or(eq(townTreaties.townAId, townAId), eq(townTreaties.townBId, townAId)),
        or(eq(townTreaties.status, 'ACTIVE'), eq(townTreaties.status, 'PENDING_RATIFICATION')),
      ));
    if ((activeTreatyCount[0]?.count ?? 0) >= MAX_ACTIVE_TREATIES) {
      return res.status(400).json({ error: `Town already has ${MAX_ACTIVE_TREATIES} active treaties (maximum)` });
    }

    // 5. Check no existing PROPOSED/ACCEPTED/PENDING treaty of same type between these towns
    const existing = await db.query.townTreaties.findFirst({
      where: and(
        or(
          and(eq(townTreaties.townAId, townAId), eq(townTreaties.townBId, townBId)),
          and(eq(townTreaties.townAId, townBId), eq(townTreaties.townBId, townAId)),
        ),
        eq(townTreaties.treatyType, treatyType),
        or(
          eq(townTreaties.status, 'PROPOSED'),
          eq(townTreaties.status, 'ACCEPTED'),
          eq(townTreaties.status, 'PENDING_RATIFICATION'),
          eq(townTreaties.status, 'ACTIVE'),
        ),
      ),
      columns: { id: true },
    });
    if (existing) {
      return res.status(400).json({ error: `An active or pending ${TREATY_TYPES[treatyType as TownTreatyType].name} already exists between these towns` });
    }

    // 6. Validate type-specific terms
    const validatedTerms = validateTerms(treatyType as TownTreatyType, terms);
    if (validatedTerms.error) {
      return res.status(400).json({ error: validatedTerms.error });
    }

    // 7. Insert treaty
    const treatyId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.insert(townTreaties).values({
      id: treatyId,
      townAId,
      townBId,
      proposedById: character.id,
      treatyType,
      terms: validatedTerms.terms,
      status: 'PROPOSED',
      duration,
      createdAt: now,
      updatedAt: now,
    });

    // 8. Socket notify townB
    const typeName = TREATY_TYPES[treatyType as TownTreatyType].name;
    try {
      getIO().to(`town:${townBId}`).emit('treaty:proposed', {
        treatyId, townAName: townA.name, treatyType: typeName,
      });
    } catch { /* socket not critical */ }

    // 9. Log in both towns
    logTownEvent(townAId, 'GOVERNANCE', `Treaty Proposed: ${typeName}`, `Mayor ${character.name} proposed a ${typeName} with ${townB.name}`, character.id).catch(() => {});
    logTownEvent(townBId, 'GOVERNANCE', `Treaty Proposal Received: ${typeName}`, `${townA.name} proposed a ${typeName}`, character.id).catch(() => {});

    return res.json({ success: true, treatyId });
  } catch (error) {
    if (handleDbError(error, res, 'treaties-propose', req)) return;
    logRouteError(req, 500, 'Treaty propose error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /treaties/respond — Partner mayor accepts or rejects
// =========================================================================

const respondSchema = z.object({
  treatyId: z.string().min(1),
  response: z.enum(['ACCEPT', 'REJECT']),
});

router.post('/respond', authGuard, characterGuard, requireTown, validate(respondSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { treatyId, response: action } = req.body;
    const character = req.character!;

    const treaty = await db.query.townTreaties.findFirst({
      where: eq(townTreaties.id, treatyId),
      with: {
        townA: { columns: { id: true, name: true, mayorId: true } },
        townB: { columns: { id: true, name: true, mayorId: true } },
      },
    });
    if (!treaty) return res.status(404).json({ error: 'Treaty not found' });
    if (treaty.status !== 'PROPOSED') {
      return res.status(400).json({ error: `Treaty is ${treaty.status}, not PROPOSED` });
    }

    // Must be mayor of townB
    if (treaty.townB.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor of the receiving town can respond' });
    }

    // Also check townB doesn't exceed max active
    if (action === 'ACCEPT') {
      const activeTreatyCount = await db.select({ count: count() }).from(townTreaties)
        .where(and(
          or(eq(townTreaties.townAId, treaty.townBId), eq(townTreaties.townBId, treaty.townBId)),
          or(eq(townTreaties.status, 'ACTIVE'), eq(townTreaties.status, 'PENDING_RATIFICATION')),
        ));
      if ((activeTreatyCount[0]?.count ?? 0) >= MAX_ACTIVE_TREATIES) {
        return res.status(400).json({ error: `Your town already has ${MAX_ACTIVE_TREATIES} active treaties (maximum)` });
      }
    }

    const typeName = TREATY_TYPES[treaty.treatyType as TownTreatyType]?.name ?? treaty.treatyType;

    if (action === 'REJECT') {
      await db.update(townTreaties).set({ status: 'REJECTED' }).where(eq(townTreaties.id, treatyId));
      logTownEvent(treaty.townAId, 'GOVERNANCE', `Treaty Rejected: ${typeName}`, `${treaty.townB.name} rejected the ${typeName} proposal`, character.id).catch(() => {});
      logTownEvent(treaty.townBId, 'GOVERNANCE', `Treaty Rejected: ${typeName}`, `Mayor ${character.name} rejected the ${typeName} from ${treaty.townA.name}`, character.id).catch(() => {});
      return res.json({ success: true, status: 'REJECTED' });
    }

    // ACCEPT: check if both towns have councils
    const [townACouncil, townBCouncil] = await Promise.all([
      db.select({ count: count() }).from(councilMembers).where(eq(councilMembers.townId, treaty.townAId)),
      db.select({ count: count() }).from(councilMembers).where(eq(councilMembers.townId, treaty.townBId)),
    ]);

    const townAHasCouncil = (townACouncil[0]?.count ?? 0) > 0;
    const townBHasCouncil = (townBCouncil[0]?.count ?? 0) > 0;

    if (!townAHasCouncil && !townBHasCouncil) {
      // No councils at all — activate immediately
      const now = new Date();
      const expiresAt = new Date(now.getTime() + treaty.duration * 24 * 60 * 60 * 1000).toISOString();
      await db.update(townTreaties).set({
        status: 'ACTIVE',
        activatedAt: now.toISOString(),
        expiresAt,
      }).where(eq(townTreaties.id, treatyId));

      // Import inline to avoid circular deps
      const { applyTreatyEffects } = await import('../services/treaty-effects');
      await applyTreatyEffects(treaty);

      logTownEvent(treaty.townAId, 'GOVERNANCE', `Treaty Activated: ${typeName}`, `${typeName} with ${treaty.townB.name} is now active`, character.id).catch(() => {});
      logTownEvent(treaty.townBId, 'GOVERNANCE', `Treaty Activated: ${typeName}`, `${typeName} with ${treaty.townA.name} is now active`, character.id).catch(() => {});

      return res.json({ success: true, status: 'ACTIVE' });
    }

    // Has councils — enter ratification
    const ratificationEndsAt = new Date(Date.now() + RATIFICATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Auto-pass for towns without councils
    const updateData: Record<string, unknown> = {
      status: 'PENDING_RATIFICATION',
      ratificationEndsAt,
    };
    if (!townAHasCouncil) {
      updateData.townAVotesFor = 1; // Auto-pass: synthetic vote
    }
    if (!townBHasCouncil) {
      updateData.townBVotesFor = 1; // Auto-pass: synthetic vote
    }

    await db.update(townTreaties).set(updateData).where(eq(townTreaties.id, treatyId));

    logTownEvent(treaty.townAId, 'GOVERNANCE', `Treaty Accepted — Ratification: ${typeName}`, `${treaty.townB.name} accepted the ${typeName}. Council vote begins (${RATIFICATION_DAYS} days)`, character.id).catch(() => {});
    logTownEvent(treaty.townBId, 'GOVERNANCE', `Treaty Accepted — Ratification: ${typeName}`, `Mayor ${character.name} accepted the ${typeName} from ${treaty.townA.name}. Council vote begins`, character.id).catch(() => {});

    try {
      getIO().to(`town:${treaty.townAId}`).emit('treaty:ratification-started', { treatyId, typeName });
      getIO().to(`town:${treaty.townBId}`).emit('treaty:ratification-started', { treatyId, typeName });
    } catch { /* socket not critical */ }

    return res.json({ success: true, status: 'PENDING_RATIFICATION' });
  } catch (error) {
    if (handleDbError(error, res, 'treaties-respond', req)) return;
    logRouteError(req, 500, 'Treaty respond error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /treaties/vote — Council member votes on ratification
// =========================================================================

const voteSchema = z.object({
  treatyId: z.string().min(1),
  vote: z.boolean(),
});

router.post('/vote', authGuard, characterGuard, requireTown, validate(voteSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { treatyId, vote } = req.body;
    const character = req.character!;

    const treaty = await db.query.townTreaties.findFirst({
      where: eq(townTreaties.id, treatyId),
      columns: { id: true, townAId: true, townBId: true, status: true },
    });
    if (!treaty) return res.status(404).json({ error: 'Treaty not found' });
    if (treaty.status !== 'PENDING_RATIFICATION') {
      return res.status(400).json({ error: 'Treaty is not in ratification phase' });
    }

    // Determine which town this voter belongs to (council member or mayor)
    const townAData = await db.query.towns.findFirst({ where: eq(towns.id, treaty.townAId), columns: { mayorId: true } });
    const townBData = await db.query.towns.findFirst({ where: eq(towns.id, treaty.townBId), columns: { mayorId: true } });

    const isCouncilA = await db.query.councilMembers.findFirst({
      where: and(eq(councilMembers.townId, treaty.townAId), eq(councilMembers.characterId, character.id)),
      columns: { id: true },
    });
    const isCouncilB = await db.query.councilMembers.findFirst({
      where: and(eq(councilMembers.townId, treaty.townBId), eq(councilMembers.characterId, character.id)),
      columns: { id: true },
    });
    const isMayorA = townAData?.mayorId === character.id;
    const isMayorB = townBData?.mayorId === character.id;

    let voterTownId: string | null = null;
    if (isCouncilA || isMayorA) voterTownId = treaty.townAId;
    else if (isCouncilB || isMayorB) voterTownId = treaty.townBId;

    if (!voterTownId) {
      return res.status(403).json({ error: 'Only council members or mayors of the involved towns can vote' });
    }

    // Record vote — unique constraint prevents double voting
    const voteId = crypto.randomUUID();
    try {
      await db.insert(townTreatyVotes).values({
        id: voteId,
        treatyId,
        characterId: character.id,
        townId: voterTownId,
        vote,
        votedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      if (err?.code === '23505' || err?.constraint?.includes('treaty_character')) {
        return res.status(400).json({ error: 'You have already voted on this treaty' });
      }
      throw err;
    }

    // Increment vote counter using sql expression (race-safe)
    const isForTownA = voterTownId === treaty.townAId;
    if (isForTownA) {
      if (vote) {
        await db.update(townTreaties).set({ townAVotesFor: sql`${townTreaties.townAVotesFor} + 1` }).where(eq(townTreaties.id, treatyId));
      } else {
        await db.update(townTreaties).set({ townAVotesAgainst: sql`${townTreaties.townAVotesAgainst} + 1` }).where(eq(townTreaties.id, treatyId));
      }
    } else {
      if (vote) {
        await db.update(townTreaties).set({ townBVotesFor: sql`${townTreaties.townBVotesFor} + 1` }).where(eq(townTreaties.id, treatyId));
      } else {
        await db.update(townTreaties).set({ townBVotesAgainst: sql`${townTreaties.townBVotesAgainst} + 1` }).where(eq(townTreaties.id, treatyId));
      }
    }

    return res.json({ success: true });
  } catch (error) {
    if (handleDbError(error, res, 'treaties-vote', req)) return;
    logRouteError(req, 500, 'Treaty vote error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /treaties/cancel — Either mayor cancels
// =========================================================================

const cancelSchema = z.object({
  treatyId: z.string().min(1),
});

router.post('/cancel', authGuard, characterGuard, requireTown, validate(cancelSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { treatyId } = req.body;
    const character = req.character!;

    const treaty = await db.query.townTreaties.findFirst({
      where: eq(townTreaties.id, treatyId),
      with: {
        townA: { columns: { id: true, name: true, mayorId: true } },
        townB: { columns: { id: true, name: true, mayorId: true } },
      },
    });
    if (!treaty) return res.status(404).json({ error: 'Treaty not found' });

    const isMayorA = treaty.townA.mayorId === character.id;
    const isMayorB = treaty.townB.mayorId === character.id;
    if (!isMayorA && !isMayorB) {
      return res.status(403).json({ error: 'Only a mayor of one of the treaty towns can cancel' });
    }

    const typeName = TREATY_TYPES[treaty.treatyType as TownTreatyType]?.name ?? treaty.treatyType;

    switch (treaty.status) {
      case 'PROPOSED':
      case 'ACCEPTED':
      case 'PENDING_RATIFICATION': {
        await db.update(townTreaties).set({ status: 'CANCELLED', cancelledAt: new Date().toISOString() }).where(eq(townTreaties.id, treatyId));
        logTownEvent(treaty.townAId, 'GOVERNANCE', `Treaty Cancelled: ${typeName}`, `Mayor ${character.name} cancelled the ${typeName}`, character.id).catch(() => {});
        logTownEvent(treaty.townBId, 'GOVERNANCE', `Treaty Cancelled: ${typeName}`, `Mayor ${character.name} cancelled the ${typeName}`, character.id).catch(() => {});
        return res.json({ success: true, status: 'CANCELLED' });
      }
      case 'ACTIVE': {
        const cancelNoticeUntil = new Date(Date.now() + CANCEL_NOTICE_DAYS * 24 * 60 * 60 * 1000).toISOString();
        await db.update(townTreaties).set({ status: 'CANCELLING', cancelNoticeUntil }).where(eq(townTreaties.id, treatyId));
        logTownEvent(treaty.townAId, 'GOVERNANCE', `Treaty Cancelling: ${typeName}`, `Mayor ${character.name} initiated cancellation of ${typeName} with ${CANCEL_NOTICE_DAYS}-day notice`, character.id).catch(() => {});
        logTownEvent(treaty.townBId, 'GOVERNANCE', `Treaty Cancelling: ${typeName}`, `Mayor ${character.name} initiated cancellation of ${typeName} with ${CANCEL_NOTICE_DAYS}-day notice`, character.id).catch(() => {});

        try {
          getIO().to(`town:${treaty.townAId}`).emit('treaty:cancelling', { treatyId, typeName, cancelNoticeUntil });
          getIO().to(`town:${treaty.townBId}`).emit('treaty:cancelling', { treatyId, typeName, cancelNoticeUntil });
        } catch { /* socket not critical */ }

        return res.json({ success: true, status: 'CANCELLING', cancelNoticeUntil });
      }
      case 'CANCELLING':
        return res.status(400).json({ error: 'Treaty is already being cancelled' });
      default:
        return res.status(400).json({ error: `Cannot cancel treaty in ${treaty.status} status` });
    }
  } catch (error) {
    if (handleDbError(error, res, 'treaties-cancel', req)) return;
    logRouteError(req, 500, 'Treaty cancel error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /treaties/renew — Mayor approves renewal (both must approve)
// =========================================================================

const renewSchema = z.object({
  treatyId: z.string().min(1),
});

router.post('/renew', authGuard, characterGuard, requireTown, validate(renewSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { treatyId } = req.body;
    const character = req.character!;

    const treaty = await db.query.townTreaties.findFirst({
      where: eq(townTreaties.id, treatyId),
      with: {
        townA: { columns: { id: true, name: true, mayorId: true } },
        townB: { columns: { id: true, name: true, mayorId: true } },
      },
    });
    if (!treaty) return res.status(404).json({ error: 'Treaty not found' });
    if (treaty.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Only active treaties can be renewed' });
    }

    // Check within renewal window
    if (!treaty.expiresAt) {
      return res.status(400).json({ error: 'Treaty has no expiry date' });
    }
    const msUntilExpiry = new Date(treaty.expiresAt).getTime() - Date.now();
    if (msUntilExpiry > RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: `Treaty can only be renewed within ${RENEWAL_WINDOW_DAYS} days of expiry` });
    }

    const isMayorA = treaty.townA.mayorId === character.id;
    const isMayorB = treaty.townB.mayorId === character.id;
    if (!isMayorA && !isMayorB) {
      return res.status(403).json({ error: 'Only a mayor of one of the treaty towns can renew' });
    }

    // Track renewal approvals in terms JSONB
    const terms = (treaty.terms ?? {}) as Record<string, unknown>;
    const renewalApprovedBy = Array.isArray(terms.renewalApprovedBy) ? [...terms.renewalApprovedBy as string[]] : [];

    if (renewalApprovedBy.includes(character.id)) {
      return res.status(400).json({ error: 'You have already approved the renewal' });
    }
    renewalApprovedBy.push(character.id);

    const typeName = TREATY_TYPES[treaty.treatyType as TownTreatyType]?.name ?? treaty.treatyType;

    // Check if both mayors have approved
    const otherMayorId = isMayorA ? treaty.townB.mayorId : treaty.townA.mayorId;
    if (otherMayorId && renewalApprovedBy.includes(otherMayorId)) {
      // Both approved — extend treaty
      const currentExpiry = new Date(treaty.expiresAt);
      const newExpiry = new Date(currentExpiry.getTime() + treaty.duration * 24 * 60 * 60 * 1000).toISOString();
      const updatedTerms = { ...terms };
      delete updatedTerms.renewalApprovedBy;

      await db.update(townTreaties).set({ expiresAt: newExpiry, terms: updatedTerms }).where(eq(townTreaties.id, treatyId));

      logTownEvent(treaty.townAId, 'GOVERNANCE', `Treaty Renewed: ${typeName}`, `${typeName} with ${treaty.townB.name} renewed for ${treaty.duration} days`, character.id).catch(() => {});
      logTownEvent(treaty.townBId, 'GOVERNANCE', `Treaty Renewed: ${typeName}`, `${typeName} with ${treaty.townA.name} renewed for ${treaty.duration} days`, character.id).catch(() => {});

      return res.json({ success: true, renewed: true, newExpiresAt: newExpiry });
    }

    // Only one mayor approved so far
    await db.update(townTreaties).set({ terms: { ...terms, renewalApprovedBy } }).where(eq(townTreaties.id, treatyId));

    logTownEvent(
      isMayorA ? treaty.townAId : treaty.townBId,
      'GOVERNANCE', `Treaty Renewal Approved: ${typeName}`,
      `Mayor ${character.name} approved renewal of ${typeName}. Awaiting partner mayor.`,
      character.id,
    ).catch(() => {});

    return res.json({ success: true, renewed: false, message: 'Renewal approval recorded. Awaiting partner mayor.' });
  } catch (error) {
    if (handleDbError(error, res, 'treaties-renew', req)) return;
    logRouteError(req, 500, 'Treaty renew error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /treaties/town/:townId — View treaties for a town (public)
// =========================================================================

router.get('/town/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const allTreaties = await db.query.townTreaties.findMany({
      where: or(eq(townTreaties.townAId, townId), eq(townTreaties.townBId, townId)),
      with: {
        townA: { columns: { id: true, name: true } },
        townB: { columns: { id: true, name: true } },
        proposedBy: { columns: { id: true, name: true } },
      },
      orderBy: [desc(townTreaties.createdAt)],
    });

    // Group by status
    const grouped = {
      active: allTreaties.filter(t => t.status === 'ACTIVE' || t.status === 'CANCELLING'),
      pending: allTreaties.filter(t => t.status === 'PENDING_RATIFICATION'),
      proposed: allTreaties.filter(t => t.status === 'PROPOSED' || t.status === 'ACCEPTED'),
      past: allTreaties.filter(t => t.status === 'EXPIRED' || t.status === 'CANCELLED' || t.status === 'REJECTED').slice(0, 10),
    };

    const formatTreaty = (t: typeof allTreaties[number]) => {
      const partnerTown = t.townAId === townId ? t.townB : t.townA;
      const typeCfg = TREATY_TYPES[t.treatyType as TownTreatyType];
      const terms = (t.terms ?? {}) as Record<string, unknown>;
      const cleanTerms = { ...terms };
      delete cleanTerms.renewalApprovedBy;
      return {
        id: t.id,
        treatyType: t.treatyType,
        typeName: typeCfg?.name ?? t.treatyType,
        typeDescription: typeCfg?.description ?? '',
        partnerTown: { id: partnerTown.id, name: partnerTown.name },
        proposedBy: t.proposedBy,
        terms: cleanTerms,
        status: t.status,
        duration: t.duration,
        townAVotesFor: t.townAVotesFor,
        townAVotesAgainst: t.townAVotesAgainst,
        townBVotesFor: t.townBVotesFor,
        townBVotesAgainst: t.townBVotesAgainst,
        ratificationEndsAt: t.ratificationEndsAt,
        activatedAt: t.activatedAt,
        expiresAt: t.expiresAt,
        cancelNoticeUntil: t.cancelNoticeUntil,
        createdAt: t.createdAt,
        isIncoming: t.townBId === townId && t.status === 'PROPOSED',
        renewalApprovedBy: Array.isArray((t.terms as any)?.renewalApprovedBy) ? (t.terms as any).renewalApprovedBy : [],
      };
    };

    return res.json({
      active: grouped.active.map(formatTreaty),
      pending: grouped.pending.map(formatTreaty),
      proposed: grouped.proposed.map(formatTreaty),
      past: grouped.past.map(formatTreaty),
      activeCount: grouped.active.length,
      maxTreaties: MAX_ACTIVE_TREATIES,
    });
  } catch (error) {
    if (handleDbError(error, res, 'treaties-town', req)) return;
    logRouteError(req, 500, 'View treaties error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /treaties/:id — Single treaty detail with vote breakdown
// =========================================================================

router.get('/:id', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const treaty = await db.query.townTreaties.findFirst({
      where: eq(townTreaties.id, id),
      with: {
        townA: { columns: { id: true, name: true } },
        townB: { columns: { id: true, name: true } },
        proposedBy: { columns: { id: true, name: true } },
        votes: {
          with: { character: { columns: { id: true, name: true } } },
        },
      },
    });
    if (!treaty) return res.status(404).json({ error: 'Treaty not found' });

    const typeCfg = TREATY_TYPES[treaty.treatyType as TownTreatyType];
    const terms = (treaty.terms ?? {}) as Record<string, unknown>;
    const cleanTerms = { ...terms };
    delete cleanTerms.renewalApprovedBy;

    return res.json({
      id: treaty.id,
      treatyType: treaty.treatyType,
      typeName: typeCfg?.name ?? treaty.treatyType,
      typeDescription: typeCfg?.description ?? '',
      townA: treaty.townA,
      townB: treaty.townB,
      proposedBy: treaty.proposedBy,
      terms: cleanTerms,
      status: treaty.status,
      duration: treaty.duration,
      townAVotes: { for: treaty.townAVotesFor, against: treaty.townAVotesAgainst },
      townBVotes: { for: treaty.townBVotesFor, against: treaty.townBVotesAgainst },
      ratificationEndsAt: treaty.ratificationEndsAt,
      activatedAt: treaty.activatedAt,
      expiresAt: treaty.expiresAt,
      cancelNoticeUntil: treaty.cancelNoticeUntil,
      createdAt: treaty.createdAt,
      votes: treaty.votes.map(v => ({
        characterName: v.character.name,
        townId: v.townId,
        vote: v.vote,
        votedAt: v.votedAt,
      })),
      renewalApprovedBy: Array.isArray((treaty.terms as any)?.renewalApprovedBy) ? (treaty.terms as any).renewalApprovedBy : [],
    });
  } catch (error) {
    if (handleDbError(error, res, 'treaties-detail', req)) return;
    logRouteError(req, 500, 'Treaty detail error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Term Validation ──────────────────────────────────────────

function validateTerms(type: TownTreatyType, terms: Record<string, unknown>): { terms: Record<string, unknown>; error?: string } {
  switch (type) {
    case 'TRADE_AGREEMENT': {
      const tariffReduction = typeof terms.tariffReduction === 'number' ? terms.tariffReduction : 0.5;
      if (tariffReduction < MIN_TARIFF_REDUCTION || tariffReduction > MAX_TARIFF_REDUCTION) {
        return { terms: {}, error: `Tariff reduction must be between ${MIN_TARIFF_REDUCTION * 100}% and ${MAX_TARIFF_REDUCTION * 100}%` };
      }
      return { terms: { tariffReduction } };
    }
    case 'RESOURCE_SHARING': {
      const goldPerDay = typeof terms.goldPerDay === 'number' ? terms.goldPerDay : 0;
      if (goldPerDay < MIN_RESOURCE_SHARING_GOLD || goldPerDay > MAX_RESOURCE_SHARING_GOLD) {
        return { terms: {}, error: `Gold per day must be between ${MIN_RESOURCE_SHARING_GOLD} and ${MAX_RESOURCE_SHARING_GOLD}` };
      }
      const direction = terms.direction === 'B_TO_A' ? 'B_TO_A' : 'A_TO_B';
      return { terms: { goldPerDay, direction } };
    }
    case 'SHARED_MARKET':
    case 'MUTUAL_DEFENSE':
    case 'CULTURAL_EXCHANGE':
      return { terms: {} };
    default:
      return { terms: {}, error: 'Unknown treaty type' };
  }
}

export default router;
