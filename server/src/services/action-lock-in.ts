import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { DailyActionType, DailyActionStatus, CombatStance, Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const combatParamsSchema = z.object({
  combatStance: z.nativeEnum(CombatStance).optional(),
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

function getTickDate(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function getCharacterWithLocation(characterId: string) {
  return prisma.character.findUnique({
    where: { id: characterId },
    select: {
      id: true,
      hungerState: true,
      currentTownId: true,
      currentNodeId: true,
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
  const result = await prisma.dailyAction.upsert({
    where: {
      characterId_tickDate: { characterId, tickDate },
    },
    create: {
      characterId,
      tickDate,
      actionType,
      actionTarget: actionTarget as Prisma.InputJsonValue,
      combatParams: combatParams ? (combatParams as unknown as Prisma.InputJsonValue) : undefined,
      status: 'LOCKED_IN',
    },
    update: {
      actionType,
      actionTarget: actionTarget as Prisma.InputJsonValue,
      combatParams: combatParams ? (combatParams as unknown as Prisma.InputJsonValue) : undefined,
      status: 'LOCKED_IN',
    },
  });

  return {
    id: result.id,
    actionType: result.actionType,
    actionTarget: result.actionTarget,
    status: result.status,
  };
}

// ---------------------------------------------------------------------------
// getLockedAction
// ---------------------------------------------------------------------------

export async function getLockedAction(characterId: string) {
  const tickDate = getTickDate();
  return prisma.dailyAction.findUnique({
    where: {
      characterId_tickDate: { characterId, tickDate },
    },
  });
}

// ---------------------------------------------------------------------------
// cancelAction
// ---------------------------------------------------------------------------

export async function cancelAction(characterId: string): Promise<void> {
  const tickDate = getTickDate();
  const existing = await prisma.dailyAction.findUnique({
    where: {
      characterId_tickDate: { characterId, tickDate },
    },
  });

  if (!existing) return; // nothing to cancel, default is REST

  // Replace with REST
  await prisma.dailyAction.update({
    where: { id: existing.id },
    data: {
      actionType: 'REST',
      actionTarget: {},
      combatParams: undefined,
      status: 'LOCKED_IN',
    },
  });
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
  const onNode = !!character.currentNodeId;

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
