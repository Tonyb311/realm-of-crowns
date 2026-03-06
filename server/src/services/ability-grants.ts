import { prisma } from '../lib/prisma';
import { ABILITIES_BY_CLASS } from '@shared/data/skills';
import { CLASS_MILESTONE_SAVE_ORDER, SAVE_PROFICIENCY_MILESTONES } from '@shared/data/combat-constants';
import { FEAT_UNLOCK_LEVELS } from '@shared/data/feats';

/**
 * Auto-grant all specialization abilities the character qualifies for
 * based on their level and specialization.
 *
 * This is idempotent — running it multiple times won't create duplicates.
 * Called on: level-up, specialization selection.
 */
export async function autoGrantAbilities(characterId: string): Promise<string[]> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
  });

  if (!character || !character.class || !character.specialization) return [];

  const classAbilities = ABILITIES_BY_CLASS[character.class];
  if (!classAbilities) return [];

  // Get abilities for this spec where levelRequired <= character level
  // Skip tier 0 abilities (requiresChoice) — those need explicit player choice
  const qualifyingAbilities = classAbilities.filter(
    (a) =>
      a.specialization === character.specialization &&
      a.levelRequired <= character.level &&
      !a.requiresChoice,
  );

  if (qualifyingAbilities.length === 0) return [];

  // Get already-unlocked ability IDs
  const existing = await prisma.characterAbility.findMany({
    where: { characterId },
    select: { abilityId: true },
  });
  const existingSet = new Set(existing.map((e) => e.abilityId));

  // Filter to only abilities not yet granted
  const toGrant = qualifyingAbilities.filter((a) => !existingSet.has(a.id));
  if (toGrant.length === 0) return [];

  const grantedIds: string[] = [];

  for (const abilityDef of toGrant) {
    // Ensure the Ability row exists in DB (for the junction table)
    let dbAbility = await prisma.ability.findFirst({
      where: { name: abilityDef.name },
    });

    if (!dbAbility) {
      dbAbility = await prisma.ability.create({
        data: {
          id: abilityDef.id,
          name: abilityDef.name,
          description: abilityDef.description,
          class: abilityDef.class,
          specialization: abilityDef.specialization,
          tier: abilityDef.tier,
          effects: abilityDef.effects as any,
          cooldown: abilityDef.cooldown,
          prerequisiteAbilityId: abilityDef.prerequisiteAbilityId ?? null,
          levelRequired: abilityDef.levelRequired,
        },
      });
    }

    // Create the CharacterAbility junction row
    await prisma.characterAbility.create({
      data: {
        characterId,
        abilityId: dbAbility.id,
      },
    });

    grantedIds.push(abilityDef.id);
  }

  return grantedIds;
}

/**
 * Auto-grant milestone save proficiencies at levels 18, 30, 45.
 * Uses deterministic order from CLASS_MILESTONE_SAVE_ORDER.
 * Idempotent — safe to call on every level-up.
 */
export async function autoGrantSaveProficiencies(characterId: string): Promise<string[]> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { level: true, class: true, bonusSaveProficiencies: true },
  });

  if (!character || !character.class) return [];

  const classKey = character.class.toLowerCase();
  const milestoneOrder = CLASS_MILESTONE_SAVE_ORDER[classKey];
  if (!milestoneOrder) return [];

  // Determine how many milestone saves the character should have
  const milestonesReached = SAVE_PROFICIENCY_MILESTONES.filter(m => character.level >= m).length;
  const currentBonus = (character.bonusSaveProficiencies as string[]) ?? [];

  if (currentBonus.length >= milestonesReached) return []; // already up to date

  // Grant saves up to the number of milestones reached
  const targetSaves = milestoneOrder.slice(0, milestonesReached);
  const newSaves = targetSaves.filter(s => !currentBonus.includes(s));

  if (newSaves.length === 0) return [];

  const updatedBonus = [...currentBonus, ...newSaves];
  await prisma.character.update({
    where: { id: characterId },
    data: { bonusSaveProficiencies: updatedBonus },
  });

  return newSaves;
}

/**
 * Check if a character should have a pending feat choice.
 * Sets pendingFeatChoice = true when reaching level 38 or 48
 * and they haven't already chosen the feat for that milestone.
 * Idempotent — safe to call on every level-up.
 */
export async function checkFeatMilestone(characterId: string): Promise<boolean> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { level: true, feats: true, pendingFeatChoice: true },
  });

  if (!character) return false;

  const currentFeats = (character.feats as string[]) ?? [];
  const milestonesReached = FEAT_UNLOCK_LEVELS.filter(m => character.level >= m).length;

  // If they have fewer feats than milestones reached and no pending choice, flag one
  if (currentFeats.length < milestonesReached && !character.pendingFeatChoice) {
    await prisma.character.update({
      where: { id: characterId },
      data: { pendingFeatChoice: true },
    });
    return true;
  }

  return false;
}
