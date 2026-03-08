import { db } from '../lib/db';
import { eq, and, inArray, isNotNull, sql } from 'drizzle-orm';
import { characters, items, inventories, itemTemplates, marketListings } from '@database/tables';
import type { HungerState } from '@shared/enums';

// ---------------------------------------------------------------------------
// Hunger thresholds (days since last meal -> hunger state)
// ---------------------------------------------------------------------------

function hungerStateFromDays(days: number): HungerState {
  if (days <= 0) return 'FED';
  if (days <= 2) return 'HUNGRY';
  if (days <= 4) return 'STARVING';
  return 'INCAPACITATED';
}

// ---------------------------------------------------------------------------
// Hunger modifiers
// ---------------------------------------------------------------------------

export function getHungerModifier(state: HungerState): number {
  switch (state) {
    case 'FED': return 1.0;
    case 'HUNGRY': return 0.85;
    case 'STARVING': return 0.60;
    case 'INCAPACITATED': return 0.0;
    default: return 1.0;
  }
}

export function getHungerStatPenalty(state: HungerState): number {
  switch (state) {
    case 'FED': return 0;
    case 'HUNGRY': return -1;
    case 'STARVING': return -3;
    case 'INCAPACITATED': return -5;
    default: return 0;
  }
}

export function getHungerCombatPenalty(state: HungerState): number {
  switch (state) {
    case 'FED': return 0;
    case 'HUNGRY': return -0.10;
    case 'STARVING': return -0.25;
    case 'INCAPACITATED': return -1; // cannot fight
    default: return 0;
  }
}

// ---------------------------------------------------------------------------
// processSpoilage
// ---------------------------------------------------------------------------

export async function processSpoilage(): Promise<{ spoiledCount: number; locationBreakdown: Record<string, number> }> {
  const locationBreakdown: Record<string, number> = {};

  // Find all perishable items (template.isPerishable = true, item.daysRemaining != null)
  // Use join query since Drizzle relational API can't filter on nested relations
  const perishableRows = await db
    .select({
      itemId: items.id,
      daysRemaining: items.daysRemaining,
      templateName: itemTemplates.name,
    })
    .from(items)
    .innerJoin(itemTemplates, eq(items.templateId, itemTemplates.id))
    .where(and(
      isNotNull(items.daysRemaining),
      eq(itemTemplates.isPerishable, true),
    ));

  const toDelete: string[] = [];
  const toDecrement: string[] = [];

  for (const row of perishableRows) {
    const remaining = (row.daysRemaining ?? 0) - 1;
    if (remaining <= 0) {
      toDelete.push(row.itemId);
      // Look up town for this item via inventory→character
      const invRow = await db
        .select({ currentTownId: characters.currentTownId })
        .from(inventories)
        .innerJoin(characters, eq(inventories.characterId, characters.id))
        .where(eq(inventories.itemId, row.itemId))
        .limit(1);
      const townId = invRow[0]?.currentTownId ?? 'unknown';
      locationBreakdown[townId] = (locationBreakdown[townId] ?? 0) + 1;
    } else {
      toDecrement.push(row.itemId);
    }
  }

  // Batch decrement surviving items
  if (toDecrement.length > 0) {
    await db.update(items)
      .set({ daysRemaining: sql`${items.daysRemaining} - 1` })
      .where(inArray(items.id, toDecrement));
  }

  // Delete spoiled items (cascades to inventory, market listings, etc.)
  if (toDelete.length > 0) {
    // Remove from inventory first
    await db.delete(inventories).where(inArray(inventories.itemId, toDelete));
    // Remove market listings
    await db.delete(marketListings).where(inArray(marketListings.itemId, toDelete));
    // Delete the items
    await db.delete(items).where(inArray(items.id, toDelete));
  }

  return {
    spoiledCount: toDelete.length,
    locationBreakdown,
  };
}

// ---------------------------------------------------------------------------
// processAutoConsumption
// ---------------------------------------------------------------------------

