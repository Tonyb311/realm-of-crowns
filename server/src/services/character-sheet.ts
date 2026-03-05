import { prisma } from '../lib/prisma';
import { calculateEquipmentTotals } from './item-stats';
import { getProficiencyBonus, getModifier } from '@shared/utils/bounded-accuracy';
import { CLASS_SAVE_PROFICIENCIES, CLASS_PRIMARY_STAT } from '@shared/data/combat-constants';
import { TIER0_ABILITIES_BY_CLASS, ABILITIES_BY_CLASS, TIER0_CHOICE_LEVELS } from '@shared/data/skills';
import { getRace } from '@shared/data/races';

const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const STAT_LONG_TO_SHORT: Record<string, string> = {
  strength: 'str', dexterity: 'dex', constitution: 'con',
  intelligence: 'int', wisdom: 'wis', charisma: 'cha',
};

export async function buildCharacterSheet(characterId: string, viewerId: string | null) {
  const isOwner = viewerId === characterId;

  // Run all queries in parallel
  const [character, characterAbilities, equipTotals, combatRecord] = await Promise.all([
    prisma.character.findUnique({
      where: { id: characterId },
      include: {
        currentTown: { select: { id: true, name: true } },
        homeTown: { select: { id: true, name: true } },
        professions: true,
        equipment: {
          include: { item: { include: { template: true } } },
        },
        guildMemberships: {
          include: { guild: { select: { id: true, name: true, tag: true } } },
          take: 1,
        },
      },
    }),
    prisma.characterAbility.findMany({
      where: { characterId },
      select: { abilityId: true },
    }),
    calculateEquipmentTotals(characterId),
    prisma.combatEncounterLog.aggregate({
      where: {
        characterId,
        simulationRunId: null, // real combat only
      },
      _count: { id: true },
      _sum: { xpAwarded: true, goldAwarded: true },
    }),
  ]);

  if (!character) return null;

  // Combat record breakdown by outcome
  const outcomeBreakdown = await prisma.combatEncounterLog.groupBy({
    by: ['outcome'],
    where: { characterId, simulationRunId: null },
    _count: { id: true },
  });

  const combatStats = {
    wins: 0, losses: 0, flees: 0, draws: 0,
    totalEncounters: combatRecord._count.id,
    totalXpEarned: combatRecord._sum.xpAwarded ?? 0,
    totalGoldEarned: combatRecord._sum.goldAwarded ?? 0,
  };
  for (const row of outcomeBreakdown) {
    if (row.outcome === 'win') combatStats.wins = row._count.id;
    else if (row.outcome === 'loss') combatStats.losses = row._count.id;
    else if (row.outcome === 'flee') combatStats.flees = row._count.id;
    else if (row.outcome === 'draw') combatStats.draws = row._count.id;
  }

  const stats = (character.stats as Record<string, number>) ?? {};
  const charClass = character.class?.toLowerCase() ?? '';
  const level = character.level;
  const profBonus = getProficiencyBonus(level);

  // Equipment stat bonuses (convert long names to short)
  const equipStatBonuses: Record<string, number> = {};
  for (const [longKey, value] of Object.entries(equipTotals.totalStatBonuses)) {
    const shortKey = STAT_LONG_TO_SHORT[longKey] ?? longKey;
    equipStatBonuses[shortKey] = Math.round(value);
  }

  // Effective stats = base + equipment
  const effectiveStats: Record<string, number> = {};
  for (const key of STAT_KEYS) {
    effectiveStats[key] = (stats[key] ?? 10) + (equipStatBonuses[key] ?? 0);
  }

  // Saving throws
  const saveProficiencies = CLASS_SAVE_PROFICIENCIES[charClass] ?? [];
  const savingThrows: Record<string, { modifier: number; proficient: boolean }> = {};
  for (const key of STAT_KEYS) {
    const mod = getModifier(effectiveStats[key]);
    const proficient = saveProficiencies.includes(key);
    savingThrows[key] = {
      modifier: proficient ? mod + profBonus : mod,
      proficient,
    };
  }

  // Attack bonus & spell save DC
  const primaryStat = CLASS_PRIMARY_STAT[charClass] ?? 'str';
  const primaryMod = getModifier(effectiveStats[primaryStat]);
  const weaponBonusAttack = equipTotals.items
    .filter(i => i.slot === 'MAIN_HAND')
    .reduce((sum, i) => sum + (i.stats.finalStats.damage ?? 0), 0);

  const attackBonus = primaryMod + profBonus;
  const spellSaveDC = 8 + profBonus + primaryMod;

  // AC breakdown
  const dexMod = getModifier(effectiveStats.dex);
  const armorAC = equipTotals.totalAC;
  const acBreakdown = { base: 10, dexMod, armor: armorAC };
  const ac = 10 + dexMod + armorAC;

  // Resolve abilities
  const unlockedIds = new Set(characterAbilities.map(a => a.abilityId));

  // Tier 0 abilities grouped by choice level
  const tier0Abilities = (TIER0_ABILITIES_BY_CLASS[charClass] ?? []).map(ab => ({
    id: ab.id,
    name: ab.name,
    description: ab.description,
    levelRequired: ab.levelRequired,
    choiceGroup: ab.choiceGroup,
    attackType: ab.attackType,
    cooldown: ab.cooldown,
    chosen: unlockedIds.has(ab.id),
  }));

  // Spec abilities (non-tier0)
  const specAbilities = (ABILITIES_BY_CLASS[charClass] ?? [])
    .filter(ab => ab.tier !== 0)
    .map(ab => ({
      id: ab.id,
      name: ab.name,
      description: ab.description,
      specialization: ab.specialization,
      levelRequired: ab.levelRequired,
      attackType: ab.attackType,
      cooldown: ab.cooldown,
      unlocked: unlockedIds.has(ab.id),
    }));

  // Racial data
  const raceData = getRace(character.race.toLowerCase());
  const racialInfo = raceData ? {
    name: raceData.name,
    trait: raceData.trait,
    abilities: raceData.abilities.filter(a => a.levelRequired <= level),
  } : null;

  // Equipment for display
  const equippedItems = equipTotals.items.map(item => ({
    slot: item.slot,
    itemId: item.itemId,
    itemName: item.itemName,
    quality: item.quality,
    stats: isOwner ? item.stats : undefined,
    enchanted: !!(item.stats.enchantmentBonuses &&
      Object.values(item.stats.enchantmentBonuses).some(v => typeof v === 'number' && v > 0)),
  }));

  // Guild info
  const guild = character.guildMemberships[0]?.guild ?? null;

  // Profession info
  const professions = character.professions.map((pp: any) => ({
    name: pp.professionType,
    tier: pp.tier,
    level: pp.level,
  }));

  // Build response - redact sensitive fields for non-owners
  const sheet: Record<string, unknown> = {
    id: character.id,
    name: character.name,
    race: character.race,
    class: character.class,
    specialization: character.specialization,
    level,
    xp: character.xp,
    xpToNextLevel: 1000,
    title: character.title,
    bio: (character as any).bio,
    currentTown: character.currentTown,
    homeTown: character.homeTown,
    guild: guild ? { id: guild.id, name: guild.name, tag: guild.tag } : null,
    createdAt: character.createdAt,

    baseStats: stats,
    equipmentBonuses: equipStatBonuses,
    effectiveStats,
    proficiencyBonus: profBonus,
    primaryStat,

    savingThrows,
    attackBonus,
    spellSaveDC,
    ac,
    weaponDamage: Math.round(weaponBonusAttack),

    tier0Abilities,
    tier0ChoiceLevels: TIER0_CHOICE_LEVELS,
    specAbilities,
    racial: racialInfo,

    equipment: equippedItems,
    professions,
    combatRecord: combatStats,
  };

  // Owner-only fields
  if (isOwner) {
    sheet.gold = character.gold;
    sheet.health = character.health;
    sheet.maxHealth = character.maxHealth;
    sheet.acBreakdown = acBreakdown;
  }

  return sheet;
}
