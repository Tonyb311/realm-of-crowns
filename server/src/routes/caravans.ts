import { Router, Response } from 'express';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, or } from 'drizzle-orm';
import { caravans, characters, inventories, items, itemTemplates, playerProfessions, travelRoutes } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard, requireTown } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import { addProfessionXP } from '../services/profession-xp';
import { emitNotification } from '../socket/events';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import crypto from 'crypto';
import { isTownReleased } from '../lib/content-release';
import { sql } from 'drizzle-orm';
import {
  CARAVAN_TYPES,
  ESCORT_TYPES,
  INSURANCE_OPTIONS,
  FIGHT_BASE_SUCCESS,
  RANSOM_COST_FRACTION,
  FLEE_CARGO_LOSS_FRACTION,
  CaravanType,
  EscortType,
  InsuranceCoverage,
  AmbushChoice,
} from '@shared/data/caravans/types';

const router = Router();

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createSchema = z.object({
  fromTownId: z.string().min(1),
  toTownId: z.string().min(1),
  caravanType: z.enum(['HANDCART', 'WAGON', 'LARGE_WAGON', 'TRADE_CONVOY']),
});

const loadSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1),
});

const unloadSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(1),
});

const hireEscortSchema = z.object({
  escortType: z.enum(['SCOUT', 'MERCENARY', 'ELITE_GUARD']),
});

const insureSchema = z.object({
  coverage: z.enum(['BASIC', 'STANDARD', 'PREMIUM']),
});

