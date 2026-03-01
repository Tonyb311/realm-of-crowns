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

export type CombatActionType = 'attack' | 'cast' | 'defend' | 'item' | 'flee' | 'racial_ability' | 'psion_ability' | 'class_ability';

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
  /** Class ability ID being used (for class_ability actions) */
  classAbilityId?: string;
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
  | 'foresight'
  // Class ability status effects
  | 'taunt'
  | 'silence'
  | 'root'
  | 'skip_turn'
  | 'mesmerize'
  | 'polymorph';

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
  /** Damage type (SLASHING, PIERCING, BLUDGEONING, etc.) */
  damageType?: string;
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
  /** Character class for ability resolution */
  characterClass?: string | null;
  /** Character specialization */
  specialization?: string | null;
  /** P2 #52: True if the combatant successfully fled from combat */
  hasFled?: boolean;
  /** Class ability cooldowns: abilityId -> rounds remaining */
  abilityCooldowns?: Record<string, number>;
  /** Class ability uses this combat: abilityId -> times used */
  abilityUsesThisCombat?: Record<string, number>;
  /** Active buffs from class abilities */
  activeBuffs?: ActiveBuff[];
  /** Delayed effects waiting to detonate (e.g., Death Mark) */
  delayedEffects?: DelayedEffect[];
  /** Cooldown reduction from passives (0-1 percentage, e.g., 0.3 = 30%) */
  cooldownReductionPercent?: number;
  /** Cooldown reduction from passives (flat rounds subtracted) */
  cooldownReductionFlat?: number;
  /** Phase 5A: Temporary attack modifiers set by class ability handlers, consumed by resolveAttack */
  classAbilityAttackMods?: ClassAbilityAttackMods;
  // Phase 5B: Passive fields
  /** PASSIVE-1: Crit chance bonus from passives (added to critBonus in resolveAttack) */
  critChanceBonus?: number;
  /** PASSIVE-3: First attack in combat is an auto-crit */
  firstStrikeCrit?: boolean;
  /** PASSIVE-3: Tracks whether combatant has attacked this combat */
  hasAttackedThisCombat?: boolean;
  /** PASSIVE-4: Companion buff never expires */
  permanentCompanion?: boolean;
  /** PASSIVE-4: Companion doesn't take interception damage */
  companionImmune?: boolean;
  /** PASSIVE-5: Damage bonus that stacks each round */
  stackingDamagePerRound?: number;
  /** PASSIVE-5: Current accumulated round damage bonus */
  roundDamageBonus?: number;
  /** PASSIVE-6: Roll twice vs targets below HP threshold */
  advantageVsLowHp?: boolean;
  /** PASSIVE-6: HP percentage threshold for advantage */
  advantageHpThreshold?: number;
  /** MECH-6: Bonus multiplier for radiant/holy damage */
  holyDamageBonus?: number;
  /** MECH-8: Reduce enemy healing to zero */
  antiHealAura?: boolean;
  /** MECH-3: Charm/mesmerize duration multiplier */
  charmEffectiveness?: number;
  /** MECH-10: Tracks if extra action was already used this turn */
  extraActionUsedThisTurn?: boolean;
  // Phase 6: Psion passive fields
  /** PSION-PASSIVE-1: Psychic damage resistance (50% reduction) */
  psychicResistance?: boolean;
  /** PSION-PASSIVE-1: Mental save bonus (+2 to WIS/INT saves vs psion abilities) */
  mentalSaveBonus?: number;
  /** PSION-PASSIVE-2: Bonus to initiative roll */
  initiativeBonus?: number;
  /** PSION-PASSIVE-2: Cannot be surprised */
  cannotBeSurprised?: boolean;
  /** PSION-PASSIVE-3: Can see through stealth/invisible */
  seeInvisible?: boolean;
  /** PSION-PASSIVE-3: Immune to blinded status */
  immuneBlinded?: boolean;
  /** PSION-PASSIVE-3: Bonus to trap detection */
  trapDetectionBonus?: number;
  /** PSION-PASSIVE-4: Free disengage without opportunity attacks */
  freeDisengage?: boolean;
}

export interface ClassAbilityAttackMods {
  critBonus?: number;
  autoHit?: boolean;
  ignoreArmor?: boolean;
  accuracyMod?: number;
}

