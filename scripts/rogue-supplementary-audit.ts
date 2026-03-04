/**
 * Rogue-specific supplementary audit: checks crit bonus, stealth/untargetable,
 * multi-attack strikes, counter/reactive, dodge, DoT, delayed damage, steal,
 * flee, stacking buffs, and fallback-to-attack.
 */

process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026!@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const RUN_ID = 'cmmcb8xo20000ir7704c9snom';

async function main() {
  const logs = await prisma.combatEncounterLog.findMany({
    where: { simulationRunId: RUN_ID },
    select: { rounds: true },
  });

  console.log(`Analyzing ${logs.length} combat logs...\n`);

  // Counters
  let fallbackCount = 0;
  const fallbackDetails: string[] = [];

  // A. Backstab crit bonus + damage
  let backstabUses = 0;
  const backstabSamples: string[] = [];

  // B. Vanish (untargetable)
  let vanishUses = 0;
  const vanishSamples: string[] = [];

  // B. Ambush (requires stealth, 3x damage)
  let ambushUses = 0;
  const ambushSamples: string[] = [];

  // C. Dual Strike (2 attacks at 0.7x)
  let dualStrikeUses = 0;
  const dualStrikeSamples: { strikes: number; desc: string }[] = [];

  // C. Flurry of Blades (4 attacks at 0.4x)
  let flurryUses = 0;
  const flurrySamples: { strikes: number; desc: string }[] = [];

  // D. Riposte (counter)
  let riposteUses = 0;
  const riposteSamples: string[] = [];

  // E. Evasion (+30 dodge)
  let evasionUses = 0;
  const evasionSamples: string[] = [];

  // F. Poison Blade (DoT buff)
  let poisonBladeUses = 0;
  const poisonBladeSamples: string[] = [];

  // G. Death Mark (delayed damage)
  let deathMarkUses = 0;
  const deathMarkSamples: string[] = [];

  // H. Pilfer (steal gold)
  let pilferUses = 0;
  const pilferSamples: string[] = [];

  // H. Mug (damage + steal)
  let mugUses = 0;
  const mugSamples: string[] = [];

  // I. Disengage (flee)
  let disengageUses = 0;
  let disengageSuccesses = 0;
  const disengageSamples: string[] = [];

  // J. Dance of Steel (stacking)
  let danceOfSteelUses = 0;
  const danceOfSteelSamples: string[] = [];

  // Ability fire counts
  const abilityCounts: Record<string, number> = {};

  for (const log of logs) {
    const rounds = (log.rounds as any[]) ?? [];
    for (const entry of rounds) {
      if (entry.action !== 'class_ability') continue;

      const name = entry.abilityName as string;
      if (!name) continue;
      abilityCounts[name] = (abilityCounts[name] || 0) + 1;
      const desc = (entry.abilityDescription || '') as string;

      // K. Fallback-to-attack
      if (entry.fallbackToAttack) {
        fallbackCount++;
        if (fallbackDetails.length < 20) {
          fallbackDetails.push(`  ${name} R${entry.round}: ${desc}`);
        }
      }

      // A. Backstab
      if (name === 'Backstab') {
        backstabUses++;
        if (backstabSamples.length < 5) {
          backstabSamples.push(`  R${entry.round}: hit=${entry.hit}, crit=${entry.isCritical}, desc="${desc}"`);
        }
      }

      // B. Vanish
      if (name === 'Vanish') {
        vanishUses++;
        if (vanishSamples.length < 5) {
          vanishSamples.push(`  R${entry.round}: desc="${desc}", buffs=${JSON.stringify(entry.buffApplied || entry.statusEffectsApplied)}`);
        }
      }

      // B. Ambush
      if (name === 'Ambush') {
        ambushUses++;
        if (ambushSamples.length < 5) {
          ambushSamples.push(`  R${entry.round}: hit=${entry.hit}, damage=${entry.damageRoll?.total || 'N/A'}, desc="${desc}"`);
        }
      }

      // C. Dual Strike
      if (name === 'Dual Strike') {
        dualStrikeUses++;
        const strikes = entry.strikeResults?.length || entry.strikes?.length || 0;
        if (dualStrikeSamples.length < 5) {
          dualStrikeSamples.push({ strikes, desc });
        }
      }

      // C. Flurry of Blades
      if (name === 'Flurry of Blades') {
        flurryUses++;
        const strikes = entry.strikeResults?.length || entry.strikes?.length || 0;
        if (flurrySamples.length < 5) {
          flurrySamples.push({ strikes, desc });
        }
      }

      // D. Riposte
      if (name === 'Riposte') {
        riposteUses++;
        if (riposteSamples.length < 5) {
          riposteSamples.push(`  R${entry.round}: desc="${desc}"`);
        }
      }

      // E. Evasion
      if (name === 'Evasion') {
        evasionUses++;
        if (evasionSamples.length < 5) {
          evasionSamples.push(`  R${entry.round}: desc="${desc}"`);
        }
      }

      // F. Poison Blade
      if (name === 'Poison Blade') {
        poisonBladeUses++;
        if (poisonBladeSamples.length < 5) {
          poisonBladeSamples.push(`  R${entry.round}: desc="${desc}"`);
        }
      }

      // G. Death Mark
      if (name === 'Death Mark') {
        deathMarkUses++;
        if (deathMarkSamples.length < 5) {
          deathMarkSamples.push(`  R${entry.round}: desc="${desc}"`);
        }
      }

      // H. Pilfer
      if (name === 'Pilfer') {
        pilferUses++;
        if (pilferSamples.length < 5) {
          pilferSamples.push(`  R${entry.round}: desc="${desc}"`);
        }
      }

      // H. Mug
      if (name === 'Mug') {
        mugUses++;
        if (mugSamples.length < 5) {
          mugSamples.push(`  R${entry.round}: desc="${desc}", hit=${entry.hit}, damage=${entry.damageRoll?.total || 'N/A'}`);
        }
      }

      // I. Disengage
      if (name === 'Disengage') {
        disengageUses++;
        if (desc.includes('fled') || desc.includes('escape') || desc.includes('success')) {
          disengageSuccesses++;
        }
        if (disengageSamples.length < 5) {
          disengageSamples.push(`  R${entry.round}: desc="${desc}"`);
        }
      }

      // J. Dance of Steel
      if (name === 'Dance of Steel') {
        danceOfSteelUses++;
        if (danceOfSteelSamples.length < 5) {
          danceOfSteelSamples.push(`  R${entry.round}: desc="${desc}"`);
        }
      }
    }
  }

  // ---- Report ----

  console.log('=== ABILITY FIRE COUNTS ===');
  const sorted = Object.entries(abilityCounts).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sorted) {
    console.log(`  ${name}: ${count}`);
  }

  console.log('\n=== K. FALLBACK-TO-ATTACK ===');
  console.log(`Instances: ${fallbackCount}`);
  if (fallbackCount === 0) console.log('PASS: No abilities fell back to basic attack.');
  else {
    console.log(`ISSUE: ${fallbackCount} abilities fell back to basic attack!`);
    for (const d of fallbackDetails) console.log(d);
  }

  console.log('\n=== A. BACKSTAB (crit bonus +10, bonus damage +5) ===');
  console.log(`Uses: ${backstabUses}`);
  for (const s of backstabSamples) console.log(s);

  console.log('\n=== B. VANISH (untargetable 1 round) ===');
  console.log(`Uses: ${vanishUses}`);
  for (const s of vanishSamples) console.log(s);

  console.log('\n=== B. AMBUSH (3x damage from stealth) ===');
  console.log(`Uses: ${ambushUses}`);
  for (const s of ambushSamples) console.log(s);

  console.log('\n=== C. DUAL STRIKE (2 attacks at 0.7x) ===');
  console.log(`Uses: ${dualStrikeUses}`);
  for (const s of dualStrikeSamples) {
    console.log(`  Strikes: ${s.strikes}, desc="${s.desc}"`);
  }

  console.log('\n=== C. FLURRY OF BLADES (4 attacks at 0.4x) ===');
  console.log(`Uses: ${flurryUses}`);
  for (const s of flurrySamples) {
    console.log(`  Strikes: ${s.strikes}, desc="${s.desc}"`);
  }

  console.log('\n=== D. RIPOSTE (counter) ===');
  console.log(`Uses: ${riposteUses}`);
  for (const s of riposteSamples) console.log(s);

  console.log('\n=== E. EVASION (+30 dodge, 2 rounds) ===');
  console.log(`Uses: ${evasionUses}`);
  for (const s of evasionSamples) console.log(s);

  console.log('\n=== F. POISON BLADE (DoT buff, 3 charges) ===');
  console.log(`Uses: ${poisonBladeUses}`);
  for (const s of poisonBladeSamples) console.log(s);

  console.log('\n=== G. DEATH MARK (delayed 8d6 after 3 rounds) ===');
  console.log(`Uses: ${deathMarkUses}`);
  for (const s of deathMarkSamples) console.log(s);

  console.log('\n=== H. PILFER (steal 5-20 gold) ===');
  console.log(`Uses: ${pilferUses}`);
  for (const s of pilferSamples) console.log(s);

  console.log('\n=== H. MUG (3d6 damage + steal item) ===');
  console.log(`Uses: ${mugUses}`);
  for (const s of mugSamples) console.log(s);

  console.log('\n=== I. DISENGAGE (90% flee) ===');
  console.log(`Uses: ${disengageUses} | Successes: ${disengageSuccesses}`);
  if (disengageUses > 0) {
    console.log(`Success rate: ${(disengageSuccesses / disengageUses * 100).toFixed(1)}% (expected ~90%)`);
  }
  for (const s of disengageSamples) console.log(s);

  console.log('\n=== J. DANCE OF STEEL (stacking attack speed, max 5) ===');
  console.log(`Uses: ${danceOfSteelUses}`);
  for (const s of danceOfSteelSamples) console.log(s);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
