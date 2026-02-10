/**
 * Shared combat types for Realm of Crowns
 * Used by both server combat engine and client UI
 */

// ---- Character Stats ----

export interface CharacterStats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export function getModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

// ---- Combat Actions ----

export type CombatActionType = 'attack' | 'cast' | 'defend' | 'item' | 'flee' | 'racial_ability' | 'psion_ability';

export interface CombatAction {
  type: CombatActionType;
  actorId: string;
  targetId?: string;
  /** Weapon/spell/item identifier */
  resourceId?: string;
  /** Spell slot level being expended (for cast actions) */
  spellSlotLevel?: number;
  /** Racial ability name (for racial_ability actions) */
  racialAbilityName?: string;
  /** Multiple target IDs for AoE racial abilities */
  targetIds?: string[];
  /** Psion ability ID being used (for psion_ability actions) */
  psionAbilityId?: string;
}

// ---- Combatant Representation ----

export interface StatusEffect {
  id: string;
  name: StatusEffectName;
  remainingRounds: number;
  /** Damage per round for DoT effects */
  damagePerRound?: number;
  /** Modifier applied to attack rolls, AC, etc. */
  modifier?: number;
  sourceId: string;
}

export type StatusEffectName =
  | 'poisoned'
  | 'stunned'
  | 'blessed'
  | 'burning'
  | 'frozen'
  | 'paralyzed'
  | 'blinded'
  | 'shielded'
  | 'weakened'
  | 'hasted'
  | 'slowed'
  | 'regenerating'
  | 'dominated'
  | 'banished'
  | 'phased'
  | 'foresight';

export interface SpellSlots {
  /** Key is spell level (1-5), value is remaining slots */
  [level: number]: number;
}

export interface WeaponInfo {
  id: string;
  name: string;
  diceCount: number;
  diceSides: number;
  damageModifierStat: 'str' | 'dex';
  attackModifierStat: 'str' | 'dex';
  /** Flat bonus from enchantments, quality, etc. */
  bonusDamage: number;
  bonusAttack: number;
}

export interface SpellInfo {
  id: string;
  name: string;
  level: number;
  /** Stat used for spell attack and save DC */
  castingStat: 'int' | 'wis' | 'cha';
  type: 'damage' | 'heal' | 'status' | 'damage_status';
  diceCount: number;
  diceSides: number;
  modifier: number;
  /** Status effect applied on hit/failed save */
  statusEffect?: StatusEffectName;
  statusDuration?: number;
  /** Whether the target makes a save to resist */
  requiresSave: boolean;
  saveType?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
}

export interface ItemInfo {
  id: string;
  name: string;
  type: 'heal' | 'damage' | 'buff' | 'cleanse';
  diceCount?: number;
  diceSides?: number;
  flatAmount?: number;
  statusEffect?: StatusEffectName;
  statusDuration?: number;
}

export interface Combatant {
  id: string;
  name: string;
  /** 'character' for players, 'monster' for PvE enemies */
  entityType: 'character' | 'monster';
  team: number;
  stats: CharacterStats;
  level: number;
  currentHp: number;
  maxHp: number;
  currentMana: number;
  maxMana: number;
  ac: number;
  initiative: number;
  statusEffects: StatusEffect[];
  spellSlots: SpellSlots;
  weapon: WeaponInfo | null;
  isAlive: boolean;
  isDefending: boolean;
  proficiencyBonus: number;
  /** Race identifier for racial ability resolution (e.g., 'orc', 'elf') */
  race?: string;
  /** Sub-race data for abilities that vary by sub-race (e.g., Drakonid element) */
  subRace?: { id: string; element?: string } | null;
  /** Psion: ID of the character controlling this combatant via Dominate/Absolute Dominion */
  controlledBy?: string | null;
  /** Psion: Number of rounds of mind control remaining */
  controlDuration?: number;
  /** Psion: Round number when a banished combatant returns */
  banishedUntilRound?: number | null;
  /** Psion: Whether this combatant has a reaction available (Precognitive Dodge) */
  hasReaction?: boolean;
  /** Psion: Type of reaction available */
  reactionType?: string | null;
  /** Psion: The last combat action performed, for Temporal Echo */
  lastAction?: CombatAction | null;
  /** Psion: Character class for ability resolution */
  characterClass?: string | null;
}

