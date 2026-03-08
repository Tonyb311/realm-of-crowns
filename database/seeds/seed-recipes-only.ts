/**
 * Partial seed — runs only recipe + item template seeds.
 * Pre-loads existing templates from DB to avoid "template not found" errors
 * when resource templates were seeded by a previous full seed run.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import { seedRecipes } from './recipes';
import { seedConsumableRecipes } from './consumable-recipes';
import { seedArmorRecipes } from './armor-recipes';
import { seedWeaponRecipes } from './weapon-recipes';
import { seedCraftedGoodsRecipes } from './crafted-goods-recipes';
import { seedAccessoryRecipes } from './accessory-recipes';
import { seedFoodItems } from './food-items';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main() {
  console.log('⚔️  Seeding recipes + item templates only...\n');

  // Core item templates + processing recipes
  await seedRecipes(db);

  // Consumable recipes (potions, food, drinks, scrolls)
  await seedConsumableRecipes(db);

  // Armor recipes (metal, leather, cloth)
  await seedArmorRecipes(db);

  // Weapon recipes (blacksmith + fletcher)
  await seedWeaponRecipes(db);

  // Crafted goods (woodworker + blacksmith specializations)
  await seedCraftedGoodsRecipes(db);

  // Accessory recipes (accessories, enchantments, housing, mount gear)
  await seedAccessoryRecipes(db);

  // Food & beverage item templates
  await seedFoodItems(db);

  console.log('\n✅ Recipe + template seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
