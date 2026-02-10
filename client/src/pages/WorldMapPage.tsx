import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import TownMarker from '../components/map/TownMarker';
import RegionOverlay from '../components/map/RegionOverlay';
import ExclusiveZoneOverlay, { type ExclusiveZoneData } from '../components/map/ExclusiveZoneOverlay';
import MapTooltip from '../components/map/MapTooltip';
import MiniMap from '../components/map/MiniMap';
import TownInfoPanel from '../components/map/TownInfoPanel';

// ---------------------------------------------------------------------------
// Types — assumed API shape from GET /api/world/map
// ---------------------------------------------------------------------------
interface Town {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  x: number;
  y: number;
  population: number;
  biome: string;
  description: string;
  specialty: string;
  notableFeature: string;
  resources: string[];
}

interface Route {
  id: string;
  fromTownId: string;
  toTownId: string;
  distance: number;
  dangerLevel: number;
}

interface Region {
  id: string;
  name: string;
  biome: string;
  raceName: string;
}

interface WorldMapData {
  regions: Region[];
  towns: Town[];
  routes: Route[];
}

interface PlayerLocation {
  currentTownId: string;
  travelingTo?: string;
  travelProgress?: number; // 0-1
}

// ---------------------------------------------------------------------------
// Region color mapping
// ---------------------------------------------------------------------------
const REGION_COLORS: Record<string, { fill: string; stroke: string; glow: string; label: string }> = {
  verdant_heartlands:  { fill: '#C9A461', stroke: '#B8913A', glow: '#C9A46140', label: 'Verdant Heartlands' },
  silverwood_forest:   { fill: '#4A8C3F', stroke: '#2D5A27', glow: '#4A8C3F40', label: 'Silverwood Forest' },
  ironvault_mountains: { fill: '#9CA3AF', stroke: '#6B7280', glow: '#9CA3AF40', label: 'Ironvault Mountains' },
  crossroads:          { fill: '#D4A574', stroke: '#A67C52', glow: '#D4A57440', label: 'The Crossroads' },
  ashenfang_wastes:    { fill: '#EA580C', stroke: '#C2410C', glow: '#EA580C40', label: 'Ashenfang Wastes' },
  shadowmere_marshes:  { fill: '#A855F7', stroke: '#7C3AED', glow: '#A855F740', label: 'Shadowmere Marshes' },
  frozen_reaches:      { fill: '#67E8F9', stroke: '#22D3EE', glow: '#67E8F940', label: 'Frozen Reaches' },
  suncoast:            { fill: '#06B6D4', stroke: '#0891B2', glow: '#06B6D440', label: 'The Suncoast' },
  twilight_march:      { fill: '#A3E635', stroke: '#84CC16', glow: '#A3E63540', label: 'Twilight March' },
  scarred_frontier:    { fill: '#F97316', stroke: '#EA580C', glow: '#F9731640', label: 'Scarred Frontier' },
  cogsworth_warrens:   { fill: '#FBBF24', stroke: '#D97706', glow: '#FBBF2440', label: 'Cogsworth Warrens' },
  pelagic_depths:      { fill: '#3B82F6', stroke: '#2563EB', glow: '#3B82F640', label: 'Pelagic Depths' },
  thornwilds:          { fill: '#65A30D', stroke: '#4D7C0F', glow: '#65A30D40', label: 'Thornwilds' },
  glimmerveil:         { fill: '#E879F9', stroke: '#C026D3', glow: '#E879F940', label: 'Glimmerveil' },
  skypeak_plateaus:    { fill: '#D1D5DB', stroke: '#9CA3AF', glow: '#D1D5DB40', label: 'Skypeak Plateaus' },
  vel_naris_underdark: { fill: '#7C3AED', stroke: '#6D28D9', glow: '#7C3AED40', label: "Vel'Naris Underdark" },
  mistwood_glens:      { fill: '#34D399', stroke: '#059669', glow: '#34D39940', label: 'Mistwood Glens' },
  the_foundry:         { fill: '#78716C', stroke: '#57534E', glow: '#78716C40', label: 'The Foundry' },
  the_confluence:      { fill: '#FB923C', stroke: '#F97316', glow: '#FB923C40', label: 'The Confluence' },
  ashenmoor:           { fill: '#6B7280', stroke: '#4B5563', glow: '#6B728040', label: 'Ashenmoor' },
};

function getRegionColor(regionId: string) {
  return REGION_COLORS[regionId] ?? { fill: '#9CA3AF', stroke: '#6B7280', glow: '#9CA3AF40', label: regionId };
}

// ---------------------------------------------------------------------------
// Relation-based border colors
// ---------------------------------------------------------------------------
const RELATION_BORDER_COLORS: Record<string, string> = {
  Allied:      '#22C55E', // Green
  Friendly:    '#3B82F6', // Blue
  Neutral:     '#9CA3AF', // Grey
  Distrustful: '#EAB308', // Yellow
  Hostile:     '#F97316', // Orange
  'Blood Feud':'#EF4444', // Red
};

