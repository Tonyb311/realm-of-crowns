import { Router, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../lib/db';
import { eq, and, gt, gte } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { characters, characterEquipment, combatSessions, combatLogs, combatParticipants, craftingActions, towns } from '@database/tables';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { characterGuard } from '../middleware/character-guard';
import { AuthenticatedRequest } from '../types/express';
import {
  createCombatState,
  createCharacterCombatant,
  resolveTurn,
} from '../lib/combat-engine';
import type {
  CombatAction,
  CombatState,
  WeaponInfo,
  ItemInfo,
  CharacterStats,
} from '@shared/types/combat';
import { getModifier } from '@shared/types/combat';
import { getProficiencyBonus } from '@shared/utils/bounded-accuracy';
import { computeFinalAC } from '@shared/utils/armor-conversion';
import { CLASS_SAVE_PROFICIENCIES, CLASS_ARMOR_TYPE, getAttacksPerAction } from '@shared/data/combat-constants';
import { hasFeatEffect, computeFeatBonus } from '@shared/data/feats';
import { emitCombatResult, emitChallengeDeclined } from '../socket/events';
import { checkLevelUp } from '../services/progression';
import { checkAchievements } from '../services/achievements';
import { calculateEquipmentTotals } from '../services/item-stats';
import { calculateWeightState } from '../services/weight-calculator';
import { redis } from '../lib/redis';
import { ACTION_XP } from '@shared/data/progression';
import { isSameAccount } from '../lib/alt-guard';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { logPvpCombat, COMBAT_LOGGING_ENABLED } from '../lib/combat-logger';
import { formatCombatLog } from '../lib/combat-narrator-formatter';
import { applyClassWeaponStat, applyConsumableBuffs } from '../lib/road-encounter';

const router = Router();

// ---- Constants ----

const MAX_LEVEL_DIFFERENCE = 5;
const CHALLENGE_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const WAGER_TAX_RATE = 0.05; // 5%
const XP_PER_OPPONENT_LEVEL = ACTION_XP.PVP_WIN_PER_OPPONENT_LEVEL;

// ---- Combat state store (Redis with in-memory fallback) ----
const localCombatStates = new Map<string, CombatState>();
const COMBAT_TTL = 3600;

async function getPvpCombatState(sessionId: string): Promise<CombatState | undefined> {
  if (redis) {
    try {
      const data = await redis.get(`combat:pvp:${sessionId}`);
      if (data) return JSON.parse(data) as CombatState;
    } catch { /* fall through */ }
  }
  return localCombatStates.get(sessionId);
}

async function setPvpCombatState(sessionId: string, state: CombatState): Promise<void> {
  if (redis) {
    try {
      await redis.setex(`combat:pvp:${sessionId}`, COMBAT_TTL, JSON.stringify(state));
      localCombatStates.delete(sessionId);
      return;
    } catch { /* fall through */ }
  }
  localCombatStates.set(sessionId, state);
}

async function deletePvpCombatState(sessionId: string): Promise<void> {
  if (redis) {
    try { await redis.del(`combat:pvp:${sessionId}`); } catch { /* ignore */ }
  }
  localCombatStates.delete(sessionId);
}

// ---- Zod Schemas ----

const challengeSchema = z.object({
  targetCharacterId: z.string().min(1, 'Target character ID is required'),
  wager: z.number().int().min(0).optional(),
});

const acceptDeclineSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

const actionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  action: z.object({
    type: z.enum(['attack', 'cast', 'defend', 'item', 'flee']),
    targetId: z.string().optional(),
    resourceId: z.string().optional(),
    spellSlotLevel: z.number().int().min(1).max(5).optional(),
  }),
  // P0 #3 FIX: weapon and spell removed from client input — looked up server-side from equipped items.
  item: z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['heal', 'damage', 'buff', 'cleanse']),
      diceCount: z.number().int().optional(),
      diceSides: z.number().int().optional(),
      flatAmount: z.number().int().optional(),
      statusEffect: z.string().optional(),
      statusDuration: z.number().int().optional(),
    })
    .optional(),
});

// ---- P0 #3: Server-side weapon lookup ----

const UNARMED_WEAPON: WeaponInfo = {
  id: 'unarmed',
  name: 'Unarmed Strike',
  diceCount: 1,
  diceSides: 4,
  damageModifierStat: 'str',
  attackModifierStat: 'str',
  bonusDamage: 0,
  bonusAttack: 0,
};

async function getEquippedWeapon(characterId: string): Promise<WeaponInfo> {
  const equip = await db.query.characterEquipment.findFirst({
    where: and(eq(characterEquipment.characterId, characterId), eq(characterEquipment.slot, 'MAIN_HAND')),
    with: { item: { with: { itemTemplate: true } } },
  });

  if (!equip || equip.item.itemTemplate.type !== 'WEAPON') {
    return UNARMED_WEAPON;
  }

  const stats = equip.item.itemTemplate.stats as Record<string, unknown>;
  return {
    id: equip.item.id,
    name: equip.item.itemTemplate.name,
    diceCount: (typeof stats.diceCount === 'number') ? stats.diceCount : 1,
    diceSides: (typeof stats.diceSides === 'number') ? stats.diceSides : 4,
    damageModifierStat: stats.damageModifierStat === 'dex' ? 'dex' : 'str',
    attackModifierStat: stats.attackModifierStat === 'dex' ? 'dex' : 'str',
    bonusDamage: (typeof stats.bonusDamage === 'number') ? stats.bonusDamage : 0,
    bonusAttack: (typeof stats.bonusAttack === 'number') ? stats.bonusAttack : 0,
  };
}

// ---- Full combatant builder (mirrors road-encounter pipeline) ----
// TODO: Extract to shared combatant-builder service when road-encounter pipeline gets ability support

interface CharacterRecord {
  id: string;
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  stats: unknown;
  race: string;
  subRace: unknown;
  class: string | null;
  specialization?: string | null;
  feats: unknown;
  bonusSaveProficiencies: unknown;
}

