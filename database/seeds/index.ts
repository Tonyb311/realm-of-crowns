/**
 * Master seed script for Realm of Crowns
 *
 * Run with: npm run db:seed
 *
 * Seeds are added as features are built.
 * Each seed file exports an async function that receives the Prisma client.
 */

import { PrismaClient } from '@prisma/client';
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
import { seedAccessoryRecipes } from './accessory-recipes';

const prisma = new PrismaClient();

async function main() {
  console.log('⚔️  Seeding the Realm of Crowns database...');
  console.log('');

  // World geography: regions, towns, routes, resources
  await seedWorld(prisma);

  // Kingdoms: links regions and towns to governing kingdoms (P1 #16 / MAJOR-01/04)
  await seedKingdoms(prisma);

  // Resources: base gathering resources
  await seedResources(prisma);

  // Recipes and item templates
  await seedRecipes(prisma);

  // Monsters for PvE encounters
  await seedMonsters(prisma);

  // Quests and NPC quest givers
  await seedQuests(prisma);

  // Tool templates (36 tools: 6 types x 6 material tiers)
  await seedTools(prisma);

  // Town-resource assignments (validates + logs biome->resource mappings)
  await seedTownResources(prisma);

  // Consumable recipes (potions, food, drinks, scrolls)
  await seedConsumableRecipes(prisma);

  // Armor recipes (metal, leather, cloth - 75 recipes)
  await seedArmorRecipes(prisma);

  // Racial relations (190 unique pairings, 20x20 matrix)
  await seedDiplomacy(prisma);

  // Travel nodes: convert TravelRoutes into node chains for tick-based travel
  await seedNodes(prisma);

  // Food & beverage item templates (32 items: raw, prepared, preserved, quality, fine, beverages)
  await seedFoodItems(prisma);

  // Weapon recipes: blacksmith and fletcher weapon item templates + recipes (MINOR-07)
  await seedWeaponRecipes(prisma);

  // Accessory recipes: accessories, enchantments, housing, mount gear (MINOR-07)
  await seedAccessoryRecipes(prisma);

  // Class abilities: 7 classes x 3 specs = 21 skill trees (P1 #17 / MAJOR-05)
  await seedAbilities(prisma);

  // Achievements: combat, crafting, social, exploration, economy (P1 #17 / MAJOR-05)
  await seedAchievements(prisma);

  console.log('');
  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