export interface ActiveBuff {
  sourceAbilityId: string;
  name: string;
  roundsRemaining: number;
  attackMod?: number;
  acMod?: number;
  damageMod?: number;
  dodgeMod?: number;
  damageReduction?: number;
  damageReflect?: number;
  absorbRemaining?: number;
  hotPerRound?: number;
  guaranteedHits?: number;
  extraAction?: boolean;
  ccImmune?: boolean;
  stealthed?: boolean;
  // Phase 3: Reactive trigger fields
  counterDamage?: number;
  trapDamage?: number;
  trapAoe?: boolean;
  triggerOn?: 'melee_attack' | 'attacked';
  // Phase 3: Companion fields
  companionDamage?: number;
  companionHp?: number;
  // Phase 5B: Mechanic fields
  /** MECH-4: Buff scales with missing HP */
  scalingType?: string;
  /** MECH-4: Maximum scaling bonus */
  scalingMax?: number;
  /** MECH-5: Extra damage taken from a specific source */
  bonusDamageFromSource?: number;
  /** MECH-5: Source actor ID for bonus damage */
  bonusDamageSourceId?: string;
  /** MECH-1: Buff is consumed after one use */
  consumeOnUse?: boolean;
  /** MECH-2: Next ability cooldown is halved */
  nextCooldownHalved?: boolean;
  /** MECH-9: Remaining poison application charges */
  poisonCharges?: number;
  /** MECH-9: DoT damage per round from poison */
  poisonDotDamage?: number;
  /** MECH-9: Duration of applied poison */
  poisonDotDuration?: number;
  /** MECH-11: Current stacking attack speed stacks */
  stackingAttackSpeedStacks?: number;
  /** MECH-11: Maximum stacks for attack speed */
  stackingAttackSpeedMax?: number;
}

export interface DelayedEffect {
  id: string;
  sourceAbilityId: string;
  sourceAbilityName: string;
  sourceActorId: string;
  roundsRemaining: number;
  diceCount: number;
  diceSides: number;
}

// ---- Turn Resolution Results ----

export interface AttackModifierBreakdown {
  source: string;
  value: number;
}

export interface AttackResult {
  type: 'attack';
  actorId: string;
  targetId: string;
  attackRoll: number;
  attackTotal: number;
  attackModifiers?: AttackModifierBreakdown[];
  targetAC: number;
  hit: boolean;
  critical: boolean;
  damageRoll: number;
  damageRolls?: number[];
  damageModifiers?: AttackModifierBreakdown[];
  damageType?: string;
  totalDamage: number;
  targetHpBefore?: number;
  targetHpAfter: number;
  targetKilled: boolean;
  weaponName?: string;
  weaponDice?: string;
  negatedAttack?: boolean;
  // Phase 3: Reactive counter/trap results
  counterTriggered?: boolean;
  counterDamage?: number;
  counterAbilityName?: string;
  counterAoe?: boolean;
  // Phase 3: Companion interception
  companionIntercepted?: boolean;
  companionDamageAbsorbed?: number;
  companionKilled?: boolean;
  // Phase 4: Death prevention
  deathPrevented?: boolean;
  deathPreventedAbility?: string;
  attackerDeathPrevented?: boolean;
  attackerDeathPreventedAbility?: string;
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

export interface ClassAbilityResult {
  type: 'class_ability';
  actorId: string;
  abilityId: string;
  abilityName: string;
  effectType: string;
  targetId?: string;
  targetIds?: string[];
  damage?: number;
  healing?: number;
  selfHealing?: number;
  buffApplied?: string;
  buffDuration?: number;
  debuffApplied?: string;
  debuffDuration?: number;
  statusApplied?: StatusEffectName;
  statusDuration?: number;
  statModifiers?: Record<string, number>;
  saveRequired?: boolean;
  saveType?: string;
  saveDC?: number;
  saveRoll?: number;
  saveTotal?: number;
  saveSucceeded?: boolean;
  fleeAttempt?: boolean;
  fleeSuccess?: boolean;
  cleansedEffects?: string[];
  description: string;
  targetHpAfter?: number;
  actorHpAfter?: number;
  targetKilled?: boolean;
  /** True when unimplemented effect type falls through to basic attack */
  fallbackToAttack?: boolean;
  /** Per-target breakdown for AoE abilities */
  perTargetResults?: Array<{
    targetId: string;
    targetName: string;
    damage?: number;
    healing?: number;
    statusApplied?: string;
    hpAfter: number;
    killed: boolean;
  }>;
  /** Per-strike breakdown for multi_attack abilities */
  strikeResults?: Array<{
    strikeNumber: number;
    hit: boolean;
    crit: boolean;
    damage: number;
    attackRoll?: number;
    attackTotal?: number;
    targetAc?: number;
  }>;
  totalStrikes?: number;
  strikesHit?: number;
  // Phase 3: Steal/special results
  goldStolen?: number;
  bonusLootRoll?: boolean;
  peacefulResolution?: boolean;
  randomAbilityUsed?: string;
}

export type TurnResult = AttackResult | CastResult | DefendResult | ItemResult | FleeResult | RacialAbilityActionResult | PsionAbilityResult | ClassAbilityResult;

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
  status: 'ACTIVE' | 'COMPLETED';
  round: number;
  turnIndex: number;
  combatants: Combatant[];
  /** Turn order by combatant id, sorted by initiative descending */
  turnOrder: string[];
  log: TurnLogEntry[];
  winningTeam: number | null;
  /** Phase 3: Set by Diplomat's Gambit when combat ends via negotiation */
  peacefulResolution?: boolean;
}

export interface TurnLogEntry {
  round: number;
  actorId: string;
  action: CombatActionType;
  result: TurnResult;
  statusTicks: StatusTickResult[];
}
