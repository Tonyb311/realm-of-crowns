/**
 * Comprehensive supply-chain seed: fills ALL missing ItemTemplates and Recipe rows
 * for TAILOR (4 recipes), COOK (15 recipes), and BREWER (9 recipes).
 *
 * Also upserts ~11 resource ItemTemplates for gathering outputs that lacked DB records,
 * plus 3 TAILOR processing outputs and all COOK/BREWER food/drink output templates.
 *
 * Run from project root:
 *   DATABASE_URL=... npx tsx database/seeds/seed-supply-chain.ts
 */
import { PrismaClient, ProfessionType, ProfessionTier } from '@prisma/client';
import { TAILOR_RECIPES } from '../../shared/src/data/recipes/tailor';
import { COOK_RECIPES } from '../../shared/src/data/recipes/cook';
import { BREWER_CONSUMABLES } from '../../shared/src/data/recipes/consumables';

function levelToTier(level: number): ProfessionTier {
  if (level >= 75) return 'MASTER';
  if (level >= 50) return 'EXPERT';
  if (level >= 30) return 'CRAFTSMAN';
  if (level >= 10) return 'JOURNEYMAN';
  return 'APPRENTICE';
}

function levelToRarity(level: number): 'COMMON' | 'FINE' | 'SUPERIOR' | 'MASTERWORK' {
  if (level >= 40) return 'MASTERWORK';
  if (level >= 25) return 'SUPERIOR';
  if (level >= 10) return 'FINE';
  return 'COMMON';
}

