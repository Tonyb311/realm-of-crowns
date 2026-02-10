/**
 * D&D-style dice rolling utilities for Realm of Crowns
 */

/** Roll a single die with N sides */
export function roll(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/** Roll multiple dice: e.g., rollMultiple(2, 6) = 2d6 */
export function rollMultiple(count: number, sides: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += roll(sides);
  }
  return total;
}

/** Roll with modifier: e.g., d20 + 5 */
export function rollWithModifier(sides: number, modifier: number): number {
  return roll(sides) + modifier;
}

/** Roll with advantage (roll 2, take higher) */
export function advantage(sides: number = 20): number {
  return Math.max(roll(sides), roll(sides));
}

/** Roll with disadvantage (roll 2, take lower) */
export function disadvantage(sides: number = 20): number {
  return Math.min(roll(sides), roll(sides));
}

/** Roll a standard D&D ability score: 4d6, drop lowest */
export function rollAbilityScore(): number {
  const rolls = [roll(6), roll(6), roll(6), roll(6)];
  rolls.sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}

/** Quality roll for crafting: d20 + proficiencyBonus + statModifier + toolBonus + workshopBonus + racialBonus + professionTierBonus + ingredientQualityBonus */
export function qualityRoll(
  proficiencyBonus: number,
  statModifier: number = 0,
  toolBonus: number = 0,
  workshopBonus: number = 0,
  racialBonus: number = 0,
  professionTierBonus: number = 0,
  ingredientQualityBonus: number = 0,
): { roll: number; total: number; quality: string } {
  const d20 = roll(20);
  const total = d20 + proficiencyBonus + statModifier + toolBonus + workshopBonus + racialBonus + professionTierBonus + ingredientQualityBonus;

  let quality: string;
  if (total >= 56) quality = 'Legendary';
  else if (total >= 46) quality = 'Masterwork';
  else if (total >= 36) quality = 'Superior';
  else if (total >= 26) quality = 'Fine';
  else if (total >= 16) quality = 'Common';
  else quality = 'Poor';

  return { roll: d20, total, quality };
}

/** Initiative roll: d20 + DEX modifier */
export function initiativeRoll(dexModifier: number): number {
  return rollWithModifier(20, dexModifier);
}

/** Attack roll: d20 + attack modifier vs AC */
export function attackRoll(
  attackModifier: number,
  targetAC: number
): { roll: number; total: number; hit: boolean; critical: boolean } {
  const d20 = roll(20);
  const total = d20 + attackModifier;
  return {
    roll: d20,
    total,
    hit: d20 === 20 || (d20 !== 1 && total >= targetAC),
    critical: d20 === 20,
  };
}

// ---- Combat Dice Utilities ----

/** Damage roll: NdS + modifier (e.g., 2d6+3). Returns individual rolls and total. */
export function damageRoll(
  diceCount: number,
  diceSides: number,
  modifier: number = 0
): { rolls: number[]; total: number } {
  const rolls: number[] = [];
  for (let i = 0; i < diceCount; i++) {
    rolls.push(roll(diceSides));
  }
  const total = Math.max(0, rolls.reduce((sum, r) => sum + r, 0) + modifier);
  return { rolls, total };
}

/** Critical damage: double the dice count, then add modifier once. */
export function criticalDamageRoll(
  diceCount: number,
  diceSides: number,
  modifier: number = 0
): { rolls: number[]; total: number } {
  return damageRoll(diceCount * 2, diceSides, modifier);
}

/** Saving throw: d20 + modifier vs DC. Returns roll details and pass/fail. */
export function savingThrow(
  modifier: number,
  dc: number
): { roll: number; total: number; success: boolean } {
  const d20 = roll(20);
  const total = d20 + modifier;
  return {
    roll: d20,
    total,
    // Natural 20 always succeeds, natural 1 always fails
    success: d20 === 20 || (d20 !== 1 && total >= dc),
  };
}

/** Flee check: d20 + DEX modifier vs DC (default 10). */
export function fleeCheck(
  dexModifier: number,
  dc: number = 10
): { roll: number; total: number; success: boolean } {
  return savingThrow(dexModifier, dc);
}