export async function processAutoConsumption(characterId: string): Promise<{
  consumed: { id: string; name: string; templateId: string } | null;
  buff: Record<string, unknown> | null;
  hungerState: HungerState;
}> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: {
      id: true,
      foodPriority: true,
      preferredFoodId: true,
      daysSinceLastMeal: true,
    },
  });

  if (!character) {
    return { consumed: null, buff: null, hungerState: 'HUNGRY' };
  }

  const priority = character.foodPriority ?? 'EXPIRING_FIRST';

  // Build query for food items in this character's inventory
  // Use join to filter by template.isFood
  const foodRows = await db
    .select({
      invId: inventories.id,
      invQuantity: inventories.quantity,
      itemId: items.id,
      itemDaysRemaining: items.daysRemaining,
      itemTemplateId: items.templateId,
      templateId: itemTemplates.id,
      templateName: itemTemplates.name,
      templateIsFood: itemTemplates.isFood,
      templateFoodBuff: itemTemplates.foodBuff,
      templateShelfLifeDays: itemTemplates.shelfLifeDays,
    })
    .from(inventories)
    .innerJoin(items, eq(inventories.itemId, items.id))
    .innerJoin(itemTemplates, eq(items.templateId, itemTemplates.id))
    .where(and(
      eq(inventories.characterId, characterId),
      eq(itemTemplates.isFood, true),
    ));

  // Map to a format similar to original Prisma shape
  const foodItems = foodRows.map(r => ({
    id: r.invId,
    quantity: r.invQuantity,
    item: {
      id: r.itemId,
      daysRemaining: r.itemDaysRemaining,
      templateId: r.itemTemplateId,
      template: {
        id: r.templateId,
        name: r.templateName,
        isFood: r.templateIsFood,
        foodBuff: r.templateFoodBuff,
        shelfLifeDays: r.templateShelfLifeDays,
      },
    },
  }));

  if (foodItems.length === 0) {
    // No food available — increment hunger
    const newDays = (character.daysSinceLastMeal ?? 0) + 1;
    const newState = hungerStateFromDays(newDays);
    await db.update(characters)
      .set({ daysSinceLastMeal: newDays, hungerState: newState })
      .where(eq(characters.id, characterId));
    return { consumed: null, buff: null, hungerState: newState };
  }

  // Sort based on priority
  let sorted = [...foodItems];
  switch (priority) {
    case 'EXPIRING_FIRST':
      sorted.sort((a, b) => {
        const aDays = a.item.daysRemaining ?? 9999;
        const bDays = b.item.daysRemaining ?? 9999;
        if (aDays !== bDays) return aDays - bDays;
        // Prefer basic (no buff) over buff food at equal days
        const aBuff = a.item.template.foodBuff ? 1 : 0;
        const bBuff = b.item.template.foodBuff ? 1 : 0;
        return aBuff - bBuff;
      });
      break;

    case 'BEST_FIRST':
      sorted.sort((a, b) => {
        const aBuff = a.item.template.foodBuff ? 1 : 0;
        const bBuff = b.item.template.foodBuff ? 1 : 0;
        if (aBuff !== bBuff) return bBuff - aBuff; // buff food first
        const aDays = a.item.daysRemaining ?? 9999;
        const bDays = b.item.daysRemaining ?? 9999;
        return aDays - bDays;
      });
      break;

    case 'SPECIFIC_ITEM':
      if (character.preferredFoodId) {
        // Prefer the specific item, fallback to EXPIRING_FIRST
        const preferred = sorted.filter(s => s.item.templateId === character.preferredFoodId);
        const rest = sorted
          .filter(s => s.item.templateId !== character.preferredFoodId)
          .sort((a, b) => (a.item.daysRemaining ?? 9999) - (b.item.daysRemaining ?? 9999));
        sorted = [...preferred, ...rest];
      } else {
        // Fallback to EXPIRING_FIRST
        sorted.sort((a, b) => (a.item.daysRemaining ?? 9999) - (b.item.daysRemaining ?? 9999));
      }
      break;

    case 'CATEGORY_ONLY':
      // Filter by preferred template category stored in preferredFoodId
      if (character.preferredFoodId) {
        const categoryFiltered = sorted.filter(s => s.item.templateId === character.preferredFoodId);
        if (categoryFiltered.length > 0) {
          sorted = categoryFiltered.sort(
            (a, b) => (a.item.daysRemaining ?? 9999) - (b.item.daysRemaining ?? 9999),
          );
        }
        // If none match the category, eat nothing this tick
        else {
          const newDays = (character.daysSinceLastMeal ?? 0) + 1;
          const newState = hungerStateFromDays(newDays);
          await db.update(characters)
            .set({ daysSinceLastMeal: newDays, hungerState: newState })
            .where(eq(characters.id, characterId));
          return { consumed: null, buff: null, hungerState: newState };
        }
      }
      break;
  }

  // Consume the first sorted food item
  const toConsume = sorted[0];
  const foodBuff = toConsume.item.template.foodBuff as Record<string, unknown> | null;

  await db.transaction(async (tx) => {
    if (toConsume.quantity > 1) {
      await tx.update(inventories)
        .set({ quantity: toConsume.quantity - 1 })
        .where(eq(inventories.id, toConsume.id));
    } else {
      await tx.delete(inventories).where(eq(inventories.id, toConsume.id));
      await tx.delete(items).where(eq(items.id, toConsume.item.id));
    }

    // Reset hunger
    await tx.update(characters)
      .set({ daysSinceLastMeal: 0, hungerState: 'FED' })
      .where(eq(characters.id, characterId));
  });

  return {
    consumed: {
      id: toConsume.item.id,
      name: toConsume.item.template.name,
      templateId: toConsume.item.templateId,
    },
    buff: foodBuff ?? null,
    hungerState: 'FED',
  };
}

