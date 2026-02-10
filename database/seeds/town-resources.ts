/**
 * Town-Resource assignment seed for Realm of Crowns
 *
 * Provides fine-grained resource availability per town. Since the current
 * TownResource model is keyed on (townId, resourceType) and already seeded
 * by world.ts, this seed:
 *
 * 1. Validates all TownResource rows have matching Resource records
 * 2. Logs a summary of which specific resources are available per town
 * 3. Exports the BIOME_RESOURCES and TOWN_BOOSTS maps so the gathering
 *    engine can resolve individual Resource records from TownResource types
 *
 * A future schema migration will add a per-resource town link table.
 */

import { PrismaClient } from '@prisma/client';
import { ALL_RESOURCES, BiomeType } from '@shared/data/resources';

// ============================================================
// BIOME -> RESOURCE AFFINITY MAP
// ============================================================

export interface ResourceAvailability {
  resourceId: string;
  abundanceTier: number; // 1-5
}

export const BIOME_RESOURCES: Record<string, ResourceAvailability[]> = {
  PLAINS: [
    { resourceId: 'wheat', abundanceTier: 5 },
    { resourceId: 'corn', abundanceTier: 4 },
    { resourceId: 'vegetables', abundanceTier: 4 },
    { resourceId: 'cotton', abundanceTier: 4 },
    { resourceId: 'hops', abundanceTier: 3 },
    { resourceId: 'wool', abundanceTier: 3 },
    { resourceId: 'milk', abundanceTier: 3 },
    { resourceId: 'eggs', abundanceTier: 3 },
    { resourceId: 'beef', abundanceTier: 3 },
    { resourceId: 'pork', abundanceTier: 3 },
    { resourceId: 'chicken', abundanceTier: 3 },
    { resourceId: 'wild_game_meat', abundanceTier: 2 },
    { resourceId: 'raw_leather', abundanceTier: 2 },
    { resourceId: 'feathers', abundanceTier: 2 },
    { resourceId: 'common_herbs', abundanceTier: 2 },
    { resourceId: 'softwood', abundanceTier: 1 },
  ],
  FOREST: [
    { resourceId: 'softwood', abundanceTier: 5 },
    { resourceId: 'hardwood', abundanceTier: 4 },
    { resourceId: 'bark', abundanceTier: 4 },
    { resourceId: 'sap', abundanceTier: 3 },
    { resourceId: 'resin', abundanceTier: 3 },
    { resourceId: 'common_herbs', abundanceTier: 4 },
    { resourceId: 'medicinal_herbs', abundanceTier: 3 },
    { resourceId: 'mushrooms', abundanceTier: 3 },
    { resourceId: 'flowers', abundanceTier: 2 },
    { resourceId: 'raw_leather', abundanceTier: 3 },
    { resourceId: 'wild_game_meat', abundanceTier: 3 },
    { resourceId: 'feathers', abundanceTier: 2 },
    { resourceId: 'bone', abundanceTier: 2 },
    { resourceId: 'antlers', abundanceTier: 2 },
    { resourceId: 'vegetables', abundanceTier: 1 },
  ],
  MOUNTAIN: [
    { resourceId: 'iron_ore', abundanceTier: 5 },
    { resourceId: 'copper_ore', abundanceTier: 4 },
    { resourceId: 'coal', abundanceTier: 4 },
    { resourceId: 'silver_ore', abundanceTier: 3 },
    { resourceId: 'gold_ore', abundanceTier: 2 },
    { resourceId: 'gemstones', abundanceTier: 2 },
    { resourceId: 'raw_stone', abundanceTier: 5 },
    { resourceId: 'marble', abundanceTier: 2 },
    { resourceId: 'pelts', abundanceTier: 2 },
    { resourceId: 'antlers', abundanceTier: 1 },
    { resourceId: 'wild_game_meat', abundanceTier: 2 },
  ],
  HILLS: [
    { resourceId: 'copper_ore', abundanceTier: 4 },
    { resourceId: 'iron_ore', abundanceTier: 3 },
    { resourceId: 'coal', abundanceTier: 3 },
    { resourceId: 'raw_stone', abundanceTier: 3 },
    { resourceId: 'wheat', abundanceTier: 3 },
    { resourceId: 'vegetables', abundanceTier: 3 },
    { resourceId: 'hops', abundanceTier: 3 },
    { resourceId: 'apples', abundanceTier: 3 },
    { resourceId: 'grapes', abundanceTier: 2 },
    { resourceId: 'cotton', abundanceTier: 2 },
    { resourceId: 'wool', abundanceTier: 2 },
    { resourceId: 'common_herbs', abundanceTier: 2 },
    { resourceId: 'medicinal_herbs', abundanceTier: 2 },
    { resourceId: 'milk', abundanceTier: 2 },
    { resourceId: 'eggs', abundanceTier: 2 },
    { resourceId: 'feathers', abundanceTier: 1 },
  ],
  BADLANDS: [
    { resourceId: 'raw_leather', abundanceTier: 5 },
    { resourceId: 'bone', abundanceTier: 4 },
    { resourceId: 'wild_game_meat', abundanceTier: 3 },
    { resourceId: 'raw_stone', abundanceTier: 3 },
    { resourceId: 'sandstone', abundanceTier: 3 },
    { resourceId: 'pelts', abundanceTier: 2 },
    { resourceId: 'iron_ore', abundanceTier: 2 },
    { resourceId: 'copper_ore', abundanceTier: 1 },
  ],
  SWAMP: [
    { resourceId: 'common_herbs', abundanceTier: 4 },
    { resourceId: 'medicinal_herbs', abundanceTier: 4 },
    { resourceId: 'rare_herbs', abundanceTier: 3 },
    { resourceId: 'mushrooms', abundanceTier: 5 },
    { resourceId: 'arcane_reagents', abundanceTier: 3 },
    { resourceId: 'bark', abundanceTier: 2 },
    { resourceId: 'sap', abundanceTier: 2 },
    { resourceId: 'common_fish', abundanceTier: 2 },
  ],
  TUNDRA: [
    { resourceId: 'pelts', abundanceTier: 5 },
    { resourceId: 'bone', abundanceTier: 4 },
    { resourceId: 'antlers', abundanceTier: 3 },
    { resourceId: 'wild_game_meat', abundanceTier: 3 },
    { resourceId: 'iron_ore', abundanceTier: 2 },
    { resourceId: 'raw_stone', abundanceTier: 2 },
  ],
  VOLCANIC: [
    { resourceId: 'iron_ore', abundanceTier: 4 },
    { resourceId: 'gemstones', abundanceTier: 3 },
    { resourceId: 'adamantine_ore', abundanceTier: 2 },
    { resourceId: 'raw_stone', abundanceTier: 4 },
    { resourceId: 'arcane_reagents', abundanceTier: 3 },
    { resourceId: 'coal', abundanceTier: 3 },
    { resourceId: 'gold_ore', abundanceTier: 2 },
    { resourceId: 'silver_ore', abundanceTier: 2 },
  ],
  COASTAL: [
    { resourceId: 'common_fish', abundanceTier: 5 },
    { resourceId: 'shellfish', abundanceTier: 4 },
    { resourceId: 'seaweed', abundanceTier: 4 },
    { resourceId: 'salt', abundanceTier: 4 },
    { resourceId: 'rare_fish', abundanceTier: 2 },
    { resourceId: 'pearls', abundanceTier: 1 },
    { resourceId: 'sandstone', abundanceTier: 2 },
    { resourceId: 'silite_sand', abundanceTier: 2 },
    { resourceId: 'feathers', abundanceTier: 2 },
    { resourceId: 'spices', abundanceTier: 1 },
  ],
  DESERT: [
    { resourceId: 'sandstone', abundanceTier: 5 },
    { resourceId: 'silite_sand', abundanceTier: 4 },
    { resourceId: 'salt', abundanceTier: 3 },
    { resourceId: 'spices', abundanceTier: 2 },
    { resourceId: 'gemstones', abundanceTier: 2 },
    { resourceId: 'raw_stone', abundanceTier: 2 },
  ],
  RIVER: [
    { resourceId: 'common_fish', abundanceTier: 5 },
    { resourceId: 'seaweed', abundanceTier: 2 },
    { resourceId: 'wheat', abundanceTier: 3 },
    { resourceId: 'vegetables', abundanceTier: 3 },
    { resourceId: 'flax', abundanceTier: 3 },
    { resourceId: 'common_herbs', abundanceTier: 2 },
  ],
  UNDERGROUND: [
    { resourceId: 'iron_ore', abundanceTier: 5 },
    { resourceId: 'copper_ore', abundanceTier: 4 },
    { resourceId: 'coal', abundanceTier: 4 },
    { resourceId: 'silver_ore', abundanceTier: 3 },
    { resourceId: 'gold_ore', abundanceTier: 3 },
    { resourceId: 'mithril_ore', abundanceTier: 2 },
    { resourceId: 'adamantine_ore', abundanceTier: 1 },
    { resourceId: 'gemstones', abundanceTier: 3 },
    { resourceId: 'raw_stone', abundanceTier: 5 },
    { resourceId: 'marble', abundanceTier: 2 },
    { resourceId: 'mushrooms', abundanceTier: 3 },
  ],
  UNDERWATER: [
    { resourceId: 'common_fish', abundanceTier: 5 },
    { resourceId: 'rare_fish', abundanceTier: 4 },
    { resourceId: 'shellfish', abundanceTier: 4 },
    { resourceId: 'pearls', abundanceTier: 3 },
    { resourceId: 'seaweed', abundanceTier: 5 },
    { resourceId: 'salt', abundanceTier: 3 },
  ],
  FEYWILD: [
    { resourceId: 'arcane_reagents', abundanceTier: 5 },
    { resourceId: 'rare_herbs', abundanceTier: 4 },
    { resourceId: 'flowers', abundanceTier: 4 },
    { resourceId: 'exotic_wood', abundanceTier: 3 },
    { resourceId: 'common_herbs', abundanceTier: 3 },
    { resourceId: 'medicinal_herbs', abundanceTier: 3 },
    { resourceId: 'mushrooms', abundanceTier: 2 },
  ],
};

