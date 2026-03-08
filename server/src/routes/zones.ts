import { Router, Response } from 'express';
import { db } from '../lib/db';
import { eq, asc } from 'drizzle-orm';
import { exclusiveZones, characters, inventories, items, itemTemplates, playerProfessions, changelingDisguises } from '@database/tables';
import { handleDbError } from '../lib/db-errors';
import { logRouteError } from '../lib/error-logger';
import { authGuard } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/express';
import type { Race } from '@shared/enums';

const router = Router();

// ── Helpers ──────────────────────────────────────────────────

async function getCharacterForUser(userId: string) {
  const character = await db.query.characters.findFirst({
    where: eq(characters.userId, userId),
    orderBy: asc(characters.createdAt),
    with: {
      inventories: {
        with: {
          item: { with: { itemTemplate: true } },
        },
      },
      playerProfessions: true,
      changelingDisguises: true,
    },
  });

  if (!character) return null;

  // Map to match the expected shape
  return {
    ...character,
    inventory: character.inventories.map(inv => ({
      ...inv,
      item: {
        ...inv.item,
        template: inv.item.itemTemplate,
      },
    })),
    professions: character.playerProfessions.filter(p => p.isActive),
    changelingDisguise: character.changelingDisguises[0] ?? null,
  };
}

/**
 * Known zone-type to required-item mapping for non-native races.
 * If a zone's entryRequirements JSON is populated, those take precedence.
 */
const ZONE_TYPE_REQUIRED_ITEMS: Record<string, { items: string[]; professionCheck?: { type: string; minLevel: number } }> = {
  'deep_ocean':      { items: ['Underwater Breathing Helm'] },
  'underdark':       { items: ['Deepsight Goggles', 'Underdark Survival Kit'] },
  'feywild':         { items: ['Fey Compass'], professionCheck: { type: 'ENCHANTER', minLevel: 60 } },
  'elemental_rifts': { items: ['Elemental Protection Amulet'] },
  'sky_peaks':       { items: ['Altitude Elixir'] },
  'dragon_lairs':    { items: ['Dragonfire Shield'] },
};

interface AccessCheckResult {
  allowed: boolean;
  reason: string;
  missingItems?: string[];
  missingProfession?: string;
}

function checkZoneAccess(
  zone: {
    owningRace: Race | null;
    requiredLevel: number;
    zoneType: string;
    entryRequirements: unknown;
    specialMechanics: unknown;
  },
  character: {
    race: Race;
    level: number;
    inventory: Array<{ item: { template: { name: string } } }>;
    professions: Array<{ professionType: string; level: number; isActive: boolean }>;
    changelingDisguise: { disguiseRace: Race | null } | null;
  },
): AccessCheckResult {
  // Level check
  if (character.level < zone.requiredLevel) {
    return {
      allowed: false,
      reason: `Requires level ${zone.requiredLevel}, you are level ${character.level}`,
    };
  }

  // Changeling special rule: treated as native race for access
  const isChangeling = character.race === 'CHANGELING';

  // Check if character's race is the owning race (native access)
  const effectiveRace = character.race;
  const isNativeRace = zone.owningRace != null && effectiveRace === zone.owningRace;

  if (isNativeRace || isChangeling) {
    return { allowed: true, reason: isChangeling ? 'Changeling: treated as native race' : 'Native race: free entry' };
  }

  // Non-native: check zone-specific entry requirements from JSON first
  const entryReqs = zone.entryRequirements as string[];
  const inventoryItemNames = new Set(character.inventory.map(inv => inv.item.template.name));

  if (Array.isArray(entryReqs) && entryReqs.length > 0) {
    const missingItems = entryReqs.filter(reqItem => !inventoryItemNames.has(reqItem));
    if (missingItems.length > 0) {
      return {
        allowed: false,
        reason: 'Missing required items for zone entry',
        missingItems,
      };
    }
    return { allowed: true, reason: 'All entry requirements met' };
  }

  // Fall back to known zone-type requirements
  const zoneTypeKey = zone.zoneType.toLowerCase();
  const knownReqs = ZONE_TYPE_REQUIRED_ITEMS[zoneTypeKey];

  if (knownReqs) {
    const missingItems = knownReqs.items.filter(reqItem => !inventoryItemNames.has(reqItem));
    if (missingItems.length > 0) {
      return {
        allowed: false,
        reason: `Missing required gear for ${zone.zoneType} zone`,
        missingItems,
      };
    }

    // Profession check (e.g., Feywild requires Enchanter Lvl 60+)
    if (knownReqs.professionCheck) {
      const prof = character.professions.find(
        p => p.professionType === knownReqs.professionCheck!.type && p.isActive,
      );
      if (!prof || prof.level < knownReqs.professionCheck.minLevel) {
        return {
          allowed: false,
          reason: `Requires ${knownReqs.professionCheck.type} level ${knownReqs.professionCheck.minLevel}+`,
          missingProfession: `${knownReqs.professionCheck.type} Lvl ${knownReqs.professionCheck.minLevel}+`,
        };
      }
    }

    return { allowed: true, reason: 'All gear requirements met' };
  }

  // No specific requirements found — allow entry
  return { allowed: true, reason: 'No special requirements for this zone type' };
}

