/**
 * Targeted seed runner for the 6 pipeline fixes.
 * Upserts only the NEW templates added by Fixes 1+2A, then seeds
 * the 42 crafted goods recipes from Fixes 2B+6.
 *
 * Fix 4 (COOK dedup) and Fix 5 (TAILOR orphan removal) are source-code-only
 * changes that don't require DB updates — the canonical recipes already exist.
 *
 * Usage: cd database && DATABASE_URL=... npx tsx seeds/run-pipeline-fixes.ts
 */

import { PrismaClient } from '@prisma/client';
import { seedCraftedGoodsRecipes } from './crafted-goods-recipes';

const prisma = new PrismaClient();

// Fix 1: TANNER intermediate templates
const TANNER_TEMPLATES = [
  {
    id: 'crafted-cured-leather',
    name: 'Cured Leather',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Animal pelts that have been cleaned, stretched, and treated. The foundation of all leather goods.',
    stats: {},
    durability: 100,
    professionRequired: 'TANNER',
    levelRequired: 3,
  },
  {
    id: 'crafted-wolf-leather',
    name: 'Wolf Leather',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'Tanned wolf hide. Tougher and more flexible than standard leather.',
    stats: {},
    durability: 100,
    professionRequired: 'TANNER',
    levelRequired: 7,
  },
  {
    id: 'crafted-bear-leather',
    name: 'Bear Leather',
    type: 'MATERIAL',
    rarity: 'FINE',
    description: 'Dense tanned bear hide. Almost as protective as chain mail, but far more flexible.',
    stats: {},
    durability: 100,
    professionRequired: 'TANNER',
    levelRequired: 7,
  },
];

// Fix 2A: WOODWORKER intermediate templates
const WOODWORKER_TEMPLATES = [
  {
    id: 'crafted-wooden-dowels',
    name: 'Wooden Dowels',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'Thin wooden pegs used to join furniture and tools.',
    stats: {},
    durability: 100,
    professionRequired: 'WOODWORKER',
    levelRequired: 3,
  },
  {
    id: 'crafted-wooden-handle',
    name: 'Wooden Handle',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A shaped hardwood handle for tools and weapons.',
    stats: {},
    durability: 100,
    professionRequired: 'WOODWORKER',
    levelRequired: 5,
  },
  {
    id: 'crafted-bow-stave',
    name: 'Bow Stave',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A carefully shaped stave of hardwood, ready to be strung into a bow.',
    stats: {},
    durability: 100,
    professionRequired: 'WOODWORKER',
    levelRequired: 8,
  },
  {
    id: 'crafted-wooden-frame',
    name: 'Wooden Frame',
    type: 'MATERIAL',
    rarity: 'COMMON',
    description: 'A sturdy wooden frame used as the skeleton for furniture and crates.',
    stats: {},
    durability: 100,
    professionRequired: 'WOODWORKER',
    levelRequired: 12,
  },
];

async function main() {
  console.log('⚔️  Running seed pipeline fixes...');
  console.log('');

  // Fix 1: Upsert 3 TANNER intermediate templates
  console.log('--- Fix 1: TANNER templates ---');
  for (const tmpl of TANNER_TEMPLATES) {
    await prisma.itemTemplate.upsert({
      where: { id: tmpl.id },
      update: { name: tmpl.name, type: tmpl.type, rarity: tmpl.rarity, description: tmpl.description, stats: tmpl.stats, durability: tmpl.durability, professionRequired: tmpl.professionRequired, levelRequired: tmpl.levelRequired },
      create: { id: tmpl.id, name: tmpl.name, type: tmpl.type, rarity: tmpl.rarity, description: tmpl.description, stats: tmpl.stats, durability: tmpl.durability, professionRequired: tmpl.professionRequired, levelRequired: tmpl.levelRequired },
    });
    console.log(`  + ${tmpl.name}`);
  }

  // Fix 2A: Upsert 4 WOODWORKER intermediate templates
  console.log('--- Fix 2A: WOODWORKER templates ---');
  for (const tmpl of WOODWORKER_TEMPLATES) {
    await prisma.itemTemplate.upsert({
      where: { id: tmpl.id },
      update: { name: tmpl.name, type: tmpl.type, rarity: tmpl.rarity, description: tmpl.description, stats: tmpl.stats, durability: tmpl.durability, professionRequired: tmpl.professionRequired, levelRequired: tmpl.levelRequired },
      create: { id: tmpl.id, name: tmpl.name, type: tmpl.type, rarity: tmpl.rarity, description: tmpl.description, stats: tmpl.stats, durability: tmpl.durability, professionRequired: tmpl.professionRequired, levelRequired: tmpl.levelRequired },
    });
    console.log(`  + ${tmpl.name}`);
  }

  // Fix 2B + Fix 6: Seed 14 WW finished goods + 28 BS specialization recipes
  console.log('--- Fix 2B + Fix 6: Crafted goods recipes ---');
  await seedCraftedGoodsRecipes(prisma);

  console.log('');
  console.log('✅ Pipeline fixes seeded successfully!');
  console.log('  Fix 3: LEATHERWORKER inputs now resolve (Cured/Wolf/Bear Leather + Wooden Frame/Handle)');
  console.log('  Fix 4: COOK dedup — source code only, no DB change needed');
  console.log('  Fix 5: TAILOR orphan removal — source code only, no DB change needed');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
