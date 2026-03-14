import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, or, desc, sql, count, lte } from 'drizzle-orm';
import { kingdoms, towns, laws, lawVotes, councilMembers, townPolicies, townTreasuries, wars, characters, townResources, buildings, townProjects, travelRoutes, townMetrics, townUpgrades, itemPriceCeilings, itemTemplates } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { emitGovernanceEvent } from '../socket/events';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { logTownEvent } from '../services/history-logger';
import { PROJECT_TYPES, EMERGENCY_SPENDING_TYPES, SHERIFF_PATROL_CONFIG, MAX_CONCURRENT_PROJECTS, MAX_EMERGENCY_PER_DAY, UPGRADE_TYPES, DEGRADATION_THRESHOLD_DAYS, type ProjectType, type EmergencySpendingType, type UpgradeType } from '@shared/data/town-projects-config';
import { TRADE_POLICY_CONFIG, TOWN_LAW_TYPES, type TownLawType } from '@shared/data/trade-policy-config';
import { getTownUpgradeEffects } from '../services/town-upgrades';
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

    // Town laws (kingdomId null) don't go through voting
    if (!law.kingdomId) {
      return res.status(400).json({ error: 'Town laws are not subject to council voting' });
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
          total: Math.max(20, Math.floor(townRow.population / 100)) + ((policy?.tradePolicy as any)?.buildingCapacityBonus ?? 0) + ((policy?.tradePolicy as any)?.upgradeCapacityBonus ?? 0),
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

// =============================================================================
// TOWN PROJECTS
// =============================================================================

const commissionProjectSchema = z.object({
  townId: z.string().min(1),
  projectType: z.string().min(1),
  targetRouteId: z.string().optional(),
});

const cancelProjectSchema = z.object({
  projectId: z.string().min(1),
});

const emergencySpendingSchema = z.object({
  townId: z.string().min(1),
  spendingType: z.string().min(1),
  targetMetric: z.string().optional(),
});

const sheriffPatrolSchema = z.object({
  townId: z.string().min(1),
  routeId: z.string().min(1),
});

const setSheriffBudgetSchema = z.object({
  townId: z.string().min(1),
  budget: z.number().int().min(SHERIFF_PATROL_CONFIG.minDailyBudget).max(SHERIFF_PATROL_CONFIG.maxDailyBudget),
});

// POST /commission-project — Mayor commissions a town project
router.post('/commission-project', authGuard, characterGuard, requireTown, validate(commissionProjectSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, projectType, targetRouteId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling.' });
    }

    // Verify project type
    const config = PROJECT_TYPES[projectType as ProjectType];
    if (!config) {
      return res.status(400).json({ error: 'Invalid project type' });
    }

    // Verify mayor
    const town = await db.query.towns.findFirst({
      where: eq(towns.id, townId),
      with: { townTreasuries: true },
    });
    if (!town) return res.status(404).json({ error: 'Town not found' });
    if (town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can commission projects' });
    }

    // Count active projects
    const activeProjects = await db.select({ cnt: count() })
      .from(townProjects)
      .where(and(eq(townProjects.townId, townId), eq(townProjects.status, 'IN_PROGRESS')));
    if ((activeProjects[0]?.cnt ?? 0) >= MAX_CONCURRENT_PROJECTS) {
      return res.status(400).json({ error: `Maximum ${MAX_CONCURRENT_PROJECTS} concurrent projects allowed` });
    }

    // Verify route if needed
    if ('requiresRouteSelection' in config && config.requiresRouteSelection) {
      if (!targetRouteId) {
        return res.status(400).json({ error: 'This project requires a route selection' });
      }
      const route = await db.query.travelRoutes.findFirst({
        where: and(
          eq(travelRoutes.id, targetRouteId),
          or(eq(travelRoutes.fromTownId, townId), eq(travelRoutes.toTownId, townId)),
        ),
      });
      if (!route) {
        return res.status(400).json({ error: 'Route must be adjacent to this town' });
      }
    }

    // Verify treasury
    const treasury = town.townTreasuries[0];
    const balance = treasury?.balance ?? 0;
    if (balance < config.cost) {
      return res.status(400).json({ error: `Insufficient treasury. Need ${config.cost}g, have ${balance}g` });
    }

    // Transaction: deduct cost + create project
    const now = new Date();
    const completesAt = new Date(now.getTime() + config.durationTicks * 24 * 60 * 60 * 1000);

    const [project] = await db.transaction(async (tx) => {
      await tx.update(townTreasuries)
        .set({ balance: sql`${townTreasuries.balance} - ${config.cost}` })
        .where(eq(townTreasuries.townId, townId));

      return tx.insert(townProjects).values({
        id: crypto.randomUUID(),
        townId,
        projectType,
        status: 'IN_PROGRESS',
        commissionedById: character.id,
        cost: config.cost,
        startedAt: now.toISOString(),
        completesAt: completesAt.toISOString(),
        targetRouteId: targetRouteId ?? null,
        metadata: config.effect as any,
      }).returning();
    });

    logTownEvent(townId, 'GOVERNANCE', `Project Commissioned: ${config.name}`, `Mayor ${character.name} commissioned ${config.name} for ${config.cost}g`, character.id).catch(() => {});

    return res.status(201).json({ project, config });
  } catch (error) {
    if (handleDbError(error, res, 'governance-commission-project', req)) return;
    logRouteError(req, 500, 'Commission project error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /cancel-project — Mayor cancels a project (no refund)
router.post('/cancel-project', authGuard, characterGuard, requireTown, validate(cancelProjectSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId } = req.body;
    const character = req.character!;

    const project = await db.query.townProjects.findFirst({
      where: eq(townProjects.id, projectId),
      with: { town: { columns: { id: true, mayorId: true } } },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can cancel projects' });
    }
    if (project.status !== 'IN_PROGRESS') {
      return res.status(400).json({ error: 'Only in-progress projects can be cancelled' });
    }

    await db.update(townProjects)
      .set({ status: 'CANCELLED' })
      .where(eq(townProjects.id, projectId));

    const config = PROJECT_TYPES[project.projectType as ProjectType];
    logTownEvent(project.townId, 'GOVERNANCE', `Project Cancelled: ${config?.name ?? project.projectType}`, `Mayor ${character.name} cancelled the project. No refund.`, character.id).catch(() => {});

    return res.json({ message: 'Project cancelled', projectId });
  } catch (error) {
    if (handleDbError(error, res, 'governance-cancel-project', req)) return;
    logRouteError(req, 500, 'Cancel project error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /projects/:townId — View town projects
router.get('/projects/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;
    const projects = await db.query.townProjects.findMany({
      where: eq(townProjects.townId, townId),
      with: {
        commissionedBy: { columns: { id: true, name: true } },
        targetRoute: { columns: { id: true, name: true, fromTownId: true, toTownId: true } },
      },
      orderBy: [desc(townProjects.startedAt)],
    });

    return res.json({
      projects: projects.map(p => ({
        ...p,
        config: PROJECT_TYPES[p.projectType as ProjectType] ?? null,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'governance-projects', req)) return;
    logRouteError(req, 500, 'Get projects error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// EMERGENCY SPENDING
// =============================================================================

// POST /emergency-spending — Mayor instant action
router.post('/emergency-spending', authGuard, characterGuard, requireTown, validate(emergencySpendingSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, spendingType, targetMetric } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling.' });
    }

    const config = EMERGENCY_SPENDING_TYPES[spendingType as EmergencySpendingType];
    if (!config) {
      return res.status(400).json({ error: 'Invalid spending type' });
    }

    // Verify mayor
    const town = await db.query.towns.findFirst({
      where: eq(towns.id, townId),
      with: { townTreasuries: true },
    });
    if (!town) return res.status(404).json({ error: 'Town not found' });
    if (town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can use emergency spending' });
    }

    // Check daily limit
    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
    });
    const tp = (policy?.tradePolicy as Record<string, any>) ?? {};
    const lastEmergency = tp.lastEmergencySpendingAt;
    if (lastEmergency) {
      const lastDate = new Date(lastEmergency).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      if (lastDate === today) {
        return res.status(400).json({ error: 'Emergency spending already used today (max 1/day)' });
      }
    }

    // Verify treasury
    const treasury = town.townTreasuries[0];
    const balance = treasury?.balance ?? 0;
    if (balance < config.cost) {
      return res.status(400).json({ error: `Insufficient treasury. Need ${config.cost}g, have ${balance}g` });
    }

    // Require metric for EMERGENCY_REPAIRS
    if (spendingType === 'EMERGENCY_REPAIRS' && !targetMetric) {
      return res.status(400).json({ error: 'Emergency repairs require a target metric' });
    }

    // Deduct cost
    await db.update(townTreasuries)
      .set({ balance: sql`${townTreasuries.balance} - ${config.cost}` })
      .where(eq(townTreasuries.townId, townId));

    // Track daily usage
    const updatedTp: Record<string, any> = { ...tp, lastEmergencySpendingAt: new Date().toISOString() };

    // Apply effect
    let effectDescription = '';
    if (spendingType === 'EMERGENCY_REPAIRS') {
      // +3 to selected metric's projectModifier
      await db.update(townMetrics)
        .set({
          projectModifier: sql`${townMetrics.projectModifier} + 3`,
          effectiveValue: sql`LEAST(100, GREATEST(0, ${townMetrics.baseValue} + ${townMetrics.modifier} + ${townMetrics.projectModifier} + 3))`,
          lastUpdatedBy: 'EMERGENCY',
        })
        .where(and(eq(townMetrics.townId, townId), eq(townMetrics.metricType, targetMetric!)));
      effectDescription = `+3 to ${targetMetric}`;
    } else if (spendingType === 'BONUS_GUARD_SHIFT') {
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const activePatrols = (updatedTp.activePatrols as any[] ?? []);
      activePatrols.push({
        routeId: 'ALL_ADJACENT',
        expiresAt,
        dangerReduction: 0.10,
        source: 'GUARD_SHIFT',
      });
      updatedTp.activePatrols = activePatrols;
      effectDescription = '-10% road danger on all adjacent routes for 3 days';
    } else if (spendingType === 'MARKET_STIMULUS') {
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      updatedTp.marketStimulus = { until: expiresAt, bonus: 0.05 };
      effectDescription = '+5% market bonus for 3 days';
    }

    await db.update(townPolicies)
      .set({ tradePolicy: updatedTp })
      .where(eq(townPolicies.townId, townId));

    logTownEvent(townId, 'GOVERNANCE', `Emergency Spending: ${config.name}`, `Mayor ${character.name} spent ${config.cost}g on ${config.name}. ${effectDescription}`, character.id).catch(() => {});

    return res.json({ message: `${config.name} applied`, effect: effectDescription, cost: config.cost });
  } catch (error) {
    if (handleDbError(error, res, 'governance-emergency-spending', req)) return;
    logRouteError(req, 500, 'Emergency spending error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// SHERIFF PATROLS
// =============================================================================

// POST /sheriff-patrol — Sheriff deploys emergency road patrol
router.post('/sheriff-patrol', authGuard, characterGuard, requireTown, validate(sheriffPatrolSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, routeId } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling.' });
    }

    // Verify sheriff
    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
    });
    if (!policy || policy.sheriffId !== character.id) {
      return res.status(403).json({ error: 'Only the appointed sheriff can deploy patrols' });
    }

    // Verify route is adjacent
    const route = await db.query.travelRoutes.findFirst({
      where: and(
        eq(travelRoutes.id, routeId),
        or(eq(travelRoutes.fromTownId, townId), eq(travelRoutes.toTownId, townId)),
      ),
    });
    if (!route) {
      return res.status(400).json({ error: 'Route must be adjacent to this town' });
    }

    // Calculate cost from route's nodeCount
    const cost = route.nodeCount * SHERIFF_PATROL_CONFIG.costPerNode;

    // Check budget
    if (policy.sheriffBudgetUsedToday + cost > policy.sheriffDailyBudget) {
      return res.status(400).json({
        error: `Insufficient budget. Need ${cost}g, remaining: ${policy.sheriffDailyBudget - policy.sheriffBudgetUsedToday}g`,
      });
    }

    // Check max active patrols
    const tp = (policy.tradePolicy as Record<string, any>) ?? {};
    const now = new Date().toISOString();
    const activePatrols = ((tp.activePatrols as any[]) ?? []).filter(
      (p: any) => p.source === 'SHERIFF' && new Date(p.expiresAt) > new Date(now)
    );
    if (activePatrols.length >= SHERIFF_PATROL_CONFIG.maxActivePatrols) {
      return res.status(400).json({ error: `Maximum ${SHERIFF_PATROL_CONFIG.maxActivePatrols} active sheriff patrols allowed` });
    }

    // Verify treasury has funds
    const treasury = await db.query.townTreasuries.findFirst({
      where: eq(townTreasuries.townId, townId),
    });
    if (!treasury || treasury.balance < cost) {
      return res.status(400).json({ error: `Insufficient town treasury. Need ${cost}g` });
    }

    // Apply: deduct budget, deduct treasury, store patrol
    const expiresAt = new Date(Date.now() + SHERIFF_PATROL_CONFIG.durationDays * 24 * 60 * 60 * 1000).toISOString();
    const allPatrols = (tp.activePatrols as any[] ?? []);
    allPatrols.push({
      routeId,
      expiresAt,
      dangerReduction: SHERIFF_PATROL_CONFIG.dangerReduction,
      source: 'SHERIFF',
    });

    await db.transaction(async (tx) => {
      await tx.update(townPolicies)
        .set({
          sheriffBudgetUsedToday: sql`${townPolicies.sheriffBudgetUsedToday} + ${cost}`,
          tradePolicy: { ...tp, activePatrols: allPatrols },
        })
        .where(eq(townPolicies.townId, townId));

      await tx.update(townTreasuries)
        .set({ balance: sql`${townTreasuries.balance} - ${cost}` })
        .where(eq(townTreasuries.townId, townId));
    });

    logTownEvent(townId, 'GOVERNANCE', `Sheriff Patrol Deployed`, `Sheriff ${character.name} deployed a patrol on ${route.name || 'route'} for ${cost}g (${SHERIFF_PATROL_CONFIG.durationDays} days)`, character.id).catch(() => {});

    return res.json({
      message: 'Patrol deployed',
      patrol: { routeId, routeName: route.name, cost, expiresAt, dangerReduction: SHERIFF_PATROL_CONFIG.dangerReduction },
    });
  } catch (error) {
    if (handleDbError(error, res, 'governance-sheriff-patrol', req)) return;
    logRouteError(req, 500, 'Sheriff patrol error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /set-sheriff-budget — Mayor sets sheriff daily budget
router.post('/set-sheriff-budget', authGuard, characterGuard, requireTown, validate(setSheriffBudgetSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, budget } = req.body;
    const character = req.character!;

    const town = await db.query.towns.findFirst({ where: eq(towns.id, townId) });
    if (!town) return res.status(404).json({ error: 'Town not found' });
    if (town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can set the sheriff budget' });
    }

    await db.update(townPolicies)
      .set({ sheriffDailyBudget: budget })
      .where(eq(townPolicies.townId, townId));

    return res.json({ message: `Sheriff daily budget set to ${budget}g`, budget });
  } catch (error) {
    if (handleDbError(error, res, 'governance-set-sheriff-budget', req)) return;
    logRouteError(req, 500, 'Set sheriff budget error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sheriff-status/:townId — View sheriff info + active patrols
router.get('/sheriff-status/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const policy = await db.query.townPolicies.findFirst({
      where: eq(townPolicies.townId, townId),
      with: {
        character: { columns: { id: true, name: true } }, // sheriff
      },
    });

    if (!policy) {
      return res.json({ sheriff: null, budget: 0, budgetUsed: 0, patrols: [] });
    }

    const tp = (policy.tradePolicy as Record<string, any>) ?? {};
    const now = new Date();
    const activePatrols = ((tp.activePatrols as any[]) ?? []).filter(
      (p: any) => new Date(p.expiresAt) > now
    );

    return res.json({
      sheriff: policy.character ?? null,
      budget: policy.sheriffDailyBudget,
      budgetUsed: policy.sheriffBudgetUsedToday,
      patrols: activePatrols,
    });
  } catch (error) {
    if (handleDbError(error, res, 'governance-sheriff-status', req)) return;
    logRouteError(req, 500, 'Sheriff status error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ══════════════════════════════════════════════════════════════
// Town Upgrades (G2) — Purchase, View, Downgrade
// ══════════════════════════════════════════════════════════════

const purchaseUpgradeSchema = z.object({
  townId: z.string().min(1),
  upgradeType: z.enum(['PROSPERITY', 'BUILDING_CAPACITY', 'ROAD_NETWORK']),
});

const downgradeUpgradeSchema = z.object({
  townId: z.string().min(1),
  upgradeType: z.enum(['PROSPERITY', 'BUILDING_CAPACITY', 'ROAD_NETWORK']),
});

// POST /purchase-upgrade — Mayor purchases or upgrades a town upgrade
router.post('/purchase-upgrade', authGuard, characterGuard, requireTown, validate(purchaseUpgradeSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, upgradeType } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling.' });
    }

    // Verify mayor
    const town = await db.query.towns.findFirst({
      where: eq(towns.id, townId),
      with: { townTreasuries: true },
    });
    if (!town) return res.status(404).json({ error: 'Town not found' });
    if (town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can purchase upgrades' });
    }

    const typeConfig = UPGRADE_TYPES[upgradeType as UpgradeType];
    if (!typeConfig) return res.status(400).json({ error: 'Invalid upgrade type' });

    // Check existing upgrade
    const existing = await db.select().from(townUpgrades).where(
      and(eq(townUpgrades.townId, townId), eq(townUpgrades.upgradeType, upgradeType))
    );
    const current = existing[0];

    let cost: number;
    let newTier: number;
    let isRestore = false;

    if (!current) {
      // New purchase — Tier 1
      newTier = 1;
      cost = typeConfig.tiers[1].cost;
    } else if (current.status === 'DEGRADING') {
      // Restore — pay current tier cost, reset degrading
      newTier = current.tier;
      cost = typeConfig.tiers[current.tier as 1 | 2 | 3].cost;
      isRestore = true;
    } else if (current.tier >= 3) {
      return res.status(400).json({ error: 'Already at maximum tier' });
    } else {
      // Upgrade to next tier
      newTier = current.tier + 1;
      cost = typeConfig.tiers[newTier as 1 | 2 | 3].cost;
    }

    // Verify treasury
    const treasury = town.townTreasuries[0];
    const balance = treasury?.balance ?? 0;
    if (balance < cost) {
      return res.status(400).json({ error: `Insufficient treasury. Need ${cost}g, have ${balance}g` });
    }

    const tierConfig = typeConfig.tiers[newTier as 1 | 2 | 3];

    // Transaction: deduct cost, upsert upgrade, apply effects
    const [upgrade] = await db.transaction(async (tx) => {
      // Deduct cost
      await tx.update(townTreasuries)
        .set({ balance: sql`${townTreasuries.balance} - ${cost}` })
        .where(eq(townTreasuries.townId, townId));

      // Apply effect deltas for metrics bonus
      const oldTier = current?.tier ?? 0;
      const oldEffects = oldTier > 0 ? (typeConfig.tiers[oldTier as 1 | 2 | 3]?.effects ?? {}) : {};
      const newEffects = tierConfig.effects;
      const oldMetricsBonus = ('allMetricsBonus' in oldEffects ? (oldEffects as any).allMetricsBonus : 0) as number;
      const newMetricsBonus = ('allMetricsBonus' in newEffects ? (newEffects as any).allMetricsBonus : 0) as number;
      const metricsDelta = newMetricsBonus - (isRestore ? 0 : oldMetricsBonus);

      // Apply metrics bonus delta via projectModifier (only if changing and not already at this tier)
      if (metricsDelta !== 0) {
        await tx.update(townMetrics)
          .set({
            projectModifier: sql`${townMetrics.projectModifier} + ${metricsDelta}`,
            effectiveValue: sql`LEAST(100, GREATEST(0, ${townMetrics.baseValue} + ${townMetrics.projectModifier} + ${metricsDelta} + ${townMetrics.modifier}))`,
          })
          .where(eq(townMetrics.townId, townId));
      }

      // Apply building capacity delta
      const oldSlots = ('buildingSlots' in oldEffects ? (oldEffects as any).buildingSlots : 0) as number;
      const newSlots = ('buildingSlots' in newEffects ? (newEffects as any).buildingSlots : 0) as number;
      const slotsDelta = newSlots - (isRestore ? 0 : oldSlots);
      if (slotsDelta !== 0) {
        const policy = await tx.query.townPolicies.findFirst({ where: eq(townPolicies.townId, townId) });
        if (policy) {
          const tp = (policy.tradePolicy as Record<string, any>) ?? {};
          tp.upgradeCapacityBonus = (tp.upgradeCapacityBonus ?? 0) + slotsDelta;
          await tx.update(townPolicies).set({ tradePolicy: tp }).where(eq(townPolicies.townId, townId));
        }
      }

      // Apply road network to tradePolicy
      const oldTravel = ('travelTimeReduction' in oldEffects ? (oldEffects as any).travelTimeReduction : 0) as number;
      const newTravel = ('travelTimeReduction' in newEffects ? (newEffects as any).travelTimeReduction : 0) as number;
      const oldDanger = ('roadDangerReduction' in oldEffects ? (oldEffects as any).roadDangerReduction : 0) as number;
      const newDanger = ('roadDangerReduction' in newEffects ? (newEffects as any).roadDangerReduction : 0) as number;
      if (newTravel !== oldTravel || newDanger !== oldDanger || isRestore) {
        const policy = await tx.query.townPolicies.findFirst({ where: eq(townPolicies.townId, townId) });
        if (policy) {
          const tp = (policy.tradePolicy as Record<string, any>) ?? {};
          tp.roadNetworkUpgrade = { travelTimeReduction: newTravel, roadDangerReduction: newDanger };
          await tx.update(townPolicies).set({ tradePolicy: tp }).where(eq(townPolicies.townId, townId));
        }
      }

      // Upsert upgrade row
      if (!current) {
        return tx.insert(townUpgrades).values({
          id: crypto.randomUUID(),
          townId,
          upgradeType,
          tier: newTier,
          status: 'ACTIVE',
          dailyMaintenance: tierConfig.maintenance,
          degradingDays: 0,
          purchasedById: character.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }).returning();
      } else {
        return tx.update(townUpgrades)
          .set({
            tier: newTier,
            status: 'ACTIVE',
            dailyMaintenance: tierConfig.maintenance,
            degradingDays: 0,
            purchasedById: character.id,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(townUpgrades.id, current.id))
          .returning();
      }
    });

    const action = isRestore ? 'Restored' : (!current ? 'Purchased' : 'Upgraded');
    logTownEvent(townId, 'GOVERNANCE', `Upgrade ${action}: ${typeConfig.name} Tier ${newTier}`, `Mayor ${character.name} ${action.toLowerCase()} ${typeConfig.name} to Tier ${newTier} for ${cost}g`, character.id).catch(() => {});

    return res.status(201).json({ upgrade, cost, action });
  } catch (error) {
    if (handleDbError(error, res, 'governance-purchase-upgrade', req)) return;
    logRouteError(req, 500, 'Purchase upgrade error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /upgrades/:townId — View all upgrades for a town
router.get('/upgrades/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const upgrades = await db.select().from(townUpgrades).where(eq(townUpgrades.townId, townId));

    // Enrich with config details
    const enriched = upgrades.map(u => {
      const typeConfig = UPGRADE_TYPES[u.upgradeType as UpgradeType];
      const tierConfig = typeConfig?.tiers[u.tier as 1 | 2 | 3];
      return {
        ...u,
        name: typeConfig?.name ?? u.upgradeType,
        description: typeConfig?.description ?? '',
        effects: tierConfig?.effects ?? {},
        nextTier: u.tier < 3 ? {
          tier: u.tier + 1,
          cost: typeConfig?.tiers[(u.tier + 1) as 1 | 2 | 3]?.cost ?? 0,
          maintenance: typeConfig?.tiers[(u.tier + 1) as 1 | 2 | 3]?.maintenance ?? 0,
          effects: typeConfig?.tiers[(u.tier + 1) as 1 | 2 | 3]?.effects ?? {},
        } : null,
      };
    });

    // Include available upgrade types not yet purchased
    const purchasedTypes = new Set(upgrades.map(u => u.upgradeType));
    const available = Object.entries(UPGRADE_TYPES)
      .filter(([key]) => !purchasedTypes.has(key))
      .map(([key, config]) => ({
        upgradeType: key,
        name: config.name,
        description: config.description,
        tier1Cost: config.tiers[1].cost,
        tier1Maintenance: config.tiers[1].maintenance,
        tier1Effects: config.tiers[1].effects,
      }));

    // Compute total maintenance
    const totalMaintenance = upgrades.reduce((sum, u) => sum + u.dailyMaintenance, 0);

    return res.json({ upgrades: enriched, available, totalMaintenance });
  } catch (error) {
    if (handleDbError(error, res, 'governance-upgrades', req)) return;
    logRouteError(req, 500, 'View upgrades error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /downgrade-upgrade — Mayor voluntarily downgrades (no refund)
router.post('/downgrade-upgrade', authGuard, characterGuard, requireTown, validate(downgradeUpgradeSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, upgradeType } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling.' });
    }

    // Verify mayor
    const town = await db.query.towns.findFirst({ where: eq(towns.id, townId) });
    if (!town) return res.status(404).json({ error: 'Town not found' });
    if (town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can downgrade upgrades' });
    }

    const typeConfig = UPGRADE_TYPES[upgradeType as UpgradeType];
    if (!typeConfig) return res.status(400).json({ error: 'Invalid upgrade type' });

    const existing = await db.select().from(townUpgrades).where(
      and(eq(townUpgrades.townId, townId), eq(townUpgrades.upgradeType, upgradeType))
    );
    const current = existing[0];
    if (!current) {
      return res.status(400).json({ error: 'No upgrade of this type exists' });
    }

    const oldTier = current.tier;
    const oldEffects = typeConfig.tiers[oldTier as 1 | 2 | 3].effects;

    await db.transaction(async (tx) => {
      if (oldTier <= 1) {
        // Remove entirely
        await tx.delete(townUpgrades).where(eq(townUpgrades.id, current.id));
      } else {
        const newTier = oldTier - 1;
        const newTierConfig = typeConfig.tiers[newTier as 1 | 2 | 3];
        await tx.update(townUpgrades).set({
          tier: newTier,
          dailyMaintenance: newTierConfig.maintenance,
          degradingDays: 0,
          status: 'ACTIVE',
          updatedAt: new Date().toISOString(),
        }).where(eq(townUpgrades.id, current.id));
      }

      // Revert effects delta
      const newTier = oldTier <= 1 ? 0 : oldTier - 1;
      const newEffects = newTier > 0 ? (typeConfig.tiers[newTier as 1 | 2 | 3]?.effects ?? {}) : {};

      // Metrics delta
      const oldMetrics = ('allMetricsBonus' in oldEffects ? (oldEffects as any).allMetricsBonus : 0) as number;
      const newMetrics = ('allMetricsBonus' in newEffects ? (newEffects as any).allMetricsBonus : 0) as number;
      const metricsDelta = newMetrics - oldMetrics;
      if (metricsDelta !== 0) {
        await tx.update(townMetrics).set({
          projectModifier: sql`${townMetrics.projectModifier} + ${metricsDelta}`,
          effectiveValue: sql`LEAST(100, GREATEST(0, ${townMetrics.baseValue} + ${townMetrics.projectModifier} + ${metricsDelta} + ${townMetrics.modifier}))`,
        }).where(eq(townMetrics.townId, townId));
      }

      // Building capacity delta
      const oldSlots = ('buildingSlots' in oldEffects ? (oldEffects as any).buildingSlots : 0) as number;
      const newSlots = ('buildingSlots' in newEffects ? (newEffects as any).buildingSlots : 0) as number;
      const slotsDelta = newSlots - oldSlots;
      if (slotsDelta !== 0) {
        const policy = await tx.query.townPolicies.findFirst({ where: eq(townPolicies.townId, townId) });
        if (policy) {
          const tp = (policy.tradePolicy as Record<string, any>) ?? {};
          tp.upgradeCapacityBonus = Math.max(0, (tp.upgradeCapacityBonus ?? 0) + slotsDelta);
          await tx.update(townPolicies).set({ tradePolicy: tp }).where(eq(townPolicies.townId, townId));
        }
      }

      // Road network
      if (newTier === 0) {
        const policy = await tx.query.townPolicies.findFirst({ where: eq(townPolicies.townId, townId) });
        if (policy) {
          const tp = (policy.tradePolicy as Record<string, any>) ?? {};
          delete tp.roadNetworkUpgrade;
          await tx.update(townPolicies).set({ tradePolicy: tp }).where(eq(townPolicies.townId, townId));
        }
      } else {
        const newRoadEffects = typeConfig.tiers[newTier as 1 | 2 | 3]?.effects ?? {};
        const newTravel = ('travelTimeReduction' in newRoadEffects ? (newRoadEffects as any).travelTimeReduction : 0) as number;
        const newDanger = ('roadDangerReduction' in newRoadEffects ? (newRoadEffects as any).roadDangerReduction : 0) as number;
        if (newTravel > 0 || newDanger > 0) {
          const policy = await tx.query.townPolicies.findFirst({ where: eq(townPolicies.townId, townId) });
          if (policy) {
            const tp = (policy.tradePolicy as Record<string, any>) ?? {};
            tp.roadNetworkUpgrade = { travelTimeReduction: newTravel, roadDangerReduction: newDanger };
            await tx.update(townPolicies).set({ tradePolicy: tp }).where(eq(townPolicies.townId, townId));
          }
        }
      }
    });

    const action = oldTier <= 1 ? 'removed' : `downgraded to Tier ${oldTier - 1}`;
    logTownEvent(townId, 'GOVERNANCE', `Upgrade Downgraded: ${typeConfig.name}`, `Mayor ${character.name} ${action} ${typeConfig.name}. No refund.`, character.id).catch(() => {});

    return res.json({ message: `${typeConfig.name} ${action}` });
  } catch (error) {
    if (handleDbError(error, res, 'governance-downgrade-upgrade', req)) return;
    logRouteError(req, 500, 'Downgrade upgrade error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ══════════════════════════════════════════════════════════════
// G3 — Trade Policies, Price Ceilings, Market Rules, Town Laws
// ══════════════════════════════════════════════════════════════

const setSecularTariffSchema = z.object({
  townId: z.string().min(1),
  rate: z.number().min(TRADE_POLICY_CONFIG.minSecularTariff).max(TRADE_POLICY_CONFIG.maxSecularTariff),
});

const setPriceCeilingSchema = z.object({
  townId: z.string().min(1),
  itemTemplateId: z.string().min(1),
  maxPrice: z.number().int().min(1),
});

const removePriceCeilingSchema = z.object({
  townId: z.string().min(1),
  itemTemplateId: z.string().min(1),
});

const setMarketRulesSchema = z.object({
  townId: z.string().min(1),
  minListingPrice: z.number().int().min(0).optional(),
  maxListingQuantity: z.number().int().min(0).max(TRADE_POLICY_CONFIG.maxListingQuantityLimit).optional(),
});

const enactTownLawSchema = z.object({
  townId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  lawType: z.enum(TOWN_LAW_TYPES as unknown as [string, ...string[]]).default('GENERAL'),
  effects: z.record(z.string(), z.unknown()).optional(),
});

const repealTownLawSchema = z.object({
  lawId: z.string().min(1),
});

// POST /set-secular-tariff — Mayor sets visitor tariff (0-15%)
router.post('/set-secular-tariff', authGuard, characterGuard, requireTown, validate(setSecularTariffSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, rate } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling.' });
    }

    const town = await db.query.towns.findFirst({ where: eq(towns.id, townId) });
    if (!town) return res.status(404).json({ error: 'Town not found' });
    if (town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can set tariffs' });
    }

    const policy = await db.query.townPolicies.findFirst({ where: eq(townPolicies.townId, townId) });
    if (policy) {
      const tp = (policy.tradePolicy as Record<string, any>) ?? {};
      tp.secularTariffRate = rate;
      await db.update(townPolicies).set({ tradePolicy: tp }).where(eq(townPolicies.townId, townId));
    }

    logTownEvent(townId, 'GOVERNANCE', `Secular Tariff Set: ${(rate * 100).toFixed(0)}%`, `Mayor ${character.name} set the visitor tariff to ${(rate * 100).toFixed(0)}%`, character.id).catch(() => {});

    return res.json({ secularTariffRate: rate });
  } catch (error) {
    if (handleDbError(error, res, 'governance-set-secular-tariff', req)) return;
    logRouteError(req, 500, 'Set secular tariff error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /set-price-ceiling — Mayor sets max price for an item
router.post('/set-price-ceiling', authGuard, characterGuard, requireTown, validate(setPriceCeilingSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, itemTemplateId, maxPrice } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling.' });
    }

    const town = await db.query.towns.findFirst({ where: eq(towns.id, townId) });
    if (!town) return res.status(404).json({ error: 'Town not found' });
    if (town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can set price ceilings' });
    }

    // Verify item template exists
    const template = await db.query.itemTemplates.findFirst({ where: eq(itemTemplates.id, itemTemplateId), columns: { id: true, name: true } });
    if (!template) return res.status(404).json({ error: 'Item not found' });

    // Upsert
    const existing = await db.select().from(itemPriceCeilings).where(
      and(eq(itemPriceCeilings.townId, townId), eq(itemPriceCeilings.itemTemplateId, itemTemplateId))
    );

    let ceiling;
    if (existing[0]) {
      [ceiling] = await db.update(itemPriceCeilings)
        .set({ maxPrice, setById: character.id })
        .where(eq(itemPriceCeilings.id, existing[0].id))
        .returning();
    } else {
      [ceiling] = await db.insert(itemPriceCeilings).values({
        id: crypto.randomUUID(),
        townId,
        itemTemplateId,
        maxPrice,
        setById: character.id,
      }).returning();
    }

    logTownEvent(townId, 'GOVERNANCE', `Price Ceiling Set: ${template.name}`, `Mayor ${character.name} set max price for ${template.name} to ${maxPrice}g`, character.id).catch(() => {});

    return res.status(201).json({ ceiling, itemName: template.name });
  } catch (error) {
    if (handleDbError(error, res, 'governance-set-price-ceiling', req)) return;
    logRouteError(req, 500, 'Set price ceiling error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /remove-price-ceiling — Mayor removes a price ceiling
router.delete('/remove-price-ceiling', authGuard, characterGuard, requireTown, validate(removePriceCeilingSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, itemTemplateId } = req.body;
    const character = req.character!;

    const town = await db.query.towns.findFirst({ where: eq(towns.id, townId) });
    if (!town) return res.status(404).json({ error: 'Town not found' });
    if (town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can remove price ceilings' });
    }

    const result = await db.delete(itemPriceCeilings).where(
      and(eq(itemPriceCeilings.townId, townId), eq(itemPriceCeilings.itemTemplateId, itemTemplateId))
    );

    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ error: 'Price ceiling not found' });
    }

    logTownEvent(townId, 'GOVERNANCE', 'Price Ceiling Removed', `Mayor ${character.name} removed a price ceiling`, character.id).catch(() => {});

    return res.json({ message: 'Price ceiling removed' });
  } catch (error) {
    if (handleDbError(error, res, 'governance-remove-price-ceiling', req)) return;
    logRouteError(req, 500, 'Remove price ceiling error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /price-ceilings/:townId — View all price ceilings
router.get('/price-ceilings/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const ceilings = await db.select({
      id: itemPriceCeilings.id,
      itemTemplateId: itemPriceCeilings.itemTemplateId,
      itemName: itemTemplates.name,
      maxPrice: itemPriceCeilings.maxPrice,
      createdAt: itemPriceCeilings.createdAt,
    }).from(itemPriceCeilings)
      .innerJoin(itemTemplates, eq(itemPriceCeilings.itemTemplateId, itemTemplates.id))
      .where(eq(itemPriceCeilings.townId, townId));

    return res.json({ ceilings });
  } catch (error) {
    if (handleDbError(error, res, 'governance-price-ceilings', req)) return;
    logRouteError(req, 500, 'View price ceilings error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /set-market-rules — Mayor sets listing floor and quantity cap
router.post('/set-market-rules', authGuard, characterGuard, requireTown, validate(setMarketRulesSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, minListingPrice, maxListingQuantity } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling.' });
    }

    const town = await db.query.towns.findFirst({ where: eq(towns.id, townId) });
    if (!town) return res.status(404).json({ error: 'Town not found' });
    if (town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can set market rules' });
    }

    const policy = await db.query.townPolicies.findFirst({ where: eq(townPolicies.townId, townId) });
    if (policy) {
      const tp = (policy.tradePolicy as Record<string, any>) ?? {};
      if (minListingPrice !== undefined) tp.minListingPrice = minListingPrice;
      if (maxListingQuantity !== undefined) tp.maxListingQuantity = maxListingQuantity;
      await db.update(townPolicies).set({ tradePolicy: tp }).where(eq(townPolicies.townId, townId));
    }

    logTownEvent(townId, 'GOVERNANCE', 'Market Rules Updated', `Mayor ${character.name} updated market rules`, character.id).catch(() => {});

    return res.json({ minListingPrice: minListingPrice ?? 0, maxListingQuantity: maxListingQuantity ?? 0 });
  } catch (error) {
    if (handleDbError(error, res, 'governance-set-market-rules', req)) return;
    logRouteError(req, 500, 'Set market rules error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /enact-town-law — Mayor enacts a local law (executive, no vote)
router.post('/enact-town-law', authGuard, characterGuard, requireTown, validate(enactTownLawSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId, title, description, lawType, effects } = req.body;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling.' });
    }

    const town = await db.query.towns.findFirst({ where: eq(towns.id, townId) });
    if (!town) return res.status(404).json({ error: 'Town not found' });
    if (town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can enact town laws' });
    }

    // Check max active town laws
    const activeCount = await db.select({ cnt: count() })
      .from(laws)
      .where(and(eq(laws.townId, townId), eq(laws.status, 'ACTIVE')));
    if ((activeCount[0]?.cnt ?? 0) >= TRADE_POLICY_CONFIG.maxActiveTownLaws) {
      return res.status(400).json({ error: `Maximum ${TRADE_POLICY_CONFIG.maxActiveTownLaws} active town laws allowed` });
    }

    // TODO: Solimene referendums can override town laws. When a referendum passes with
    // policyType: 'repeal_law', it should set the targeted law to REPEALED. Implementation
    // deferred — the referendum system would need a new policyType.

    const [law] = await db.insert(laws).values({
      id: crypto.randomUUID(),
      townId,
      kingdomId: null,
      title,
      description: description ?? null,
      lawType: lawType ?? 'GENERAL',
      effects: effects ?? {},
      enactedById: character.id,
      enactedAt: new Date().toISOString(),
      proposedAt: new Date().toISOString(),
      status: 'ACTIVE',
      votesFor: 0,
      votesAgainst: 0,
      updatedAt: new Date().toISOString(),
    }).returning();

    logTownEvent(townId, 'GOVERNANCE', `Town Law Enacted: ${title}`, `Mayor ${character.name} enacted town law: ${title}`, character.id).catch(() => {});

    return res.status(201).json({ law });
  } catch (error) {
    if (handleDbError(error, res, 'governance-enact-town-law', req)) return;
    logRouteError(req, 500, 'Enact town law error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /repeal-town-law — Mayor repeals a town law
router.post('/repeal-town-law', authGuard, characterGuard, requireTown, validate(repealTownLawSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { lawId } = req.body;
    const character = req.character!;

    const law = await db.query.laws.findFirst({ where: eq(laws.id, lawId) });
    if (!law) return res.status(404).json({ error: 'Law not found' });
    if (!law.townId) return res.status(400).json({ error: 'This is not a town law' });
    if (law.status !== 'ACTIVE') return res.status(400).json({ error: 'Law is not active' });

    const town = await db.query.towns.findFirst({ where: eq(towns.id, law.townId) });
    if (!town || town.mayorId !== character.id) {
      return res.status(403).json({ error: 'Only the mayor can repeal town laws' });
    }

    await db.update(laws)
      .set({ status: 'REPEALED', updatedAt: new Date().toISOString() })
      .where(eq(laws.id, lawId));

    logTownEvent(law.townId, 'GOVERNANCE', `Town Law Repealed: ${law.title}`, `Mayor ${character.name} repealed town law: ${law.title}`, character.id).catch(() => {});

    return res.json({ message: `Law "${law.title}" repealed` });
  } catch (error) {
    if (handleDbError(error, res, 'governance-repeal-town-law', req)) return;
    logRouteError(req, 500, 'Repeal town law error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /town-laws/:townId — View town laws (ACTIVE + REPEALED)
router.get('/town-laws/:townId', authGuard, characterGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { townId } = req.params;

    const townLaws = await db.query.laws.findMany({
      where: eq(laws.townId, townId),
      with: {
        character: { columns: { id: true, name: true } },
      },
      orderBy: [desc(laws.enactedAt)],
    });

    return res.json({
      laws: townLaws.map(l => ({
        id: l.id,
        title: l.title,
        description: l.description,
        lawType: l.lawType,
        status: l.status,
        effects: l.effects,
        enactedBy: l.character,
        enactedAt: l.enactedAt,
      })),
    });
  } catch (error) {
    if (handleDbError(error, res, 'governance-town-laws', req)) return;
    logRouteError(req, 500, 'View town laws error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
