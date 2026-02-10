import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { validate } from '../middleware/validate';
import { authGuard } from '../middleware/auth';
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
  SpellInfo,
  ItemInfo,
  CharacterStats,
} from '@shared/types/combat';
import { getProficiencyBonus } from '@shared/utils/bounded-accuracy';
import { emitCombatResult } from '../socket/events';
import { checkLevelUp } from '../services/progression';
import { checkAchievements } from '../services/achievements';
import { redis } from '../lib/redis';
import { ACTION_XP } from '@shared/data/progression';
import { isSameAccount } from '../lib/alt-guard';

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
  weapon: z
    .object({
      id: z.string(),
      name: z.string(),
      diceCount: z.number().int().min(1),
      diceSides: z.number().int().min(1),
      damageModifierStat: z.enum(['str', 'dex']),
      attackModifierStat: z.enum(['str', 'dex']),
      bonusDamage: z.number().int(),
      bonusAttack: z.number().int(),
    })
    .optional(),
  spell: z
    .object({
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
    })
    .optional(),
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

// ---- Helpers ----

async function getCharacterForUser(userId: string) {
  return prisma.character.findFirst({ where: { userId } });
}

async function isInActiveCombat(characterId: string): Promise<boolean> {
  const active = await prisma.combatParticipant.findFirst({
    where: {
      characterId,
      session: { status: { in: ['active', 'pending'] } },
    },
  });
  return !!active;
}

async function isTraveling(characterId: string): Promise<boolean> {
  const travel = await prisma.travelAction.findFirst({
    where: { characterId, status: 'IN_PROGRESS' },
  });
  return !!travel;
}

async function isCrafting(characterId: string): Promise<boolean> {
  const crafting = await prisma.craftingAction.findFirst({
    where: { characterId, status: 'IN_PROGRESS' },
  });
  return !!crafting;
}

async function getRecentChallenge(
  challengerId: string,
  targetId: string
): Promise<boolean> {
  const cutoff = new Date(Date.now() - CHALLENGE_COOLDOWN_MS);
  const recent = await prisma.combatSession.findFirst({
    where: {
      type: 'DUEL',
      startedAt: { gte: cutoff },
      participants: {
        every: {
          characterId: { in: [challengerId, targetId] },
        },
      },
    },
    orderBy: { startedAt: 'desc' },
  });
  return !!recent;
}

// ---- POST /challenge ----

