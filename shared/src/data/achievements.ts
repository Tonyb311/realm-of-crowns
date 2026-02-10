// Rebalanced for daily action economy (v2.0)
// Thresholds reduced to match 1-major-action-per-day pacing.
// XP rewards scaled to new XP curve (level costs: 40-929).

export interface AchievementDefinition {
  name: string;
  description: string;
  category: string;
  criteria: {
    type: string;
    target: number;
    [key: string]: unknown;
  };
  reward: {
    xp?: number;
    gold?: number;
    title?: string;
  };
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ---- Combat (PvE) ----
  { name: 'First Blood', description: 'Win your first PvE combat.', category: 'combat_pve', criteria: { type: 'pve_wins', target: 1 }, reward: { xp: 10 } },
  { name: 'Monster Slayer', description: 'Win 5 PvE combats.', category: 'combat_pve', criteria: { type: 'pve_wins', target: 5 }, reward: { xp: 30, gold: 25 } },
  { name: 'Veteran Warrior', description: 'Win 20 PvE combats.', category: 'combat_pve', criteria: { type: 'pve_wins', target: 20 }, reward: { xp: 75, gold: 100, title: 'Veteran' } },
  { name: 'Champion of the Realm', description: 'Win 75 PvE combats.', category: 'combat_pve', criteria: { type: 'pve_wins', target: 75 }, reward: { xp: 150, gold: 500, title: 'Champion' } },

  // ---- Combat (PvP) ----
  { name: 'Duelist', description: 'Win your first PvP duel.', category: 'combat_pvp', criteria: { type: 'pvp_wins', target: 1 }, reward: { xp: 15 } },
  { name: 'Gladiator', description: 'Win 10 PvP duels.', category: 'combat_pvp', criteria: { type: 'pvp_wins', target: 10 }, reward: { xp: 75, gold: 50, title: 'Gladiator' } },
  { name: 'Warlord', description: 'Win 50 PvP duels.', category: 'combat_pvp', criteria: { type: 'pvp_wins', target: 50 }, reward: { xp: 150, gold: 250, title: 'Warlord' } },

  // ---- Crafting ----
  { name: 'Apprentice Crafter', description: 'Craft 5 items.', category: 'crafting', criteria: { type: 'items_crafted', target: 5 }, reward: { xp: 15 } },
  { name: 'Journeyman Crafter', description: 'Craft 25 items.', category: 'crafting', criteria: { type: 'items_crafted', target: 25 }, reward: { xp: 50, gold: 50 } },
  { name: 'Master Artisan', description: 'Reach Expert tier in any crafting profession.', category: 'crafting', criteria: { type: 'profession_tier', target: 4, tier: 'EXPERT' }, reward: { xp: 75, gold: 100, title: 'Master Artisan' } },

  // ---- Social ----
  { name: 'Making Friends', description: 'Add your first friend.', category: 'social', criteria: { type: 'friends_count', target: 1 }, reward: { xp: 10 } },
  { name: 'Social Butterfly', description: 'Have 10 friends.', category: 'social', criteria: { type: 'friends_count', target: 10 }, reward: { xp: 30, title: 'Social Butterfly' } },
  { name: 'Guild Founder', description: 'Create or lead a guild.', category: 'social', criteria: { type: 'guild_leader', target: 1 }, reward: { xp: 50, gold: 50 } },

  // ---- Exploration ----
  { name: 'Explorer', description: 'Visit 3 different towns.', category: 'exploration', criteria: { type: 'towns_visited', target: 3 }, reward: { xp: 25 } },
  { name: 'World Traveler', description: 'Visit 8 different towns.', category: 'exploration', criteria: { type: 'towns_visited', target: 8 }, reward: { xp: 75, gold: 100, title: 'World Traveler' } },

  // ---- Economy ----
  { name: 'First Sale', description: 'Sell your first item on the market.', category: 'economy', criteria: { type: 'market_sales', target: 1 }, reward: { xp: 10 } },
  { name: 'Merchant', description: 'Complete 20 market sales.', category: 'economy', criteria: { type: 'market_sales', target: 20 }, reward: { xp: 50, gold: 50 } },
  { name: 'Merchant Prince', description: 'Earn 10000 gold from market sales.', category: 'economy', criteria: { type: 'gold_earned_from_sales', target: 10000 }, reward: { xp: 100, title: 'Merchant Prince' } },

  // ---- Political ----
  { name: 'Elected Official', description: 'Win an election.', category: 'political', criteria: { type: 'elections_won', target: 1 }, reward: { xp: 75, gold: 100 } },
  { name: 'Lawmaker', description: 'Enact a law in your kingdom.', category: 'political', criteria: { type: 'laws_enacted', target: 1 }, reward: { xp: 50 } },

  // ---- Leveling ----
  { name: 'Adventurer', description: 'Reach level 10.', category: 'leveling', criteria: { type: 'level_reached', target: 10 }, reward: { xp: 30, title: 'Adventurer' } },
  { name: 'Seasoned Hero', description: 'Reach level 25.', category: 'leveling', criteria: { type: 'level_reached', target: 25 }, reward: { xp: 75, gold: 250, title: 'Hero' } },
  { name: 'Legend', description: 'Reach level 50.', category: 'leveling', criteria: { type: 'level_reached', target: 50 }, reward: { xp: 150, gold: 1000, title: 'Legend' } },

  // ---- Gathering ----
  { name: 'Gatherer', description: 'Complete 10 gathering actions.', category: 'gathering', criteria: { type: 'gathering_completed', target: 10 }, reward: { xp: 25 } },
  { name: 'Resource Baron', description: 'Complete 40 gathering actions.', category: 'gathering', criteria: { type: 'gathering_completed', target: 40 }, reward: { xp: 75, gold: 150, title: 'Resource Baron' } },

  // ---- Specialization ----
  { name: 'Specialized', description: 'Choose a class specialization.', category: 'progression', criteria: { type: 'has_specialization', target: 1 }, reward: { xp: 30 } },
  { name: 'Skill Master', description: 'Unlock 10 abilities.', category: 'progression', criteria: { type: 'abilities_unlocked', target: 10 }, reward: { xp: 75, title: 'Skill Master' } },
];
