/**
 * Combat parameter presets (standing orders) for autonomous tick-based combat.
 * Manages a character's combat stance, retreat conditions, ability priority queue,
 * item usage rules, and PvP loot behavior.
 */

import { prisma } from '../lib/prisma';

// ---- Types ----

export type CombatStance = 'AGGRESSIVE' | 'BALANCED' | 'DEFENSIVE' | 'EVASIVE';

export interface RetreatConditions {
  hpThreshold: number;         // Retreat when HP drops below this percentage (0-100)
  oppositionRatio: number;     // Retreat when outnumbered by this ratio (e.g., 3.0 = 3:1)
  roundLimit: number;          // Retreat after this many rounds (0 = no limit)
  neverRetreat: boolean;       // Override: never retreat
}

export interface AbilityQueueEntry {
  abilityId: string;
  abilityName: string;
  priority: number;            // Lower = higher priority
  useWhen?: 'always' | 'low_hp' | 'high_hp' | 'first_round' | 'outnumbered';
  hpThreshold?: number;        // For low_hp/high_hp conditions (percentage)
}

export interface ItemUsageRule {
  itemTemplateId: string;
  itemName: string;
  useWhen: 'hp_below' | 'mana_below' | 'status_effect' | 'first_round';
  threshold?: number;          // Percentage threshold for hp_below/mana_below
  statusEffect?: string;       // For status_effect condition
}

export type PvPLootBehavior = 'TAKE_GOLD' | 'TAKE_ITEMS' | 'TAKE_ALL' | 'TAKE_NOTHING';

export interface CombatPresets {
  stance: CombatStance;
  retreat: RetreatConditions;
  abilityQueue: AbilityQueueEntry[];
  itemUsageRules: ItemUsageRule[];
  pvpLootBehavior: PvPLootBehavior;
}

export interface StanceModifiers {
  attackBonus: number;
  acBonus: number;
  fleeBonus: number;
}

// ---- Stance Modifier Map ----

export const STANCE_MODIFIERS: Record<CombatStance, StanceModifiers> = {
  AGGRESSIVE:  { attackBonus: 2,  acBonus: -2, fleeBonus: 0 },
  BALANCED:    { attackBonus: 0,  acBonus: 0,  fleeBonus: 0 },
  DEFENSIVE:   { attackBonus: -2, acBonus: 2,  fleeBonus: 0 },
  EVASIVE:     { attackBonus: -4, acBonus: 4,  fleeBonus: 4 },
};

// ---- Default Presets ----

const DEFAULT_PRESETS: CombatPresets = {
  stance: 'BALANCED',
  retreat: {
    hpThreshold: 20,
    oppositionRatio: 3.0,
    roundLimit: 0,
    neverRetreat: false,
  },
  abilityQueue: [],
  itemUsageRules: [],
  pvpLootBehavior: 'TAKE_GOLD',
};

// ---- Functions ----

/**
 * Get a character's combat presets from the database.
 * Returns defaults if fields are not yet populated.
 */
export async function getCombatPresets(characterId: string): Promise<CombatPresets> {
  const character = await prisma.$queryRaw<{
    combatStance: string | null;
    retreatHpThreshold: number | null;
    retreatOppositionRatio: number | null;
    retreatRoundLimit: number | null;
    neverRetreat: boolean | null;
    abilityPriorityQueue: any;
    itemUsageRules: any;
    pvpLootBehavior: string | null;
  }[]>`
    SELECT
      "combat_stance" as "combatStance",
      "retreat_hp_threshold" as "retreatHpThreshold",
      "retreat_opposition_ratio" as "retreatOppositionRatio",
      "retreat_round_limit" as "retreatRoundLimit",
      "never_retreat" as "neverRetreat",
      "ability_priority_queue" as "abilityPriorityQueue",
      "item_usage_rules" as "itemUsageRules",
      "pvp_loot_behavior" as "pvpLootBehavior"
    FROM "characters"
    WHERE id = ${characterId}
    LIMIT 1
  `;

  if (character.length === 0) {
    return { ...DEFAULT_PRESETS };
  }

  const c = character[0];

  return {
    stance: (c.combatStance as CombatStance) ?? DEFAULT_PRESETS.stance,
    retreat: {
      hpThreshold: c.retreatHpThreshold ?? DEFAULT_PRESETS.retreat.hpThreshold,
      oppositionRatio: c.retreatOppositionRatio ?? DEFAULT_PRESETS.retreat.oppositionRatio,
      roundLimit: c.retreatRoundLimit ?? DEFAULT_PRESETS.retreat.roundLimit,
      neverRetreat: c.neverRetreat ?? DEFAULT_PRESETS.retreat.neverRetreat,
    },
    abilityQueue: Array.isArray(c.abilityPriorityQueue)
      ? c.abilityPriorityQueue
      : DEFAULT_PRESETS.abilityQueue,
    itemUsageRules: Array.isArray(c.itemUsageRules)
      ? c.itemUsageRules
      : DEFAULT_PRESETS.itemUsageRules,
    pvpLootBehavior: (c.pvpLootBehavior as PvPLootBehavior) ?? DEFAULT_PRESETS.pvpLootBehavior,
  };
}

