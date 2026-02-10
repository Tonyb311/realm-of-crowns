import { prisma } from '../lib/prisma';
import { Race } from '@prisma/client';

// =========================================================================
// Changeling Shapeshifting Service
// =========================================================================

export interface ChangelingAppearance {
  trueRace: Race;
  displayedRace: Race;
  displayedName: string | null;
  isDisguised: boolean;
  since: string | null;
}

export interface DetectionResult {
  detected: boolean;
  margin: number;
}

/**
 * Shift a Changeling's visible appearance to a target race and optional name.
 */
export async function shiftAppearance(
  characterId: string,
  targetRace: Race,
  targetName?: string,
) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, race: true, level: true },
  });

  if (!character) throw new Error('Character not found');
  if (character.race !== 'CHANGELING') throw new Error('Only Changelings can shapeshift');

  const now = new Date();

  await prisma.changelingDisguise.upsert({
    where: { characterId },
    update: {
      disguisedAs: targetName ?? null,
      disguiseRace: targetRace,
      startedAt: now,
    },
    create: {
      characterId,
      disguisedAs: targetName ?? null,
      disguiseRace: targetRace,
      startedAt: now,
    },
  });

  await prisma.character.update({
    where: { id: characterId },
    data: { currentAppearanceRace: targetRace },
  });

  return {
    shifted: true,
    displayedRace: targetRace,
    displayedName: targetName ?? null,
    startedAt: now.toISOString(),
  };
}

/**
 * Revert a Changeling to their true form.
 */
export async function revertToTrueForm(characterId: string) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, race: true, name: true },
  });

  if (!character) throw new Error('Character not found');
  if (character.race !== 'CHANGELING') throw new Error('Only Changelings can revert');

  await prisma.changelingDisguise.upsert({
    where: { characterId },
    update: {
      disguisedAs: null,
      disguiseRace: null,
      startedAt: new Date(),
    },
    create: {
      characterId,
      disguisedAs: null,
      disguiseRace: null,
      startedAt: new Date(),
    },
  });

  await prisma.character.update({
    where: { id: characterId },
    data: { currentAppearanceRace: 'CHANGELING' },
  });

  return { reverted: true, trueRace: 'CHANGELING' as Race, name: character.name };
}

/**
 * Level 10+: Perfect Mimicry — treated as displayed race for tariffs/penalties/NPC interactions.
 */
export async function canFoolDetection(characterId: string): Promise<boolean> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true, level: true },
  });

  if (!character || character.race !== 'CHANGELING') return false;
  return character.level >= 10;
}

/**
 * Level 15+: Identity Theft — copy a specific player's appearance.
 */
export async function canCopyPlayer(
  characterId: string,
  targetPlayerId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const [character, target] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId },
      select: { race: true, level: true },
    }),
    prisma.character.findUnique({
      where: { id: targetPlayerId },
      select: { id: true, name: true, race: true, currentAppearanceRace: true },
    }),
  ]);

  if (!character || character.race !== 'CHANGELING') {
    return { allowed: false, reason: 'Only Changelings can copy players' };
  }
  if (character.level < 15) {
    return { allowed: false, reason: 'Requires level 15 (Identity Theft ability)' };
  }
  if (!target) {
    return { allowed: false, reason: 'Target player not found' };
  }

  return { allowed: true };
}

/**
 * Level 25+: access to the Veil spy intelligence marketplace.
 */
export async function hasVeilNetworkAccess(characterId: string): Promise<boolean> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true, level: true },
  });

  if (!character || character.race !== 'CHANGELING') return false;
  return character.level >= 25;
}

/**
 * Get the current appearance of a Changeling: true race + displayed race.
 */
export async function getCurrentAppearance(characterId: string): Promise<ChangelingAppearance> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { race: true, currentAppearanceRace: true },
  });

  if (!character) throw new Error('Character not found');

  const disguise = await prisma.changelingDisguise.findUnique({
    where: { characterId },
  });

  const isDisguised = disguise?.disguiseRace != null;

  return {
    trueRace: character.race,
    displayedRace: character.currentAppearanceRace ?? character.race,
    displayedName: disguise?.disguisedAs ?? null,
    isDisguised,
    since: disguise?.startedAt?.toISOString() ?? null,
  };
}

/**
 * NPC/player detection check. Higher observer wisdom vs higher changeling level = harder to detect.
 * DC = 10 + changeling level / 2. Observer roll = wisdom modifier + d20 equivalent (1-20 random).
 */
export function detectChangeling(
  observerWisdom: number,
  changelingLevel: number,
): DetectionResult {
  const dc = 10 + Math.floor(changelingLevel / 2);
  const wisdomModifier = Math.floor((observerWisdom - 10) / 2);
  const roll = Math.floor(Math.random() * 20) + 1;
  const total = roll + wisdomModifier;
  const detected = total >= dc;

  return {
    detected,
    margin: total - dc,
  };
}
