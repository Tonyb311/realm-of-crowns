import { prisma } from '../lib/prisma';
import { HungerState } from '@prisma/client';

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
  const perishableItems = await prisma.item.findMany({
    where: {
      daysRemaining: { not: null },
      template: { isPerishable: true },
    },
    include: {
      template: { select: { name: true } },
      inventory: { select: { character: { select: { currentTownId: true } } } },
    },
  });

  const toDelete: string[] = [];
  const toDecrement: string[] = [];

  for (const item of perishableItems) {
    const remaining = (item.daysRemaining ?? 0) - 1;
    if (remaining <= 0) {
      toDelete.push(item.id);
      // Attribute to character's town or 'unknown'
      const townId = item.inventory[0]?.character?.currentTownId ?? 'unknown';
      locationBreakdown[townId] = (locationBreakdown[townId] ?? 0) + 1;
    } else {
      toDecrement.push(item.id);
    }
  }

  // Batch decrement surviving items
  if (toDecrement.length > 0) {
    await prisma.item.updateMany({
      where: { id: { in: toDecrement } },
      data: { daysRemaining: { decrement: 1 } },
    });
  }

  // Delete spoiled items (cascades to inventory, market listings, etc.)
  if (toDelete.length > 0) {
    // Remove from inventory first
    await prisma.inventory.deleteMany({ where: { itemId: { in: toDelete } } });
    // Remove market listings
    await prisma.marketListing.deleteMany({ where: { itemId: { in: toDelete } } });
    // Delete the items
    await prisma.item.deleteMany({ where: { id: { in: toDelete } } });
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
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: {
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
  const foodItems = await prisma.inventory.findMany({
    where: {
      characterId,
      item: {
        template: { isFood: true },
      },
    },
    include: {
      item: {
        include: {
          template: {
            select: {
              id: true,
              name: true,
              isFood: true,
              foodBuff: true,
              shelfLifeDays: true,
            },
          },
        },
      },
    },
  });

  if (foodItems.length === 0) {
    // No food available — increment hunger
    const newDays = (character.daysSinceLastMeal ?? 0) + 1;
    const newState = hungerStateFromDays(newDays);
    await prisma.character.update({
      where: { id: characterId },
      data: { daysSinceLastMeal: newDays, hungerState: newState },
    });
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
          await prisma.character.update({
            where: { id: characterId },
            data: { daysSinceLastMeal: newDays, hungerState: newState },
          });
          return { consumed: null, buff: null, hungerState: newState };
        }
      }
      break;
  }

  // Consume the first sorted food item
  const toConsume = sorted[0];
  const foodBuff = toConsume.item.template.foodBuff as Record<string, unknown> | null;

  await prisma.$transaction(async (tx) => {
    if (toConsume.quantity > 1) {
      await tx.inventory.update({
        where: { id: toConsume.id },
        data: { quantity: toConsume.quantity - 1 },
      });
    } else {
      await tx.inventory.delete({ where: { id: toConsume.id } });
      await tx.item.delete({ where: { id: toConsume.item.id } });
    }

    // Reset hunger
    await tx.character.update({
      where: { id: characterId },
      data: { daysSinceLastMeal: 0, hungerState: 'FED' },
    });
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
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, soulFadeStage: true },
  });

  if (!character) {
    return { consumed: null, buff: null, soulFadeStage: 1 };
  }

  // Look for Soul Essence items in inventory (prefer Refined over basic)
  const soulEssenceItems = await prisma.inventory.findMany({
    where: {
      characterId,
      item: {
        template: {
          name: { in: ['Refined Soul Essence', 'Soul Essence'] },
        },
      },
    },
    include: {
      item: {
        include: {
          template: {
            select: { id: true, name: true, foodBuff: true },
          },
        },
      },
    },
    orderBy: { item: { template: { rarity: 'desc' } } }, // Refined (FINE) sorts above basic (COMMON)
  });

  if (soulEssenceItems.length === 0) {
    // No Soul Essence — increment Soul Fade (cap at 3)
    const newStage = Math.min((character.soulFadeStage ?? 0) + 1, 3);
    await prisma.character.update({
      where: { id: characterId },
      data: { soulFadeStage: newStage },
    });
    return { consumed: null, buff: null, soulFadeStage: newStage };
  }

  // Consume the first (best) Soul Essence item
  const toConsume = soulEssenceItems[0];
  const foodBuff = toConsume.item.template.foodBuff as Record<string, unknown> | null;

  await prisma.$transaction(async (tx) => {
    if (toConsume.quantity > 1) {
      await tx.inventory.update({
        where: { id: toConsume.id },
        data: { quantity: toConsume.quantity - 1 },
      });
    } else {
      await tx.inventory.delete({ where: { id: toConsume.id } });
      await tx.item.delete({ where: { id: toConsume.item.id } });
    }

    // Clear Soul Fade
    await tx.character.update({
      where: { id: characterId },
      data: { soulFadeStage: 0 },
    });
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
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, structuralDecayStage: true },
  });

  if (!character) {
    return { consumed: null, buff: null, structuralDecayStage: 1 };
  }

  // Look for Maintenance Kit items in inventory (prefer Precision over basic)
  const maintenanceItems = await prisma.inventory.findMany({
    where: {
      characterId,
      item: {
        template: {
          name: { in: ['Precision Maintenance Kit', 'Maintenance Kit'] },
        },
      },
    },
    include: {
      item: {
        include: {
          template: {
            select: { id: true, name: true, foodBuff: true },
          },
        },
      },
    },
    orderBy: { item: { template: { rarity: 'desc' } } }, // Precision (FINE) sorts above basic (COMMON)
  });

  if (maintenanceItems.length === 0) {
    // No kits — increment Structural Decay (cap at 3)
    const newStage = Math.min((character.structuralDecayStage ?? 0) + 1, 3);
    await prisma.character.update({
      where: { id: characterId },
      data: { structuralDecayStage: newStage },
    });
    return { consumed: null, buff: null, structuralDecayStage: newStage };
  }

  // Consume the first (best) Maintenance Kit item
  const toConsume = maintenanceItems[0];
  const foodBuff = toConsume.item.template.foodBuff as Record<string, unknown> | null;

  await prisma.$transaction(async (tx) => {
    if (toConsume.quantity > 1) {
      await tx.inventory.update({
        where: { id: toConsume.id },
        data: { quantity: toConsume.quantity - 1 },
      });
    } else {
      await tx.inventory.delete({ where: { id: toConsume.id } });
      await tx.item.delete({ where: { id: toConsume.item.id } });
    }

    // Clear Structural Decay
    await tx.character.update({
      where: { id: characterId },
      data: { structuralDecayStage: 0 },
    });
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
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { daysSinceLastMeal: true },
  });

  if (!character) return 'HUNGRY';

  const state = hungerStateFromDays(character.daysSinceLastMeal ?? 0);
  await prisma.character.update({
    where: { id: characterId },
    data: { hungerState: state },
  });

  return state;
}
