/**
 * Resource type definitions for Realm of Crowns
 */

export type ResourceType =
  | 'ORE' | 'WOOD' | 'GRAIN' | 'HERB' | 'FISH'
  | 'HIDE' | 'STONE' | 'FIBER' | 'ANIMAL_PRODUCT'
  | 'REAGENT' | 'EXOTIC';

export type ResourceRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EXOTIC' | 'LEGENDARY';

export type BiomeType =
  | 'PLAINS' | 'FOREST' | 'MOUNTAIN' | 'HILLS' | 'BADLANDS'
  | 'SWAMP' | 'TUNDRA' | 'VOLCANIC' | 'COASTAL' | 'DESERT'
  | 'RIVER' | 'UNDERGROUND' | 'UNDERWATER' | 'FEYWILD';

export type GatheringProfession =
  | 'FARMER' | 'RANCHER' | 'FISHERMAN' | 'LUMBERJACK'
  | 'MINER' | 'HERBALIST' | 'HUNTER';

export interface ResourceDefinition {
  id: string;
  name: string;
  type: ResourceType;
  rarity: ResourceRarity;
  description: string;
  baseGatherTime: number;   // minutes
  baseYield: number;        // units per gather action
  biomes: BiomeType[];
  tier: number;             // 1-5
  professionRequired: GatheringProfession;
}
