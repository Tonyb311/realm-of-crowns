import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, or, desc, sql, count } from 'drizzle-orm';
import { kingdoms, towns, laws, lawVotes, councilMembers, townPolicies, townTreasuries, wars, characters, townResources, buildings } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { emitGovernanceEvent } from '../socket/events';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { logTownEvent } from '../services/history-logger';
import crypto from 'crypto';

const router = Router();

// --- Schemas ---

const proposeLawSchema = z.object({
  kingdomId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  effects: z.record(z.string(), z.unknown()).optional(),
  lawType: z.enum(['tax', 'trade', 'military', 'building', 'general']).default('general'),
  expiresAt: z.string().datetime().optional(),
});

const voteLawSchema = z.object({
  lawId: z.string().min(1),
  vote: z.enum(['for', 'against']),
});

const setTaxSchema = z.object({
  townId: z.string().min(1),
  taxRate: z.number().min(0).max(0.25),
});

const appointSchema = z.object({
  characterId: z.string().min(1),
  role: z.string().min(1),
  townId: z.string().optional(),
  kingdomId: z.string().optional(),
});

const allocateTreasurySchema = z.object({
  townId: z.string().optional(),
  kingdomId: z.string().optional(),
  amount: z.number().int().min(1),
  purpose: z.enum(['buildings', 'military', 'infrastructure', 'events']),
  details: z.record(z.string(), z.unknown()).optional(),
});

const declareWarSchema = z.object({
  targetKingdomId: z.string().min(1),
  reason: z.string().optional(),
});

const proposePeaceSchema = z.object({
  warId: z.string().min(1),
  terms: z.string().optional(),
});

// --- Helpers ---

