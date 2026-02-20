/**
 * Partial seed — runs only recipe + item template seeds.
 * Pre-loads existing templates from DB to avoid "template not found" errors
 * when resource templates were seeded by a previous full seed run.
 */

import { PrismaClient } from '@prisma/client';
import { seedRecipes } from './recipes';
import { seedConsumableRecipes } from './consumable-recipes';
import { seedArmorRecipes } from './armor-recipes';
import { seedWeaponRecipes } from './weapon-recipes';
import { seedCraftedGoodsRecipes } from './crafted-goods-recipes';
import { seedAccessoryRecipes } from './accessory-recipes';
import { seedFoodItems } from './food-items';

const prisma = new PrismaClient();

async function main() {
  console.log('⚔️  Seeding recipes + item templates only...\n');

  // Core item templates + processing recipes
  await seedRecipes(prisma);

  // Consumable recipes (potions, food, drinks, scrolls)
  await seedConsumableRecipes(prisma);

  // Armor recipes (metal, leather, cloth)
  await seedArmorRecipes(prisma);

  // Weapon recipes (blacksmith + fletcher)
  await seedWeaponRecipes(prisma);

  // Crafted goods (woodworker + blacksmith specializations)
  await seedCraftedGoodsRecipes(prisma);

  // Accessory recipes (accessories, enchantments, housing, mount gear)
  await seedAccessoryRecipes(prisma);

  // Food & beverage item templates
  await seedFoodItems(prisma);

  console.log('\n✅ Recipe + template seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