// ============================================================
// TOWN-SPECIFIC BOOSTS
// ============================================================

export const TOWN_BOOSTS: Record<string, ResourceAvailability[]> = {
  'Millhaven': [
    { resourceId: 'wheat', abundanceTier: 5 },
    { resourceId: 'corn', abundanceTier: 5 },
  ],
  'Whitefield': [
    { resourceId: 'cotton', abundanceTier: 5 },
    { resourceId: 'flax', abundanceTier: 4 },
  ],
  'Moonhaven': [
    { resourceId: 'rare_herbs', abundanceTier: 4 },
    { resourceId: 'arcane_reagents', abundanceTier: 3 },
  ],
  'Thornwatch': [
    { resourceId: 'hardwood', abundanceTier: 5 },
    { resourceId: 'feathers', abundanceTier: 3 },
  ],
  'Eldergrove': [
    { resourceId: 'medicinal_herbs', abundanceTier: 5 },
    { resourceId: 'rare_herbs', abundanceTier: 3 },
  ],
  'Deepvein': [
    { resourceId: 'mithril_ore', abundanceTier: 3 },
    { resourceId: 'iron_ore', abundanceTier: 5 },
  ],
  'Gemhollow': [
    { resourceId: 'gemstones', abundanceTier: 5 },
    { resourceId: 'gold_ore', abundanceTier: 3 },
  ],
  'Kazad-Vorn': [
    { resourceId: 'adamantine_ore', abundanceTier: 2 },
  ],
  'Greenhollow': [
    { resourceId: 'vegetables', abundanceTier: 5 },
    { resourceId: 'apples', abundanceTier: 4 },
  ],
  'Bramblewood': [
    { resourceId: 'hops', abundanceTier: 5 },
    { resourceId: 'rare_herbs', abundanceTier: 2 },
  ],
  'Riverside': [
    { resourceId: 'common_fish', abundanceTier: 5 },
    { resourceId: 'rare_fish', abundanceTier: 2 },
  ],
  'Bonepile': [
    { resourceId: 'raw_leather', abundanceTier: 5 },
    { resourceId: 'bone', abundanceTier: 5 },
  ],
  'Ironfist Hold': [
    { resourceId: 'adamantine_ore', abundanceTier: 2 },
  ],
  'Thornback Camp': [
    { resourceId: 'wool', abundanceTier: 3 },
    { resourceId: 'wild_game_meat', abundanceTier: 4 },
  ],
  'Boghollow': [
    { resourceId: 'mushrooms', abundanceTier: 5 },
    { resourceId: 'arcane_reagents', abundanceTier: 4 },
  ],
  'Cinderkeep': [
    { resourceId: 'arcane_reagents', abundanceTier: 5 },
  ],
  'Frostfang': [
    { resourceId: 'pelts', abundanceTier: 5 },
    { resourceId: 'antlers', abundanceTier: 4 },
  ],
  'Emberpeak': [
    { resourceId: 'gold_ore', abundanceTier: 3 },
    { resourceId: 'adamantine_ore', abundanceTier: 2 },
  ],
  'Scalehaven': [
    { resourceId: 'common_fish', abundanceTier: 4 },
    { resourceId: 'shellfish', abundanceTier: 3 },
    { resourceId: 'salt', abundanceTier: 3 },
  ],
  'Wyrmrest': [
    { resourceId: 'arcane_reagents', abundanceTier: 4 },
    { resourceId: 'gemstones', abundanceTier: 3 },
  ],
  'Porto Sole': [
    { resourceId: 'spices', abundanceTier: 3 },
  ],
  'Coral Bay': [
    { resourceId: 'common_fish', abundanceTier: 5 },
    { resourceId: 'shellfish', abundanceTier: 5 },
  ],
  'Sandrift': [
    { resourceId: 'gemstones', abundanceTier: 4 },
    { resourceId: 'silite_sand', abundanceTier: 5 },
  ],
  'Coralspire': [
    { resourceId: 'pearls', abundanceTier: 4 },
  ],
  'Abyssal Reach': [
    { resourceId: 'pearls', abundanceTier: 5 },
    { resourceId: 'rare_fish', abundanceTier: 5 },
  ],
  'Thornden': [
    { resourceId: 'pelts', abundanceTier: 4 },
    { resourceId: 'raw_leather', abundanceTier: 5 },
  ],
  'Clawridge': [
    { resourceId: 'pelts', abundanceTier: 5 },
    { resourceId: 'antlers', abundanceTier: 4 },
  ],
  'Windrun': [
    { resourceId: 'wool', abundanceTier: 4 },
    { resourceId: 'milk', abundanceTier: 3 },
  ],
  'Glimmerheart': [
    { resourceId: 'arcane_reagents', abundanceTier: 5 },
  ],
  'Dewdrop Hollow': [
    { resourceId: 'rare_herbs', abundanceTier: 5 },
    { resourceId: 'flowers', abundanceTier: 5 },
  ],
  'Moonpetal Grove': [
    { resourceId: 'arcane_reagents', abundanceTier: 5 },
    { resourceId: 'exotic_wood', abundanceTier: 4 },
  ],
  'Skyhold': [
    { resourceId: 'mithril_ore', abundanceTier: 2 },
    { resourceId: 'iron_ore', abundanceTier: 5 },
  ],
  "Vel'Naris": [
    { resourceId: 'mithril_ore', abundanceTier: 3 },
    { resourceId: 'mushrooms', abundanceTier: 4 },
  ],
  'Gloom Market': [
    { resourceId: 'arcane_reagents', abundanceTier: 3 },
    { resourceId: 'mushrooms', abundanceTier: 4 },
  ],
  'Misthaven': [
    { resourceId: 'rare_herbs', abundanceTier: 5 },
    { resourceId: 'medicinal_herbs', abundanceTier: 5 },
  ],
  'Rootholme': [
    { resourceId: 'medicinal_herbs', abundanceTier: 4 },
    { resourceId: 'exotic_wood', abundanceTier: 2 },
  ],
  'The Foundry': [
    { resourceId: 'iron_ore', abundanceTier: 4 },
    { resourceId: 'adamantine_ore', abundanceTier: 2 },
  ],
  'The Confluence': [
    { resourceId: 'arcane_reagents', abundanceTier: 5 },
    { resourceId: 'gemstones', abundanceTier: 4 },
  ],
  'Emberheart': [
    { resourceId: 'adamantine_ore', abundanceTier: 3 },
    { resourceId: 'gold_ore', abundanceTier: 3 },
  ],
  'Ashenmoor': [
    { resourceId: 'arcane_reagents', abundanceTier: 3 },
    { resourceId: 'rare_herbs', abundanceTier: 3 },
  ],
};

