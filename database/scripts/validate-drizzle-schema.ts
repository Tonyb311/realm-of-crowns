/**
 * Phase 8a Schema Validation Script
 * Connects to the database and runs a simple query on every table
 * to verify the Drizzle schema matches the actual database structure.
 *
 * Usage: DATABASE_URL='...' pnpm exec tsx scripts/validate-drizzle-schema.ts
 */
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as tables from '../schema/tables';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(pool);

function isDrizzleTable(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  return Object.getOwnPropertySymbols(value).some(
    s => s.toString() === 'Symbol(drizzle:IsDrizzleTable)'
  );
}

async function validate() {
  const tableEntries = Object.entries(tables).filter(
    ([, value]) => isDrizzleTable(value)
  ) as [string, any][];

  console.log(`\nValidating ${tableEntries.length} tables against live database...\n`);

  let passed = 0;
  let failed = 0;

  for (const [name, table] of tableEntries) {
    try {
      await db.select().from(table).limit(1);
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.log(`  ✗ ${name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${tableEntries.length} tables\n`);

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

validate().catch(err => {
  console.error('Validation failed:', err);
  pool.end();
  process.exit(1);
});