/**
 * Update a character's combat presets in the database.
 */
export async function updateCombatPresets(
  characterId: string,
  presets: Partial<CombatPresets>,
): Promise<void> {
  const updates: Record<string, any> = {};

  if (presets.stance !== undefined) {
    updates.combat_stance = presets.stance;
  }
  if (presets.retreat !== undefined) {
    if (presets.retreat.hpThreshold !== undefined) {
      updates.retreat_hp_threshold = presets.retreat.hpThreshold;
    }
    if (presets.retreat.oppositionRatio !== undefined) {
      updates.retreat_opposition_ratio = presets.retreat.oppositionRatio;
    }
    if (presets.retreat.roundLimit !== undefined) {
      updates.retreat_round_limit = presets.retreat.roundLimit;
    }
    if (presets.retreat.neverRetreat !== undefined) {
      updates.never_retreat = presets.retreat.neverRetreat;
    }
  }
  if (presets.abilityQueue !== undefined) {
    updates.ability_priority_queue = JSON.stringify(presets.abilityQueue);
  }
  if (presets.itemUsageRules !== undefined) {
    updates.item_usage_rules = JSON.stringify(presets.itemUsageRules);
  }
  if (presets.pvpLootBehavior !== undefined) {
    updates.pvp_loot_behavior = presets.pvpLootBehavior;
  }

  if (Object.keys(updates).length === 0) return;

  // Build SET clause dynamically
  const setClauses = Object.entries(updates)
    .map(([key]) => `"${key}" = $${key}`)
    .join(', ');

  // Use Prisma's raw update to handle the new fields
  await prisma.$executeRaw`
    UPDATE "characters"
    SET "combat_stance" = COALESCE(${presets.stance ?? null}, "combat_stance"),
        "retreat_hp_threshold" = COALESCE(${presets.retreat?.hpThreshold ?? null}, "retreat_hp_threshold"),
        "retreat_opposition_ratio" = COALESCE(${presets.retreat?.oppositionRatio ?? null}, "retreat_opposition_ratio"),
        "retreat_round_limit" = COALESCE(${presets.retreat?.roundLimit ?? null}, "retreat_round_limit"),
        "never_retreat" = COALESCE(${presets.retreat?.neverRetreat ?? null}, "never_retreat"),
        "pvp_loot_behavior" = COALESCE(${presets.pvpLootBehavior ?? null}, "pvp_loot_behavior")
    WHERE id = ${characterId}
  `;

  // Update JSON fields separately if provided
  if (presets.abilityQueue !== undefined) {
    await prisma.$executeRaw`
      UPDATE "characters"
      SET "ability_priority_queue" = ${JSON.stringify(presets.abilityQueue)}::jsonb
      WHERE id = ${characterId}
    `;
  }

  if (presets.itemUsageRules !== undefined) {
    await prisma.$executeRaw`
      UPDATE "characters"
      SET "item_usage_rules" = ${JSON.stringify(presets.itemUsageRules)}::jsonb
      WHERE id = ${characterId}
    `;
  }
}

/**
 * Build the full combat parameter object for tick resolution.
 * Assembles data from Character fields, equipped abilities, and inventory items.
 */
