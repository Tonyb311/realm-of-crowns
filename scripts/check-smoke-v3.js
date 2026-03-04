const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

function parseRounds(log) {
  const raw = typeof log.rounds === 'string' ? JSON.parse(log.rounds) : log.rounds;
  return Array.isArray(raw) ? raw : [];
}

async function main() {
  // Wolf v3 (on-hit knockdown)
  const wolfLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxnzej000012y84ng9dewi' LIMIT 10"
  );
  console.log('=== TEST 1: WOLF (on-hit knockdown) ===');
  let knockdownCount = 0, wolfCritCount = 0, wolfFumbleCount = 0, wolfDTCount = 0;
  wolfLogs.forEach((log) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.critResult) wolfCritCount++;
      if (e.fumbleResult) wolfFumbleCount++;
      if (e.damageTypeResult) wolfDTCount++;
      if (e.statusEffectsApplied?.some(s => s.includes('knocked') || s.includes('Knockdown'))) {
        knockdownCount++;
      }
    });
  });
  console.log('  Knockdowns:', knockdownCount, '| Crits:', wolfCritCount, '| Fumbles:', wolfFumbleCount, '| DT triggers:', wolfDTCount);

  // Troll v3 (regen + multiattack)
  const trollLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxo83i0000zpx9751l7ri8' LIMIT 10"
  );
  console.log('\n=== TEST 2: TROLL (regen + multiattack) ===');
  let regenCount = 0, trollMultiCount = 0, monsterAbilityCount = 0, trollDTCount = 0;
  trollLogs.forEach((log, i) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.action === 'monster_ability') {
        monsterAbilityCount++;
        if (e.abilityName === 'Rend' || e.strikesHit >= 2) trollMultiCount++;
      }
      if (e.damageTypeResult) trollDTCount++;
      // Check for regen in status ticks
      if (e.statusTicks) {
        e.statusTicks.forEach(t => {
          if (t.effectName === 'regenerating' && t.healing > 0) {
            regenCount++;
            if (regenCount <= 3) console.log('  REGEN tick:', JSON.stringify(t));
          }
        });
      }
    });
  });
  console.log('  Monster abilities:', monsterAbilityCount, '| Multiattacks:', trollMultiCount, '| Regen ticks:', regenCount, '| DT triggers:', trollDTCount);

  // Goblin v3 (crit d100 chain - 50 fights)
  const goblinLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxog6f00002wduvc3sg459' LIMIT 50"
  );
  console.log('\n=== TEST 3: GOBLIN (crit d100 chain) ===');
  let critCount = 0, fumbleCount = 0;
  goblinLogs.forEach((log) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.critResult) {
        critCount++;
        if (critCount <= 3) console.log('  CRIT:', JSON.stringify(e.critResult).substring(0, 300));
      }
      if (e.fumbleResult) {
        fumbleCount++;
        if (fumbleCount <= 2) console.log('  FUMBLE:', JSON.stringify(e.fumbleResult).substring(0, 300));
      }
    });
  });
  console.log('  Crits in 50 fights:', critCount, '| Fumbles:', fumbleCount);

  // Skeleton v3 (bludgeoning vulnerability)
  const skelLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxooiz0000tygwjryg1ax8' LIMIT 10"
  );
  console.log('\n=== TEST 4: SKELETON (bludgeoning vulnerability) ===');
  let dtVulnCount = 0, dtNormalCount = 0, dtResistCount = 0;
  skelLogs.forEach((log) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.damageTypeResult) {
        if (e.damageTypeResult.interaction === 'vulnerable') dtVulnCount++;
        else if (e.damageTypeResult.interaction === 'resistant') dtResistCount++;
        else dtNormalCount++;
        if (dtVulnCount <= 3) console.log('  DT:', JSON.stringify(e.damageTypeResult));
      }
    });
  });
  console.log('  Vulnerability triggers:', dtVulnCount, '| Resistance:', dtResistCount, '| Other:', dtNormalCount);

  // Slime v3 (crit immunity + resistances)
  const slimeLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxow5z0000c8izgbro4gs0' LIMIT 10"
  );
  console.log('\n=== TEST 5: SLIME (crit immunity + resistances) ===');
  let slimeCrits = 0, slimeResist = 0, slimeImmune = 0;
  let playerCritsOnSlime = 0;
  slimeLogs.forEach((log) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      // Crits FROM the player against Slime
      if (e.critResult && e.actor !== 'Slime') {
        playerCritsOnSlime++;
        console.log('  PLAYER CRIT ON SLIME:', JSON.stringify(e.critResult).substring(0, 200));
      }
      // Crits FROM Slime (should have d100 chain)
      if (e.critResult && e.actor === 'Slime') slimeCrits++;
      if (e.damageTypeResult) {
        if (e.damageTypeResult.interaction === 'resistant') slimeResist++;
        if (e.damageTypeResult.interaction === 'immune') slimeImmune++;
        if (slimeResist + slimeImmune <= 5) console.log('  DT:', JSON.stringify(e.damageTypeResult));
      }
    });
  });
  console.log('  Player crits on Slime:', playerCritsOnSlime, '| Slime crits:', slimeCrits, '| Resistance:', slimeResist, '| Immunity:', slimeImmune);

  // Dragon v3 (breath weapon + multiattack)
  const dragonLogs = await p.$queryRawUnsafe(
    "SELECT rounds FROM combat_encounter_logs WHERE simulation_run_id = 'cmmaxp5bo0000uebaoxnl379q' LIMIT 10"
  );
  console.log('\n=== TEST 6: DRAGON (breath weapon + multiattack) ===');
  let breathCount = 0, dragonMulti = 0, dragonAbilities = 0, dragonBasicAtk = 0;
  dragonLogs.forEach((log, i) => {
    const entries = parseRounds(log);
    entries.forEach(e => {
      if (e._encounterContext) return;
      if (e.action === 'monster_ability') {
        dragonAbilities++;
        const name = e.abilityName || '';
        if (name.includes('Breath') || name.includes('Cold')) breathCount++;
        if (name === 'Multiattack' || e.strikesHit >= 2) dragonMulti++;
        if (i < 3) console.log(`  Fight ${i+1} R${e.round}: ${name} | strikesHit=${e.strikesHit || '-'} | dmg=${e.damageRoll?.total || '-'}`);
      }
      if (e.action === 'attack' && e.actor === 'Young Dragon') dragonBasicAtk++;
    });
  });
  console.log('  Dragon abilities:', dragonAbilities, '| Breath weapon:', breathCount, '| Multiattack:', dragonMulti, '| Basic attacks:', dragonBasicAtk);

  // Summary
  console.log('\n========== PHASE 1 SMOKE TEST SUMMARY (v3) ==========');
  console.log('Crit d100 chain:     ', critCount > 0 ? 'PASS' : 'FAIL', `(${critCount} crits in 50 fights)`);
  console.log('Fumble d100 chain:   ', fumbleCount > 0 ? 'PASS' : 'FAIL', `(${fumbleCount} fumbles in 50 fights)`);
  console.log('Monster abilities:   ', monsterAbilityCount > 0 ? 'PASS' : 'FAIL', `(${monsterAbilityCount} uses in 10 Troll fights)`);
  console.log('Multiattack:         ', trollMultiCount > 0 ? 'PASS' : 'FAIL', `(${trollMultiCount} Troll Rend multi-strikes)`);
  console.log('Regen (Troll):       ', regenCount > 0 ? 'PASS' : 'FAIL', `(${regenCount} regen ticks)`);
  console.log('On-hit (Wolf):       ', knockdownCount > 0 ? 'PASS' : 'FAIL', `(${knockdownCount} knockdowns in 10 fights)`);
  console.log('DT Vulnerability:    ', dtVulnCount > 0 ? 'PASS' : 'FAIL', `(${dtVulnCount} vuln triggers vs Skeleton)`);
  console.log('DT Resistance:       ', slimeResist > 0 ? 'PASS' : 'FAIL', `(${slimeResist} resist triggers vs Slime)`);
  console.log('Dragon multiattack:  ', dragonMulti > 0 ? 'PASS' : 'FAIL', `(${dragonMulti} multiattacks, ${breathCount} breaths)`);
  console.log('Dragon breath recharge:', breathCount < dragonAbilities ? 'PASS' : 'FAIL', `(breath not every turn)`);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
