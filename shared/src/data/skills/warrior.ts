import { AbilityDefinition } from './types';

export const warriorAbilities: AbilityDefinition[] = [
  // ---- Berserker (rage/damage) ----
  { id: 'war-ber-1', name: 'Reckless Strike', description: 'A powerful overhead blow that deals extra damage but leaves you exposed.', class: 'warrior', specialization: 'berserker', tier: 1, effects: { type: 'damage', bonusDamage: 5, selfDefenseDebuff: -2 }, cooldown: 0, levelRequired: 10 },
  { id: 'war-ber-2', name: 'Blood Rage', description: 'Enter a fury state, gaining attack power as your health drops.', class: 'warrior', specialization: 'berserker', tier: 2, effects: { type: 'buff', attackScaling: 'missingHpPercent', duration: 5 }, cooldown: 8, prerequisiteAbilityId: 'war-ber-1', levelRequired: 14 },
  { id: 'war-ber-3', name: 'Cleave', description: 'Swing in a wide arc, hitting all adjacent enemies.', class: 'warrior', specialization: 'berserker', tier: 2, effects: { type: 'aoe_damage', targets: 'all_adjacent', damageMultiplier: 0.8 }, cooldown: 3, prerequisiteAbilityId: 'war-ber-1', levelRequired: 20 },
  { id: 'war-ber-4', name: 'Frenzy', description: 'Attack twice in rapid succession with reduced accuracy.', class: 'warrior', specialization: 'berserker', tier: 3, effects: { type: 'multi_attack', strikes: 2, accuracyPenalty: -3 }, cooldown: 4, prerequisiteAbilityId: 'war-ber-2', levelRequired: 25 },
  { id: 'war-ber-5', name: 'Berserker Rage', description: 'Become immune to crowd control and gain massive attack power for a short time.', class: 'warrior', specialization: 'berserker', tier: 4, effects: { type: 'buff', ccImmune: true, attackBonus: 15, duration: 3 }, cooldown: 12, prerequisiteAbilityId: 'war-ber-4', levelRequired: 32 },
  { id: 'war-ber-6', name: 'Undying Fury', description: 'When struck fatally, survive with 1 HP once per combat. Passive.', class: 'warrior', specialization: 'berserker', tier: 5, effects: { type: 'passive', cheatingDeath: true, usesPerCombat: 1 }, cooldown: 0, prerequisiteAbilityId: 'war-ber-5', levelRequired: 40 },

  // ---- Guardian (tank/shield) ----
  { id: 'war-gua-1', name: 'Shield Bash', description: 'Strike with your shield, dealing damage and briefly stunning the target.', class: 'warrior', specialization: 'guardian', tier: 1, effects: { type: 'damage_status', damage: 3, statusEffect: 'stun', statusDuration: 1 }, cooldown: 3, levelRequired: 10 },
  { id: 'war-gua-2', name: 'Fortify', description: 'Increase your armor class significantly for several rounds.', class: 'warrior', specialization: 'guardian', tier: 2, effects: { type: 'buff', acBonus: 5, duration: 4 }, cooldown: 6, prerequisiteAbilityId: 'war-gua-1', levelRequired: 14 },
  { id: 'war-gua-3', name: 'Taunt', description: 'Force an enemy to attack you for the next round.', class: 'warrior', specialization: 'guardian', tier: 2, effects: { type: 'status', statusEffect: 'taunt', statusDuration: 2 }, cooldown: 4, prerequisiteAbilityId: 'war-gua-1', levelRequired: 20 },
  { id: 'war-gua-4', name: 'Shield Wall', description: 'Reduce all incoming damage by half for two rounds.', class: 'warrior', specialization: 'guardian', tier: 3, effects: { type: 'buff', damageReduction: 0.5, duration: 2 }, cooldown: 8, prerequisiteAbilityId: 'war-gua-2', levelRequired: 25 },
  { id: 'war-gua-5', name: 'Iron Bulwark', description: 'Become immovable, reflecting a portion of melee damage back to attackers.', class: 'warrior', specialization: 'guardian', tier: 4, effects: { type: 'buff', damageReflect: 0.3, immovable: true, duration: 3 }, cooldown: 10, prerequisiteAbilityId: 'war-gua-4', levelRequired: 32 },
  { id: 'war-gua-6', name: 'Unbreakable', description: 'Passively gain bonus HP equal to 20% of your constitution. Passive.', class: 'warrior', specialization: 'guardian', tier: 5, effects: { type: 'passive', bonusHpFromCon: 0.2 }, cooldown: 0, prerequisiteAbilityId: 'war-gua-5', levelRequired: 40 },

  // ---- Warlord (buffs/leadership) ----
  { id: 'war-war-1', name: 'Rally Cry', description: 'Boost your own attack and defense for several rounds.', class: 'warrior', specialization: 'warlord', tier: 1, effects: { type: 'buff', attackBonus: 3, acBonus: 2, duration: 4 }, cooldown: 5, levelRequired: 10 },
  { id: 'war-war-2', name: 'Commanding Strike', description: 'A precise attack that deals bonus damage.', class: 'warrior', specialization: 'warlord', tier: 2, effects: { type: 'damage', bonusDamage: 3 }, cooldown: 3, prerequisiteAbilityId: 'war-war-1', levelRequired: 14 },
  { id: 'war-war-3', name: 'Tactical Advance', description: 'Gain an extra action this turn. Limited use.', class: 'warrior', specialization: 'warlord', tier: 3, effects: { type: 'buff', extraAction: true }, cooldown: 8, prerequisiteAbilityId: 'war-war-2', levelRequired: 20 },
  { id: 'war-war-4', name: 'Inspiring Presence', description: 'Passively regenerate a small amount of HP each round. Passive.', class: 'warrior', specialization: 'warlord', tier: 3, effects: { type: 'passive', hpRegenPerRound: 3 }, cooldown: 0, prerequisiteAbilityId: 'war-war-1', levelRequired: 25 },
  { id: 'war-war-5', name: 'Warlords Decree', description: 'Your next three attacks cannot miss.', class: 'warrior', specialization: 'warlord', tier: 4, effects: { type: 'buff', guaranteedHits: 3, duration: 3 }, cooldown: 10, prerequisiteAbilityId: 'war-war-3', levelRequired: 32 },
  { id: 'war-war-6', name: 'Legendary Commander', description: 'Once per combat, fully restore your HP.', class: 'warrior', specialization: 'warlord', tier: 5, effects: { type: 'heal', fullRestore: true, usesPerCombat: 1 }, cooldown: 0, prerequisiteAbilityId: 'war-war-5', levelRequired: 40 },
];