const resolveAmbushSchema = z.object({
  choice: z.enum(['fight', 'ransom', 'flee']),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getMerchantLevel(characterId: string): Promise<number> {
  const prof = await db.query.playerProfessions.findFirst({
    where: and(eq(playerProfessions.characterId, characterId), eq(playerProfessions.professionType, 'MERCHANT')),
  });
  return prof?.level ?? 0;
}

interface CargoItem {
  itemId: string;
  quantity: number;
  itemName: string;
  unitValue: number;
}

function parseCargo(raw: unknown): CargoItem[] {
  if (!Array.isArray(raw)) return [];
  return raw as CargoItem[];
}

function totalCargoQuantity(cargo: CargoItem[]): number {
  return cargo.reduce((sum, c) => sum + c.quantity, 0);
}

function totalCargoValue(cargo: CargoItem[]): number {
  return cargo.reduce((sum, c) => sum + c.unitValue * c.quantity, 0);
}

interface CaravanMeta {
  caravanType: CaravanType;
  escort?: EscortType;
  insurance?: InsuranceCoverage;
}

function parseMeta(caravan: { cargo: unknown }): { cargo: CargoItem[]; meta: CaravanMeta } {
  // cargo JSON is an array. We store meta in a special first-element or alongside.
  // Actually, we store meta as a top-level JSON field would be ideal, but the schema
  // only has `cargo Json`. We'll use a convention: cargo is { meta: {...}, items: [...] }
  const raw = caravan.cargo as any;
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'items' in raw) {
    return {
      cargo: Array.isArray(raw.items) ? raw.items : [],
      meta: raw.meta ?? { caravanType: 'HANDCART' },
    };
  }
  // Legacy: plain array
  return { cargo: Array.isArray(raw) ? raw : [], meta: { caravanType: 'HANDCART' } };
}

function serializeCargo(items: CargoItem[], meta: CaravanMeta): object {
  return { meta, items };
}

// ---------------------------------------------------------------------------
// POST /api/caravans/create
// ---------------------------------------------------------------------------

router.post('/create', authGuard, characterGuard, requireTown, validate(createSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fromTownId, toTownId, caravanType } = req.body as {
      fromTownId: string; toTownId: string; caravanType: CaravanType;
    };
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    if (character.currentTownId !== fromTownId) {
      return res.status(400).json({ error: 'You must be in the departure town' });
    }

    if (fromTownId === toTownId) {
      return res.status(400).json({ error: 'Origin and destination must differ' });
    }

    // Content gating: reject caravans to unreleased destinations
    if (!(await isTownReleased(toTownId))) {
      return res.status(400).json({ error: 'This destination is not yet available' });
    }

    const typeDef = CARAVAN_TYPES[caravanType];

    // Check merchant level requirement
    if (typeDef.merchantLevelRequired > 0) {
      const merchantLevel = await getMerchantLevel(character.id);
      if (merchantLevel < typeDef.merchantLevelRequired) {
        return res.status(400).json({
          error: `Requires Merchant level ${typeDef.merchantLevelRequired}. You are level ${merchantLevel}.`,
        });
      }
    }

    // Verify route exists
    const route = await db.query.travelRoutes.findFirst({
      where: or(
        and(eq(travelRoutes.fromTownId, fromTownId), eq(travelRoutes.toTownId, toTownId)),
        and(eq(travelRoutes.fromTownId, toTownId), eq(travelRoutes.toTownId, fromTownId)),
      ),
    });
    if (!route) {
      return res.status(400).json({ error: 'No route exists between these towns' });
    }

    const meta: CaravanMeta = { caravanType };

    const [caravan] = await db.insert(caravans).values({
      id: crypto.randomUUID(),
      ownerId: character.id,
      fromTownId,
      toTownId,
      cargo: serializeCargo([], meta),
      status: 'PENDING',
    }).returning();

    // Fetch related towns for response
    const caravanWithTowns = await db.query.caravans.findFirst({
      where: eq(caravans.id, caravan.id),
      with: {
        town_fromTownId: true,
        town_toTownId: true,
      },
    });

    return res.status(201).json({
      caravan: {
        id: caravan.id,
        caravanType: typeDef.type,
        caravanName: typeDef.name,
        capacity: typeDef.capacity,
        cost: typeDef.cost,
        speedMultiplier: typeDef.speedMultiplier,
        from: caravanWithTowns?.town_fromTownId ? { id: caravanWithTowns.town_fromTownId.id, name: caravanWithTowns.town_fromTownId.name } : null,
        to: caravanWithTowns?.town_toTownId ? { id: caravanWithTowns.town_toTownId.id, name: caravanWithTowns.town_toTownId.name } : null,
        cargo: [],
        status: caravan.status,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'caravan-create', req)) return;
    logRouteError(req, 500, 'Caravan create error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/caravans/:caravanId/load
// ---------------------------------------------------------------------------

router.post('/:caravanId/load', authGuard, characterGuard, requireTown, validate(loadSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caravanId } = req.params;
    const { itemId, quantity } = req.body as { itemId: string; quantity: number };
    const character = req.character!;

    const caravan = await db.query.caravans.findFirst({ where: eq(caravans.id, caravanId) });
    if (!caravan) return res.status(404).json({ error: 'Caravan not found' });
    if (caravan.ownerId !== character.id) return res.status(403).json({ error: 'Not your caravan' });
    if (caravan.status !== 'PENDING') return res.status(400).json({ error: 'Can only load while caravan is pending' });

    const { cargo, meta } = parseMeta(caravan);
    const typeDef = CARAVAN_TYPES[meta.caravanType];
    const currentCount = totalCargoQuantity(cargo);

    if (currentCount + quantity > typeDef.capacity) {
      return res.status(400).json({
        error: `Exceeds capacity. ${typeDef.capacity - currentCount} slots remaining.`,
      });
    }

    // Find item in player inventory
    const invEntry = await db.query.inventories.findFirst({
      where: and(eq(inventories.characterId, character.id), eq(inventories.itemId, itemId)),
      with: { item: { with: { itemTemplate: true } } },
    });
    if (!invEntry) return res.status(404).json({ error: 'Item not in inventory' });
    if (invEntry.quantity < quantity) {
      return res.status(400).json({ error: `Only ${invEntry.quantity} available` });
    }

    // Estimate unit value from template stats or a base price field
    const unitValue = (invEntry.item.itemTemplate.stats as any)?.basePrice ?? 10;

    // Update cargo
    const existing = cargo.find(c => c.itemId === itemId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cargo.push({ itemId, quantity, itemName: invEntry.item.itemTemplate.name, unitValue });
    }

    await db.transaction(async (tx) => {
      // Remove from inventory
      if (invEntry.quantity === quantity) {
        await tx.delete(inventories).where(eq(inventories.id, invEntry.id));
      } else {
        await tx.update(inventories).set({ quantity: sql`${inventories.quantity} - ${quantity}` }).where(eq(inventories.id, invEntry.id));
      }
      // Update caravan cargo
      await tx.update(caravans).set({ cargo: serializeCargo(cargo, meta) }).where(eq(caravans.id, caravanId));
    });

    return res.json({ cargo, totalItems: totalCargoQuantity(cargo), capacity: typeDef.capacity });
  } catch (error) {
    if (handleDbError(error, res, 'caravan-load', req)) return;
    logRouteError(req, 500, 'Caravan load error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/caravans/:caravanId/unload
// ---------------------------------------------------------------------------

router.post('/:caravanId/unload', authGuard, characterGuard, requireTown, validate(unloadSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caravanId } = req.params;
    const { itemId, quantity } = req.body as { itemId: string; quantity: number };
    const character = req.character!;

    const caravan = await db.query.caravans.findFirst({ where: eq(caravans.id, caravanId) });
    if (!caravan) return res.status(404).json({ error: 'Caravan not found' });
    if (caravan.ownerId !== character.id) return res.status(403).json({ error: 'Not your caravan' });
    if (caravan.status !== 'PENDING') return res.status(400).json({ error: 'Can only unload while caravan is pending' });

    const { cargo, meta } = parseMeta(caravan);
    const entry = cargo.find(c => c.itemId === itemId);
    if (!entry) return res.status(404).json({ error: 'Item not in cargo' });
    if (entry.quantity < quantity) return res.status(400).json({ error: `Only ${entry.quantity} in cargo` });

    // Update cargo
    entry.quantity -= quantity;
    const updatedCargo = cargo.filter(c => c.quantity > 0);

    await db.transaction(async (tx) => {
      // Return items to inventory
      const existingInv = await tx.query.inventories.findFirst({
        where: and(eq(inventories.characterId, character.id), eq(inventories.itemId, itemId)),
      });
      if (existingInv) {
        await tx.update(inventories).set({ quantity: sql`${inventories.quantity} + ${quantity}` }).where(eq(inventories.id, existingInv.id));
      } else {
        await tx.insert(inventories).values({ id: crypto.randomUUID(), characterId: character.id, itemId, quantity });
      }
      await tx.update(caravans).set({ cargo: serializeCargo(updatedCargo, meta) }).where(eq(caravans.id, caravanId));
    });

    const typeDef = CARAVAN_TYPES[meta.caravanType];
    return res.json({ cargo: updatedCargo, totalItems: totalCargoQuantity(updatedCargo), capacity: typeDef.capacity });
  } catch (error) {
    if (handleDbError(error, res, 'caravan-unload', req)) return;
    logRouteError(req, 500, 'Caravan unload error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/caravans/:caravanId/hire-escort
// ---------------------------------------------------------------------------

router.post('/:caravanId/hire-escort', authGuard, characterGuard, requireTown, validate(hireEscortSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caravanId } = req.params;
    const { escortType } = req.body as { escortType: EscortType };
    const character = req.character!;

    const caravan = await db.query.caravans.findFirst({ where: eq(caravans.id, caravanId) });
    if (!caravan) return res.status(404).json({ error: 'Caravan not found' });
    if (caravan.ownerId !== character.id) return res.status(403).json({ error: 'Not your caravan' });
    if (caravan.status !== 'PENDING') return res.status(400).json({ error: 'Can only hire escorts before departure' });

    const escortDef = ESCORT_TYPES[escortType];
    if (character.gold < escortDef.cost) {
      return res.status(400).json({ error: `Not enough gold. Need ${escortDef.cost}, have ${character.gold}` });
    }

    const { cargo, meta } = parseMeta(caravan);
    meta.escort = escortType;

    await db.transaction(async (tx) => {
      await tx.update(characters).set({ gold: sql`${characters.gold} - ${escortDef.cost}` }).where(eq(characters.id, character.id));
      await tx.update(caravans).set({ cargo: serializeCargo(cargo, meta) }).where(eq(caravans.id, caravanId));
    });

    return res.json({
      escort: escortDef,
      remainingGold: character.gold - escortDef.cost,
    });
  } catch (error) {
    if (handleDbError(error, res, 'caravan-hire-escort', req)) return;
    logRouteError(req, 500, 'Caravan hire-escort error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/caravans/:caravanId/insure
// ---------------------------------------------------------------------------

router.post('/:caravanId/insure', authGuard, characterGuard, requireTown, validate(insureSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caravanId } = req.params;
    const { coverage } = req.body as { coverage: InsuranceCoverage };
    const character = req.character!;

    const caravan = await db.query.caravans.findFirst({ where: eq(caravans.id, caravanId) });
    if (!caravan) return res.status(404).json({ error: 'Caravan not found' });
    if (caravan.ownerId !== character.id) return res.status(403).json({ error: 'Not your caravan' });
    if (caravan.status !== 'PENDING') return res.status(400).json({ error: 'Can only insure before departure' });

    const { cargo, meta } = parseMeta(caravan);
    const cargoValue = totalCargoValue(cargo);
    if (cargoValue === 0) return res.status(400).json({ error: 'Load cargo before insuring' });

    const insuranceDef = INSURANCE_OPTIONS[coverage];
    const premium = Math.ceil(cargoValue * insuranceDef.premiumRate);

    if (character.gold < premium) {
      return res.status(400).json({ error: `Premium is ${premium}g. You have ${character.gold}g.` });
    }

    meta.insurance = coverage;

    await db.transaction(async (tx) => {
      await tx.update(characters).set({ gold: sql`${characters.gold} - ${premium}` }).where(eq(characters.id, character.id));
      await tx.update(caravans).set({ cargo: serializeCargo(cargo, meta) }).where(eq(caravans.id, caravanId));
    });

    return res.json({
      insurance: insuranceDef,
      premium,
      cargoValue,
      remainingGold: character.gold - premium,
    });
  } catch (error) {
    if (handleDbError(error, res, 'caravan-insure', req)) return;
    logRouteError(req, 500, 'Caravan insure error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/caravans/:caravanId/depart
// ---------------------------------------------------------------------------

router.post('/:caravanId/depart', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caravanId } = req.params;
    const character = req.character!;

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    const caravan = await db.query.caravans.findFirst({
      where: eq(caravans.id, caravanId),
      with: {
        town_fromTownId: true,
        town_toTownId: true,
      },
    });
    if (!caravan) return res.status(404).json({ error: 'Caravan not found' });
    if (caravan.ownerId !== character.id) return res.status(403).json({ error: 'Not your caravan' });
    if (caravan.status !== 'PENDING') return res.status(400).json({ error: 'Caravan already departed or completed' });

    const { cargo, meta } = parseMeta(caravan);
    if (cargo.length === 0) return res.status(400).json({ error: 'Load cargo before departing' });

    const typeDef = CARAVAN_TYPES[meta.caravanType];

    if (character.gold < typeDef.cost) {
      return res.status(400).json({ error: `Need ${typeDef.cost}g for the ${typeDef.name}. You have ${character.gold}g.` });
    }

    // Find route for travel time calculation
    const route = await db.query.travelRoutes.findFirst({
      where: or(
        and(eq(travelRoutes.fromTownId, caravan.fromTownId), eq(travelRoutes.toTownId, caravan.toTownId)),
        and(eq(travelRoutes.fromTownId, caravan.toTownId), eq(travelRoutes.toTownId, caravan.fromTownId)),
      ),
    });
    if (!route) return res.status(400).json({ error: 'Route no longer exists' });

    const now = new Date();
    // Travel time: nodeCount * 5 (min equivalent) * speedMultiplier converted to ms
    const travelMs = route.nodeCount * 5 * typeDef.speedMultiplier * 60 * 1000;
    const arrivesAt = new Date(now.getTime() + travelMs);

    await db.transaction(async (tx) => {
      await tx.update(characters).set({ gold: sql`${characters.gold} - ${typeDef.cost}` }).where(eq(characters.id, character.id));
      await tx.update(caravans).set({ status: 'IN_PROGRESS', departedAt: now.toISOString(), arrivesAt: arrivesAt.toISOString() }).where(eq(caravans.id, caravanId));
    });

    // Emit socket event
    emitNotification(character.id, {
      id: `caravan-departed-${caravanId}`,
      type: 'caravan:departed',
      title: 'Caravan Departed',
      message: `Your ${typeDef.name} is on its way to ${caravan.town_toTownId.name}.`,
      data: { caravanId, toTownId: caravan.toTownId, arrivesAt: arrivesAt.toISOString() },
    });

    return res.json({
      caravan: {
        id: caravanId,
        status: 'IN_PROGRESS',
        departedAt: now.toISOString(),
        arrivesAt: arrivesAt.toISOString(),
        travelMinutes: Math.ceil(route.nodeCount * 5 * typeDef.speedMultiplier),
        from: { id: caravan.town_fromTownId.id, name: caravan.town_fromTownId.name },
        to: { id: caravan.town_toTownId.id, name: caravan.town_toTownId.name },
        cost: typeDef.cost,
        remainingGold: character.gold - typeDef.cost,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'caravan-depart', req)) return;
    logRouteError(req, 500, 'Caravan depart error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/caravans/mine
// ---------------------------------------------------------------------------

router.get('/mine', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const character = req.character!;

    const allCaravans = await db.query.caravans.findMany({
      where: eq(caravans.ownerId, character.id),
      with: {
        town_fromTownId: true,
        town_toTownId: true,
      },
      orderBy: (c, { desc }) => [desc(c.createdAt)],
    });

    const now = new Date();

    return res.json({
      caravans: allCaravans.map(c => {
        const { cargo, meta } = parseMeta(c);
        const typeDef = CARAVAN_TYPES[meta.caravanType];
        const progress = c.status === 'IN_PROGRESS' && c.departedAt && c.arrivesAt
          ? Math.min(100, Math.round(((now.getTime() - new Date(c.departedAt).getTime()) / (new Date(c.arrivesAt).getTime() - new Date(c.departedAt).getTime())) * 100))
          : c.status === 'COMPLETED' ? 100 : 0;

        return {
          id: c.id,
          caravanType: meta.caravanType,
          caravanName: typeDef.name,
          from: { id: c.town_fromTownId.id, name: c.town_fromTownId.name },
          to: { id: c.town_toTownId.id, name: c.town_toTownId.name },
          cargo,
          totalItems: totalCargoQuantity(cargo),
          capacity: typeDef.capacity,
          status: c.status,
          escort: meta.escort ?? null,
          insurance: meta.insurance ?? null,
          departedAt: c.departedAt ?? null,
          arrivesAt: c.arrivesAt ?? null,
          progress,
        };
      }),
    });
  } catch (error) {
    if (handleDbError(error, res, 'caravan-mine', req)) return;
    logRouteError(req, 500, 'Caravan mine error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/caravans/:caravanId
// ---------------------------------------------------------------------------

router.get('/:caravanId', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caravanId } = req.params;
    const character = req.character!;

    const caravan = await db.query.caravans.findFirst({
      where: eq(caravans.id, caravanId),
      with: {
        town_fromTownId: true,
        town_toTownId: true,
      },
    });
    if (!caravan) return res.status(404).json({ error: 'Caravan not found' });
    if (caravan.ownerId !== character.id) return res.status(403).json({ error: 'Not your caravan' });

    const { cargo, meta } = parseMeta(caravan);
    const typeDef = CARAVAN_TYPES[meta.caravanType];
    const now = new Date();

    let progress = 0;
    let remainingMinutes: number | null = null;

    if (caravan.status === 'IN_PROGRESS' && caravan.departedAt && caravan.arrivesAt) {
      const totalMs = new Date(caravan.arrivesAt).getTime() - new Date(caravan.departedAt).getTime();
      const elapsedMs = now.getTime() - new Date(caravan.departedAt).getTime();
      progress = Math.min(100, Math.round((elapsedMs / totalMs) * 100));
      remainingMinutes = Math.max(0, Math.ceil((new Date(caravan.arrivesAt).getTime() - now.getTime()) / 60000));
    } else if (caravan.status === 'COMPLETED') {
      progress = 100;
    }

    return res.json({
      caravan: {
        id: caravan.id,
        caravanType: meta.caravanType,
        caravanName: typeDef.name,
        capacity: typeDef.capacity,
        from: { id: caravan.town_fromTownId.id, name: caravan.town_fromTownId.name },
        to: { id: caravan.town_toTownId.id, name: caravan.town_toTownId.name },
        cargo,
        totalItems: totalCargoQuantity(cargo),
        cargoValue: totalCargoValue(cargo),
        status: caravan.status,
        escort: meta.escort ?? null,
        insurance: meta.insurance ?? null,
        departedAt: caravan.departedAt ?? null,
        arrivesAt: caravan.arrivesAt ?? null,
        progress,
        remainingMinutes,
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'caravan-detail', req)) return;
    logRouteError(req, 500, 'Caravan detail error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/caravans/:caravanId/collect
// ---------------------------------------------------------------------------

router.post('/:caravanId/collect', authGuard, characterGuard, requireTown, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caravanId } = req.params;
    const character = req.character!;

    const caravan = await db.query.caravans.findFirst({
      where: eq(caravans.id, caravanId),
      with: { town_toTownId: true },
    });
    if (!caravan) return res.status(404).json({ error: 'Caravan not found' });
    if (caravan.ownerId !== character.id) return res.status(403).json({ error: 'Not your caravan' });
    if (caravan.status !== 'IN_PROGRESS') return res.status(400).json({ error: 'Caravan is not in transit' });

    if (!caravan.arrivesAt || new Date(caravan.arrivesAt) > new Date()) {
      return res.status(400).json({ error: 'Caravan has not arrived yet' });
    }

    // P1 #32 FIX: Verify character is in the destination town before collecting
    if (character.currentTownId !== caravan.toTownId) {
      return res.status(400).json({ error: 'You must be in the destination town to collect goods' });
    }

    const { cargo, meta } = parseMeta(caravan);
    const cargoValue = totalCargoValue(cargo);

    // Deposit all cargo items into player inventory at destination (upserts)
    await db.transaction(async (tx) => {
      for (const item of cargo) {
        const existingInv = await tx.query.inventories.findFirst({
          where: and(eq(inventories.characterId, character.id), eq(inventories.itemId, item.itemId)),
        });
        if (existingInv) {
          await tx.update(inventories).set({ quantity: sql`${inventories.quantity} + ${item.quantity}` }).where(eq(inventories.id, existingInv.id));
        } else {
          await tx.insert(inventories).values({ id: crypto.randomUUID(), characterId: character.id, itemId: item.itemId, quantity: item.quantity });
        }
      }
      await tx.update(caravans).set({ status: 'COMPLETED' }).where(eq(caravans.id, caravanId));
    });

    // Get route distance for XP calculation
    const route = await db.query.travelRoutes.findFirst({
      where: or(
        and(eq(travelRoutes.fromTownId, caravan.fromTownId), eq(travelRoutes.toTownId, caravan.toTownId)),
        and(eq(travelRoutes.fromTownId, caravan.toTownId), eq(travelRoutes.toTownId, caravan.fromTownId)),
      ),
    });

    // Award Merchant XP: base XP = (cargoValue / 10) + (nodeCount * 2)
    const distance = route?.nodeCount ?? 1;
    const xpAmount = Math.floor(cargoValue / 10) + distance * 2;

    try {
      await addProfessionXP(character.id, 'MERCHANT', xpAmount, `caravan-delivery:${caravanId}`);
    } catch {
      // Player may not have Merchant profession; that's fine — no XP awarded
    }

    emitNotification(character.id, {
      id: `caravan-arrived-${caravanId}`,
      type: 'caravan:arrived',
      title: 'Caravan Arrived!',
      message: `Your caravan arrived at ${caravan.town_toTownId.name}. ${cargo.length} item type(s) collected.`,
      data: { caravanId, toTownId: caravan.toTownId, cargoValue, xpAmount },
    });

    return res.json({
      collected: true,
      destination: { id: caravan.town_toTownId.id, name: caravan.town_toTownId.name },
      cargo,
      cargoValue,
      merchantXp: xpAmount,
    });
  } catch (error) {
    if (handleDbError(error, res, 'caravan-collect', req)) return;
    logRouteError(req, 500, 'Caravan collect error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/caravans/:caravanId/resolve-ambush
// ---------------------------------------------------------------------------

router.post('/:caravanId/resolve-ambush', authGuard, characterGuard, requireTown, validate(resolveAmbushSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { caravanId } = req.params;
    const { choice } = req.body as { choice: AmbushChoice };
    const character = req.character!;

    const caravan = await db.query.caravans.findFirst({
      where: eq(caravans.id, caravanId),
      with: {
        town_fromTownId: true,
        town_toTownId: true,
      },
    });
    if (!caravan) return res.status(404).json({ error: 'Caravan not found' });
    if (caravan.ownerId !== character.id) return res.status(403).json({ error: 'Not your caravan' });

    // FAILED status is used for AMBUSHED caravans (since ActionStatus doesn't have AMBUSHED)
    if (caravan.status !== 'FAILED') {
      return res.status(400).json({ error: 'Caravan is not ambushed' });
    }

    const { cargo, meta } = parseMeta(caravan);
    const cargoValue = totalCargoValue(cargo);
    const escortDef = meta.escort ? ESCORT_TYPES[meta.escort] : null;

    let result: { outcome: string; cargoLost: CargoItem[]; goldLost: number; cargoRemaining: CargoItem[] };

    if (choice === 'fight') {
      // Fight success chance: base + escort combat bonus + merchant level bonus
      const merchantLevel = await getMerchantLevel(character.id);
      const successChance = Math.min(0.90,
        FIGHT_BASE_SUCCESS + (escortDef?.combatBonus ?? 0) + merchantLevel * 0.005
      );
      const success = Math.random() < successChance;

      if (success) {
        // Win — keep all cargo, resume transit
        await db.update(caravans).set({ status: 'IN_PROGRESS' }).where(eq(caravans.id, caravanId));
        result = { outcome: 'victory', cargoLost: [], goldLost: 0, cargoRemaining: cargo };
      } else {
        // Lose — lose 40% of cargo
        const lossFraction = 0.40;
        const { remaining, lost } = removeRandomCargo(cargo, lossFraction);

        await db.update(caravans).set({
          status: 'IN_PROGRESS',
          cargo: serializeCargo(remaining, meta),
        }).where(eq(caravans.id, caravanId));
        result = { outcome: 'defeat', cargoLost: lost, goldLost: 0, cargoRemaining: remaining };
      }
    } else if (choice === 'ransom') {
      // Pay 30% of cargo value in gold
      const ransomCost = Math.ceil(cargoValue * RANSOM_COST_FRACTION);

      if (character.gold < ransomCost) {
        return res.status(400).json({ error: `Ransom costs ${ransomCost}g. You have ${character.gold}g.` });
      }

      await db.transaction(async (tx) => {
        await tx.update(characters).set({ gold: sql`${characters.gold} - ${ransomCost}` }).where(eq(characters.id, character.id));
        await tx.update(caravans).set({ status: 'IN_PROGRESS' }).where(eq(caravans.id, caravanId));
      });
      result = { outcome: 'ransomed', cargoLost: [], goldLost: ransomCost, cargoRemaining: cargo };
    } else {
      // Flee — lose 20% of cargo randomly
      const { remaining, lost } = removeRandomCargo(cargo, FLEE_CARGO_LOSS_FRACTION);

      await db.update(caravans).set({
        status: 'IN_PROGRESS',
        cargo: serializeCargo(remaining, meta),
      }).where(eq(caravans.id, caravanId));
      result = { outcome: 'fled', cargoLost: lost, goldLost: 0, cargoRemaining: remaining };
    }

    // If insured and lost cargo, pay insurance
    if (result.cargoLost.length > 0 && meta.insurance) {
      const insuranceDef = INSURANCE_OPTIONS[meta.insurance];
      const lostValue = totalCargoValue(result.cargoLost);
      const payout = Math.floor(lostValue * insuranceDef.payoutRate);
      if (payout > 0) {
        await db.update(characters).set({ gold: sql`${characters.gold} + ${payout}` }).where(eq(characters.id, character.id));
        (result as any).insurancePayout = payout;
      }
    }

    emitNotification(character.id, {
      id: `caravan-ambush-resolved-${caravanId}`,
      type: 'caravan:ambush-resolved',
      title: 'Ambush Resolved',
      message: `You chose to ${choice}. Outcome: ${result.outcome}.`,
      data: { caravanId, ...result },
    });

    return res.json(result);
  } catch (error) {
    if (handleDbError(error, res, 'caravan-resolve-ambush', req)) return;
    logRouteError(req, 500, 'Caravan resolve-ambush error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Utility: remove random fraction of cargo items
// ---------------------------------------------------------------------------

function removeRandomCargo(cargo: CargoItem[], fraction: number): { remaining: CargoItem[]; lost: CargoItem[] } {
  const totalQty = totalCargoQuantity(cargo);
  let toRemove = Math.max(1, Math.ceil(totalQty * fraction));
  const lost: CargoItem[] = [];
  const remaining = cargo.map(c => ({ ...c }));

  // Shuffle indices to randomize which items lose quantity
  const indices = remaining.map((_, i) => i).sort(() => Math.random() - 0.5);

  for (const idx of indices) {
    if (toRemove <= 0) break;
    const entry = remaining[idx];
    const remove = Math.min(entry.quantity, toRemove);
    entry.quantity -= remove;
    toRemove -= remove;
    const existingLost = lost.find(l => l.itemId === entry.itemId);
    if (existingLost) {
      existingLost.quantity += remove;
    } else {
      lost.push({ ...entry, quantity: remove });
    }
  }

  return {
    remaining: remaining.filter(c => c.quantity > 0),
    lost,
  };
}

export default router;
