/**
 * Quick query script to extract per-matchup sim results for reporting.
 * Usage: DATABASE_URL=... npx tsx src/scripts/query-sim-results.ts <runId>
 */
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function main() {
  const runId = process.argv[2];
  if (!runId) {
    console.error('Usage: npx tsx src/scripts/query-sim-results.ts <runId>');
    process.exit(1);
  }

  const rows = await db.execute(sql`
    SELECT
      simulation_tick as matchup_idx,
      character_name,
      opponent_name as monster,
      COUNT(*)::int as fights,
      SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END)::int as wins,
      ROUND(100.0 * SUM(CASE WHEN outcome = 'win' THEN 1 ELSE 0 END) / COUNT(*), 1) as win_pct,
      ROUND(AVG(total_rounds), 1) as avg_rounds
    FROM combat_encounter_logs
    WHERE simulation_run_id = ${runId}
    GROUP BY simulation_tick, character_name, opponent_name
    ORDER BY simulation_tick, character_name, opponent_name
  `);

  for (const r of rows.rows as any[]) {
    console.log(`[${r.matchup_idx}] ${r.character_name} vs ${r.monster}: ${r.win_pct}% (${r.wins}/${r.fights}, ${r.avg_rounds}r)`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