// ---------------------------------------------------------------------------
// updateHungerState
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Soul Fade penalties (Revenant equivalent of hunger)
// ---------------------------------------------------------------------------

export function getSoulFadeStatPenalty(stage: number): number {
  switch (stage) {
    case 0: return 0;
    case 1: return -1;
    case 2: return -2;
    default: return -3; // stage 3+
  }
}

export function getSoulFadeSpeedPenalty(stage: number): number {
  switch (stage) {
    case 0:
    case 1: return 0;
    case 2: return -0.15;
    default: return -0.25; // stage 3+
  }
}

export function getSoulFadeHpPenalty(stage: number): number {
  if (stage >= 3) return -0.10;
  return 0;
}

// ---------------------------------------------------------------------------
// processRevenantSustenance
// ---------------------------------------------------------------------------

export async function processRevenantSustenance(characterId: string): Promise<{
  consumed: { id: string; name: string; templateId: string } | null;
  buff: Record<string, unknown> | null;
  soulFadeStage: number;
}> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { id: true, soulFadeStage: true },
  });

  if (!character) {
    return { consumed: null, buff: null, soulFadeStage: 1 };
  }

  // Look for Soul Essence items in inventory (prefer Refined over basic)
  // Use join to filter by template name, order by rarity desc
  const soulEssenceRows = await db
    .select({
      invId: inventories.id,
      invQuantity: inventories.quantity,
      itemId: items.id,
      itemTemplateId: items.templateId,
      templateId: itemTemplates.id,
      templateName: itemTemplates.name,
      templateFoodBuff: itemTemplates.foodBuff,
      templateRarity: itemTemplates.rarity,
    })
    .from(inventories)
    .innerJoin(items, eq(inventories.itemId, items.id))
    .innerJoin(itemTemplates, eq(items.templateId, itemTemplates.id))
    .where(and(
      eq(inventories.characterId, characterId),
      inArray(itemTemplates.name, ['Refined Soul Essence', 'Soul Essence']),
    ));

  // Sort: Refined (FINE) before basic (COMMON) — rarity desc
  const RARITY_ORDER: Record<string, number> = { LEGENDARY: 5, EPIC: 4, RARE: 3, FINE: 2, COMMON: 1 };
  const soulEssenceItems = soulEssenceRows
    .map(r => ({
      id: r.invId,
      quantity: r.invQuantity,
      item: {
        id: r.itemId,
        templateId: r.itemTemplateId,
        template: {
          id: r.templateId,
          name: r.templateName,
          foodBuff: r.templateFoodBuff,
        },
      },
      rarity: r.templateRarity,
    }))
    .sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0));

  if (soulEssenceItems.length === 0) {
    // No Soul Essence — increment Soul Fade (cap at 3)
    const newStage = Math.min((character.soulFadeStage ?? 0) + 1, 3);
    await db.update(characters)
      .set({ soulFadeStage: newStage })
      .where(eq(characters.id, characterId));
    return { consumed: null, buff: null, soulFadeStage: newStage };
  }

  // Consume the first (best) Soul Essence item
  const toConsume = soulEssenceItems[0];
  const foodBuff = toConsume.item.template.foodBuff as Record<string, unknown> | null;

  await db.transaction(async (tx) => {
    if (toConsume.quantity > 1) {
      await tx.update(inventories)
        .set({ quantity: toConsume.quantity - 1 })
        .where(eq(inventories.id, toConsume.id));
    } else {
      await tx.delete(inventories).where(eq(inventories.id, toConsume.id));
      await tx.delete(items).where(eq(items.id, toConsume.item.id));
    }

    // Clear Soul Fade
    await tx.update(characters)
      .set({ soulFadeStage: 0 })
      .where(eq(characters.id, characterId));
  });

  return {
    consumed: {
      id: toConsume.item.id,
      name: toConsume.item.template.name,
      templateId: toConsume.item.templateId,
    },
    buff: foodBuff ?? null,
    soulFadeStage: 0,
  };
}

