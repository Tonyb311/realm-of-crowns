import { prisma } from './prisma';
import { logger } from './logger';
import { STARTER_WEAPONS, FALLBACK_STARTER_WEAPON, StarterWeaponDef, STARTER_ARMOR } from '@shared/data/starter-weapons';

let templatesEnsured = false;

/**
 * Ensures all starter weapon ItemTemplates exist in the database.
 * Called once at startup or first use. Uses upsert with stable IDs.
 */
export async function ensureStarterWeaponTemplates(): Promise<void> {
  if (templatesEnsured) return;

  for (const def of Object.values(STARTER_WEAPONS)) {
    await prisma.itemTemplate.upsert({
      where: { id: def.templateId },
      update: {},
      create: {
        id: def.templateId,
        name: def.name,
        type: 'WEAPON',
        rarity: 'COMMON',
        description: def.description,
        durability: 100,
        levelRequired: 1,
        stats: def.stats,
      },
    });
  }

  // Ensure starter armor template exists
  await prisma.itemTemplate.upsert({
    where: { id: STARTER_ARMOR.templateId },
    update: {},
    create: {
      id: STARTER_ARMOR.templateId,
      name: STARTER_ARMOR.name,
      type: 'ARMOR',
      rarity: 'COMMON',
      description: STARTER_ARMOR.description,
      durability: 100,
      levelRequired: 1,
      stats: STARTER_ARMOR.stats,
    },
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
  const existingEquip = await prisma.characterEquipment.findFirst({
    where: { characterId, slot: 'MAIN_HAND' },
  });
  if (existingEquip) return;

  const def = STARTER_WEAPONS[characterClass.toLowerCase()] ?? FALLBACK_STARTER_WEAPON;

  const item = await prisma.item.create({
    data: {
      templateId: def.templateId,
      ownerId: characterId,
      quality: 'COMMON',
      currentDurability: 100,
    },
  });

  await prisma.inventory.create({
    data: {
      characterId,
      itemId: item.id,
      quantity: 1,
    },
  });

  await prisma.characterEquipment.create({
    data: {
      characterId,
      slot: 'MAIN_HAND',
      itemId: item.id,
    },
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
  const existingEquip = await prisma.characterEquipment.findFirst({
    where: { characterId, slot: 'CHEST' },
  });
  if (existingEquip) return;

  const item = await prisma.item.create({
    data: {
      templateId: STARTER_ARMOR.templateId,
      ownerId: characterId,
      quality: 'COMMON',
      currentDurability: 100,
    },
  });

  await prisma.inventory.create({
    data: {
      characterId,
      itemId: item.id,
      quantity: 1,
    },
  });

  await prisma.characterEquipment.create({
    data: {
      characterId,
      slot: 'CHEST',
      itemId: item.id,
    },
  });
}
