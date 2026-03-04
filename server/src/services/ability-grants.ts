import { prisma } from '../lib/prisma';
import { ABILITIES_BY_CLASS } from '@shared/data/skills';

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
