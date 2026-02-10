import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { BuildingType } from '@prisma/client';
import { emitBuildingTaxDue, emitBuildingDelinquent, emitBuildingSeized } from '../socket/events';

/**
 * Base daily property tax rates per building type (gold per day).
 */
const BASE_TAX_RATES: Record<BuildingType, number> = {
  HOUSE_SMALL: 5,
  HOUSE_MEDIUM: 15,
  HOUSE_LARGE: 30,
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
    console.log('[PropertyTax] Running daily property tax collection...');
    try {
      await collectPropertyTaxes();
    } catch (error) {
      console.error('[PropertyTax] Error:', error);
    }
  });

  console.log('[PropertyTax] Cron job registered (daily at midnight)');
}

async function collectPropertyTaxes() {
  // Get all completed buildings (level >= 1) with their owners, towns, and policies
  const buildings = await prisma.building.findMany({
    where: { level: { gte: 1 } },
    include: {
      owner: { select: { id: true, name: true, gold: true, userId: true } },
      town: {
        select: {
          id: true,
          name: true,
          mayorId: true,
          townPolicy: { select: { taxRate: true } },
          treasury: { select: { id: true } },
        },
      },
    },
  });

  let totalCollected = 0;
  let delinquentCount = 0;
  let seizedCount = 0;

  for (const building of buildings) {
    const baseTax = BASE_TAX_RATES[building.type] ?? 10;
    const levelMultiplier = building.level;
    const policyTaxRate = building.town.townPolicy?.taxRate ?? 0.10;
    // Tax = baseTax * level * (1 + townPolicyRate)
    // The policy rate modifies the base tax (e.g. 0.10 = 10% surcharge)
    const dailyTax = Math.floor(baseTax * levelMultiplier * (1 + policyTaxRate));

    const storageData = building.storage as Record<string, unknown>;

    if (building.owner.gold >= dailyTax) {
      // Owner can pay — collect tax
      await prisma.$transaction(async (tx) => {
        await tx.character.update({
          where: { id: building.ownerId },
          data: { gold: { decrement: dailyTax } },
        });

        // Deposit into town treasury
        if (building.town.treasury) {
          await tx.townTreasury.update({
            where: { id: building.town.treasury.id },
            data: { balance: { increment: dailyTax } },
          });
        }

        // Clear any delinquency tracking
        if (storageData.taxDelinquentSince) {
          const { taxDelinquentSince, ...rest } = storageData;
          await tx.building.update({
            where: { id: building.id },
            data: { storage: rest as Record<string, string | number | boolean | null> },
          });
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
        remainingGold: building.owner.gold - dailyTax,
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
          await prisma.building.update({
            where: { id: building.id },
            data: {
              ownerId: newOwnerId,
              storage: { ...storageData, taxDelinquentSince: undefined },
            },
          });
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
          `[PropertyTax] SEIZED building "${building.name}" from ${building.owner.name} in ${building.town.name} (${daysSinceDelinquent} days delinquent)`
        );
      } else {
        // Update delinquency tracker
        await prisma.building.update({
          where: { id: building.id },
          data: {
            storage: {
              ...storageData,
              taxDelinquentSince: delinquentSince.toISOString(),
            },
          },
        });

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
    `[PropertyTax] Collected ${totalCollected}g from ${buildings.length} buildings. ` +
    `${delinquentCount} delinquent, ${seizedCount} seized.`
  );
}
