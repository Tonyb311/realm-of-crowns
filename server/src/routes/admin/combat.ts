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

// ---- Stats Endpoints (sourced from CombatEncounterLog) ----

// GET /stats — Aggregate combat statistics
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalEncounters,
      aggregates,
      byOutcome,
      byTriggerSource,
      byType,
      recentEncounters,
      raceClassData,
      pveData,
    ] = await Promise.all([
      prisma.combatEncounterLog.count(),
      prisma.combatEncounterLog.aggregate({
        _avg: { totalRounds: true },
        _sum: { xpAwarded: true, goldAwarded: true },
      }),
      prisma.combatEncounterLog.groupBy({ by: ['outcome'], _count: true }),
      prisma.combatEncounterLog.groupBy({ by: ['triggerSource'], _count: true }),
      prisma.combatEncounterLog.groupBy({ by: ['type'], _count: true }),
      prisma.combatEncounterLog.findMany({
        where: { startedAt: { gte: thirtyDaysAgo } },
        select: { startedAt: true, outcome: true },
        orderBy: { startedAt: 'asc' },
      }),
      prisma.combatEncounterLog.findMany({
        select: {
          characterId: true,
          outcome: true,
          characterStartHp: true,
          characterEndHp: true,
          character: { select: { race: true, class: true } },
        },
      }),
      prisma.combatEncounterLog.findMany({
        where: { type: 'pve' },
        select: { opponentName: true, outcome: true },
      }),
    ]);

    // Unique combatants
    const uniqueCombatants = new Set(raceClassData.map((e) => e.characterId)).size;

    // Win rate
    const winCount = byOutcome.find((o) => o.outcome === 'win')?._count ?? 0;
    const winRate = totalEncounters > 0 ? +(winCount / totalEncounters * 100).toFixed(1) : 0;

    // Avg HP remaining (%)
    let hpSum = 0;
    let hpCount = 0;
    for (const e of raceClassData) {
      if (e.characterStartHp > 0) {
        hpSum += (e.characterEndHp / e.characterStartHp) * 100;
        hpCount++;
      }
    }
    const avgHpRemaining = hpCount > 0 ? +(hpSum / hpCount).toFixed(1) : 0;

    // Encounters per day (last 30 days)
    const dayMap: Record<string, { count: number; wins: number; losses: number }> = {};
    for (const e of recentEncounters) {
      const day = e.startedAt.toISOString().slice(0, 10);
      if (!dayMap[day]) dayMap[day] = { count: 0, wins: 0, losses: 0 };
      dayMap[day].count++;
      if (e.outcome === 'win') dayMap[day].wins++;
      else if (e.outcome === 'loss') dayMap[day].losses++;
    }
    const encountersPerDay = Object.entries(dayMap)
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top 5 monsters (PvE only)
    const monsterMap: Record<string, { count: number; wins: number }> = {};
    for (const e of pveData) {
      if (!e.opponentName) continue;
      if (!monsterMap[e.opponentName]) monsterMap[e.opponentName] = { count: 0, wins: 0 };
      monsterMap[e.opponentName].count++;
      if (e.outcome === 'win') monsterMap[e.opponentName].wins++;
    }
    const topMonsters = Object.entries(monsterMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, d]) => ({
        name,
        count: d.count,
        playerWinRate: +(d.wins / d.count * 100).toFixed(1),
      }));

    // Top 5 races
    const raceMap: Record<string, { count: number; wins: number }> = {};
    for (const e of raceClassData) {
      const race = e.character?.race;
      if (!race) continue;
      if (!raceMap[race]) raceMap[race] = { count: 0, wins: 0 };
      raceMap[race].count++;
      if (e.outcome === 'win') raceMap[race].wins++;
    }
    const topRaces = Object.entries(raceMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([race, d]) => ({
        race,
        count: d.count,
        winRate: +(d.wins / d.count * 100).toFixed(1),
      }));

    // Top 5 classes (skip null)
    const classMap: Record<string, { count: number; wins: number }> = {};
    for (const e of raceClassData) {
      const cls = e.character?.class;
      if (!cls) continue;
      if (!classMap[cls]) classMap[cls] = { count: 0, wins: 0 };
      classMap[cls].count++;
      if (e.outcome === 'win') classMap[cls].wins++;
    }
    const topClasses = Object.entries(classMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([cls, d]) => ({
        class: cls,
        count: d.count,
        winRate: +(d.wins / d.count * 100).toFixed(1),
      }));

    // Balance alerts — flag win rates outside 35-85% with >10 encounters
    const balanceAlerts: Array<{
      entity: string;
      entityType: 'race' | 'class' | 'monster';
      winRate: number;
      encounters: number;
      severity: 'warning' | 'critical';
    }> = [];

    const checkBalance = (
      map: Record<string, { count: number; wins: number }>,
      entityType: 'race' | 'class' | 'monster',
    ) => {
      for (const [name, d] of Object.entries(map)) {
        if (d.count < 10) continue;
        const wr = +(d.wins / d.count * 100).toFixed(1);
        if (wr < 25 || wr > 95) {
          balanceAlerts.push({ entity: name, entityType, winRate: wr, encounters: d.count, severity: 'critical' });
        } else if (wr < 35 || wr > 85) {
          balanceAlerts.push({ entity: name, entityType, winRate: wr, encounters: d.count, severity: 'warning' });
        }
      }
    };

    checkBalance(raceMap, 'race');
    checkBalance(classMap, 'class');
    checkBalance(monsterMap, 'monster');

    return res.json({
      totalEncounters,
      uniqueCombatants,
      winRate,
      avgRounds: +(aggregates._avg.totalRounds ?? 0).toFixed(1),
      avgHpRemaining,
      totalXpAwarded: aggregates._sum.xpAwarded ?? 0,
      totalGoldAwarded: aggregates._sum.goldAwarded ?? 0,
      encountersPerDay,
      byOutcome: byOutcome.map((o) => ({ outcome: o.outcome, count: o._count })),
      byTriggerSource: byTriggerSource.map((s) => ({ source: s.triggerSource, count: s._count })),
      byType: byType.map((t) => ({ type: t.type, count: t._count })),
      topMonsters,
      topRaces,
      topClasses,
      balanceAlerts,
    });
  } catch (error) {
    logRouteError(req, 500, 'Admin combat stats error', error);
    return res.status(500).json({ error: 'Failed to load combat stats' });
  }
});

