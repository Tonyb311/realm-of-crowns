process.env.DATABASE_URL = 'postgresql://rocadmin:RoC-Dev-2026!@roc-db-server.postgres.database.azure.com:5432/realm_of_crowns?sslmode=require';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const runId = 'cmmc4vui200007jyzsfptkuqc';

  const logs = await prisma.combatEncounterLog.findMany({
    where: { simulationRunId: runId },
    select: {
      rounds: true, outcome: true, summary: true,
      opponentName: true, totalRounds: true, characterName: true,
    },
  });

  console.log(`Total fights: ${logs.length}`);

  // Track ability usage
  const abilityUsage = {};
  const abilityByLevel = {};
  let playerWins = 0;
  let playerLosses = 0;
  const byMonster = {};

  for (const log of logs) {
    const summary = log.summary;
    const monsterName = log.opponentName || 'unknown';
    // Extract level from characterName (format: "Human Warrior L20")
    const levelMatch = log.characterName?.match(/L(\d+)/);
    const playerLevel = levelMatch ? parseInt(levelMatch[1]) : 0;

    if (!byMonster[monsterName]) byMonster[monsterName] = { wins: 0, losses: 0, totalRounds: 0 };

    if (log.outcome === 'victory') {
      playerWins++;
      byMonster[monsterName].wins++;
    } else {
      playerLosses++;
      byMonster[monsterName].losses++;
    }

    byMonster[monsterName].totalRounds += (log.totalRounds || 0);

    const rounds = log.rounds;
    if (!Array.isArray(rounds)) continue;

    for (const round of rounds) {
      // Check all entries in the round
      const entries = round.entries || round.turns || [round];
      for (const entry of (Array.isArray(entries) ? entries : [entries])) {
        if (entry.action === 'class_ability' && entry.abilityName) {
          const name = entry.abilityName;
          abilityUsage[name] = (abilityUsage[name] || 0) + 1;
          const key = `L${playerLevel}`;
          if (!abilityByLevel[key]) abilityByLevel[key] = {};
          abilityByLevel[key][name] = (abilityByLevel[key][name] || 0) + 1;
        }
        if (entry.classAbility?.abilityName) {
          const name = entry.classAbility.abilityName;
          abilityUsage[name] = (abilityUsage[name] || 0) + 1;
        }
      }
      // Direct round-level
      if (round.action === 'class_ability' && round.abilityName) {
        const name = round.abilityName;
        abilityUsage[name] = (abilityUsage[name] || 0) + 1;
      }
    }
  }

  console.log(`\nPlayer wins: ${playerWins}, losses: ${playerLosses}`);
  console.log(`Win rate: ${(playerWins / logs.length * 100).toFixed(1)}%`);

  console.log('\n--- By Monster ---');
  for (const [name, data] of Object.entries(byMonster)) {
    const total = data.wins + data.losses;
    const avgRounds = (data.totalRounds / total).toFixed(1);
    console.log(`  ${name}: ${data.wins}W/${data.losses}L (${(data.wins/total*100).toFixed(1)}%) avg ${avgRounds} rounds`);
  }

  console.log('\n--- Ability Usage (all levels) ---');
  const sorted = Object.entries(abilityUsage).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    console.log('  (none found — checking round structure)');
    // Debug: dump one round from a L20 fight
    const sample = logs.find(l => l.characterName?.includes('L20'));
    if (sample?.rounds?.[0]) {
      console.log('  Sample round[0] keys:', Object.keys(sample.rounds[0]));
      const r = sample.rounds[0];
      if (r.entries) console.log('  entries[0] keys:', Object.keys(r.entries[0]));
      else if (r.turns) console.log('  turns[0] keys:', Object.keys(r.turns[0]));
      else console.log('  Round structure:', JSON.stringify(r).slice(0, 500));
    }
  } else {
    for (const [name, count] of sorted) {
      console.log(`  ${name}: ${count}`);
    }
  }

  console.log('\n--- Ability Usage by Level ---');
  for (const [level, abilities] of Object.entries(abilityByLevel).sort()) {
    console.log(`  ${level}:`);
    const sortedAb = Object.entries(abilities).sort((a, b) => b[1] - a[1]);
    for (const [name, count] of sortedAb) {
      console.log(`    ${name}: ${count}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