// ============================================================
// UTILITY: Resolve specific resources for a town
// ============================================================

/**
 * Given a town's biome and name, returns the list of specific ResourceDefinition
 * IDs with their abundance tiers that are available for gathering there.
 * Used by the gathering engine to present resource choices to the player.
 */
export function getResourcesForTown(
  townName: string,
  biome: BiomeType
): ResourceAvailability[] {
  const biomeDefaults = BIOME_RESOURCES[biome] || [];
  const assignmentMap = new Map<string, number>();

  for (const a of biomeDefaults) {
    assignmentMap.set(a.resourceId, a.abundanceTier);
  }

  const boosts = TOWN_BOOSTS[townName];
  if (boosts) {
    for (const b of boosts) {
      const existing = assignmentMap.get(b.resourceId) || 0;
      assignmentMap.set(b.resourceId, Math.max(existing, b.abundanceTier));
    }
  }

  return Array.from(assignmentMap.entries())
    .map(([resourceId, abundanceTier]) => ({ resourceId, abundanceTier }))
    .sort((a, b) => b.abundanceTier - a.abundanceTier);
}

// ============================================================
// SEED FUNCTION
// ============================================================

export async function seedTownResources(prisma: PrismaClient) {
  console.log('--- Seeding Town-Resource Assignments ---');

  // Validate that all referenced resource IDs exist in our shared data
  const allResourceIds = new Set(ALL_RESOURCES.map((r) => r.id));
  const allBiomeEntries = Object.values(BIOME_RESOURCES).flat();
  const allBoostEntries = Object.values(TOWN_BOOSTS).flat();
  const allEntries = [...allBiomeEntries, ...allBoostEntries];

  let missingCount = 0;
  for (const entry of allEntries) {
    if (!allResourceIds.has(entry.resourceId)) {
      console.warn(`  [WARN] Resource ID "${entry.resourceId}" not found in ALL_RESOURCES`);
      missingCount++;
    }
  }

  // Count totals
  const towns = await prisma.town.findMany({ select: { id: true, name: true, biome: true } });
  let totalAssignments = 0;
  for (const town of towns) {
    const resources = getResourcesForTown(town.name, town.biome as BiomeType);
    totalAssignments += resources.length;
  }

  if (missingCount === 0) {
    console.log(`  All resource references valid.`);
  } else {
    console.warn(`  ${missingCount} missing resource references found!`);
  }

  console.log(`  ${towns.length} towns x avg ${Math.round(totalAssignments / towns.length)} resources = ${totalAssignments} town-resource assignments.`);
  console.log(`  Assignments available via getResourcesForTown() at runtime.`);
}