// GET /stats/by-race — Combat stats broken down by character race
router.get('/stats/by-race', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const encounters = await prisma.combatEncounterLog.findMany({
      select: {
        outcome: true,
        totalRounds: true,
        characterStartHp: true,
        characterEndHp: true,
        xpAwarded: true,
        characterWeapon: true,
        opponentName: true,
        type: true,
        character: { select: { race: true } },
      },
    });

    const raceMap: Record<string, {
      encounters: number; wins: number; losses: number; flees: number;
      totalRounds: number; hpSum: number; hpCount: number; totalXp: number;
      weapons: Record<string, number>;
      monsters: Record<string, { count: number; wins: number }>;
    }> = {};

    for (const e of encounters) {
      const race = e.character?.race;
      if (!race) continue;
      if (!raceMap[race]) {
        raceMap[race] = {
          encounters: 0, wins: 0, losses: 0, flees: 0,
          totalRounds: 0, hpSum: 0, hpCount: 0, totalXp: 0,
          weapons: {}, monsters: {},
        };
      }
      const r = raceMap[race];
      r.encounters++;
      if (e.outcome === 'win') r.wins++;
      else if (e.outcome === 'loss') r.losses++;
      else if (e.outcome === 'flee') r.flees++;
      r.totalRounds += e.totalRounds;
      if (e.characterStartHp > 0) {
        r.hpSum += (e.characterEndHp / e.characterStartHp) * 100;
        r.hpCount++;
      }
      r.totalXp += e.xpAwarded;
      if (e.characterWeapon) {
        r.weapons[e.characterWeapon] = (r.weapons[e.characterWeapon] ?? 0) + 1;
      }
      if (e.type === 'pve' && e.opponentName) {
        if (!r.monsters[e.opponentName]) r.monsters[e.opponentName] = { count: 0, wins: 0 };
        r.monsters[e.opponentName].count++;
        if (e.outcome === 'win') r.monsters[e.opponentName].wins++;
      }
    }

    const races = Object.entries(raceMap).map(([race, r]) => ({
      race,
      encounters: r.encounters,
      wins: r.wins,
      losses: r.losses,
      flees: r.flees,
      winRate: +(r.wins / r.encounters * 100).toFixed(1),
      avgRounds: +(r.totalRounds / r.encounters).toFixed(1),
      avgHpRemaining: r.hpCount > 0 ? +(r.hpSum / r.hpCount).toFixed(1) : 0,
      avgXpPerEncounter: +(r.totalXp / r.encounters).toFixed(0),
      topWeapons: Object.entries(r.weapons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([weapon, count]) => ({ weapon, count })),
      topMonsters: Object.entries(r.monsters)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([monster, d]) => ({
          monster,
          count: d.count,
          winRate: +(d.wins / d.count * 100).toFixed(1),
        })),
    }));

    return res.json({ races });
  } catch (error) {
    logRouteError(req, 500, 'Admin combat stats by-race error', error);
    return res.status(500).json({ error: 'Failed to load race combat stats' });
  }
});