// ---------------------------------------------------------------------------
// Fallback data — used when the API is not yet available
// ---------------------------------------------------------------------------
function buildFallbackData(): WorldMapData {
  // Positions are on a 1000x900 coordinate space
  const towns: Town[] = [
    // Frozen Reaches (top)
    { id: 'drakenspire', name: 'Drakenspire', regionId: 'frozen_reaches', regionName: 'Frozen Reaches', x: 500, y: 60, population: 3200, biome: 'Tundra/Volcanic', description: 'Mountain peak capital of the Drakonid clans', specialty: 'Military, Religion', notableFeature: 'Dragon Temple, Elder Council', resources: ['Mithril', 'Adamantine', 'Exotic Furs'] },
    { id: 'frostfang', name: 'Frostfang', regionId: 'frozen_reaches', regionName: 'Frozen Reaches', x: 410, y: 40, population: 1800, biome: 'Tundra', description: 'A harsh tundra settlement known for mammoth hunts', specialty: 'Hunting, Leatherwork', notableFeature: 'Mammoth hunts, exotic furs', resources: ['Exotic Furs', 'Bone', 'Leather'] },
    { id: 'emberpeak', name: 'Emberpeak', regionId: 'frozen_reaches', regionName: 'Frozen Reaches', x: 590, y: 45, population: 2100, biome: 'Volcanic', description: 'Built beside an active volcano, home to dragonfire forges', specialty: 'Mining, Smelting', notableFeature: 'Volcanic forges, rare ores', resources: ['Mithril', 'Adamantine', 'Obsidian'] },
    { id: 'scalehaven', name: 'Scalehaven', regionId: 'frozen_reaches', regionName: 'Frozen Reaches', x: 440, y: 95, population: 1500, biome: 'Coastal Tundra', description: 'Northern trade port on frozen shores', specialty: 'Fishing, Trade', notableFeature: 'Northern trade port, whaling', resources: ['Fish', 'Exotic Furs', 'Trade Goods'] },
    { id: 'wyrmrest', name: 'Wyrmrest', regionId: 'frozen_reaches', regionName: 'Frozen Reaches', x: 560, y: 100, population: 900, biome: 'Ancient Ruins', description: 'Dragon burial grounds steeped in ancient magic', specialty: 'Magic, Lore', notableFeature: 'Dragon burial grounds, ancient artifacts', resources: ['Arcane Reagents', 'Dragon Bone'] },

    // Ironvault Mountains (left-center)
    { id: 'kazad_vorn', name: 'Kazad-Vorn', regionId: 'ironvault_mountains', regionName: 'Ironvault Mountains', x: 160, y: 230, population: 8500, biome: 'Underground', description: 'The great underground capital of the Dwarven kingdoms', specialty: 'Smithing, Politics', notableFeature: "The Great Forge, Thane's Hall", resources: ['Iron Ore', 'Coal', 'Gems'] },
    { id: 'deepvein', name: 'Deepvein', regionId: 'ironvault_mountains', regionName: 'Ironvault Mountains', x: 100, y: 190, population: 3200, biome: 'Deep Underground', description: 'The deepest mine in Aethermere with mithril veins', specialty: 'Mining, Smelting', notableFeature: 'Deepest mine, mithril veins', resources: ['Mithril', 'Iron Ore', 'Coal'] },
    { id: 'hammerfall', name: 'Hammerfall', regionId: 'ironvault_mountains', regionName: 'Ironvault Mountains', x: 195, y: 305, population: 4100, biome: 'Mountain Pass', description: 'Border fortress guarding against Orc raids', specialty: 'Military, Armoring', notableFeature: 'Border fortress against Orc raids', resources: ['Iron Ore', 'Stone', 'Coal'] },
    { id: 'gemhollow', name: 'Gemhollow', regionId: 'ironvault_mountains', regionName: 'Ironvault Mountains', x: 115, y: 270, population: 2600, biome: 'Cavern', description: 'Crystal caverns filled with rare gem deposits', specialty: 'Jeweling, Gems', notableFeature: 'Crystal caverns, rare gem deposits', resources: ['Gems', 'Stone', 'Crystal'] },
    { id: 'alehearth', name: 'Alehearth', regionId: 'ironvault_mountains', regionName: 'Ironvault Mountains', x: 210, y: 185, population: 2900, biome: 'Mountain Valley', description: 'Famous for Dwarven ales and as a trade hub', specialty: 'Brewing, Trade', notableFeature: 'Famous Dwarven ales, trade hub', resources: ['Grain', 'Hops', 'Trade Goods'] },

    // Verdant Heartlands (center)
    { id: 'kingshold', name: 'Kingshold', regionId: 'verdant_heartlands', regionName: 'Verdant Heartlands', x: 500, y: 230, population: 15000, biome: 'Plains/Hills', description: 'The grand capital of the Human kingdoms, political center of Aethermere', specialty: 'Politics, Trade', notableFeature: 'Royal Palace, Grand Market, Arena', resources: ['Grain', 'Cotton', 'Livestock'] },
    { id: 'millhaven', name: 'Millhaven', regionId: 'verdant_heartlands', regionName: 'Verdant Heartlands', x: 440, y: 195, population: 6200, biome: 'Plains', description: 'Breadbasket of the realm with the largest granary', specialty: 'Farming, Ranching', notableFeature: 'Largest granary in Aethermere', resources: ['Grain', 'Livestock', 'Cotton'] },
    { id: 'bridgewater', name: 'Bridgewater', regionId: 'verdant_heartlands', regionName: 'Verdant Heartlands', x: 540, y: 280, population: 7800, biome: 'River', description: 'Trade crossroads where three major routes converge', specialty: 'Trade, Fishing', notableFeature: 'Crossroads of 3 trade routes', resources: ['Fish', 'Trade Goods', 'Grain'] },
    { id: 'ironford', name: 'Ironford', regionId: 'verdant_heartlands', regionName: 'Verdant Heartlands', x: 440, y: 275, population: 5100, biome: 'Hills', description: 'Military town with weapon forges and an academy', specialty: 'Mining, Smithing', notableFeature: 'Military academy, weapon forges', resources: ['Iron Ore', 'Coal', 'Grain'] },
    { id: 'whitefield', name: 'Whitefield', regionId: 'verdant_heartlands', regionName: 'Verdant Heartlands', x: 560, y: 195, population: 4800, biome: 'Plains', description: 'Famous for its tailors and cloth markets', specialty: 'Cotton, Textiles', notableFeature: 'Famous tailors, cloth market', resources: ['Cotton', 'Grain', 'Livestock'] },

    // Shadowmere Marshes (right-center)
    { id: 'nethermire', name: 'Nethermire', regionId: 'shadowmere_marshes', regionName: 'Shadowmere Marshes', x: 830, y: 230, population: 4500, biome: 'Swamp', description: 'Hidden capital of the Nethkin Shadow Council', specialty: 'Alchemy, Politics', notableFeature: 'Shadow Council chambers, hidden markets', resources: ['Rare Herbs', 'Reagents', 'Mushrooms'] },
    { id: 'boghollow', name: 'Boghollow', regionId: 'shadowmere_marshes', regionName: 'Shadowmere Marshes', x: 870, y: 190, population: 2100, biome: 'Deep Swamp', description: 'Deep in the marshes where the rarest herbs grow', specialty: 'Herbalism, Alchemy', notableFeature: 'Rare herb spawns, mushroom caves', resources: ['Rare Herbs', 'Mushrooms', 'Reagents'] },
    { id: 'mistwatch', name: 'Mistwatch', regionId: 'shadowmere_marshes', regionName: 'Shadowmere Marshes', x: 790, y: 280, population: 3200, biome: 'Marsh Edge', description: 'Hub of the Nethkin intelligence network', specialty: 'Trade, Espionage', notableFeature: 'Intelligence network hub, spy guild', resources: ['Reagents', 'Trade Goods'] },
    { id: 'cinderkeep', name: 'Cinderkeep', regionId: 'shadowmere_marshes', regionName: 'Shadowmere Marshes', x: 880, y: 270, population: 1800, biome: 'Volcanic Swamp', description: 'Built over hot springs with an arcane forge', specialty: 'Enchanting, Smelting', notableFeature: 'Hot springs, arcane forge', resources: ['Reagents', 'Arcane Reagents', 'Coal'] },
    { id: 'whispering_docks', name: 'Whispering Docks', regionId: 'shadowmere_marshes', regionName: 'Shadowmere Marshes', x: 850, y: 315, population: 2800, biome: 'Coastal Swamp', description: 'Black market port for smuggling and contraband', specialty: 'Fishing, Smuggling', notableFeature: 'Black market port, contraband trade', resources: ['Fish', 'Trade Goods', 'Contraband'] },

    // Crossroads (center-below)
    { id: 'hearthshire', name: 'Hearthshire', regionId: 'crossroads', regionName: 'The Crossroads', x: 500, y: 400, population: 9200, biome: 'Rolling Hills', description: 'Capital of the Harthfolk lands and banking center', specialty: 'Trade, Banking', notableFeature: 'The Grand Exchange, Harthfolk Bank', resources: ['Grain', 'Herbs', 'Vegetables'] },
    { id: 'greenhollow', name: 'Greenhollow', regionId: 'crossroads', regionName: 'The Crossroads', x: 440, y: 370, population: 4100, biome: 'Farmland', description: 'Best farmland in the Crossroads with a cooking academy', specialty: 'Farming, Cooking', notableFeature: 'Best farmland, cooking academy', resources: ['Grain', 'Vegetables', 'Herbs'] },
    { id: 'peddlers_rest', name: "Peddler's Rest", regionId: 'crossroads', regionName: 'The Crossroads', x: 555, y: 375, population: 5600, biome: 'Trade Hub', description: 'Where every trade route in Aethermere converges', specialty: 'Caravans, Merchant', notableFeature: 'Every trade route passes through here', resources: ['Trade Goods', 'Grain'] },
    { id: 'bramblewood', name: 'Bramblewood', regionId: 'crossroads', regionName: 'The Crossroads', x: 450, y: 430, population: 2800, biome: 'Forest Edge', description: 'Hidden distilleries and herb gardens in the underbrush', specialty: 'Herbalism, Brewing', notableFeature: 'Hidden distilleries, herb gardens', resources: ['Herbs', 'Grain', 'Softwood'] },
    { id: 'riverside', name: 'Riverside', regionId: 'crossroads', regionName: 'The Crossroads', x: 555, y: 430, population: 3400, biome: 'River Town', description: 'Famous for its inns and tournament fishing', specialty: 'Fishing, Inns', notableFeature: 'Famous inns, tournament fishing', resources: ['Fish', 'Herbs', 'Grain'] },

    // Ashenfang Wastes (bottom-left)
    { id: 'grakthar', name: 'Grakthar', regionId: 'ashenfang_wastes', regionName: 'Ashenfang Wastes', x: 160, y: 570, population: 7200, biome: 'Badlands', description: 'The fortress capital where the Warchief rules', specialty: 'Military, Politics', notableFeature: "Warchief's Arena, War Council", resources: ['Leather', 'Bone', 'War Beasts'] },
    { id: 'bonepile', name: 'Bonepile', regionId: 'ashenfang_wastes', regionName: 'Ashenfang Wastes', x: 100, y: 540, population: 3100, biome: 'Badlands', description: 'Massive hunting grounds and tanneries', specialty: 'Hunting, Tanning', notableFeature: 'Massive hunting grounds, tanneries', resources: ['Leather', 'Bone', 'Hides'] },
    { id: 'ironfist_hold', name: 'Ironfist Hold', regionId: 'ashenfang_wastes', regionName: 'Ashenfang Wastes', x: 120, y: 620, population: 2400, biome: 'Volcanic Edge', description: 'Volcanic forges and obsidian deposits', specialty: 'Mining, Smelting', notableFeature: 'Volcanic forges, obsidian deposits', resources: ['Obsidian', 'Iron Ore', 'Coal'] },
    { id: 'thornback_camp', name: 'Thornback Camp', regionId: 'ashenfang_wastes', regionName: 'Ashenfang Wastes', x: 215, y: 530, population: 2800, biome: 'Plains Edge', description: 'War beast breeding grounds near the border', specialty: 'Ranching, Raiding', notableFeature: 'War beast breeding, border raids', resources: ['War Beasts', 'Leather', 'Bone'] },
    { id: 'ashen_market', name: 'Ashen Market', regionId: 'ashenfang_wastes', regionName: 'Ashenfang Wastes', x: 205, y: 615, population: 3600, biome: 'Trade Post', description: 'Where Orcs trade with outsiders', specialty: 'Mercenary, Trade', notableFeature: 'Where Orcs trade with outsiders', resources: ['Trade Goods', 'Leather', 'Bone'] },

    // Suncoast (bottom-center)
    { id: 'porto_sole', name: 'Porto Sole', regionId: 'suncoast', regionName: 'The Suncoast', x: 500, y: 590, population: 12000, biome: 'Coastal', description: 'The grand free city, economic engine of Aethermere', specialty: 'Trade, Everything', notableFeature: "The Grand Bazaar, Adventurer's Guild HQ", resources: ['Fish', 'Salt', 'Trade Goods'] },
    { id: 'coral_bay', name: 'Coral Bay', regionId: 'suncoast', regionName: 'The Suncoast', x: 440, y: 560, population: 5400, biome: 'Coastal', description: 'Premier fishing town and future shipbuilding hub', specialty: 'Fishing, Shipbuilding', notableFeature: 'Best fishing, future naval content', resources: ['Fish', 'Salt', 'Coral'] },
    { id: 'sandrift', name: 'Sandrift', regionId: 'suncoast', regionName: 'The Suncoast', x: 555, y: 555, population: 3900, biome: 'Desert Edge', description: 'Gateway to the desert with exotic goods', specialty: 'Gems, Glass, Exotic Goods', notableFeature: 'Desert expeditions, sand glass', resources: ['Gems', 'Sand', 'Glass'] },
    { id: 'libertad', name: 'Libertad', regionId: 'suncoast', regionName: 'The Suncoast', x: 460, y: 620, population: 8100, biome: 'Port', description: 'Anything goes in this port city of entertainment', specialty: 'Trade, Entertainment', notableFeature: 'Arena, casinos, black market', resources: ['Trade Goods', 'Contraband'] },
    { id: 'beacons_end', name: "Beacon's End", regionId: 'suncoast', regionName: 'The Suncoast', x: 545, y: 625, population: 2800, biome: 'Lighthouse', description: 'Home of cartographers and navigators', specialty: 'Navigation, Cartography', notableFeature: 'Scribe headquarters, world maps', resources: ['Trade Goods', 'Parchment'] },

    // Silverwood Forest (bottom-right)
    { id: 'aelindra', name: 'Aelindra', regionId: 'silverwood_forest', regionName: 'Silverwood Forest', x: 830, y: 570, population: 6800, biome: 'Ancient Forest', description: 'Treetop capital of the Elven people', specialty: 'Magic, Enchanting', notableFeature: 'The Great Library, Enchanting Spire', resources: ['Exotic Wood', 'Arcane Reagents', 'Herbs'] },
    { id: 'moonhaven', name: 'Moonhaven', regionId: 'silverwood_forest', regionName: 'Silverwood Forest', x: 880, y: 535, population: 2400, biome: 'Deep Forest', description: 'Moonlit glades where the rarest herbs bloom', specialty: 'Herbalism, Alchemy', notableFeature: 'Moonlit glades, rare herb spawns', resources: ['Herbs', 'Rare Herbs', 'Reagents'] },
    { id: 'thornwatch', name: 'Thornwatch', regionId: 'silverwood_forest', regionName: 'Silverwood Forest', x: 780, y: 540, population: 3100, biome: 'Forest Edge', description: 'Ranger outpost guarding the forest border', specialty: 'Archery, Fletcher', notableFeature: 'Ranger outpost, bow crafting masters', resources: ['Exotic Wood', 'Feathers', 'Leather'] },
    { id: 'willowmere', name: 'Willowmere', regionId: 'silverwood_forest', regionName: 'Silverwood Forest', x: 870, y: 610, population: 2100, biome: 'Lakeside', description: 'Crystal-clear lake surrounded by ancient willows', specialty: 'Fishing, Scribing', notableFeature: 'Crystal-clear lake, paper mills', resources: ['Fish', 'Softwood', 'Parchment'] },
    { id: 'eldergrove', name: 'Eldergrove', regionId: 'silverwood_forest', regionName: 'Silverwood Forest', x: 790, y: 615, population: 1800, biome: 'Sacred Grove', description: 'Temple of the Old Gods and healer sanctuary', specialty: 'Religion, Healing', notableFeature: 'Temple of the Old Gods, healer sanctuary', resources: ['Herbs', 'Arcane Reagents'] },

    // Common Race Territories
    // Twilight March (Half-Elf)
    { id: 'dawnmere', name: 'Dawnmere', regionId: 'twilight_march', regionName: 'Twilight March', x: 720, y: 370, population: 3400, biome: 'Forest Edge', description: 'Half-Elf settlement at the edge of civilization', specialty: 'Trade, Diplomacy', notableFeature: 'Cultural bridge between races', resources: ['Herbs', 'Softwood', 'Grain'] },
    { id: 'twinvale', name: 'Twinvale', regionId: 'twilight_march', regionName: 'Twilight March', x: 760, y: 400, population: 2100, biome: 'Valley', description: 'Twin valley settlement of mixed heritage', specialty: 'Herbalism, Art', notableFeature: 'Artisan quarter', resources: ['Herbs', 'Exotic Wood'] },
    { id: 'harmony_point', name: 'Harmony Point', regionId: 'twilight_march', regionName: 'Twilight March', x: 740, y: 440, population: 2800, biome: 'Lakeside', description: 'Where Human and Elf cultures truly blend', specialty: 'Enchanting, Music', notableFeature: 'Festival grounds', resources: ['Arcane Reagents', 'Herbs'] },

    // Scarred Frontier (Half-Orc)
    { id: 'scarwatch', name: 'Scarwatch', regionId: 'scarred_frontier', regionName: 'Scarred Frontier', x: 280, y: 430, population: 3800, biome: 'Borderlands', description: 'Fortified town on the disputed frontier', specialty: 'Military, Trade', notableFeature: 'Border fortress', resources: ['Leather', 'Iron Ore', 'Grain'] },
    { id: 'tuskbridge', name: 'Tuskbridge', regionId: 'scarred_frontier', regionName: 'Scarred Frontier', x: 310, y: 470, population: 2400, biome: 'River Crossing', description: 'Bridge town connecting Orc and Human lands', specialty: 'Trade, Mercenary', notableFeature: 'Great bridge', resources: ['Trade Goods', 'Leather'] },
    { id: 'proving_grounds', name: 'Proving Grounds', regionId: 'scarred_frontier', regionName: 'Scarred Frontier', x: 260, y: 500, population: 1900, biome: 'Badlands Edge', description: 'Where Half-Orcs prove their worth', specialty: 'Combat Training', notableFeature: 'Tournament arena', resources: ['Leather', 'Bone', 'Iron Ore'] },

    // Cogsworth Warrens (Gnome)
    { id: 'cogsworth', name: 'Cogsworth', regionId: 'cogsworth_warrens', regionName: 'Cogsworth Warrens', x: 260, y: 175, population: 4200, biome: 'Underground/Hill', description: 'Gnomish city of inventions and clockwork', specialty: 'Engineering, Tinkering', notableFeature: 'The Grand Clocktower', resources: ['Gears', 'Gems', 'Iron Ore'] },
    { id: 'sparkhollow', name: 'Sparkhollow', regionId: 'cogsworth_warrens', regionName: 'Cogsworth Warrens', x: 290, y: 210, population: 2100, biome: 'Cavern', description: 'Experimental workshops and alchemical labs', specialty: 'Alchemy, Engineering', notableFeature: 'Spark labs', resources: ['Reagents', 'Gems', 'Iron Ore'] },
    { id: 'fumblewick', name: 'Fumblewick', regionId: 'cogsworth_warrens', regionName: 'Cogsworth Warrens', x: 305, y: 160, population: 1500, biome: 'Hillside', description: 'Eccentric gnomish village of failed and brilliant inventions', specialty: 'Scribe, Research', notableFeature: 'Library of Failures', resources: ['Parchment', 'Gems'] },

    // Pelagic Depths (Merfolk)
    { id: 'coralspire', name: 'Coralspire', regionId: 'pelagic_depths', regionName: 'Pelagic Depths', x: 410, y: 680, population: 5100, biome: 'Underwater', description: 'Grand underwater city of living coral', specialty: 'Deep Sea Resources', notableFeature: 'Coral palace', resources: ['Deep Sea Iron', 'Abyssal Pearl', 'Living Coral'] },
    { id: 'shallows_end', name: 'Shallows End', regionId: 'pelagic_depths', regionName: 'Pelagic Depths', x: 470, y: 700, population: 2800, biome: 'Shallow Sea', description: 'Trading post between land and sea folk', specialty: 'Trade, Fishing', notableFeature: 'Surface trade docks', resources: ['Fish', 'Sea Silk', 'Coral'] },
    { id: 'abyssal_reach', name: 'Abyssal Reach', regionId: 'pelagic_depths', regionName: 'Pelagic Depths', x: 350, y: 710, population: 1200, biome: 'Deep Ocean', description: 'The deepest settlement, near ocean trenches', specialty: 'Mining, Exploration', notableFeature: 'Deep sea vents', resources: ['Deep Sea Iron', 'Abyssal Pearl'] },

    // Thornwilds (Beastfolk)
    { id: 'thornden', name: 'Thornden', regionId: 'thornwilds', regionName: 'Thornwilds', x: 720, y: 500, population: 3200, biome: 'Dense Forest', description: 'Central settlement of the Beastfolk clans', specialty: 'Hunting, Tanning', notableFeature: 'Clan council ring', resources: ['Spirit Beast Hide', 'Primal Bone', 'Thornwood'] },
    { id: 'clawridge', name: 'Clawridge', regionId: 'thornwilds', regionName: 'Thornwilds', x: 750, y: 530, population: 1800, biome: 'Rocky Forest', description: 'Mountain-forest town of predator clans', specialty: 'Combat, Leatherwork', notableFeature: 'Predator dens', resources: ['Leather', 'Bone', 'Thornwood'] },
    { id: 'windrun', name: 'Windrun', regionId: 'thornwilds', regionName: 'Thornwilds', x: 700, y: 540, population: 1500, biome: 'Open Canopy', description: 'Swift-footed clan settlement in open glades', specialty: 'Scouting, Herbalism', notableFeature: 'Racing grounds', resources: ['Herbs', 'Softwood', 'Leather'] },

    // Glimmerveil (Faefolk)
    { id: 'glimmerheart', name: 'Glimmerheart', regionId: 'glimmerveil', regionName: 'Glimmerveil', x: 920, y: 440, population: 2800, biome: 'Feywild Crossing', description: 'Where the mortal world meets the Feywild', specialty: 'Enchanting, Art', notableFeature: 'Feywild gate', resources: ['Moonpetal', 'Dreamweave Silk', 'Starlight Dust'] },
    { id: 'dewdrop_hollow', name: 'Dewdrop Hollow', regionId: 'glimmerveil', regionName: 'Glimmerveil', x: 940, y: 480, population: 1600, biome: 'Enchanted Grove', description: 'Perpetually dew-kissed hollow of magical gardens', specialty: 'Herbalism, Alchemy', notableFeature: 'Living garden', resources: ['Moonpetal', 'Herbs', 'Reagents'] },
    { id: 'moonpetal_grove', name: 'Moonpetal Grove', regionId: 'glimmerveil', regionName: 'Glimmerveil', x: 930, y: 520, population: 1100, biome: 'Sacred Grove', description: 'Sacred grove where fey magic is strongest', specialty: 'Magic, Religion', notableFeature: 'Moonpetal fields', resources: ['Moonpetal', 'Fey Iron', 'Starlight Dust'] },

    // Exotic Race Settlements
    { id: 'skyhold', name: 'Skyhold', regionId: 'skypeak_plateaus', regionName: 'Skypeak Plateaus', x: 80, y: 120, population: 1800, biome: 'Mountain Peak', description: 'Goliath fortress above the clouds', specialty: 'Mining, Combat', notableFeature: 'Sky forges', resources: ['Sky Iron', 'Cloud Crystal', 'Giant Eagle Feather'] },
    { id: 'windbreak', name: 'Windbreak', regionId: 'skypeak_plateaus', regionName: 'Skypeak Plateaus', x: 60, y: 160, population: 900, biome: 'High Plateau', description: 'Windswept plateau settlement', specialty: 'Hunting, Herding', notableFeature: 'Eagle eyries', resources: ['Sky Iron', 'Leather', 'Giant Eagle Feather'] },

    { id: 'vel_naris', name: "Vel'Naris", regionId: 'vel_naris_underdark', regionName: "Vel'Naris Underdark", x: 850, y: 375, population: 4200, biome: 'Underdark', description: 'The dark elven city beneath the earth', specialty: 'Enchanting, Espionage', notableFeature: 'Spider silk weavers', resources: ['Darksteel Ore', 'Spider Silk', 'Shadow Crystal'] },
    { id: 'gloom_market', name: 'Gloom Market', regionId: 'vel_naris_underdark', regionName: "Vel'Naris Underdark", x: 890, y: 410, population: 2100, biome: 'Underground', description: 'Black market of the Underdark', specialty: 'Trade, Alchemy', notableFeature: 'Underground bazaar', resources: ['Shadow Crystal', 'Reagents', 'Contraband'] },

    { id: 'misthaven', name: 'Misthaven', regionId: 'mistwood_glens', regionName: 'Mistwood Glens', x: 680, y: 620, population: 1500, biome: 'Misty Forest', description: 'Hidden Mosskin village shrouded in mist', specialty: 'Herbalism, Healing', notableFeature: 'Healing springs', resources: ['Heartwood', 'Living Bark', 'Elder Sap'] },
    { id: 'rootholme', name: 'Rootholme', regionId: 'mistwood_glens', regionName: 'Mistwood Glens', x: 660, y: 660, population: 900, biome: 'Ancient Grove', description: 'Settlement grown from living trees', specialty: 'Woodworking, Nature Magic', notableFeature: 'Living tree homes', resources: ['Heartwood', 'Spirit Moss', 'Elder Sap'] },

    { id: 'the_foundry', name: 'The Foundry', regionId: 'the_foundry', regionName: 'The Foundry', x: 330, y: 260, population: 2800, biome: 'Industrial', description: 'The mechanical city where Forgeborn were born', specialty: 'Engineering, Smithing', notableFeature: 'The Creation Engine', resources: ['Arcane Conduit', 'Soul Crystal', 'Living Metal'] },

    { id: 'the_confluence', name: 'The Confluence', regionId: 'the_confluence', regionName: 'The Confluence', x: 360, y: 530, population: 2200, biome: 'Elemental Nexus', description: 'Where all four elements converge', specialty: 'Magic, Mining', notableFeature: 'Elemental rifts', resources: ['Pure Element Essences', 'Elemental Cores'] },
    { id: 'emberheart', name: 'Emberheart', regionId: 'the_confluence', regionName: 'The Confluence', x: 330, y: 570, population: 1400, biome: 'Volcanic Springs', description: 'Fire-dominant elemental settlement', specialty: 'Smelting, Enchanting', notableFeature: 'Fire rift forge', resources: ['Elemental Cores', 'Obsidian'] },

    { id: 'ashenmoor', name: 'Ashenmoor', regionId: 'ashenmoor', regionName: 'Ashenmoor', x: 310, y: 620, population: 1100, biome: 'Deadlands', description: 'The haunted settlement of the Revenants', specialty: 'Alchemy, Necromancy', notableFeature: 'Death gardens', resources: ['Death Blossom', 'Soul Dust', 'Grave Iron'] },
  ];

  const routes: Route[] = [
    // Frozen Reaches internal
    { id: 'r1', fromTownId: 'drakenspire', toTownId: 'frostfang', distance: 45, dangerLevel: 2 },
    { id: 'r2', fromTownId: 'drakenspire', toTownId: 'emberpeak', distance: 35, dangerLevel: 2 },
    { id: 'r3', fromTownId: 'drakenspire', toTownId: 'scalehaven', distance: 50, dangerLevel: 1 },
    { id: 'r4', fromTownId: 'drakenspire', toTownId: 'wyrmrest', distance: 60, dangerLevel: 3 },
    { id: 'r5', fromTownId: 'scalehaven', toTownId: 'frostfang', distance: 40, dangerLevel: 1 },
    // Ironvault internal
    { id: 'r10', fromTownId: 'kazad_vorn', toTownId: 'deepvein', distance: 30, dangerLevel: 2 },
    { id: 'r11', fromTownId: 'kazad_vorn', toTownId: 'alehearth', distance: 25, dangerLevel: 1 },
    { id: 'r12', fromTownId: 'kazad_vorn', toTownId: 'gemhollow', distance: 20, dangerLevel: 1 },
    { id: 'r13', fromTownId: 'kazad_vorn', toTownId: 'hammerfall', distance: 40, dangerLevel: 2 },
    { id: 'r14', fromTownId: 'gemhollow', toTownId: 'deepvein', distance: 25, dangerLevel: 2 },
    // Heartlands internal
    { id: 'r20', fromTownId: 'kingshold', toTownId: 'millhaven', distance: 20, dangerLevel: 0 },
    { id: 'r21', fromTownId: 'kingshold', toTownId: 'bridgewater', distance: 25, dangerLevel: 0 },
    { id: 'r22', fromTownId: 'kingshold', toTownId: 'whitefield', distance: 20, dangerLevel: 0 },
    { id: 'r23', fromTownId: 'kingshold', toTownId: 'ironford', distance: 30, dangerLevel: 1 },
    { id: 'r24', fromTownId: 'millhaven', toTownId: 'ironford', distance: 25, dangerLevel: 0 },
    { id: 'r25', fromTownId: 'bridgewater', toTownId: 'whitefield', distance: 15, dangerLevel: 0 },
    // Shadowmere internal
    { id: 'r30', fromTownId: 'nethermire', toTownId: 'boghollow', distance: 35, dangerLevel: 3 },
    { id: 'r31', fromTownId: 'nethermire', toTownId: 'mistwatch', distance: 25, dangerLevel: 2 },
    { id: 'r32', fromTownId: 'nethermire', toTownId: 'cinderkeep', distance: 30, dangerLevel: 2 },
    { id: 'r33', fromTownId: 'mistwatch', toTownId: 'whispering_docks', distance: 35, dangerLevel: 2 },
    { id: 'r34', fromTownId: 'cinderkeep', toTownId: 'whispering_docks', distance: 30, dangerLevel: 2 },
    // Crossroads internal
    { id: 'r40', fromTownId: 'hearthshire', toTownId: 'greenhollow', distance: 15, dangerLevel: 0 },
    { id: 'r41', fromTownId: 'hearthshire', toTownId: 'peddlers_rest', distance: 15, dangerLevel: 0 },
    { id: 'r42', fromTownId: 'hearthshire', toTownId: 'bramblewood', distance: 20, dangerLevel: 0 },
    { id: 'r43', fromTownId: 'hearthshire', toTownId: 'riverside', distance: 20, dangerLevel: 0 },
    { id: 'r44', fromTownId: 'greenhollow', toTownId: 'bramblewood', distance: 15, dangerLevel: 0 },
    // Ashenfang internal
    { id: 'r50', fromTownId: 'grakthar', toTownId: 'bonepile', distance: 30, dangerLevel: 3 },
    { id: 'r51', fromTownId: 'grakthar', toTownId: 'thornback_camp', distance: 25, dangerLevel: 2 },
    { id: 'r52', fromTownId: 'grakthar', toTownId: 'ironfist_hold', distance: 35, dangerLevel: 3 },
    { id: 'r53', fromTownId: 'grakthar', toTownId: 'ashen_market', distance: 30, dangerLevel: 2 },
    { id: 'r54', fromTownId: 'ironfist_hold', toTownId: 'ashen_market', distance: 25, dangerLevel: 2 },
    // Suncoast internal
    { id: 'r60', fromTownId: 'porto_sole', toTownId: 'coral_bay', distance: 20, dangerLevel: 0 },
    { id: 'r61', fromTownId: 'porto_sole', toTownId: 'sandrift', distance: 25, dangerLevel: 1 },
    { id: 'r62', fromTownId: 'porto_sole', toTownId: 'libertad', distance: 20, dangerLevel: 1 },
    { id: 'r63', fromTownId: 'porto_sole', toTownId: 'beacons_end', distance: 25, dangerLevel: 0 },
    { id: 'r64', fromTownId: 'libertad', toTownId: 'beacons_end', distance: 15, dangerLevel: 1 },
    // Silverwood internal
    { id: 'r70', fromTownId: 'aelindra', toTownId: 'moonhaven', distance: 30, dangerLevel: 1 },
    { id: 'r71', fromTownId: 'aelindra', toTownId: 'thornwatch', distance: 25, dangerLevel: 1 },
    { id: 'r72', fromTownId: 'aelindra', toTownId: 'willowmere', distance: 20, dangerLevel: 0 },
    { id: 'r73', fromTownId: 'aelindra', toTownId: 'eldergrove', distance: 25, dangerLevel: 0 },
    { id: 'r74', fromTownId: 'moonhaven', toTownId: 'thornwatch', distance: 30, dangerLevel: 1 },
    // Inter-region routes
    { id: 'r100', fromTownId: 'drakenspire', toTownId: 'kingshold', distance: 120, dangerLevel: 3 },
    { id: 'r101', fromTownId: 'scalehaven', toTownId: 'alehearth', distance: 100, dangerLevel: 2 },
    { id: 'r102', fromTownId: 'alehearth', toTownId: 'millhaven', distance: 80, dangerLevel: 1 },
    { id: 'r103', fromTownId: 'whitefield', toTownId: 'nethermire', distance: 90, dangerLevel: 3 },
    { id: 'r104', fromTownId: 'bridgewater', toTownId: 'hearthshire', distance: 60, dangerLevel: 0 },
    { id: 'r105', fromTownId: 'ironford', toTownId: 'hammerfall', distance: 70, dangerLevel: 2 },
    { id: 'r106', fromTownId: 'hearthshire', toTownId: 'porto_sole', distance: 80, dangerLevel: 1 },
    { id: 'r107', fromTownId: 'riverside', toTownId: 'coral_bay', distance: 60, dangerLevel: 1 },
    { id: 'r108', fromTownId: 'hammerfall', toTownId: 'scarwatch', distance: 60, dangerLevel: 4 },
    { id: 'r109', fromTownId: 'scarwatch', toTownId: 'grakthar', distance: 80, dangerLevel: 4 },
    { id: 'r110', fromTownId: 'thornwatch', toTownId: 'thornden', distance: 40, dangerLevel: 2 },
    { id: 'r111', fromTownId: 'mistwatch', toTownId: 'vel_naris', distance: 50, dangerLevel: 3 },
    { id: 'r112', fromTownId: 'aelindra', toTownId: 'harmony_point', distance: 60, dangerLevel: 1 },
    { id: 'r113', fromTownId: 'dawnmere', toTownId: 'bridgewater', distance: 70, dangerLevel: 1 },
    { id: 'r114', fromTownId: 'cogsworth', toTownId: 'alehearth', distance: 30, dangerLevel: 1 },
    { id: 'r115', fromTownId: 'the_foundry', toTownId: 'cogsworth', distance: 40, dangerLevel: 1 },
    { id: 'r116', fromTownId: 'the_confluence', toTownId: 'coral_bay', distance: 50, dangerLevel: 2 },
    { id: 'r117', fromTownId: 'ashenmoor', toTownId: 'ashen_market', distance: 40, dangerLevel: 3 },
    { id: 'r118', fromTownId: 'porto_sole', toTownId: 'coralspire', distance: 45, dangerLevel: 2 },
    { id: 'r119', fromTownId: 'misthaven', toTownId: 'eldergrove', distance: 35, dangerLevel: 1 },
    { id: 'r120', fromTownId: 'glimmerheart', toTownId: 'nethermire', distance: 70, dangerLevel: 3 },
    { id: 'r121', fromTownId: 'skyhold', toTownId: 'deepvein', distance: 50, dangerLevel: 3 },
    { id: 'r122', fromTownId: 'tuskbridge', toTownId: 'greenhollow', distance: 55, dangerLevel: 2 },
    { id: 'r123', fromTownId: 'thornden', toTownId: 'misthaven', distance: 45, dangerLevel: 2 },
    { id: 'r124', fromTownId: 'emberheart', toTownId: 'the_confluence', distance: 20, dangerLevel: 2 },
    { id: 'r125', fromTownId: 'peddlers_rest', toTownId: 'sandrift', distance: 55, dangerLevel: 1 },
  ];

  const regions: Region[] = [
    { id: 'frozen_reaches', name: 'Frozen Reaches', biome: 'Tundra/Volcanic', raceName: 'Drakonid' },
    { id: 'ironvault_mountains', name: 'Ironvault Mountains', biome: 'Mountains/Underground', raceName: 'Dwarf' },
    { id: 'verdant_heartlands', name: 'Verdant Heartlands', biome: 'Plains/Hills', raceName: 'Human' },
    { id: 'shadowmere_marshes', name: 'Shadowmere Marshes', biome: 'Swamps/Bogs', raceName: 'Nethkin' },
    { id: 'crossroads', name: 'The Crossroads', biome: 'Rolling Hills', raceName: 'Harthfolk' },
    { id: 'ashenfang_wastes', name: 'Ashenfang Wastes', biome: 'Badlands/Volcanic', raceName: 'Orc' },
    { id: 'suncoast', name: 'The Suncoast', biome: 'Coastal', raceName: 'Free Cities' },
    { id: 'silverwood_forest', name: 'Silverwood Forest', biome: 'Ancient Forest', raceName: 'Elf' },
    { id: 'twilight_march', name: 'Twilight March', biome: 'Forest Edge', raceName: 'Half-Elf' },
    { id: 'scarred_frontier', name: 'Scarred Frontier', biome: 'Borderlands', raceName: 'Half-Orc' },
    { id: 'cogsworth_warrens', name: 'Cogsworth Warrens', biome: 'Underground/Hill', raceName: 'Gnome' },
    { id: 'pelagic_depths', name: 'Pelagic Depths', biome: 'Underwater', raceName: 'Merfolk' },
    { id: 'thornwilds', name: 'Thornwilds', biome: 'Dense Forest', raceName: 'Beastfolk' },
    { id: 'glimmerveil', name: 'Glimmerveil', biome: 'Feywild Crossing', raceName: 'Faefolk' },
    { id: 'skypeak_plateaus', name: 'Skypeak Plateaus', biome: 'Mountain Peak', raceName: 'Goliath' },
    { id: 'vel_naris_underdark', name: "Vel'Naris Underdark", biome: 'Underdark', raceName: 'Nightborne' },
    { id: 'mistwood_glens', name: 'Mistwood Glens', biome: 'Misty Forest', raceName: 'Mosskin' },
    { id: 'the_foundry', name: 'The Foundry', biome: 'Industrial', raceName: 'Forgeborn' },
    { id: 'the_confluence', name: 'The Confluence', biome: 'Elemental Nexus', raceName: 'Elementari' },
    { id: 'ashenmoor', name: 'Ashenmoor', biome: 'Deadlands', raceName: 'Revenant' },
  ];

  return { regions, towns, routes };
}

