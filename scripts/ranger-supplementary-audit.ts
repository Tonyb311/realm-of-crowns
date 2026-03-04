/**
 * Ranger-specific supplementary audit: checks companion/summon, traps,
 * DoT, multi-shot, buffs, flee, and fallback-to-attack.
 */

process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026!@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const RUN_ID = 'cmmcbr5tv000012n8dkarnx9v';

async function main() {

  const logs = await prisma.combatEncounterLog.findMany({
    where: { simulationRunId: RUN_ID },
    select: { rounds: true },
  });

  console.log(`Analyzing ${logs.length} combat logs...\n`);

  let fallbackCount = 0;
  const fallbackDetails: string[] = [];
  const abilityCounts: Record<string, number> = {};

  // A. Companion/Summon
  let callCompanionUses = 0;
  let alphaUses = 0;
  let bestialFuryUses = 0;
  let wildBondUses = 0;
  let packTacticsUses = 0;
  const companionSamples: string[] = [];

  // B. Traps
  let layTrapUses = 0;
  let explosiveTrapUses = 0;
  const trapSamples: string[] = [];

  // C. DoT (Venomous Arrow, Trip Wire)
  let venomousArrowUses = 0;
  let tripWireUses = 0;
  const dotSamples: string[] = [];

  // D. Multi-shot / AoE
  let multiShotUses = 0;
  let piercingArrowUses = 0;
  let rainOfArrowsUses = 0;
  let headShotUses = 0;
  let aimedShotUses = 0;
  const multiShotSamples: string[] = [];

  // E. Buffs
  const buffSamples: string[] = [];

  // F. Status: Snare (root), Hunter's Mark
  let snareUses = 0;
  let huntersMarkUses = 0;
  const statusSamples: string[] = [];

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
        if (fallbackDetails.length < 20) fallbackDetails.push(`  ${name} R${entry.round}: ${desc}`);
      }

      // Companion
      if (name === 'Call Companion') { callCompanionUses++; if (companionSamples.length < 5) companionSamples.push(`  R${entry.round}: "${desc}"`); }
      if (name === 'Alpha Predator') { alphaUses++; if (companionSamples.length < 8) companionSamples.push(`  Alpha R${entry.round}: "${desc}"`); }
      if (name === 'Bestial Fury') { bestialFuryUses++; if (companionSamples.length < 10) companionSamples.push(`  Fury R${entry.round}: "${desc}"`); }
      if (name === 'Wild Bond') { wildBondUses++; if (companionSamples.length < 12) companionSamples.push(`  WildBond R${entry.round}: "${desc}"`); }
      if (name === 'Pack Tactics') { packTacticsUses++; if (companionSamples.length < 14) companionSamples.push(`  PackTac R${entry.round}: "${desc}"`); }

      // Traps
      if (name === 'Lay Trap') { layTrapUses++; if (trapSamples.length < 5) trapSamples.push(`  R${entry.round}: "${desc}"`); }
      if (name === 'Explosive Trap') { explosiveTrapUses++; if (trapSamples.length < 8) trapSamples.push(`  Explosive R${entry.round}: "${desc}"`); }

      // DoT
      if (name === 'Venomous Arrow') { venomousArrowUses++; if (dotSamples.length < 5) dotSamples.push(`  R${entry.round}: "${desc}"`); }
      if (name === 'Trip Wire') { tripWireUses++; if (dotSamples.length < 8) dotSamples.push(`  Trip R${entry.round}: "${desc}"`); }

      // Multi-shot / AoE
      if (name === 'Multi-Shot') { multiShotUses++; if (multiShotSamples.length < 5) multiShotSamples.push(`  R${entry.round}: "${desc}"`); }
      if (name === 'Piercing Arrow') { piercingArrowUses++; if (multiShotSamples.length < 8) multiShotSamples.push(`  Piercing R${entry.round}: "${desc}"`); }
      if (name === 'Rain of Arrows') { rainOfArrowsUses++; if (multiShotSamples.length < 10) multiShotSamples.push(`  Rain R${entry.round}: "${desc}"`); }
      if (name === 'Headshot') { headShotUses++; if (multiShotSamples.length < 12) multiShotSamples.push(`  Headshot R${entry.round}: "${desc}"`); }
      if (name === 'Aimed Shot') { aimedShotUses++; }

      // Buffs
      if (['Bark Skin', 'Camouflage', 'Pack Tactics'].includes(name)) {
        if (buffSamples.length < 8) buffSamples.push(`  ${name} R${entry.round}: "${desc}"`);
      }

      // Status
      if (name === 'Snare') { snareUses++; if (statusSamples.length < 5) statusSamples.push(`  R${entry.round}: "${desc}"`); }
      if (name === "Hunter's Mark" || name === 'Hunters Mark') { huntersMarkUses++; if (statusSamples.length < 8) statusSamples.push(`  HMark R${entry.round}: "${desc}"`); }
    }
  }

  console.log('=== ABILITY FIRE COUNTS ===');
  const sorted = Object.entries(abilityCounts).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sorted) console.log(`  ${name}: ${count}`);

  console.log('\n=== FALLBACK-TO-ATTACK ===');
  console.log(`Instances: ${fallbackCount}`);
  if (fallbackCount === 0) console.log('PASS: No abilities fell back to basic attack.');
  else { console.log(`ISSUE: ${fallbackCount} abilities fell back!`); for (const d of fallbackDetails) console.log(d); }

  console.log('\n=== A. COMPANION/SUMMON ===');
  console.log(`Call Companion: ${callCompanionUses} | Alpha Predator: ${alphaUses}`);
  console.log(`Bestial Fury: ${bestialFuryUses} | Wild Bond: ${wildBondUses} | Pack Tactics: ${packTacticsUses}`);
  for (const s of companionSamples) console.log(s);

  console.log('\n=== B. TRAPS ===');
  console.log(`Lay Trap: ${layTrapUses} | Explosive Trap: ${explosiveTrapUses}`);
  for (const s of trapSamples) console.log(s);

  console.log('\n=== C. DOT (Venomous Arrow / Trip Wire) ===');
  console.log(`Venomous Arrow: ${venomousArrowUses} | Trip Wire: ${tripWireUses}`);
  for (const s of dotSamples) console.log(s);

  console.log('\n=== D. MULTI-SHOT / AOE ===');
  console.log(`Aimed Shot: ${aimedShotUses} | Multi-Shot: ${multiShotUses} | Piercing Arrow: ${piercingArrowUses}`);
  console.log(`Headshot: ${headShotUses} | Rain of Arrows: ${rainOfArrowsUses}`);
  for (const s of multiShotSamples) console.log(s);

  console.log('\n=== E. BUFFS ===');
  for (const s of buffSamples) console.log(s);

  console.log('\n=== F. STATUS (Snare / Hunters Mark) ===');
  console.log(`Snare: ${snareUses} | Hunters Mark: ${huntersMarkUses}`);
  for (const s of statusSamples) console.log(s);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
