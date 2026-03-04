/**
 * Cleric-specific supplementary audit: checks healing validation, cleanse,
 * holy/radiant damage, drain healing, HoT ticks, buff stacking, and fallback-to-attack.
 */

process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026!@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const RUN_ID = 'cmmcbiuzw0000mw848n1wfq16';

async function main() {
  const logs = await prisma.combatEncounterLog.findMany({
    where: { simulationRunId: RUN_ID },
    select: { rounds: true },
  });

  console.log(`Analyzing ${logs.length} combat logs...\n`);

  let fallbackCount = 0;
  const fallbackDetails: string[] = [];
  const abilityCounts: Record<string, number> = {};

  // A. Healing validation
  const healSamples: { name: string; desc: string; round: number }[] = [];

  // B. Cleanse
  let purifyUses = 0;
  const purifySamples: string[] = [];

  // C. Smite / Radiant damage
  const radiantAbilities: { name: string; desc: string }[] = [];

  // D. Buff applications
  const buffApplications: { name: string; desc: string }[] = [];

  // E. HoT (Regeneration, Rejuvenation)
  let regenUses = 0;
  let rejuvUses = 0;
  const hotSamples: string[] = [];

  // F. Drain (Judgment — damage + 50% heal)
  let judgmentUses = 0;
  const judgmentSamples: { damage: number; desc: string }[] = [];

  // G. Consecrate (AoE DoT)
  let consecrateUses = 0;
  const consecrateSamples: string[] = [];

  // Silence
  let silenceUses = 0;
  const silenceSamples: string[] = [];

  // Purging Flame (dispel_damage)
  let purgingFlameUses = 0;
  const purgingFlameSamples: string[] = [];

  // Excommunicate
  let excommunicateUses = 0;
  const excommunicateSamples: string[] = [];

  // Divine Wrath (AoE radiant)
  let divineWrathUses = 0;
  const divineWrathSamples: string[] = [];

  // Disengage / flee
  let disengageUses = 0;

  for (const log of logs) {
    const rounds = (log.rounds as any[]) ?? [];
    for (const entry of rounds) {
      if (entry.action !== 'class_ability') continue;

      const name = entry.abilityName as string;
      if (!name) continue;
      abilityCounts[name] = (abilityCounts[name] || 0) + 1;
      const desc = (entry.abilityDescription || '') as string;

      // Fallback-to-attack
      if (entry.fallbackToAttack) {
        fallbackCount++;
        if (fallbackDetails.length < 20) {
          fallbackDetails.push(`  ${name} R${entry.round}: ${desc}`);
        }
      }

      // Healing abilities
      if (['Healing Light', 'Mending Touch', 'Miracle'].includes(name)) {
        if (healSamples.length < 10) {
          healSamples.push({ name, desc, round: entry.round });
        }
      }

      // Purify
      if (name === 'Purify') {
        purifyUses++;
        if (purifySamples.length < 5) {
          purifySamples.push(`  R${entry.round}: desc="${desc}", statusEffects=${JSON.stringify(entry.statusEffectsApplied || [])}`);
        }
      }

      // Radiant damage abilities
      if (['Sacred Strike', 'Divine Strike', 'Holy Fire', 'Smite'].includes(name)) {
        if (radiantAbilities.length < 10) {
          radiantAbilities.push({ name, desc });
        }
      }

      // HoT
      if (name === 'Regeneration') {
        regenUses++;
        if (hotSamples.length < 5) hotSamples.push(`  ${name} R${entry.round}: desc="${desc}"`);
      }
      if (name === 'Rejuvenation') {
        rejuvUses++;
        if (hotSamples.length < 5) hotSamples.push(`  ${name} R${entry.round}: desc="${desc}"`);
      }

      // Judgment (drain: damage + 50% heal)
      if (name === 'Judgment') {
        judgmentUses++;
        const damage = entry.damageRoll?.total || 0;
        if (judgmentSamples.length < 5) {
          judgmentSamples.push({ damage, desc });
        }
      }

      // Consecrate
      if (name === 'Consecrate') {
        consecrateUses++;
        if (consecrateSamples.length < 5) consecrateSamples.push(`  R${entry.round}: desc="${desc}"`);
      }

      // Silence
      if (name === 'Silence') {
        silenceUses++;
        if (silenceSamples.length < 5) silenceSamples.push(`  R${entry.round}: desc="${desc}"`);
      }

      // Purging Flame
      if (name === 'Purging Flame') {
        purgingFlameUses++;
        if (purgingFlameSamples.length < 5) purgingFlameSamples.push(`  R${entry.round}: desc="${desc}"`);
      }

      // Excommunicate
      if (name === 'Excommunicate') {
        excommunicateUses++;
        if (excommunicateSamples.length < 5) excommunicateSamples.push(`  R${entry.round}: desc="${desc}"`);
      }

      // Divine Wrath
      if (name === 'Divine Wrath') {
        divineWrathUses++;
        if (divineWrathSamples.length < 5) divineWrathSamples.push(`  R${entry.round}: desc="${desc}"`);
      }

      // Buff applications (Holy Armor, Divine Shield, Blessed Ward, Sanctuary)
      if (['Holy Armor', 'Divine Shield', 'Blessed Ward', 'Sanctuary'].includes(name)) {
        if (buffApplications.length < 10) {
          buffApplications.push({ name, desc });
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

  console.log('\n=== FALLBACK-TO-ATTACK ===');
  console.log(`Instances: ${fallbackCount}`);
  if (fallbackCount === 0) console.log('PASS: No abilities fell back to basic attack.');
  else {
    console.log(`ISSUE: ${fallbackCount} abilities fell back to basic attack!`);
    for (const d of fallbackDetails) console.log(d);
  }

  console.log('\n=== A. HEALING VALIDATION ===');
  console.log(`Healing ability uses found: ${healSamples.length}`);
  for (const s of healSamples) {
    console.log(`  ${s.name} R${s.round}: "${s.desc}"`);
  }

  console.log('\n=== B. CLEANSE (Purify) ===');
  console.log(`Purify uses: ${purifyUses}`);
  for (const s of purifySamples) console.log(s);

  console.log('\n=== C. RADIANT/HOLY DAMAGE ===');
  console.log(`Radiant ability uses sampled: ${radiantAbilities.length}`);
  for (const s of radiantAbilities.slice(0, 8)) {
    console.log(`  ${s.name}: "${s.desc}"`);
  }

  console.log('\n=== D. BUFF APPLICATIONS ===');
  console.log(`Buff ability uses sampled: ${buffApplications.length}`);
  for (const s of buffApplications.slice(0, 8)) {
    console.log(`  ${s.name}: "${s.desc}"`);
  }

  console.log('\n=== E. HOT (Regeneration / Rejuvenation) ===');
  console.log(`Regeneration uses: ${regenUses} | Rejuvenation uses: ${rejuvUses}`);
  for (const s of hotSamples) console.log(s);

  console.log('\n=== F. JUDGMENT (drain: damage + 50% heal) ===');
  console.log(`Judgment uses: ${judgmentUses}`);
  for (const s of judgmentSamples) {
    console.log(`  damage=${s.damage}, desc="${s.desc}"`);
  }

  console.log('\n=== CONSECRATE (AoE DoT) ===');
  console.log(`Uses: ${consecrateUses}`);
  for (const s of consecrateSamples) console.log(s);

  console.log('\n=== SILENCE ===');
  console.log(`Uses: ${silenceUses}`);
  for (const s of silenceSamples) console.log(s);

  console.log('\n=== PURGING FLAME (dispel + damage) ===');
  console.log(`Uses: ${purgingFlameUses}`);
  for (const s of purgingFlameSamples) console.log(s);

  console.log('\n=== EXCOMMUNICATE (all stats -5) ===');
  console.log(`Uses: ${excommunicateUses}`);
  for (const s of excommunicateSamples) console.log(s);

  console.log('\n=== DIVINE WRATH (AoE radiant) ===');
  console.log(`Uses: ${divineWrathUses}`);
  for (const s of divineWrathSamples) console.log(s);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