// =========================================================================
// GET /api/zones/exclusive — list all exclusive zones with details
// =========================================================================
router.get('/exclusive', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const zones = await db.query.exclusiveZones.findMany({
      with: {
        region: { columns: { id: true, name: true, biome: true } },
      },
      orderBy: [asc(exclusiveZones.dangerLevel), asc(exclusiveZones.name)],
    });

    return res.json({
      zones: zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        description: zone.description,
        zoneType: zone.zoneType,
        owningRace: zone.owningRace,
        requiredLevel: zone.requiredLevel,
        dangerLevel: zone.dangerLevel,
        requiredRaces: zone.requiredRaces,
        entryRequirements: zone.entryRequirements,
        availableResources: zone.availableResources,
        specialMechanics: zone.specialMechanics,
        region: zone.region,
      })),
      total: zones.length,
    });
  } catch (error) {
    if (handleDbError(error, res, 'list exclusive zones', req)) return;
    logRouteError(req, 500, 'List exclusive zones error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/zones/:id/access — check if current player can enter
// =========================================================================
router.get('/:id/access', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const zone = await db.query.exclusiveZones.findFirst({
      where: eq(exclusiveZones.id, id),
      with: {
        region: { columns: { id: true, name: true, biome: true } },
      },
    });

    if (!zone) {
      return res.status(404).json({ error: 'Exclusive zone not found' });
    }

    const character = await getCharacterForUser(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const accessResult = checkZoneAccess(zone, character);

    return res.json({
      zone: {
        id: zone.id,
        name: zone.name,
        zoneType: zone.zoneType,
        owningRace: zone.owningRace,
        requiredLevel: zone.requiredLevel,
        dangerLevel: zone.dangerLevel,
      },
      access: accessResult,
      character: {
        race: character.race,
        level: character.level,
        isChangeling: character.race === 'CHANGELING',
      },
    });
  } catch (error) {
    if (handleDbError(error, res, 'check zone access', req)) return;
    logRouteError(req, 500, 'Check zone access error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// POST /api/zones/:id/enter — enter the zone (validate access, update state)
// =========================================================================
router.post('/:id/enter', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const zone = await db.query.exclusiveZones.findFirst({
      where: eq(exclusiveZones.id, id),
      with: {
        region: { columns: { id: true, name: true, biome: true } },
      },
    });

    if (!zone) {
      return res.status(404).json({ error: 'Exclusive zone not found' });
    }

    const character = await getCharacterForUser(req.user!.userId);
    if (!character) {
      return res.status(404).json({ error: 'No character found' });
    }

    const accessResult = checkZoneAccess(zone, character);

    if (!accessResult.allowed) {
      return res.status(403).json({
        error: 'Access denied',
        reason: accessResult.reason,
        missingItems: accessResult.missingItems ?? null,
        missingProfession: accessResult.missingProfession ?? null,
      });
    }

    // Consume consumable entry items (like Altitude Elixir) if applicable
    // For now, just record entry. Consumable logic can be zone-specific via specialMechanics.
    const specialMechanics = zone.specialMechanics as Record<string, unknown>;
    const consumeOnEntry = (specialMechanics.consumeItemsOnEntry ?? false) as boolean;

    if (consumeOnEntry) {
      const entryReqs = zone.entryRequirements as string[];
      if (Array.isArray(entryReqs)) {
        await db.transaction(async (tx) => {
          for (const reqItem of entryReqs) {
            // Find matching inventory entry
            const inv = character.inventory.find(
              i => i.item.template.name === reqItem
            );
            if (inv) {
              if (inv.quantity <= 1) {
                await tx.delete(inventories).where(eq(inventories.id, inv.id));
              } else {
                await tx.update(inventories)
                  .set({ quantity: inv.quantity - 1 })
                  .where(eq(inventories.id, inv.id));
              }
            }
          }
        });
      }
    }

    return res.json({
      entered: true,
      zone: {
        id: zone.id,
        name: zone.name,
        description: zone.description,
        zoneType: zone.zoneType,
        dangerLevel: zone.dangerLevel,
        availableResources: zone.availableResources,
        specialMechanics: zone.specialMechanics,
        region: zone.region,
      },
      accessReason: accessResult.reason,
    });
  } catch (error) {
    if (handleDbError(error, res, 'enter zone', req)) return;
    logRouteError(req, 500, 'Enter zone error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// =========================================================================
// GET /api/zones/:id/resources — list available resources in zone
// =========================================================================
router.get('/:id/resources', authGuard, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const zone = await db.query.exclusiveZones.findFirst({
      where: eq(exclusiveZones.id, id),
      with: {
        region: { columns: { id: true, name: true, biome: true } },
      },
    });

    if (!zone) {
      return res.status(404).json({ error: 'Exclusive zone not found' });
    }

    const availableResources = zone.availableResources as Array<{
      name?: string;
      type?: string;
      rarity?: string;
      gatherTime?: number;
      [key: string]: unknown;
    }>;

    return res.json({
      zone: {
        id: zone.id,
        name: zone.name,
        zoneType: zone.zoneType,
        dangerLevel: zone.dangerLevel,
      },
      resources: Array.isArray(availableResources) ? availableResources : [],
      total: Array.isArray(availableResources) ? availableResources.length : 0,
    });
  } catch (error) {
    if (handleDbError(error, res, 'get zone resources', req)) return;
    logRouteError(req, 500, 'Get zone resources error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
