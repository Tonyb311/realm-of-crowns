/**
 * seed-sample-report.ts
 * Creates a realistic DailyReport with all sections populated for visual testing.
 *
 * Usage:
 *   cd server && npx tsx --tsconfig tsconfig.json src/scripts/seed-sample-report.ts
 */

import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';

async function main() {
  const character = await prisma.character.findFirst({
    select: { id: true, name: true },
  });
  if (!character) {
    console.error('No characters found in the database.');
    process.exit(1);
  }

  console.log(`Using character: ${character.name} (${character.id})`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const foodConsumed = { itemName: 'Venison Stew', buff: { str: 2 } };

  const actionResult = {
    type: 'TRAVEL',
    success: true,
    origin: 'Thornhaven',
    destination: 'Ashenmoor',
    outcome: 'Arrived at Ashenmoor after a long journey.',
  };

  const combatLogs = [
    {
      monsterName: 'Wolf',
      outcome: 'win',
      totalRounds: 4,
      summary: 'Sir Aldric defeated Wolf in 4 round(s). Dealt 42 damage, took 15 damage.',
      xpAwarded: 50,
      goldAwarded: 0,
      loot: 'Wolf Pelt x1',
      characterStartHp: 45,
      characterEndHp: 30,
      opponentStartHp: 28,
      opponentEndHp: 0,
      rounds: [
        {
          _encounterContext: {
            combatants: [
              {
                id: 'player-1',
                name: 'Sir Aldric',
                entityType: 'character',
                team: 0,
                level: 5,
                race: 'human',
                hp: 45,
                maxHp: 45,
                ac: 15,
                stats: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
                proficiencyBonus: 3,
                initiative: 12,
                weapon: {
                  name: 'Iron Longsword',
                  dice: '1d8',
                  damageType: 'slashing',
                  bonusAttack: 0,
                  bonusDamage: 0,
                  attackStat: 'str',
                  damageStat: 'str',
                },
              },
              {
                id: 'monster-wolf',
                name: 'Wolf',
                entityType: 'monster',
                team: 1,
                level: 3,
                hp: 28,
                maxHp: 28,
                ac: 12,
                stats: { str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6 },
                proficiencyBonus: 2,
                initiative: 14,
                weapon: {
                  name: 'Bite',
                  dice: '1d6',
                  damageType: 'piercing',
                  bonusAttack: 0,
                  bonusDamage: 0,
                  attackStat: 'dex',
                  damageStat: 'str',
                },
              },
            ],
            turnOrder: ['monster-wolf', 'player-1'],
          },
        },
        {
          round: 1,
          actor: 'Wolf',
          actorId: 'monster-wolf',
          action: 'attack',
          attackRoll: { raw: 14, modifiers: [{ label: 'DEX', value: 2 }, { label: 'Prof', value: 2 }], total: 18 },
          targetAC: 15,
          hit: true,
          isCritical: false,
          damageRoll: { dice: '1d6', rolls: [4], modifiers: [{ label: 'STR', value: 1 }], total: 5, type: 'piercing' },
          targetHpBefore: 45,
          targetHpAfter: 40,
          targetKilled: false,
          weaponName: 'Bite',
          statusEffectsApplied: [],
          statusEffectsExpired: [],
          hpAfter: { 'Sir Aldric': 40, Wolf: 28 },
        },
        {
          round: 1,
          actor: 'Sir Aldric',
          actorId: 'player-1',
          action: 'attack',
          attackRoll: { raw: 17, modifiers: [{ label: 'STR', value: 3 }, { label: 'Prof', value: 3 }], total: 23 },
          targetAC: 12,
          hit: true,
          isCritical: false,
          damageRoll: { dice: '1d8', rolls: [6], modifiers: [{ label: 'STR', value: 3 }], total: 9, type: 'slashing' },
          targetHpBefore: 28,
          targetHpAfter: 19,
          targetKilled: false,
          weaponName: 'Iron Longsword',
          statusEffectsApplied: [],
          statusEffectsExpired: [],
          hpAfter: { 'Sir Aldric': 40, Wolf: 19 },
        },
        {
          round: 2,
          actor: 'Wolf',
          actorId: 'monster-wolf',
          action: 'attack',
          attackRoll: { raw: 8, modifiers: [{ label: 'DEX', value: 2 }, { label: 'Prof', value: 2 }], total: 12 },
          targetAC: 15,
          hit: false,
          isCritical: false,
          weaponName: 'Bite',
          statusEffectsApplied: [],
          statusEffectsExpired: [],
          hpAfter: { 'Sir Aldric': 40, Wolf: 19 },
        },
        {
          round: 2,
          actor: 'Sir Aldric',
          actorId: 'player-1',
          action: 'attack',
          attackRoll: { raw: 20, modifiers: [{ label: 'STR', value: 3 }, { label: 'Prof', value: 3 }], total: 26 },
          targetAC: 12,
          hit: true,
          isCritical: true,
          damageRoll: { dice: '2d8', rolls: [7, 5], modifiers: [{ label: 'STR', value: 3 }], total: 15, type: 'slashing' },
          targetHpBefore: 19,
          targetHpAfter: 4,
          targetKilled: false,
          weaponName: 'Iron Longsword',
          statusEffectsApplied: [],
          statusEffectsExpired: [],
          hpAfter: { 'Sir Aldric': 40, Wolf: 4 },
        },
        {
          round: 3,
          actor: 'Wolf',
          actorId: 'monster-wolf',
          action: 'attack',
          attackRoll: { raw: 16, modifiers: [{ label: 'DEX', value: 2 }, { label: 'Prof', value: 2 }], total: 20 },
          targetAC: 15,
          hit: true,
          isCritical: false,
          damageRoll: { dice: '1d6', rolls: [5], modifiers: [{ label: 'STR', value: 1 }], total: 6, type: 'piercing' },
          targetHpBefore: 40,
          targetHpAfter: 34,
          targetKilled: false,
          weaponName: 'Bite',
          statusEffectsApplied: [],
          statusEffectsExpired: [],
          hpAfter: { 'Sir Aldric': 34, Wolf: 4 },
        },
        {
          round: 3,
          actor: 'Sir Aldric',
          actorId: 'player-1',
          action: 'attack',
          attackRoll: { raw: 13, modifiers: [{ label: 'STR', value: 3 }, { label: 'Prof', value: 3 }], total: 19 },
          targetAC: 12,
          hit: true,
          isCritical: false,
          damageRoll: { dice: '1d8', rolls: [5], modifiers: [{ label: 'STR', value: 3 }], total: 8, type: 'slashing' },
          targetHpBefore: 4,
          targetHpAfter: 0,
          targetKilled: true,
          weaponName: 'Iron Longsword',
          statusEffectsApplied: [],
          statusEffectsExpired: [],
          hpAfter: { 'Sir Aldric': 34, Wolf: 0 },
        },
      ],
    },
  ];

  const questProgress = [{ title: 'Gather Arcane Reagents', progress: '3/5' }];
  const notifications = ['You feel stronger after eating.'];
  const worldEvents = [
    {
      title: 'Mayor Re-elected in Thornhaven',
      message: 'Trade tariffs remain unchanged. Merchants breathe a sigh of relief.',
    },
  ];

  const report = await prisma.dailyReport.upsert({
    where: {
      characterId_tickDate: { characterId: character.id, tickDate: today },
    },
    create: {
      characterId: character.id,
      tickDate: today,
      foodConsumed: foodConsumed as unknown as Prisma.InputJsonValue,
      actionResult: actionResult as unknown as Prisma.InputJsonValue,
      goldChange: 35,
      xpEarned: 120,
      combatLogs: combatLogs as unknown as Prisma.InputJsonValue,
      questProgress: questProgress as unknown as Prisma.InputJsonValue,
      notifications: notifications as unknown as Prisma.InputJsonValue,
      worldEvents: worldEvents as unknown as Prisma.InputJsonValue,
      dismissedAt: null,
    },
    update: {
      foodConsumed: foodConsumed as unknown as Prisma.InputJsonValue,
      actionResult: actionResult as unknown as Prisma.InputJsonValue,
      goldChange: 35,
      xpEarned: 120,
      combatLogs: combatLogs as unknown as Prisma.InputJsonValue,
      questProgress: questProgress as unknown as Prisma.InputJsonValue,
      notifications: notifications as unknown as Prisma.InputJsonValue,
      worldEvents: worldEvents as unknown as Prisma.InputJsonValue,
      dismissedAt: null,
    },
  });

  console.log(`Created sample DailyReport: ${report.id}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