async function buildFullCombatant(
  characterId: string,
  char: CharacterRecord,
  team: number,
  useCurrentHp: boolean,
): Promise<import('@shared/types/combat').Combatant> {
  const stats = (char.stats as CharacterStats) ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

  // Equipment: weapon + armor + stat bonuses
  const rawWeapon = await getEquippedWeapon(characterId);
  const weapon = applyClassWeaponStat(rawWeapon, char.class);
  const equipTotals = await calculateEquipmentTotals(characterId);

  const effectiveStats: CharacterStats = {
    str: stats.str + (equipTotals.totalStatBonuses.strength ?? 0),
    dex: stats.dex + (equipTotals.totalStatBonuses.dexterity ?? 0),
    con: stats.con + (equipTotals.totalStatBonuses.constitution ?? 0),
    int: stats.int + (equipTotals.totalStatBonuses.intelligence ?? 0),
    wis: stats.wis + (equipTotals.totalStatBonuses.wisdom ?? 0),
    cha: stats.cha + (equipTotals.totalStatBonuses.charisma ?? 0),
  };

  const charArmorType = CLASS_ARMOR_TYPE[char.class?.toLowerCase() ?? ''] ?? 'none';
  const playerAC = computeFinalAC(equipTotals.totalAC, getModifier(effectiveStats.dex), charArmorType);

  const hp = useCurrentHp ? char.health : char.maxHealth;
  const combatant = createCharacterCombatant(
    characterId,
    char.name,
    team,
    effectiveStats,
    char.level,
    hp,
    char.maxHealth,
    playerAC,
    weapon,
    {},
    getProficiencyBonus(char.level),
  );

  // Race and class fields
  combatant.race = char.race.toLowerCase();
  combatant.subRace = (char.subRace as any) ?? null;
  combatant.characterClass = char.class?.toLowerCase() ?? null;
  combatant.specialization = (char.specialization as string | null) ?? null;

  // Save proficiencies
  const featIds = (char.feats as string[]) ?? [];
  combatant.saveProficiencies = [
    ...(CLASS_SAVE_PROFICIENCIES[char.class?.toLowerCase() ?? ''] ?? []),
    ...((char.bonusSaveProficiencies as string[]) ?? []),
    ...(hasFeatEffect(featIds, 'bonusSaveProficiency') ? ['con'] : []),
  ];

  // Extra attacks and feats
  combatant.extraAttacks = getAttacksPerAction(char.class ?? '', char.level);
  combatant.featIds = featIds;

  // Encumbrance penalties
  const weightState = await calculateWeightState(characterId);
  if (
    weightState.encumbrance.attackPenalty !== 0 ||
    weightState.encumbrance.acPenalty !== 0 ||
    weightState.encumbrance.saveDcPenalty !== 0 ||
    weightState.encumbrance.damageMultiplier !== 1
  ) {
    combatant.encumbrancePenalties = {
      attackPenalty: weightState.encumbrance.attackPenalty,
      acPenalty: weightState.encumbrance.acPenalty,
      saveDcPenalty: weightState.encumbrance.saveDcPenalty,
      damageMultiplier: weightState.encumbrance.damageMultiplier,
    };
  }

  // Consumable buffs (potions, food, scrolls)
  await applyConsumableBuffs(combatant, characterId);

  return combatant;
}

// ---- Helpers ----

async function isInActiveCombat(characterId: string): Promise<boolean> {
  // Fetch all participations, then filter by session status at app level
  const participations = await db.query.combatParticipants.findMany({
    where: eq(combatParticipants.characterId, characterId),
    with: { combatSession: true },
  });
  return participations.some((p: any) => p.session && ['ACTIVE', 'PENDING'].includes(p.session.status));
}

async function isTraveling(characterId: string): Promise<boolean> {
  const char = await db.query.characters.findFirst({
    where: eq(characters.id, characterId),
    columns: { travelStatus: true },
  });
  return char?.travelStatus !== 'idle';
}

async function isCrafting(characterId: string): Promise<boolean> {
  const crafting = await db.query.craftingActions.findFirst({
    where: and(eq(craftingActions.characterId, characterId), eq(craftingActions.status, 'IN_PROGRESS')),
  });
  return !!crafting;
}

async function getRecentChallenge(
  challengerId: string,
  targetId: string
): Promise<boolean> {
  const cutoff = new Date(Date.now() - CHALLENGE_COOLDOWN_MS);
  // Fetch recent DUEL sessions and check participants at app level
  const recentSessions = await db.query.combatSessions.findMany({
    where: and(eq(combatSessions.type, 'DUEL'), gte(combatSessions.startedAt, cutoff.toISOString())),
    with: { combatParticipants: true },
    orderBy: (s, { desc }) => [desc(s.startedAt)],
  });
  return recentSessions.some((s: any) => {
    const ids = (s.combatParticipants || []).map((p: any) => p.characterId);
    return ids.includes(challengerId) && ids.includes(targetId);
  });
}

// ---- POST /challenge ----

