import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import {
  createCombatState,
  createCharacterCombatant,
  createMonsterCombatant,
  resolveTurn,
  calculateDeathPenalty,
} from '../lib/combat-engine';
import type {
  CharacterStats,
  CombatState,
  CombatAction,
  WeaponInfo,
  SpellInfo,
  ItemInfo,
} from '@shared/types/combat';
import { getModifier } from '@shared/types/combat';
import { getProficiencyBonus } from '@shared/utils/bounded-accuracy';
import { emitCombatResult } from '../socket/events';
import { onMonsterKill } from '../services/quest-triggers';
import { checkLevelUp } from '../services/progression';
import { checkAchievements } from '../services/achievements';
import { redis } from '../lib/redis';
import { ACTION_XP } from '@shared/data/progression';

const router = Router();

// ---- Combat state store (Redis with in-memory fallback) ----
const localCombats = new Map<string, CombatState>();
const COMBAT_TTL = 3600; // 1 hour

async function getCombatState(sessionId: string): Promise<CombatState | undefined> {
  if (redis) {
    try {
      const data = await redis.get(`combat:pve:${sessionId}`);
      if (data) return JSON.parse(data) as CombatState;
    } catch { /* fall through to local */ }
  }
  return localCombats.get(sessionId);
}

async function setCombatState(sessionId: string, state: CombatState): Promise<void> {
  if (redis) {
    try {
      await redis.setex(`combat:pve:${sessionId}`, COMBAT_TTL, JSON.stringify(state));
      localCombats.delete(sessionId); // no need to keep both
      return;
    } catch { /* fall through to local */ }
  }
  localCombats.set(sessionId, state);
}

async function deleteCombatState(sessionId: string): Promise<void> {
  if (redis) {
    try { await redis.del(`combat:pve:${sessionId}`); } catch { /* ignore */ }
  }
  localCombats.delete(sessionId);
}

// ---- Zod Schemas ----

const startPveSchema = z.object({
  characterId: z.string().uuid(),
});

const combatActionSchema = z.object({
  sessionId: z.string().uuid(),
  action: z.object({
    type: z.enum(['attack', 'cast', 'defend', 'item', 'flee']),
    targetId: z.string().optional(),
    resourceId: z.string().optional(),
    spellSlotLevel: z.number().int().min(1).max(9).optional(),
  }),
  // Contextual data the client sends alongside the action
  weapon: z.object({
    id: z.string(),
    name: z.string(),
    diceCount: z.number().int().min(1),
    diceSides: z.number().int().min(1),
    damageModifierStat: z.enum(['str', 'dex']),
    attackModifierStat: z.enum(['str', 'dex']),
    bonusDamage: z.number().int(),
    bonusAttack: z.number().int(),
  }).optional(),
  spell: z.object({
    id: z.string(),
    name: z.string(),
    level: z.number().int().min(1),
    castingStat: z.enum(['int', 'wis', 'cha']),
    type: z.enum(['damage', 'heal', 'status', 'damage_status']),
    diceCount: z.number().int().min(1),
    diceSides: z.number().int().min(1),
    modifier: z.number().int(),
    statusEffect: z.string().optional(),
    statusDuration: z.number().int().optional(),
    requiresSave: z.boolean(),
    saveType: z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']).optional(),
  }).optional(),
  item: z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['heal', 'damage', 'buff', 'cleanse']),
    diceCount: z.number().int().optional(),
    diceSides: z.number().int().optional(),
    flatAmount: z.number().int().optional(),
    statusEffect: z.string().optional(),
    statusDuration: z.number().int().optional(),
  }).optional(),
});

// ---- Helpers ----

async function getCharacter(userId: string, characterId: string) {
  return prisma.character.findFirst({
    where: { id: characterId, userId },
    include: {
      currentTown: { select: { id: true, name: true, regionId: true } },
    },
  });
}

function parseStats(stats: unknown): CharacterStats {
  const s = stats as Record<string, number>;
  return {
    str: s.str ?? 10,
    dex: s.dex ?? 10,
    con: s.con ?? 10,
    int: s.int ?? 10,
    wis: s.wis ?? 10,
    cha: s.cha ?? 10,
  };
}

/** Parse a damage string like "2d6+4" into dice components. */
function parseDamageString(damage: string): { diceCount: number; diceSides: number; bonus: number } {
  const match = damage.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
  if (!match) return { diceCount: 1, diceSides: 6, bonus: 0 };
  return {
    diceCount: parseInt(match[1], 10),
    diceSides: parseInt(match[2], 10),
    bonus: match[3] ? parseInt(match[3], 10) : 0,
  };
}