/** Generate a stable kebab-case ID from a name with a prefix */
function toId(prefix: string, name: string): string {
  return `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '')}`;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    // =================================================================
    // Step A: Resource ItemTemplates (gathering outputs needing DB rows)
    // =================================================================
    console.log('=== Step A: Upserting resource ItemTemplates ===');
    const resourceTemplates = [
      { id: 'resource-cotton', name: 'Cotton', type: 'MATERIAL' as const, description: 'Fluffy cotton bolls harvested from cultivated fields. Essential for spinning cloth.' },
      { id: 'resource-wool', name: 'Wool', type: 'MATERIAL' as const, description: 'Soft fleece sheared from healthy sheep. Used by tailors and weavers.' },
      { id: 'resource-fine-wool', name: 'Fine Wool', type: 'MATERIAL' as const, description: 'Exceptionally soft, high-grade wool from carefully bred sheep. The foundation of luxury garments.' },
      { id: 'resource-silkworm-cocoons', name: 'Silkworm Cocoons', type: 'MATERIAL' as const, description: 'Delicate cocoons spun by silkworms. Their threads produce fabric of extraordinary quality.' },
      { id: 'resource-hops', name: 'Hops', type: 'MATERIAL' as const, description: 'Aromatic hop flowers, essential for brewing fine beer.' },
      { id: 'resource-grapes', name: 'Grapes', type: 'MATERIAL' as const, description: 'Plump, juicy grapes, ready to be pressed into wine.' },
      { id: 'resource-vegetables', name: 'Vegetables', type: 'CONSUMABLE' as const, description: 'Carrots, onions, and turnips pulled fresh from the earth.' },
      { id: 'resource-wild-berries', name: 'Wild Berries', type: 'CONSUMABLE' as const, description: 'Plump wild berries gathered from hedgerows and forest edges.' },
      { id: 'resource-glowcap-mushrooms', name: 'Glowcap Mushrooms', type: 'MATERIAL' as const, description: 'Luminescent fungi found in shaded groves, prized by alchemists.' },
      { id: 'resource-eggs', name: 'Eggs', type: 'CONSUMABLE' as const, description: 'Fresh eggs collected from the chicken coop. Essential for cooking.' },
      { id: 'resource-milk', name: 'Milk', type: 'CONSUMABLE' as const, description: 'Rich, creamy milk from well-tended dairy cows. Prized by cooks and brewers.' },
    ];

    for (const res of resourceTemplates) {
      await prisma.itemTemplate.upsert({
        where: { id: res.id },
        update: { name: res.name, type: res.type, description: res.description },
        create: {
          id: res.id, name: res.name, type: res.type, rarity: 'COMMON',
          description: res.description, stats: {}, durability: 100,
          professionRequired: null, levelRequired: 1,
        },
      });
      console.log(`  + ${res.name} (${res.id})`);
    }

    // =================================================================
    // Step B: TAILOR processing output templates (3 new)
    // =================================================================
    console.log('\n=== Step B: Upserting TAILOR processing output templates ===');
    const tailorOutputs = [
      { id: 'processed-woven-cloth', name: 'Woven Cloth', rarity: 'COMMON' as const, description: 'Sturdy fabric woven from raw wool. Warm and durable, ideal for everyday garments.', durability: 90, levelRequired: 3 },
      { id: 'processed-fine-cloth', name: 'Fine Cloth', rarity: 'FINE' as const, description: 'Exquisitely soft fabric woven from fine wool. Favored for noble attire and enchanted robes.', durability: 80, levelRequired: 7 },
      { id: 'processed-silk-fabric', name: 'Silk Fabric', rarity: 'SUPERIOR' as const, description: 'Shimmering fabric processed from silkworm cocoons. Lightweight yet resilient, prized by master tailors.', durability: 70, levelRequired: 7 },
    ];

    for (const tmpl of tailorOutputs) {
      await prisma.itemTemplate.upsert({
        where: { id: tmpl.id },
        update: { name: tmpl.name, rarity: tmpl.rarity, description: tmpl.description },
        create: {
          id: tmpl.id, name: tmpl.name, type: 'MATERIAL', rarity: tmpl.rarity,
          description: tmpl.description, stats: {}, durability: tmpl.durability,
          professionRequired: 'TAILOR', levelRequired: tmpl.levelRequired,
        },
      });
      console.log(`  + ${tmpl.name} (${tmpl.id})`);
    }

    // =================================================================
    // Step C: COOK output templates (15 from COOK_RECIPES)
    // =================================================================
    console.log('\n=== Step C: Upserting COOK output templates ===');
    const cookOutputs = [
      // Tier 1 — Level 1
      { id: 'processed-flour', name: 'Flour', type: 'MATERIAL' as const, rarity: 'COMMON' as const, description: 'Finely ground flour milled from grain. The foundation of bread, pastries, and pies.' },
      { id: 'consumable-apple-sauce', name: 'Apple Sauce', type: 'CONSUMABLE' as const, rarity: 'COMMON' as const, description: 'Sweet, smooth apple sauce. A simple but nourishing treat.' },
      { id: 'consumable-porridge', name: 'Porridge', type: 'CONSUMABLE' as const, rarity: 'COMMON' as const, description: 'Warm, thick porridge made from grain. Filling and comforting.' },
      { id: 'consumable-berry-jam', name: 'Berry Jam', type: 'CONSUMABLE' as const, rarity: 'COMMON' as const, description: 'Thick, sweet jam made from wild berries. Delicious on bread.' },
      { id: 'consumable-grilled-fish', name: 'Grilled Fish', type: 'CONSUMABLE' as const, rarity: 'COMMON' as const, description: 'Fish seared over hot coals. Simple, satisfying fare.' },
      { id: 'consumable-herbal-tea', name: 'Herbal Tea', type: 'CONSUMABLE' as const, rarity: 'COMMON' as const, description: 'A fragrant infusion of wild herbs that clears the mind.' },
      { id: 'consumable-vegetable-stew', name: 'Vegetable Stew', type: 'CONSUMABLE' as const, rarity: 'COMMON' as const, description: 'A hearty stew of root vegetables. Warms body and spirit.' },
      // Tier 2 — Level 5
      { id: 'consumable-bread-loaf', name: 'Bread Loaf', type: 'CONSUMABLE' as const, rarity: 'COMMON' as const, description: 'A crusty loaf of freshly baked bread. The staple of every table.' },
      { id: 'consumable-apple-pie', name: 'Apple Pie', type: 'CONSUMABLE' as const, rarity: 'FINE' as const, description: 'A golden-crusted pie bursting with cinnamon-spiced apple filling.' },
      { id: 'consumable-fish-stew', name: 'Fish Stew', type: 'CONSUMABLE' as const, rarity: 'COMMON' as const, description: 'A rich stew of fish, herbs, and vegetables. Sharpens the senses.' },
      { id: 'consumable-seasoned-roast-vegetables', name: 'Seasoned Roast Vegetables', type: 'CONSUMABLE' as const, rarity: 'COMMON' as const, description: 'Roasted vegetables seasoned with herbs. Nutritious and flavorful.' },
      { id: 'consumable-berry-tart', name: 'Berry Tart', type: 'CONSUMABLE' as const, rarity: 'FINE' as const, description: 'A delicate pastry filled with berry jam. Sweet and satisfying.' },
      // Tier 3 — Level 7
      { id: 'consumable-harvest-feast', name: 'Harvest Feast', type: 'CONSUMABLE' as const, rarity: 'FINE' as const, description: 'A bountiful spread of bread, fruits, and herbs. Feeds the whole table.' },
      { id: 'consumable-fishermans-banquet', name: "Fisherman's Banquet", type: 'CONSUMABLE' as const, rarity: 'FINE' as const, description: 'A lavish seafood spread with grilled fish, bread, and jam.' },
      { id: 'consumable-spiced-pastry', name: 'Spiced Pastry', type: 'CONSUMABLE' as const, rarity: 'FINE' as const, description: 'A flaky pastry dusted with exotic herbs and filled with berry jam.' },
    ];

    for (const tmpl of cookOutputs) {
      await prisma.itemTemplate.upsert({
        where: { id: tmpl.id },
        update: { name: tmpl.name, type: tmpl.type, rarity: tmpl.rarity, description: tmpl.description },
        create: {
          id: tmpl.id, name: tmpl.name, type: tmpl.type, rarity: tmpl.rarity,
          description: tmpl.description, stats: {}, durability: tmpl.type === 'MATERIAL' ? 100 : 1,
          professionRequired: 'COOK', levelRequired: 1,
        },
      });
      console.log(`  + ${tmpl.name} (${tmpl.id})`);
    }

    // =================================================================
    // Step D: BREWER output templates (9 from BREWER_CONSUMABLES)
    // =================================================================
    console.log('\n=== Step D: Upserting BREWER output templates ===');

    for (const recipe of BREWER_CONSUMABLES) {
      const name = recipe.output.itemName;
      const stableId = toId('consumable', name);
      const rarity = levelToRarity(recipe.levelRequired);

      await prisma.itemTemplate.upsert({
        where: { id: stableId },
        update: {
          name, type: 'CONSUMABLE', rarity, description: recipe.description,
          stats: {
            effect: recipe.consumableStats.effect,
            magnitude: recipe.consumableStats.magnitude,
            duration: recipe.consumableStats.duration,
            stackSize: recipe.consumableStats.stackSize,
          },
        },
        create: {
          id: stableId, name, type: 'CONSUMABLE', rarity, description: recipe.description,
          stats: {
            effect: recipe.consumableStats.effect,
            magnitude: recipe.consumableStats.magnitude,
            duration: recipe.consumableStats.duration,
            stackSize: recipe.consumableStats.stackSize,
          },
          durability: 1, professionRequired: 'BREWER', levelRequired: recipe.levelRequired,
        },
      });
      console.log(`  + ${name} (${stableId})`);
    }

    // =================================================================
    // Step E: Build template name → ID map
    // =================================================================
    console.log('\n=== Step E: Building template map ===');
    const allTemplates = await prisma.itemTemplate.findMany({
      select: { id: true, name: true },
    });
    const templateMap = new Map<string, string>();
    for (const t of allTemplates) {
      templateMap.set(t.name, t.id);
    }
    console.log(`  Found ${templateMap.size} templates in DB`);

    // =================================================================
    // Step F: Seed TAILOR recipe rows (4 — RecipeDefinition format)
    // =================================================================
    console.log('\n=== Step F: Seeding TAILOR recipes ===');
    let totalCount = 0;

    for (const recipe of TAILOR_RECIPES) {
      const ingredients = recipe.inputs.map((inp) => {
        const templateId = templateMap.get(inp.itemName);
        if (!templateId) {
          throw new Error(`Item template not found for input: "${inp.itemName}" (recipe: ${recipe.name}).`);
        }
        return { itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity };
      });

      const outputName = recipe.outputs[0].itemName;
      const resultId = templateMap.get(outputName);
      if (!resultId) {
        throw new Error(`Item template not found for output: "${outputName}" (recipe: ${recipe.name}).`);
      }

      const recipeId = `recipe-${recipe.recipeId}`;
      const tier = levelToTier(recipe.levelRequired);

      await prisma.recipe.upsert({
        where: { id: recipeId },
        update: {
          name: recipe.name,
          professionType: recipe.professionRequired as ProfessionType,
          tier, ingredients, result: resultId,
          craftTime: recipe.craftTime, xpReward: recipe.xpReward,
        },
        create: {
          id: recipeId, name: recipe.name,
          professionType: recipe.professionRequired as ProfessionType,
          tier, ingredients, result: resultId,
          craftTime: recipe.craftTime, xpReward: recipe.xpReward,
        },
      });
      totalCount++;
      console.log(`  + ${recipe.name} (TAILOR L${recipe.levelRequired} / ${tier})`);
    }

    // =================================================================
    // Step G: Seed COOK recipe rows (15 — RecipeDefinition format)
    // =================================================================
    console.log('\n=== Step G: Seeding COOK recipes ===');

    for (const recipe of COOK_RECIPES) {
      const ingredients = recipe.inputs.map((inp) => {
        const templateId = templateMap.get(inp.itemName);
        if (!templateId) {
          throw new Error(`Item template not found for input: "${inp.itemName}" (recipe: ${recipe.name}).`);
        }
        return { itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity };
      });

      const outputName = recipe.outputs[0].itemName;
      const resultId = templateMap.get(outputName);
      if (!resultId) {
        throw new Error(`Item template not found for output: "${outputName}" (recipe: ${recipe.name}).`);
      }

      const recipeId = `recipe-${recipe.recipeId}`;
      const tier = levelToTier(recipe.levelRequired);

      await prisma.recipe.upsert({
        where: { id: recipeId },
        update: {
          name: recipe.name,
          professionType: recipe.professionRequired as ProfessionType,
          tier, ingredients, result: resultId,
          craftTime: recipe.craftTime, xpReward: recipe.xpReward,
        },
        create: {
          id: recipeId, name: recipe.name,
          professionType: recipe.professionRequired as ProfessionType,
          tier, ingredients, result: resultId,
          craftTime: recipe.craftTime, xpReward: recipe.xpReward,
        },
      });
      totalCount++;
      console.log(`  + ${recipe.name} (COOK L${recipe.levelRequired} / ${tier})`);
    }

    // =================================================================
    // Step H: Seed BREWER recipe rows (9 — ConsumableRecipe format)
    // =================================================================
    console.log('\n=== Step H: Seeding BREWER recipes ===');

    for (const recipe of BREWER_CONSUMABLES) {
      const ingredients = recipe.inputs.map((inp) => {
        const templateId = templateMap.get(inp.itemName);
        if (!templateId) {
          throw new Error(`Item template not found for input: "${inp.itemName}" (recipe: ${recipe.name}).`);
        }
        return { itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity };
      });

      // ConsumableRecipe uses `output` (singular), not `outputs` (array)
      const outputName = recipe.output.itemName;
      const resultId = templateMap.get(outputName);
      if (!resultId) {
        throw new Error(`Item template not found for output: "${outputName}" (recipe: ${recipe.name}).`);
      }

      const recipeId = `recipe-${recipe.recipeId}`;
      const tier = levelToTier(recipe.levelRequired);

      await prisma.recipe.upsert({
        where: { id: recipeId },
        update: {
          name: recipe.name,
          professionType: recipe.professionRequired as ProfessionType,
          tier, ingredients, result: resultId,
          craftTime: recipe.craftTime, xpReward: recipe.xpReward,
        },
        create: {
          id: recipeId, name: recipe.name,
          professionType: recipe.professionRequired as ProfessionType,
          tier, ingredients, result: resultId,
          craftTime: recipe.craftTime, xpReward: recipe.xpReward,
        },
      });
      totalCount++;
      console.log(`  + ${recipe.name} (BREWER L${recipe.levelRequired} / ${tier})`);
    }

    console.log(`\n==============================`);
    console.log(`Done: ${totalCount} recipes seeded (4 TAILOR + 15 COOK + 9 BREWER)`);
    console.log(`==============================`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
