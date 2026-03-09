/**
 * Weight Calculator Service
 *
 * Calculates a character's total inventory + equipment weight and returns
 * the encumbrance state. Called by enforcement points across routes.
 */

import { eq, and, sql } from 'drizzle-orm';
import { db as defaultDb } from '../lib/db';
import { inventories, items, itemTemplates, characterEquipment, characters } from '@database/tables';
import {
  calculateCarryCapacity,
  getEncumbrancePenalties,
  type EncumbrancePenalties,
} from '@shared/utils/bounded-accuracy';
import { getRace } from '@shared/data/races';

export interface WeightState {
  currentWeight: number;
  inventoryWeight: number;
  equipmentWeight: number;
  carryCapacity: number;
  bagBonus: number;
  bagName: string | null;
  encumbrance: EncumbrancePenalties;
}

/**
 * Calculate full weight state for a character.
 * @param characterId - The character to check
 * @param tx - Optional Drizzle transaction (defaults to global db instance).
 *             Pass this when calling inside a transaction so the weight
 *             reflects just-inserted/deleted items.
 */
export async function calculateWeightState(
  characterId: string,
  tx: typeof defaultDb = defaultDb,
): Promise<WeightState> {
  // 1. Fetch character for STR stat and race
  const character = await tx.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { stats: true, race: true },
  });

  if (!character) {
    return {
      currentWeight: 0, inventoryWeight: 0, equipmentWeight: 0,
      carryCapacity: 100, bagBonus: 0, bagName: null,
      encumbrance: getEncumbrancePenalties(0, 100),
    };
  }

  const stats = character.stats as Record<string, number> | null;
  const str = stats?.str ?? stats?.STR ?? 10;
  const raceId = character.race;

  // 2. Inventory weight: SUM(itemTemplates.weight * inventories.quantity)
  const [invResult] = await tx
    .select({
      total: sql<number>`COALESCE(SUM(${itemTemplates.weight} * ${inventories.quantity}), 0)`,
    })
    .from(inventories)
    .innerJoin(items, eq(inventories.itemId, items.id))
    .innerJoin(itemTemplates, eq(items.templateId, itemTemplates.id))
    .where(eq(inventories.characterId, characterId));

  const inventoryWeight = Number(invResult.total) || 0;

  // 3. Equipment weight: SUM(itemTemplates.weight)
  const [eqResult] = await tx
    .select({
      total: sql<number>`COALESCE(SUM(${itemTemplates.weight}), 0)`,
    })
    .from(characterEquipment)
    .innerJoin(items, eq(characterEquipment.itemId, items.id))
    .innerJoin(itemTemplates, eq(items.templateId, itemTemplates.id))
    .where(eq(characterEquipment.characterId, characterId));

  const equipmentWeight = Number(eqResult.total) || 0;

  // 4. Bag bonus — scan equipped BAG slot for carryBonus
  let bagBonus = 0;
  let bagName: string | null = null;
  const bagSlotEquip = await tx.query.characterEquipment.findFirst({
    where: and(
      eq(characterEquipment.characterId, characterId),
      eq(characterEquipment.slot, 'BAG'),
    ),
    with: { item: { with: { itemTemplate: true } } },
  });
  if (bagSlotEquip) {
    const bagStats = bagSlotEquip.item.itemTemplate.stats as Record<string, any> | null;
    bagBonus = Number(bagStats?.carryBonus) || 0;
    bagName = bagSlotEquip.item.itemTemplate.name;
  }

  // 5. Racial carry modifier
  const raceDef = getRace(raceId);
  const racialMod = raceDef?.carryCapacityModifier ?? 0;

  // 6. Calculate capacity + encumbrance
  const carryCapacity = calculateCarryCapacity(str, racialMod, bagBonus);
  const currentWeight = inventoryWeight + equipmentWeight;
  const encumbrance = getEncumbrancePenalties(currentWeight, carryCapacity);

  return {
    currentWeight: Math.round(currentWeight * 10) / 10,
    inventoryWeight: Math.round(inventoryWeight * 10) / 10,
    equipmentWeight: Math.round(equipmentWeight * 10) / 10,
    carryCapacity: Math.round(carryCapacity * 10) / 10,
    bagBonus,
    bagName,
    encumbrance,
  };
}

/**
 * Project what the weight state would be after adding additional weight.
 * Does NOT modify any data — purely predictive.
 */
export async function projectWeightAfterAdd(
  characterId: string,
  additionalWeight: number,
  tx: typeof defaultDb = defaultDb,
): Promise<WeightState> {
  const current = await calculateWeightState(characterId, tx);
  const projectedWeight = current.currentWeight + additionalWeight;
  const projected = getEncumbrancePenalties(projectedWeight, current.carryCapacity);
  return {
    ...current,
    currentWeight: Math.round(projectedWeight * 10) / 10,
    encumbrance: projected,
  };
}
