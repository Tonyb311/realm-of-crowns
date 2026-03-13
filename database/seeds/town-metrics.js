/**
 * Seed town metrics — 5 metric types per town.
 * Base value derived from town prosperity level (stored in features jsonb).
 */
import crypto from 'crypto';
import * as schema from '../schema/index.js';

const METRIC_TYPES = ['DEFENSES', 'PUBLIC_HEALTH', 'LAW_ENFORCEMENT', 'MARKET_EFFICIENCY', 'ELECTION_INTEGRITY'];

function getBaseValue(prosperityLevel) {
  switch (prosperityLevel) {
    case 5: return 60;
    case 4: return 55;
    case 3: return 50;
    case 2: return 40;
    default: return 35;
  }
}

export async function seedTownMetrics(db) {
  console.log('--- Seeding Town Metrics ---');

  // Fetch all towns to read their prosperity from features jsonb
  const allTowns = await db.query.towns.findMany({
    columns: { id: true, name: true, features: true },
  });

  let created = 0;
  for (const town of allTowns) {
    const prosperityLevel = town.features?.prosperityLevel ?? 3;
    const baseValue = getBaseValue(prosperityLevel);

    for (const metricType of METRIC_TYPES) {
      await db.insert(schema.townMetrics).values({
        id: crypto.randomUUID(),
        townId: town.id,
        metricType,
        baseValue,
        modifier: 0,
        effectiveValue: baseValue,
        lastUpdatedBy: null,
      }).onConflictDoUpdate({
        target: [schema.townMetrics.townId, schema.townMetrics.metricType],
        set: {
          baseValue,
          effectiveValue: baseValue, // reset to base on re-seed (modifier preserved if lastUpdatedBy set)
        },
      });
      created++;
    }
  }

  console.log(`  Seeded ${created} town metric rows across ${allTowns.length} towns`);
}
