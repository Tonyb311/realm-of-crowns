/**
 * Group Combat Helpers — CR-match monster selection and grid expansion
 * for 5v5 party vs monster group simulations.
 */

import type { PartyConfig, PartyMemberConfig } from '../services/combat-simulator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MonsterGroupConfig {
  partyLevel: number;
  partySize: number;
  method: 'cr_match' | 'manual';
  difficulty: 'easy' | 'medium' | 'hard' | 'deadly';
  monsters?: string[];  // For manual method
  biome?: string;       // Optional biome filter
}

export interface GroupMatchup {
  party: PartyConfig;
  monsterGroup: MonsterGroupConfig;
  iterations: number;
}

export interface GroupGridConfig {
  parties: PartyConfig[];
  levels: number[];
  difficulties: ('easy' | 'medium' | 'hard' | 'deadly')[];
  method: 'cr_match' | 'manual';
  iterationsPerMatchup: number;
  biome?: string;
}

export interface GroupRunConfig {
  groupMatchups?: GroupMatchup[];
  groupGrid?: GroupGridConfig;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Difficulty multipliers for CR budget
// ---------------------------------------------------------------------------

const DIFFICULTY_MULTIPLIER: Record<string, number> = {
  easy: 0.5,
  medium: 0.75,
  hard: 1.0,
  deadly: 1.5,
};

// ---------------------------------------------------------------------------
// CR-Match Monster Selection
// ---------------------------------------------------------------------------

export interface MonsterRecord {
  name: string;
  level: number;
  classification?: string;
}

/**
 * Select a group of monsters matched to a party's CR budget.
 * Budget = partySize × partyLevel × difficultyMultiplier
 * Greedy knapsack: pick monsters whose level fits within budget, max 5 monsters.
 * Randomizes selection for variety across iterations.
 */
export function selectMonsterGroup(
  config: MonsterGroupConfig,
  allMonsters: MonsterRecord[],
): string[] {
  if (config.method === 'manual' && config.monsters) {
    return config.monsters;
  }

  const budget = config.partySize * config.partyLevel * (DIFFICULTY_MULTIPLIER[config.difficulty] ?? 0.75);
  const maxMonsters = 5;
  const levelRange = 5;

  // Filter eligible monsters (within level range, no world bosses)
  const eligible = allMonsters.filter(m => {
    if (m.classification === 'world_boss') return false;
    if (Math.abs(m.level - config.partyLevel) > levelRange) return false;
    if (m.level > budget) return false; // single monster can't exceed budget
    return true;
  });

  if (eligible.length === 0) {
    // Fallback: pick any non-world-boss monster within 10 levels
    const fallback = allMonsters.filter(m =>
      m.classification !== 'world_boss' && Math.abs(m.level - config.partyLevel) <= 10
    );
    if (fallback.length === 0) return [];
    return [fallback[Math.floor(Math.random() * fallback.length)].name];
  }

  // Shuffle for variety
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);

  // Greedy knapsack fill
  const selected: string[] = [];
  let remaining = budget;

  for (const monster of shuffled) {
    if (selected.length >= maxMonsters) break;
    if (monster.level <= remaining) {
      selected.push(monster.name);
      remaining -= monster.level;
    }
  }

  // Ensure at least 1 monster
  if (selected.length === 0 && shuffled.length > 0) {
    selected.push(shuffled[0].name);
  }

  return selected;
}

// ---------------------------------------------------------------------------
// Grid Expansion
// ---------------------------------------------------------------------------

/**
 * Expand a GroupGridConfig into individual GroupMatchups.
 * parties × levels × difficulties = N matchups, each with iterationsPerMatchup.
 */
export function expandGroupGrid(grid: GroupGridConfig): GroupMatchup[] {
  const matchups: GroupMatchup[] = [];

  for (const party of grid.parties) {
    for (const level of grid.levels) {
      for (const difficulty of grid.difficulties) {
        const partyWithLevel: PartyConfig = {
          ...party,
          partyLevel: level,
        };

        matchups.push({
          party: partyWithLevel,
          monsterGroup: {
            partyLevel: level,
            partySize: party.members.length,
            method: grid.method,
            difficulty,
            biome: grid.biome,
          },
          iterations: grid.iterationsPerMatchup,
        });
      }
    }
  }

  return matchups;
}
