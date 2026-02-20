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
// YAML PARSING (regex-based, since the file has free-form text)
// ============================================================

function parseYaml(filePath: string): YamlItem[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const items: YamlItem[] = [];
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
  // Matches: { name: Item Name, base_value: 123 }  or  { name: "Item Name", base_value: 123 }
  const bvRefRegex = /\{\s*name:\s*(?:["']?)([^"',}]+?)(?:["']?)\s*,\s*base_value:\s*(\d+)/g;
  while ((m = bvRefRegex.exec(content)) !== null) {
    const name = m[1].trim();
    const bv = parseInt(m[2], 10);
    // base_value_reference entries override resource_block entries
    seen.set(name, { name, baseValue: bv, section: 'base_value_reference' });
  }

  // --- Pattern 3: recipe lines with output + base_value ---
  // Matches: output: "Item Name", base_value: 123
  //      or: output: Item Name, base_value: 123
  const recipeOutputRegex = /output:\s*(?:["']?)([^"',}]+?)(?:["']?)\s*,\s*base_value:\s*(\d+)/g;
  while ((m = recipeOutputRegex.exec(content)) !== null) {
    const name = m[1].trim();
    const bv = parseInt(m[2], 10);
    // Don't override if already from base_value_reference
    if (!seen.has(name) || seen.get(name)!.section !== 'base_value_reference') {
      seen.set(name, { name, baseValue: bv, section: 'recipe_output' });
    }
  }

  // --- Pattern 4: recipe lines with output quantity + base_value ---
  // Matches: output: "2x Item Name", base_value: 123
  const recipeQtyOutputRegex = /output:\s*(?:["']?)\d+x\s+([^"',}]+?)(?:["']?)\s*,\s*base_value:\s*(\d+)/g;
  while ((m = recipeQtyOutputRegex.exec(content)) !== null) {
    const name = m[1].trim();
    const bv = parseInt(m[2], 10);
    if (!seen.has(name) || seen.get(name)!.section !== 'base_value_reference') {
      seen.set(name, { name, baseValue: bv, section: 'recipe_output_qty' });
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

  const recipesPath = path.resolve(__dirname, '../seeds/recipes.ts');
  const recipesContent = fs.readFileSync(recipesPath, 'utf-8');

  // Split file into RESOURCE_ITEMS and ITEM_TEMPLATES sections
  // Each item entry has name: '...' and baseValue: N on separate lines

  // Parse individual items using a block-by-block approach
  // Match each { name: '...', ... baseValue: N, ... } block
  function extractFromArray(arrayName: string): void {
    // Find the array start
    const startRegex = new RegExp(`const ${arrayName}[\\s\\S]*?=\\s*\\[`);
    const startMatch = startRegex.exec(recipesContent);
    if (!startMatch) return;

    const startIdx = startMatch.index + startMatch[0].length;

    // Find matching closing bracket (track nesting depth)
    let depth = 1;
    let endIdx = startIdx;
    for (let i = startIdx; i < recipesContent.length; i++) {
      if (recipesContent[i] === '[') depth++;
      if (recipesContent[i] === ']') depth--;
      if (depth === 0) { endIdx = i; break; }
    }

    const block = recipesContent.slice(startIdx, endIdx);

    // Split into individual object entries by finding each { ... } block
    const entryRegex = /\{[^{}]*\}/gs;
    let match: RegExpExecArray | null;
    while ((match = entryRegex.exec(block)) !== null) {
      const entry = match[0];
      const nameMatch = entry.match(/name:\s*(?:['"`])([^'"`]+)(?:['"`])/);
      const bvMatch = entry.match(/baseValue:\s*(\d+)/);
      if (nameMatch && bvMatch) {
        tsItems.push({
          name: nameMatch[1],
          baseValue: parseInt(bvMatch[1], 10),
          source: arrayName,
        });
      }
    }
  }

  extractFromArray('RESOURCE_ITEMS');
  extractFromArray('ITEM_TEMPLATES');

  return tsItems;
}

// ============================================================
// COMPARISON
// ============================================================

function compare(yamlItems: YamlItem[], tsItems: TsItem[]): Issue[] {
  const issues: Issue[] = [];

  const tsMap = new Map<string, TsItem>();
  for (const item of tsItems) {
    tsMap.set(item.name, item);
  }

  const yamlMap = new Map<string, YamlItem>();
  for (const item of yamlItems) {
    yamlMap.set(item.name, item);
  }

  // Check: Base value drift (YAML and TS both have the item, but BVs differ)
  for (const [name, yamlItem] of yamlMap) {
    const tsItem = tsMap.get(name);
    if (tsItem && tsItem.baseValue !== yamlItem.baseValue) {
      issues.push({
        severity: 'warning',
        category: 'BASE_VALUE_DRIFT',
        message: `"${name}": YAML=${yamlItem.baseValue}, TS=${tsItem.baseValue} (${tsItem.source})`,
      });
    }
  }

  // Check: Items in YAML but NOT in TS
  for (const [name, yamlItem] of yamlMap) {
    if (!tsMap.has(name)) {
      issues.push({
        severity: 'info',
        category: 'MISSING_IN_TS',
        message: `"${name}" (BV: ${yamlItem.baseValue}, ${yamlItem.section})`,
      });
    }
  }

  // Check: Items in TS but NOT in YAML (orphaned)
  for (const [name, tsItem] of tsMap) {
    if (!yamlMap.has(name)) {
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

function printReport(issues: Issue[]): { errors: number; warnings: number; infos: number } {
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

  // Count items that matched
  const yamlCount = new Set(issues.filter(i => i.category !== 'ORPHANED_IN_TS').map(i => {
    const nameMatch = i.message.match(/^"([^"]+)"/);
    return nameMatch ? nameMatch[1] : '';
  })).size;

  console.log('  Summary:');
  console.log(`    Base value drift:    ${bvDrift.length}`);
  console.log(`    Missing in TS:       ${missingInTs.length}`);
  console.log(`    Orphaned in TS:      ${orphaned.length}`);
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
  console.log(`  Found ${tsItems.length} items in TS seed files`);

  const issues = compare(yamlItems, tsItems);
  const { warnings } = printReport(issues);

  if (warnings > 0) {
    console.log(`\n  ${warnings} base value drift warnings found. Review and fix.`);
  }

  process.exit(0);
}

main();
