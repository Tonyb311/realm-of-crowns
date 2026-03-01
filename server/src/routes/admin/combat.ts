import { Router, Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate';
import { prisma } from '../../lib/prisma';
import { logRouteError } from '../../lib/error-logger';
import { AuthenticatedRequest } from '../../types/express';
import { getAllRaces } from '@shared/data/races';
import {
  ALL_ABILITIES,
  ABILITIES_BY_CLASS,
  SPECIALIZATIONS,
  VALID_CLASSES,
} from '@shared/data/skills';
import {
  ALL_PROCESSING_RECIPES,
  ALL_WEAPON_RECIPES,
  ALL_ARMOR_RECIPES,
  ALL_CONSUMABLE_RECIPES,
  ALL_ACCESSORY_RECIPES,
  ALL_FINISHED_GOODS_RECIPES,
} from '@shared/data/recipes';
import {
  STATUS_EFFECT_DEFS,
  createCombatState,
  createCharacterCombatant,
  createMonsterCombatant,
  resolveTurn,
} from '../../lib/combat-engine';
import type { WeaponInfo, CombatAction, StatusEffect } from '@shared/types/combat';

const router = Router();

// ---- Codex Endpoints (static data) ----

// GET /codex/races — All 20 races with stats, abilities, profession bonuses
router.get('/codex/races', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const races = getAllRaces().map((r) => ({
      id: r.id,
      name: r.name,
      tier: r.tier,
      lore: r.lore,
      trait: r.trait,
      statModifiers: r.statModifiers,
      abilities: r.abilities,
      professionBonuses: r.professionBonuses,
      gatheringBonuses: r.gatheringBonuses ?? [],
      subRaces: r.subRaces ?? [],
      homelandRegion: r.homelandRegion,
      startingTowns: r.startingTowns,
      exclusiveZone: r.exclusiveZone ?? null,
    }));

    return res.json({ races, total: races.length });
  } catch (error) {
    logRouteError(_req, 500, 'Admin combat codex races error', error);
    return res.status(500).json({ error: 'Failed to load race codex' });
  }
});

// GET /codex/classes — 7 classes with 21 specializations and all abilities
router.get('/codex/classes', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const classes = VALID_CLASSES.map((className) => ({
      name: className,
      specializations: SPECIALIZATIONS[className] ?? [],
      abilities: (ABILITIES_BY_CLASS[className] ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        class: a.class,
        specialization: a.specialization,
        tier: a.tier,
        effects: a.effects,
        cooldown: a.cooldown,
        levelRequired: a.levelRequired,
        prerequisiteAbilityId: a.prerequisiteAbilityId ?? null,
      })),
    }));

    return res.json({
      classes,
      totalClasses: classes.length,
      totalAbilities: ALL_ABILITIES.length,
    });
  } catch (error) {
    logRouteError(_req, 500, 'Admin combat codex classes error', error);
    return res.status(500).json({ error: 'Failed to load class codex' });
  }
});

// GET /codex/items — All recipes grouped by category
router.get('/codex/items', (_req: AuthenticatedRequest, res: Response) => {
  try {
    return res.json({
      weapons: ALL_WEAPON_RECIPES,
      armor: ALL_ARMOR_RECIPES,
      consumables: ALL_CONSUMABLE_RECIPES,
      accessories: ALL_ACCESSORY_RECIPES,
      processing: ALL_PROCESSING_RECIPES,
      finishedGoods: ALL_FINISHED_GOODS_RECIPES,
      totals: {
        weapons: ALL_WEAPON_RECIPES.length,
        armor: ALL_ARMOR_RECIPES.length,
        consumables: ALL_CONSUMABLE_RECIPES.length,
        accessories: ALL_ACCESSORY_RECIPES.length,
        processing: ALL_PROCESSING_RECIPES.length,
      },
    });
  } catch (error) {
    logRouteError(_req, 500, 'Admin combat codex items error', error);
    return res.status(500).json({ error: 'Failed to load item codex' });
  }
});

