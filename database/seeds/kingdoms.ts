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

import { PrismaClient } from '@prisma/client';

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

export async function seedKingdoms(prisma: PrismaClient) {
  console.log('--- Seeding Kingdoms ---');

  let kingdomCount = 0;

  for (const kingdomDef of KINGDOMS) {
    // Find the capital town
    const capitalTown = await prisma.town.findUnique({
      where: { name: kingdomDef.capitalTownName },
    });

    if (!capitalTown) {
      console.error(`  ERROR: Capital town "${kingdomDef.capitalTownName}" not found for kingdom "${kingdomDef.name}"`);
      continue;
    }

    // Upsert the kingdom
    const kingdom = await prisma.kingdom.upsert({
      where: { name: kingdomDef.name },
      update: {
        capitalTownId: capitalTown.id,
      },
      create: {
        name: kingdomDef.name,
        capitalTownId: capitalTown.id,
        treasury: 10000, // Starting treasury
      },
    });

    // Link regions to this kingdom
    for (const regionName of kingdomDef.regionNames) {
      const region = await prisma.region.findUnique({
        where: { name: regionName },
      });

      if (!region) {
        console.error(`  ERROR: Region "${regionName}" not found for kingdom "${kingdomDef.name}"`);
        continue;
      }

      await prisma.region.update({
        where: { id: region.id },
        data: { kingdomId: kingdom.id },
      });
    }

    kingdomCount++;
  }

  console.log(`  Created ${kingdomCount} kingdoms with region assignments`);
}
