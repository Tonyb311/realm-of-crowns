/**
 * Master seed script for Realm of Crowns
 *
 * Run with: npm run db:seed
 *
 * Seeds are added as features are built.
 * Each seed file exports an async function that receives the Drizzle client.
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';
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
import { seedBaseValuePropagation } from './base-value-propagation';
import { seedTannerRecipes } from './run-tanner';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function seedAdmin(db: any) {
  const ADMIN_EMAIL = 'admin@roc.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'RealmAdmin2026!';

  const existing = await db.query.users.findFirst({ where: eq(schema.users.email, ADMIN_EMAIL) });
  if (existing) {
    // Ensure role is admin
    if (existing.role !== 'admin') {
      await db.update(schema.users).set({ role: 'admin' }).where(eq(schema.users.id, existing.id));
    }
    console.log('  Admin account (admin@roc.com) already exists — skipped');
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await db.insert(schema.users).values({
    id: crypto.randomUUID(),
    email: ADMIN_EMAIL,
    username: 'admin',
    passwordHash,
    role: 'admin',
    isTestAccount: false,
  });
  console.log('  Admin account (admin@roc.com) created');
}

async function migrateBackpacksToBAGSlot(db: any) {
  console.log('--- Migrating backpack equipment from BACK to BAG slot ---');
  const result = await db.execute(sql`
    UPDATE character_equipment SET slot = 'BAG'
    WHERE slot = 'BACK' AND item_id IN (
      SELECT i.id FROM items i
      JOIN item_templates it ON i.template_id = it.id
      WHERE it.name IN ('Leather Backpack', 'Ranger''s Pack', 'Explorer''s Pack', 'Leather Pouch', 'Adventurer''s Haversack',
        'Minor Bag of Holding', 'Bag of Holding', 'Greater Bag of Holding', 'Grand Bag of Holding')
    )
  `);
  console.log(`  Migrated ${result.rowCount ?? 0} equipped backpacks from BACK to BAG slot`);
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
  await seedAdmin(db);

  // World geography: regions, towns, routes, resources
  if (!await runSeed('world', () => seedWorld(db))) failed++;

  // Kingdoms: links regions and towns to governing kingdoms (P1 #16 / MAJOR-01/04)
  if (!await runSeed('kingdoms', () => seedKingdoms(db))) failed++;

  // Resources: base gathering resources
  if (!await runSeed('resources', () => seedResources(db))) failed++;

  // Recipes and item templates
  if (!await runSeed('recipes', () => seedRecipes(db))) failed++;

  // Monsters for PvE encounters
  if (!await runSeed('monsters', () => seedMonsters(db))) failed++;

  // Quests and NPC quest givers
  if (!await runSeed('quests', () => seedQuests(db))) failed++;

  // Tool templates (36 tools: 6 types x 6 material tiers)
  if (!await runSeed('tools', () => seedTools(db))) failed++;

  // Town-resource assignments (validates + logs biome->resource mappings)
  if (!await runSeed('townResources', () => seedTownResources(db))) failed++;

  // Consumable recipes (potions, food, drinks, scrolls)
  if (!await runSeed('consumableRecipes', () => seedConsumableRecipes(db))) failed++;

  // Armor recipes (metal, leather, cloth - 75 recipes)
  if (!await runSeed('armorRecipes', () => seedArmorRecipes(db))) failed++;

  // Migrate backpacks from BACK slot to BAG slot (idempotent)
  if (!await runSeed('backpackMigration', () => migrateBackpacksToBAGSlot(db))) failed++;

  // Racial relations (190 unique pairings, 20x20 matrix)
  if (!await runSeed('diplomacy', () => seedDiplomacy(db))) failed++;

  // Travel nodes: convert TravelRoutes into node chains for tick-based travel
  if (!await runSeed('nodes', () => seedNodes(db))) failed++;

  // Food & beverage item templates (32 items: raw, prepared, preserved, quality, fine, beverages)
  if (!await runSeed('foodItems', () => seedFoodItems(db))) failed++;

  // Weapon recipes: blacksmith and fletcher weapon item templates + recipes (MINOR-07)
  if (!await runSeed('weaponRecipes', () => seedWeaponRecipes(db))) failed++;

  // Crafted goods: woodworker finished goods (14) + blacksmith specializations (28)
  if (!await runSeed('craftedGoodsRecipes', () => seedCraftedGoodsRecipes(db))) failed++;

  // Accessory recipes: accessories, enchantments, housing, mount gear (MINOR-07)
  if (!await runSeed('accessoryRecipes', () => seedAccessoryRecipes(db))) failed++;

  // TANNER recipes: 16 recipes (Cured Leather, armor, tools)
  if (!await runSeed('tannerRecipes', () => seedTannerRecipes(db))) failed++;

  // Class abilities: 7 classes x 3 specs = 21 skill trees (P1 #17 / MAJOR-05)
  if (!await runSeed('abilities', () => seedAbilities(db))) failed++;

  // Achievements: combat, crafting, social, exploration, economy (P1 #17 / MAJOR-05)
  if (!await runSeed('achievements', () => seedAchievements(db))) failed++;

  // Base value propagation: catch-all pass that prices ANY remaining zero-value items
  // Must run LAST — after all other seeds have created their templates
  if (!await runSeed('baseValuePropagation', () => seedBaseValuePropagation(db))) failed++;

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
    await pool.end();
  });
