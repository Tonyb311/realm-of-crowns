import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, sql, count } from 'drizzle-orm';
import { warrants, courtCases, towns, townPolicies, townTreasuries, characters, regions } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { getIO } from '../socket/events';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { logTownEvent } from '../services/history-logger';
import { JUSTICE_CONFIG } from '@shared/data/justice-config';
import crypto from 'crypto';

const router = Router();

// --- Schemas ---

const issueWarrantSchema = z.object({
  townId: z.string().min(1),
  targetId: z.string().min(1),
  charge: z.string().min(1).max(500),
  evidence: z.string().min(1).max(2000),
});

const withdrawWarrantSchema = z.object({
  warrantId: z.string().min(1),
});

const surrenderSchema = z.object({
  warrantId: z.string().min(1),
});

// =========================================================================
// POST /issue-warrant — Sheriff issues a warrant
// =========================================================================
router.post('/issue-warrant', authGuard, characterGuard, requireTown, validate(issueWarrantSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, targetId, charge, evidence } = req.body;
    const character = req.character!;

    // Verify town exists
    const town = await db.query.towns.findFirst({ where: eq(towns.id, townId) });
    if (!town) return res.status(404).json({ error: 'Town not found' });

    // Verify character is sheriff of this town
    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
    });
    if (!policy || policy.sheriffId !== character.id) {
      return res.status(403).json({ error: 'Only the appointed sheriff can issue warrants' });
    }

    // Budget check
    const cost = JUSTICE_CONFIG.warrantCost;
    if (policy.sheriffBudgetUsedToday + cost > policy.sheriffDailyBudget) {
      return res.status(400).json({
        error: `Insufficient budget. Need ${cost}g, remaining: ${policy.sheriffDailyBudget - policy.sheriffBudgetUsedToday}g`,
      });
    }

    // Treasury check
    const treasury = await db.query.townTreasuries.findFirst({
      where: eq(townTreasuries.townId, townId),
    });
    if (!treasury || treasury.balance < cost) {
      return res.status(400).json({ error: `Insufficient town treasury. Need ${cost}g` });
    }

    // Max active warrants check
    const [activeCount] = await db.select({ total: count() }).from(warrants)
      .where(and(eq(warrants.sheriffId, character.id), eq(warrants.status, 'ACTIVE')));
    if ((activeCount?.total ?? 0) >= JUSTICE_CONFIG.maxActiveWarrants) {
      return res.status(400).json({ error: `Maximum ${JUSTICE_CONFIG.maxActiveWarrants} active warrants allowed` });
    }

    // Cannot warrant self
    if (targetId === character.id) {
      return res.status(400).json({ error: 'Cannot issue a warrant against yourself' });
    }

    // Cannot warrant the mayor
    if (targetId === town.mayorId) {
      return res.status(400).json({ error: 'Cannot issue a warrant against the mayor' });
    }

    // Target must exist
    const target = await db.query.characters.findFirst({
      where: eq(characters.id, targetId),
      columns: { id: true, name: true },
    });
    if (!target) {
      return res.status(404).json({ error: 'Target character not found' });
    }

    // Issue warrant in transaction
    const expiresAt = new Date(Date.now() + JUSTICE_CONFIG.warrantExpiryDays * 24 * 60 * 60 * 1000).toISOString();
    const warrantId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(warrants).values({
        id: warrantId,
        townId,
        sheriffId: character.id,
        targetId,
        charge,
        evidence,
        status: 'ACTIVE',
        expiresAt,
      });

      await tx.update(townPolicies)
        .set({ sheriffBudgetUsedToday: sql`${townPolicies.sheriffBudgetUsedToday} + ${cost}` })
        .where(eq(townPolicies.townId, townId));

      await tx.update(townTreasuries)
        .set({ balance: sql`${townTreasuries.balance} - ${cost}` })
        .where(eq(townTreasuries.townId, townId));
    });

    // Notify target
    getIO().to(`user:${targetId}`).emit('warrant:issued', {
      warrantId,
      townName: town.name,
      charge,
      sheriffName: character.name,
    });

    logTownEvent(townId, 'GOVERNANCE', 'Warrant Issued', `Sheriff ${character.name} issued a warrant for ${target.name}: ${charge}`, character.id).catch(() => {});

    const warrant = await db.query.warrants.findFirst({ where: eq(warrants.id, warrantId) });
    return res.status(201).json({ warrant });
  } catch (error) {
    if (handleDbError(error, res, 'justice-issue-warrant', req)) return;
    logRouteError(req, 500, 'Issue warrant error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /withdraw-warrant — Sheriff withdraws a warrant
// =========================================================================
router.post('/withdraw-warrant', authGuard, characterGuard, validate(withdrawWarrantSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { warrantId } = req.body;
    const character = req.character!;

    const warrant = await db.query.warrants.findFirst({
      where: eq(warrants.id, warrantId),
    });
    if (!warrant) return res.status(404).json({ error: 'Warrant not found' });
    if (warrant.status !== 'ACTIVE') {
      return res.status(400).json({ error: `Warrant is already ${warrant.status.toLowerCase()}` });
    }
    if (warrant.sheriffId !== character.id) {
      return res.status(403).json({ error: 'Only the issuing sheriff can withdraw this warrant' });
    }

    const [updated] = await db.update(warrants)
      .set({ status: 'WITHDRAWN', resolvedAt: new Date().toISOString() })
      .where(eq(warrants.id, warrantId))
      .returning();

    logTownEvent(warrant.townId, 'GOVERNANCE', 'Warrant Withdrawn', `Sheriff ${character.name} withdrew warrant #${warrantId.slice(0, 8)}`, character.id).catch(() => {});

    return res.json({ warrant: updated });
  } catch (error) {
    if (handleDbError(error, res, 'justice-withdraw-warrant', req)) return;
    logRouteError(req, 500, 'Withdraw warrant error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /surrender — Target surrenders to a warrant
// =========================================================================
router.post('/surrender', authGuard, characterGuard, validate(surrenderSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { warrantId } = req.body;
    const character = req.character!;

    const warrant = await db.query.warrants.findFirst({
      where: eq(warrants.id, warrantId),
    });
    if (!warrant) return res.status(404).json({ error: 'Warrant not found' });
    if (warrant.status !== 'ACTIVE') {
      return res.status(400).json({ error: `Warrant is already ${warrant.status.toLowerCase()}` });
    }
    if (warrant.targetId !== character.id) {
      return res.status(403).json({ error: 'Only the warrant target can surrender' });
    }

    // Look up town → region → kingdomId
    const town = await db.query.towns.findFirst({
      where: eq(towns.id, warrant.townId),
      with: { region: { columns: { kingdomId: true } } },
    });
    if (!town) return res.status(500).json({ error: 'Warrant town not found' });

    const kingdomId = (town.region as any)?.kingdomId;
    if (!kingdomId) return res.status(500).json({ error: 'Could not determine kingdom for court case' });

    const now = new Date();
    const autoReleaseAt = new Date(now.getTime() + JUSTICE_CONFIG.autoReleaseTicks * 24 * 60 * 60 * 1000).toISOString();
    const caseId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      // Update warrant status
      await tx.update(warrants)
        .set({ status: 'SURRENDERED', resolvedAt: now.toISOString() })
        .where(eq(warrants.id, warrantId));

      // Create court case
      await tx.insert(courtCases).values({
        id: caseId,
        warrantId,
        townId: warrant.townId,
        kingdomId,
        defendantId: warrant.targetId,
        sheriffId: warrant.sheriffId,
        charge: warrant.charge,
        evidence: warrant.evidence,
        status: 'PENDING',
        arrestedAt: now.toISOString(),
        autoReleaseAt,
        bailAmount: JUSTICE_CONFIG.bailAmount,
      });
    });

    // Notify defendant + sheriff
    getIO().to(`user:${warrant.targetId}`).emit('justice:arrested', {
      caseId,
      charge: warrant.charge,
      bailAmount: JUSTICE_CONFIG.bailAmount,
    });
    getIO().to(`user:${warrant.sheriffId}`).emit('justice:surrender', {
      caseId,
      warrantId,
      defendantName: character.name,
    });

    logTownEvent(warrant.townId, 'GOVERNANCE', 'Warrant Surrender', `${character.name} surrendered on warrant: ${warrant.charge}`, character.id).catch(() => {});

    const courtCase = await db.query.courtCases.findFirst({ where: eq(courtCases.id, caseId) });
    return res.json({ warrant: { ...warrant, status: 'SURRENDERED', resolvedAt: now.toISOString() }, courtCase });
  } catch (error) {
    if (handleDbError(error, res, 'justice-surrender', req)) return;
    logRouteError(req, 500, 'Surrender error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /warrants — Personal warrants view
// =========================================================================
router.get('/warrants', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    // Warrants targeting this character
    const targetedWarrants = await db.query.warrants.findMany({
      where: eq(warrants.targetId, character.id),
      with: {
        sheriff: { columns: { id: true, name: true } },
        town: { columns: { id: true, name: true } },
      },
    });

    // Warrants issued by this character (if sheriff)
    const issuedWarrants = await db.query.warrants.findMany({
      where: eq(warrants.sheriffId, character.id),
      with: {
        target: { columns: { id: true, name: true } },
        town: { columns: { id: true, name: true } },
      },
    });

    return res.json({
      targetedWarrants,
      issuedWarrants,
    });
  } catch (error) {
    if (handleDbError(error, res, 'justice-warrants', req)) return;
    logRouteError(req, 500, 'Warrants list error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /warrants/town/:townId — Public wanted posters
// =========================================================================
router.get('/warrants/town/:townId', async (req, res: Response) => {
  try {
    const { townId } = req.params;

    const activeWarrants = await db.query.warrants.findMany({
      where: and(eq(warrants.townId, townId), eq(warrants.status, 'ACTIVE')),
      with: {
        target: { columns: { id: true, name: true } },
        sheriff: { columns: { id: true, name: true } },
      },
    });

    const wantedPosters = activeWarrants.map(w => ({
      id: w.id,
      targetName: w.target.name,
      targetId: w.target.id,
      charge: w.charge,
      issuedBy: w.sheriff.name,
      issuedAt: w.issuedAt,
      expiresAt: w.expiresAt,
    }));

    return res.json({ warrants: wantedPosters });
  } catch (error) {
    if (handleDbError(error, res, 'justice-wanted-posters', req)) return;
    logRouteError(req, 500, 'Wanted posters error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /case/:id — View a court case
// =========================================================================
router.get('/case/:id', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const courtCase = await db.query.courtCases.findFirst({
      where: eq(courtCases.id, id),
      with: {
        warrant: true,
        defendant: { columns: { id: true, name: true } },
        sheriff: { columns: { id: true, name: true } },
        judge: { columns: { id: true, name: true } },
        town: { columns: { id: true, name: true } },
        kingdom: { columns: { id: true, name: true } },
      },
    });

    if (!courtCase) {
      return res.status(404).json({ error: 'Court case not found' });
    }

    return res.json({ courtCase });
  } catch (error) {
    if (handleDbError(error, res, 'justice-case-detail', req)) return;
    logRouteError(req, 500, 'Case detail error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
