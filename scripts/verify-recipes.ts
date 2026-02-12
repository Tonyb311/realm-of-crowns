/**
 * Recipe Pipeline Verification Script
 *
 * Checks:
 * 1. Every recipe input item exists in ITEMS
 * 2. Every recipe output item exists in ITEMS
 * 3. Every recipe references a valid profession
 * 4. Every production profession has at least 1 recipe
 * 5. No orphaned items with zero uses (used as input, output, or gathering item)
 * 6. All 8 gathering items feed into at least 2 recipes
 *
 * Run: npx tsx scripts/verify-recipes.ts
 */

import { ITEMS, ItemName } from '../shared/src/data/items/item-names';
import {
  ALL_PROCESSING_RECIPES,
  ALL_FINISHED_GOODS_RECIPES,
  ALL_CONSUMABLE_RECIPES,
  ALL_ACCESSORY_RECIPES,
} from '../shared/src/data/recipes';
import { TOWN_GATHERING_SPOTS } from '../shared/src/data/gathering';

// All valid item names
const validItems = new Set<string>(Object.values(ITEMS));

// All crafting professions
const CRAFTING_PROFESSIONS = new Set([
  'SMELTER', 'TANNER', 'TAILOR', 'MASON', 'WOODWORKER',
  'BLACKSMITH', 'ARMORER', 'LEATHERWORKER',
  'ALCHEMIST', 'COOK', 'BREWER', 'SCRIBE',
  'JEWELER', 'FLETCHER', 'ENCHANTER', 'STABLE_MASTER',
]);

// Combine all recipes into a uniform format
interface UnifiedRecipe {
  recipeId: string;
  name: string;
  professionRequired: string;
  inputs: { itemName: string; quantity: number }[];
  outputs: { itemName: string; quantity: number }[];
}

const allRecipes: UnifiedRecipe[] = [];

for (const r of ALL_PROCESSING_RECIPES) {
  allRecipes.push({ recipeId: r.recipeId, name: r.name, professionRequired: r.professionRequired, inputs: r.inputs, outputs: r.outputs });
}
for (const r of ALL_ACCESSORY_RECIPES) {
  allRecipes.push({ recipeId: r.recipeId, name: r.name, professionRequired: r.professionRequired, inputs: r.inputs, outputs: r.outputs });
}
for (const r of ALL_FINISHED_GOODS_RECIPES) {
  allRecipes.push({ recipeId: r.recipeId, name: r.name, professionRequired: r.professionRequired, inputs: r.inputs, outputs: r.outputs });
}
for (const r of ALL_CONSUMABLE_RECIPES) {
  allRecipes.push({ recipeId: r.recipeId, name: r.name, professionRequired: r.professionRequired, inputs: r.inputs, outputs: [r.output] });
}

let errors = 0;
let warnings = 0;

function err(msg: string) { console.error(`  ERROR: ${msg}`); errors++; }
function warn(msg: string) { console.warn(`  WARN:  ${msg}`); warnings++; }

// ---- Check 1: Every recipe input item exists ----
console.log('\n=== CHECK 1: Recipe input items exist ===');
for (const r of allRecipes) {
  for (const inp of r.inputs) {
    if (!validItems.has(inp.itemName)) {
      err(`Recipe "${r.recipeId}" input "${inp.itemName}" not found in ITEMS`);
    }
  }
}
if (errors === 0) console.log('  PASS: All recipe inputs reference valid items.');

// ---- Check 2: Every recipe output item exists ----
console.log('\n=== CHECK 2: Recipe output items exist ===');
const prevErrors = errors;
for (const r of allRecipes) {
  for (const out of r.outputs) {
    if (!validItems.has(out.itemName)) {
      err(`Recipe "${r.recipeId}" output "${out.itemName}" not found in ITEMS`);
    }
  }
}
if (errors === prevErrors) console.log('  PASS: All recipe outputs reference valid items.');

// ---- Check 3: Every recipe references a valid profession ----
console.log('\n=== CHECK 3: Recipe professions are valid ===');
const prevErrors3 = errors;
for (const r of allRecipes) {
  if (!CRAFTING_PROFESSIONS.has(r.professionRequired)) {
    err(`Recipe "${r.recipeId}" references unknown profession "${r.professionRequired}"`);
  }
}
if (errors === prevErrors3) console.log('  PASS: All recipes reference valid professions.');

// ---- Check 4: Every production profession has at least 1 recipe ----
console.log('\n=== CHECK 4: Profession recipe coverage ===');
const recipesByProfession = new Map<string, number>();
for (const r of allRecipes) {
  recipesByProfession.set(r.professionRequired, (recipesByProfession.get(r.professionRequired) ?? 0) + 1);
}
for (const prof of CRAFTING_PROFESSIONS) {
  const count = recipesByProfession.get(prof) ?? 0;
  if (count === 0) {
    warn(`Profession "${prof}" has 0 recipes`);
  } else {
    console.log(`  ${prof}: ${count} recipes`);
  }
}

// ---- Check 5: Orphaned items ----
console.log('\n=== CHECK 5: Orphaned items (no recipe uses) ===');
const usedItems = new Set<string>();
for (const r of allRecipes) {
  for (const inp of r.inputs) usedItems.add(inp.itemName);
  for (const out of r.outputs) usedItems.add(out.itemName);
}
// Also count gathering items as "used"
for (const spot of Object.values(TOWN_GATHERING_SPOTS)) {
  usedItems.add(spot.item.templateName);
}
const orphaned: string[] = [];
for (const item of validItems) {
  if (!usedItems.has(item)) {
    orphaned.push(item);
  }
}
if (orphaned.length > 0) {
  console.log(`  ${orphaned.length} items not referenced in any recipe or gathering spot:`);
  for (const item of orphaned.sort()) {
    warn(`Orphaned item: "${item}"`);
  }
} else {
  console.log('  PASS: All items are referenced in at least one recipe or gathering spot.');
}

// ---- Check 6: Gathering items feed into recipes ----
console.log('\n=== CHECK 6: Gathering items -> recipe usage ===');
const gatheringItems = [
  'Apples', 'Raw Fish', 'Wild Berries', 'Wild Herbs',
  'Iron Ore Chunks', 'Wood Logs', 'Stone Blocks', 'Clay',
];
for (const gi of gatheringItems) {
  const recipesUsing = allRecipes.filter(r => r.inputs.some(inp => inp.itemName === gi));
  const count = recipesUsing.length;
  if (count < 2) {
    err(`Gathering item "${gi}" used in only ${count} recipe(s) (need >= 2)`);
  } else {
    console.log(`  ${gi}: ${count} recipes (${recipesUsing.map(r => r.recipeId).join(', ')})`);
  }
}

// ---- Check 7: Duplicate recipe IDs ----
console.log('\n=== CHECK 7: Duplicate recipe IDs ===');
const idCounts = new Map<string, number>();
for (const r of allRecipes) {
  idCounts.set(r.recipeId, (idCounts.get(r.recipeId) ?? 0) + 1);
}
const prevErrors7 = errors;
for (const [id, count] of idCounts) {
  if (count > 1) {
    err(`Duplicate recipeId: "${id}" appears ${count} times`);
  }
}
if (errors === prevErrors7) console.log('  PASS: All recipe IDs are unique.');

// ---- Summary ----
console.log('\n========================================');
console.log(`Total items: ${validItems.size}`);
console.log(`Total recipes: ${allRecipes.length}`);
console.log(`Errors: ${errors}`);
console.log(`Warnings: ${warnings}`);
console.log('========================================\n');

process.exit(errors > 0 ? 1 : 0);
