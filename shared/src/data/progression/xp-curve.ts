/**
 * XP Curve and Per-Action Rewards for Realm of Crowns (Daily Action Economy)
 *
 * Design context:
 * Players take 1 major action per day (gather, craft, travel, combat, political).
 * Progression is measured in days/weeks, not hours.
 *
 * XP Formula: floor(10 * level^1.15) + 30
 * - The +30 base ensures early levels aren't trivially fast (min 40 XP per level)
 * - The 1.15 exponent gives a gentle but steady escalation
 * - Level 1->2 costs 40 XP (~2 days), Level 50->51 costs 929 XP (~18 days)
 *
 * Estimated progression milestones (assumes average daily play):
 *   Level  5: ~13 days   (~2 weeks)
 *   Level 10: ~32 days   (~1 month)
 *   Level 25: ~127 days  (~4 months)
 *   Level 40: ~296 days  (~10 months)
 *   Level 50: ~457 days  (~15 months)
 */

// ---------------------------------------------------------------------------
// Core XP Formula
// ---------------------------------------------------------------------------

/** XP required to advance from the given level to the next. */
export function xpToNextLevel(level: number): number {
  if (level < 1) return 0;
  return Math.floor(10 * Math.pow(level, 1.15)) + 30;
}

/** Total cumulative XP needed to reach a given level from level 1. */
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpToNextLevel(i);
  }
  return total;
}

/** Determines what level a character should be based on their total XP. */
export function levelForXp(totalXp: number): number {
  let level = 1;
  let xpNeeded = 0;
  while (level < MAX_LEVEL) {
    const nextLevelXp = xpToNextLevel(level);
    if (xpNeeded + nextLevelXp > totalXp) break;
    xpNeeded += nextLevelXp;
    level++;
  }
  return level;
}

export const MAX_LEVEL = 50;

// ---------------------------------------------------------------------------
// XP Table — precomputed reference for all 50 levels
// ---------------------------------------------------------------------------

/**
 * Estimated days assume a phased daily XP income model:
 * - Days 1-10: ~25 XP/day (new player, no streak, basic tier-1 work)
 * - Days 11-30: ~35 XP/day (streak building, first quest completions)
 * - Days 31-60: ~42 XP/day (regular quests, mid-tier work, full streak)
 * - Days 61+: ~52 XP/day (high-tier work, quest chains, political XP)
 *
 * Actual progression varies with play style, race bonuses, and quest availability.
 */
function estimateDaysForXp(xpTotal: number): number {
  let remaining = xpTotal;
  let d = 0;

  // Phase 1: days 1-10 at 25/day
  const p1 = Math.min(remaining, 10 * 25);
  d += Math.min(10, Math.ceil(p1 / 25));
  remaining -= p1;
  if (remaining <= 0) return d;

  // Phase 2: days 11-30 at 35/day
  const p2 = Math.min(remaining, 20 * 35);
  d += Math.min(20, Math.ceil(p2 / 35));
  remaining -= p2;
  if (remaining <= 0) return d;

  // Phase 3: days 31-60 at 42/day
  const p3 = Math.min(remaining, 30 * 42);
  d += Math.min(30, Math.ceil(p3 / 42));
  remaining -= p3;
  if (remaining <= 0) return d;

  // Phase 4: 61+ at 52/day (mature player, high-tier work + quests + streak)
  d += Math.ceil(remaining / 52);
  return d;
}

export interface XpTableEntry {
  level: number;
  xpToNext: number;
  cumulativeXp: number;
  estimatedDays: number;
}

function buildXpTable(): XpTableEntry[] {
  const table: XpTableEntry[] = [];
  let cumulative = 0;

  for (let level = 1; level <= MAX_LEVEL; level++) {
    const xpToNext = xpToNextLevel(level);
    cumulative += xpToNext;
    table.push({
      level,
      xpToNext,
      cumulativeXp: cumulative,
      estimatedDays: estimateDaysForXp(cumulative),
    });
  }

  return table;
}

export const XP_TABLE: XpTableEntry[] = buildXpTable();

// ---------------------------------------------------------------------------
// Per-Action XP Rewards
// ---------------------------------------------------------------------------

/**
 * XP values for each action type in the daily-action economy.
 *
 * Design goal: a single daily work action should yield ~15-25 XP depending on
 * resource tier. Combined with LOGIN_BONUS (5 XP) and streak (0-10 XP), the
 * base daily income is ~20-40 XP. Quest completions add lumpy bonuses on top.
 *
 * These values replace the old per-tick XP (which assumed multiple actions/day).
 */