router.post(
  '/challenge',
  authGuard,
  validate(challengeSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { targetCharacterId, wager } = req.body;
      const challenger = req.character!;

      if (challenger.id === targetCharacterId) {
        return res.status(400).json({ error: 'Cannot challenge yourself' });
      }

      // Alt-account check
      if (await isSameAccount(challenger.id, targetCharacterId)) {
        return res.status(400).json({ error: 'Cannot challenge your own characters' });
      }

      const target = await db.query.characters.findFirst({
        where: eq(characters.id, targetCharacterId),
      });

      if (!target) {
        return res.status(404).json({ error: 'Target character not found' });
      }

      // Same town check
      if (!challenger.currentTownId || challenger.currentTownId !== target.currentTownId) {
        return res.status(400).json({ error: 'Both players must be in the same town' });
      }

      // Level difference check
      if (Math.abs(challenger.level - target.level) > MAX_LEVEL_DIFFERENCE) {
        return res.status(400).json({
          error: `Level difference cannot exceed ${MAX_LEVEL_DIFFERENCE}`,
        });
      }

      // Activity checks for challenger
      if (await isInActiveCombat(challenger.id)) {
        return res.status(400).json({ error: 'You are already in combat' });
      }
      if (await isTraveling(challenger.id)) {
        return res.status(400).json({ error: 'Cannot challenge while traveling' });
      }
      if (await isCrafting(challenger.id)) {
        return res.status(400).json({ error: 'Cannot challenge while crafting' });
      }

      // Activity checks for target
      if (await isInActiveCombat(target.id)) {
        return res.status(400).json({ error: 'Target is already in combat' });
      }
      if (await isTraveling(target.id)) {
        return res.status(400).json({ error: 'Target is currently traveling' });
      }
      if (await isCrafting(target.id)) {
        return res.status(400).json({ error: 'Target is currently crafting' });
      }

      // Cooldown check
      if (await getRecentChallenge(challenger.id, target.id)) {
        return res.status(400).json({
          error: 'Must wait 30 minutes before challenging this player again',
        });
      }

      // Wager validation
      const wagerAmount = wager ?? 0;
      if (wagerAmount > 0) {
        if (challenger.gold < wagerAmount) {
          return res.status(400).json({ error: 'You do not have enough gold for this wager' });
        }
        if (target.gold < wagerAmount) {
          return res.status(400).json({ error: 'Target does not have enough gold for this wager' });
        }
      }

      // Create pending combat session
      const [session] = await db.insert(combatSessions).values({
        id: crypto.randomUUID(),
        type: 'DUEL',
        status: 'PENDING',
        locationTownId: challenger.currentTownId,
        log: { challengerId: challenger.id, targetId: target.id, wager: wagerAmount },
      }).returning();

      // Create participant entries (both pending)
      await db.insert(combatParticipants).values([
        { id: crypto.randomUUID(), sessionId: session.id, characterId: challenger.id, team: 0, currentHp: challenger.health },
        { id: crypto.randomUUID(), sessionId: session.id, characterId: target.id, team: 1, currentHp: target.health },
      ]);

      return res.status(201).json({
        session: {
          id: session.id,
          type: session.type,
          status: session.status,
          challenger: { id: challenger.id, name: challenger.name, level: challenger.level },
          target: { id: target.id, name: target.name, level: target.level },
          wager: wagerAmount,
        },
      });
    } catch (error) {
      if (handleDbError(error, res, 'pvp-challenge', req)) return;
      logRouteError(req, 500, 'PvP challenge error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ---- POST /accept ----

router.post(
  '/accept',
  authGuard,
  validate(acceptDeclineSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.body;
      const character = req.character!;

      const session = await db.query.combatSessions.findFirst({
        where: eq(combatSessions.id, sessionId),
        with: {
          combatParticipants: {
            with: {
              character: true,
            },
          },
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Combat session not found' });
      }

      if (session.status !== 'PENDING') {
        return res.status(400).json({ error: 'Challenge is no longer pending' });
      }

      // Verify this player is the target (not the challenger)
      const sessionLog = session.log as { challengerId: string; targetId: string; wager: number };
      if (sessionLog.targetId !== character.id) {
        return res.status(403).json({ error: 'Only the challenged player can accept' });
      }

      // Re-check wager gold
      const wagerAmount = sessionLog.wager ?? 0;
      if (wagerAmount > 0) {
        const challengerChar = session.combatParticipants.find(
          (p: any) => p.characterId === sessionLog.challengerId
        )?.character;
        if (!challengerChar || challengerChar.gold < wagerAmount) {
          // Cancel the challenge if challenger can no longer afford it
          await db.update(combatSessions).set({ status: 'CANCELLED' }).where(eq(combatSessions.id, sessionId));
          return res.status(400).json({ error: 'Challenger no longer has enough gold for the wager' });
        }
        if (character.gold < wagerAmount) {
          return res.status(400).json({ error: 'You no longer have enough gold for the wager' });
        }
      }

      // Build combatants with full equipment pipeline (same as road encounters)
      const combatants = await Promise.all(
        session.combatParticipants.map((p: any) =>
          buildFullCombatant(p.characterId, p.character as CharacterRecord, p.team, true)
        )
      );

      // Create combat state and roll initiative
      const combatState = createCombatState(sessionId, 'DUEL', combatants);
      await setPvpCombatState(sessionId, combatState);

      // Update DB: set session active, write initiative to participants
      await db.transaction(async (tx) => {
        await tx.update(combatSessions).set({ status: 'ACTIVE', startedAt: new Date().toISOString() }).where(eq(combatSessions.id, sessionId));
        for (const c of combatState.combatants) {
          await tx.update(combatParticipants).set({ initiative: c.initiative, currentHp: c.currentHp })
            .where(and(eq(combatParticipants.sessionId, sessionId), eq(combatParticipants.characterId, c.id)));
        }
      });

      const currentTurnId = combatState.turnOrder[combatState.turnIndex];

      return res.json({
        session: {
          id: sessionId,
          status: 'ACTIVE',
          round: combatState.round,
          currentTurn: currentTurnId,
          turnOrder: combatState.turnOrder,
          combatants: combatState.combatants.map((c) => ({
            id: c.id,
            name: c.name,
            team: c.team,
            hp: c.currentHp,
            maxHp: c.maxHp,
            initiative: c.initiative,
            isAlive: c.isAlive,
          })),
          wager: wagerAmount,
        },
      });
    } catch (error) {
      if (handleDbError(error, res, 'pvp-accept', req)) return;
      logRouteError(req, 500, 'PvP accept error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ---- POST /decline ----

router.post(
  '/decline',
  authGuard,
  validate(acceptDeclineSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.body;
      const character = req.character!;

      const session = await db.query.combatSessions.findFirst({
        where: eq(combatSessions.id, sessionId),
      });

      if (!session) {
        return res.status(404).json({ error: 'Combat session not found' });
      }

      if (session.status !== 'PENDING') {
        return res.status(400).json({ error: 'Challenge is no longer pending' });
      }

      const sessionLog = session.log as { challengerId: string; targetId: string };
      if (sessionLog.targetId !== character.id) {
        return res.status(403).json({ error: 'Only the challenged player can decline' });
      }

      await db.update(combatSessions).set({ status: 'CANCELLED', endedAt: new Date().toISOString() }).where(eq(combatSessions.id, sessionId));

      // Notify the challenger that their challenge was declined
      emitChallengeDeclined(sessionLog.challengerId, {
        sessionId,
        type: session.type,
        declinedBy: character.name,
      });

      return res.json({ session: { id: sessionId, status: 'CANCELLED' } });
    } catch (error) {
      if (handleDbError(error, res, 'pvp-decline', req)) return;
      logRouteError(req, 500, 'PvP decline error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ---- POST /action ----

router.post(
  '/action',
  authGuard,
  validate(actionSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId, action, item } = req.body;
      const character = req.character!;

      // Get or restore combat state
      let combatState = await getPvpCombatState(sessionId);

      if (!combatState) {
        // Try to restore from DB
        const session = await db.query.combatSessions.findFirst({
          where: eq(combatSessions.id, sessionId),
          with: {
            combatParticipants: { with: { character: true } },
          },
        });

        if (!session || session.status !== 'ACTIVE') {
          return res.status(404).json({ error: 'No active combat session found' });
        }

        // Verify player is a participant
        const isParticipant = (session.combatParticipants || []).some(
          (p: any) => p.characterId === character.id
        );
        if (!isParticipant) {
          return res.status(403).json({ error: 'You are not a participant in this combat' });
        }

        return res.status(400).json({
          error: 'Combat state not found in memory. Session may need to be restarted.',
        });
      }

      // Verify it is this player's turn
      const currentTurnId = combatState.turnOrder[combatState.turnIndex];
      if (currentTurnId !== character.id) {
        return res.status(400).json({ error: 'It is not your turn' });
      }

      // Verify combat is active
      if (combatState.status !== 'ACTIVE') {
        return res.status(400).json({ error: 'Combat has already ended' });
      }

      // Build the combat action
      const combatAction: CombatAction = {
        type: action.type,
        actorId: character.id,
        targetId: action.targetId,
        resourceId: action.resourceId,
        spellSlotLevel: action.spellSlotLevel,
      };

      // P0 #3 FIX: Look up weapon from DB instead of trusting client
      const rawWeapon = await getEquippedWeapon(character.id);
      const equippedWeapon = applyClassWeaponStat(rawWeapon, character.class);

      // Resolve the turn
      combatState = resolveTurn(combatState, combatAction, {
        weapon: equippedWeapon,
        item: item as ItemInfo | undefined,
      });

      await setPvpCombatState(sessionId, combatState);

      // Log the action to DB
      const lastLog = combatState.log[combatState.log.length - 1];
      await db.insert(combatLogs).values({
        id: crypto.randomUUID(),
        sessionId,
        round: lastLog.round,
        actorId: lastLog.actorId,
        action: lastLog.action,
        result: lastLog.result as any,
      });

      // Update participant HP in DB
      await Promise.all(
        combatState.combatants.map((c) =>
          db.update(combatParticipants).set({ currentHp: c.currentHp })
            .where(and(eq(combatParticipants.sessionId, sessionId), eq(combatParticipants.characterId, c.id)))
        )
      );

      // Check for combat end
      if (combatState.status === 'COMPLETED') {
        await finalizePvpMatch(sessionId, combatState);
      }

      const response: Record<string, unknown> = {
        session: {
          id: sessionId,
          status: combatState.status,
          round: combatState.round,
          currentTurn:
            combatState.status === 'ACTIVE'
              ? combatState.turnOrder[combatState.turnIndex]
              : null,
          combatants: combatState.combatants.map((c) => ({
            id: c.id,
            name: c.name,
            team: c.team,
            hp: c.currentHp,
            maxHp: c.maxHp,
            isAlive: c.isAlive,
            statusEffects: c.statusEffects.map((e) => ({
              name: e.name,
              remainingRounds: e.remainingRounds,
            })),
          })),
        },
        turnResult: lastLog,
      };

      if (combatState.status === 'COMPLETED') {
        const winningTeam = combatState.winningTeam;
        const winner = combatState.combatants.find(
          (c) => c.team === winningTeam && c.isAlive
        );
        const loser = combatState.combatants.find(
          (c) => c.team !== winningTeam
        );
        response.result = {
          winner: winner ? { id: winner.id, name: winner.name } : null,
          loser: loser ? { id: loser.id, name: loser.name } : null,
        };
      }

      return res.json(response);
    } catch (error) {
      if (handleDbError(error, res, 'pvp-action', req)) return;
      logRouteError(req, 500, 'PvP action error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ---- GET /state ----

router.get(
  '/state',
  authGuard,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const character = req.character!;

      const sessionId = req.query.sessionId as string | undefined;

      // Find the player's active PvP session
      // Drizzle doesn't support nested where on relations, so fetch and filter
      const allParticipations = await db.query.combatParticipants.findMany({
        where: eq(combatParticipants.characterId, character.id),
        with: {
          combatSession: {
            with: {
              combatParticipants: {
                with: { character: true },
              },
            },
          },
        },
      });

      const participant = allParticipations.find((p: any) => {
        const s = p.session;
        if (!s) return false;
        if (!['DUEL', 'ARENA', 'PVP'].includes(s.type)) return false;
        if (s.status !== 'ACTIVE') return false;
        if (sessionId && s.id !== sessionId) return false;
        return true;
      });

      if (!participant) {
        return res.json({ inCombat: false });
      }

      const combatState = await getPvpCombatState(participant.sessionId);

      if (!combatState) {
        // State only in DB — return basic info
        return res.json({
          inCombat: true,
          session: {
            id: participant.sessionId,
            status: (participant as any).session.status,
            participants: ((participant as any).session.combatParticipants || []).map((p: any) => ({
              characterId: p.characterId,
              name: p.character.name,
              level: p.character.level,
              team: p.team,
              hp: p.currentHp,
              initiative: p.initiative,
            })),
          },
        });
      }

      const currentTurnId = combatState.turnOrder[combatState.turnIndex];

      return res.json({
        inCombat: true,
        session: {
          id: participant.sessionId,
          status: combatState.status,
          round: combatState.round,
          currentTurn: currentTurnId,
          turnOrder: combatState.turnOrder,
          combatants: combatState.combatants.map((c) => ({
            id: c.id,
            name: c.name,
            team: c.team,
            hp: c.currentHp,
            maxHp: c.maxHp,
            initiative: c.initiative,
            isAlive: c.isAlive,
            isDefending: c.isDefending,
            statusEffects: c.statusEffects.map((e) => ({
              name: e.name,
              remainingRounds: e.remainingRounds,
            })),
          })),
          log: formatCombatLog(combatState, {
            isPvp: true,
            requestingCharacterId: character.id,
          }),
        },
      });
    } catch (error) {
      if (handleDbError(error, res, 'pvp-state', req)) return;
      logRouteError(req, 500, 'PvP state error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ---- GET /challenges ----

router.get(
  '/challenges',
  authGuard,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const character = req.character!;

      // Find all pending DUEL sessions where this player is a participant
      // Drizzle: fetch participations and filter by session type/status at app level
      const allParticipations = await db.query.combatParticipants.findMany({
        where: eq(combatParticipants.characterId, character.id),
        with: {
          combatSession: {
            with: {
              combatParticipants: {
                with: {
                  character: true,
                },
              },
              town: true,
            },
          },
        },
      });

      const participations = allParticipations
        .filter((p: any) => p.session?.type === 'DUEL' && p.session?.status === 'PENDING')
        .sort((a: any, b: any) => new Date(b.session.startedAt).getTime() - new Date(a.session.startedAt).getTime());

      const challenges = participations.map((p: any) => {
        const sessionLog = p.session.log as {
          challengerId: string;
          targetId: string;
          wager: number;
        };
        const isChallenger = sessionLog.challengerId === character.id;
        const opponent = (p.session.combatParticipants || []).find(
          (part: any) => part.characterId !== character.id
        );

        return {
          sessionId: p.session.id,
          role: isChallenger ? 'challenger' : 'target',
          opponent: opponent
            ? {
                id: opponent.character.id,
                name: opponent.character.name,
                level: opponent.character.level,
              }
            : null,
          wager: sessionLog.wager,
          town: p.session.town ? { id: (p.session as any).town.id, name: (p.session as any).town.name } : null,
          createdAt: p.session.startedAt.toISOString(),
        };
      });

      return res.json({ challenges });
    } catch (error) {
      if (handleDbError(error, res, 'pvp-challenges', req)) return;
      logRouteError(req, 500, 'PvP challenges error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ---- GET /leaderboard ----

router.get(
  '/leaderboard',
  authGuard,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
      const skip = (page - 1) * limit;

      // SQL aggregation query — replaces multi-query in-memory approach
      const rows = await db.execute(sql`
        SELECT
          cp.character_id AS "characterId",
          c.name,
          c.level,
          COUNT(*) FILTER (WHERE cs.log->>'winnerId' = cp.character_id) AS wins,
          COUNT(*) AS total
        FROM combat_participants cp
        JOIN combat_sessions cs ON cs.id = cp.session_id
        JOIN characters c ON c.id = cp.character_id
        WHERE cs.type IN ('DUEL', 'ARENA', 'PVP')
          AND cs.status = 'COMPLETED'
        GROUP BY cp.character_id, c.name, c.level
        ORDER BY wins DESC, total DESC
        LIMIT ${limit} OFFSET ${skip}
      `) as any;

      const leaderboard = (rows.rows ?? rows).map((r: any) => {
        const wins = Number(r.wins);
        const total = Number(r.total);
        const losses = total - wins;
        return {
          id: r.characterId,
          name: r.name ?? 'Unknown',
          level: r.level ?? 0,
          wins,
          losses,
          totalMatches: total,
          winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
        };
      });

      return res.json({ leaderboard, page, limit });
    } catch (error) {
      if (handleDbError(error, res, 'pvp-leaderboard', req)) return;
      logRouteError(req, 500, 'PvP leaderboard error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ---- Finalize a completed PvP match ----

async function finalizePvpMatch(
  sessionId: string,
  combatState: CombatState
): Promise<void> {
  const winningTeam = combatState.winningTeam;
  const winner = combatState.combatants.find(
    (c) => c.team === winningTeam && c.isAlive
  );
  const loser = combatState.combatants.find((c) => c.team !== winningTeam);

  if (!winner || !loser) return;

  // Read wager from session
  const session = await db.query.combatSessions.findFirst({
    where: eq(combatSessions.id, sessionId),
  });
  const sessionLog = (session?.log ?? {}) as {
    challengerId: string;
    targetId: string;
    wager: number;
    winnerId?: string;
    partialWager?: boolean;
  };
  const wager = sessionLog.wager ?? 0;

  // Calculate rewards
  const xpReward = XP_PER_OPPONENT_LEVEL * loser.level;

  // Update session log with winner
  sessionLog.winnerId = winner.id;

  await db.transaction(async (tx) => {
    // End the session
    await tx.update(combatSessions).set({
      status: 'COMPLETED',
      endedAt: new Date().toISOString(),
      log: sessionLog as any,
    }).where(eq(combatSessions.id, sessionId));

    if (wager > 0) {
      // Lock both rows to prevent concurrent modification (Bug 2 fix)
      const loserResult = await tx.execute(
        sql`SELECT gold FROM characters WHERE id = ${loser.id} FOR UPDATE`
      );
      const loserRow = (loserResult.rows ?? loserResult)[0] as any;
      await tx.execute(
        sql`SELECT gold FROM characters WHERE id = ${winner.id} FOR UPDATE`
      );

      // Cap transfer at loser's current gold — winner may get less than full wager
      const loserGold: number = loserRow?.gold ?? 0;
      const actualTransfer = Math.min(wager, loserGold);
      const wagerWinnings = Math.floor(actualTransfer * 2 * (1 - WAGER_TAX_RATE));

      if (actualTransfer < wager) {
        sessionLog.partialWager = true;
        // Re-write log with partial wager flag
        await tx.update(combatSessions).set({
          log: sessionLog as any,
        }).where(eq(combatSessions.id, sessionId));
      }

      // Winner: grant wager winnings (their own stake back + winnings minus tax)
      await tx.update(characters).set({
        gold: sql`${characters.gold} + ${wagerWinnings - actualTransfer}`,
      }).where(eq(characters.id, winner.id));

      // Loser: deduct capped wager (never below 0)
      await tx.update(characters).set({
        gold: sql`${characters.gold} - ${actualTransfer}`,
      }).where(eq(characters.id, loser.id));
    }

    // Apply feat bonus to XP
    const winnerChar = await tx.query.characters.findFirst({ where: eq(characters.id, winner.id), columns: { feats: true } });
    const pvpXp = Math.round(xpReward * (1 + computeFeatBonus((winnerChar?.feats as string[]) ?? [], 'xpBonus')));

    // Winner: grant XP, heal to full
    await tx.update(characters).set({
      xp: sql`${characters.xp} + ${pvpXp}`,
      health: winner.maxHp,
    }).where(eq(characters.id, winner.id));

    // Loser: heal to full
    await tx.update(characters).set({
      health: loser.maxHp,
    }).where(eq(characters.id, loser.id));
  });

  // Check for level up after XP grant
  await checkLevelUp(winner.id);

  // Check PvP combat achievements for winner
  const allWinnerParticipations = await db.query.combatParticipants.findMany({
    where: and(eq(combatParticipants.characterId, winner.id), gt(combatParticipants.currentHp, 0)),
    with: { combatSession: true },
  });
  const pvpWins = allWinnerParticipations.filter(
    (p: any) => p.session && ['DUEL', 'ARENA', 'PVP'].includes(p.session.type) && p.session.status === 'COMPLETED'
  ).length;
  await checkAchievements(winner.id, 'combat_pvp', { wins: pvpWins });

  // Notify both participants of the result
  emitCombatResult([winner.id, loser.id], {
    sessionId,
    type: 'PVP',
    result: 'victory', // each player gets their own perspective below
    summary: `${winner.name} defeated ${loser.name}!`,
  });

  // Clean up in-memory state
  await deletePvpCombatState(sessionId);

  // Write structured combat encounter logs (one per participant)
  if (COMBAT_LOGGING_ENABLED) {
    const winnerEquip = await db.query.characterEquipment.findFirst({
      where: and(eq(characterEquipment.characterId, winner.id), eq(characterEquipment.slot, 'MAIN_HAND')),
      with: { item: { with: { itemTemplate: true } } },
    });
    const loserEquip = await db.query.characterEquipment.findFirst({
      where: and(eq(characterEquipment.characterId, loser.id), eq(characterEquipment.slot, 'MAIN_HAND')),
      with: { item: { with: { itemTemplate: true } } },
    });

    logPvpCombat({
      sessionId,
      state: combatState,
      winnerId: winner.id,
      loserId: loser.id,
      winnerName: winner.name,
      loserName: loser.name,
      townId: session?.locationTownId ?? null,
      winnerStartHp: winner.maxHp,
      loserStartHp: loser.maxHp,
      winnerWeapon: winnerEquip?.item?.itemTemplate?.name ?? 'Unarmed Strike',
      loserWeapon: loserEquip?.item?.itemTemplate?.name ?? 'Unarmed Strike',
      xpAwarded: xpReward,
      wagerAmount: wager,
      isSpar: false,
    });
  }
}

// ---- Spar cooldown tracking (Redis with in-memory fallback) ----
// P1 #18 FIX: Moved spar cooldowns from in-memory Map to Redis SET with TTL

const SPAR_COOLDOWN_SECONDS = 5 * 60; // 5 minutes
const SPAR_MAX_LEVEL_DIFF = 10;

// In-memory fallback for when Redis is unavailable
const sparCooldownsFallback = new Map<string, number>();

function getSparCooldownKey(id1: string, id2: string): string {
  const sorted = [id1, id2].sort();
  return `spar:cooldown:${sorted[0]}:${sorted[1]}`;
}

async function isOnSparCooldown(id1: string, id2: string): Promise<boolean> {
  const key = getSparCooldownKey(id1, id2);
  if (redis) {
    try {
      const exists = await redis.exists(key);
      return exists === 1;
    } catch { /* fall through to local */ }
  }
  const expiry = sparCooldownsFallback.get(key);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    sparCooldownsFallback.delete(key);
    return false;
  }
  return true;
}

async function setSparCooldown(id1: string, id2: string): Promise<void> {
  const key = getSparCooldownKey(id1, id2);
  if (redis) {
    try {
      await redis.set(key, '1', 'EX', SPAR_COOLDOWN_SECONDS);
      return;
    } catch { /* fall through to local */ }
  }
  sparCooldownsFallback.set(key, Date.now() + SPAR_COOLDOWN_SECONDS * 1000);
}

// ---- Spar Zod Schemas ----

const sparChallengeSchema = z.object({
  targetCharacterId: z.string().min(1, 'Target character ID is required'),
});

const sparAcceptDeclineSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

const sparActionSchema = actionSchema; // Reuse ranked PvP action schema

// ---- POST /spar ----

router.post(
  '/spar',
  authGuard,
  validate(sparChallengeSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { targetCharacterId } = req.body;
      const challenger = req.character!;

      if (challenger.id === targetCharacterId) {
        return res.status(400).json({ error: 'Cannot spar yourself' });
      }

      // Alt-account check
      if (await isSameAccount(challenger.id, targetCharacterId)) {
        return res.status(400).json({ error: 'Cannot challenge your own characters' });
      }

      const target = await db.query.characters.findFirst({
        where: eq(characters.id, targetCharacterId),
      });

      if (!target) {
        return res.status(404).json({ error: 'Target character not found' });
      }

      // Same town check
      if (!challenger.currentTownId || challenger.currentTownId !== target.currentTownId) {
        return res.status(400).json({ error: 'Both players must be in the same town' });
      }

      // Level difference check (relaxed for sparring)
      if (Math.abs(challenger.level - target.level) > SPAR_MAX_LEVEL_DIFF) {
        return res.status(400).json({
          error: `Level difference cannot exceed ${SPAR_MAX_LEVEL_DIFF} for sparring`,
        });
      }

      // Activity checks
      if (await isInActiveCombat(challenger.id)) {
        return res.status(400).json({ error: 'You are already in combat' });
      }
      if (await isInActiveCombat(target.id)) {
        return res.status(400).json({ error: 'Target is already in combat' });
      }

      // Spar cooldown check
      if (await isOnSparCooldown(challenger.id, target.id)) {
        return res.status(400).json({
          error: 'Must wait 5 minutes before sparring with this player again',
        });
      }

      // Create pending SPAR session — save pre-spar HP for restoration
      const [session] = await db.insert(combatSessions).values({
        id: crypto.randomUUID(),
        type: 'SPAR',
        status: 'PENDING',
        locationTownId: challenger.currentTownId,
        log: {
          challengerId: challenger.id,
          targetId: target.id,
          wager: 0,
        },
        attackerParams: {
          hp: challenger.health,
        },
        defenderParams: {
          hp: target.health,
        },
      }).returning();

      // Create participant entries
      await db.insert(combatParticipants).values([
        { id: crypto.randomUUID(), sessionId: session.id, characterId: challenger.id, team: 0, currentHp: challenger.health },
        { id: crypto.randomUUID(), sessionId: session.id, characterId: target.id, team: 1, currentHp: target.health },
      ]);

      // Emit socket event to target
      emitCombatResult([target.id], {
        sessionId: session.id,
        type: 'SPAR',
        result: 'draw', // placeholder — used as notification
        summary: `${challenger.name} challenges you to a spar!`,
      });

      return res.status(201).json({
        session: {
          id: session.id,
          type: 'SPAR',
          status: session.status,
          challenger: { id: challenger.id, name: challenger.name, level: challenger.level },
          target: { id: target.id, name: target.name, level: target.level },
        },
      });
    } catch (error) {
      if (handleDbError(error, res, 'pvp-spar', req)) return;
      logRouteError(req, 500, 'PvP spar challenge error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ---- POST /spar-accept ----

router.post(
  '/spar-accept',
  authGuard,
  validate(sparAcceptDeclineSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.body;
      const character = req.character!;

      const session = await db.query.combatSessions.findFirst({
        where: eq(combatSessions.id, sessionId),
        with: {
          combatParticipants: {
            with: { character: true },
          },
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Combat session not found' });
      }

      if (session.type !== 'SPAR') {
        return res.status(400).json({ error: 'Session is not a spar' });
      }

      if (session.status !== 'PENDING') {
        return res.status(400).json({ error: 'Spar challenge is no longer pending' });
      }

      const sessionLog = session.log as { challengerId: string; targetId: string };
      if (sessionLog.targetId !== character.id) {
        return res.status(403).json({ error: 'Only the challenged player can accept' });
      }

      // Build combatants with full equipment pipeline — spars use max HP (restored after)
      const combatants = await Promise.all(
        (session.combatParticipants || []).map((p: any) =>
          buildFullCombatant(p.characterId, p.character as CharacterRecord, p.team, false)
        )
      );

      // Create combat state and roll initiative (use 'DUEL' engine type — DB tracks SPAR separately)
      const combatState = createCombatState(sessionId, 'DUEL', combatants);
      await setPvpCombatState(sessionId, combatState);

      // Update DB: set session active, write initiative to participants
      await db.transaction(async (tx) => {
        await tx.update(combatSessions).set({ status: 'ACTIVE', startedAt: new Date().toISOString() }).where(eq(combatSessions.id, sessionId));
        for (const c of combatState.combatants) {
          await tx.update(combatParticipants).set({ initiative: c.initiative, currentHp: c.currentHp })
            .where(and(eq(combatParticipants.sessionId, sessionId), eq(combatParticipants.characterId, c.id)));
        }
      });

      const currentTurnId = combatState.turnOrder[combatState.turnIndex];

      // Emit socket event to both participants
      emitCombatResult([sessionLog.challengerId, sessionLog.targetId], {
        sessionId,
        type: 'SPAR',
        result: 'draw', // placeholder — used as notification
        summary: 'Spar has begun!',
      });

      return res.json({
        session: {
          id: sessionId,
          status: 'ACTIVE',
          type: 'SPAR',
          round: combatState.round,
          currentTurn: currentTurnId,
          turnOrder: combatState.turnOrder,
          combatants: combatState.combatants.map((c) => ({
            id: c.id,
            name: c.name,
            team: c.team,
            hp: c.currentHp,
            maxHp: c.maxHp,
            initiative: c.initiative,
            isAlive: c.isAlive,
          })),
        },
      });
    } catch (error) {
      if (handleDbError(error, res, 'pvp-spar-accept', req)) return;
      logRouteError(req, 500, 'PvP spar-accept error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ---- POST /spar-decline ----

router.post(
  '/spar-decline',
  authGuard,
  validate(sparAcceptDeclineSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.body;
      const character = req.character!;

      const session = await db.query.combatSessions.findFirst({
        where: eq(combatSessions.id, sessionId),
      });

      if (!session) {
        return res.status(404).json({ error: 'Combat session not found' });
      }

      if (session.type !== 'SPAR') {
        return res.status(400).json({ error: 'Session is not a spar' });
      }

      if (session.status !== 'PENDING') {
        return res.status(400).json({ error: 'Spar challenge is no longer pending' });
      }

      const sessionLog = session.log as { challengerId: string; targetId: string };
      if (sessionLog.targetId !== character.id) {
        return res.status(403).json({ error: 'Only the challenged player can decline' });
      }

      await db.update(combatSessions).set({ status: 'CANCELLED', endedAt: new Date().toISOString() }).where(eq(combatSessions.id, sessionId));

      // Notify challenger
      emitCombatResult([sessionLog.challengerId], {
        sessionId,
        type: 'SPAR',
        result: 'draw',
        summary: `${character.name} declined your spar challenge.`,
      });

      return res.json({ session: { id: sessionId, status: 'CANCELLED' } });
    } catch (error) {
      if (handleDbError(error, res, 'pvp-spar-decline', req)) return;
      logRouteError(req, 500, 'PvP spar-decline error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ---- POST /spar-action ----

router.post(
  '/spar-action',
  authGuard,
  validate(sparActionSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId, action, item } = req.body;
      const character = req.character!;

      // Get or restore combat state
      let combatState = await getPvpCombatState(sessionId);

      if (!combatState) {
        const session = await db.query.combatSessions.findFirst({
          where: eq(combatSessions.id, sessionId),
          with: {
            combatParticipants: { with: { character: true } },
          },
        });

        if (!session || session.status !== 'ACTIVE' || session.type !== 'SPAR') {
          return res.status(404).json({ error: 'No active spar session found' });
        }

        const isParticipant = (session.combatParticipants || []).some(
          (p: any) => p.characterId === character.id
        );
        if (!isParticipant) {
          return res.status(403).json({ error: 'You are not a participant in this spar' });
        }

        return res.status(400).json({
          error: 'Combat state not found in memory. Session may need to be restarted.',
        });
      }

      // Verify it is this player's turn
      const currentTurnId = combatState.turnOrder[combatState.turnIndex];
      if (currentTurnId !== character.id) {
        return res.status(400).json({ error: 'It is not your turn' });
      }

      if (combatState.status !== 'ACTIVE') {
        return res.status(400).json({ error: 'Combat has already ended' });
      }

      // Build the combat action
      const combatAction: CombatAction = {
        type: action.type,
        actorId: character.id,
        targetId: action.targetId,
        resourceId: action.resourceId,
        spellSlotLevel: action.spellSlotLevel,
      };

      // P0 #3 FIX: Look up weapon from DB instead of trusting client
      const rawWeapon = await getEquippedWeapon(character.id);
      const equippedWeapon = applyClassWeaponStat(rawWeapon, character.class);

      // Resolve the turn
      combatState = resolveTurn(combatState, combatAction, {
        weapon: equippedWeapon,
        item: item as ItemInfo | undefined,
      });

      await setPvpCombatState(sessionId, combatState);

      // Log the action to DB
      const lastLog = combatState.log[combatState.log.length - 1];
      await db.insert(combatLogs).values({
        id: crypto.randomUUID(),
        sessionId,
        round: lastLog.round,
        actorId: lastLog.actorId,
        action: lastLog.action,
        result: lastLog.result as any,
      });

      // Update participant HP in DB
      await Promise.all(
        combatState.combatants.map((c) =>
          db.update(combatParticipants).set({ currentHp: c.currentHp })
            .where(and(eq(combatParticipants.sessionId, sessionId), eq(combatParticipants.characterId, c.id)))
        )
      );

      // Check for combat end — use spar finalization (zero stakes)
      if (combatState.status === 'COMPLETED') {
        await finalizeSparMatch(sessionId, combatState);
      }

      const response: Record<string, unknown> = {
        session: {
          id: sessionId,
          type: 'SPAR',
          status: combatState.status,
          round: combatState.round,
          currentTurn:
            combatState.status === 'ACTIVE'
              ? combatState.turnOrder[combatState.turnIndex]
              : null,
          combatants: combatState.combatants.map((c) => ({
            id: c.id,
            name: c.name,
            team: c.team,
            hp: c.currentHp,
            maxHp: c.maxHp,
            isAlive: c.isAlive,
            statusEffects: c.statusEffects.map((e) => ({
              name: e.name,
              remainingRounds: e.remainingRounds,
            })),
          })),
        },
        turnResult: lastLog,
      };

      if (combatState.status === 'COMPLETED') {
        const winningTeam = combatState.winningTeam;
        const winner = combatState.combatants.find(
          (c) => c.team === winningTeam && c.isAlive
        );
        const loser = combatState.combatants.find(
          (c) => c.team !== winningTeam
        );
        response.result = {
          winner: winner ? { id: winner.id, name: winner.name } : null,
          loser: loser ? { id: loser.id, name: loser.name } : null,
          isSpar: true,
        };
      }

      return res.json(response);
    } catch (error) {
      if (handleDbError(error, res, 'pvp-spar-action', req)) return;
      logRouteError(req, 500, 'PvP spar-action error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ---- GET /spar-state ----

router.get(
  '/spar-state',
  authGuard,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const character = req.character!;

      // Find the player's active SPAR session
      const allParticipations = await db.query.combatParticipants.findMany({
        where: eq(combatParticipants.characterId, character.id),
        with: {
          combatSession: {
            with: {
              combatParticipants: {
                with: { character: true },
              },
            },
          },
        },
      });

      const participant = allParticipations.find(
        (p: any) => p.session?.type === 'SPAR' && p.session?.status === 'ACTIVE'
      );

      if (!participant) {
        return res.json({ inCombat: false });
      }

      const combatState = await getPvpCombatState(participant.sessionId);

      if (!combatState) {
        return res.json({
          inCombat: true,
          session: {
            id: participant.sessionId,
            type: 'SPAR',
            status: (participant as any).session.status,
            participants: ((participant as any).session.combatParticipants || []).map((p: any) => ({
              characterId: p.characterId,
              name: p.character.name,
              level: p.character.level,
              team: p.team,
              hp: p.currentHp,
              initiative: p.initiative,
            })),
          },
        });
      }

      const currentTurnId = combatState.turnOrder[combatState.turnIndex];

      return res.json({
        inCombat: true,
        session: {
          id: participant.sessionId,
          type: 'SPAR',
          status: combatState.status,
          round: combatState.round,
          currentTurn: currentTurnId,
          turnOrder: combatState.turnOrder,
          combatants: combatState.combatants.map((c) => ({
            id: c.id,
            name: c.name,
            team: c.team,
            hp: c.currentHp,
            maxHp: c.maxHp,
            initiative: c.initiative,
            isAlive: c.isAlive,
            isDefending: c.isDefending,
            statusEffects: c.statusEffects.map((e) => ({
              name: e.name,
              remainingRounds: e.remainingRounds,
            })),
          })),
          log: formatCombatLog(combatState, {
            isPvp: true,
            requestingCharacterId: character.id,
            isSpar: true,
          }),
        },
      });
    } catch (error) {
      if (handleDbError(error, res, 'pvp-spar-state', req)) return;
      logRouteError(req, 500, 'PvP spar-state error', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ---- Finalize a completed spar match (zero stakes) ----

async function finalizeSparMatch(
  sessionId: string,
  combatState: CombatState
): Promise<void> {
  const winningTeam = combatState.winningTeam;
  const winner = combatState.combatants.find(
    (c) => c.team === winningTeam && c.isAlive
  );
  const loser = combatState.combatants.find((c) => c.team !== winningTeam);

  if (!winner || !loser) return;

  // Read pre-spar HP from session
  const session = await db.query.combatSessions.findFirst({
    where: eq(combatSessions.id, sessionId),
  });
  const attackerParams = (session?.attackerParams ?? {}) as { hp?: number };
  const defenderParams = (session?.defenderParams ?? {}) as { hp?: number };
  const sessionLog = (session?.log ?? {}) as { challengerId: string; targetId: string };

  // Determine which combatant is attacker vs defender
  const challengerId = sessionLog.challengerId;

  await db.transaction(async (tx) => {
    // End the session
    await tx.update(combatSessions).set({
      status: 'COMPLETED',
      endedAt: new Date().toISOString(),
      log: { ...sessionLog, winnerId: winner.id } as any,
    }).where(eq(combatSessions.id, sessionId));

    // Restore challenger to pre-spar HP
    await tx.update(characters).set({
      health: attackerParams.hp ?? winner.maxHp,
    }).where(eq(characters.id, challengerId));

    // Restore target to pre-spar HP
    await tx.update(characters).set({
      health: defenderParams.hp ?? loser.maxHp,
    }).where(eq(characters.id, challengerId === winner.id ? loser.id : winner.id));
  });

  // Set 5-minute cooldown between these two players
  await setSparCooldown(winner.id, loser.id);

  // Notify both participants (NO XP, NO achievements, NO leaderboard)
  emitCombatResult([winner.id, loser.id], {
    sessionId,
    type: 'SPAR',
    result: 'victory',
    summary: `Spar complete! ${winner.name} bested ${loser.name}.`,
  });

  // Clean up in-memory state
  await deletePvpCombatState(sessionId);

  // Write structured combat encounter logs for spar
  if (COMBAT_LOGGING_ENABLED) {
    logPvpCombat({
      sessionId,
      state: combatState,
      winnerId: winner.id,
      loserId: loser.id,
      winnerName: winner.name,
      loserName: loser.name,
      townId: session?.locationTownId ?? null,
      winnerStartHp: winner.maxHp,
      loserStartHp: loser.maxHp,
      winnerWeapon: 'Spar Weapon',
      loserWeapon: 'Spar Weapon',
      xpAwarded: 0,
      wagerAmount: 0,
      isSpar: true,
    });
  }
}

export default router;
