/**
 * Bard-specific supplementary audit: checks fixed abilities (heals, damage_debuffs),
 * healing validation, debuff/status effects, buffs, special mechanics (Diplomat's Gambit,
 * Tome of Secrets), damage abilities, and fallback-to-attack.
 */

process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026%21@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const RUN_ID = 'cmmcc1ar00000t2z3ubkmt4bv';

async function main() {
  const logs = await prisma.combatEncounterLog.findMany({
    where: { simulationRunId: RUN_ID },
    select: { rounds: true },
  });

  console.log(`Analyzing ${logs.length} combat logs...\n`);

  // Counters
  let fallbackCount = 0;
  const fallbackDetails: string[] = [];
  const abilityCounts: Record<string, number> = {};

  // A. Fixed Abilities (critical) — healing
  let soothingMelodyUses = 0;
  const soothingMelodyHeals: { amount: number; desc: string; round: number }[] = [];
  let soothingMelodyOutOfRange = 0;

  let inspiringBalladUses = 0;
  const inspiringBalladHeals: { amount: number; desc: string; round: number }[] = [];
  let inspiringBalladOutOfRange = 0;

  // A. Fixed Abilities (critical) — damage_debuff
  let viciousMockeryUses = 0;
  const viciousMockerySamples: { damage: number; desc: string; round: number; hasDebuff: boolean }[] = [];
  let viciousMockeryNoDamage = 0;
  let viciousMockeryNoDebuff = 0;

  let cacophonyUses = 0;
  const cacophonySamples: { damage: number; desc: string; round: number; hasDebuff: boolean }[] = [];
  let cacophonyNoDamage = 0;
  let cacophonyNoDebuff = 0;

  let shatterUses = 0;
  const shatterSamples: { damage: number; desc: string; round: number; hasDebuff: boolean }[] = [];
  let shatterNoDamage = 0;
  let shatterNoDebuff = 0;

  // C. Debuff/Status
  let jarringNoteUses = 0;
  const jarringNoteSamples: string[] = [];

  let lullabyUses = 0;
  const lullabySamples: string[] = [];

  let charmingWordsUses = 0;
  const charmingWordsSamples: string[] = [];

  let silverTongueUses = 0;
  const silverTongueSamples: string[] = [];

  let enthrallUses = 0;
  const enthrallSamples: string[] = [];

  // D. Buffs
  let hymnOfFortitudeUses = 0;
  const hymnOfFortitudeSamples: string[] = [];

  let warSongUses = 0;
  const warSongSamples: string[] = [];

  let marchingCadenceUses = 0;
  const marchingCadenceSamples: string[] = [];

  let analyzeUses = 0;
  const analyzeSamples: string[] = [];

  let arcaneInsightUses = 0;
  const arcaneInsightSamples: string[] = [];

  // E. Special Mechanics
  let diplomatsGambitUses = 0;
  let diplomatsGambitSuccesses = 0;
  let diplomatsGambitFailures = 0;
  const diplomatsGambitSamples: string[] = [];

  let tomeOfSecretsUses = 0;
  const tomeOfSecretsSamples: string[] = [];

  // F. Damage abilities
  let cuttingWordsUses = 0;
  const cuttingWordsSamples: { damage: number; desc: string }[] = [];

  let thunderclapUses = 0;
  const thunderclapSamples: { damage: number; desc: string }[] = [];

  let discordantNoteUses = 0;
  const discordantNoteSamples: { damage: number; desc: string }[] = [];

  let exploitWeaknessUses = 0;
  const exploitWeaknessSamples: { damage: number; desc: string; crit: boolean }[] = [];

  // Helper: extract heal amount from description (looks for "healed for X HP" or "heals for X")
  function extractHealAmount(desc: string): number | null {
    const match = desc.match(/heal(?:ed|s)?\s+(?:for\s+)?(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }

  // Helper: extract damage amount from description
  function extractDamageAmount(desc: string): number | null {
    const match = desc.match(/(\d+)\s+(?:sonic\s+)?damage/i) || desc.match(/deals?\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  }

  for (const log of logs) {
    const rounds = (log.rounds as any[]) ?? [];
    for (const entry of rounds) {
      if (entry.action !== 'class_ability') continue;

      const name = entry.abilityName as string;
      if (!name) continue;
      abilityCounts[name] = (abilityCounts[name] || 0) + 1;
      const desc = (entry.abilityDescription || '') as string;

      // G. Fallback-to-attack
      if (entry.fallbackToAttack) {
        fallbackCount++;
        if (fallbackDetails.length < 20) {
          fallbackDetails.push(`  ${name} R${entry.round}: ${desc}`);
        }
      }

      // ====== A. FIXED ABILITIES (CRITICAL) ======

      // Soothing Melody (heal, 1d6+3, expected range 4-9)
      if (name === 'Soothing Melody') {
        soothingMelodyUses++;
        const healAmt = entry.healAmount || entry.damageRoll?.total || extractHealAmount(desc);
        const amount = typeof healAmt === 'number' ? healAmt : 0;
        if (soothingMelodyHeals.length < 8) {
          soothingMelodyHeals.push({ amount, desc, round: entry.round });
        }
        if (amount > 0 && (amount < 4 || amount > 9)) {
          soothingMelodyOutOfRange++;
        }
      }

      // Inspiring Ballad (heal, 2d6+3, expected range 5-15)
      if (name === 'Inspiring Ballad') {
        inspiringBalladUses++;
        const healAmt = entry.healAmount || entry.damageRoll?.total || extractHealAmount(desc);
        const amount = typeof healAmt === 'number' ? healAmt : 0;
        if (inspiringBalladHeals.length < 8) {
          inspiringBalladHeals.push({ amount, desc, round: entry.round });
        }
        if (amount > 0 && (amount < 5 || amount > 15)) {
          inspiringBalladOutOfRange++;
        }
      }

      // Vicious Mockery (damage_debuff, 1d6 + acReduction: 2, 2 rounds)
      if (name === 'Vicious Mockery') {
        viciousMockeryUses++;
        const damage = entry.damageRoll?.total || extractDamageAmount(desc) || 0;
        const hasDebuff = !!(entry.debuffApplied || entry.statusEffectsApplied?.length || desc.match(/armor|ac|reduce/i));
        if (damage === 0) viciousMockeryNoDamage++;
        if (!hasDebuff) viciousMockeryNoDebuff++;
        if (viciousMockerySamples.length < 8) {
          viciousMockerySamples.push({ damage, desc, round: entry.round, hasDebuff });
        }
      }

      // Cacophony (damage_debuff, 1d4 + acReduction: 2, 2 rounds)
      if (name === 'Cacophony') {
        cacophonyUses++;
        const damage = entry.damageRoll?.total || extractDamageAmount(desc) || 0;
        const hasDebuff = !!(entry.debuffApplied || entry.statusEffectsApplied?.length || desc.match(/armor|ac|reduce/i));
        if (damage === 0) cacophonyNoDamage++;
        if (!hasDebuff) cacophonyNoDebuff++;
        if (cacophonySamples.length < 8) {
          cacophonySamples.push({ damage, desc, round: entry.round, hasDebuff });
        }
      }

      // Shatter (damage_debuff, 3d6 sonic + acReduction: 4, 3 rounds)
      if (name === 'Shatter') {
        shatterUses++;
        const damage = entry.damageRoll?.total || extractDamageAmount(desc) || 0;
        const hasDebuff = !!(entry.debuffApplied || entry.statusEffectsApplied?.length || desc.match(/armor|ac|reduce/i));
        if (damage === 0) shatterNoDamage++;
        if (!hasDebuff) shatterNoDebuff++;
        if (shatterSamples.length < 8) {
          shatterSamples.push({ damage, desc, round: entry.round, hasDebuff });
        }
      }

      // ====== C. DEBUFF/STATUS ======

      if (name === 'Jarring Note') {
        jarringNoteUses++;
        if (jarringNoteSamples.length < 5) {
          jarringNoteSamples.push(`  R${entry.round}: desc="${desc}", debuff=${JSON.stringify(entry.debuffApplied || entry.statusEffectsApplied || [])}`);
        }
      }

      if (name === 'Lullaby') {
        lullabyUses++;
        if (lullabySamples.length < 5) {
          lullabySamples.push(`  R${entry.round}: desc="${desc}", status=${JSON.stringify(entry.statusEffectsApplied || [])}`);
        }
      }

      if (name === 'Charming Words') {
        charmingWordsUses++;
        if (charmingWordsSamples.length < 5) {
          charmingWordsSamples.push(`  R${entry.round}: desc="${desc}", debuff=${JSON.stringify(entry.debuffApplied || entry.statusEffectsApplied || [])}`);
        }
      }

      if (name === 'Silver Tongue') {
        silverTongueUses++;
        if (silverTongueSamples.length < 5) {
          silverTongueSamples.push(`  R${entry.round}: desc="${desc}", status=${JSON.stringify(entry.statusEffectsApplied || [])}`);
        }
      }

      if (name === 'Enthrall') {
        enthrallUses++;
        if (enthrallSamples.length < 5) {
          enthrallSamples.push(`  R${entry.round}: desc="${desc}", status=${JSON.stringify(entry.statusEffectsApplied || [])}`);
        }
      }

      // ====== D. BUFFS ======

      if (name === 'Hymn of Fortitude') {
        hymnOfFortitudeUses++;
        if (hymnOfFortitudeSamples.length < 5) {
          hymnOfFortitudeSamples.push(`  R${entry.round}: desc="${desc}", buffs=${JSON.stringify(entry.buffApplied || entry.statusEffectsApplied || [])}`);
        }
      }

      if (name === 'War Song') {
        warSongUses++;
        if (warSongSamples.length < 5) {
          warSongSamples.push(`  R${entry.round}: desc="${desc}", buffs=${JSON.stringify(entry.buffApplied || entry.statusEffectsApplied || [])}`);
        }
      }

      if (name === 'Marching Cadence') {
        marchingCadenceUses++;
        if (marchingCadenceSamples.length < 5) {
          marchingCadenceSamples.push(`  R${entry.round}: desc="${desc}", buffs=${JSON.stringify(entry.buffApplied || entry.statusEffectsApplied || [])}`);
        }
      }

      if (name === 'Analyze') {
        analyzeUses++;
        if (analyzeSamples.length < 5) {
          analyzeSamples.push(`  R${entry.round}: desc="${desc}", buffs=${JSON.stringify(entry.buffApplied || entry.statusEffectsApplied || [])}`);
        }
      }

      if (name === 'Arcane Insight') {
        arcaneInsightUses++;
        if (arcaneInsightSamples.length < 5) {
          arcaneInsightSamples.push(`  R${entry.round}: desc="${desc}", buffs=${JSON.stringify(entry.buffApplied || entry.statusEffectsApplied || [])}`);
        }
      }

      // ====== E. SPECIAL MECHANICS ======

      // Diplomat's Gambit — check for "Diplomats Gambit" (no apostrophe in data)
      if (name === 'Diplomats Gambit' || name === "Diplomat's Gambit") {
        diplomatsGambitUses++;
        if (desc.match(/accept|peace|success|end/i)) {
          diplomatsGambitSuccesses++;
        } else {
          diplomatsGambitFailures++;
        }
        if (diplomatsGambitSamples.length < 8) {
          diplomatsGambitSamples.push(`  R${entry.round}: desc="${desc}"`);
        }
      }

      if (name === 'Tome of Secrets') {
        tomeOfSecretsUses++;
        if (tomeOfSecretsSamples.length < 8) {
          tomeOfSecretsSamples.push(`  R${entry.round}: desc="${desc}", fullEntry=${JSON.stringify(entry).slice(0, 300)}`);
        }
      }

      // ====== F. DAMAGE ABILITIES ======

      if (name === 'Cutting Words') {
        cuttingWordsUses++;
        const damage = entry.damageRoll?.total || extractDamageAmount(desc) || 0;
        if (cuttingWordsSamples.length < 5) {
          cuttingWordsSamples.push({ damage, desc });
        }
      }

      if (name === 'Thunderclap') {
        thunderclapUses++;
        const damage = entry.damageRoll?.total || extractDamageAmount(desc) || 0;
        if (thunderclapSamples.length < 5) {
          thunderclapSamples.push({ damage, desc });
        }
      }

      if (name === 'Discordant Note') {
        discordantNoteUses++;
        const damage = entry.damageRoll?.total || extractDamageAmount(desc) || 0;
        if (discordantNoteSamples.length < 5) {
          discordantNoteSamples.push({ damage, desc });
        }
      }

      if (name === 'Exploit Weakness') {
        exploitWeaknessUses++;
        const damage = entry.damageRoll?.total || extractDamageAmount(desc) || 0;
        const crit = !!(entry.isCritical);
        if (exploitWeaknessSamples.length < 5) {
          exploitWeaknessSamples.push({ damage, desc, crit });
        }
      }
    }
  }

  // ======== REPORT ========

  console.log('=== ABILITY FIRE COUNTS ===');
  const sorted = Object.entries(abilityCounts).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sorted) {
    console.log(`  ${name}: ${count}`);
  }

  console.log('\n=== G. FALLBACK-TO-ATTACK ===');
  console.log(`Instances: ${fallbackCount}`);
  if (fallbackCount === 0) console.log('PASS: No abilities fell back to basic attack.');
  else {
    console.log(`ISSUE: ${fallbackCount} abilities fell back to basic attack!`);
    for (const d of fallbackDetails) console.log(d);
  }

  // ---- A. FIXED ABILITIES (CRITICAL) ----

  console.log('\n=== A1. SOOTHING MELODY (heal, 1d6+3, expected range 4-9) — FIXED ABILITY ===');
  console.log(`Uses: ${soothingMelodyUses} | Out-of-range: ${soothingMelodyOutOfRange}`);
  if (soothingMelodyOutOfRange > 0) {
    console.log(`ISSUE: ${soothingMelodyOutOfRange} heals outside expected 4-9 range!`);
  } else if (soothingMelodyUses > 0) {
    console.log('PASS: All heal amounts within expected range.');
  }
  for (const s of soothingMelodyHeals) {
    console.log(`  R${s.round}: amount=${s.amount}, desc="${s.desc}"`);
  }

  console.log('\n=== A2. INSPIRING BALLAD (heal, 2d6+3, expected range 5-15) — FIXED ABILITY ===');
  console.log(`Uses: ${inspiringBalladUses} | Out-of-range: ${inspiringBalladOutOfRange}`);
  if (inspiringBalladOutOfRange > 0) {
    console.log(`ISSUE: ${inspiringBalladOutOfRange} heals outside expected 5-15 range!`);
  } else if (inspiringBalladUses > 0) {
    console.log('PASS: All heal amounts within expected range.');
  }
  for (const s of inspiringBalladHeals) {
    console.log(`  R${s.round}: amount=${s.amount}, desc="${s.desc}"`);
  }

  console.log('\n=== A3. VICIOUS MOCKERY (damage_debuff, 1d6 + acReduction: 2, 2 rounds) — FIXED ABILITY ===');
  console.log(`Uses: ${viciousMockeryUses} | No damage: ${viciousMockeryNoDamage} | No debuff: ${viciousMockeryNoDebuff}`);
  if (viciousMockeryNoDamage > 0) console.log(`ISSUE: ${viciousMockeryNoDamage} uses dealt zero damage!`);
  if (viciousMockeryNoDebuff > 0) console.log(`ISSUE: ${viciousMockeryNoDebuff} uses applied no debuff!`);
  if (viciousMockeryNoDamage === 0 && viciousMockeryNoDebuff === 0 && viciousMockeryUses > 0) {
    console.log('PASS: All uses had both damage and debuff.');
  }
  for (const s of viciousMockerySamples) {
    console.log(`  R${s.round}: damage=${s.damage}, hasDebuff=${s.hasDebuff}, desc="${s.desc}"`);
  }

  console.log('\n=== A4. CACOPHONY (damage_debuff, 1d4 + acReduction: 2, 2 rounds) — FIXED ABILITY ===');
  console.log(`Uses: ${cacophonyUses} | No damage: ${cacophonyNoDamage} | No debuff: ${cacophonyNoDebuff}`);
  if (cacophonyNoDamage > 0) console.log(`ISSUE: ${cacophonyNoDamage} uses dealt zero damage!`);
  if (cacophonyNoDebuff > 0) console.log(`ISSUE: ${cacophonyNoDebuff} uses applied no debuff!`);
  if (cacophonyNoDamage === 0 && cacophonyNoDebuff === 0 && cacophonyUses > 0) {
    console.log('PASS: All uses had both damage and debuff.');
  }
  for (const s of cacophonySamples) {
    console.log(`  R${s.round}: damage=${s.damage}, hasDebuff=${s.hasDebuff}, desc="${s.desc}"`);
  }

  console.log('\n=== A5. SHATTER (damage_debuff, 3d6 sonic + acReduction: 4, 3 rounds) — FIXED ABILITY ===');
  console.log(`Uses: ${shatterUses} | No damage: ${shatterNoDamage} | No debuff: ${shatterNoDebuff}`);
  if (shatterNoDamage > 0) console.log(`ISSUE: ${shatterNoDamage} uses dealt zero damage!`);
  if (shatterNoDebuff > 0) console.log(`ISSUE: ${shatterNoDebuff} uses applied no debuff!`);
  if (shatterNoDamage === 0 && shatterNoDebuff === 0 && shatterUses > 0) {
    console.log('PASS: All uses had both damage and debuff.');
  }
  for (const s of shatterSamples) {
    console.log(`  R${s.round}: damage=${s.damage}, hasDebuff=${s.hasDebuff}, desc="${s.desc}"`);
  }

  // ---- B. HEALING VALIDATION (summary) ----

  console.log('\n=== B. HEALING VALIDATION (SUMMARY) ===');
  console.log(`Soothing Melody: ${soothingMelodyUses} uses`);
  console.log(`Inspiring Ballad: ${inspiringBalladUses} uses`);
  const totalHeals = soothingMelodyUses + inspiringBalladUses;
  console.log(`Total healing ability activations: ${totalHeals}`);

  // ---- C. DEBUFF/STATUS ----

  console.log('\n=== C1. JARRING NOTE (debuff, attackReduction: -2, 2 rounds) ===');
  console.log(`Uses: ${jarringNoteUses}`);
  for (const s of jarringNoteSamples) console.log(s);

  console.log('\n=== C2. LULLABY (status, slowed, 2 rounds) ===');
  console.log(`Uses: ${lullabyUses}`);
  for (const s of lullabySamples) console.log(s);

  console.log('\n=== C3. CHARMING WORDS (debuff, attackReduction: -3, 3 rounds) ===');
  console.log(`Uses: ${charmingWordsUses}`);
  for (const s of charmingWordsSamples) console.log(s);

  console.log('\n=== C4. SILVER TONGUE (status, skip_turn, 1 round) ===');
  console.log(`Uses: ${silverTongueUses}`);
  for (const s of silverTongueSamples) console.log(s);

  console.log('\n=== C5. ENTHRALL (status, mesmerize, 3 rounds) ===');
  console.log(`Uses: ${enthrallUses}`);
  for (const s of enthrallSamples) console.log(s);

  // ---- D. BUFFS ----

  console.log('\n=== D1. HYMN OF FORTITUDE (buff, AC+2, ATK+2, 3 rounds) ===');
  console.log(`Uses: ${hymnOfFortitudeUses}`);
  for (const s of hymnOfFortitudeSamples) console.log(s);

  console.log('\n=== D2. WAR SONG (buff, ATK+4, 4 rounds) ===');
  console.log(`Uses: ${warSongUses}`);
  for (const s of warSongSamples) console.log(s);

  console.log('\n=== D3. MARCHING CADENCE (buff, dodge+5, initiative+3, 5 rounds) ===');
  console.log(`Uses: ${marchingCadenceUses}`);
  for (const s of marchingCadenceSamples) console.log(s);

  console.log('\n=== D4. ANALYZE (buff, bonusDamageNext: 8) ===');
  console.log(`Uses: ${analyzeUses}`);
  for (const s of analyzeSamples) console.log(s);

  console.log('\n=== D5. ARCANE INSIGHT (buff, nextCooldownHalved) ===');
  console.log(`Uses: ${arcaneInsightUses}`);
  for (const s of arcaneInsightSamples) console.log(s);

  // ---- E. SPECIAL MECHANICS ----

  console.log('\n=== E1. DIPLOMATS GAMBIT (peacefulEnd, 50% chance) ===');
  console.log(`Uses: ${diplomatsGambitUses} | Successes: ${diplomatsGambitSuccesses} | Failures: ${diplomatsGambitFailures}`);
  if (diplomatsGambitUses > 0) {
    const rate = (diplomatsGambitSuccesses / diplomatsGambitUses * 100).toFixed(1);
    console.log(`Success rate: ${rate}% (expected ~50%)`);
  }
  for (const s of diplomatsGambitSamples) console.log(s);

  console.log('\n=== E2. TOME OF SECRETS (randomClassAbility) ===');
  console.log(`Uses: ${tomeOfSecretsUses}`);
  for (const s of tomeOfSecretsSamples) console.log(s);

  console.log('\n=== E3. EXPLOIT WEAKNESS (requires Analyze? critBonus: 15) ===');
  console.log(`Uses: ${exploitWeaknessUses} | Analyze uses same fight: ${analyzeUses}`);
  for (const s of exploitWeaknessSamples) {
    console.log(`  damage=${s.damage}, crit=${s.crit}, desc="${s.desc}"`);
  }

  // ---- F. DAMAGE ABILITIES ----

  console.log('\n=== F1. CUTTING WORDS (damage, bonusDamage: 3) ===');
  console.log(`Uses: ${cuttingWordsUses}`);
  for (const s of cuttingWordsSamples) {
    console.log(`  damage=${s.damage}, desc="${s.desc}"`);
  }

  console.log('\n=== F2. THUNDERCLAP (damage, 2d4+2, expected range 4-10) ===');
  console.log(`Uses: ${thunderclapUses}`);
  for (const s of thunderclapSamples) {
    console.log(`  damage=${s.damage}, desc="${s.desc}"`);
  }

  console.log('\n=== F3. DISCORDANT NOTE (damage, 2d8 sonic) ===');
  console.log(`Uses: ${discordantNoteUses}`);
  for (const s of discordantNoteSamples) {
    console.log(`  damage=${s.damage}, desc="${s.desc}"`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
