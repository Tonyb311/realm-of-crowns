import { db } from '../lib/db';
import { eq } from 'drizzle-orm';
import { characters, changelingDisguises } from '@database/tables';
import type { Race } from '@shared/enums';

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
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { id: true, race: true, level: true },
  });

  if (!character) throw new Error('Character not found');
  if (character.race !== 'CHANGELING') throw new Error('Only Changelings can shapeshift');

  const now = new Date();

  await db.insert(changelingDisguises).values({
    id: crypto.randomUUID(),
    characterId,
    disguisedAs: targetName ?? null,
    disguiseRace: targetRace,
    startedAt: now.toISOString(),
  }).onConflictDoUpdate({
    target: [changelingDisguises.characterId],
    set: {
      disguisedAs: targetName ?? null,
      disguiseRace: targetRace,
      startedAt: now.toISOString(),
    },
  });

  await db.update(characters).set({ currentAppearanceRace: targetRace }).where(eq(characters.id, characterId));

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
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { id: true, race: true, name: true },
  });

  if (!character) throw new Error('Character not found');
  if (character.race !== 'CHANGELING') throw new Error('Only Changelings can revert');

  const now = new Date();

  await db.insert(changelingDisguises).values({
    id: crypto.randomUUID(),
    characterId,
    disguisedAs: null,
    disguiseRace: null,
    startedAt: now.toISOString(),
  }).onConflictDoUpdate({
    target: [changelingDisguises.characterId],
    set: {
      disguisedAs: null,
      disguiseRace: null,
      startedAt: now.toISOString(),
    },
  });

  await db.update(characters).set({ currentAppearanceRace: 'CHANGELING' }).where(eq(characters.id, characterId));

  return { reverted: true, trueRace: 'CHANGELING' as Race, name: character.name };
}

/**
 * Level 10+: Perfect Mimicry — treated as displayed race for tariffs/penalties/NPC interactions.
 */
export async function canFoolDetection(characterId: string): Promise<boolean> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { race: true, level: true },
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
    db.query.characters.findFirst({
      where: eq(characters.id, characterId),
      columns: { race: true, level: true },
    }),
    db.query.characters.findFirst({
      where: eq(characters.id, targetPlayerId),
      columns: { id: true, name: true, race: true, currentAppearanceRace: true },
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
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { race: true, level: true },
  });

  if (!character || character.race !== 'CHANGELING') return false;
  return character.level >= 25;
}

/**
 * Get the current appearance of a Changeling: true race + displayed race.
 */
export async function getCurrentAppearance(characterId: string): Promise<ChangelingAppearance> {
  const character = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { race: true, currentAppearanceRace: true },
  });

  if (!character) throw new Error('Character not found');

  const disguise = await db.query.changelingDisguises.findFirst({
    where: eq(changelingDisguises.characterId, characterId),
  });

  const isDisguised = disguise?.disguiseRace != null;

  return {
    trueRace: character.race,
    displayedRace: character.currentAppearanceRace ?? character.race,
    displayedName: disguise?.disguisedAs ?? null,
    isDisguised,
    since: disguise?.startedAt ?? null,
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
