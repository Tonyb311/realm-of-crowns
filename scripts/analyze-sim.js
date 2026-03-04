const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const runId = "cmmc3usyh0000mqa11wxxb46p";
  const logs = await prisma.combatEncounterLog.findMany({
    where: { simulationRunId: runId },
    select: { rounds: true, outcome: true, totalRounds: true, characterName: true },
  });

  const outcomes = {};
  let totalRounds = 0;
  const abilityUsage = {};
  const abilityByCharLevel = {};

  for (const log of logs) {
    outcomes[log.outcome] = (outcomes[log.outcome] || 0) + 1;
    totalRounds += log.totalRounds;
    const charName = log.characterName || "unknown";

    const rounds = log.rounds || [];
    for (const round of rounds) {
      if (round._encounterContext) continue;
      // The round entries have abilityName at top level when action is class_ability
      if (round.abilityName && round.action === "class_ability") {
        abilityUsage[round.abilityName] = (abilityUsage[round.abilityName] || 0) + 1;
      }
    }
  }

  console.log("Outcomes:", JSON.stringify(outcomes));
  console.log("Total rounds:", totalRounds, " | Total logs:", logs.length);

  // Check which warrior tier 0 abilities were used
  const tier0Names = [
    "Power Strike", "Defensive Stance", "Intimidating Shout",
    "Sundering Strike", "Second Wind", "Hamstring",
    "Brutal Charge", "Iron Skin", "War Cry"
  ];
  const specNames = [
    // Berserker
    "Frenzy", "Reckless Strike", "Bloodlust", "Whirlwind", "Undying Rage", "Berserker's Fury",
    // Guardian
    "Shield Wall", "Taunt", "Iron Resolve", "Bulwark", "Unbreakable", "Guardian's Oath",
    // Warlord
    "Rally", "Commanding Strike", "Battle Standard", "Tactical Advance", "War Master", "Warlord's Presence",
  ];

  console.log("\n=== TIER 0 ABILITIES ===");
  for (const name of tier0Names) {
    const count = abilityUsage[name] || 0;
    const status = count > 0 ? "USED " + count + "x" : "NEVER FIRED";
    console.log("  " + name + ": " + status);
  }

  console.log("\n=== SPEC ABILITIES ===");
  for (const name of specNames) {
    const count = abilityUsage[name] || 0;
    const status = count > 0 ? "USED " + count + "x" : "NEVER FIRED";
    console.log("  " + name + ": " + status);
  }

  console.log("\n=== ALL ABILITY USAGE (sorted) ===");
  const sorted = Object.entries(abilityUsage).sort((a,b) => b[1] - a[1]);
  for (const [name, count] of sorted) {
    console.log("  " + name + ": " + count);
  }

  await prisma.$disconnect();
}
main().catch(console.error);