export const ACTION_XP = {
  // -- Gathering --
  // Old: (10 + (tier-1)*5) / 2 = 5-12 per action (designed for many actions/day)
  // New: 15-30 per action (one action per day must feel meaningful)
  WORK_GATHER_BASE: 15,          // Base XP for a tier-1 gather
  WORK_GATHER_PER_TIER: 5,       // +5 per tier above 1 (T1=15, T2=20, T3=25, T4=30)

  // -- Crafting --
  // Old: recipe.xpReward directly (values vary 10-50)
  // New: multiplier on recipe.xpReward to scale existing recipe definitions
  // Recipes already have xpReward baked in; this multiplier adjusts them for daily pacing
  WORK_CRAFT_MULTIPLIER: 0.8,    // 80% of recipe.xpReward (recipes range 10-50, so 8-40 XP)

  // -- Travel --
  // Travel costs a full day's action, so it should grant XP to avoid feeling "wasted"
  TRAVEL_PER_NODE: 3,            // 3 XP per node traversed (typical journey: 2-5 nodes = 6-15 XP)

  // -- PvE Combat --
  // Old: monster.level * 25 (designed for optional repeatable grinds)
  // New: scaled down since combat is now a daily commitment, not a grind
  PVE_WIN_PER_MONSTER_LEVEL: 5,  // Win: 5 * monster level (L5 mob = 25 XP, L10 = 50 XP)
  PVE_SURVIVE: 5,                // Flat XP for surviving (flee/lose) — consolation prize

  // -- PvP Combat --
  // PvP is high-risk, high-reward — you're spending your daily action on it
  PVP_WIN_PER_OPPONENT_LEVEL: 8, // Win: 8 * opponent level (L10 opponent = 80 XP, big reward)

  // -- Political Actions --
  // Voting, running for office, enacting laws
  POLITICAL_ACTION: 10,          // Flat 10 XP for political participation

  // -- Passive / Streak --
  LOGIN_BONUS: 5,                // 5 XP just for submitting any daily action (shows up to play)
  STREAK_BONUS_PER_DAY: 2,       // +2 XP per consecutive day
  STREAK_MAX_DAYS: 7,            // Streak caps at 7 consecutive days
  STREAK_MAX_BONUS: 10,          // Cap: 5 days * 2 = 10 XP max streak bonus (floor(7*2)=14, but capped at 10)
} as const;

// ---------------------------------------------------------------------------
// Level-Up Rewards
// ---------------------------------------------------------------------------

/**
 * What players receive per level gained.
 *
 * Stat points let players customize their build. Skill points unlock abilities.
 * HP/MP gains are flat per level for predictability.
 *
 * Unchanged from original system — these values feel right for the game's
 * stat economy and are independent of XP pacing.
 */
export const LEVEL_UP_REWARDS = {
  STAT_POINTS_PER_LEVEL: 2,      // 2 stat points per level (allocate to str/dex/con/int/wis/cha)
  SKILL_POINTS_PER_LEVEL: 1,     // 1 skill point per level (unlock abilities)
  HP_PER_LEVEL: 10,              // +10 max HP per level
  MP_PER_LEVEL: 5,               // +5 max MP per level
} as const;

// ---------------------------------------------------------------------------
// Death Penalty
// ---------------------------------------------------------------------------

/**
 * Rebalanced death penalties for daily-action economy.
 *
 * In the old system, dying cost 50 * level XP. At level 10 that's 500 XP,
 * which could be recovered in a few combat sessions. In the daily-action
 * economy, 500 XP represents ~10-15 days of progress — far too punishing.
 *
 * New penalties:
 * - Gold: 5% (down from 10%) — still stings but doesn't bankrupt
 * - XP: 15 * level (down from 50 * level) — ~1-3 days of XP at most levels
 * - Durability: 5 (down from 10) — equipment lasts longer between repairs
 *
 * Revenant racial ability (50% death penalty reduction) still applies on top.
 */
export const DEATH_PENALTY = {
  GOLD_LOSS_PERCENT: 5,          // Lose 5% of gold on death (old: 10%)
  XP_LOSS_PER_LEVEL: 15,         // Lose 15 * level XP on death (old: 50 * level)
  DURABILITY_DAMAGE: 5,          // All equipped items lose 5 durability (old: 10)
} as const;
