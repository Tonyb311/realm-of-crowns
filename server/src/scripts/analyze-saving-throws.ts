/**
 * Saving Throw Log Analysis — Part 3 & 4 of the comprehensive audit.
 * Pulls 450 group combat logs and verifies save mechanics.
 *
 * Usage: cd server && DATABASE_URL='...' npx tsx src/scripts/analyze-saving-throws.ts
 */

import { db, pool } from '../lib/db';
import { eq, desc } from 'drizzle-orm';
import * as schema from '@database/index';
import * as fs from 'fs';
import * as path from 'path';

interface RoundLogEntry {
  round?: number;
  actor?: string;
  actorId?: string;
  action?: string;
  abilityName?: string;
  spellName?: string;
  target?: string;
  targetId?: string;
  damage?: number;
  damageDealt?: number;
  saveDC?: number;
  saveRoll?: number;
  saveTotal?: number;
  saveSucceeded?: boolean;
  saveRequired?: boolean;
  statusEffectsApplied?: string[];
  perTargetResults?: Array<{
    targetId?: string;
    targetName?: string;
    damage?: number;
    saveDC?: number;
    saveRoll?: number;
    saveTotal?: number;
    saveSucceeded?: boolean;
    saved?: boolean;
    statusApplied?: string;
  }>;
  auraResults?: Array<{
    auraName?: string;
    auraType?: string;
    saveDC?: number;
    saveRoll?: number;
    saveTotal?: number;
    savePassed?: boolean;
    statusApplied?: string;
    targetName?: string;
  }>;
  deathThroesResult?: {
    saveDC?: number;
    saveType?: string;
    saveRoll?: number;
    saveTotal?: number;
    savePassed?: boolean;
    damage?: number;
  };
  [key: string]: unknown;
}

interface SaveEvent {
  category: 'monster_aoe' | 'monster_status' | 'monster_on_hit' | 'monster_fear_aura' | 'monster_death_throes' | 'monster_swallow' | 'player_save_ability' | 'player_status';
  abilityName: string;
  actorName: string;
  targetName?: string;
  saveDC?: number;
  saveRoll?: number;
  saveTotal?: number;
  saveSucceeded?: boolean;
  saveRolled: boolean;
  level?: number;
}