// GET /codex/status-effects — All 22 status effects with serialized values
router.get('/codex/status-effects', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const dummyEffect = (n: string): StatusEffect => ({
      id: 'dummy', name: n as any, remainingRounds: 1, sourceId: 'dummy',
    });
    const effects = Object.entries(STATUS_EFFECT_DEFS).map(([name, def]) => ({
      name,
      preventsAction: def.preventsAction,
      hasDot: def.dotDamage(dummyEffect(name)) > 0,
      dotDamageBase: def.dotDamage(dummyEffect(name)),
      hasHot: def.hotHealing(dummyEffect(name)) > 0,
      hotHealingBase: def.hotHealing(dummyEffect(name)),
      attackModifier: def.attackModifier,
      acModifier: def.acModifier,
      saveModifier: def.saveModifier,
    }));

    return res.json({ effects, total: effects.length });
  } catch (error) {
    logRouteError(_req, 500, 'Admin combat codex status-effects error', error);
    return res.status(500).json({ error: 'Failed to load status effects codex' });
  }
});

// ---- History Endpoints ----

// GET /history — Paginated combat session list with filters
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const skip = (page - 1) * limit;

    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const characterSearch = req.query.character as string | undefined;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.startedAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      };
    }
    if (characterSearch) {
      where.participants = {
        some: {
          character: {
            name: { contains: characterSearch, mode: 'insensitive' },
          },
        },
      };
    }

    const [sessions, total] = await Promise.all([
      prisma.combatSession.findMany({
        where,
        include: {
          participants: {
            include: {
              character: {
                select: { id: true, name: true, race: true, class: true, level: true },
              },
            },
          },
          _count: { select: { combatLogs: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.combatSession.count({ where }),
    ]);

    return res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        type: s.type,
        status: s.status,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        participants: s.participants.map((p) => ({
          id: p.id,
          team: p.team,
          initiative: p.initiative,
          currentHp: p.currentHp,
          character: p.character,
        })),
        logCount: s._count.combatLogs,
        attackerParams: s.attackerParams,
        defenderParams: s.defenderParams,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logRouteError(req, 500, 'Admin combat history error', error);
    return res.status(500).json({ error: 'Failed to load combat history' });
  }
});

// GET /session/:id — Single combat session with full logs
router.get('/session/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = await prisma.combatSession.findUnique({
      where: { id: req.params.id },
      include: {
        combatLogs: { orderBy: { createdAt: 'asc' } },
        participants: {
          include: {
            character: {
              select: { id: true, name: true, race: true, class: true, level: true },
            },
          },
        },
        locationTown: { select: { id: true, name: true } },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Combat session not found' });
    }

    return res.json({
      id: session.id,
      type: session.type,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      location: session.locationTown,
      attackerParams: session.attackerParams,
      defenderParams: session.defenderParams,
      participants: session.participants.map((p) => ({
        id: p.id,
        team: p.team,
        initiative: p.initiative,
        currentHp: p.currentHp,
        character: p.character,
      })),
      logs: session.combatLogs.map((l) => ({
        id: l.id,
        round: l.round,
        actorId: l.actorId,
        action: l.action,
        result: l.result,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    logRouteError(req, 500, 'Admin combat session detail error', error);
    return res.status(500).json({ error: 'Failed to load combat session' });
  }
});

// ---- Stats Endpoint ----

// GET /stats — Aggregate combat statistics
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalFights,
      completedFights,
      fightsByType,
      recentSessions,
      topMonsterAttackers,
    ] = await Promise.all([
      prisma.combatSession.count(),
      prisma.combatSession.count({ where: { status: 'COMPLETED' } }),
      prisma.combatSession.groupBy({
        by: ['type'],
        _count: true,
      }),
      prisma.combatSession.findMany({
        where: { startedAt: { gte: thirtyDaysAgo } },
        select: { startedAt: true, type: true, status: true, log: true },
        orderBy: { startedAt: 'asc' },
      }),
      // Top monsters by encounter frequency (from attacker/defender params)
      prisma.combatSession.findMany({
        where: { type: 'PVE', status: 'COMPLETED' },
        select: { defenderParams: true },
        take: 1000,
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    // Compute fights per day for last 30 days
    const fightsPerDay: Record<string, number> = {};
    for (const s of recentSessions) {
      const day = s.startedAt.toISOString().slice(0, 10);
      fightsPerDay[day] = (fightsPerDay[day] ?? 0) + 1;
    }

    // Compute win/loss/flee from logs
    let wins = 0;
    let losses = 0;
    let flees = 0;
    for (const s of recentSessions) {
      const log = s.log as unknown[];
      if (!Array.isArray(log)) continue;
      // Check the session log JSON for outcome hints
      const logStr = JSON.stringify(log);
      if (logStr.includes('"FLED"') || logStr.includes('"flee"')) flees++;
      else if (s.status === 'COMPLETED') wins++;
    }
    losses = completedFights - wins - flees;

    // Count monster encounters
    const monsterCounts: Record<string, number> = {};
    for (const s of topMonsterAttackers) {
      const params = s.defenderParams as Record<string, unknown> | null;
      if (params?.name) {
        const name = String(params.name);
        monsterCounts[name] = (monsterCounts[name] ?? 0) + 1;
      }
    }
    const topMonsters = Object.entries(monsterCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return res.json({
      totalFights,
      completedFights,
      fightsByType: fightsByType.map((f) => ({ type: f.type, count: f._count })),
      fightsPerDay: Object.entries(fightsPerDay).map(([date, count]) => ({ date, count })),
      outcomes: { wins, losses, flees },
      topMonsters,
    });
  } catch (error) {
    logRouteError(req, 500, 'Admin combat stats error', error);
    return res.status(500).json({ error: 'Failed to load combat stats' });
  }
});

// ---- Simulator Endpoint ----

const simulateSchema = z.object({
  playerLevel: z.number().int().min(1).max(100).default(1),
  playerStats: z.object({
    str: z.number().int().min(1).max(30).default(10),
    dex: z.number().int().min(1).max(30).default(10),
    con: z.number().int().min(1).max(30).default(10),
    int: z.number().int().min(1).max(30).default(10),
    wis: z.number().int().min(1).max(30).default(10),
    cha: z.number().int().min(1).max(30).default(10),
  }).default({}),
  playerAC: z.number().int().min(1).max(30).default(10),
  playerHP: z.number().int().min(1).max(500).optional(),
  playerWeapon: z.object({
    name: z.string().default('Longsword'),
    diceCount: z.number().int().min(1).default(1),
    diceSides: z.number().int().min(1).default(8),
    bonusDamage: z.number().int().default(0),
    bonusAttack: z.number().int().default(0),
    damageModifierStat: z.enum(['str', 'dex']).default('str'),
    attackModifierStat: z.enum(['str', 'dex']).default('str'),
  }).default({}),
  monsterName: z.string().default('Goblin'),
  monsterLevel: z.number().int().min(1).max(100).default(1),
  monsterStats: z.object({
    str: z.number().int().min(1).max(30).default(10),
    dex: z.number().int().min(1).max(30).default(10),
    con: z.number().int().min(1).max(30).default(10),
    int: z.number().int().min(1).max(30).default(10),
    wis: z.number().int().min(1).max(30).default(10),
    cha: z.number().int().min(1).max(30).default(10),
  }).default({}),
  monsterHP: z.number().int().min(1).max(1000).default(20),
  monsterAC: z.number().int().min(1).max(30).default(12),
  monsterDamage: z.string().default('1d6+2'),
  monsterAttackBonus: z.number().int().default(3),
  iterations: z.number().int().min(1).max(1000).default(1),
});

// POST /simulate — Run combat simulations
router.post('/simulate', validate(simulateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = req.body;
    const iterations = config.iterations;
    const maxRounds = 50; // Safety cap

    // Build player weapon
    const playerWeapon: WeaponInfo = {
      id: 'sim-weapon',
      name: config.playerWeapon.name,
      diceCount: config.playerWeapon.diceCount,
      diceSides: config.playerWeapon.diceSides,
      bonusDamage: config.playerWeapon.bonusDamage,
      bonusAttack: config.playerWeapon.bonusAttack,
      damageModifierStat: config.playerWeapon.damageModifierStat,
      attackModifierStat: config.playerWeapon.attackModifierStat,
    };

    // Build monster weapon from damage string
    const monsterDmgMatch = config.monsterDamage.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
    const monsterWeapon: WeaponInfo = {
      id: 'monster-attack',
      name: 'Natural Attack',
      diceCount: monsterDmgMatch ? parseInt(monsterDmgMatch[1]) : 1,
      diceSides: monsterDmgMatch ? parseInt(monsterDmgMatch[2]) : 6,
      bonusDamage: monsterDmgMatch?.[3] ? parseInt(monsterDmgMatch[3]) : 0,
      bonusAttack: config.monsterAttackBonus,
      damageModifierStat: 'str',
      attackModifierStat: 'str',
    };

    // Player HP defaults to 10 + CON mod * level
    const conMod = Math.floor((config.playerStats.con - 10) / 2);
    const playerHP = config.playerHP ?? Math.max(1, 10 + conMod + (config.playerLevel - 1) * (6 + conMod));

    const results: Array<{
      winner: string;
      rounds: number;
      playerHpRemaining: number;
      monsterHpRemaining: number;
      logs?: unknown[];
    }> = [];

    for (let i = 0; i < iterations; i++) {
      const player = createCharacterCombatant(
        'sim-player', 'Player', 0,
        config.playerStats, config.playerLevel,
        playerHP, playerHP,
        config.playerAC, playerWeapon, {}, 2,
      );

      const monster = createMonsterCombatant(
        'sim-monster', config.monsterName, 1,
        config.monsterStats, config.monsterLevel,
        config.monsterHP, config.monsterAC,
        monsterWeapon, 2,
      );

      let state = createCombatState(`sim-${i}`, 'PVE', [player, monster]);
      const combatLogs: unknown[] = [];

      let round = 0;
      while (state.status === 'ACTIVE' && round < maxRounds) {
        round++;
        // Process turns for all combatants in the turn order
        for (let t = 0; t < state.turnOrder.length && state.status === 'ACTIVE'; t++) {
          const actorId = state.turnOrder[state.turnIndex];
          const actor = state.combatants.find((c) => c.id === actorId);
          if (!actor || !actor.isAlive) {
            // Advance turn for dead combatant
            state = resolveTurn(state, {
              type: 'defend',
              actorId,
              targetId: actorId,
            }, {});
            continue;
          }

          // Pick target: first alive enemy
          const isPlayer = actor.id === 'sim-player';
          const target = state.combatants.find(
            (c) => c.team !== actor.team && c.isAlive,
          );

          const action: CombatAction = {
            type: 'attack',
            actorId: actor.id,
            targetId: target?.id ?? actor.id,
          };

          const weapon = isPlayer ? playerWeapon : monsterWeapon;
          state = resolveTurn(state, action, { weapon });

          if (iterations <= 10 && state.log.length > combatLogs.length) {
            combatLogs.push(...state.log.slice(combatLogs.length));
          }
        }
      }

      const playerResult = state.combatants.find((c) => c.id === 'sim-player');
      const monsterResult = state.combatants.find((c) => c.id === 'sim-monster');
      const winner = state.winningTeam === 0 ? 'player'
        : state.winningTeam === 1 ? 'monster'
        : 'draw';

      results.push({
        winner,
        rounds: state.round,
        playerHpRemaining: playerResult?.currentHp ?? 0,
        monsterHpRemaining: monsterResult?.currentHp ?? 0,
        ...(iterations <= 10 ? { logs: combatLogs } : {}),
      });
    }

    // Compute aggregates
    const playerWins = results.filter((r) => r.winner === 'player').length;
    const monsterWins = results.filter((r) => r.winner === 'monster').length;
    const draws = results.filter((r) => r.winner === 'draw').length;
    const avgRounds = results.reduce((sum, r) => sum + r.rounds, 0) / results.length;
    const avgPlayerHpRemaining = results
      .filter((r) => r.winner === 'player')
      .reduce((sum, r) => sum + r.playerHpRemaining, 0) / (playerWins || 1);

    return res.json({
      config: {
        playerLevel: config.playerLevel,
        playerHP,
        playerAC: config.playerAC,
        playerStats: config.playerStats,
        playerWeapon: config.playerWeapon,
        monsterName: config.monsterName,
        monsterLevel: config.monsterLevel,
        monsterHP: config.monsterHP,
        monsterAC: config.monsterAC,
        monsterDamage: config.monsterDamage,
        iterations,
      },
      summary: {
        playerWins,
        monsterWins,
        draws,
        playerWinRate: +(playerWins / iterations * 100).toFixed(1),
        avgRounds: +avgRounds.toFixed(1),
        avgPlayerHpRemaining: +avgPlayerHpRemaining.toFixed(0),
      },
      results: iterations <= 10 ? results : results.map(({ winner, rounds, playerHpRemaining, monsterHpRemaining }) => ({
        winner, rounds, playerHpRemaining, monsterHpRemaining,
      })),
    });
  } catch (error: unknown) {
    logRouteError(req, 500, 'Admin combat simulate error', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Simulation failed' });
  }
});

export default router;