router.post(
  '/challenge',
  authGuard,
  validate(challengeSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { targetCharacterId, wager } = req.body;
      const challenger = await getCharacterForUser(req.user!.userId);

      if (!challenger) {
        return res.status(404).json({ error: 'No character found' });
      }

      if (challenger.id === targetCharacterId) {
        return res.status(400).json({ error: 'Cannot challenge yourself' });
      }

      // Alt-account check
      if (await isSameAccount(challenger.id, targetCharacterId)) {
        return res.status(400).json({ error: 'Cannot challenge your own characters' });
      }

      const target = await prisma.character.findUnique({
        where: { id: targetCharacterId },
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
      const session = await prisma.combatSession.create({
        data: {
          type: 'DUEL',
          status: 'pending',
          locationTownId: challenger.currentTownId,
          log: { challengerId: challenger.id, targetId: target.id, wager: wagerAmount },
        },
      });

      // Create participant entries (both pending)
      await prisma.combatParticipant.createMany({
        data: [
          { sessionId: session.id, characterId: challenger.id, team: 0, currentHp: challenger.health },
          { sessionId: session.id, characterId: target.id, team: 1, currentHp: target.health },
        ],
      });

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
      console.error('PvP challenge error:', error);
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
      const character = await getCharacterForUser(req.user!.userId);

      if (!character) {
        return res.status(404).json({ error: 'No character found' });
      }

      const session = await prisma.combatSession.findUnique({
        where: { id: sessionId },
        include: {
          participants: {
            include: {
              character: true,
            },
          },
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Combat session not found' });
      }

      if (session.status !== 'pending') {
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
        const challengerChar = session.participants.find(
          (p) => p.characterId === sessionLog.challengerId
        )?.character;
        if (!challengerChar || challengerChar.gold < wagerAmount) {
          // Cancel the challenge if challenger can no longer afford it
          await prisma.combatSession.update({
            where: { id: sessionId },
            data: { status: 'cancelled' },
          });
          return res.status(400).json({ error: 'Challenger no longer has enough gold for the wager' });
        }
        if (character.gold < wagerAmount) {
          return res.status(400).json({ error: 'You no longer have enough gold for the wager' });
        }
      }

      // Build combatants for the engine
      const combatants = session.participants.map((p) => {
        const stats = (p.character.stats as unknown as CharacterStats) ?? {
          str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
        };

        return createCharacterCombatant(
          p.characterId,
          p.character.name,
          p.team,
          stats,
          p.character.level,
          p.character.health,
          p.character.maxHealth,
          p.character.mana,
          p.character.maxMana,
          0, // equipmentAC — would need equipment lookup; 0 means compute from stats
          null, // weapon — provided per action
          {}, // spellSlots
          getProficiencyBonus(p.character.level),
        );
      });

      // Create combat state and roll initiative
      const combatState = createCombatState(sessionId, 'DUEL', combatants);
      await setPvpCombatState(sessionId, combatState);

      // Update DB: set session active, write initiative to participants
      await prisma.$transaction([
        prisma.combatSession.update({
          where: { id: sessionId },
          data: { status: 'active', startedAt: new Date() },
        }),
        ...combatState.combatants.map((c) =>
          prisma.combatParticipant.updateMany({
            where: { sessionId, characterId: c.id },
            data: { initiative: c.initiative, currentHp: c.currentHp },
          })
        ),
      ]);

      const currentTurnId = combatState.turnOrder[combatState.turnIndex];

      return res.json({
        session: {
          id: sessionId,
          status: 'active',
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
      console.error('PvP accept error:', error);
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
      const character = await getCharacterForUser(req.user!.userId);

      if (!character) {
        return res.status(404).json({ error: 'No character found' });
      }

      const session = await prisma.combatSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return res.status(404).json({ error: 'Combat session not found' });
      }

      if (session.status !== 'pending') {
        return res.status(400).json({ error: 'Challenge is no longer pending' });
      }

      const sessionLog = session.log as { targetId: string };
      if (sessionLog.targetId !== character.id) {
        return res.status(403).json({ error: 'Only the challenged player can decline' });
      }

      await prisma.combatSession.update({
        where: { id: sessionId },
        data: { status: 'cancelled', endedAt: new Date() },
      });

      return res.json({ session: { id: sessionId, status: 'cancelled' } });
    } catch (error) {
      console.error('PvP decline error:', error);
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
      const { sessionId, action, weapon, spell, item } = req.body;
      const character = await getCharacterForUser(req.user!.userId);

      if (!character) {
        return res.status(404).json({ error: 'No character found' });
      }

      // Get or restore combat state
      let combatState = await getPvpCombatState(sessionId);

      if (!combatState) {
        // Try to restore from DB
        const session = await prisma.combatSession.findUnique({
          where: { id: sessionId },
          include: {
            participants: { include: { character: true } },
          },
        });

        if (!session || session.status !== 'active') {
          return res.status(404).json({ error: 'No active combat session found' });
        }

        // Verify player is a participant
        const isParticipant = session.participants.some(
          (p) => p.characterId === character.id
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
      if (combatState.status !== 'active') {
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

      // Resolve the turn
      combatState = resolveTurn(combatState, combatAction, {
        weapon: weapon as WeaponInfo | undefined,
        spell: spell as SpellInfo | undefined,
        item: item as ItemInfo | undefined,
      });

      await setPvpCombatState(sessionId, combatState);

      // Log the action to DB
      const lastLog = combatState.log[combatState.log.length - 1];
      await prisma.combatLog.create({
        data: {
          sessionId,
          round: lastLog.round,
          actorId: lastLog.actorId,
          action: lastLog.action,
          result: lastLog.result as any,
        },
      });

      // Update participant HP in DB
      await Promise.all(
        combatState.combatants.map((c) =>
          prisma.combatParticipant.updateMany({
            where: { sessionId, characterId: c.id },
            data: { currentHp: c.currentHp },
          })
        )
      );

      // Check for combat end
      if (combatState.status === 'completed') {
        await finalizePvpMatch(sessionId, combatState);
      }

      const response: any = {
        session: {
          id: sessionId,
          status: combatState.status,
          round: combatState.round,
          currentTurn:
            combatState.status === 'active'
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

      if (combatState.status === 'completed') {
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
      console.error('PvP action error:', error);
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
      const character = await getCharacterForUser(req.user!.userId);
      if (!character) {
        return res.status(404).json({ error: 'No character found' });
      }

      const sessionId = req.query.sessionId as string | undefined;

      // Find the player's active PvP session
      const participant = await prisma.combatParticipant.findFirst({
        where: {
          characterId: character.id,
          session: {
            type: { in: ['DUEL', 'ARENA', 'PVP'] },
            status: 'active',
            ...(sessionId ? { id: sessionId } : {}),
          },
        },
        include: {
          session: {
            include: {
              participants: {
                include: { character: { select: { id: true, name: true, level: true } } },
              },
            },
          },
        },
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
            status: participant.session.status,
            participants: participant.session.participants.map((p) => ({
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
          log: combatState.log,
        },
      });
    } catch (error) {
      console.error('PvP state error:', error);
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
      const character = await getCharacterForUser(req.user!.userId);
      if (!character) {
        return res.status(404).json({ error: 'No character found' });
      }

      // Find all pending DUEL sessions where this player is a participant
      const participations = await prisma.combatParticipant.findMany({
        where: {
          characterId: character.id,
          session: { type: 'DUEL', status: 'pending' },
        },
        include: {
          session: {
            include: {
              participants: {
                include: {
                  character: {
                    select: { id: true, name: true, level: true },
                  },
                },
              },
              locationTown: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { session: { startedAt: 'desc' } },
      });

      const challenges = participations.map((p) => {
        const sessionLog = p.session.log as {
          challengerId: string;
          targetId: string;
          wager: number;
        };
        const isChallenger = sessionLog.challengerId === character.id;
        const opponent = p.session.participants.find(
          (part) => part.characterId !== character.id
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
          town: p.session.locationTown,
          createdAt: p.session.startedAt.toISOString(),
        };
      });

      return res.json({ challenges });
    } catch (error) {
      console.error('PvP challenges error:', error);
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
      // Get all completed PvP sessions
      const completedSessions = await prisma.combatSession.findMany({
        where: {
          type: { in: ['DUEL', 'ARENA'] },
          status: 'completed',
        },
        include: {
          participants: {
            include: {
              character: {
                select: { id: true, name: true, level: true },
              },
            },
          },
        },
      });

      // Tally wins and losses per character
      const stats = new Map<
        string,
        { id: string; name: string; level: number; wins: number; losses: number }
      >();

      for (const session of completedSessions) {
        const sessionLog = session.log as { winnerId?: string } | null;
        const winnerId = sessionLog?.winnerId;

        for (const participant of session.participants) {
          const charId = participant.characterId;
          if (!stats.has(charId)) {
            stats.set(charId, {
              id: charId,
              name: participant.character.name,
              level: participant.character.level,
              wins: 0,
              losses: 0,
            });
          }
          const entry = stats.get(charId)!;
          if (winnerId === charId) {
            entry.wins++;
          } else if (winnerId) {
            entry.losses++;
          }
        }
      }

      const leaderboard = [...stats.values()]
        .map((entry) => ({
          ...entry,
          totalMatches: entry.wins + entry.losses,
          winRate:
            entry.wins + entry.losses > 0
              ? Math.round((entry.wins / (entry.wins + entry.losses)) * 100)
              : 0,
        }))
        .sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          return a.losses - b.losses;
        });

      return res.json({ leaderboard });
    } catch (error) {
      console.error('PvP leaderboard error:', error);
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
  const session = await prisma.combatSession.findUnique({
    where: { id: sessionId },
  });
  const sessionLog = (session?.log ?? {}) as {
    challengerId: string;
    targetId: string;
    wager: number;
    winnerId?: string;
  };
  const wager = sessionLog.wager ?? 0;

  // Calculate rewards
  const xpReward = XP_PER_OPPONENT_LEVEL * loser.level;
  const wagerWinnings = wager > 0 ? Math.floor(wager * 2 * (1 - WAGER_TAX_RATE)) : 0;

  // Update session log with winner
  sessionLog.winnerId = winner.id;

  await prisma.$transaction([
    // End the session
    prisma.combatSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        endedAt: new Date(),
        log: sessionLog as any,
      },
    }),
    // Winner: grant XP + wager winnings, heal to full
    prisma.character.update({
      where: { id: winner.id },
      data: {
        xp: { increment: xpReward },
        gold: wager > 0 ? { increment: wagerWinnings - wager } : undefined,
        health: winner.maxHp,
      },
    }),
    // Loser: deduct wager, heal to full
    prisma.character.update({
      where: { id: loser.id },
      data: {
        gold: wager > 0 ? { decrement: wager } : undefined,
        health: loser.maxHp,
      },
    }),
  ]);

  // Check for level up after XP grant
  await checkLevelUp(winner.id);

  // Check PvP combat achievements for winner
  const pvpWins = await prisma.combatParticipant.count({
    where: {
      characterId: winner.id,
      session: { type: { in: ['DUEL', 'ARENA', 'PVP'] }, status: 'completed' },
      currentHp: { gt: 0 },
    },
  });
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
}

// ---- Spar cooldown tracking (in-memory) ----

const sparCooldowns = new Map<string, number>();
const SPAR_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const SPAR_MAX_LEVEL_DIFF = 10;

function getSparCooldownKey(id1: string, id2: string): string {
  const sorted = [id1, id2].sort();
  return `${sorted[0]}:${sorted[1]}`;
}

function isOnSparCooldown(id1: string, id2: string): boolean {
  const key = getSparCooldownKey(id1, id2);
  const expiry = sparCooldowns.get(key);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    sparCooldowns.delete(key);
    return false;
  }
  return true;
}

function setSparCooldown(id1: string, id2: string): void {
  const key = getSparCooldownKey(id1, id2);
  sparCooldowns.set(key, Date.now() + SPAR_COOLDOWN_MS);
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
      const challenger = await getCharacterForUser(req.user!.userId);

      if (!challenger) {
        return res.status(404).json({ error: 'No character found' });
      }

      if (challenger.id === targetCharacterId) {
        return res.status(400).json({ error: 'Cannot spar yourself' });
      }

      // Alt-account check
      if (await isSameAccount(challenger.id, targetCharacterId)) {
        return res.status(400).json({ error: 'Cannot challenge your own characters' });
      }

      const target = await prisma.character.findUnique({
        where: { id: targetCharacterId },
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
      if (isOnSparCooldown(challenger.id, target.id)) {
        return res.status(400).json({
          error: 'Must wait 5 minutes before sparring with this player again',
        });
      }

      // Create pending SPAR session — save pre-spar HP/mana for restoration
      const session = await prisma.combatSession.create({
        data: {
          type: 'SPAR',
          status: 'pending',
          locationTownId: challenger.currentTownId,
          log: {
            challengerId: challenger.id,
            targetId: target.id,
            wager: 0,
          },
          attackerParams: {
            hp: challenger.health,
            mana: challenger.mana,
          },
          defenderParams: {
            hp: target.health,
            mana: target.mana,
          },
        },
      });

      // Create participant entries
      await prisma.combatParticipant.createMany({
        data: [
          { sessionId: session.id, characterId: challenger.id, team: 0, currentHp: challenger.health },
          { sessionId: session.id, characterId: target.id, team: 1, currentHp: target.health },
        ],
      });

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
      console.error('PvP spar challenge error:', error);
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
      const character = await getCharacterForUser(req.user!.userId);

      if (!character) {
        return res.status(404).json({ error: 'No character found' });
      }

      const session = await prisma.combatSession.findUnique({
        where: { id: sessionId },
        include: {
          participants: {
            include: { character: true },
          },
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Combat session not found' });
      }

      if (session.type !== 'SPAR') {
        return res.status(400).json({ error: 'Session is not a spar' });
      }

      if (session.status !== 'pending') {
        return res.status(400).json({ error: 'Spar challenge is no longer pending' });
      }

      const sessionLog = session.log as { challengerId: string; targetId: string };
      if (sessionLog.targetId !== character.id) {
        return res.status(403).json({ error: 'Only the challenged player can accept' });
      }

      // Build combatants for the engine
      const combatants = session.participants.map((p) => {
        const stats = (p.character.stats as unknown as CharacterStats) ?? {
          str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
        };

        return createCharacterCombatant(
          p.characterId,
          p.character.name,
          p.team,
          stats,
          p.character.level,
          p.character.health,
          p.character.maxHealth,
          p.character.mana,
          p.character.maxMana,
          0,
          null,
          {},
          getProficiencyBonus(p.character.level),
        );
      });

      // Create combat state and roll initiative (use 'DUEL' engine type — DB tracks SPAR separately)
      const combatState = createCombatState(sessionId, 'DUEL', combatants);
      await setPvpCombatState(sessionId, combatState);

      // Update DB: set session active, write initiative to participants
      await prisma.$transaction([
        prisma.combatSession.update({
          where: { id: sessionId },
          data: { status: 'active', startedAt: new Date() },
        }),
        ...combatState.combatants.map((c) =>
          prisma.combatParticipant.updateMany({
            where: { sessionId, characterId: c.id },
            data: { initiative: c.initiative, currentHp: c.currentHp },
          })
        ),
      ]);

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
          status: 'active',
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
      console.error('PvP spar-accept error:', error);
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
      const character = await getCharacterForUser(req.user!.userId);

      if (!character) {
        return res.status(404).json({ error: 'No character found' });
      }

      const session = await prisma.combatSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        return res.status(404).json({ error: 'Combat session not found' });
      }

      if (session.type !== 'SPAR') {
        return res.status(400).json({ error: 'Session is not a spar' });
      }

      if (session.status !== 'pending') {
        return res.status(400).json({ error: 'Spar challenge is no longer pending' });
      }

      const sessionLog = session.log as { challengerId: string; targetId: string };
      if (sessionLog.targetId !== character.id) {
        return res.status(403).json({ error: 'Only the challenged player can decline' });
      }

      await prisma.combatSession.update({
        where: { id: sessionId },
        data: { status: 'cancelled', endedAt: new Date() },
      });

      // Notify challenger
      emitCombatResult([sessionLog.challengerId], {
        sessionId,
        type: 'SPAR',
        result: 'draw',
        summary: `${character.name} declined your spar challenge.`,
      });

      return res.json({ session: { id: sessionId, status: 'cancelled' } });
    } catch (error) {
      console.error('PvP spar-decline error:', error);
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
      const { sessionId, action, weapon, spell, item } = req.body;
      const character = await getCharacterForUser(req.user!.userId);

      if (!character) {
        return res.status(404).json({ error: 'No character found' });
      }

      // Get or restore combat state
      let combatState = await getPvpCombatState(sessionId);

      if (!combatState) {
        const session = await prisma.combatSession.findUnique({
          where: { id: sessionId },
          include: {
            participants: { include: { character: true } },
          },
        });

        if (!session || session.status !== 'active' || session.type !== 'SPAR') {
          return res.status(404).json({ error: 'No active spar session found' });
        }

        const isParticipant = session.participants.some(
          (p) => p.characterId === character.id
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

      if (combatState.status !== 'active') {
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

      // Resolve the turn
      combatState = resolveTurn(combatState, combatAction, {
        weapon: weapon as WeaponInfo | undefined,
        spell: spell as SpellInfo | undefined,
        item: item as ItemInfo | undefined,
      });

      await setPvpCombatState(sessionId, combatState);

      // Log the action to DB
      const lastLog = combatState.log[combatState.log.length - 1];
      await prisma.combatLog.create({
        data: {
          sessionId,
          round: lastLog.round,
          actorId: lastLog.actorId,
          action: lastLog.action,
          result: lastLog.result as any,
        },
      });

      // Update participant HP in DB
      await Promise.all(
        combatState.combatants.map((c) =>
          prisma.combatParticipant.updateMany({
            where: { sessionId, characterId: c.id },
            data: { currentHp: c.currentHp },
          })
        )
      );

      // Check for combat end — use spar finalization (zero stakes)
      if (combatState.status === 'completed') {
        await finalizeSparMatch(sessionId, combatState);
      }

      const response: any = {
        session: {
          id: sessionId,
          type: 'SPAR',
          status: combatState.status,
          round: combatState.round,
          currentTurn:
            combatState.status === 'active'
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

      if (combatState.status === 'completed') {
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
      console.error('PvP spar-action error:', error);
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
      const character = await getCharacterForUser(req.user!.userId);
      if (!character) {
        return res.status(404).json({ error: 'No character found' });
      }

      // Find the player's active SPAR session
      const participant = await prisma.combatParticipant.findFirst({
        where: {
          characterId: character.id,
          session: {
            type: 'SPAR',
            status: 'active',
          },
        },
        include: {
          session: {
            include: {
              participants: {
                include: { character: { select: { id: true, name: true, level: true } } },
              },
            },
          },
        },
      });

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
            status: participant.session.status,
            participants: participant.session.participants.map((p) => ({
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
          log: combatState.log,
        },
      });
    } catch (error) {
      console.error('PvP spar-state error:', error);
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

  // Read pre-spar HP/mana from session
  const session = await prisma.combatSession.findUnique({
    where: { id: sessionId },
  });
  const attackerParams = (session?.attackerParams ?? {}) as { hp?: number; mana?: number };
  const defenderParams = (session?.defenderParams ?? {}) as { hp?: number; mana?: number };
  const sessionLog = (session?.log ?? {}) as { challengerId: string; targetId: string };

  // Determine which combatant is attacker vs defender
  const challengerId = sessionLog.challengerId;

  await prisma.$transaction([
    // End the session
    prisma.combatSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
        endedAt: new Date(),
        log: { ...sessionLog, winnerId: winner.id } as any,
      },
    }),
    // Restore challenger to pre-spar HP/mana
    prisma.character.update({
      where: { id: challengerId },
      data: {
        health: attackerParams.hp ?? winner.maxHp,
        mana: attackerParams.mana ?? 0,
      },
    }),
    // Restore target to pre-spar HP/mana
    prisma.character.update({
      where: { id: challengerId === winner.id ? loser.id : winner.id },
      data: {
        health: defenderParams.hp ?? loser.maxHp,
        mana: defenderParams.mana ?? 0,
      },
    }),
  ]);

  // Set 5-minute cooldown between these two players
  setSparCooldown(winner.id, loser.id);

  // Notify both participants (NO XP, NO achievements, NO leaderboard)
  emitCombatResult([winner.id, loser.id], {
    sessionId,
    type: 'SPAR',
    result: 'victory',
    summary: `Spar complete! ${winner.name} bested ${loser.name}.`,
  });

  // Clean up in-memory state
  await deletePvpCombatState(sessionId);
}

export default router;