async function main() {
  console.log('=== Saving Throw Log Analysis ===\n');

  // Find the most recent group sim run
  // Drizzle doesn't support JSON path queries directly; use raw SQL or query all and filter
  const allRuns = await db.query.simulationRuns.findMany({
    orderBy: desc(schema.simulationRuns.startedAt),
    limit: 50,
  });

  const run = allRuns.find(r => {
    const config = r.config as any;
    return config?.source === 'batch-cli-group';
  });

  if (!run) {
    console.log('No group sim run found.');
    return;
  }

  console.log(`Using sim run ${run.id} from ${run.startedAt}`);

  const logs = await db.query.combatEncounterLogs.findMany({
    where: eq(schema.combatEncounterLogs.simulationRunId, run.id),
    columns: { id: true, rounds: true, opponentName: true, summary: true, characterName: true },
  });

  console.log(`Found ${logs.length} encounter logs\n`);

  const saveEvents: SaveEvent[] = [];
  let totalEntries = 0;

  for (const log of logs) {
    const rounds = log.rounds as unknown[];
    if (!Array.isArray(rounds)) continue;

    // Extract level from encounter context (first element) or summary
    const ctx = rounds[0] as any;
    let level = 0;
    if (ctx?._encounterContext?.combatants) {
      const firstPlayer = ctx._encounterContext.combatants.find((c: any) => c.team === 0);
      level = firstPlayer?.level ?? 0;
    }
    if (!level && log.summary) {
      const sum = typeof log.summary === 'string' ? JSON.parse(log.summary) : log.summary;
      level = (sum as any)?.level ?? 0;
    }

    // Skip first element (encounter context)
    for (let i = 1; i < rounds.length; i++) {
      const entry = rounds[i] as RoundLogEntry;
      if (!entry || !entry.action) continue;
      totalEntries++;

      // === Monster AoE with perTargetResults ===
      if (entry.action === 'monster_ability' && entry.perTargetResults && entry.perTargetResults.length > 0) {
        for (const ptr of entry.perTargetResults) {
          const rolled = ptr.saveRoll !== undefined || ptr.saveDC !== undefined || ptr.saved !== undefined;
          saveEvents.push({
            category: 'monster_aoe',
            abilityName: entry.abilityName || 'unknown',
            actorName: entry.actor || 'unknown',
            targetName: ptr.targetName,
            saveDC: ptr.saveDC ?? entry.saveDC,
            saveRoll: ptr.saveRoll,
            saveTotal: ptr.saveTotal,
            saveSucceeded: ptr.saved ?? ptr.saveSucceeded,
            saveRolled: rolled,
            level,
          });
        }
      }
      // === Monster ability with top-level save (status, on_hit, swallow) ===
      else if (entry.action === 'monster_ability' && !entry.perTargetResults) {
        const hasSaveFields = entry.saveDC !== undefined || entry.saveRoll !== undefined || entry.saveSucceeded !== undefined;
        const hasStatus = entry.statusEffectsApplied && entry.statusEffectsApplied.length > 0;
        const name = entry.abilityName || 'unknown';

        // Determine category
        let cat: SaveEvent['category'] = 'monster_status';
        if (name.toLowerCase().includes('swallow')) cat = 'monster_swallow';
        else if (hasStatus || hasSaveFields) cat = 'monster_status';

        if (hasSaveFields || hasStatus) {
          saveEvents.push({
            category: cat,
            abilityName: name,
            actorName: entry.actor || 'unknown',
            targetName: entry.target,
            saveDC: entry.saveDC,
            saveRoll: entry.saveRoll,
            saveTotal: entry.saveTotal,
            saveSucceeded: entry.saveSucceeded,
            saveRolled: hasSaveFields,
            level,
          });
        }
      }
      // === Monster on_hit effects (separate log entries) ===
      else if (entry.action === 'on_hit_effect' || (entry.action === 'monster_ability' && entry.abilityName?.includes('on_hit'))) {
        const hasSaveFields = entry.saveDC !== undefined || entry.saveRoll !== undefined;
        saveEvents.push({
          category: 'monster_on_hit',
          abilityName: entry.abilityName || 'unknown',
          actorName: entry.actor || 'unknown',
          targetName: entry.target,
          saveDC: entry.saveDC,
          saveRoll: entry.saveRoll,
          saveTotal: entry.saveTotal,
          saveSucceeded: entry.saveSucceeded,
          saveRolled: hasSaveFields,
          level,
        });
      }
      // === Player save-based abilities ===
      else if ((entry.action === 'class_ability' || entry.action === 'cast' || entry.action === 'psion_ability')) {
        const hasSaveFields = entry.saveDC !== undefined || entry.saveRoll !== undefined;
        const hasPerTarget = entry.perTargetResults && entry.perTargetResults.length > 0;

        if (hasPerTarget) {
          // AoE player ability
          for (const ptr of entry.perTargetResults!) {
            const rolled = ptr.saveRoll !== undefined || ptr.saveDC !== undefined || ptr.saved !== undefined;
            saveEvents.push({
              category: 'player_save_ability',
              abilityName: entry.abilityName || entry.spellName || 'unknown',
              actorName: entry.actor || 'unknown',
              targetName: ptr.targetName,
              saveDC: ptr.saveDC ?? entry.saveDC,
              saveRoll: ptr.saveRoll,
              saveTotal: ptr.saveTotal,
              saveSucceeded: ptr.saved ?? ptr.saveSucceeded,
              saveRolled: rolled,
              level,
            });
          }
        } else if (hasSaveFields) {
          saveEvents.push({
            category: 'player_save_ability',
            abilityName: entry.abilityName || entry.spellName || 'unknown',
            actorName: entry.actor || 'unknown',
            targetName: entry.target,
            saveDC: entry.saveDC,
            saveRoll: entry.saveRoll,
            saveTotal: entry.saveTotal,
            saveSucceeded: entry.saveSucceeded,
            saveRolled: hasSaveFields,
            level,
          });
        }
        // Check for status applied without save (Issue C abilities)
        if (!hasSaveFields && !hasPerTarget && entry.statusEffectsApplied && entry.statusEffectsApplied.length > 0) {
          saveEvents.push({
            category: 'player_status',
            abilityName: entry.abilityName || entry.spellName || 'unknown',
            actorName: entry.actor || 'unknown',
            targetName: entry.target,
            saveRolled: false,
            level,
          });
        }
      }

      // === Aura results (fear_aura) ===
      if (entry.auraResults && entry.auraResults.length > 0) {
        for (const aura of entry.auraResults) {
          const rolled = aura.saveRoll !== undefined || aura.saveDC !== undefined;
          saveEvents.push({
            category: 'monster_fear_aura',
            abilityName: aura.auraName || 'fear_aura',
            actorName: entry.actor || 'unknown',
            targetName: aura.targetName,
            saveDC: aura.saveDC,
            saveRoll: aura.saveRoll,
            saveTotal: aura.saveTotal,
            saveSucceeded: aura.savePassed,
            saveRolled: rolled,
            level,
          });
        }
      }

      // === Death throes ===
      if (entry.deathThroesResult) {
        const dt = entry.deathThroesResult;
        saveEvents.push({
          category: 'monster_death_throes',
          abilityName: 'death_throes',
          actorName: entry.actor || 'unknown',
          saveDC: dt.saveDC,
          saveRoll: dt.saveRoll,
          saveTotal: dt.saveTotal,
          saveSucceeded: dt.savePassed,
          saveRolled: dt.saveRoll !== undefined,
          level,
        });
      }
    }
  }

  console.log(`Total log entries scanned: ${totalEntries}`);
  console.log(`Total save-relevant events found: ${saveEvents.length}\n`);

  // === Analyze by category ===
  const categories: SaveEvent['category'][] = [
    'monster_aoe', 'monster_status', 'monster_on_hit', 'monster_fear_aura',
    'monster_death_throes', 'monster_swallow', 'player_save_ability', 'player_status',
  ];

  const output: string[] = [];
  output.push('# Saving Throw Log Analysis — Part 3 & 4\n');
  output.push(`**Sim Run:** ${run.id} (${run.startedAt})`);
  output.push(`**Encounters analyzed:** ${logs.length}`);
  output.push(`**Total log entries:** ${totalEntries}`);
  output.push(`**Save-relevant events:** ${saveEvents.length}\n`);

  // Per-category breakdown
  for (const cat of categories) {
    const events = saveEvents.filter(e => e.category === cat);
    if (events.length === 0) continue;

    const rolled = events.filter(e => e.saveRolled);
    const notRolled = events.filter(e => !e.saveRolled);
    const succeeded = rolled.filter(e => e.saveSucceeded === true);
    const failed = rolled.filter(e => e.saveSucceeded === false);

    output.push(`## ${cat.replace(/_/g, ' ').toUpperCase()}`);
    output.push(`| Metric | Value |`);
    output.push(`|--------|-------|`);
    output.push(`| Total events | ${events.length} |`);
    output.push(`| Saves rolled | ${rolled.length} (${pct(rolled.length, events.length)}) |`);
    output.push(`| Saves NOT rolled | ${notRolled.length} |`);
    output.push(`| Save succeeded | ${succeeded.length} (${pct(succeeded.length, rolled.length)}) |`);
    output.push(`| Save failed | ${failed.length} (${pct(failed.length, rolled.length)}) |`);
    output.push('');

    // Per-ability breakdown
    const byAbility = groupBy(events, e => e.abilityName);
    const sorted = Object.entries(byAbility).sort((a, b) => b[1].length - a[1].length);

    output.push('| Ability | Uses | Save Rolled | Success Rate | Avg DC | Avg Roll |');
    output.push('|---------|------|-------------|-------------|--------|----------|');
    for (const [name, evts] of sorted.slice(0, 20)) {
      const r = evts.filter(e => e.saveRolled);
      const s = r.filter(e => e.saveSucceeded === true);
      const avgDC = avg(r.map(e => e.saveDC).filter(Boolean) as number[]);
      const avgRoll = avg(r.map(e => e.saveTotal).filter(Boolean) as number[]);
      output.push(`| ${name} | ${evts.length} | ${r.length}/${evts.length} (${pct(r.length, evts.length)}) | ${pct(s.length, r.length)} | ${avgDC.toFixed(1)} | ${avgRoll.toFixed(1)} |`);
    }
    output.push('');

    // Abilities where save was NOT rolled (potential bugs)
    if (notRolled.length > 0) {
      const noSaveAbilities = groupBy(notRolled, e => e.abilityName);
      output.push('**Abilities with NO save rolled:**\n');
      for (const [name, evts] of Object.entries(noSaveAbilities).sort((a, b) => b[1].length - a[1].length)) {
        const statuses = evts.filter(e => {
          // Check if any underlying data hints at statuses
          return true;
        });
        output.push(`- **${name}**: ${evts.length} uses, no save (by: ${[...new Set(evts.map(e => e.actorName))].join(', ')})`);
      }
      output.push('');
    }
  }

  // === Part 4: Save Balance by Level ===
  output.push('## Part 4: Save Balance Analysis\n');

  const levelBrackets = [
    { label: 'L10', min: 1, max: 15 },
    { label: 'L20', min: 16, max: 25 },
    { label: 'L30', min: 26, max: 40 },
  ];

  // Monster saves vs player DCs
  output.push('### Player Save-Based Abilities vs Monster Saves\n');
  output.push('| Level Bracket | Total Saves | Success Rate | Avg Player DC | Avg Monster Save |');
  output.push('|--------------|-------------|-------------|---------------|-----------------|');

  for (const bracket of levelBrackets) {
    const evts = saveEvents.filter(e =>
      e.category === 'player_save_ability' &&
      e.saveRolled &&
      e.level! >= bracket.min && e.level! <= bracket.max
    );
    const succeeded = evts.filter(e => e.saveSucceeded === true);
    const avgDC = avg(evts.map(e => e.saveDC).filter(Boolean) as number[]);
    const avgSave = avg(evts.map(e => e.saveTotal).filter(Boolean) as number[]);
    output.push(`| ${bracket.label} | ${evts.length} | ${pct(succeeded.length, evts.length)} | ${avgDC.toFixed(1)} | ${avgSave.toFixed(1)} |`);
  }
  output.push('');

  // Player saves vs monster DCs (AoE + status + on_hit + fear_aura + death_throes)
  output.push('### Monster Abilities vs Player Saves\n');
  output.push('| Level Bracket | Total Saves | Success Rate | Avg Monster DC | Avg Player Save |');
  output.push('|--------------|-------------|-------------|----------------|----------------|');

  const monsterCats: SaveEvent['category'][] = ['monster_aoe', 'monster_status', 'monster_on_hit', 'monster_fear_aura', 'monster_death_throes', 'monster_swallow'];
  for (const bracket of levelBrackets) {
    const evts = saveEvents.filter(e =>
      monsterCats.includes(e.category) &&
      e.saveRolled &&
      e.level! >= bracket.min && e.level! <= bracket.max
    );
    const succeeded = evts.filter(e => e.saveSucceeded === true);
    const avgDC = avg(evts.map(e => e.saveDC).filter(Boolean) as number[]);
    const avgSave = avg(evts.map(e => e.saveTotal).filter(Boolean) as number[]);
    output.push(`| ${bracket.label} | ${evts.length} | ${pct(succeeded.length, evts.length)} | ${avgDC.toFixed(1)} | ${avgSave.toFixed(1)} |`);
  }
  output.push('');

  // === Summary Table ===
  output.push('## Summary Table\n');
  output.push('| Category | Total Uses | Save Rolled? | Success Rate | Verdict |');
  output.push('|----------|-----------|-------------|--------------|---------|');

  for (const cat of categories) {
    const events = saveEvents.filter(e => e.category === cat);
    if (events.length === 0) continue;
    const rolled = events.filter(e => e.saveRolled);
    const succeeded = rolled.filter(e => e.saveSucceeded === true);
    const rollPct = pct(rolled.length, events.length);
    const succPct = pct(succeeded.length, rolled.length);

    let verdict = 'OK';
    if (rolled.length === 0 && events.length > 0) verdict = 'MISSING';
    else if (rolled.length < events.length * 0.5) verdict = 'BUG — saves skipped';
    else if (succeeded.length > rolled.length * 0.8) verdict = 'TOO EASY';
    else if (succeeded.length < rolled.length * 0.1) verdict = 'TOO HARD';

    output.push(`| ${cat.replace(/_/g, ' ')} | ${events.length} | ${rolled.length}/${events.length} (${rollPct}) | ${succPct} | ${verdict} |`);
  }
  output.push('');

  // Write partial output (will be merged into the full audit doc)
  const outPath = path.join(__dirname, '../../..', 'docs', 'saving-throws-log-analysis.md');
  fs.writeFileSync(outPath, output.join('\n'));
  console.log(`\nLog analysis written to ${outPath}`);

  // Print chat summary
  console.log('\n=== CHAT SUMMARY ===\n');

  for (const cat of categories) {
    const events = saveEvents.filter(e => e.category === cat);
    if (events.length === 0) continue;
    const rolled = events.filter(e => e.saveRolled);
    const succeeded = rolled.filter(e => e.saveSucceeded === true);
    console.log(`${cat}: ${events.length} events, ${rolled.length} saves rolled (${pct(rolled.length, events.length)}), ${pct(succeeded.length, rolled.length)} success rate`);
  }

  await pool.end();
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%';
  return (n / total * 100).toFixed(1) + '%';
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of arr) {
    const key = fn(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
