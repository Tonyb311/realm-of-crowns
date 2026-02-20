/**
 * YAML↔TS Sync Validator for Realm of Crowns
 *
 * Compares the YAML economy source of truth against TypeScript seed data.
 * Reports missing items, base value drift, and recipe mismatches.
 *
 * The YAML file contains free-form text sections that aren't valid YAML,
 * so we use regex-based extraction instead of a YAML parser.
 *
 * Usage:
 *   npx tsx --tsconfig database/tsconfig.json database/scripts/validate-yaml-sync.ts
 *   npm run validate:economy
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// TYPES
// ============================================================

interface YamlItem {
  name: string;
  baseValue: number;
  section: string;
}

interface TsItem {
  name: string;
  baseValue: number;
  source: string;
}

interface Issue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
}

// ============================================================
// NAME ALIASES — known YAML↔TS naming differences
// Maps YAML canonical name → TS name (or vice versa)
// These are the SAME item with different names across systems.
// ============================================================

const YAML_TO_TS_ALIASES: Record<string, string> = {
  // YAML name → TS name
  'Apple': 'Apples',
  'Raw Hide': 'Raw Leather',
  'Arcane Reagents': 'Arcane Reagent',
  'Wooden Beams': 'Beams',
};

// Items that intentionally exist only in TS (not in YAML) — suppress orphan warnings
const TS_ONLY_ITEMS = new Set([
  // Legacy/generic resource names used by old non-processing recipes
  'Herbs',        // generic; YAML has "Wild Herbs" (different item)
  'Lumber',       // generic; YAML has "Wood Logs" (different item)
  'Hide',         // generic; YAML has "Animal Pelts" (different item)
  'Fiber',        // generic crafting input, no YAML equivalent
  'Raw Stone',    // generic; YAML has "Stone Blocks"
  'Sandstone',    // resource item, not in YAML economy section
  'Bark',         // resource item used by tanning recipes
  'Exotic Hide',  // high-tier hide, not yet in YAML
  'Dragon Hide',  // endgame material, not yet in YAML
  'Flax',         // fiber resource, not yet in YAML
  'Silk Thread',  // processed silk, YAML has "Silkworm Cocoons" as raw
  'Salt',         // cooking ingredient, not yet in YAML economy
  'Rare Herbs',   // YAML has "Medicinal Herbs" (different BV context)
  'Raw Fish',     // gathering item, YAML uses different name
]);

// Items that intentionally exist only in YAML (future content, not yet implemented)
const YAML_ONLY_ITEMS = new Set([
  // Future ores not yet implemented in gathering
  'Gold Ore',
  'Mithril Ore',
  'Adamantine Ore',
  // Future resources
  'Marble',
  'Silite Sand',
  'Spices',
  'Beef',
  'Pork',
  'Chicken',
  'Wheat',
  'Raw Hide',
  // BLACKSMITH items in YAML not yet implemented as recipes
  'Copper Hoe',
  'Reinforced Shield',
  'Iron Fishing Spear',
  'Reinforced Helm',
]);

// ============================================================
// YAML PARSING (regex-based, since the file has free-form text)
// ============================================================

function parseYaml(filePath: string): YamlItem[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const seen = new Map<string, YamlItem>();

  // --- Pattern 1: gathering_spot_types & magical_components ---
  // Matches: resource: "Item Name" ... base_value: 123
  const resourceBlockRegex = /resource:\s*(?:["']?)([^"'\n]+?)(?:["']?)\s*\n(?:[\s\S]*?)base_value:\s*(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = resourceBlockRegex.exec(content)) !== null) {
    const name = m[1].trim();
    const bv = parseInt(m[2], 10);
    seen.set(name, { name, baseValue: bv, section: 'resource_block' });
  }

  // --- Pattern 2: base_value_reference section ---
  // Matches: { name: Item Name, base_value: 123 }
  const bvRefRegex = /\{\s*name:\s*(?:["']?)([^"',}]+?)(?:["']?)\s*,\s*base_value:\s*(\d+)/g;
  while ((m = bvRefRegex.exec(content)) !== null) {
    const name = m[1].trim();
    const bv = parseInt(m[2], 10);
    // base_value_reference entries override resource_block entries
    seen.set(name, { name, baseValue: bv, section: 'base_value_reference' });
  }

  // --- Pattern 3: recipe lines with output + base_value ---
  // Matches: output: "Item Name", base_value: 123
  // EXCLUDES qty-prefixed outputs like "2x Copper Ingot"
  const recipeOutputRegex = /output:\s*(?:["']?)(?!\d+x\s)([^"',}]+?)(?:["']?)\s*,\s*base_value:\s*(\d+)/g;
  while ((m = recipeOutputRegex.exec(content)) !== null) {
    const name = m[1].trim();
    const bv = parseInt(m[2], 10);
    if (!seen.has(name) || seen.get(name)!.section !== 'base_value_reference') {
      seen.set(name, { name, baseValue: bv, section: 'recipe_output' });
    }
  }

  // --- Pattern 4: recipe lines with output quantity + base_value ---
  // Matches: output: "2x Item Name", base_value: 123
  // Strips the quantity prefix — "2x Copper Ingot" → "Copper Ingot"
  const recipeQtyOutputRegex = /output:\s*(?:["']?)\d+x\s+([^"',}]+?)(?:["']?)\s*,\s*base_value:\s*(\d+)/g;
  while ((m = recipeQtyOutputRegex.exec(content)) !== null) {
    const name = m[1].trim();
    const bv = parseInt(m[2], 10);
    if (!seen.has(name) || seen.get(name)!.section !== 'base_value_reference') {
      seen.set(name, { name, baseValue: bv, section: 'recipe_output' });
    }
  }

  // --- Pattern 5: premium_resources nested items ---
  // Matches:  name: Item Name ... base_value: 123
  const premiumRegex = /name:\s*(?:["']?)([A-Z][^"'\n]+?)(?:["']?)\s*\n\s*(?:item_id:[^\n]*\n\s*)?(?:category:[^\n]*\n\s*)?base_value:\s*(\d+)/g;
  while ((m = premiumRegex.exec(content)) !== null) {
    const name = m[1].trim();
    const bv = parseInt(m[2], 10);
    if (!seen.has(name)) {
      seen.set(name, { name, baseValue: bv, section: 'premium_resource' });
    }
  }

  const items: YamlItem[] = [];
  for (const item of seen.values()) {
    items.push(item);
  }
  return items;
}

// ============================================================
// TS PARSING
// ============================================================

function parseTsItems(): TsItem[] {
  const tsItems: TsItem[] = [];

  // --- Source 1: recipes.ts (RESOURCE_ITEMS + ITEM_TEMPLATES) ---
  const recipesPath = path.resolve(__dirname, '../seeds/recipes.ts');
  const recipesContent = fs.readFileSync(recipesPath, 'utf-8');

  function extractFromArray(content: string, arrayName: string, source: string): void {
    const startRegex = new RegExp(`const ${arrayName}[\\s\\S]*?=\\s*\\[`);
    const startMatch = startRegex.exec(content);
    if (!startMatch) return;

    const startIdx = startMatch.index + startMatch[0].length;

    // Find the array's closing bracket
    let arrayDepth = 1;
    let arrayEnd = startIdx;
    for (let i = startIdx; i < content.length; i++) {
      if (content[i] === '[') arrayDepth++;
      if (content[i] === ']') arrayDepth--;
      if (arrayDepth === 0) { arrayEnd = i; break; }
    }

    const block = content.slice(startIdx, arrayEnd);

    // Extract each top-level { ... } entry using bracket-balanced parsing
    // This handles nested braces like stats: { attack: 5 }
    let i = 0;
    while (i < block.length) {
      if (block[i] === '{') {
        let depth = 1;
        const entryStart = i;
        i++;
        while (i < block.length && depth > 0) {
          if (block[i] === '{') depth++;
          if (block[i] === '}') depth--;
          i++;
        }
        const entry = block.slice(entryStart, i);
        // Handle apostrophes in names: match the opening delimiter specifically
        const nameMatch = entry.match(/name:\s*'([^']*(?:''[^']*)*)'/) ||
                          entry.match(/name:\s*"([^"]*)"/) ||
                          entry.match(/name:\s*`([^`]*)`/);
        const bvMatch = entry.match(/baseValue:\s*(\d+)/);
        if (nameMatch && bvMatch) {
          tsItems.push({
            name: nameMatch[1],
            baseValue: parseInt(bvMatch[1], 10),
            source,
          });
        }
      } else {
        i++;
      }
    }
  }

  extractFromArray(recipesContent, 'RESOURCE_ITEMS', 'RESOURCE_ITEMS');
  extractFromArray(recipesContent, 'ITEM_TEMPLATES', 'ITEM_TEMPLATES');

  // --- Source 2: gathering.ts (GatheringItem objects) ---
  const gatheringPath = path.resolve(__dirname, '../../shared/src/data/gathering.ts');
  if (fs.existsSync(gatheringPath)) {
    const gatheringContent = fs.readFileSync(gatheringPath, 'utf-8');
    // Match: templateName: 'Item Name' ... baseValue: N
    const gatheringRegex = /templateName:\s*['"`]([^'"`]+)['"`][\s\S]*?baseValue:\s*(\d+)/g;
    let gm: RegExpExecArray | null;
    const gatheringSeen = new Set<string>();
    while ((gm = gatheringRegex.exec(gatheringContent)) !== null) {
      const name = gm[1].trim();
      const bv = parseInt(gm[2], 10);
      if (!gatheringSeen.has(name)) {
        gatheringSeen.add(name);
        tsItems.push({ name, baseValue: bv, source: 'gathering.ts' });
      }
    }
  }

  // --- Source 3: item-names.ts (canonical ITEMS constants) ---
  // This file maps CONSTANT_NAME: 'Actual Item Name' for every item in the game.
  // Files like blacksmith.ts use ITEMS.IRON_PICKAXE instead of string literals.
  const itemNamesPath = path.resolve(__dirname, '../../shared/src/data/items/item-names.ts');
  const itemNameValues = new Map<string, string>(); // CONSTANT -> 'Name'
  if (fs.existsSync(itemNamesPath)) {
    const itemNamesContent = fs.readFileSync(itemNamesPath, 'utf-8');
    // Match: CONSTANT_NAME: 'Item Name' or CONSTANT_NAME: "Item Name"
    const constRegex = /(\w+):\s*(?:'([^']*)'|"([^"]*)")/g;
    let cm: RegExpExecArray | null;
    while ((cm = constRegex.exec(itemNamesContent)) !== null) {
      const constName = cm[1];
      const value = cm[2] ?? cm[3];
      if (value) {
        itemNameValues.set(constName, value);
      }
    }
  }

  // --- Source 4: shared/src/data/recipes/*.ts (recipe output names) ---
  // These files define recipes whose outputs become item templates during seeding.
  // They don't have baseValue, so we record BV as 0 (presence-only check).
  const recipesDir = path.resolve(__dirname, '../../shared/src/data/recipes');
  if (fs.existsSync(recipesDir)) {
    const recipeFiles = fs.readdirSync(recipesDir).filter(f => f.endsWith('.ts') && f !== 'types.ts' && f !== 'index.ts');
    const outputSeen = new Set<string>();
    for (const file of recipeFiles) {
      const filePath = path.join(recipesDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      // Pattern A: output: { itemName: 'Item Name' } or "Item Name"
      // Handle apostrophes by matching the right delimiter
      const outputLiteralRegex = /output[s]?:\s*\[?\s*\{\s*itemName:\s*'([^']*(?:''[^']*)*)'/g;
      let om: RegExpExecArray | null;
      while ((om = outputLiteralRegex.exec(fileContent)) !== null) {
        const name = om[1].trim();
        if (name && !outputSeen.has(name)) {
          outputSeen.add(name);
          tsItems.push({ name, baseValue: 0, source: `recipes/${file}` });
        }
      }
      // Also match double-quoted strings
      const outputDblRegex = /output[s]?:\s*\[?\s*\{\s*itemName:\s*"([^"]*)"/g;
      while ((om = outputDblRegex.exec(fileContent)) !== null) {
        const name = om[1].trim();
        if (name && !outputSeen.has(name)) {
          outputSeen.add(name);
          tsItems.push({ name, baseValue: 0, source: `recipes/${file}` });
        }
      }

      // Pattern B: output/outputs with ITEMS.CONSTANT references
      const outputConstRegex = /itemName:\s*ITEMS\.(\w+)/g;
      while ((om = outputConstRegex.exec(fileContent)) !== null) {
        const constName = om[1];
        const resolvedName = itemNameValues.get(constName);
        if (resolvedName && !outputSeen.has(resolvedName)) {
          outputSeen.add(resolvedName);
          tsItems.push({ name: resolvedName, baseValue: 0, source: `recipes/${file}` });
        }
      }
    }
  }

  return tsItems;
}

// ============================================================
// COMPARISON
// ============================================================

function compare(yamlItems: YamlItem[], tsItems: TsItem[]): Issue[] {
  const issues: Issue[] = [];

  // Build TS map (first occurrence wins — prefer RESOURCE_ITEMS/ITEM_TEMPLATES over gathering.ts)
  const tsMap = new Map<string, TsItem>();
  for (const item of tsItems) {
    if (!tsMap.has(item.name)) {
      tsMap.set(item.name, item);
    }
  }

  // Build YAML map
  const yamlMap = new Map<string, YamlItem>();
  for (const item of yamlItems) {
    yamlMap.set(item.name, item);
  }

  // Build reverse alias map: TS name → YAML name
  const tsToYaml = new Map<string, string>();
  for (const [yamlName, tsName] of Object.entries(YAML_TO_TS_ALIASES)) {
    tsToYaml.set(tsName, yamlName);
  }

  // Check: Base value drift (YAML and TS both have the item, but BVs differ)
  // Skip items from shared recipe files (baseValue=0) — they don't store BV in code
  for (const [name, yamlItem] of yamlMap) {
    // Check direct match
    let tsItem = tsMap.get(name);
    // Check alias match
    if (!tsItem && YAML_TO_TS_ALIASES[name]) {
      tsItem = tsMap.get(YAML_TO_TS_ALIASES[name]);
    }
    if (tsItem && tsItem.baseValue > 0 && tsItem.baseValue !== yamlItem.baseValue) {
      issues.push({
        severity: 'warning',
        category: 'BASE_VALUE_DRIFT',
        message: `"${name}": YAML=${yamlItem.baseValue}, TS=${tsItem.baseValue} (${tsItem.source})`,
      });
    }
  }

  // Check: Items in YAML but NOT in TS (truly missing)
  for (const [name, yamlItem] of yamlMap) {
    const directMatch = tsMap.has(name);
    const aliasMatch = YAML_TO_TS_ALIASES[name] ? tsMap.has(YAML_TO_TS_ALIASES[name]) : false;
    if (!directMatch && !aliasMatch && !YAML_ONLY_ITEMS.has(name)) {
      issues.push({
        severity: 'info',
        category: 'MISSING_IN_TS',
        message: `"${name}" (BV: ${yamlItem.baseValue}, ${yamlItem.section})`,
      });
    }
  }

  // Check: Items in TS but NOT in YAML (orphaned)
  for (const [name, tsItem] of tsMap) {
    const directMatch = yamlMap.has(name);
    const aliasMatch = tsToYaml.has(name) ? yamlMap.has(tsToYaml.get(name)!) : false;
    if (!directMatch && !aliasMatch && !TS_ONLY_ITEMS.has(name)) {
      issues.push({
        severity: 'info',
        category: 'ORPHANED_IN_TS',
        message: `"${name}" (BV: ${tsItem.baseValue}, ${tsItem.source})`,
      });
    }
  }

  return issues;
}

// ============================================================
// REPORT
// ============================================================

function printReport(
  issues: Issue[],
  yamlCount: number,
  tsCount: number,
): { errors: number; warnings: number; infos: number } {
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const infos = issues.filter(i => i.severity === 'info');

  const missingInTs = issues.filter(i => i.category === 'MISSING_IN_TS');
  const bvDrift = issues.filter(i => i.category === 'BASE_VALUE_DRIFT');
  const orphaned = issues.filter(i => i.category === 'ORPHANED_IN_TS');

  console.log('');
  console.log('========================================');
  console.log('  YAML <-> TS Sync Validation Report');
  console.log('========================================');
  console.log('');

  if (bvDrift.length > 0) {
    console.log(`  BASE VALUE DRIFT (${bvDrift.length}):`);
    for (const i of bvDrift) {
      console.log(`    - ${i.message}`);
    }
    console.log('');
  }

  if (missingInTs.length > 0) {
    console.log(`  ITEMS IN YAML NOT IN TS (${missingInTs.length}):`);
    for (const i of missingInTs) {
      console.log(`    - ${i.message}`);
    }
    console.log('');
  }

  if (orphaned.length > 0) {
    console.log(`  ITEMS IN TS NOT IN YAML (${orphaned.length}):`);
    for (const i of orphaned) {
      console.log(`    - ${i.message}`);
    }
    console.log('');
  }

  if (issues.length === 0) {
    console.log('  All clear — YAML and TypeScript are in sync!');
    console.log('');
  }

  // Matched items = YAML items that found a TS match
  const matchedCount = yamlCount - missingInTs.length - YAML_ONLY_ITEMS.size;

  console.log('  Summary:');
  console.log(`    YAML items:          ${yamlCount}`);
  console.log(`    TS items:            ${tsCount}`);
  console.log(`    Matched:             ${Math.max(0, matchedCount)}`);
  console.log(`    Base value drift:    ${bvDrift.length}`);
  console.log(`    Missing in TS:       ${missingInTs.length}`);
  console.log(`    Orphaned in TS:      ${orphaned.length}`);
  console.log(`    Suppressed (YAML):   ${YAML_ONLY_ITEMS.size} (future content)`);
  console.log(`    Suppressed (TS):     ${TS_ONLY_ITEMS.size} (legacy/generic names)`);
  console.log('');
  console.log('========================================');

  return { errors: errors.length, warnings: warnings.length, infos: infos.length };
}

// ============================================================
// MAIN
// ============================================================

function main() {
  const yamlPath = path.resolve(__dirname, '../../docs/profession-economy-master.yaml');

  if (!fs.existsSync(yamlPath)) {
    console.error(`YAML file not found: ${yamlPath}`);
    process.exit(1);
  }

  console.log('Parsing YAML...');
  const yamlItems = parseYaml(yamlPath);
  console.log(`  Found ${yamlItems.length} items with base values in YAML`);

  console.log('Parsing TypeScript seed data...');
  const tsItems = parseTsItems();

  // Deduplicate TS items (same name from multiple sources)
  const tsUnique = new Map<string, TsItem>();
  for (const item of tsItems) {
    if (!tsUnique.has(item.name)) {
      tsUnique.set(item.name, item);
    }
  }
  console.log(`  Found ${tsUnique.size} unique items in TS (${tsItems.length} total across sources)`);

  const issues = compare(yamlItems, Array.from(tsUnique.values()));
  const { warnings } = printReport(issues, yamlItems.length, tsUnique.size);

  if (warnings > 0) {
    console.log(`\n  ${warnings} base value drift warnings found. Review and fix.`);
  }

  process.exit(0);
}

main();
