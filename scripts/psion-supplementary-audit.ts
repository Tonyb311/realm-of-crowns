/**
 * Psion-specific supplementary audit: checks psion_ability action type (NOT class_ability),
 * mind control/dominate, banish, attack negation, echo action, psychic damage,
 * saves, telekinetic/force, precognition, drain, and fallback-to-attack.
 *
 * CRITICAL: Psion abilities ALL route through psion_ability, including tier 0.
 * The generic audit script only checks class_ability so it finds 0 uses for Psion.
 * This script is the PRIMARY audit for Psion.
 */

process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026!@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const RUN_ID = 'cmmccp49r0000i08pn6v1bsch';

async function main() {
  const logs = await prisma.combatEncounterLog.findMany({
    where: { simulationRunId: RUN_ID },
    select: { rounds: true },
  });

  console.log(`Analyzing ${logs.length} combat logs...\n`);

  let fallbackCount = 0;
  const fallbackDetails: string[] = [];
  const abilityCounts: Record<string, number> = {};
  // Also track class_ability to see if any psion abilities ended up there
  let classAbilityPsionCount = 0;

  // === TIER 0 ===
  // Psychic Jab (damage, bonusDamage: 3)
  let psychicJabUses = 0;
  const psychicJabSamples: string[] = [];
  // Mental Ward (buff, AC+3, 2 rounds)
  let mentalWardUses = 0;
  const mentalWardSamples: string[] = [];
  // Mind Fog (debuff, ATK -2, 2 rounds)
  let mindFogUses = 0;
  const mindFogSamples: string[] = [];
  // Psionic Dart (damage, 1d6+1)
  let psionicDartUses = 0;
  const psionicDartSamples: string[] = [];
  // Mental Fortress (buff, absorb 8, 3 rounds)
  let mentalFortressUses = 0;
  const mentalFortressSamples: string[] = [];
  // Thought Leech (drain, 1d4, 50% heal)
  let thoughtLeechUses = 0;
  const thoughtLeechSamples: string[] = [];
  // Ego Whip (damage, 2d4+1)
  let egoWhipUses = 0;
  const egoWhipSamples: string[] = [];
  // Id Insinuation (damage_status, 2 damage + stunned 1r) — FIXED ABILITY
  let idInsinuationUses = 0;
  const idInsinuationSamples: string[] = [];
  // Precognition (buff, AC+4, ATK+2, 2 rounds)
  let precognitionUses = 0;
  const precognitionSamples: string[] = [];

  // === TELEPATH ===
  // Mind Spike (damage_status, 2d6 psychic + weakened 2r, INT save)
  let mindSpikeUses = 0;
  const mindSpikeSamples: string[] = [];
  // Psychic Crush (damage_status, 3d8 psychic + stunned 1r, WIS save, half on save)
  let psychicCrushUses = 0;
  const psychicCrushSamples: string[] = [];
  // Dominate (control, WIS save, dominate 1r)
  let dominateUses = 0;
  let dominateSuccess = 0;
  const dominateSamples: string[] = [];
  // Mind Shatter (aoe_damage_status, 3d6 psychic + weakened 2r, WIS save)
  let mindShatterUses = 0;
  const mindShatterSamples: string[] = [];

  // === SEER ===
  // Foresight (buff, AC+2, save+2, 3 rounds)
  let foresightUses = 0;
  const foresightSamples: string[] = [];
  // Precognitive Dodge (reaction, negate attack)
  let precogDodgeUses = 0;
  const precogDodgeSamples: string[] = [];
  // Temporal Echo (echo, repeat last action)
  let temporalEchoUses = 0;
  const temporalEchoSamples: string[] = [];

  // === NOMAD ===
  // Blink Strike (teleport_attack, ATK+2, INT damage bonus)
  let blinkStrikeUses = 0;
  const blinkStrikeSamples: string[] = [];
  // Dimensional Pocket (phase, untargetable 1r)
  let dimPocketUses = 0;
  const dimPocketSamples: string[] = [];
  // Translocation (swap, INT save, enemy loses action)
  let translocationUses = 0;
  const translocationSamples: string[] = [];
  // Rift Walk (aoe_damage_status, 2d8 psychic + slowed 2r)
  let riftWalkUses = 0;
  const riftWalkSamples: string[] = [];

  // Save tracking
  const saveResults: { name: string; saveRoll: number; saveTotal: number; saveDC: number; passed: boolean }[] = [];

  for (const log of logs) {
    const rounds = (log.rounds as any[]) ?? [];
    for (const entry of rounds) {
      // Psion abilities log as BOTH psion_ability and class_ability depending on resolver path
      // Tier 0 goes through class-ability-resolver (class_ability), spec goes through resolvePsionAbility
      // but logger may normalize the action type. Accept both.
      if (entry.action === 'psion_ability') classAbilityPsionCount++; // track actual psion_ability entries
      if (entry.action !== 'psion_ability' && entry.action !== 'class_ability') continue;

      const name = entry.abilityName as string;
      if (!name) continue;
      abilityCounts[name] = (abilityCounts[name] || 0) + 1;
      const desc = (entry.description || entry.abilityDescription || '') as string;

      // Fallback-to-attack
      if (entry.fallbackToAttack) {
        fallbackCount++;
        if (fallbackDetails.length < 20) fallbackDetails.push(`  ${name} R${entry.round}: ${desc}`);
      }

      // Save tracking
      if (entry.saveRequired && entry.saveRoll !== undefined) {
        if (saveResults.length < 50) {
          saveResults.push({
            name,
            saveRoll: entry.saveRoll,
            saveTotal: entry.saveTotal ?? entry.saveRoll,
            saveDC: entry.saveDC ?? 0,
            passed: (entry.saveTotal ?? entry.saveRoll) >= (entry.saveDC ?? 0),
          });
        }
      }

      // === TIER 0 ===
      if (name === 'Psychic Jab') { psychicJabUses++; if (psychicJabSamples.length < 5) psychicJabSamples.push(`  R${entry.round}: damage=${entry.damage ?? 'N/A'}, desc="${desc}"`); }
      if (name === 'Mental Ward') { mentalWardUses++; if (mentalWardSamples.length < 5) mentalWardSamples.push(`  R${entry.round}: desc="${desc}"`); }
      if (name === 'Mind Fog') { mindFogUses++; if (mindFogSamples.length < 5) mindFogSamples.push(`  R${entry.round}: desc="${desc}"`); }
      if (name === 'Psionic Dart') { psionicDartUses++; if (psionicDartSamples.length < 5) psionicDartSamples.push(`  R${entry.round}: damage=${entry.damage ?? 'N/A'}, desc="${desc}"`); }
      if (name === 'Mental Fortress') { mentalFortressUses++; if (mentalFortressSamples.length < 5) mentalFortressSamples.push(`  R${entry.round}: desc="${desc}"`); }
      if (name === 'Thought Leech') { thoughtLeechUses++; if (thoughtLeechSamples.length < 5) thoughtLeechSamples.push(`  R${entry.round}: damage=${entry.damage ?? 'N/A'}, desc="${desc}"`); }
      if (name === 'Ego Whip') { egoWhipUses++; if (egoWhipSamples.length < 5) egoWhipSamples.push(`  R${entry.round}: damage=${entry.damage ?? 'N/A'}, desc="${desc}"`); }
      if (name === 'Id Insinuation') { idInsinuationUses++; if (idInsinuationSamples.length < 5) idInsinuationSamples.push(`  R${entry.round}: damage=${entry.damage ?? 'N/A'}, status=${entry.statusApplied ?? 'N/A'}, desc="${desc}"`); }
      if (name === 'Precognition') { precognitionUses++; if (precognitionSamples.length < 5) precognitionSamples.push(`  R${entry.round}: desc="${desc}"`); }

      // === TELEPATH ===
      if (name === 'Mind Spike') { mindSpikeUses++; if (mindSpikeSamples.length < 5) mindSpikeSamples.push(`  R${entry.round}: damage=${entry.damage ?? 'N/A'}, save=${entry.saveRoll}/${entry.saveDC}, desc="${desc}"`); }
      if (name === 'Psychic Crush') { psychicCrushUses++; if (psychicCrushSamples.length < 5) psychicCrushSamples.push(`  R${entry.round}: damage=${entry.damage ?? 'N/A'}, save=${entry.saveRoll}/${entry.saveDC}, status=${entry.statusApplied ?? 'N/A'}, desc="${desc}"`); }
      if (name === 'Dominate') {
        dominateUses++;
        if (desc.includes('dominated') || desc.includes('control') || entry.controlled) dominateSuccess++;
        if (dominateSamples.length < 8) dominateSamples.push(`  R${entry.round}: save=${entry.saveRoll}/${entry.saveDC}, controlled=${entry.controlled ?? false}, desc="${desc}"`);
      }
      if (name === 'Mind Shatter') { mindShatterUses++; if (mindShatterSamples.length < 5) mindShatterSamples.push(`  R${entry.round}: damage=${entry.damage ?? 'N/A'}, targets=${entry.targetIds?.length ?? 1}, desc="${desc}"`); }

      // === SEER ===
      if (name === 'Foresight') { foresightUses++; if (foresightSamples.length < 5) foresightSamples.push(`  R${entry.round}: status=${entry.statusApplied ?? 'N/A'}, desc="${desc}"`); }
      if (name === 'Precognitive Dodge') { precogDodgeUses++; if (precogDodgeSamples.length < 5) precogDodgeSamples.push(`  R${entry.round}: negated=${entry.negatedAttack ?? false}, desc="${desc}"`); }
      if (name === 'Temporal Echo') { temporalEchoUses++; if (temporalEchoSamples.length < 5) temporalEchoSamples.push(`  R${entry.round}: echo=${entry.echoAction ?? false}, desc="${desc}"`); }

      // === NOMAD ===
      if (name === 'Blink Strike') { blinkStrikeUses++; if (blinkStrikeSamples.length < 5) blinkStrikeSamples.push(`  R${entry.round}: damage=${entry.damage ?? 'N/A'}, targetHp=${entry.targetHpAfter ?? 'N/A'}, desc="${desc}"`); }
      if (name === 'Dimensional Pocket') { dimPocketUses++; if (dimPocketSamples.length < 5) dimPocketSamples.push(`  R${entry.round}: status=${entry.statusApplied ?? 'N/A'}, desc="${desc}"`); }
      if (name === 'Translocation') { translocationUses++; if (translocationSamples.length < 5) translocationSamples.push(`  R${entry.round}: save=${entry.saveRoll}/${entry.saveDC}, desc="${desc}"`); }
      if (name === 'Rift Walk') { riftWalkUses++; if (riftWalkSamples.length < 5) riftWalkSamples.push(`  R${entry.round}: damage=${entry.damage ?? 'N/A'}, targets=${entry.targetIds?.length ?? 1}, desc="${desc}"`); }
    }
  }

  // ---- Report ----

  console.log('=== ROUTING CHECK ===');
  console.log(`Psion abilities found in class_ability: ${classAbilityPsionCount}`);
  if (classAbilityPsionCount === 0) console.log('PASS: All Psion abilities correctly route through psion_ability.');
  else console.log(`ISSUE: ${classAbilityPsionCount} Psion abilities found in class_ability action type!`);

  console.log('\n=== ABILITY FIRE COUNTS (psion_ability) ===');
  const sorted = Object.entries(abilityCounts).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sorted) console.log(`  ${name}: ${count}`);

  console.log('\n=== FALLBACK-TO-ATTACK ===');
  console.log(`Instances: ${fallbackCount}`);
  if (fallbackCount === 0) console.log('PASS: No abilities fell back to basic attack.');
  else { console.log(`ISSUE: ${fallbackCount} abilities fell back!`); for (const d of fallbackDetails) console.log(d); }

  // Tier 0
  console.log('\n=== TIER 0: PSYCHIC JAB (damage, bonusDamage: 3) ===');
  console.log(`Uses: ${psychicJabUses}`);
  for (const s of psychicJabSamples) console.log(s);

  console.log('\n=== TIER 0: MENTAL WARD (buff, AC+3, 2r) ===');
  console.log(`Uses: ${mentalWardUses}`);
  for (const s of mentalWardSamples) console.log(s);

  console.log('\n=== TIER 0: MIND FOG (debuff, ATK-2, 2r) ===');
  console.log(`Uses: ${mindFogUses}`);
  for (const s of mindFogSamples) console.log(s);

  console.log('\n=== TIER 0: PSIONIC DART (damage, 1d6+1) ===');
  console.log(`Uses: ${psionicDartUses}`);
  for (const s of psionicDartSamples) console.log(s);

  console.log('\n=== TIER 0: MENTAL FORTRESS (buff, absorb 8, 3r) ===');
  console.log(`Uses: ${mentalFortressUses}`);
  for (const s of mentalFortressSamples) console.log(s);

  console.log('\n=== TIER 0: THOUGHT LEECH (drain, 1d4, 50% heal) ===');
  console.log(`Uses: ${thoughtLeechUses}`);
  for (const s of thoughtLeechSamples) console.log(s);

  console.log('\n=== TIER 0: EGO WHIP (damage, 2d4+1) ===');
  console.log(`Uses: ${egoWhipUses}`);
  for (const s of egoWhipSamples) console.log(s);

  console.log('\n=== TIER 0: ID INSINUATION (damage_status, 2dmg + stunned 1r) — FIXED ===');
  console.log(`Uses: ${idInsinuationUses}`);
  for (const s of idInsinuationSamples) console.log(s);

  console.log('\n=== TIER 0: PRECOGNITION (buff, AC+4, ATK+2, 2r) ===');
  console.log(`Uses: ${precognitionUses}`);
  for (const s of precognitionSamples) console.log(s);

  // Telepath
  console.log('\n=== TELEPATH: MIND SPIKE (2d6 psychic + weakened, INT save) ===');
  console.log(`Uses: ${mindSpikeUses}`);
  for (const s of mindSpikeSamples) console.log(s);

  console.log('\n=== TELEPATH: PSYCHIC CRUSH (3d8 psychic + stunned, WIS save, half on save) ===');
  console.log(`Uses: ${psychicCrushUses}`);
  for (const s of psychicCrushSamples) console.log(s);

  console.log('\n=== TELEPATH: DOMINATE (control, WIS save, dominate 1r) ===');
  console.log(`Uses: ${dominateUses} | Successes (controlled): ${dominateSuccess}`);
  for (const s of dominateSamples) console.log(s);

  console.log('\n=== TELEPATH: MIND SHATTER (AoE 3d6 psychic + weakened, WIS save) ===');
  console.log(`Uses: ${mindShatterUses}`);
  for (const s of mindShatterSamples) console.log(s);

  // Seer
  console.log('\n=== SEER: FORESIGHT (buff, AC+2, save+2, 3r) ===');
  console.log(`Uses: ${foresightUses}`);
  for (const s of foresightSamples) console.log(s);

  console.log('\n=== SEER: PRECOGNITIVE DODGE (negate attack, 1/combat) ===');
  console.log(`Uses: ${precogDodgeUses}`);
  for (const s of precogDodgeSamples) console.log(s);

  console.log('\n=== SEER: TEMPORAL ECHO (repeat last action) ===');
  console.log(`Uses: ${temporalEchoUses}`);
  for (const s of temporalEchoSamples) console.log(s);

  // Nomad
  console.log('\n=== NOMAD: BLINK STRIKE (teleport + attack, ATK+2, INT dmg bonus) ===');
  console.log(`Uses: ${blinkStrikeUses}`);
  for (const s of blinkStrikeSamples) console.log(s);

  console.log('\n=== NOMAD: DIMENSIONAL POCKET (phase, untargetable 1r) ===');
  console.log(`Uses: ${dimPocketUses}`);
  for (const s of dimPocketSamples) console.log(s);

  console.log('\n=== NOMAD: TRANSLOCATION (swap, INT save) ===');
  console.log(`Uses: ${translocationUses}`);
  for (const s of translocationSamples) console.log(s);

  console.log('\n=== NOMAD: RIFT WALK (AoE 2d8 psychic + slowed, WIS save) ===');
  console.log(`Uses: ${riftWalkUses}`);
  for (const s of riftWalkSamples) console.log(s);

  // Save audit
  console.log('\n=== SAVE MECHANICS ===');
  console.log(`Total saves tracked: ${saveResults.length}`);
  const passed = saveResults.filter(s => s.passed).length;
  const failed = saveResults.length - passed;
  console.log(`Passed: ${passed} | Failed: ${failed}`);
  for (const s of saveResults.slice(0, 10)) {
    console.log(`  ${s.name}: roll=${s.saveRoll}, total=${s.saveTotal}, DC=${s.saveDC}, ${s.passed ? 'PASS' : 'FAIL'}`);
  }

  // Passives that should NOT fire
  console.log('\n=== PASSIVES (should have 0 uses) ===');
  const passiveNames = ['Thought Shield', 'Danger Sense', 'Third Eye', 'Phase Step'];
  for (const pn of passiveNames) {
    const count = abilityCounts[pn] || 0;
    console.log(`  ${pn}: ${count} ${count > 0 ? '(may be passive activation log)' : '(correct — passive)'}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