// ---- Tier 0 (Pre-Specialization) ----
export const warriorTier0Abilities: AbilityDefinition[] = [
  // Level 3 — "First Taste"
  { id: 'war-t0-3a', name: 'Power Strike', description: 'A heavy overhead swing that connects with brutal force.', class: 'warrior', specialization: 'none', tier: 0, effects: { type: 'damage', bonusDamage: 3 }, cooldown: 2, levelRequired: 3, requiresChoice: true, choiceGroup: 'warrior_tier0_level3' },
  { id: 'war-t0-3b', name: 'Defensive Stance', description: 'Plant your feet and brace for impact, hardening your guard.', class: 'warrior', specialization: 'none', tier: 0, effects: { type: 'buff', acBonus: 3, duration: 2 }, cooldown: 3, levelRequired: 3, requiresChoice: true, choiceGroup: 'warrior_tier0_level3' },
  { id: 'war-t0-3c', name: 'Intimidating Shout', description: 'Bellow a challenge that shakes your opponent\'s confidence.', class: 'warrior', specialization: 'none', tier: 0, effects: { type: 'debuff', attackReduction: -2, duration: 2 }, cooldown: 3, levelRequired: 3, requiresChoice: true, choiceGroup: 'warrior_tier0_level3' },

  // Level 5 — "Building Up"
  { id: 'war-t0-5a', name: 'Sundering Strike', description: 'A targeted blow to armor joints, cracking their defense.', class: 'warrior', specialization: 'none', tier: 0, effects: { type: 'damage_debuff', bonusDamage: 2, acReduction: -2, duration: 2 }, cooldown: 3, levelRequired: 5, requiresChoice: true, choiceGroup: 'warrior_tier0_level5' },
  { id: 'war-t0-5b', name: 'Second Wind', description: 'Catch your breath mid-fight, willing yourself through the pain.', class: 'warrior', specialization: 'none', tier: 0, effects: { type: 'heal', healAmount: 8 }, cooldown: 4, levelRequired: 5, requiresChoice: true, choiceGroup: 'warrior_tier0_level5' },
  { id: 'war-t0-5c', name: 'Hamstring', description: 'Cut low, crippling your foe\'s movement.', class: 'warrior', specialization: 'none', tier: 0, effects: { type: 'damage_status', bonusDamage: 1, statusEffect: 'slowed', statusDuration: 2 }, cooldown: 3, levelRequired: 5, requiresChoice: true, choiceGroup: 'warrior_tier0_level5' },

  // Level 8 — "Coming Online"
  { id: 'war-t0-8a', name: 'Brutal Charge', description: 'Lower your shoulder and crash into the enemy with devastating momentum.', class: 'warrior', specialization: 'none', tier: 0, effects: { type: 'damage', bonusDamage: 5, accuracyBonus: 2 }, cooldown: 3, levelRequired: 8, requiresChoice: true, choiceGroup: 'warrior_tier0_level8' },
  { id: 'war-t0-8b', name: 'Iron Skin', description: 'Steel your body against punishment, shrugging off blows that would fell lesser fighters.', class: 'warrior', specialization: 'none', tier: 0, effects: { type: 'buff', absorbDamage: 12, duration: 3 }, cooldown: 4, levelRequired: 8, requiresChoice: true, choiceGroup: 'warrior_tier0_level8' },
  { id: 'war-t0-8c', name: 'War Cry', description: 'Let loose a thunderous battle cry that sharpens your focus and hardens your resolve.', class: 'warrior', specialization: 'none', tier: 0, effects: { type: 'buff', attackBonus: 3, acBonus: 1, duration: 3 }, cooldown: 4, levelRequired: 8, requiresChoice: true, choiceGroup: 'warrior_tier0_level8' },
];
