import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
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
  ItemInfo,
} from '@shared/types/combat';
import { getModifier } from '@shared/types/combat';
import { getProficiencyBonus } from '@shared/utils/bounded-accuracy';
import { emitCombatResult } from '../socket/events';
import { onMonsterKill } from '../services/quest-triggers';
import { checkLevelUp } from '../services/progression';
import { checkAchievements } from '../services/achievements';
import { redis } from '../lib/redis';
import { ACTION_XP, DEATH_PENALTY } from '@shared/data/progression';
import { handlePrismaError } from '../lib/prisma-errors';
import { logRouteError } from '../lib/error-logger';
import { logPveCombat, COMBAT_LOGGING_ENABLED } from '../lib/combat-logger';

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
  // P0 #3 FIX: weapon and spell removed from client input — looked up server-side from equipped items.
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
  const equip = await prisma.characterEquipment.findUnique({
    where: { characterId_slot: { characterId, slot: 'MAIN_HAND' } },
    include: { item: { include: { template: true } } },
  });

  if (!equip || equip.item.template.type !== 'WEAPON') {
    return UNARMED_WEAPON;
  }

  const stats = equip.item.template.stats as Record<string, unknown>;
  return {
    id: equip.item.id,
    name: equip.item.template.name,
    diceCount: (typeof stats.diceCount === 'number') ? stats.diceCount : 1,
    diceSides: (typeof stats.diceSides === 'number') ? stats.diceSides : 4,
    damageModifierStat: stats.damageModifierStat === 'dex' ? 'dex' : 'str',
    attackModifierStat: stats.attackModifierStat === 'dex' ? 'dex' : 'str',
    bonusDamage: (typeof stats.bonusDamage === 'number') ? stats.bonusDamage : 0,
    bonusAttack: (typeof stats.bonusAttack === 'number') ? stats.bonusAttack : 0,
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

    if (character.travelStatus !== 'idle') {
      return res.status(400).json({ error: 'You cannot do this while traveling. You must be in a town.' });
    }

    if (!character.currentTown) {
      return res.status(400).json({ error: 'Character is not in a town' });
    }

    // Check character is not already in combat
    const existing = await prisma.combatParticipant.findFirst({
      where: {
        characterId: character.id,
        session: { status: 'ACTIVE' },
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
        status: 'ACTIVE',
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
    if (handlePrismaError(error, res, 'pve-start', req)) return;
    logRouteError(req, 500, 'PvE start error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/combat/pve/action
router.post('/action', authGuard, validate(combatActionSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId, action, item } = req.body;

    const state = await getCombatState(sessionId);
    if (!state) {
      return res.status(404).json({ error: 'Combat session not found or has ended' });
    }

    if (state.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Combat has already ended' });
    }

    const currentActorId = state.turnOrder[state.turnIndex];

    // Verify it is the player's turn (they can only submit actions for their own character)
    // Major-B12 FIX: Add orderBy for deterministic result
    const character = await prisma.character.findFirst({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'asc' },
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
      if (monsterState.status === 'COMPLETED') {
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

    // P0 #3 FIX: Look up weapon from DB instead of trusting client
    const equippedWeapon = await getEquippedWeapon(character.id);

    const currentState = (await getCombatState(sessionId))!;
    const newState = resolveTurn(
      currentState,
      combatAction,
      { weapon: equippedWeapon, item }
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
    if (finalState.status === 'ACTIVE') {
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
    if (finalState.status === 'COMPLETED') {
      await finishCombat(sessionId, finalState, character.id);
    }

    return res.json({ combat: formatCombatResponse(finalState) });
  } catch (error) {
    if (handlePrismaError(error, res, 'pve-action', req)) return;
    logRouteError(req, 500, 'PvE action error', error);
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
    if (handlePrismaError(error, res, 'pve-state', req)) return;
    logRouteError(req, 500, 'PvE state error', error);
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
  const playerCombatant = state.combatants.find((c) => c.id === playerId);

  await prisma.$transaction(async (tx) => {
    // Update session status in DB
    await tx.combatSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        log: state.log as object[],
      },
    });

    if (playerCombatant && !playerCombatant.isAlive && playerCombatant.hasFled) {
      // P2 #52 FIX: Player fled — apply minor penalty instead of full death penalties
      const character = await tx.character.findUnique({ where: { id: playerId } });
      if (character) {
        // Minor flee penalty: small XP loss (half of death penalty), no gold loss, no durability damage
        const minorXpLoss = Math.floor(character.level * (DEATH_PENALTY.XP_LOSS_PER_LEVEL / 2));
        await tx.character.update({
          where: { id: playerId },
          data: {
            health: Math.max(1, Math.floor(character.maxHealth * 0.5)), // flee at half HP
            xp: Math.max(0, character.xp - minorXpLoss),
          },
        });
      }
    } else if (playerCombatant && !playerCombatant.isAlive) {
      // Player died — apply full death penalties
      const character = await tx.character.findUnique({ where: { id: playerId } });
      if (character) {
        const penalty = calculateDeathPenalty(
          playerId,
          character.level,
          character.gold,
          character.currentTownId ?? '',
        );

        await tx.character.update({
          where: { id: playerId },
          data: {
            health: character.maxHealth, // respawn at full HP
            gold: Math.max(0, character.gold - penalty.goldLost),
            xp: Math.max(0, character.xp - penalty.xpLost),
          },
        });

        // Damage equipment durability (batch update instead of N+1 loop)
        const equipment = await tx.characterEquipment.findMany({
          where: { characterId: playerId },
          select: { itemId: true },
        });
        if (equipment.length > 0) {
          const itemIds = equipment.map(e => e.itemId);
          // Use raw SQL for atomic GREATEST(0, durability - damage) in a single query
          await tx.$executeRaw`
            UPDATE "Item"
            SET "currentDurability" = GREATEST(0, "currentDurability" - ${penalty.durabilityDamage})
            WHERE "id" IN (${Prisma.join(itemIds)})
          `;
        }

        // Grant survive XP (consolation prize for engaging in combat)
        await tx.character.update({
          where: { id: playerId },
          data: { xp: { increment: ACTION_XP.PVE_SURVIVE } },
        });
      }
    } else {
      // Player won — award XP and loot
      const monsterCombatant = state.combatants.find((c) => c.entityType === 'monster');
      if (monsterCombatant) {
        const monsterId = monsterCombatant.id.replace('monster-', '');
        const monster = await tx.monster.findUnique({ where: { id: monsterId } });

        if (monster) {
          const xpReward = ACTION_XP.PVE_WIN_PER_MONSTER_LEVEL * monster.level;
          const lootTable = monster.lootTable as { dropChance: number; minQty: number; maxQty: number; gold: number }[];

          let totalGold = 0;
          for (const entry of lootTable) {
            if (Math.random() <= entry.dropChance) {
              totalGold += entry.gold * (Math.floor(Math.random() * (entry.maxQty - entry.minQty + 1)) + entry.minQty);
            }
          }

          await tx.character.update({
            where: { id: playerId },
            data: {
              xp: { increment: xpReward },
              gold: { increment: totalGold },
              health: playerCombatant?.currentHp ?? 0,
            },
          });
        }
      }
    }

    // Update participant HP
    for (const c of state.combatants) {
      if (c.entityType === 'character') {
        const participant = await tx.combatParticipant.findFirst({
          where: { sessionId, characterId: c.id },
        });
        if (participant) {
          await tx.combatParticipant.update({
            where: { id: participant.id },
            data: { currentHp: c.currentHp },
          });
        }
      }
    }
  });

  // Post-transaction side effects (not DB writes, safe outside transaction)
  if (playerCombatant && playerCombatant.isAlive) {
    const monsterCombatant = state.combatants.find((c) => c.entityType === 'monster');
    if (monsterCombatant) {
      const monsterId = monsterCombatant.id.replace('monster-', '');
      const monster = await prisma.monster.findUnique({ where: { id: monsterId } });
      if (monster) {
        // Trigger quest progress for KILL objectives
        onMonsterKill(playerId, monster.name, 1);

        // Check for level up after XP grant
        await checkLevelUp(playerId);

        // Check PvE combat achievements
        const pveWins = await prisma.combatParticipant.count({
          where: {
            characterId: playerId,
            session: { type: 'PVE', status: 'COMPLETED' },
            currentHp: { gt: 0 },
          },
        });
        await checkAchievements(playerId, 'combat_pve', { wins: pveWins });
      }
    }
  }

  // Emit combat result to the player
  const playerWon = playerCombatant?.isAlive ?? false;
  const playerFled = playerCombatant?.hasFled ?? false;
  emitCombatResult([playerId], {
    sessionId,
    type: 'PVE',
    result: playerWon ? 'victory' : playerFled ? 'fled' : 'defeat',
    summary: playerWon ? 'You won the battle!' : playerFled ? 'You fled from combat.' : 'You were defeated.',
  });

  // Write structured combat encounter log (async, non-blocking for combat flow)
  if (COMBAT_LOGGING_ENABLED) {
    const monsterCombatant = state.combatants.find(c => c.entityType === 'monster');
    const character = await prisma.character.findUnique({
      where: { id: playerId },
      select: { name: true, currentTownId: true },
    });

    // Calculate rewards that were applied in the transaction above
    let xpAwarded = 0;
    let goldAwarded = 0;
    let lootDropped = '';
    let outcome: 'win' | 'loss' | 'flee' | 'draw' = 'draw';

    if (playerWon && monsterCombatant) {
      outcome = 'win';
      const monsterId = monsterCombatant.id.replace('monster-', '');
      const monster = await prisma.monster.findUnique({ where: { id: monsterId } });
      if (monster) {
        xpAwarded = ACTION_XP.PVE_WIN_PER_MONSTER_LEVEL * monster.level;
      }
    } else if (playerFled) {
      outcome = 'flee';
    } else {
      outcome = 'loss';
    }

    // Look up equipped weapon name for the log
    const equip = await prisma.characterEquipment.findUnique({
      where: { characterId_slot: { characterId: playerId, slot: 'MAIN_HAND' } },
      include: { item: { include: { template: { select: { name: true } } } } },
    });
    const weaponName = equip?.item?.template?.name ?? 'Unarmed Strike';

    logPveCombat({
      sessionId,
      state,
      characterId: playerId,
      characterName: character?.name ?? 'Unknown',
      opponentName: monsterCombatant?.name ?? 'Unknown Monster',
      townId: character?.currentTownId ?? null,
      characterStartHp: playerCombatant?.maxHp ?? 0,
      opponentStartHp: monsterCombatant?.maxHp ?? 0,
      characterWeapon: weaponName,
      opponentWeapon: monsterCombatant?.weapon?.name ?? 'Natural Attack',
      xpAwarded,
      goldAwarded,
      lootDropped,
      outcome,
    });
  }

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
    currentTurn: state.status === 'ACTIVE' ? state.turnOrder[state.turnIndex] : null,
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