// ---------------------------------------------------------------------------
// Structural Decay penalties (Forgeborn equivalent of hunger)
// ---------------------------------------------------------------------------

export function getStructuralDecayStatPenalty(stage: number): number {
  switch (stage) {
    case 0: return 0;
    case 1: return -1;
    case 2: return -2;
    default: return -3; // stage 3+
  }
}

export function getStructuralDecaySpeedPenalty(stage: number): number {
  switch (stage) {
    case 0:
    case 1: return 0;
    case 2: return -0.15;
    default: return -0.25; // stage 3+
  }
}

export function getStructuralDecayHpPenalty(stage: number): number {
  if (stage >= 3) return -0.10;
  return 0;
}

// ---------------------------------------------------------------------------
// processForgebornMaintenance
// ---------------------------------------------------------------------------

export async function processForgebornMaintenance(characterId: string): Promise<{
  consumed: { id: string; name: string; templateId: string } | null;
  buff: Record<string, unknown> | null;
  structuralDecayStage: number;
}> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { id: true, structuralDecayStage: true },
  });

  if (!character) {
    return { consumed: null, buff: null, structuralDecayStage: 1 };
  }

  // Look for Maintenance Kit items in inventory (prefer Precision over basic)
  const maintenanceRows = await db
    .select({
      invId: inventories.id,
      invQuantity: inventories.quantity,
      itemId: items.id,
      itemTemplateId: items.templateId,
      templateId: itemTemplates.id,
      templateName: itemTemplates.name,
      templateFoodBuff: itemTemplates.foodBuff,
      templateRarity: itemTemplates.rarity,
    })
    .from(inventories)
    .innerJoin(items, eq(inventories.itemId, items.id))
    .innerJoin(itemTemplates, eq(items.templateId, itemTemplates.id))
    .where(and(
      eq(inventories.characterId, characterId),
      inArray(itemTemplates.name, ['Precision Maintenance Kit', 'Maintenance Kit']),
    ));

  // Sort: Precision (FINE) before basic (COMMON) — rarity desc
  const RARITY_ORDER: Record<string, number> = { LEGENDARY: 5, EPIC: 4, RARE: 3, FINE: 2, COMMON: 1 };
  const maintenanceItems = maintenanceRows
    .map(r => ({
      id: r.invId,
      quantity: r.invQuantity,
      item: {
        id: r.itemId,
        templateId: r.itemTemplateId,
        template: {
          id: r.templateId,
          name: r.templateName,
          foodBuff: r.templateFoodBuff,
        },
      },
      rarity: r.templateRarity,
    }))
    .sort((a, b) => (RARITY_ORDER[b.rarity] ?? 0) - (RARITY_ORDER[a.rarity] ?? 0));

  if (maintenanceItems.length === 0) {
    // No kits — increment Structural Decay (cap at 3)
    const newStage = Math.min((character.structuralDecayStage ?? 0) + 1, 3);
    await db.update(characters)
      .set({ structuralDecayStage: newStage })
      .where(eq(characters.id, characterId));
    return { consumed: null, buff: null, structuralDecayStage: newStage };
  }

  // Consume the first (best) Maintenance Kit item
  const toConsume = maintenanceItems[0];
  const foodBuff = toConsume.item.template.foodBuff as Record<string, unknown> | null;

  await db.transaction(async (tx) => {
    if (toConsume.quantity > 1) {
      await tx.update(inventories)
        .set({ quantity: toConsume.quantity - 1 })
        .where(eq(inventories.id, toConsume.id));
    } else {
      await tx.delete(inventories).where(eq(inventories.id, toConsume.id));
      await tx.delete(items).where(eq(items.id, toConsume.item.id));
    }

    // Clear Structural Decay
    await tx.update(characters)
      .set({ structuralDecayStage: 0 })
      .where(eq(characters.id, characterId));
  });

  return {
    consumed: {
      id: toConsume.item.id,
      name: toConsume.item.template.name,
      templateId: toConsume.item.templateId,
    },
    buff: foodBuff ?? null,
    structuralDecayStage: 0,
  };
}

// ---------------------------------------------------------------------------
// updateHungerState
// ---------------------------------------------------------------------------

export async function updateHungerState(characterId: string): Promise<HungerState> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { daysSinceLastMeal: true },
  });

  if (!character) return 'HUNGRY';

  const state = hungerStateFromDays(character.daysSinceLastMeal ?? 0);
  await db.update(characters)
    .set({ hungerState: state })
    .where(eq(characters.id, characterId));

  return state;
}
