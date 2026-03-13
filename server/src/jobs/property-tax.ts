import cron from 'node-cron';
import { db } from '../lib/db';
import { eq, gte, sql } from 'drizzle-orm';
import { buildings, characters, townTreasuries, churchChapters } from '@database/tables';
import { logger } from '../lib/logger';
import { cronJobExecutions } from '../lib/metrics';
import { emitBuildingTaxDue, emitBuildingDelinquent, emitBuildingSeized } from '../socket/events';
import { getTaxReductionFromChapters, type ChapterRow } from '../services/religion-buffs';

/**
 * Base daily property tax rates per building type (gold per day).
 */
const BASE_TAX_RATES: Record<string, number> = {
  SMITHY: 20,
  SMELTERY: 20,
  TANNERY: 20,
  TAILOR_SHOP: 20,
  ALCHEMY_LAB: 20,
  ENCHANTING_TOWER: 20,
  KITCHEN: 20,
  BREWERY: 20,
  JEWELER_WORKSHOP: 20,
  FLETCHER_BENCH: 20,
  MASON_YARD: 20,
  LUMBER_MILL: 20,
  SCRIBE_STUDY: 20,
  STABLE: 20,
  WAREHOUSE: 25,
  BANK: 25,
  INN: 25,
  MARKET_STALL: 10,
  FARM: 10,
  RANCH: 10,
  MINE: 15,
};

/**
 * Property tax cron job.
 * Runs daily to collect property tax from building owners and deposit into town treasury.
 * Tracks delinquency — after 7 days unpaid, building is seized by the town.
 */
export function startPropertyTaxJob() {
  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.debug({ job: 'propertyTax' }, 'cron job started');
    try {
      await collectPropertyTaxes();
      cronJobExecutions.inc({ job: 'propertyTax', result: 'success' });
    } catch (error: unknown) {
      cronJobExecutions.inc({ job: 'propertyTax', result: 'failure' });
      logger.error({ job: 'propertyTax', err: error instanceof Error ? error.message : String(error) }, 'cron job failed');
    }
  });

  logger.info('PropertyTax cron registered (daily at midnight)');
}

async function collectPropertyTaxes() {
  // Get all completed buildings (level >= 1) with their owners, towns, and policies
  const allBuildings = await db.query.buildings.findMany({
    where: gte(buildings.level, 1),
    with: {
      character: { columns: { id: true, name: true, gold: true, userId: true, patronGodId: true, homeTownId: true } },
      town: {
        columns: { id: true, name: true, mayorId: true },
        with: {
          townPolicies: { columns: { taxRate: true } },
          townTreasuries: { columns: { id: true } },
        },
      },
    },
  });

  // Pre-fetch all church chapters for batch Veradine tax reduction
  const allChapters = await db.query.churchChapters.findMany({
    columns: { id: true, godId: true, townId: true, tier: true, isDominant: true, isShrine: true },
  }) as ChapterRow[];

  let totalCollected = 0;
  let delinquentCount = 0;
  let seizedCount = 0;

  for (const building of allBuildings) {
    const baseTax = BASE_TAX_RATES[building.type] ?? 10;
    const levelMultiplier = building.level;
    const policyTaxRate = building.town.townPolicies?.[0]?.taxRate ?? 0.10;
    // Tax = baseTax * level * (1 + townPolicyRate)
    // The policy rate modifies the base tax (e.g. 0.10 = 10% surcharge)
    let dailyTax = Math.floor(baseTax * levelMultiplier * (1 + policyTaxRate));

    // Veradine tax reduction (personal + town-wide)
    const taxReduction = getTaxReductionFromChapters(
      building.character.patronGodId, building.character.homeTownId,
      building.town.id, allChapters,
    );
    if (taxReduction > 0) {
      dailyTax = Math.floor(dailyTax * (1 - taxReduction));
    }

    const storageData = building.storage as Record<string, unknown>;
    const owner = building.character;

    if (owner.gold >= dailyTax) {
      // Owner can pay — collect tax
      await db.transaction(async (tx) => {
        await tx.update(characters)
          .set({ gold: sql`${characters.gold} - ${dailyTax}` })
          .where(eq(characters.id, building.ownerId));

        // Deposit into town treasury
        const treasury = building.town.townTreasuries?.[0];
        if (treasury) {
          await tx.update(townTreasuries)
            .set({ balance: sql`${townTreasuries.balance} + ${dailyTax}` })
            .where(eq(townTreasuries.id, treasury.id));
        }

        // Clear any delinquency tracking
        if (storageData.taxDelinquentSince) {
          const { taxDelinquentSince, ...rest } = storageData;
          await tx.update(buildings)
            .set({ storage: rest as Record<string, string | number | boolean | null> })
            .where(eq(buildings.id, building.id));
        }
      });

      totalCollected += dailyTax;

      // Notify owner of tax payment
      emitBuildingTaxDue(building.ownerId, {
        buildingId: building.id,
        buildingName: building.name,
        buildingType: building.type,
        townName: building.town.name,
        amount: dailyTax,
        paid: true,
        remainingGold: owner.gold - dailyTax,
      });
    } else {
      // Owner cannot pay — mark as delinquent
      const delinquentSince = storageData.taxDelinquentSince
        ? new Date(storageData.taxDelinquentSince as string)
        : new Date();

      const daysSinceDelinquent = storageData.taxDelinquentSince
        ? Math.floor((Date.now() - delinquentSince.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      if (daysSinceDelinquent >= 7) {
        // Seize the building — transfer ownership to mayor or nullify
        const newOwnerId = building.town.mayorId;

        if (newOwnerId) {
          await db.update(buildings)
            .set({
              ownerId: newOwnerId,
              storage: { ...storageData, taxDelinquentSince: undefined },
            })
            .where(eq(buildings.id, building.id));
        }

        emitBuildingSeized(building.ownerId, {
          buildingId: building.id,
          buildingName: building.name,
          buildingType: building.type,
          townName: building.town.name,
          daysDelinquent: daysSinceDelinquent,
          seizedByMayor: !!newOwnerId,
        });

        seizedCount++;
        console.log(
          `[PropertyTax] SEIZED building "${building.name}" from ${owner.name} in ${building.town.name} (${daysSinceDelinquent} days delinquent)`
        );
      } else {
        // Update delinquency tracker
        await db.update(buildings)
          .set({
            storage: {
              ...storageData,
              taxDelinquentSince: delinquentSince.toISOString(),
            },
          })
          .where(eq(buildings.id, building.id));

        emitBuildingDelinquent(building.ownerId, {
          buildingId: building.id,
          buildingName: building.name,
          buildingType: building.type,
          townName: building.town.name,
          amountOwed: dailyTax,
          daysDelinquent: daysSinceDelinquent + 1,
          daysUntilSeizure: 7 - (daysSinceDelinquent + 1),
        });

        delinquentCount++;
      }
    }
  }

  console.log(
    `[PropertyTax] Collected ${totalCollected}g from ${allBuildings.length} buildings. ` +
    `${delinquentCount} delinquent, ${seizedCount} seized.`
  );
}
