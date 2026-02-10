import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { emitNotification } from '../socket/events';
import {
  AMBUSH_CHANCE_PER_DANGER,
  ESCORT_TYPES,
  CARAVAN_TYPES,
  CaravanType,
  EscortType,
  InsuranceCoverage,
} from '@shared/data/caravans/types';

interface CaravanMeta {
  caravanType: CaravanType;
  escort?: EscortType;
  insurance?: InsuranceCoverage;
}

interface CargoItem {
  itemId: string;
  quantity: number;
  itemName: string;
  unitValue: number;
}

function parseMeta(cargo: unknown): { items: CargoItem[]; meta: CaravanMeta } {
  const raw = cargo as any;
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && 'items' in raw) {
    return {
      items: Array.isArray(raw.items) ? raw.items : [],
      meta: raw.meta ?? { caravanType: 'HANDCART' },
    };
  }
  return { items: Array.isArray(raw) ? raw : [], meta: { caravanType: 'HANDCART' } };
}

/**
 * Caravan events cron job.
 * Runs every 5 minutes:
 * 1. Auto-arrives completed caravans (arrivesAt <= now, status IN_PROGRESS)
 * 2. Rolls ambush checks for in-transit caravans that haven't arrived yet
 */
export function startCaravanEventsJob() {
  cron.schedule('*/5 * * * *', async () => {
    try {
      await processCaravanEvents();
    } catch (error) {
      console.error('[CaravanEvents] Error:', error);
    }
  });

  console.log('[CaravanEvents] Cron job registered (every 5 minutes)');
}

async function processCaravanEvents() {
  const now = new Date();

  // -----------------------------------------------------------------------
  // 1. Auto-arrive completed caravans
  // -----------------------------------------------------------------------
  const arrivedCaravans = await prisma.caravan.findMany({
    where: {
      status: 'IN_PROGRESS',
      arrivesAt: { lte: now },
    },
    include: {
      toTown: { select: { id: true, name: true } },
    },
  });

  for (const caravan of arrivedCaravans) {
    // Don't auto-collect (player must POST /collect), but notify them
    emitNotification(caravan.ownerId, {
      id: `caravan-ready-${caravan.id}`,
      type: 'caravan:arrived',
      title: 'Caravan Arrived!',
      message: `Your caravan has arrived at ${caravan.toTown.name}. Visit the town to collect your goods.`,
      data: { caravanId: caravan.id, toTownId: caravan.toTownId },
    });
  }

  if (arrivedCaravans.length > 0) {
    console.log(`[CaravanEvents] ${arrivedCaravans.length} caravan(s) arrived at destination.`);
  }

  // -----------------------------------------------------------------------
  // 2. Ambush checks for in-transit caravans (not yet arrived)
  // -----------------------------------------------------------------------
  const inTransit = await prisma.caravan.findMany({
    where: {
      status: 'IN_PROGRESS',
      arrivesAt: { gt: now },
    },
  });

  if (inTransit.length === 0) return;

  // Batch-fetch all relevant routes
  const routePairs = inTransit.map(c => ({
    fromTownId: c.fromTownId,
    toTownId: c.toTownId,
  }));
  const routes = await prisma.travelRoute.findMany({
    where: {
      OR: routePairs.flatMap(p => [
        { fromTownId: p.fromTownId, toTownId: p.toTownId },
        { fromTownId: p.toTownId, toTownId: p.fromTownId },
      ]),
    },
  });

  const routeMap = new Map<string, typeof routes[number]>();
  for (const r of routes) {
    routeMap.set(`${r.fromTownId}-${r.toTownId}`, r);
    routeMap.set(`${r.toTownId}-${r.fromTownId}`, r);
  }

  let ambushCount = 0;

  for (const caravan of inTransit) {
    const route = routeMap.get(`${caravan.fromTownId}-${caravan.toTownId}`);
    if (!route) continue;

    const { meta } = parseMeta(caravan.cargo);

    // Ambush chance = dangerLevel * 5%, reduced by escort safety bonus
    let ambushChance = route.dangerLevel * AMBUSH_CHANCE_PER_DANGER;
    if (meta.escort) {
      const escortDef = ESCORT_TYPES[meta.escort];
      ambushChance = Math.max(0, ambushChance - escortDef.safetyBonus / 100);
    }

    if (Math.random() < ambushChance) {
      // Trigger ambush: set status to FAILED (representing AMBUSHED)
      await prisma.caravan.update({
        where: { id: caravan.id },
        data: { status: 'FAILED' },
      });

      emitNotification(caravan.ownerId, {
        id: `caravan-ambushed-${caravan.id}`,
        type: 'caravan:ambushed',
        title: 'Caravan Ambushed!',
        message: 'Your caravan has been ambushed by bandits! Choose to fight, pay ransom, or flee.',
        data: { caravanId: caravan.id, dangerLevel: route.dangerLevel },
      });

      ambushCount++;
    }
  }

  if (ambushCount > 0) {
    console.log(`[CaravanEvents] ${ambushCount} caravan(s) ambushed.`);
  }
}