// GET /stats/by-class — Combat stats broken down by character class
router.get('/stats/by-class', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const encounters = await prisma.combatEncounterLog.findMany({
      select: {
        outcome: true,
        totalRounds: true,
        characterStartHp: true,
        characterEndHp: true,
        xpAwarded: true,
        characterWeapon: true,
        opponentName: true,
        type: true,
        character: { select: { class: true } },
      },
    });

    const classMap: Record<string, {
      encounters: number; wins: number; losses: number; flees: number;
      totalRounds: number; hpSum: number; hpCount: number; totalXp: number;
      weapons: Record<string, number>;
      monsters: Record<string, { count: number; wins: number }>;
    }> = {};

    for (const e of encounters) {
      const cls = e.character?.class;
      if (!cls) continue;
      if (!classMap[cls]) {
        classMap[cls] = {
          encounters: 0, wins: 0, losses: 0, flees: 0,
          totalRounds: 0, hpSum: 0, hpCount: 0, totalXp: 0,
          weapons: {}, monsters: {},
        };
      }
      const c = classMap[cls];
      c.encounters++;
      if (e.outcome === 'win') c.wins++;
      else if (e.outcome === 'loss') c.losses++;
      else if (e.outcome === 'flee') c.flees++;
      c.totalRounds += e.totalRounds;
      if (e.characterStartHp > 0) {
        c.hpSum += (e.characterEndHp / e.characterStartHp) * 100;
        c.hpCount++;
      }
      c.totalXp += e.xpAwarded;
      if (e.characterWeapon) {
        c.weapons[e.characterWeapon] = (c.weapons[e.characterWeapon] ?? 0) + 1;
      }
      if (e.type === 'pve' && e.opponentName) {
        if (!c.monsters[e.opponentName]) c.monsters[e.opponentName] = { count: 0, wins: 0 };
        c.monsters[e.opponentName].count++;
        if (e.outcome === 'win') c.monsters[e.opponentName].wins++;
      }
    }

    const classes = Object.entries(classMap).map(([cls, c]) => ({
      class: cls,
      encounters: c.encounters,
      wins: c.wins,
      losses: c.losses,
      flees: c.flees,
      winRate: +(c.wins / c.encounters * 100).toFixed(1),
      avgRounds: +(c.totalRounds / c.encounters).toFixed(1),
      avgHpRemaining: c.hpCount > 0 ? +(c.hpSum / c.hpCount).toFixed(1) : 0,
      avgXpPerEncounter: +(c.totalXp / c.encounters).toFixed(0),
      topWeapons: Object.entries(c.weapons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([weapon, count]) => ({ weapon, count })),
      topMonsters: Object.entries(c.monsters)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([monster, d]) => ({
          monster,
          count: d.count,
          winRate: +(d.wins / d.count * 100).toFixed(1),
        })),
    }));

    return res.json({ classes });
  } catch (error) {
    logRouteError(req, 500, 'Admin combat stats by-class error', error);
    return res.status(500).json({ error: 'Failed to load class combat stats' });
  }
});

// GET /stats/by-monster — Combat stats broken down by monster name (PvE only)
router.get('/stats/by-monster', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const encounters = await prisma.combatEncounterLog.findMany({
      where: { type: 'pve' },
      select: {
        opponentName: true,
        outcome: true,
        totalRounds: true,
        characterStartHp: true,
        characterEndHp: true,
        character: { select: { race: true, level: true } },
      },
    });

    const monsterMap: Record<string, {
      encounters: number; playerWins: number;
      totalRounds: number; hpSum: number; hpCount: number;
      levels: number[];
      races: Record<string, { count: number; wins: number }>;
    }> = {};

    for (const e of encounters) {
      if (!e.opponentName) continue;
      if (!monsterMap[e.opponentName]) {
        monsterMap[e.opponentName] = {
          encounters: 0, playerWins: 0,
          totalRounds: 0, hpSum: 0, hpCount: 0,
          levels: [], races: {},
        };
      }
      const m = monsterMap[e.opponentName];
      m.encounters++;
      if (e.outcome === 'win') m.playerWins++;
      m.totalRounds += e.totalRounds;
      if (e.characterStartHp > 0) {
        m.hpSum += (e.characterEndHp / e.characterStartHp) * 100;
        m.hpCount++;
      }
      if (e.character?.level) m.levels.push(e.character.level);
      const race = e.character?.race;
      if (race) {
        if (!m.races[race]) m.races[race] = { count: 0, wins: 0 };
        m.races[race].count++;
        if (e.outcome === 'win') m.races[race].wins++;
      }
    }

    const monsters = Object.entries(monsterMap).map(([name, m]) => ({
      name,
      encounters: m.encounters,
      playerWinRate: +(m.playerWins / m.encounters * 100).toFixed(1),
      avgRounds: +(m.totalRounds / m.encounters).toFixed(1),
      avgPlayerHpRemaining: m.hpCount > 0 ? +(m.hpSum / m.hpCount).toFixed(1) : 0,
      levelRange: {
        min: m.levels.length > 0 ? Math.min(...m.levels) : 0,
        max: m.levels.length > 0 ? Math.max(...m.levels) : 0,
      },
      topRacesAgainst: Object.entries(m.races)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3)
        .map(([race, d]) => ({
          race,
          count: d.count,
          winRate: +(d.wins / d.count * 100).toFixed(1),
        })),
    }));

    return res.json({ monsters });
  } catch (error) {
    logRouteError(req, 500, 'Admin combat stats by-monster error', error);
    return res.status(500).json({ error: 'Failed to load monster combat stats' });
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
