import { db } from '../lib/db';
import { eq, and, isNull, sql, count } from 'drizzle-orm';
import { characters, characterAbilities, combatEncounterLogs } from '@database/tables';
import { calculateEquipmentTotals } from './item-stats';
import { getProficiencyBonus, getModifier } from '@shared/utils/bounded-accuracy';
import { CLASS_SAVE_PROFICIENCIES, CLASS_PRIMARY_STAT, CLASS_ARMOR_PROFICIENCY, CLASS_WEAPON_PROFICIENCY } from '@shared/data/combat-constants';
import { checkEquipmentProficiency } from '@shared/utils/proficiency';
import { TIER0_ABILITIES_BY_CLASS, ABILITIES_BY_CLASS, TIER0_CHOICE_LEVELS } from '@shared/data/skills';
import { getRace } from '@shared/data/races';

const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const STAT_LONG_TO_SHORT: Record<string, string> = {
  strength: 'str', dexterity: 'dex', constitution: 'con',
  intelligence: 'int', wisdom: 'wis', charisma: 'cha',
};

function isItemNonProficient(slot: string, templateStats: Record<string, any>, charClass: string): boolean {
  const armorProfs = CLASS_ARMOR_PROFICIENCY[charClass] ?? [];
  const weaponProfs = CLASS_WEAPON_PROFICIENCY[charClass] ?? [];
  const armorSlots = new Set(['HEAD', 'CHEST', 'HANDS', 'LEGS', 'FEET', 'BACK', 'OFF_HAND']);
  if (armorSlots.has(slot) && templateStats.armorCategory) {
    const cat = templateStats.armorCategory;
    if (cat !== 'none' && !armorProfs.includes(cat)) return true;
  }
  if (slot === 'MAIN_HAND' && templateStats.weaponCategory) {
    if (!weaponProfs.includes(templateStats.weaponCategory)) return true;
  }
  return false;
}

export async function buildCharacterSheet(characterId: string, viewerId: string | null) {
  const isOwner = viewerId === characterId;

  // Run all queries in parallel
  const [character, charAbilities, equipTotals, combatRecord] = await Promise.all([
    db.query.characters.findFirst({
      where: eq(characters.id, characterId),
      with: {
        town_currentTownId: { columns: { id: true, name: true } },
        town_homeTownId: { columns: { id: true, name: true } },
        playerProfessions: true,
        characterEquipments: {
          with: { item: { with: { itemTemplate: true } } },
        },
        guildMembers: {
          with: { guild: { columns: { id: true, name: true, tag: true } } },
          limit: 1,
        },
      },
    }),
    db.query.characterAbilities.findMany({
      where: eq(characterAbilities.characterId, characterId),
      columns: { abilityId: true },
    }),
    calculateEquipmentTotals(characterId),
    db.select({
      _count: count(combatEncounterLogs.id),
      _sumXp: sql<number>`COALESCE(SUM(${combatEncounterLogs.xpAwarded}), 0)`,
      _sumGold: sql<number>`COALESCE(SUM(${combatEncounterLogs.goldAwarded}), 0)`,
    }).from(combatEncounterLogs).where(
      and(
        eq(combatEncounterLogs.characterId, characterId),
        isNull(combatEncounterLogs.simulationRunId),
      ),
    ),
  ]);

  if (!character) return null;

  // Combat record breakdown by outcome
  const outcomeBreakdown = await db.select({
    outcome: combatEncounterLogs.outcome,
    _count: count(combatEncounterLogs.id),
  }).from(combatEncounterLogs).where(
    and(
      eq(combatEncounterLogs.characterId, characterId),
      isNull(combatEncounterLogs.simulationRunId),
    ),
  ).groupBy(combatEncounterLogs.outcome);

  const combatAgg = combatRecord[0];
  const combatStats = {
    wins: 0, losses: 0, flees: 0, draws: 0,
    totalEncounters: combatAgg?._count ?? 0,
    totalXpEarned: combatAgg?._sumXp ?? 0,
    totalGoldEarned: combatAgg?._sumGold ?? 0,
  };
  for (const row of outcomeBreakdown) {
    if (row.outcome === 'win') combatStats.wins = row._count;
    else if (row.outcome === 'loss') combatStats.losses = row._count;
    else if (row.outcome === 'flee') combatStats.flees = row._count;
    else if (row.outcome === 'draw') combatStats.draws = row._count;
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
  const unlockedIds = new Set(charAbilities.map(a => a.abilityId));

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

  // Proficiency check
  const armorProficiencies = CLASS_ARMOR_PROFICIENCY[charClass] ?? [];
  const weaponProficiencies = CLASS_WEAPON_PROFICIENCY[charClass] ?? [];
  const itemsForProfCheck = (character.characterEquipments ?? []).map((eq: any) => ({
    slot: eq.slot,
    stats: (eq.item?.itemTemplate?.stats as Record<string, any>) ?? {},
    itemName: eq.item?.itemTemplate?.name ?? '',
  }));
  const profCheck = checkEquipmentProficiency(charClass, itemsForProfCheck);

  // Equipment for display
  const equippedItems = equipTotals.items.map(item => ({
    slot: item.slot,
    itemId: item.itemId,
    itemName: item.itemName,
    quality: item.quality,
    stats: isOwner ? item.stats : undefined,
    enchanted: !!(item.stats.enchantmentBonuses &&
      Object.values(item.stats.enchantmentBonuses).some(v => typeof v === 'number' && v > 0)),
    nonProficient: isOwner ? isItemNonProficient(
      item.slot,
      ((character.characterEquipments ?? []).find((eq: any) => eq.slot === item.slot)?.item?.itemTemplate?.stats as Record<string, any>) ?? {},
      charClass
    ) : undefined,
  }));

  // Guild info
  const guild = character.guildMembers[0]?.guild ?? null;

  // Profession info
  const professions = character.playerProfessions.map((pp: any) => ({
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
    currentTown: character.town_currentTownId,
    homeTown: character.town_homeTownId,
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
    armorProficiencies,
    weaponProficiencies,
    proficiencyWarnings: profCheck.warnings,
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