export async function buildCombatParams(characterId: string): Promise<{
  presets: CombatPresets;
  equippedWeapon: any | null;
  availableAbilities: { id: string; name: string; effects: any }[];
  availableItems: { id: string; name: string; templateId: string; type: string; stats: any }[];
  race: string;
  level: number;
  subRace: any;
}> {
  const [presets, character] = await Promise.all([
    getCombatPresets(characterId),
    prisma.character.findUnique({
      where: { id: characterId },
      include: {
        equipment: {
          include: {
            item: {
              include: { template: true },
            },
          },
        },
        characterAbilities: {
          include: { ability: true },
        },
        inventory: {
          include: {
            item: {
              include: { template: true },
            },
          },
        },
      },
    }),
  ]);

  if (!character) {
    return {
      presets,
      equippedWeapon: null,
      availableAbilities: [],
      availableItems: [],
      race: 'HUMAN',
      level: 1,
      subRace: null,
    };
  }

  // Find equipped weapon (MAIN_HAND slot)
  const mainHand = character.equipment.find(e => e.slot === 'MAIN_HAND');
  let equippedWeapon = null;
  if (mainHand) {
    const weaponStats = mainHand.item.template.stats as Record<string, any>;
    equippedWeapon = {
      id: mainHand.item.id,
      name: mainHand.item.template.name,
      diceCount: weaponStats.diceCount ?? 1,
      diceSides: weaponStats.diceSides ?? 6,
      damageModifierStat: weaponStats.damageModifierStat ?? 'str',
      attackModifierStat: weaponStats.attackModifierStat ?? 'str',
      bonusDamage: weaponStats.bonusDamage ?? 0,
      bonusAttack: weaponStats.bonusAttack ?? 0,
      damageType: weaponStats.damageType ?? undefined,
    };
  }

  // Available abilities (class + racial)
  const availableAbilities = character.characterAbilities.map(ca => ({
    id: ca.ability.id,
    name: ca.ability.name,
    effects: ca.ability.effects,
  }));

  // Available consumable items in inventory
  const availableItems = character.inventory
    .filter(inv => inv.item.template.type === 'CONSUMABLE')
    .map(inv => ({
      id: inv.item.id,
      name: inv.item.template.name,
      templateId: inv.item.templateId,
      type: inv.item.template.type,
      stats: inv.item.template.stats,
    }));

  return {
    presets,
    equippedWeapon,
    availableAbilities,
    availableItems,
    race: character.race,
    level: character.level,
    subRace: character.subRace,
  };
}

/**
 * Validate that all abilities in the queue exist and are unlocked for this character.
 */
export async function validateAbilityQueue(
  characterId: string,
  queue: AbilityQueueEntry[],
): Promise<{ valid: boolean; errors: string[] }> {
  if (queue.length === 0) return { valid: true, errors: [] };

  const errors: string[] = [];

  // Get character's unlocked abilities (class abilities)
  const unlockedAbilities = await prisma.characterAbility.findMany({
    where: { characterId },
    include: { ability: { select: { id: true, name: true } } },
  });

  const unlockedIds = new Set(unlockedAbilities.map(a => a.ability.id));
  const unlockedNames = new Set(unlockedAbilities.map(a => a.ability.name));

  // Get character's racial abilities
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { unlockedAbilities: true },
  });

  const racialAbilities = Array.isArray(character?.unlockedAbilities)
    ? (character.unlockedAbilities as { name: string }[]).map(a => a.name)
    : [];
  const racialAbilityNames = new Set(racialAbilities);

  for (const entry of queue) {
    const isClassAbility = unlockedIds.has(entry.abilityId) || unlockedNames.has(entry.abilityName);
    const isRacialAbility = racialAbilityNames.has(entry.abilityName);

    if (!isClassAbility && !isRacialAbility) {
      errors.push(`Ability "${entry.abilityName}" (${entry.abilityId}) is not unlocked`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate that all items referenced in usage rules exist in the character's inventory.
 */
export async function validateItemUsageRules(
  characterId: string,
  rules: ItemUsageRule[],
): Promise<{ valid: boolean; errors: string[] }> {
  if (rules.length === 0) return { valid: true, errors: [] };

  const errors: string[] = [];

  const inventory = await prisma.inventory.findMany({
    where: { characterId },
    include: { item: { select: { templateId: true } } },
  });

  const ownedTemplateIds = new Set(inventory.map(inv => inv.item.templateId));

  for (const rule of rules) {
    if (!ownedTemplateIds.has(rule.itemTemplateId)) {
      errors.push(`Item template "${rule.itemName}" (${rule.itemTemplateId}) not found in inventory`);
    }
  }

  return { valid: errors.length === 0, errors };
}
