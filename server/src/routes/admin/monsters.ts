import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AuthenticatedRequest } from '../../types/express';
import { logRouteError } from '../../lib/error-logger';

const router = Router();

// GET /api/admin/monsters — Full monster compendium
router.get('/', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const monsters = await prisma.monster.findMany({
      include: {
        region: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    // Compute XP reward: 5 * monster.level (ACTION_XP.PVE_WIN_PER_MONSTER_LEVEL = 5)
    const enriched = monsters.map(m => {
      const stats = m.stats as Record<string, any>;
      const lootTable = m.lootTable as { dropChance: number; minQty: number; maxQty: number; gold: number; itemTemplateName?: string }[];

      // Calculate min/max gold from loot table
      let minGold = 0;
      let maxGold = 0;
      const itemDrops: { name: string; dropChance: number; minQty: number; maxQty: number }[] = [];
      for (const entry of lootTable) {
        // Min gold: sum of (base * minQty) for guaranteed drops (100% chance)
        if (entry.dropChance >= 1) {
          minGold += entry.gold * entry.minQty;
        }
        // Max gold: sum of all possible (base * maxQty)
        maxGold += entry.gold * entry.maxQty;
        // Collect item drops
        if (entry.itemTemplateName) {
          itemDrops.push({
            name: entry.itemTemplateName,
            dropChance: entry.dropChance,
            minQty: entry.minQty,
            maxQty: entry.maxQty,
          });
        }
      }

      return {
        id: m.id,
        name: m.name,
        level: m.level,
        biome: m.biome,
        regionId: m.regionId,
        regionName: m.region?.name ?? null,
        stats: {
          hp: stats.hp ?? 0,
          ac: stats.ac ?? 10,
          attack: stats.attack ?? 0,
          damage: stats.damage ?? '1d4',
          damageType: stats.damageType ?? 'BLUDGEONING',
          speed: stats.speed ?? 30,
          str: stats.str ?? 10,
          dex: stats.dex ?? 10,
          con: stats.con ?? 10,
          int: stats.int ?? 10,
          wis: stats.wis ?? 10,
          cha: stats.cha ?? 10,
        },
        lootTable,
        rewards: {
          xp: 5 * m.level,
          goldRange: { min: minGold, max: maxGold },
          itemDrops,
        },
        createdAt: m.createdAt,
      };
    });

    // Summary stats for the header
    const summary = {
      totalMonsters: enriched.length,
      levelRange: {
        min: enriched.length > 0 ? Math.min(...enriched.map(m => m.level)) : 0,
        max: enriched.length > 0 ? Math.max(...enriched.map(m => m.level)) : 0,
      },
      biomes: [...new Set(enriched.map(m => m.biome))].sort(),
      regions: [...new Set(enriched.filter(m => m.regionName).map(m => m.regionName!))].sort(),
      tierBreakdown: {
        low: enriched.filter(m => m.level <= 5).length,
        mid: enriched.filter(m => m.level > 5 && m.level <= 10).length,
        high: enriched.filter(m => m.level > 10).length,
      },
    };

    return res.json({ monsters: enriched, summary });
  } catch (error) {
    logRouteError(_req, 500, 'Admin monsters compendium error', error);
    return res.status(500).json({ error: 'Failed to load monster compendium' });
  }
});

export default router;
