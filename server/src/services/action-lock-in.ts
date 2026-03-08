import { db } from '../lib/db';
import { eq, and } from 'drizzle-orm';
import { characters, dailyActions } from '@database/tables';
import { z } from 'zod';
import { COMBAT_STANCES } from '@shared/enums';
import type { DailyActionType, DailyActionStatus } from '@shared/enums';
import { getTodayTickDate } from '../lib/game-day';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const combatParamsSchema = z.object({
  combatStance: z.enum(COMBAT_STANCES).optional(),
  retreatHpThreshold: z.number().min(0).max(1).optional(),
  retreatOppositionRatio: z.number().min(0).optional(),
  retreatRoundLimit: z.number().int().min(1).optional(),
  neverRetreat: z.boolean().optional(),
  abilityPriorityQueue: z.array(z.string()).optional(),
  itemUsageRules: z.record(z.string(), z.unknown()).optional(),
  pvpLootBehavior: z.string().optional(),
});

export type CombatParams = z.infer<typeof combatParamsSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Use game-day-aware tick date so lock-in actions align with processDailyTick resolution. */
function getTickDate(): Date {
  return getTodayTickDate();
}

async function getCharacterWithLocation(characterId: string) {
  return db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: {
      id: true,
      hungerState: true,
      currentTownId: true,
      travelStatus: true,
      level: true,
    },
  });
}

// ---------------------------------------------------------------------------
// lockInAction
// ---------------------------------------------------------------------------

export async function lockInAction(
  characterId: string,
  actionType: DailyActionType,
  actionTarget: Record<string, unknown>,
  combatParams?: CombatParams,
): Promise<{ id: string; actionType: DailyActionType; actionTarget: unknown; status: DailyActionStatus }> {
  const character = await getCharacterWithLocation(characterId);
  if (!character) throw new Error('Character not found');

  if (character.hungerState === 'INCAPACITATED') {
    throw new Error('Cannot lock in action while INCAPACITATED from hunger. Feed your character first.');
  }

  const tickDate = getTickDate();

  // Upsert: create or replace today's action
  const [result] = await db.insert(dailyActions).values({
    id: crypto.randomUUID(),
    characterId,
    tickDate: tickDate.toISOString(),
    actionType,
    actionTarget: actionTarget,
    combatParams: combatParams ? (combatParams as unknown as Record<string, unknown>) : undefined,
    status: 'LOCKED_IN',
  }).onConflictDoUpdate({
    target: [dailyActions.characterId, dailyActions.tickDate],
    set: {
      actionType,
      actionTarget: actionTarget,
      combatParams: combatParams ? (combatParams as unknown as Record<string, unknown>) : undefined,
      status: 'LOCKED_IN',
    },
  }).returning();

  return {
    id: result.id,
    actionType: result.actionType as DailyActionType,
    actionTarget: result.actionTarget,
    status: result.status as DailyActionStatus,
  };
}

// ---------------------------------------------------------------------------
// getLockedAction
// ---------------------------------------------------------------------------

export async function getLockedAction(characterId: string) {
  const tickDate = getTickDate();
  return db.query.dailyActions.findFirst({
    where: and(
      eq(dailyActions.characterId, characterId),
      eq(dailyActions.tickDate, tickDate.toISOString()),
    ),
  });
}

// ---------------------------------------------------------------------------
// cancelAction
// ---------------------------------------------------------------------------

export async function cancelAction(characterId: string): Promise<void> {
  const tickDate = getTickDate();
  const existing = await db.query.dailyActions.findFirst({
    where: and(
      eq(dailyActions.characterId, characterId),
      eq(dailyActions.tickDate, tickDate.toISOString()),
    ),
  });

  if (!existing) return; // nothing to cancel, default is REST

  // Replace with REST
  await db.update(dailyActions)
    .set({
      actionType: 'REST',
      actionTarget: {},
      combatParams: null,
      status: 'LOCKED_IN',
    })
    .where(eq(dailyActions.id, existing.id));
}

// ---------------------------------------------------------------------------
// getAvailableActions
// ---------------------------------------------------------------------------

export async function getAvailableActions(characterId: string): Promise<{
  actions: Array<{ type: DailyActionType; available: boolean; reason?: string }>;
}> {
  const character = await getCharacterWithLocation(characterId);
  if (!character) throw new Error('Character not found');

  const inTown = !!character.currentTownId;
  const onNode = character.travelStatus !== 'idle';

  const actions: Array<{ type: DailyActionType; available: boolean; reason?: string }> = [
    { type: 'REST', available: true },
    {
      type: 'GATHER',
      available: inTown,
      reason: inTown ? undefined : 'Must be in a town to gather',
    },
    {
      type: 'CRAFT',
      available: inTown,
      reason: inTown ? undefined : 'Must be in a town to craft',
    },
    {
      type: 'TRAVEL',
      available: true, // validated further when locking in with specific target
    },
    {
      type: 'GUARD',
      available: onNode || inTown,
      reason: (onNode || inTown) ? undefined : 'Must be on a node or in a town to guard',
    },
    {
      type: 'AMBUSH',
      available: onNode,
      reason: onNode ? undefined : 'Must be on a travel node to ambush',
    },
    {
      type: 'ENLIST',
      available: inTown,
      reason: inTown ? undefined : 'Must be in a town to enlist',
    },
    {
      type: 'PROPOSE_LAW',
      available: inTown, // further validated: must be ruler/mayor
      reason: inTown ? undefined : 'Must be in a town to propose laws',
    },
  ];

  // If incapacitated, only REST is available
  if (character.hungerState === 'INCAPACITATED') {
    return {
      actions: actions.map(a => ({
        ...a,
        available: a.type === 'REST',
        reason: a.type === 'REST' ? undefined : 'INCAPACITATED from hunger',
      })),
    };
  }

  return { actions };
}

// ---------------------------------------------------------------------------
// validateCombatParams
// ---------------------------------------------------------------------------

export function validateCombatParams(params: unknown): CombatParams {
  return combatParamsSchema.parse(params);
}
