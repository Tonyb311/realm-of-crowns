/**
 * Master seed script for Realm of Crowns
 *
 * Run with: npm run db:seed
 *
 * Seeds are added as features are built.
 * Each seed file exports an async function that receives the Prisma client.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedWorld } from './world';
import { seedResources } from './resources';
import { seedRecipes } from './recipes';
import { seedMonsters } from './monsters';
import { seedQuests } from './quests';
import { seedTools } from './tools';
import { seedTownResources } from './town-resources';
import { seedConsumableRecipes } from './consumable-recipes';
import { seedArmorRecipes } from './armor-recipes';
import { seedDiplomacy } from './diplomacy';
import { seedNodes } from './nodes';
import { seedFoodItems } from './food-items';
import { seedKingdoms } from './kingdoms';
import { seedAbilities } from './abilities';
import { seedAchievements } from './achievements';
import { seedWeaponRecipes } from './weapon-recipes';
import { seedCraftedGoodsRecipes } from './crafted-goods-recipes';
import { seedAccessoryRecipes } from './accessory-recipes';

const prisma = new PrismaClient();

async function seedAdmin(prisma: PrismaClient) {
  const ADMIN_EMAIL = 'admin@roc.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'RealmAdmin2026!';

  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    // Ensure role is admin
    if (existing.role !== 'admin') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'admin' } });
    }
    console.log('  Admin account (admin@roc.com) already exists — skipped');
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      username: 'admin',
      passwordHash,
      role: 'admin',
      isTestAccount: false,
    },
  });
  console.log('  Admin account (admin@roc.com) created');
}

async function runSeed(name: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (e) {
    console.error(`⚠️  Seed "${name}" failed (non-fatal):`, (e as Error).message);
    return false;
  }
}

async function main() {
  console.log('⚔️  Seeding the Realm of Crowns database...');
  console.log('');

  let failed = 0;

  // Admin account: must exist before anything else
  await seedAdmin(prisma);

  // World geography: regions, towns, routes, resources
  if (!await runSeed('world', () => seedWorld(prisma))) failed++;

  // Kingdoms: links regions and towns to governing kingdoms (P1 #16 / MAJOR-01/04)
  if (!await runSeed('kingdoms', () => seedKingdoms(prisma))) failed++;

  // Resources: base gathering resources
  if (!await runSeed('resources', () => seedResources(prisma))) failed++;

  // Recipes and item templates
  if (!await runSeed('recipes', () => seedRecipes(prisma))) failed++;

  // Monsters for PvE encounters
  if (!await runSeed('monsters', () => seedMonsters(prisma))) failed++;

  // Quests and NPC quest givers
  if (!await runSeed('quests', () => seedQuests(prisma))) failed++;

  // Tool templates (36 tools: 6 types x 6 material tiers)
  if (!await runSeed('tools', () => seedTools(prisma))) failed++;

  // Town-resource assignments (validates + logs biome->resource mappings)
  if (!await runSeed('townResources', () => seedTownResources(prisma))) failed++;

  // Consumable recipes (potions, food, drinks, scrolls)
  if (!await runSeed('consumableRecipes', () => seedConsumableRecipes(prisma))) failed++;

  // Armor recipes (metal, leather, cloth - 75 recipes)
  if (!await runSeed('armorRecipes', () => seedArmorRecipes(prisma))) failed++;

  // Racial relations (190 unique pairings, 20x20 matrix)
  if (!await runSeed('diplomacy', () => seedDiplomacy(prisma))) failed++;

  // Travel nodes: convert TravelRoutes into node chains for tick-based travel
  if (!await runSeed('nodes', () => seedNodes(prisma))) failed++;

  // Food & beverage item templates (32 items: raw, prepared, preserved, quality, fine, beverages)
  if (!await runSeed('foodItems', () => seedFoodItems(prisma))) failed++;

  // Weapon recipes: blacksmith and fletcher weapon item templates + recipes (MINOR-07)
  if (!await runSeed('weaponRecipes', () => seedWeaponRecipes(prisma))) failed++;

  // Crafted goods: woodworker finished goods (14) + blacksmith specializations (28)
  if (!await runSeed('craftedGoodsRecipes', () => seedCraftedGoodsRecipes(prisma))) failed++;

  // Accessory recipes: accessories, enchantments, housing, mount gear (MINOR-07)
  if (!await runSeed('accessoryRecipes', () => seedAccessoryRecipes(prisma))) failed++;

  // Class abilities: 7 classes x 3 specs = 21 skill trees (P1 #17 / MAJOR-05)
  if (!await runSeed('abilities', () => seedAbilities(prisma))) failed++;

  // Achievements: combat, crafting, social, exploration, economy (P1 #17 / MAJOR-05)
  if (!await runSeed('achievements', () => seedAchievements(prisma))) failed++;

  console.log('');
  if (failed > 0) {
    console.log(`⚠️  Seeding completed with ${failed} non-fatal failure(s)`);
  } else {
    console.log('✅ Database seeded successfully!');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
