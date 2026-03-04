/**
 * Supplementary Mage audit: checks drain healing, auto-hit misses, fallback-to-attack,
 * and absorb mechanics that the generic audit script doesn't cover.
 */

process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026!@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const RUN_ID = 'cmmcahxrm000088rz91h3m8nt';

async function main() {
  const logs = await prisma.combatEncounterLog.findMany({
    where: { simulationRunId: RUN_ID },
    select: { rounds: true },
  });

  console.log(`Analyzing ${logs.length} combat logs...\n`);

  let fallbackCount = 0;
  const fallbackDetails: string[] = [];

  // Arcane Bolt auto-hit: should never have hit=false
  let arcaneBoltTotal = 0;
  let arcaneBoltMisses = 0;

  // Drain healing checks
  let lifeDrainChecks: { damage: number; heal: number; desc: string }[] = [];
  let enervationChecks: { damage: number; heal: number; desc: string }[] = [];
  let soulHarvestChecks: { desc: string }[] = [];

  // Absorb applications
  let absorbBuffCount = 0;
  const absorbNames = ['Mana Shield', 'Arcane Barrier', 'Elemental Shield', 'Bone Armor'];

  // Corpse Explosion — no corpse graceful fail
  let corpseExpNoCorpse = 0;
  let corpseExpSuccess = 0;

  // Polymorph save
  let polymorphAttempts = 0;
  let polymorphSuccesses = 0;
  let polymorphSaves: string[] = [];

  // Haste extra action
  let hasteUses = 0;

  for (const log of logs) {
    const rounds = (log.rounds as any[]) ?? [];
    for (const entry of rounds) {
      if (entry.action !== 'class_ability') continue;

      const name = entry.abilityName;
      const desc = entry.abilityDescription || '';

      // Fallback-to-attack check
      if (entry.fallbackToAttack) {
        fallbackCount++;
        fallbackDetails.push(`  ${name} R${entry.round}: ${desc}`);
      }

      // Arcane Bolt: auto-hit, should always hit
      if (name === 'Arcane Bolt') {
        arcaneBoltTotal++;
        if (entry.hit === false) arcaneBoltMisses++;
      }

      // Life Drain: check heal amount
      if (name === 'Life Drain') {
        const damage = entry.damageRoll?.total || 0;
        const healMatch = desc.match(/healed? (\d+)/i);
        const heal = healMatch ? parseInt(healMatch[1]) : -1;
        lifeDrainChecks.push({ damage, heal, desc });
      }

      // Enervation: check heal amount
      if (name === 'Enervation') {
        const damage = entry.damageRoll?.total || 0;
        const healMatch = desc.match(/healed? (\d+)/i);
        const heal = healMatch ? parseInt(healMatch[1]) : -1;
        enervationChecks.push({ damage, heal, desc });
      }

      // Soul Harvest
      if (name === 'Soul Harvest') {
        soulHarvestChecks.push({ desc });
      }

      // Corpse Explosion
      if (name === 'Corpse Explosion') {
        if (desc.includes('no corpse')) corpseExpNoCorpse++;
        else corpseExpSuccess++;
      }

      // Absorb buffs
      if (absorbNames.includes(name) && (desc.includes('buff') || desc.includes('absorb') || entry.buffApplied)) {
        absorbBuffCount++;
      }

      // Polymorph
      if (name === 'Polymorph') {
        polymorphAttempts++;
        if (desc.includes('polymorphed') || entry.statusEffectsApplied?.some((s: string) => s.toLowerCase().includes('polymorph'))) {
          polymorphSuccesses++;
        }
        if (desc.includes('save') || desc.includes('resist')) {
          polymorphSaves.push(desc);
        }
      }

      // Haste
      if (name === 'Haste') hasteUses++;
    }
  }

  console.log('=== J. FALLBACK-TO-ATTACK ===');
  console.log(`Instances: ${fallbackCount}`);
  if (fallbackCount === 0) console.log('PASS: No abilities fell back to basic attack.');
  else {
    console.log(`ISSUE: ${fallbackCount} abilities fell back to basic attack!`);
    for (const d of fallbackDetails.slice(0, 10)) console.log(d);
  }

  console.log('\n=== I. AUTO-HIT (Arcane Bolt) ===');
  console.log(`Total uses: ${arcaneBoltTotal} | Misses: ${arcaneBoltMisses}`);
  if (arcaneBoltTotal > 0 && arcaneBoltMisses === 0) {
    console.log('PASS: Arcane Bolt never missed across all uses.');
  } else if (arcaneBoltTotal === 0) {
    console.log('WARNING: No Arcane Bolt uses found.');
  } else {
    console.log(`ISSUE: Arcane Bolt missed ${arcaneBoltMisses}/${arcaneBoltTotal} times!`);
  }

  console.log('\n=== H. DRAIN MECHANICS ===');
  console.log(`Life Drain uses: ${lifeDrainChecks.length}`);
  for (const ld of lifeDrainChecks.slice(0, 5)) {
    console.log(`  damage=${ld.damage}, healFromDesc=${ld.heal}, desc="${ld.desc}"`);
  }
  console.log(`Enervation uses: ${enervationChecks.length}`);
  for (const ev of enervationChecks.slice(0, 5)) {
    console.log(`  damage=${ev.damage}, healFromDesc=${ev.heal}, desc="${ev.desc}"`);
  }
  console.log(`Soul Harvest uses: ${soulHarvestChecks.length}`);
  for (const sh of soulHarvestChecks.slice(0, 5)) {
    console.log(`  desc="${sh.desc}"`);
  }

  console.log('\n=== ABSORB BUFF APPLICATIONS ===');
  console.log(`Total absorb buff activations: ${absorbBuffCount}`);
  console.log('(Mana Shield, Arcane Barrier, Elemental Shield, Bone Armor)');

  console.log('\n=== CORPSE EXPLOSION ===');
  console.log(`Successful (with corpse): ${corpseExpSuccess}`);
  console.log(`Failed gracefully (no corpse): ${corpseExpNoCorpse}`);

  console.log('\n=== G. POLYMORPH (Save-based) ===');
  console.log(`Attempts: ${polymorphAttempts} | Successes: ${polymorphSuccesses}`);
  if (polymorphSaves.length > 0) {
    console.log('Save descriptions:');
    for (const s of polymorphSaves.slice(0, 5)) console.log(`  ${s}`);
  }

  console.log('\n=== HASTE (Extra Action) ===');
  console.log(`Uses: ${hasteUses}`);
  if (hasteUses === 0) console.log('NOTE: Haste never fired — ability queue deprioritizes buff abilities when CD-0 damage (Arcane Bolt) is always available.');

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
