/**
 * Kingdom seed data for Realm of Crowns
 *
 * P1 #16 / Database MAJOR-01 + MAJOR-04: Seeds Kingdom records and links
 * them to their Regions via the new kingdomId FK on Region.
 *
 * Each core race territory maps to one kingdom. Common/exotic territories
 * are assigned to the kingdom of their closest allied core race, or remain
 * independent (null kingdomId) where lore dictates autonomy.
 *
 * The Suncoast (Free Cities) is its own neutral kingdom.
 */

import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import * as schema from '../schema';

interface KingdomDef {
  name: string;
  capitalTownName: string;
  /** Region names that belong to this kingdom */
  regionNames: string[];
}

const KINGDOMS: KingdomDef[] = [
  // --- Core Race Kingdoms (8) ---
  {
    name: 'Kingdom of the Heartlands',
    capitalTownName: 'Kingshold',
    regionNames: ['Verdant Heartlands', 'Twilight March'],
  },
  {
    name: 'Silverwood Dominion',
    capitalTownName: 'Aelindra',
    regionNames: ['Silverwood Forest', 'Mistwood Glens', 'Glimmerveil'],
  },
  {
    name: 'Ironvault Thanedom',
    capitalTownName: 'Kazad-Vorn',
    regionNames: ['Ironvault Mountains', 'Cogsworth Warrens', 'Skypeak Plateaus'],
  },
  {
    name: 'Crossroads Confederacy',
    capitalTownName: 'Hearthshire',
    regionNames: ['The Crossroads'],
  },
  {
    name: 'Ashenfang Dominion',
    capitalTownName: 'Grakthar',
    regionNames: ['Ashenfang Wastes', 'Scarred Frontier'],
  },
  {
    name: 'Shadowmere Conclave',
    capitalTownName: 'Nethermire',
    regionNames: ['Shadowmere Marshes', "Vel'Naris Underdark", 'Ashenmoor'],
  },
  {
    name: 'Frozen Reaches Clans',
    capitalTownName: 'Drakenspire',
    regionNames: ['Frozen Reaches'],
  },
  {
    name: 'Suncoast Free Cities',
    capitalTownName: 'Porto Sole',
    regionNames: ['The Suncoast', 'The Confluence'],
  },
  // --- Independent Territories (no kingdom, but we list them for completeness) ---
  // Thornwilds (Beastfolk) - fiercely independent packs
  // The Foundry (Warforged) - autonomous construct collective
  // These remain with kingdomId = null
];

export async function seedKingdoms(db: any) {
  console.log('--- Seeding Kingdoms ---');

  let kingdomCount = 0;

  for (const kingdomDef of KINGDOMS) {
    // Find the capital town
    const capitalTown = await db.query.towns.findFirst({
      where: eq(schema.towns.name, kingdomDef.capitalTownName),
    });

    if (!capitalTown) {
      console.error(`  ERROR: Capital town "${kingdomDef.capitalTownName}" not found for kingdom "${kingdomDef.name}"`);
      continue;
    }

    // Upsert the kingdom
    const [kingdom] = await db.insert(schema.kingdoms).values({
      id: crypto.randomUUID(),
      name: kingdomDef.name,
      capitalTownId: capitalTown.id,
      treasury: 10000,
    }).onConflictDoUpdate({
      target: schema.kingdoms.name,
      set: {
        capitalTownId: capitalTown.id,
      },
    }).returning();

    // Link regions to this kingdom
    for (const regionName of kingdomDef.regionNames) {
      const region = await db.query.regions.findFirst({
        where: eq(schema.regions.name, regionName),
      });

      if (!region) {
        console.error(`  ERROR: Region "${regionName}" not found for kingdom "${kingdomDef.name}"`);
        continue;
      }

      await db.update(schema.regions).set({ kingdomId: kingdom.id }).where(eq(schema.regions.id, region.id));
    }

    kingdomCount++;
  }

  console.log(`  Created ${kingdomCount} kingdoms with region assignments`);
}