function buildMonsterWeapon(monsterStats: Record<string, unknown>): WeaponInfo {
  const damage = parseDamageString(String(monsterStats.damage ?? '1d6'));
  return {
    id: 'monster-attack',
    name: 'Natural Attack',
    diceCount: damage.diceCount,
    diceSides: damage.diceSides,
    damageModifierStat: 'str',
    attackModifierStat: 'str',
    bonusDamage: damage.bonus,
    bonusAttack: (monsterStats.attack as number) ?? 0,
  };
}

// ---- Routes ----

// POST /api/combat/pve/start
router.post('/start', authGuard, validate(startPveSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { characterId } = req.body;
    const character = await getCharacter(req.user!.userId, characterId);

    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (!character.currentTown) {
      return res.status(400).json({ error: 'Character is not in a town' });
    }

    // Check character is not already in combat
    const existing = await prisma.combatParticipant.findFirst({
      where: {
        characterId: character.id,
        session: { status: 'active' },
      },
    });
    if (existing) {
      return res.status(400).json({ error: 'Character is already in combat', sessionId: existing.sessionId });
    }

    // Pick a random monster from the character's region, near their level
    const levelMin = Math.max(1, character.level - 3);
    const levelMax = character.level + 3;

    const monsters = await prisma.monster.findMany({
      where: {
        regionId: character.currentTown.regionId,
        level: { gte: levelMin, lte: levelMax },
      },
    });

    if (monsters.length === 0) {
      // Fallback: any monster in level range
      const fallback = await prisma.monster.findMany({
        where: { level: { gte: levelMin, lte: levelMax } },
      });
      if (fallback.length === 0) {
        return res.status(404).json({ error: 'No suitable monsters found in this area' });
      }
      monsters.push(...fallback);
    }

    const monster = monsters[Math.floor(Math.random() * monsters.length)];
    const monsterStats = monster.stats as Record<string, number>;
    const charStats = parseStats(character.stats);

    // Create DB session
    const session = await prisma.combatSession.create({
      data: {
        type: 'PVE',
        status: 'active',
        locationTownId: character.currentTown.id,
        log: [],
      },
    });

    // Create participant for the player character only.
    // Monster state is tracked entirely in-memory (no Character row to reference).
    await prisma.combatParticipant.create({
      data: {
        sessionId: session.id,
        characterId: character.id,
        team: 0,
        currentHp: character.health,
      },
    });

    // Build in-memory combat state
    const playerCombatant = createCharacterCombatant(
      character.id,
      character.name,
      0,
      charStats,
      character.level,
      character.health,
      character.maxHealth,
      character.mana,
      character.maxMana,
      10 + getModifier(charStats.dex), // base AC from stats
      null, // weapon provided per-action
      {},
      getProficiencyBonus(character.level),
    );

    const monsterCombatant = createMonsterCombatant(
      `monster-${monster.id}`,
      monster.name,
      1,
      parseStats(monster.stats),
      monster.level,
      monsterStats.hp ?? 50,
      monsterStats.ac ?? 12,
      buildMonsterWeapon(monsterStats),
      getProficiencyBonus(monster.level),
    );

    const combatState = createCombatState(session.id, 'PVE', [playerCombatant, monsterCombatant]);
    await setCombatState(session.id, combatState);

    // Update initiative on DB participants
    const playerInit = combatState.combatants.find((c) => c.id === character.id)?.initiative ?? 0;
    const monsterInit = combatState.combatants.find((c) => c.id === `monster-${monster.id}`)?.initiative ?? 0;

    // Update player participant initiative
    const playerParticipant = await prisma.combatParticipant.findFirst({
      where: { sessionId: session.id, team: 0 },
    });
    if (playerParticipant) {
      await prisma.combatParticipant.update({
        where: { id: playerParticipant.id },
        data: { initiative: playerInit },
      });
    }

    return res.status(201).json({
      sessionId: session.id,
      combat: {
        round: combatState.round,
        turnOrder: combatState.turnOrder,
        currentTurn: combatState.turnOrder[combatState.turnIndex],
        combatants: combatState.combatants.map((c) => ({
          id: c.id,
          name: c.name,
          entityType: c.entityType,
          team: c.team,
          currentHp: c.currentHp,
          maxHp: c.maxHp,
          ac: c.ac,
          initiative: c.initiative,
          statusEffects: c.statusEffects,
          isAlive: c.isAlive,
        })),
        monster: {
          id: monster.id,
          name: monster.name,
          level: monster.level,
        },
      },
    });
  } catch (error) {
    console.error('PvE start error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/combat/pve/action
router.post('/action', authGuard, validate(combatActionSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId, action, weapon, spell, item } = req.body;

    const state = await getCombatState(sessionId);
    if (!state) {
      return res.status(404).json({ error: 'Combat session not found or has ended' });
    }

    if (state.status !== 'active') {
      return res.status(400).json({ error: 'Combat has already ended' });
    }

    const currentActorId = state.turnOrder[state.turnIndex];

    // Verify it is the player's turn (they can only submit actions for their own character)
    const character = await prisma.character.findFirst({
      where: { userId: req.user!.userId },
    });
    if (!character) {
      return res.status(404).json({ error: 'Character not found' });
    }

    if (currentActorId !== character.id) {
      // It's the monster's turn — auto-resolve monster action, then let the player act
      const monsterState = resolveMonsterTurn(state);
      await setCombatState(sessionId, monsterState);

      // Record monster action in DB log
      const lastEntry = monsterState.log[monsterState.log.length - 1];
      if (lastEntry) {
        await prisma.combatLog.create({
          data: {
            sessionId,
            round: lastEntry.round,
            actorId: lastEntry.actorId,
            action: lastEntry.action,
            result: lastEntry.result as object,
          },
        });
      }

      // Check if combat ended after monster turn
      if (monsterState.status === 'completed') {
        await finishCombat(sessionId, monsterState, character.id);
        return res.json({ combat: formatCombatResponse(monsterState) });
      }

      // Now check if it's still not the player's turn (e.g., multiple monsters)
      const nextActor = monsterState.turnOrder[monsterState.turnIndex];
      if (nextActor !== character.id) {
        return res.status(400).json({ error: 'It is not your turn yet' });
      }
    }

    // Resolve the player's action
    const combatAction: CombatAction = {
      type: action.type,
      actorId: currentActorId === character.id ? character.id : state.turnOrder[state.turnIndex],
      targetId: action.targetId,
      resourceId: action.resourceId,
      spellSlotLevel: action.spellSlotLevel,
    };

    const currentState = (await getCombatState(sessionId))!;
    const newState = resolveTurn(
      currentState,
      combatAction,
      { weapon, spell, item }
    );

    await setCombatState(sessionId, newState);

    // Record in DB log
    const lastEntry = newState.log[newState.log.length - 1];
    if (lastEntry) {
      await prisma.combatLog.create({
        data: {
          sessionId,
          round: lastEntry.round,
          actorId: lastEntry.actorId,
          action: lastEntry.action,
          result: lastEntry.result as object,
        },
      });
    }

    // If the next turn belongs to a monster, auto-resolve it immediately
    let finalState = newState;
    if (finalState.status === 'active') {
      const nextActorId = finalState.turnOrder[finalState.turnIndex];
      const isMonsterTurn = nextActorId.startsWith('monster-');
      if (isMonsterTurn) {
        finalState = resolveMonsterTurn(finalState);
        await setCombatState(sessionId, finalState);

        const monsterEntry = finalState.log[finalState.log.length - 1];
        if (monsterEntry) {
          await prisma.combatLog.create({
            data: {
              sessionId,
              round: monsterEntry.round,
              actorId: monsterEntry.actorId,
              action: monsterEntry.action,
              result: monsterEntry.result as object,
            },
          });
        }
      }
    }

    // Check if combat ended
    if (finalState.status === 'completed') {
      await finishCombat(sessionId, finalState, character.id);
    }

    return res.json({ combat: formatCombatResponse(finalState) });
  } catch (error) {
    console.error('PvE action error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/combat/pve/state?sessionId=...
router.get('/state', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId query parameter is required' });
    }

    const state = await getCombatState(sessionId);
    if (state) {
      return res.json({ combat: formatCombatResponse(state) });
    }

    // Try to load from DB (completed session)
    const session = await prisma.combatSession.findUnique({
      where: { id: sessionId },
      include: {
        combatLogs: { orderBy: { createdAt: 'asc' } },
        participants: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Combat session not found' });
    }

    return res.json({
      combat: {
        sessionId: session.id,
        status: session.status,
        type: session.type,
        log: session.combatLogs.map((l) => ({
          round: l.round,
          actorId: l.actorId,
          action: l.action,
          result: l.result,
        })),
        participants: session.participants.map((p) => ({
          characterId: p.characterId,
          team: p.team,
          initiative: p.initiative,
          currentHp: p.currentHp,
        })),
      },
    });
  } catch (error) {
    console.error('PvE state error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---- Monster AI ----

function resolveMonsterTurn(state: CombatState): CombatState {
  const actorId = state.turnOrder[state.turnIndex];
  const monster = state.combatants.find((c) => c.id === actorId);
  if (!monster || !monster.isAlive) {
    // Skip dead monster
    return resolveTurn(state, { type: 'defend', actorId }, {});
  }

  // Simple AI: attack a random living enemy
  const enemies = state.combatants.filter((c) => c.team !== monster.team && c.isAlive);
  if (enemies.length === 0) {
    return resolveTurn(state, { type: 'defend', actorId }, {});
  }

  const target = enemies[Math.floor(Math.random() * enemies.length)];

  return resolveTurn(
    state,
    { type: 'attack', actorId, targetId: target.id },
    { weapon: monster.weapon ?? undefined }
  );
}

// ---- Combat Completion ----

async function finishCombat(sessionId: string, state: CombatState, playerId: string): Promise<void> {
  // Update session status in DB
  await prisma.combatSession.update({
    where: { id: sessionId },
    data: {
      status: 'completed',
      endedAt: new Date(),
      log: state.log as object[],
    },
  });

  const playerCombatant = state.combatants.find((c) => c.id === playerId);

  if (playerCombatant && !playerCombatant.isAlive) {
    // Player died — apply death penalties
    const character = await prisma.character.findUnique({ where: { id: playerId } });
    if (character) {
      const penalty = calculateDeathPenalty(
        playerId,
        character.level,
        character.gold,
        character.currentTownId ?? '',
      );

      await prisma.character.update({
        where: { id: playerId },
        data: {
          health: character.maxHealth, // respawn at full HP
          gold: Math.max(0, character.gold - penalty.goldLost),
          xp: Math.max(0, character.xp - penalty.xpLost),
        },
      });

      // Damage equipment durability
      const equipment = await prisma.characterEquipment.findMany({
        where: { characterId: playerId },
        include: { item: true },
      });
      for (const equip of equipment) {
        await prisma.item.update({
          where: { id: equip.itemId },
          data: {
            currentDurability: Math.max(0, equip.item.currentDurability - penalty.durabilityDamage),
          },
        });
      }

      // Grant survive XP (consolation prize for engaging in combat)
      await prisma.character.update({
        where: { id: playerId },
        data: { xp: { increment: ACTION_XP.PVE_SURVIVE } },
      });
    }
  } else {
    // Player won — award XP and loot
    const monsterCombatant = state.combatants.find((c) => c.entityType === 'monster');
    if (monsterCombatant) {
      const monsterId = monsterCombatant.id.replace('monster-', '');
      const monster = await prisma.monster.findUnique({ where: { id: monsterId } });

      if (monster) {
        const xpReward = ACTION_XP.PVE_WIN_PER_MONSTER_LEVEL * monster.level;
        const lootTable = monster.lootTable as { dropChance: number; minQty: number; maxQty: number; gold: number }[];

        let totalGold = 0;
        for (const entry of lootTable) {
          if (Math.random() <= entry.dropChance) {
            totalGold += entry.gold * (Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty);
          }
        }

        await prisma.character.update({
          where: { id: playerId },
          data: {
            xp: { increment: xpReward },
            gold: { increment: totalGold },
            health: playerCombatant?.currentHp ?? 0,
          },
        });

        // Trigger quest progress for KILL objectives
        onMonsterKill(playerId, monster.name, 1);

        // Check for level up after XP grant
        await checkLevelUp(playerId);

        // Check PvE combat achievements
        const pveWins = await prisma.combatParticipant.count({
          where: {
            characterId: playerId,
            session: { type: 'PVE', status: 'completed' },
            currentHp: { gt: 0 },
          },
        });
        await checkAchievements(playerId, 'combat_pve', { wins: pveWins });
      }
    }
  }

  // Update participant HP
  for (const c of state.combatants) {
    if (c.entityType === 'character') {
      const participant = await prisma.combatParticipant.findFirst({
        where: { sessionId, characterId: c.id },
      });
      if (participant) {
        await prisma.combatParticipant.update({
          where: { id: participant.id },
          data: { currentHp: c.currentHp },
        });
      }
    }
  }

  // Emit combat result to the player
  const playerWon = playerCombatant?.isAlive ?? false;
  emitCombatResult([playerId], {
    sessionId,
    type: 'PVE',
    result: playerWon ? 'victory' : 'defeat',
    summary: playerWon ? 'You won the battle!' : 'You were defeated.',
  });

  // Clean up combat state
  await deleteCombatState(sessionId);
}

// ---- Response Formatting ----

function formatCombatResponse(state: CombatState) {
  return {
    sessionId: state.sessionId,
    status: state.status,
    type: state.type,
    round: state.round,
    currentTurn: state.status === 'active' ? state.turnOrder[state.turnIndex] : null,
    winningTeam: state.winningTeam,
    combatants: state.combatants.map((c) => ({
      id: c.id,
      name: c.name,
      entityType: c.entityType,
      team: c.team,
      currentHp: c.currentHp,
      maxHp: c.maxHp,
      ac: c.ac,
      initiative: c.initiative,
      statusEffects: c.statusEffects,
      isAlive: c.isAlive,
      isDefending: c.isDefending,
    })),
    log: state.log.map((entry) => ({
      round: entry.round,
      actorId: entry.actorId,
      action: entry.action,
      result: entry.result,
      statusTicks: entry.statusTicks,
    })),
  };
}

export default router;
