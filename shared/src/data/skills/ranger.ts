import { AbilityDefinition } from './types';

export const rangerAbilities: AbilityDefinition[] = [
  // ---- Beastmaster (pet/summon) ----
  { id: 'ran-bea-1', name: 'Call Companion', description: 'Summon an animal companion that attacks alongside you each round.', class: 'ranger', specialization: 'beastmaster', tier: 1, effects: { type: 'summon', companionDamage: 5, duration: 5 }, cooldown: 6, levelRequired: 10 },
  { id: 'ran-bea-2', name: 'Wild Bond', description: 'Heal your companion and yourself for a moderate amount.', class: 'ranger', specialization: 'beastmaster', tier: 2, effects: { type: 'heal', diceCount: 2, diceSides: 6, healsSelf: true, healsCompanion: true }, cooldown: 4, prerequisiteAbilityId: 'ran-bea-1', levelRequired: 14 },
  { id: 'ran-bea-3', name: 'Pack Tactics', description: 'Your companion flanks the target, granting you advantage on your next attack.', class: 'ranger', specialization: 'beastmaster', tier: 2, effects: { type: 'buff', advantage: true, duration: 1 }, cooldown: 3, prerequisiteAbilityId: 'ran-bea-1', levelRequired: 20 },
  { id: 'ran-bea-4', name: 'Bestial Fury', description: 'Command your companion to make a devastating attack.', class: 'ranger', specialization: 'beastmaster', tier: 3, effects: { type: 'companion_attack', diceCount: 4, diceSides: 8 }, cooldown: 5, prerequisiteAbilityId: 'ran-bea-2', levelRequired: 25 },
  { id: 'ran-bea-5', name: 'Alpha Predator', description: 'Summon a more powerful alpha companion with increased stats.', class: 'ranger', specialization: 'beastmaster', tier: 4, effects: { type: 'summon', companionDamage: 12, companionHp: 50, duration: 8 }, cooldown: 12, prerequisiteAbilityId: 'ran-bea-4', levelRequired: 32 },
  { id: 'ran-bea-6', name: 'Spirit Bond', description: 'Your companion cannot be killed and persists indefinitely. Passive.', class: 'ranger', specialization: 'beastmaster', tier: 5, effects: { type: 'passive', permanentCompanion: true, companionImmune: true }, cooldown: 0, prerequisiteAbilityId: 'ran-bea-5', levelRequired: 40 },

  // ---- Sharpshooter (ranged/crit) ----
  { id: 'ran-sha-1', name: 'Aimed Shot', description: 'A carefully aimed shot that deals increased damage.', class: 'ranger', specialization: 'sharpshooter', tier: 1, effects: { type: 'damage', bonusDamage: 6, accuracyBonus: 3 }, cooldown: 0, levelRequired: 10 },
  { id: 'ran-sha-2', name: 'Multi-Shot', description: 'Fire arrows at up to 3 enemies.', class: 'ranger', specialization: 'sharpshooter', tier: 2, effects: { type: 'multi_target', targets: 3, diceCount: 1, diceSides: 8 }, cooldown: 3, prerequisiteAbilityId: 'ran-sha-1', levelRequired: 14 },
  { id: 'ran-sha-3', name: 'Piercing Arrow', description: 'An arrow that ignores armor.', class: 'ranger', specialization: 'sharpshooter', tier: 2, effects: { type: 'damage', ignoreArmor: true, diceCount: 2, diceSides: 8 }, cooldown: 3, prerequisiteAbilityId: 'ran-sha-1', levelRequired: 20 },
  { id: 'ran-sha-4', name: 'Headshot', description: 'Attempt a critical headshot. High damage on success, misses more often.', class: 'ranger', specialization: 'sharpshooter', tier: 3, effects: { type: 'damage', critBonus: 20, accuracyPenalty: -5, diceCount: 4, diceSides: 8 }, cooldown: 5, prerequisiteAbilityId: 'ran-sha-2', levelRequired: 25 },
  { id: 'ran-sha-5', name: 'Rain of Arrows', description: 'Blanket an area with arrows, hitting all enemies multiple times.', class: 'ranger', specialization: 'sharpshooter', tier: 4, effects: { type: 'aoe_damage', hitsPerTarget: 2, diceCount: 2, diceSides: 8 }, cooldown: 10, prerequisiteAbilityId: 'ran-sha-4', levelRequired: 32 },
  { id: 'ran-sha-6', name: 'Eagles Eye', description: 'Ranged attacks gain +5 accuracy and +10% crit chance. Passive.', class: 'ranger', specialization: 'sharpshooter', tier: 5, effects: { type: 'passive', accuracyBonus: 5, critChanceBonus: 10 }, cooldown: 0, prerequisiteAbilityId: 'ran-sha-5', levelRequired: 40 },

  // ---- Tracker (traps/detection) ----
  { id: 'ran-tra-1', name: 'Lay Trap', description: 'Place a trap that damages the next enemy that attacks you.', class: 'ranger', specialization: 'tracker', tier: 1, effects: { type: 'trap', trapDamage: 10, triggerOn: 'attacked' }, cooldown: 3, levelRequired: 10 },
  { id: 'ran-tra-2', name: 'Snare', description: 'Root an enemy in place, preventing them from fleeing and reducing their defense.', class: 'ranger', specialization: 'tracker', tier: 2, effects: { type: 'status', statusEffect: 'root', acReduction: -3, statusDuration: 2 }, cooldown: 4, prerequisiteAbilityId: 'ran-tra-1', levelRequired: 14 },
  { id: 'ran-tra-3', name: 'Hunters Mark', description: 'Mark a target. All your attacks deal bonus damage to them.', class: 'ranger', specialization: 'tracker', tier: 2, effects: { type: 'debuff', bonusDamageFromYou: 4, duration: 5 }, cooldown: 5, prerequisiteAbilityId: 'ran-tra-1', levelRequired: 20 },
  { id: 'ran-tra-4', name: 'Explosive Trap', description: 'Place a powerful trap that deals area damage when triggered.', class: 'ranger', specialization: 'tracker', tier: 3, effects: { type: 'trap', trapDamage: 25, aoe: true, triggerOn: 'attacked' }, cooldown: 6, prerequisiteAbilityId: 'ran-tra-2', levelRequired: 25 },
  { id: 'ran-tra-5', name: 'Predator Instinct', description: 'Gain advantage on all attacks against enemies below 50% HP.', class: 'ranger', specialization: 'tracker', tier: 4, effects: { type: 'passive', advantageVsLowHp: true, hpThreshold: 0.5 }, cooldown: 0, prerequisiteAbilityId: 'ran-tra-4', levelRequired: 32 },
  { id: 'ran-tra-6', name: 'Master Tracker', description: 'First strike in combat always crits. Passive.', class: 'ranger', specialization: 'tracker', tier: 5, effects: { type: 'passive', firstStrikeCrit: true }, cooldown: 0, prerequisiteAbilityId: 'ran-tra-5', levelRequired: 40 },
];

