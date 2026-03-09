import crypto from 'crypto';
import { db } from './db';
import { eq, and } from 'drizzle-orm';
import { itemTemplates, items, inventories, characterEquipment } from '@database/tables';
import { logger } from './logger';
import { STARTER_WEAPONS, FALLBACK_STARTER_WEAPON, StarterWeaponDef, STARTER_ARMOR } from '@shared/data/starter-weapons';

const STARTER_WEAPON_BASE_VALUES: Record<string, number> = {
  'Rustic Shortsword': 5,
  'Rustic Shortbow': 5,
  'Rustic Dagger': 3,
  'Rustic Staff': 4,
  'Rustic Crystal Focus': 4,
  'Rustic Lute Blade': 5,
  'Rustic Mace': 4,
};

let templatesEnsured = false;

/**
 * Ensures all starter weapon ItemTemplates exist in the database.
 * Called once at startup or first use. Uses upsert with stable IDs.
 */
export async function ensureStarterWeaponTemplates(): Promise<void> {
  if (templatesEnsured) return;

  for (const def of Object.values(STARTER_WEAPONS)) {
    const baseValue = STARTER_WEAPON_BASE_VALUES[def.name] ?? 5;
    await db.insert(itemTemplates).values({
      id: def.templateId,
      name: def.name,
      type: 'WEAPON',
      rarity: 'COMMON',
      description: def.description,
      durability: 100,
      levelRequired: 1,
      stats: def.stats,
      baseValue,
      updatedAt: new Date().toISOString(),
    }).onConflictDoUpdate({
      target: itemTemplates.id,
      set: { baseValue, stats: def.stats, updatedAt: new Date().toISOString() },
    });
  }

  // Ensure starter armor template exists
  await db.insert(itemTemplates).values({
    id: STARTER_ARMOR.templateId,
    name: STARTER_ARMOR.name,
    type: 'ARMOR',
    rarity: 'COMMON',
    description: STARTER_ARMOR.description,
    durability: 100,
    levelRequired: 1,
    stats: STARTER_ARMOR.stats,
    baseValue: 8,
    updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: itemTemplates.id,
    set: { baseValue: 8, stats: STARTER_ARMOR.stats, updatedAt: new Date().toISOString() },
  });

  templatesEnsured = true;
  logger.info({ count: Object.keys(STARTER_WEAPONS).length + 1 }, 'Starter weapon + armor templates ensured');
}

/**
 * Give a character their class-appropriate starter weapon.
 * Creates an Item from the template, adds to inventory, equips to MAIN_HAND.
 *
 * Idempotent: checks if character already has equipment in MAIN_HAND before granting.
 */
export async function giveStarterWeapon(characterId: string, characterClass: string): Promise<void> {
  await ensureStarterWeaponTemplates();

  // Idempotency check: don't give if already has MAIN_HAND equipped
  const existingEquip = await db.query.characterEquipment.findFirst({
    where: and(eq(characterEquipment.characterId, characterId), eq(characterEquipment.slot, 'MAIN_HAND')),
  });
  if (existingEquip) return;

  const def = STARTER_WEAPONS[characterClass.toLowerCase()] ?? FALLBACK_STARTER_WEAPON;

  const [item] = await db.insert(items).values({
    id: crypto.randomUUID(),
    templateId: def.templateId,
    ownerId: characterId,
    quality: 'COMMON',
    currentDurability: 100,
    updatedAt: new Date().toISOString(),
  }).returning();

  await db.insert(inventories).values({
    id: crypto.randomUUID(),
    characterId,
    itemId: item.id,
    quantity: 1,
    updatedAt: new Date().toISOString(),
  });

  await db.insert(characterEquipment).values({
    id: crypto.randomUUID(),
    characterId,
    slot: 'MAIN_HAND',
    itemId: item.id,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Give a character their starter armor (Rustic Leather Vest, +2 AC).
 * Creates an Item from the template, adds to inventory, equips to CHEST.
 *
 * Idempotent: checks if character already has equipment in CHEST before granting.
 */
export async function giveStarterArmor(characterId: string): Promise<void> {
  await ensureStarterWeaponTemplates();

  // Idempotency check: don't give if already has CHEST equipped
  const existingEquip = await db.query.characterEquipment.findFirst({
    where: and(eq(characterEquipment.characterId, characterId), eq(characterEquipment.slot, 'CHEST')),
  });
  if (existingEquip) return;

  const [item] = await db.insert(items).values({
    id: crypto.randomUUID(),
    templateId: STARTER_ARMOR.templateId,
    ownerId: characterId,
    quality: 'COMMON',
    currentDurability: 100,
    updatedAt: new Date().toISOString(),
  }).returning();

  await db.insert(inventories).values({
    id: crypto.randomUUID(),
    characterId,
    itemId: item.id,
    quantity: 1,
    updatedAt: new Date().toISOString(),
  });

  await db.insert(characterEquipment).values({
    id: crypto.randomUUID(),
    characterId,
    slot: 'CHEST',
    itemId: item.id,
    updatedAt: new Date().toISOString(),
  });
}
