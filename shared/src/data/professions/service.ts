import { ProfessionDefinition } from './types';

export const MERCHANT: ProfessionDefinition = {
  type: 'MERCHANT',
  name: 'Merchant',
  category: 'SERVICE',
  description: 'Merchants run shops, market stalls, and trade caravans between towns. They buy low in resource-rich regions and sell high where goods are scarce. A skilled merchant reads market trends and builds trade routes that keep kingdoms supplied.',
  primaryStat: 'CHA',
  relatedProfessions: ['BANKER', 'COURIER', 'INNKEEPER'],
  inputResources: ['Gold', 'Trade Goods', 'Caravan Supplies'],
  outputProducts: ['Trade Services', 'Marketplace Listings', 'Caravan Routes'],
  townTypeAffinity: ['trade', 'urban', 'coastal'],
  tierUnlocks: {
    APPRENTICE: ['Single market stall', 'Local trade only'],
    JOURNEYMAN: ['Multiple stalls', 'Regional trade'],
    CRAFTSMAN: ['Shop ownership', 'Small caravans', 'Price insight'],
    EXPERT: ['Large caravans', 'Cross-region trade', 'Bulk discounts'],
    MASTER: ['Trade empire', 'Exclusive trade agreements'],
    GRANDMASTER: ['Legendary trade network', 'Market manipulation, monopoly rights'],
  },
};

export const INNKEEPER: ProfessionDefinition = {
  type: 'INNKEEPER',
  name: 'Innkeeper',
  category: 'SERVICE',
  description: 'Innkeepers run taverns and inns where players can rest for buffs, buy food and drink, rent rooms, and socialize. A well-run inn becomes the social hub of a town, attracting adventurers and generating steady income.',
  primaryStat: 'CHA',
  relatedProfessions: ['COOK', 'BREWER', 'MERCHANT'],
  inputResources: ['Food', 'Drinks', 'Furniture', 'Building Materials'],
  outputProducts: ['Rest Buffs', 'Room Rental', 'Social Hub Services', 'Rumor Network'],
  townTypeAffinity: ['urban', 'trade', 'crossroads'],
  tierUnlocks: {
    APPRENTICE: ['Basic room rental', 'Simple rest buff'],
    JOURNEYMAN: ['Better rooms', 'Food/drink service', 'Minor rest buffs'],
    CRAFTSMAN: ['Quality inn', 'Moderate rest buffs', 'Rumor network'],
    EXPERT: ['Grand inn', 'Strong rest buffs', 'Private meeting rooms'],
    MASTER: ['Legendary establishment', 'Superior buffs', 'VIP services'],
    GRANDMASTER: ['Mythical inn (unique rest buffs)', 'Cross-town reputation'],
  },
};

export const HEALER: ProfessionDefinition = {
  type: 'HEALER',
  name: 'Healer',
  category: 'SERVICE',
  description: 'Healers provide medical services: healing wounds, curing diseases, removing curses, and even resurrecting the fallen. They use herbs, potions, and divine or arcane knowledge to mend what combat breaks.',
  primaryStat: 'WIS',
  relatedProfessions: ['HERBALIST', 'ALCHEMIST'],
  inputResources: ['Medicinal Herbs', 'Health Potions', 'Holy Water', 'Bandages'],
  outputProducts: ['Healing Services', 'Curse Removal', 'Disease Cure', 'Resurrection'],
  townTypeAffinity: ['urban', 'religious', 'military'],
  tierUnlocks: {
    APPRENTICE: ['Basic wound treatment', 'Minor healing'],
    JOURNEYMAN: ['Moderate healing', 'Disease diagnosis'],
    CRAFTSMAN: ['Major healing', 'Disease cure', 'Poison treatment'],
    EXPERT: ['Critical healing', 'Curse removal'],
    MASTER: ['Near-death recovery', 'Resurrection (costly)'],
    GRANDMASTER: ['Full resurrection', 'Legendary cures', 'Miracle healing'],
  },
};

export const STABLE_MASTER: ProfessionDefinition = {
  type: 'STABLE_MASTER',
  name: 'Stable Master',
  category: 'SERVICE',
  description: 'Stable Masters breed, train, and sell mounts. They transform raw horses from Ranchers into trained riding horses and war mounts. High-level Stable Masters can train exotic mounts and manage large cavalry operations.',
  primaryStat: 'WIS',
  relatedProfessions: ['RANCHER', 'LEATHERWORKER', 'BLACKSMITH'],
  inputResources: ['Horses', 'Feed', 'Saddles', 'Horseshoes', 'Horse Armor'],
  outputProducts: ['Trained Riding Horses', 'War Horses', 'Armored War Horses', 'Mount Training Services'],
  townTypeAffinity: ['plains', 'military', 'trade'],
  tierUnlocks: {
    APPRENTICE: ['Basic horse care', 'Simple riding training'],
    JOURNEYMAN: ['Riding horse training', 'Mount grooming'],
    CRAFTSMAN: ['War horse training', 'Breeding programs'],
    EXPERT: ['Exotic mount training', 'Speed breeding'],
    MASTER: ['Legendary mount training', 'Cavalry management'],
    GRANDMASTER: ['Mythical mount taming', 'Custom breed creation'],
  },
};