// ---- Tier 0 (Pre-Specialization) ----
export const rangerTier0Abilities: AbilityDefinition[] = [
  // Level 3 — "First Taste"
  { id: 'ran-t0-3a', name: 'Steady Shot', description: 'Take a breath, steady your aim, and let the arrow fly true.', class: 'ranger', specialization: 'none', tier: 0, effects: { type: 'damage', bonusDamage: 3, accuracyBonus: 1 }, cooldown: 2, levelRequired: 3, requiresChoice: true, choiceGroup: 'ranger_tier0_level3' },
  { id: 'ran-t0-3b', name: 'Nature\'s Grasp', description: 'Call upon tangled roots and vines to hold the enemy fast.', class: 'ranger', specialization: 'none', tier: 0, effects: { type: 'status', statusEffect: 'root', statusDuration: 1 }, cooldown: 3, levelRequired: 3, requiresChoice: true, choiceGroup: 'ranger_tier0_level3' },
  { id: 'ran-t0-3c', name: 'Tracker\'s Eye', description: 'Study your prey, cataloguing every weakness in their stance.', class: 'ranger', specialization: 'none', tier: 0, effects: { type: 'debuff', acReduction: -2, duration: 3 }, cooldown: 3, levelRequired: 3, requiresChoice: true, choiceGroup: 'ranger_tier0_level3' },

  // Level 5 — "Building Up"
  { id: 'ran-t0-5a', name: 'Twin Arrows', description: 'Nock two arrows and loose them in quick succession.', class: 'ranger', specialization: 'none', tier: 0, effects: { type: 'damage', bonusDamage: 2, diceCount: 1, diceSides: 4 }, cooldown: 2, levelRequired: 5, requiresChoice: true, choiceGroup: 'ranger_tier0_level5' },
  { id: 'ran-t0-5b', name: 'Bark Skin', description: 'Invoke the forest\'s protection, toughening your skin like ancient bark.', class: 'ranger', specialization: 'none', tier: 0, effects: { type: 'buff', acBonus: 3, duration: 3 }, cooldown: 4, levelRequired: 5, requiresChoice: true, choiceGroup: 'ranger_tier0_level5' },
  { id: 'ran-t0-5c', name: 'Trip Wire', description: 'Deploy a hidden wire that tangles the enemy\'s legs.', class: 'ranger', specialization: 'none', tier: 0, effects: { type: 'damage_status', damage: 2, statusEffect: 'slowed', statusDuration: 2 }, cooldown: 3, levelRequired: 5, requiresChoice: true, choiceGroup: 'ranger_tier0_level5' },

  // Level 8 — "Coming Online"
  { id: 'ran-t0-8a', name: 'Drilling Shot', description: 'Put everything into a single shot that punches clean through armor.', class: 'ranger', specialization: 'none', tier: 0, effects: { type: 'damage', bonusDamage: 5, ignoreArmor: true }, cooldown: 3, levelRequired: 8, requiresChoice: true, choiceGroup: 'ranger_tier0_level8' },
  { id: 'ran-t0-8b', name: 'Camouflage', description: 'Blend with the terrain, becoming a ghost on the battlefield.', class: 'ranger', specialization: 'none', tier: 0, effects: { type: 'buff', acBonus: 4, duration: 3 }, cooldown: 4, levelRequired: 8, requiresChoice: true, choiceGroup: 'ranger_tier0_level8' },
  { id: 'ran-t0-8c', name: 'Venomous Arrow', description: 'Tip your arrow in a potent venom that eats away at the target.', class: 'ranger', specialization: 'none', tier: 0, effects: { type: 'damage_status', damage: 3, statusEffect: 'poisoned', statusDuration: 3 }, cooldown: 3, levelRequired: 8, requiresChoice: true, choiceGroup: 'ranger_tier0_level8' },
];
