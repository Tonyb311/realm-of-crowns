/**
 * Query group sim results aggregated by party name and matchup tick.
 * Usage: DATABASE_URL=... npx tsx src/scripts/query-group-sim.ts <runId>
 */
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  const runId = process.argv[2];
  if (!runId) {
    console.error('Usage: npx tsx src/scripts/query-group-sim.ts <runId>');
    process.exit(1);
  }

  // First, check total count
  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int as cnt FROM combat_encounter_logs
    WHERE simulation_run_id = ${runId}
  `);
  console.log('Total encounters:', (countResult.rows[0] as any).cnt);

  // Query aggregated by character_name (party name) and simulation_tick
  const rows = await db.execute(sql`
    SELECT
      simulation_tick as matchup_idx,
      character_name as party_name,
      COUNT(*)::int as fights,
      SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END)::int as wins,
      ROUND(100.0 * SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) / COUNT(*), 1) as win_pct,
      ROUND(AVG(total_rounds), 1) as avg_rounds
    FROM combat_encounter_logs
    WHERE simulation_run_id = ${runId}
    GROUP BY simulation_tick, character_name
    ORDER BY simulation_tick, character_name
  `);

  if (rows.rows.length === 0) {
    console.log('No rows found. Checking what columns exist...');
    const sample = await db.execute(sql`
      SELECT * FROM combat_encounter_logs
      WHERE simulation_run_id = ${runId}
      LIMIT 2
    `);
    for (const r of sample.rows as any[]) {
      console.log(JSON.stringify(r, null, 2));
    }
  } else {
    for (const r of rows.rows as any[]) {
      console.log(`[${r.matchup_idx}] ${r.party_name}: ${r.win_pct}% (${r.wins}/${r.fights}, ${r.avg_rounds}r)`);
    }
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
