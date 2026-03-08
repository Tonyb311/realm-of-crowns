import { db } from '../lib/db';
import { eq, and, gte } from 'drizzle-orm';
import { characters, inventories, racialAbilityCooldowns } from '@database/tables';
import { getStructuralDecayStatPenalty, getStructuralDecaySpeedPenalty, getStructuralDecayHpPenalty } from './food-system';

// =========================================================================
// Forgeborn Maintenance Service
// =========================================================================

export interface MaintenanceStatus {
  structuralDecayStage: number;
  stageName: string;
  statPenalty: number;
  speedPenalty: number;
  hpPenalty: number;
  consumable: string;
  refinedConsumable: string;
  craftedBy: string;
}

/**
 * Check maintenance status: structural decay stage and penalties.
 */
export async function checkMaintenanceStatus(characterId: string): Promise<MaintenanceStatus> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { race: true, structuralDecayStage: true },
  });

  if (!character || character.race !== 'FORGEBORN') {
    throw new Error('Only Forgeborn have maintenance status');
  }

  const stage = character.structuralDecayStage ?? 0;
  const stageNames = ['Optimal', 'Wearing', 'Degrading', 'Failing'];

  return {
    structuralDecayStage: stage,
    stageName: stageNames[Math.min(stage, 3)],
    statPenalty: getStructuralDecayStatPenalty(stage),
    speedPenalty: getStructuralDecaySpeedPenalty(stage),
    hpPenalty: getStructuralDecayHpPenalty(stage),
    consumable: 'Maintenance Kit',
    refinedConsumable: 'Precision Maintenance Kit',
    craftedBy: 'Smelter',
  };
}

/**
 * Perform maintenance using a Maintenance Kit item. Clears structural decay.
 */
export async function performMaintenance(
  characterId: string,
  repairKitItemId: string,
): Promise<{ success: boolean; structuralDecayStage: number }> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { id: true, race: true },
  });

  if (!character || character.race !== 'FORGEBORN') {
    throw new Error('Only Forgeborn require maintenance');
  }

  const inventoryEntry = await db.query.inventories.findFirst({
    where: and(
      eq(inventories.characterId, characterId),
      eq(inventories.itemId, repairKitItemId),
      gte(inventories.quantity, 1),
    ),
    with: {
      item: { with: { itemTemplate: true } },
    },
  });

  if (!inventoryEntry) {
    throw new Error('Maintenance Kit not found in inventory');
  }

  const templateName = inventoryEntry.item.itemTemplate.name;
  if (templateName !== 'Maintenance Kit' && templateName !== 'Precision Maintenance Kit') {
    throw new Error('Item is not a Maintenance Kit');
  }

  // Consume one unit
  if (inventoryEntry.quantity > 1) {
    await db.update(inventories).set({ quantity: inventoryEntry.quantity - 1 }).where(eq(inventories.id, inventoryEntry.id));
  } else {
    await db.delete(inventories).where(eq(inventories.id, inventoryEntry.id));
  }

  // Clear structural decay
  await db.update(characters).set({ structuralDecayStage: 0 }).where(eq(characters.id, characterId));

  return { success: true, structuralDecayStage: 0 };
}

/**
 * Get stat penalties based on structural decay stage.
 */
export async function getStatPenalties(characterId: string): Promise<{ penalty: number }> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { structuralDecayStage: true },
  });
  return { penalty: getStructuralDecayStatPenalty(character?.structuralDecayStage ?? 0) };
}

/**
 * Level 15 Self-Repair: heals 30% max HP, 8-hour cooldown.
 */
export async function applySelfRepair(
  characterId: string,
): Promise<{ success: boolean; healedHp: number; cooldownEnds: string }> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { race: true, level: true, health: true, maxHealth: true },
  });

  if (!character || character.race !== 'FORGEBORN') {
    throw new Error('Only Forgeborn can self-repair');
  }
  if (character.level < 15) {
    throw new Error('Self-Repair requires level 15');
  }

  // Check cooldown
  const now = new Date();
  const abilityName = 'Self-Repair';
  const existingCooldown = await db.query.racialAbilityCooldowns.findFirst({
    where: and(
      eq(racialAbilityCooldowns.characterId, characterId),
      eq(racialAbilityCooldowns.abilityName, abilityName),
    ),
  });

  if (existingCooldown && new Date(existingCooldown.cooldownEnds) > now) {
    const remainingMs = new Date(existingCooldown.cooldownEnds).getTime() - now.getTime();
    throw new Error(`Self-Repair on cooldown (${Math.ceil(remainingMs / 1000)}s remaining)`);
  }

  // Heal 30% of max HP
  const healAmount = Math.floor(character.maxHealth * 0.30);
  const newHp = Math.min(character.maxHealth, character.health + healAmount);

  await db.update(characters).set({ health: newHp }).where(eq(characters.id, characterId));

  // Set cooldown (8 hours = 28800 seconds)
  const cooldownEnds = new Date(now.getTime() + 28800 * 1000);
  await db.insert(racialAbilityCooldowns).values({
    id: crypto.randomUUID(),
    characterId,
    abilityName,
    lastUsed: now.toISOString(),
    cooldownEnds: cooldownEnds.toISOString(),
    updatedAt: now.toISOString(),
  }).onConflictDoUpdate({
    target: [racialAbilityCooldowns.characterId, racialAbilityCooldowns.abilityName],
    set: {
      lastUsed: now.toISOString(),
      cooldownEnds: cooldownEnds.toISOString(),
    },
  });

  return { success: true, healedHp: healAmount, cooldownEnds: cooldownEnds.toISOString() };
}

/**
 * Level 10 Tireless Worker: +50% crafting queue slots.
 */
export async function getQueueSlotBonus(
  characterId: string,
): Promise<{ bonusPercent: number }> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { race: true, level: true },
  });

  if (!character || character.race !== 'FORGEBORN' || character.level < 10) {
    return { bonusPercent: 0 };
  }

  return { bonusPercent: 50 };
}