// POST /propose-law
router.post('/propose-law', authGuard, characterGuard, requireTown, validate(proposeLawSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { kingdomId, title, description, effects, lawType, expiresAt } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    // Check if character is ruler of this kingdom or mayor of a town in it
    const kingdom = await db.query.kingdoms.findFirst({
      where: eq(kingdoms.id, kingdomId),
    });

    if (!kingdom) {
      return res.status(404).json({ error: 'Kingdom not found' });
    }

    const isRuler = kingdom.rulerId === character.id;
    const isMayor = await db.query.towns.findFirst({
      where: eq(towns.mayorId, character.id),
    });

    if (!isRuler && !isMayor) {
      return res.status(403).json({ error: 'Only rulers or mayors can propose laws' });
    }

    const [law] = await db.insert(laws).values({
      id: crypto.randomUUID(),
      kingdomId,
      title,
      description,
      effects: effects ?? {},
      enactedById: character.id,
      status: 'PROPOSED',
      lawType: lawType ?? 'general',
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    }).returning();

    // Fire-and-forget historical logging (log to character's home town)
    if (character.homeTownId) {
      logTownEvent(character.homeTownId, 'LAW', `Law Proposed: ${title}`, `${character.name} proposed a ${lawType ?? 'general'} law: ${title}`, character.id).catch(() => {});
    }

    return res.status(201).json({ law });
  } catch (error) {
    if (handleDbError(error, res, 'governance-propose-law', req)) return;
    logRouteError(req, 500, 'Propose law error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /vote-law
router.post('/vote-law', authGuard, characterGuard, requireTown, validate(voteLawSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lawId, vote } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const law = await db.query.laws.findFirst({
      where: eq(laws.id, lawId),
    });

    if (!law) {
      return res.status(404).json({ error: 'Law not found' });
    }

    if (law.status !== 'PROPOSED' && law.status !== 'VOTING') {
      return res.status(400).json({ error: 'Law is not open for voting' });
    }

    // Check if character is a council member for this kingdom
    const councilMember = await db.query.councilMembers.findFirst({
      where: and(eq(councilMembers.characterId, character.id), eq(councilMembers.kingdomId, law.kingdomId)),
    });

    // Also allow the ruler to vote
    const kingdom = await db.query.kingdoms.findFirst({
      where: eq(kingdoms.id, law.kingdomId),
    });

    if (!councilMember && kingdom?.rulerId !== character.id) {
      return res.status(403).json({ error: 'Only council members and the ruler can vote on laws' });
    }

    // Check for existing vote (prevent vote stuffing)
    const existingVote = await db.query.lawVotes.findFirst({
      where: and(eq(lawVotes.lawId, lawId), eq(lawVotes.characterId, character.id)),
    });

    if (existingVote) {
      return res.status(400).json({ error: 'You have already voted on this law' });
    }

    // Record the vote
    await db.insert(lawVotes).values({
      id: crypto.randomUUID(),
      lawId,
      characterId: character.id,
      vote: vote === 'for' ? 'FOR' : 'AGAINST',
    });

    // Recalculate vote counts from LawVote records
    const [forResult] = await db.select({ value: count() }).from(lawVotes)
      .where(and(eq(lawVotes.lawId, lawId), eq(lawVotes.vote, 'FOR')));
    const [againstResult] = await db.select({ value: count() }).from(lawVotes)
      .where(and(eq(lawVotes.lawId, lawId), eq(lawVotes.vote, 'AGAINST')));
    const votesFor = forResult.value;
    const votesAgainst = againstResult.value;

    const [updatedLaw] = await db.update(laws)
      .set({ status: 'VOTING', votesFor, votesAgainst })
      .where(eq(laws.id, lawId))
      .returning();

    // Auto-activate if enough votes (simple majority: votesFor > votesAgainst and at least 3 total votes)
    const totalVotes = updatedLaw.votesFor + updatedLaw.votesAgainst;
    if (totalVotes >= 3 && updatedLaw.votesFor > updatedLaw.votesAgainst) {
      await db.update(laws)
        .set({ status: 'ACTIVE', enactedAt: new Date().toISOString() })
        .where(eq(laws.id, lawId));

      emitGovernanceEvent('governance:law-passed', `kingdom:${law.kingdomId}`, {
        lawId: law.id,
        title: law.title,
        lawType: law.lawType,
        kingdomId: law.kingdomId,
      });
    }

    return res.json({ law: updatedLaw });
  } catch (error) {
    if (handleDbError(error, res, 'governance-vote-law', req)) return;
    logRouteError(req, 500, 'Vote law error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /set-tax
router.post('/set-tax', authGuard, characterGuard, requireTown, validate(setTaxSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, taxRate } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const town = await db.query.towns.findFirst({
      where: eq(towns.id, townId),
    });

    if (!town) {
      return res.status(404).json({ error: 'Town not found' });
    }

    if (town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can set the tax rate' });
    }

    // Upsert townPolicy
    const existingPolicy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
    });
    let policy;
    if (existingPolicy) {
      [policy] = await db.update(townPolicies).set({ taxRate }).where(eq(townPolicies.townId, townId)).returning();
    } else {
      [policy] = await db.insert(townPolicies).values({ id: crypto.randomUUID(), townId, taxRate }).returning();
    }

    // P1 #35: Sync tax rate to TownTreasury so all readers see consistent value
    const existingTreasury = await db.query.townTreasuries.findFirst({
      where: eq(townTreasuries.townId, townId),
    });
    if (existingTreasury) {
      await db.update(townTreasuries).set({ taxRate }).where(eq(townTreasuries.townId, townId));
    } else {
      await db.insert(townTreasuries).values({ id: crypto.randomUUID(), townId, taxRate });
    }

    emitGovernanceEvent('governance:tax-changed', `town:${townId}`, {
      townId,
      taxRate,
      setBy: character.name,
    });

    // Fire-and-forget historical logging
    logTownEvent(townId, 'LAW', `Tax Rate Changed to ${Math.round(taxRate * 100)}%`, `${character.name} set the tax rate to ${Math.round(taxRate * 100)}%.`, character.id).catch(() => {});

    return res.json({ policy });
  } catch (error) {
    if (handleDbError(error, res, 'governance-set-tax', req)) return;
    logRouteError(req, 500, 'Set tax error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /laws
router.get('/laws', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const kingdomId = req.query.kingdomId as string | undefined;
    const status = req.query.status as 'PROPOSED' | 'VOTING' | 'ACTIVE' | 'REJECTED' | 'EXPIRED' | undefined;

    if (!kingdomId) {
      return res.status(400).json({ error: 'kingdomId is required' });
    }

    const conditions = [eq(laws.kingdomId, kingdomId)];
    if (status) conditions.push(eq(laws.status, status));

    const lawRows = await db.query.laws.findMany({
      where: and(...conditions),
      with: {
        character: { columns: { id: true, name: true } },
      },
      orderBy: desc(laws.proposedAt),
    });

    return res.json({
      laws: lawRows.map(l => ({
        ...l,
        enactedBy: l.character,
        character: undefined,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'governance-get-laws', req)) return;
    logRouteError(req, 500, 'Get laws error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /town-info/:townId
router.get('/town-info/:townId', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const townRow = await db.query.towns.findFirst({
      where: eq(towns.id, townId),
      with: {
        character: { columns: { id: true, name: true, level: true } }, // mayor
        region: { columns: { kingdomId: true } },
        townTreasuries: true,
        townPolicies: {
          with: {
            character: { columns: { id: true, name: true, level: true } }, // sheriff
          },
        },
        councilMembers: {
          with: {
            character_characterId: { columns: { id: true, name: true, level: true } },
          },
        },
        townResources: {
          columns: { resourceType: true, abundance: true },
        },
        buildings: {
          columns: { id: true, level: true },
        },
      },
    });

    if (!townRow) {
      return res.status(404).json({ error: 'Town not found' });
    }

    const treasury = townRow.townTreasuries[0] ?? null;
    const policy = townRow.townPolicies[0] ?? null;
    const features = (townRow.features && !Array.isArray(townRow.features))
      ? townRow.features as { availableBuildings?: string[]; specialty?: string; prosperityLevel?: number }
      : null;
    const usedSlots = townRow.buildings.filter(b => b.level >= 1).length;

    return res.json({
      town: {
        id: townRow.id,
        name: townRow.name,
        population: townRow.population,
        treasury: treasury?.balance ?? 0,
        taxRate: treasury?.taxRate ?? 0.10,
        // P1 #25: Provide kingdomId from region so client doesn't hardcode it
        kingdomId: townRow.region?.kingdomId ?? null,
        mayor: townRow.character, // mayor via towns.mayorId
        policy: policy ? {
          ...policy,
          sheriff: policy.character, // sheriff via townPolicies.sheriffId
        } : null,
        council: townRow.councilMembers.map(cm => ({
          id: cm.id,
          role: cm.role,
          character: cm.character_characterId,
          appointedAt: cm.appointedAt,
        })),
        buildingPermits: policy?.buildingPermits ?? true,
        tradePolicy: policy?.tradePolicy ?? {},
        features,
        resources: townRow.townResources.map(r => ({
          resourceType: r.resourceType,
          abundance: r.abundance,
        })),
        buildingCapacity: {
          used: usedSlots,
          total: Math.max(20, Math.floor(townRow.population / 100)),
        },
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'governance-town-info', req)) return;
    logRouteError(req, 500, 'Town info error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /appoint
router.post('/appoint', authGuard, characterGuard, requireTown, validate(appointSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { characterId, role, townId, kingdomId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    if (!townId && !kingdomId) {
      return res.status(400).json({ error: 'Either townId or kingdomId is required' });
    }

    // Sheriff appointment by mayor
    if (townId && role === 'sheriff') {
      const town = await db.query.towns.findFirst({ where: eq(towns.id, townId) });
      if (!town || town.mayorId !== character.id) {
        return res.status(403).json({ error: 'Only the mayor can appoint a sheriff' });
      }

      const targetChar = await db.query.characters.findFirst({ where: eq(characters.id, characterId) });
      if (!targetChar || targetChar.currentTownId !== townId) {
        return res.status(400).json({ error: 'Target character must be in this town' });
      }

      // Upsert townPolicy for sheriff
      const existingPolicy = await db.query.townPolicies.findFirst({ where: eq(townPolicies.townId, townId) });
      let policy;
      if (existingPolicy) {
        [policy] = await db.update(townPolicies).set({ sheriffId: characterId }).where(eq(townPolicies.townId, townId)).returning();
      } else {
        [policy] = await db.insert(townPolicies).values({ id: crypto.randomUUID(), townId, sheriffId: characterId }).returning();
      }

      return res.json({ message: `${targetChar.name} appointed as sheriff`, policy });
    }

    // Council appointment by ruler or mayor
    if (kingdomId) {
      const kingdom = await db.query.kingdoms.findFirst({ where: eq(kingdoms.id, kingdomId) });
      if (!kingdom || kingdom.rulerId !== character.id) {
        return res.status(403).json({ error: 'Only the ruler can appoint kingdom council members' });
      }
    }

    if (townId && role !== 'sheriff') {
      const town = await db.query.towns.findFirst({ where: eq(towns.id, townId) });
      if (!town || town.mayorId !== character.id) {
        return res.status(403).json({ error: 'Only the mayor can appoint town council members' });
      }
    }

    const [newCouncilMember] = await db.insert(councilMembers).values({
      id: crypto.randomUUID(),
      kingdomId: kingdomId ?? null,
      townId: townId ?? null,
      characterId,
      role,
      appointedById: character.id,
    }).returning();

    // Fetch with character relation for response
    const councilMemberWithChar = await db.query.councilMembers.findFirst({
      where: eq(councilMembers.id, newCouncilMember.id),
      with: {
        character_characterId: { columns: { id: true, name: true } },
      },
    });

    return res.status(201).json({
      councilMember: councilMemberWithChar ? {
        ...councilMemberWithChar,
        character: councilMemberWithChar.character_characterId,
        character_characterId: undefined,
      } : newCouncilMember,
    });
  } catch (error) {
    if (handleDbError(error, res, 'governance-appoint', req)) return;
    logRouteError(req, 500, 'Appoint error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /allocate-treasury
router.post('/allocate-treasury', authGuard, characterGuard, requireTown, validate(allocateTreasurySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, kingdomId, amount, purpose, details } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    if (!townId && !kingdomId) {
      return res.status(400).json({ error: 'Either townId or kingdomId is required' });
    }

    if (townId) {
      const town = await db.query.towns.findFirst({
        where: eq(towns.id, townId),
        with: { townTreasuries: true },
      });
      if (!town) {
        return res.status(404).json({ error: 'Town not found' });
      }
      if (town.mayorId !== character.id) {
        return res.status(403).json({ error: 'Only the mayor can allocate town treasury' });
      }
      const treasury = town.townTreasuries[0] ?? null;
      const balance = treasury?.balance ?? 0;
      if (balance < amount) {
        return res.status(400).json({ error: `Insufficient treasury. Available: ${balance}` });
      }

      await db.update(townTreasuries)
        .set({ balance: sql`${townTreasuries.balance} - ${amount}` })
        .where(eq(townTreasuries.townId, townId));

      return res.json({
        message: `Allocated ${amount} gold from town treasury for ${purpose}`,
        remainingTreasury: balance - amount,
        purpose,
        details,
      });
    }

    if (kingdomId) {
      const kingdom = await db.query.kingdoms.findFirst({ where: eq(kingdoms.id, kingdomId) });
      if (!kingdom) {
        return res.status(404).json({ error: 'Kingdom not found' });
      }
      if (kingdom.rulerId !== character.id) {
        return res.status(403).json({ error: 'Only the ruler can allocate kingdom treasury' });
      }
      if (kingdom.treasury < amount) {
        return res.status(400).json({ error: `Insufficient treasury. Available: ${kingdom.treasury}` });
      }

      await db.update(kingdoms)
        .set({ treasury: sql`${kingdoms.treasury} - ${amount}` })
        .where(eq(kingdoms.id, kingdomId));

      return res.json({
        message: `Allocated ${amount} gold from kingdom treasury for ${purpose}`,
        remainingTreasury: kingdom.treasury - amount,
        purpose,
        details,
      });
    }
  } catch (error) {
    if (handleDbError(error, res, 'governance-allocate-treasury', req)) return;
    logRouteError(req, 500, 'Allocate treasury error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /declare-war
router.post('/declare-war', authGuard, characterGuard, requireTown, validate(declareWarSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetKingdomId, reason } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const attackerKingdom = await db.query.kingdoms.findFirst({
      where: eq(kingdoms.rulerId, character.id),
    });

    if (!attackerKingdom) {
      return res.status(403).json({ error: 'Only a ruler can declare war' });
    }

    if (attackerKingdom.id === targetKingdomId) {
      return res.status(400).json({ error: 'Cannot declare war on your own kingdom' });
    }

    const targetKingdom = await db.query.kingdoms.findFirst({
      where: eq(kingdoms.id, targetKingdomId),
    });

    if (!targetKingdom) {
      return res.status(404).json({ error: 'Target kingdom not found' });
    }

    // Check for existing active war between these kingdoms
    const existingWar = await db.query.wars.findFirst({
      where: and(
        eq(wars.status, 'ACTIVE'),
        or(
          and(eq(wars.attackerKingdomId, attackerKingdom.id), eq(wars.defenderKingdomId, targetKingdomId)),
          and(eq(wars.attackerKingdomId, targetKingdomId), eq(wars.defenderKingdomId, attackerKingdom.id)),
        ),
      ),
    });

    if (existingWar) {
      return res.status(400).json({ error: 'Already at war with this kingdom' });
    }

    const [newWar] = await db.insert(wars).values({
      id: crypto.randomUUID(),
      attackerKingdomId: attackerKingdom.id,
      defenderKingdomId: targetKingdomId,
      status: 'ACTIVE',
    }).returning();

    // Fetch with relations for response
    const war = await db.query.wars.findFirst({
      where: eq(wars.id, newWar.id),
      with: {
        kingdom_attackerKingdomId: { columns: { id: true, name: true } },
        kingdom_defenderKingdomId: { columns: { id: true, name: true } },
      },
    });

    const attackerInfo = war?.kingdom_attackerKingdomId;
    const defenderInfo = war?.kingdom_defenderKingdomId;

    emitGovernanceEvent('governance:war-declared', `kingdom:${attackerKingdom.id}`, {
      warId: newWar.id,
      attacker: attackerInfo,
      defender: defenderInfo,
      reason,
    });
    emitGovernanceEvent('governance:war-declared', `kingdom:${targetKingdomId}`, {
      warId: newWar.id,
      attacker: attackerInfo,
      defender: defenderInfo,
      reason,
    });

    return res.status(201).json({
      war: {
        ...newWar,
        attackerKingdom: attackerInfo,
        defenderKingdom: defenderInfo,
      },
      reason,
    });
  } catch (error) {
    if (handleDbError(error, res, 'governance-declare-war', req)) return;
    logRouteError(req, 500, 'Declare war error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /propose-peace
router.post('/propose-peace', authGuard, characterGuard, requireTown, validate(proposePeaceSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { warId, terms } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const war = await db.query.wars.findFirst({
      where: eq(wars.id, warId),
      with: {
        kingdom_attackerKingdomId: true,
        kingdom_defenderKingdomId: true,
      },
    });

    if (!war) {
      return res.status(404).json({ error: 'War not found' });
    }

    if (war.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'War is not active' });
    }

    // Only rulers of involved kingdoms can propose peace
    const isAttackerRuler = war.kingdom_attackerKingdomId.rulerId === character.id;
    const isDefenderRuler = war.kingdom_defenderKingdomId.rulerId === character.id;

    if (!isAttackerRuler && !isDefenderRuler) {
      return res.status(403).json({ error: 'Only rulers of warring kingdoms can propose peace' });
    }

    // For simplicity, peace proposal immediately ends the war
    await db.update(wars)
      .set({ status: 'PEACE_PROPOSED' })
      .where(eq(wars.id, warId));

    // Fetch updated war with relations for response
    const updatedWar = await db.query.wars.findFirst({
      where: eq(wars.id, warId),
      with: {
        kingdom_attackerKingdomId: { columns: { id: true, name: true } },
        kingdom_defenderKingdomId: { columns: { id: true, name: true } },
      },
    });

    const attackerInfo = updatedWar?.kingdom_attackerKingdomId;
    const defenderInfo = updatedWar?.kingdom_defenderKingdomId;

    emitGovernanceEvent('governance:peace-proposed', `kingdom:${war.attackerKingdomId}`, {
      warId: war.id,
      proposedBy: isAttackerRuler ? 'attacker' : 'defender',
      attacker: attackerInfo,
      defender: defenderInfo,
      terms,
    });
    emitGovernanceEvent('governance:peace-proposed', `kingdom:${war.defenderKingdomId}`, {
      warId: war.id,
      proposedBy: isAttackerRuler ? 'attacker' : 'defender',
      attacker: attackerInfo,
      defender: defenderInfo,
      terms,
    });

    return res.json({
      war: {
        ...updatedWar,
        attackerKingdom: attackerInfo,
        defenderKingdom: defenderInfo,
        kingdom_attackerKingdomId: undefined,
        kingdom_defenderKingdomId: undefined,
      },
      terms,
    });
  } catch (error) {
    if (handleDbError(error, res, 'governance-propose-peace', req)) return;
    logRouteError(req, 500, 'Propose peace error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /kingdom/:kingdomId
router.get('/kingdom/:kingdomId', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { kingdomId } = req.params;

    const kingdom = await db.query.kingdoms.findFirst({
      where: eq(kingdoms.id, kingdomId),
      with: {
        character: { columns: { id: true, name: true, level: true } }, // ruler
        laws: {
          with: {
            character: { columns: { id: true, name: true } }, // enactedBy
          },
        },
        wars_attackerKingdomId: {
          with: {
            kingdom_defenderKingdomId: { columns: { id: true, name: true } },
          },
        },
        wars_defenderKingdomId: {
          with: {
            kingdom_attackerKingdomId: { columns: { id: true, name: true } },
          },
        },
        councilMembers: {
          with: {
            character_characterId: { columns: { id: true, name: true, level: true } },
          },
        },
      },
    });

    if (!kingdom) {
      return res.status(404).json({ error: 'Kingdom not found' });
    }

    // Filter active laws and wars in application code (Drizzle with: doesn't support where)
    const activeLaws = kingdom.laws
      .filter(l => l.status === 'ACTIVE')
      .sort((a, b) => (b.enactedAt ? new Date(b.enactedAt).getTime() : 0) - (a.enactedAt ? new Date(a.enactedAt).getTime() : 0))
      .map(l => ({ ...l, enactedBy: l.character, character: undefined }));

    const activeWarsAttacking = kingdom.wars_attackerKingdomId
      .filter(w => w.status === 'ACTIVE')
      .map(w => ({
        id: w.id,
        role: 'attacker' as const,
        opponent: w.kingdom_defenderKingdomId,
        startedAt: w.startedAt,
      }));

    const activeWarsDefending = kingdom.wars_defenderKingdomId
      .filter(w => w.status === 'ACTIVE')
      .map(w => ({
        id: w.id,
        role: 'defender' as const,
        opponent: w.kingdom_attackerKingdomId,
        startedAt: w.startedAt,
      }));

    return res.json({
      kingdom: {
        id: kingdom.id,
        name: kingdom.name,
        treasury: kingdom.treasury,
        ruler: kingdom.character, // ruler via kingdoms.rulerId
        activeLaws,
        activeWars: [...activeWarsAttacking, ...activeWarsDefending],
        council: kingdom.councilMembers.map(cm => ({
          id: cm.id,
          role: cm.role,
          character: cm.character_characterId,
          appointedAt: cm.appointedAt,
        })),
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'governance-kingdom-info', req)) return;
    logRouteError(req, 500, 'Kingdom info error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
