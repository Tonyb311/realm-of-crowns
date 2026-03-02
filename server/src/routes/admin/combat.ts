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

// GET /stats — Executive combat health dashboard
router.get('/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // --- Parse date range params ---
    const presetParam = (req.query.preset as string) || '30d';
    const startDateParam = req.query.startDate as string | undefined;
    const endDateParam = req.query.endDate as string | undefined;

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let isAllTime = false;
    let effectivePreset: string | null = presetParam;

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam);
      endDate = new Date(endDateParam);
      effectivePreset = null;
    } else {
      switch (presetParam) {
        case '7d': startDate = new Date(now.getTime() - 7 * 86400000); break;
        case '90d': startDate = new Date(now.getTime() - 90 * 86400000); break;
        case 'all': startDate = new Date(0); isAllTime = true; break;
        default: startDate = new Date(now.getTime() - 30 * 86400000); break;
      }
    }

    // Comparison period (equal length, immediately before current period)
    const periodMs = endDate.getTime() - startDate.getTime();
    const compStart = isAllTime ? null : new Date(startDate.getTime() - periodMs);
    const compEnd = isAllTime ? null : new Date(startDate.getTime() - 1);

    const dateWhere = isAllTime ? {} : { startedAt: { gte: startDate, lte: endDate } };
    const compWhere = compStart && compEnd ? { startedAt: { gte: compStart, lte: compEnd } } : null;

    const getBand = (lvl: number) => lvl <= 5 ? '1-5' : lvl <= 10 ? '6-10' : lvl <= 15 ? '11-15' : '16-20';

    const [allEncounters, itemTemplates, compEncounters] = await Promise.all([
      prisma.combatEncounterLog.findMany({
        where: dateWhere,
        select: {
          type: true,
          outcome: true,
          totalRounds: true,
          characterStartHp: true,
          characterEndHp: true,
          xpAwarded: true,
          goldAwarded: true,
          lootDropped: true,
          startedAt: true,
          opponentName: true,
          characterId: true,
          partyId: true,
          sessionId: true,
          character: { select: { level: true, race: true, class: true } },
        },
      }),
      prisma.itemTemplate.findMany({
        select: { name: true, rarity: true },
      }),
      compWhere
        ? prisma.combatEncounterLog.findMany({
            where: compWhere,
            select: {
              type: true,
              outcome: true,
              totalRounds: true,
              goldAwarded: true,
              lootDropped: true,
              startedAt: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const totalEncounters = allEncounters.length;

    // --- PvE survival rate ---
    const pveEncounters = allEncounters.filter((e) => e.type === 'pve');
    const pveWins = pveEncounters.filter((e) => e.outcome === 'win').length;
    const pveSurvivalRate = pveEncounters.length > 0 ? +(pveWins / pveEncounters.length * 100).toFixed(1) : 0;

    // --- Flee attempt rate (all encounters) ---
    const fleeCount = allEncounters.filter((e) => e.outcome === 'flee').length;
    const fleeAttemptRate = totalEncounters > 0 ? +(fleeCount / totalEncounters * 100).toFixed(1) : 0;

    // --- Avg rounds ---
    const avgRounds = totalEncounters > 0
      ? +(allEncounters.reduce((s, e) => s + e.totalRounds, 0) / totalEncounters).toFixed(1)
      : 0;

    // --- Economy: gold/day, items/day (over selected period) ---
    const activeDays = new Set(allEncounters.map((e) => e.startedAt.toISOString().slice(0, 10))).size || 1;
    const effectiveDays = isAllTime ? activeDays : Math.max(1, Math.ceil(periodMs / 86400000));
    const totalGold = allEncounters.reduce((s, e) => s + e.goldAwarded, 0);
    let totalItemCount = 0;
    for (const e of allEncounters) {
      if (e.lootDropped) {
        const items = e.lootDropped.split(',').map((s) => s.trim()).filter(Boolean);
        for (const item of items) {
          const match = item.match(/^(\d+)x\s+/);
          totalItemCount += match ? parseInt(match[1]) : 1;
        }
      }
    }
    const goldPerDay = +(totalGold / effectiveDays).toFixed(0);
    const itemsDroppedPerDay = +(totalItemCount / effectiveDays).toFixed(1);

    // --- Active level range ---
    const bandCounts: Record<string, number> = { '1-5': 0, '6-10': 0, '11-15': 0, '16-20': 0 };
    for (const e of allEncounters) {
      const lvl = e.character?.level;
      if (lvl) bandCounts[getBand(lvl)]++;
    }
    const activeLevelRange = Object.entries(bandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '1-5';

    // --- Survival by level band (PvE only) ---
    const bandStats: Record<string, { encounters: number; wins: number; flees: number; totalRounds: number; hpSum: number; hpCount: number }> = {};
    for (const band of ['1-5', '6-10', '11-15', '16-20']) {
      bandStats[band] = { encounters: 0, wins: 0, flees: 0, totalRounds: 0, hpSum: 0, hpCount: 0 };
    }
    for (const e of pveEncounters) {
      const lvl = e.character?.level;
      if (!lvl) continue;
      const band = getBand(lvl);
      const b = bandStats[band];
      b.encounters++;
      b.totalRounds += e.totalRounds;
      if (e.outcome === 'flee') b.flees++;
      if (e.outcome === 'win') {
        b.wins++;
        if (e.characterStartHp > 0) {
          b.hpSum += (e.characterEndHp / e.characterStartHp) * 100;
          b.hpCount++;
        }
      }
    }
    const survivalByLevel = ['1-5', '6-10', '11-15', '16-20'].map((band) => {
      const b = bandStats[band];
      return {
        band,
        encounters: b.encounters,
        wins: b.wins,
        flees: b.flees,
        fleeRate: b.encounters > 0 ? +(b.flees / b.encounters * 100).toFixed(1) : 0,
        survivalRate: b.encounters > 0 ? +(b.wins / b.encounters * 100).toFixed(1) : 0,
        avgRounds: b.encounters > 0 ? +(b.totalRounds / b.encounters).toFixed(1) : 0,
        avgHpRemainingPct: b.hpCount > 0 ? +(b.hpSum / b.hpCount).toFixed(1) : 0,
      };
    });

    // --- Economy trend (daily breakdown of selected period) ---
    const dayEcon: Record<string, { gold: number; xp: number; itemsDropped: number }> = {};
    for (const e of allEncounters) {
      const day = e.startedAt.toISOString().slice(0, 10);
      if (!dayEcon[day]) dayEcon[day] = { gold: 0, xp: 0, itemsDropped: 0 };
      dayEcon[day].gold += e.goldAwarded;
      dayEcon[day].xp += e.xpAwarded;
      if (e.lootDropped) {
        const items = e.lootDropped.split(',').map((s) => s.trim()).filter(Boolean);
        for (const item of items) {
          const match = item.match(/^(\d+)x\s+/);
          dayEcon[day].itemsDropped += match ? parseInt(match[1]) : 1;
        }
      }
    }
    const economyTrend = Object.entries(dayEcon)
      .map(([date, d]) => ({ date, ...d }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // --- Loot by rarity ---
    const nameToRarity = new Map(itemTemplates.map((t) => [t.name.toLowerCase(), t.rarity]));
    const rarityCounts: Record<string, number> = {};
    let totalItemDrops = 0;
    for (const e of allEncounters) {
      if (!e.lootDropped) continue;
      const items = e.lootDropped.split(',').map((s) => s.trim()).filter(Boolean);
      for (const item of items) {
        const match = item.match(/^(\d+)x\s+(.+)$/);
        const qty = match ? parseInt(match[1]) : 1;
        const name = (match ? match[2] : item).trim();
        const rarity = nameToRarity.get(name.toLowerCase()) ?? 'UNKNOWN';
        rarityCounts[rarity] = (rarityCounts[rarity] ?? 0) + qty;
        totalItemDrops += qty;
      }
    }
    const RARITY_ORDER = ['POOR', 'COMMON', 'FINE', 'SUPERIOR', 'MASTERWORK', 'LEGENDARY', 'UNKNOWN'];
    const lootByRarity = RARITY_ORDER
      .filter((r) => (rarityCounts[r] ?? 0) > 0)
      .map((r) => ({ rarity: r, count: rarityCounts[r] }));

    // --- Pacing by level band ---
    const pacingByLevel = ['1-5', '6-10', '11-15', '16-20'].map((band) => {
      const b = bandStats[band];
      return {
        band,
        avgRounds: b.encounters > 0 ? +(b.totalRounds / b.encounters).toFixed(1) : 0,
        encounters: b.encounters,
      };
    });

    // --- Top 5 monsters ---
    const monsterMap: Record<string, { count: number; wins: number }> = {};
    for (const e of pveEncounters) {
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

    // --- Top 5 races ---
    const raceMap: Record<string, { count: number; wins: number }> = {};
    for (const e of allEncounters) {
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

    // --- Top 5 classes ---
    const classMap: Record<string, { count: number; wins: number }> = {};
    for (const e of allEncounters) {
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

    // --- Balance alerts ---
    type Alert = {
      category: 'race' | 'class' | 'monster' | 'level_band' | 'loot';
      entity: string;
      metric: string;
      value: number;
      expected: string;
      severity: 'critical' | 'warning';
      message: string;
    };
    const alerts: Alert[] = [];

    // Race/Class PvE survival alerts
    const checkPveSurvival = (
      map: Record<string, { count: number; wins: number }>,
      category: 'race' | 'class',
    ) => {
      for (const [name, d] of Object.entries(map)) {
        if (d.count < 10) continue;
        const sr = +(d.wins / d.count * 100).toFixed(1);
        if (sr < 25 || sr > 95) {
          alerts.push({ category, entity: name, metric: 'PvE survival rate', value: sr, expected: '35-85%', severity: 'critical', message: `${name} has ${sr}% PvE survival rate (expected 35-85%) across ${d.count} encounters` });
        } else if (sr < 35 || sr > 85) {
          alerts.push({ category, entity: name, metric: 'PvE survival rate', value: sr, expected: '35-85%', severity: 'warning', message: `${name} has ${sr}% PvE survival rate (expected 35-85%) across ${d.count} encounters` });
        }
      }
    };
    checkPveSurvival(raceMap, 'race');
    checkPveSurvival(classMap, 'class');

    // Monster survival alerts
    for (const [name, d] of Object.entries(monsterMap)) {
      if (d.count < 10) continue;
      const sr = +(d.wins / d.count * 100).toFixed(1);
      if (sr < 15 || sr > 98) {
        alerts.push({ category: 'monster', entity: name, metric: 'player survival rate', value: sr, expected: '25-90%', severity: 'critical', message: `${name}: ${sr}% player survival (expected 25-90%) across ${d.count} encounters` });
      } else if (sr < 25 || sr > 90) {
        alerts.push({ category: 'monster', entity: name, metric: 'player survival rate', value: sr, expected: '25-90%', severity: 'warning', message: `${name}: ${sr}% player survival (expected 25-90%) across ${d.count} encounters` });
      }
    }

    // Level band economy alerts
    const overallAvgGold = totalEncounters > 0 ? allEncounters.reduce((s, e) => s + e.goldAwarded, 0) / totalEncounters : 0;
    const overallAvgXp = totalEncounters > 0 ? allEncounters.reduce((s, e) => s + e.xpAwarded, 0) / totalEncounters : 0;
    for (const band of ['1-5', '6-10', '11-15', '16-20']) {
      const bandEncs = allEncounters.filter((e) => e.character?.level && getBand(e.character.level) === band);
      if (bandEncs.length < 10) continue;
      const bandAvgGold = bandEncs.reduce((s, e) => s + e.goldAwarded, 0) / bandEncs.length;
      const bandAvgXp = bandEncs.reduce((s, e) => s + e.xpAwarded, 0) / bandEncs.length;
      if (overallAvgGold > 0 && bandAvgGold > overallAvgGold * 2) {
        alerts.push({ category: 'level_band', entity: band, metric: 'gold per encounter', value: +bandAvgGold.toFixed(0), expected: `<${+(overallAvgGold * 2).toFixed(0)}`, severity: 'warning', message: `Level ${band}: ${bandAvgGold.toFixed(0)} avg gold/encounter (>2x overall avg of ${overallAvgGold.toFixed(0)})` });
      }
      if (overallAvgXp > 0 && bandAvgXp > overallAvgXp * 2) {
        alerts.push({ category: 'level_band', entity: band, metric: 'XP per encounter', value: +bandAvgXp.toFixed(0), expected: `<${+(overallAvgXp * 2).toFixed(0)}`, severity: 'warning', message: `Level ${band}: ${bandAvgXp.toFixed(0)} avg XP/encounter (>2x overall avg of ${overallAvgXp.toFixed(0)})` });
      }
    }

    // Level band flee rate alerts
    for (const band of ['1-5', '6-10', '11-15', '16-20']) {
      const b = bandStats[band];
      if (b.encounters < 10) continue;
      const fr = +(b.flees / b.encounters * 100).toFixed(1);
      if (fr > 50) {
        alerts.push({ category: 'level_band', entity: band, metric: 'flee rate', value: fr, expected: '<30%', severity: 'critical', message: `${band} level band has ${fr}% flee rate — players are avoiding combat here` });
      } else if (fr > 30) {
        alerts.push({ category: 'level_band', entity: band, metric: 'flee rate', value: fr, expected: '<30%', severity: 'warning', message: `${band} level band has ${fr}% flee rate — players are avoiding combat here` });
      }
    }

    // Loot rarity alerts
    if (totalItemDrops > 0) {
      const mwCount = rarityCounts['MASTERWORK'] ?? 0;
      const legCount = rarityCounts['LEGENDARY'] ?? 0;
      const highRarePct = +((mwCount + legCount) / totalItemDrops * 100).toFixed(1);
      const legPct = +(legCount / totalItemDrops * 100).toFixed(1);
      if (legPct > 2) {
        alerts.push({ category: 'loot', entity: 'LEGENDARY', metric: 'drop rate', value: legPct, expected: '<2% of total drops', severity: 'critical', message: `LEGENDARY items are ${legPct}% of all drops (expected <2%)` });
      }
      if (highRarePct > 5) {
        alerts.push({ category: 'loot', entity: 'MASTERWORK+LEGENDARY', metric: 'drop rate', value: highRarePct, expected: '<5% of total drops', severity: 'warning', message: `MASTERWORK+LEGENDARY items are ${highRarePct}% of all drops (expected <5%)` });
      }
    }

    // --- Player engagement ---
    const playerCounts = new Map<string, number>();
    for (const e of allEncounters) {
      if (e.characterId) {
        playerCounts.set(e.characterId, (playerCounts.get(e.characterId) ?? 0) + 1);
      }
    }
    const uniquePlayers = playerCounts.size;
    const encountersPerPlayer = uniquePlayers > 0 ? +(totalEncounters / uniquePlayers).toFixed(1) : 0;
    const repeatCombatants = [...playerCounts.values()].filter((c) => c > 1).length;
    const repeatRate = uniquePlayers > 0 ? +(repeatCombatants / uniquePlayers * 100).toFixed(1) : 0;
    const newPlayerPve = pveEncounters.filter((e) => e.character?.level && e.character.level <= 3);
    const newPlayerWins = newPlayerPve.filter((e) => e.outcome === 'win').length;
    const newPlayerEncounters = newPlayerPve.length;
    const newPlayerSurvivalRate = newPlayerEncounters > 0 ? +(newPlayerWins / newPlayerEncounters * 100).toFixed(1) : 0;

    // --- Solo vs Group analysis (PvE only) ---
    const soloEncounters = pveEncounters.filter((e) => !e.partyId);
    const groupEncounters = pveEncounters.filter((e) => !!e.partyId);

    const computeGroupMetrics = (encs: typeof pveEncounters) => {
      const wins = encs.filter((e) => e.outcome === 'win');
      const flees = encs.filter((e) => e.outcome === 'flee');
      let hpSum = 0;
      let hpCount = 0;
      for (const e of wins) {
        if (e.characterStartHp > 0) {
          hpSum += (e.characterEndHp / e.characterStartHp) * 100;
          hpCount++;
        }
      }
      return {
        survivalRate: encs.length > 0 ? +(wins.length / encs.length * 100).toFixed(1) : 0,
        avgRounds: encs.length > 0 ? +(encs.reduce((s, e) => s + e.totalRounds, 0) / encs.length).toFixed(1) : 0,
        avgHpRemainingPct: hpCount > 0 ? +(hpSum / hpCount).toFixed(1) : 0,
        avgGoldPerEncounter: encs.length > 0 ? +(encs.reduce((s, e) => s + e.goldAwarded, 0) / encs.length).toFixed(1) : 0,
        avgXpPerEncounter: encs.length > 0 ? +(encs.reduce((s, e) => s + e.xpAwarded, 0) / encs.length).toFixed(1) : 0,
        fleeRate: encs.length > 0 ? +(flees.length / encs.length * 100).toFixed(1) : 0,
      };
    };

    const soloMetrics = computeGroupMetrics(soloEncounters);
    const groupMetrics = computeGroupMetrics(groupEncounters);
    const survivalGap = +(groupMetrics.survivalRate - soloMetrics.survivalRate).toFixed(1);

    // Group balance alert
    if (soloEncounters.length >= 10 && groupEncounters.length >= 10) {
      if (survivalGap > 50) {
        alerts.push({ category: 'level_band', entity: 'Solo vs Group', metric: 'survival gap', value: survivalGap, expected: '<30pp', severity: 'critical', message: `Group survival rate (${groupMetrics.survivalRate}%) exceeds solo (${soloMetrics.survivalRate}%) by ${survivalGap}pp — grouping may trivialize combat` });
      } else if (survivalGap > 30) {
        alerts.push({ category: 'level_band', entity: 'Solo vs Group', metric: 'survival gap', value: survivalGap, expected: '<30pp', severity: 'warning', message: `Group survival rate (${groupMetrics.survivalRate}%) exceeds solo (${soloMetrics.survivalRate}%) by ${survivalGap}pp — grouping may trivialize combat` });
      }
    }

    // Group size distribution: group by partyId+sessionId, count distinct characterIds
    const partyGroups = new Map<string, Set<string>>();
    const partyOutcomes = new Map<string, string>();
    for (const e of groupEncounters) {
      const key = `${e.partyId}|${e.sessionId ?? e.startedAt.toISOString()}`;
      if (!partyGroups.has(key)) partyGroups.set(key, new Set());
      partyGroups.get(key)!.add(e.characterId);
      if (!partyOutcomes.has(key)) partyOutcomes.set(key, e.outcome);
    }
    const sizeMap: Record<number, { encounters: number; wins: number }> = {};
    for (const [key, members] of partyGroups) {
      const size = Math.min(members.size, 5);
      if (!sizeMap[size]) sizeMap[size] = { encounters: 0, wins: 0 };
      sizeMap[size].encounters++;
      if (partyOutcomes.get(key) === 'win') sizeMap[size].wins++;
    }
    const sizeDistribution = Object.entries(sizeMap)
      .map(([size, d]) => ({
        size: parseInt(size),
        encounters: d.encounters,
        survivalRate: d.encounters > 0 ? +(d.wins / d.encounters * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => a.size - b.size);

    const groupAnalysis = {
      soloEncounters: soloEncounters.length,
      groupEncounters: groupEncounters.length,
      groupRate: pveEncounters.length > 0 ? +(groupEncounters.length / pveEncounters.length * 100).toFixed(1) : 0,
      solo: soloMetrics,
      group: groupMetrics,
      survivalGap,
      sizeDistribution,
    };

    // --- Comparison deltas ---
    let deltas: { totalEncounters: number; pveSurvivalRate: number; fleeAttemptRate: number; avgRounds: number; goldPerDay: number; itemsDroppedPerDay: number } | null = null;
    if (compEncounters.length > 0 && !isAllTime) {
      const compTotal = compEncounters.length;
      const compPve = compEncounters.filter((e) => e.type === 'pve');
      const compPveWins = compPve.filter((e) => e.outcome === 'win').length;
      const compPveSurvival = compPve.length > 0 ? +(compPveWins / compPve.length * 100).toFixed(1) : 0;
      const compFlees = compEncounters.filter((e) => e.outcome === 'flee').length;
      const compFleeRate = compTotal > 0 ? +(compFlees / compTotal * 100).toFixed(1) : 0;
      const compAvgRnds = compTotal > 0
        ? +(compEncounters.reduce((s, e) => s + e.totalRounds, 0) / compTotal).toFixed(1)
        : 0;
      const compPeriodDays = Math.max(1, Math.ceil(periodMs / 86400000));
      const compGoldTotal = compEncounters.reduce((s, e) => s + e.goldAwarded, 0);
      let compItemTotal = 0;
      for (const e of compEncounters) {
        if (e.lootDropped) {
          const items = e.lootDropped.split(',').map((s) => s.trim()).filter(Boolean);
          for (const item of items) {
            const match = item.match(/^(\d+)x\s+/);
            compItemTotal += match ? parseInt(match[1]) : 1;
          }
        }
      }
      const compGoldPerDay = +(compGoldTotal / compPeriodDays).toFixed(0);
      const compItemsPerDay = +(compItemTotal / compPeriodDays).toFixed(1);
      deltas = {
        totalEncounters: totalEncounters - compTotal,
        pveSurvivalRate: +(pveSurvivalRate - compPveSurvival).toFixed(1),
        fleeAttemptRate: +(fleeAttemptRate - compFleeRate).toFixed(1),
        avgRounds: +(avgRounds - compAvgRnds).toFixed(1),
        goldPerDay: goldPerDay - compGoldPerDay,
        itemsDroppedPerDay: +(itemsDroppedPerDay - compItemsPerDay).toFixed(1),
      };
    }

    return res.json({
      totalEncounters,
      pveSurvivalRate,
      fleeAttemptRate,
      avgRounds,
      goldPerDay,
      itemsDroppedPerDay,
      activeLevelRange,
      survivalByLevel,
      economyTrend,
      lootByRarity,
      pacingByLevel,
      alerts,
      topMonsters,
      topRaces,
      topClasses,
      groupAnalysis,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        preset: effectivePreset,
        comparisonStart: compStart?.toISOString() ?? null,
        comparisonEnd: compEnd?.toISOString() ?? null,
      },
      deltas,
      engagement: {
        uniquePlayers,
        encountersPerPlayer,
        repeatCombatants,
        repeatRate,
        newPlayerSurvivalRate,
        newPlayerEncounters,
      },
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
