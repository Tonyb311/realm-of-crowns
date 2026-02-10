/**
 * Resource data index for Realm of Crowns
 *
 * Exports all resource definitions and utility lookup functions.
 */

export * from './types';

import { ResourceDefinition, ResourceType, BiomeType } from './types';
import { ORES } from './ores';
import { WOODS } from './woods';
import { GRAINS } from './grains';
import { HERBS } from './herbs';
import { ANIMAL_PRODUCTS } from './animal';
import { FISH } from './fish';
import { STONES } from './stone';

export { ORES } from './ores';
export { WOODS } from './woods';
export { GRAINS } from './grains';
export { HERBS } from './herbs';
export { ANIMAL_PRODUCTS } from './animal';
export { FISH } from './fish';
export { STONES } from './stone';

/** All 51 resources across all categories. */
export const ALL_RESOURCES: ResourceDefinition[] = [
  ...ORES,
  ...WOODS,
  ...GRAINS,
  ...HERBS,
  ...ANIMAL_PRODUCTS,
  ...FISH,
  ...STONES,
];

// Pre-build lookup maps for fast access

const byName = new Map<string, ResourceDefinition>();
const byId = new Map<string, ResourceDefinition>();
for (const r of ALL_RESOURCES) {
  byName.set(r.name.toLowerCase(), r);
  byId.set(r.id, r);
}

/** Look up a resource by its display name (case-insensitive). */
export function getResourceByName(name: string): ResourceDefinition | undefined {
  return byName.get(name.toLowerCase());
}

/** Look up a resource by its stable id. */
export function getResourceById(id: string): ResourceDefinition | undefined {
  return byId.get(id);
}

/** Get all resources of a given ResourceType. */
export function getResourcesByType(type: ResourceType): ResourceDefinition[] {
  return ALL_RESOURCES.filter((r) => r.type === type);
}

/** Get all resources that can be found in a given biome. */
export function getResourcesByBiome(biome: BiomeType): ResourceDefinition[] {
  return ALL_RESOURCES.filter((r) => r.biomes.includes(biome));
}

/** Get all resources that require a given gathering profession. */
export function getResourcesByProfession(profession: string): ResourceDefinition[] {
  return ALL_RESOURCES.filter((r) => r.professionRequired === profession);
}

/** Get all resources at or below a given tier. */
export function getResourcesByMaxTier(maxTier: number): ResourceDefinition[] {
  return ALL_RESOURCES.filter((r) => r.tier <= maxTier);
}