// ---- Turn Resolution Results ----

export interface AttackResult {
  type: 'attack';
  actorId: string;
  targetId: string;
  attackRoll: number;
  attackTotal: number;
  targetAC: number;
  hit: boolean;
  critical: boolean;
  damageRoll: number;
  totalDamage: number;
  targetHpAfter: number;
  targetKilled: boolean;
}

export interface CastResult {
  type: 'cast';
  actorId: string;
  targetId: string;
  spellName: string;
  spellLevel: number;
  slotExpended: number;
  /** For damage/heal spells */
  damageRoll?: number;
  totalDamage?: number;
  healAmount?: number;
  /** For save-based spells */
  saveRequired: boolean;
  saveRoll?: number;
  saveTotal?: number;
  saveDC?: number;
  saveSucceeded?: boolean;
  /** Status effect applied */
  statusApplied?: StatusEffectName;
  statusDuration?: number;
  targetHpAfter: number;
  targetKilled: boolean;
}

export interface DefendResult {
  type: 'defend';
  actorId: string;
  acBonusGranted: number;
}

export interface ItemResult {
  type: 'item';
  actorId: string;
  targetId: string;
  itemName: string;
  healAmount?: number;
  damageAmount?: number;
  statusApplied?: StatusEffectName;
  statusRemoved?: StatusEffectName;
  targetHpAfter: number;
}

export interface FleeResult {
  type: 'flee';
  actorId: string;
  fleeRoll: number;
  fleeDC: number;
  success: boolean;
}

export interface RacialAbilityActionResult {
  type: 'racial_ability';
  actorId: string;
  abilityName: string;
  success: boolean;
  description: string;
  targetIds?: string[];
  damage?: number;
  healing?: number;
  statusApplied?: string;
}

export interface PsionAbilityResult {
  type: 'psion_ability';
  actorId: string;
  abilityName: string;
  abilityId: string;
  targetId?: string;
  targetIds?: string[];
  damage?: number;
  saveRequired: boolean;
  saveRoll?: number;
  saveTotal?: number;
  saveDC?: number;
  saveSucceeded?: boolean;
  statusApplied?: string;
  statusDuration?: number;
  controlled?: boolean;
  banished?: boolean;
  negatedAttack?: boolean;
  echoAction?: boolean;
  description: string;
  targetHpAfter?: number;
  targetKilled?: boolean;
}

export type TurnResult = AttackResult | CastResult | DefendResult | ItemResult | FleeResult | RacialAbilityActionResult | PsionAbilityResult;

// ---- Status Effect Processing ----

export interface StatusTickResult {
  combatantId: string;
  effectName: StatusEffectName;
  damage?: number;
  healing?: number;
  expired: boolean;
  hpAfter: number;
  killed: boolean;
}

// ---- Death Penalty ----

export interface DeathPenalty {
  characterId: string;
  goldLostPercent: number;
  goldLost: number;
  xpLost: number;
  durabilityDamage: number;
  respawnTownId: string;
}

// ---- Combat Session State (in-memory) ----

export interface CombatState {
  sessionId: string;
  type: 'PVE' | 'PVP' | 'DUEL' | 'ARENA' | 'WAR';
  status: 'active' | 'completed';
  round: number;
  turnIndex: number;
  combatants: Combatant[];
  /** Turn order by combatant id, sorted by initiative descending */
  turnOrder: string[];
  log: TurnLogEntry[];
  winningTeam: number | null;
}

export interface TurnLogEntry {
  round: number;
  actorId: string;
  action: CombatActionType;
  result: TurnResult;
  statusTicks: StatusTickResult[];
}