// ---------------------------------------------------------------------------
// SVG dimensions
// ---------------------------------------------------------------------------
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 760;

// ---------------------------------------------------------------------------
// Zoom level thresholds
// ---------------------------------------------------------------------------
function getZoomLevel(viewBoxW: number): 'continent' | 'region' | 'town' {
  if (viewBoxW <= 450) return 'town';
  if (viewBoxW <= 750) return 'region';
  return 'continent';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function WorldMapPage() {
  const navigate = useNavigate();
  const svgRef = useRef<SVGSVGElement>(null);

  const [mapData, setMapData] = useState<WorldMapData | null>(null);
  const [playerLocation, setPlayerLocation] = useState<PlayerLocation | null>(null);
  const [selectedTown, setSelectedTown] = useState<Town | null>(null);
  const [hoveredRoute, setHoveredRoute] = useState<Route | null>(null);
  const [hoveredTown, setHoveredTown] = useState<Town | null>(null);
  const [exclusiveZones, setExclusiveZones] = useState<ExclusiveZoneData[]>([]);
  const [selectedZone, setSelectedZone] = useState<ExclusiveZoneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [characterId, setCharacterId] = useState<string | undefined>(undefined);
  const [showLegend, setShowLegend] = useState(false);

  // Pan & zoom state
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const zoomLevel = getZoomLevel(viewBox.w);

  // Fetch map data
  useEffect(() => {
    let cancelled = false;

    async function fetchMapData() {
      try {
        const [mapRes, locRes, zonesRes, charRes] = await Promise.allSettled([
          api.get('/world/map'),
          api.get('/characters/me/location'),
          api.get('/zones/exclusive'),
          api.get('/characters/me'),
        ]);

        if (cancelled) return;

        if (mapRes.status === 'fulfilled') {
          setMapData(mapRes.value.data);
        } else {
          setMapData(buildFallbackData());
        }

        if (locRes.status === 'fulfilled') {
          setPlayerLocation(locRes.value.data);
        }

        if (charRes.status === 'fulfilled') {
          setCharacterId(charRes.value.data?.id);
        }

        // Build exclusive zone overlays
        if (zonesRes.status === 'fulfilled' && charRes.status === 'fulfilled') {
          const playerId = charRes.value.data?.playerId;
          const zones = zonesRes.value.data as Array<{
            id: string; name: string; regionId: string; raceName: string;
            x: number; y: number; radius?: number;
            requirements?: string; resources?: string[];
          }>;

          // Check access for each zone in parallel
          const accessChecks = await Promise.allSettled(
            zones.map(z => api.get(`/zones/${z.id}/access`, { params: { playerId } }))
          );

          const enriched: ExclusiveZoneData[] = zones.map((z, i) => ({
            ...z,
            hasAccess: accessChecks[i].status === 'fulfilled'
              ? (accessChecks[i] as PromiseFulfilledResult<any>).value.data.hasAccess
              : false,
          }));

          setExclusiveZones(enriched);
        }
      } catch {
        if (!cancelled) {
          setMapData(buildFallbackData());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMapData();
    return () => { cancelled = true; };
  }, []);

  // Build town lookup
  const townMap = useMemo(() => {
    if (!mapData) return new Map<string, Town>();
    const m = new Map<string, Town>();
    for (const t of mapData.towns) m.set(t.id, t);
    return m;
  }, [mapData]);

  // Build region lookup
  const regionMap = useMemo(() => {
    if (!mapData) return new Map<string, Region>();
    const m = new Map<string, Region>();
    for (const r of mapData.regions) m.set(r.id, r);
    return m;
  }, [mapData]);

  // Group towns by region
  const regionTowns = useMemo(() => {
    if (!mapData) return new Map<string, Town[]>();
    const m = new Map<string, Town[]>();
    for (const t of mapData.towns) {
      const arr = m.get(t.regionId) ?? [];
      arr.push(t);
      m.set(t.regionId, arr);
    }
    return m;
  }, [mapData]);

  // Mouse handlers for pan
  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning || !svgRef.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    const dx = (e.clientX - panStart.x) * scaleX;
    const dy = (e.clientY - panStart.y) * scaleY;
    setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
    setPanStart({ x: e.clientX, y: e.clientY });
  }, [isPanning, panStart, viewBox.w, viewBox.h]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox(prev => {
      const newW = Math.max(300, Math.min(MAP_WIDTH * 2, prev.w * zoomFactor));
      const newH = Math.max(228, Math.min(MAP_HEIGHT * 2, prev.h * zoomFactor));
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
    });
  }, []);

  const resetView = useCallback(() => {
    setViewBox({ x: 0, y: 0, w: MAP_WIDTH, h: MAP_HEIGHT });
  }, []);

  // Center on player location
  const centerOnPlayer = useCallback(() => {
    if (!playerLocation) return;
    const town = townMap.get(playerLocation.currentTownId);
    if (!town) return;
    const w = 500;
    const h = 380;
    setViewBox({ x: town.x - w / 2, y: town.y - h / 2, w, h });
  }, [playerLocation, townMap]);

  // MiniMap click handler
  const handleMiniMapClick = useCallback((mx: number, my: number) => {
    setViewBox(prev => ({
      ...prev,
      x: mx - prev.w / 2,
      y: my - prev.h / 2,
    }));
  }, []);

  // Travel handler
  const handleTravel = useCallback(async (townId: string) => {
    try {
      await api.post('/characters/me/travel', { destinationTownId: townId });
      setPlayerLocation({ currentTownId: townId, travelingTo: townId, travelProgress: 0 });
      setSelectedTown(null);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to start travel');
    }
  }, []);

  // Render travel progress dot
  const renderTravelProgress = useCallback(() => {
    if (!playerLocation?.travelingTo || !playerLocation.travelProgress || !mapData) return null;
    const fromTown = townMap.get(playerLocation.currentTownId);
    const toTown = townMap.get(playerLocation.travelingTo);
    if (!fromTown || !toTown) return null;

    const progress = playerLocation.travelProgress;
    const cx = fromTown.x + (toTown.x - fromTown.x) * progress;
    const cy = fromTown.y + (toTown.y - fromTown.y) * progress;

    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill="#C9A461" opacity={0.8}>
          <animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx={cx} cy={cy} r={3} fill="#F5EBCB" />
      </g>
    );
  }, [playerLocation, mapData, townMap]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-500">
        <div className="text-primary-400 font-display text-2xl animate-pulse">
          Charting the realm...
        </div>
      </div>
    );
  }

  if (!mapData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-500">
        <div className="text-red-400 font-display text-xl">Failed to load map data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-500 flex flex-col pt-12">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-dark-400 border-b border-dark-50">
        <button
          onClick={() => navigate('/')}
          className="text-parchment-300 hover:text-primary-400 transition-colors font-display text-sm"
        >
          &larr; Back to Home
        </button>
        <h1 className="text-2xl font-display text-primary-400">World of Aethermere</h1>
        <div className="flex items-center gap-3">
          {playerLocation && (
            <button
              onClick={centerOnPlayer}
              className="text-parchment-300 hover:text-primary-400 transition-colors font-display text-sm"
            >
              Find Me
            </button>
          )}
          <button
            onClick={resetView}
            className="text-parchment-300 hover:text-primary-400 transition-colors font-display text-sm"
          >
            Reset View
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-2 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-4 text-red-400 hover:text-red-300">Dismiss</button>
        </div>
      )}

      {/* Map + Panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* SVG Map */}
        <div className="flex-1 relative">
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            className="w-full h-full cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ background: '#0E0E1A' }}
          >
            <defs>
              <radialGradient id="bgGrad" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor="#1A1A2E" />
                <stop offset="100%" stopColor="#080810" />
              </radialGradient>

              <filter id="playerGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="hoverGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background */}
            <rect x="-200" y="-200" width={MAP_WIDTH + 400} height={MAP_HEIGHT + 400} fill="url(#bgGrad)" />

            {/* Region overlays with race emblems and relation borders */}
            {mapData.regions.map(region => {
              const towns = regionTowns.get(region.id);
              if (!towns || towns.length < 2) return null;
              const color = getRegionColor(region.id);
              // Default to neutral border; API could provide relation data
              const borderColor = RELATION_BORDER_COLORS.Neutral;
              return (
                <RegionOverlay
                  key={region.id}
                  regionId={region.id}
                  raceName={region.raceName}
                  towns={towns}
                  color={color}
                  borderColor={borderColor}
                />
              );
            })}

            {/* Exclusive zone overlays */}
            {exclusiveZones.map(zone => {
              const color = getRegionColor(zone.regionId);
              return (
                <ExclusiveZoneOverlay
                  key={zone.id}
                  zone={zone}
                  color={color}
                  isSelected={selectedZone?.id === zone.id}
                  onSelect={() => setSelectedZone(selectedZone?.id === zone.id ? null : zone)}
                />
              );
            })}

            {/* Routes */}
            {mapData.routes.map(route => {
              const from = townMap.get(route.fromTownId);
              const to = townMap.get(route.toTownId);
              if (!from || !to) return null;

              const isHovered = hoveredRoute?.id === route.id;
              const dangerColor = route.dangerLevel >= 4 ? '#8B0000' : route.dangerLevel >= 3 ? '#B8913A' : '#4A4A6E';

              return (
                <g key={route.id}>
                  <line
                    x1={from.x} y1={from.y}
                    x2={to.x} y2={to.y}
                    stroke={isHovered ? '#C9A461' : dangerColor}
                    strokeWidth={isHovered ? 2 : 1}
                    strokeDasharray={isHovered ? 'none' : '4 3'}
                    opacity={isHovered ? 0.9 : 0.4}
                    onMouseEnter={() => setHoveredRoute(route)}
                    onMouseLeave={() => setHoveredRoute(null)}
                    style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                    strokeLinecap="round"
                  />
                  <line
                    x1={from.x} y1={from.y}
                    x2={to.x} y2={to.y}
                    stroke="transparent"
                    strokeWidth={12}
                    onMouseEnter={() => setHoveredRoute(route)}
                    onMouseLeave={() => setHoveredRoute(null)}
                    style={{ cursor: 'pointer' }}
                  />
                </g>
              );
            })}

            {/* Route distance tooltip */}
            {hoveredRoute && (() => {
              const from = townMap.get(hoveredRoute.fromTownId);
              const to = townMap.get(hoveredRoute.toTownId);
              if (!from || !to) return null;
              const mx = (from.x + to.x) / 2;
              const my = (from.y + to.y) / 2;
              const dangerLabel = ['Safe', 'Low', 'Moderate', 'Dangerous', 'Deadly', 'Suicidal'][hoveredRoute.dangerLevel] ?? 'Unknown';
              return (
                <g>
                  <rect
                    x={mx - 50} y={my - 24}
                    width={100} height={32}
                    rx={4}
                    fill="#252538" stroke="#C9A461" strokeWidth={0.5} opacity={0.95}
                  />
                  <text x={mx} y={my - 10} textAnchor="middle" fill="#E8E0D0" fontSize={9} fontFamily="Crimson Text, serif">
                    {hoveredRoute.distance} leagues
                  </text>
                  <text x={mx} y={my + 2} textAnchor="middle" fill={hoveredRoute.dangerLevel >= 3 ? '#B22222' : '#A89A80'} fontSize={8} fontFamily="Crimson Text, serif">
                    {dangerLabel}
                  </text>
                </g>
              );
            })()}

            {/* Town markers */}
            {mapData.towns.map(town => {
              const color = getRegionColor(town.regionId);
              return (
                <TownMarker
                  key={town.id}
                  town={town}
                  color={color}
                  isSelected={selectedTown?.id === town.id}
                  isPlayerHere={playerLocation?.currentTownId === town.id}
                  isHovered={hoveredTown?.id === town.id}
                  onSelect={() => { setSelectedTown(town); setSelectedZone(null); }}
                  onHoverStart={() => setHoveredTown(town)}
                  onHoverEnd={() => setHoveredTown(null)}
                />
              );
            })}

            {/* Travel progress */}
            {renderTravelProgress()}
          </svg>

          {/* Hover tooltip (HTML overlay) */}
          {hoveredTown && !selectedTown && (
            <MapTooltip x={hoveredTown.x} y={hoveredTown.y} svgRef={svgRef}>
              <div>
                <p className="font-display text-primary-400 text-sm">{hoveredTown.name}</p>
                <p className="text-parchment-500 text-[10px]">
                  Pop: {hoveredTown.population.toLocaleString()} | {hoveredTown.specialty}
                </p>
                <p className="text-parchment-500 text-[10px]">{hoveredTown.regionName}</p>
              </div>
            </MapTooltip>
          )}

          {/* Exclusive zone tooltip */}
          {selectedZone && !selectedTown && (
            <MapTooltip x={selectedZone.x} y={selectedZone.y} svgRef={svgRef}>
              <div>
                <p className="font-display text-primary-400 text-sm">{selectedZone.name}</p>
                <p className="text-parchment-500 text-[10px]">
                  {selectedZone.raceName} Exclusive Zone
                </p>
                <p className={`text-[10px] ${selectedZone.hasAccess ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedZone.hasAccess ? 'Access Granted' : 'Locked'}
                </p>
                {selectedZone.requirements && (
                  <p className="text-parchment-500 text-[10px] mt-1">{selectedZone.requirements}</p>
                )}
                {selectedZone.resources && selectedZone.resources.length > 0 && (
                  <p className="text-parchment-400 text-[10px] mt-0.5">
                    Resources: {selectedZone.resources.join(', ')}
                  </p>
                )}
              </div>
            </MapTooltip>
          )}

          {/* Zoom level indicator */}
          <div className="absolute top-4 left-4 bg-dark-400/90 border border-dark-50 rounded px-2 py-1">
            <span className="text-parchment-500 text-[10px] uppercase tracking-wider">
              {zoomLevel === 'continent' ? 'Continent View' : zoomLevel === 'region' ? 'Region View' : 'Town View'}
            </span>
          </div>

          {/* Legend overlay */}
          <div className="absolute bottom-4 left-4 bg-dark-400/90 border border-dark-50 rounded-lg p-3">
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="font-display text-primary-400 text-xs mb-1 w-full text-left"
            >
              Regions {showLegend ? '[-]' : '[+]'}
            </button>
            {showLegend && (
              <div className="space-y-1 max-h-48 overflow-y-auto mt-1">
                {Object.entries(REGION_COLORS).map(([id, color]) => (
                  <div key={id} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ backgroundColor: color.fill }} />
                    <span className="text-parchment-300 text-[10px]">{color.label}</span>
                  </div>
                ))}
                <div className="border-t border-dark-50 pt-1 mt-1">
                  <p className="text-parchment-500 text-[9px] uppercase tracking-wider mb-1">Border Relations</p>
                  {Object.entries(RELATION_BORDER_COLORS).map(([label, hex]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-3 h-1 rounded-full inline-block shrink-0" style={{ backgroundColor: hex }} />
                      <span className="text-parchment-300 text-[10px]">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1">
            <button
              onClick={() => setViewBox(prev => {
                const nw = Math.max(300, prev.w * 0.8);
                const nh = Math.max(228, prev.h * 0.8);
                return { x: prev.x + (prev.w - nw) / 2, y: prev.y + (prev.h - nh) / 2, w: nw, h: nh };
              })}
              className="w-8 h-8 bg-dark-400/90 border border-dark-50 rounded text-parchment-300 hover:text-primary-400 hover:border-primary-400/50 transition-colors flex items-center justify-center text-lg"
            >
              +
            </button>
            <button
              onClick={() => setViewBox(prev => {
                const nw = Math.min(MAP_WIDTH * 2, prev.w * 1.2);
                const nh = Math.min(MAP_HEIGHT * 2, prev.h * 1.2);
                return { x: prev.x + (prev.w - nw) / 2, y: prev.y + (prev.h - nh) / 2, w: nw, h: nh };
              })}
              className="w-8 h-8 bg-dark-400/90 border border-dark-50 rounded text-parchment-300 hover:text-primary-400 hover:border-primary-400/50 transition-colors flex items-center justify-center text-lg"
            >
              -
            </button>
          </div>

          {/* Mini-map */}
          <MiniMap
            towns={mapData.towns}
            playerTownId={playerLocation?.currentTownId ?? null}
            viewBox={viewBox}
            mapWidth={MAP_WIDTH}
            mapHeight={MAP_HEIGHT}
            getColor={getRegionColor}
            onClickMiniMap={handleMiniMapClick}
          />
        </div>

        {/* Info Panel (sidebar) */}
        {selectedTown && (
          <TownInfoPanel
            town={selectedTown}
            routes={mapData.routes}
            townMap={townMap}
            regionColor={getRegionColor(selectedTown.regionId)}
            isPlayerHere={playerLocation?.currentTownId === selectedTown.id}
            characterId={characterId}
            onClose={() => setSelectedTown(null)}
            onSelectTown={setSelectedTown}
            onTravel={handleTravel}
          />
        )}
      </div>
    </div>
  );
}