export const BANKER: ProfessionDefinition = {
  type: 'BANKER',
  name: 'Banker',
  category: 'SERVICE',
  description: 'Bankers run player banks, offering secure storage for gold and items, loans with interest, and currency exchange. A trusted banker is invaluable to merchants and guilds who need safe capital management.',
  primaryStat: 'INT',
  relatedProfessions: ['MERCHANT', 'INNKEEPER'],
  inputResources: ['Gold', 'Secure Storage', 'Ledgers'],
  outputProducts: ['Secure Storage Services', 'Loans', 'Interest Income', 'Currency Exchange'],
  townTypeAffinity: ['urban', 'trade', 'capital'],
  tierUnlocks: {
    APPRENTICE: ['Small vault (limited storage)', 'Basic deposits'],
    JOURNEYMAN: ['Medium vault', 'Small loans'],
    CRAFTSMAN: ['Large vault', 'Standard loans', 'Interest setting'],
    EXPERT: ['Massive vault', 'Large loans', 'Inter-town transfers'],
    MASTER: ['Bank chain', 'Guild accounts', 'Investment services'],
    GRANDMASTER: ['Legendary bank (kingdom-level finance)', 'Monetary policy influence'],
  },
};

export const COURIER: ProfessionDefinition = {
  type: 'COURIER',
  name: 'Courier',
  category: 'SERVICE',
  description: 'Couriers deliver items and messages between towns for a fee, faster than player travel. They navigate trade routes and dangerous roads, ensuring goods arrive safely. Speed and reliability are their currency.',
  primaryStat: 'DEX',
  relatedProfessions: ['MERCHANT', 'STABLE_MASTER'],
  inputResources: ['Mounts', 'Delivery Bags', 'Route Maps'],
  outputProducts: ['Item Delivery', 'Message Delivery', 'Express Shipping', 'Bulk Transport'],
  townTypeAffinity: ['crossroads', 'trade', 'coastal'],
  tierUnlocks: {
    APPRENTICE: ['Local deliveries (same region)'],
    JOURNEYMAN: ['Regional deliveries', 'Faster speed'],
    CRAFTSMAN: ['Cross-region deliveries', 'Bulk packages'],
    EXPERT: ['Express delivery', 'Dangerous route access'],
    MASTER: ['Kingdom-wide network', 'Guaranteed delivery'],
    GRANDMASTER: ['Legendary speed', 'Cross-continent delivery', 'Diplomatic pouches'],
  },
};

export const MERCENARY_CAPTAIN: ProfessionDefinition = {
  type: 'MERCENARY_CAPTAIN',
  name: 'Mercenary Captain',
  category: 'SERVICE',
  description: 'Mercenary Captains organize and sell NPC guard contracts, caravan escorts, and defensive services. They recruit, train, and deploy hired soldiers for players who need protection on dangerous roads or during wartime.',
  primaryStat: 'CHA',
  relatedProfessions: ['MERCHANT', 'COURIER', 'BLACKSMITH', 'ARMORER'],
  inputResources: ['Gold', 'Weapons', 'Armor', 'Provisions'],
  outputProducts: ['Guard Contracts', 'Caravan Escorts', 'Town Defense', 'Mercenary Bands'],
  townTypeAffinity: ['military', 'frontier', 'trade'],
  tierUnlocks: {
    APPRENTICE: ['Small guard contracts (1-2 NPCs)'],
    JOURNEYMAN: ['Medium contracts (3-5 NPCs)', 'Basic escorts'],
    CRAFTSMAN: ['Large contracts (6-10 NPCs)', 'Caravan escorts'],
    EXPERT: ['Elite guards', 'Specialized units'],
    MASTER: ['Army-sized contracts', 'Siege specialists'],
    GRANDMASTER: ['Legendary mercenary company', 'Custom unit creation'],
  },
};

export const SERVICE_PROFESSIONS: ProfessionDefinition[] = [
  MERCHANT, INNKEEPER, HEALER, STABLE_MASTER, BANKER, COURIER, MERCENARY_CAPTAIN,
];
