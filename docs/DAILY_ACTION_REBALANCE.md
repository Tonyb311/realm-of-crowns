# Daily Action Economy Rebalance (v2.0)

## Design Context

Realm of Crowns operates on a **1 major action per day** economy. Players submit a single meaningful action each day (gather, craft, travel, combat, or political), and progression is measured in days and weeks rather than hours. Travel costs 1 node per day. Combat encounters are random events that consume the daily action. This rebalance adjusts every XP source, quest requirement, achievement threshold, and death penalty to fit this pacing model.

---

## New XP Curve

**Formula:** `floor(10 * level^1.15) + 30`

- The `+30` base prevents trivially fast early levels (minimum 40 XP per level).
- The `1.15` exponent produces a gentle but steady escalation.
- Level 1->2 costs 40 XP (~2 days). Level 50->51 costs 929 XP (~18 days of mature play).

**Estimated days assume a phased daily XP income model:**
- Days 1-10: ~25 XP/day (new player, no streak, basic tier-1 work)
- Days 11-30: ~35 XP/day (streak building, first quest completions)
- Days 31-60: ~42 XP/day (regular quests, mid-tier work, full streak)
- Days 61+: ~52 XP/day (high-tier work, quest chains, political XP)

| Level | XP to Next | Cumulative XP | Estimated Days |
|------:|-----------:|--------------:|---------------:|
|     1 |         40 |            40 |              2 |
|     2 |         52 |            92 |              4 |
|     3 |         65 |           157 |              7 |
|     4 |         79 |           236 |             10 |
|     5 |         93 |           329 |             13 |
|     6 |        108 |           437 |             16 |
|     7 |        123 |           560 |             19 |
|     8 |        139 |           699 |             23 |
|     9 |        155 |           854 |             28 |
|    10 |        171 |         1,025 |             32 |
|    11 |        187 |         1,212 |             37 |
|    12 |        204 |         1,416 |             42 |
|    13 |        221 |         1,637 |             47 |
|    14 |        237 |         1,874 |             52 |
|    15 |        255 |         2,129 |             59 |
|    16 |        272 |         2,401 |             64 |
|    17 |        290 |         2,691 |             70 |
|    18 |        307 |         2,998 |             76 |
|    19 |        325 |         3,323 |             82 |
|    20 |        343 |         3,666 |             88 |
|    21 |        361 |         4,027 |             95 |
|    22 |        379 |         4,406 |            103 |
|    23 |        398 |         4,804 |            110 |
|    24 |        416 |         5,220 |            118 |
|    25 |        435 |         5,655 |            127 |
|    26 |        453 |         6,108 |            135 |
|    27 |        472 |         6,580 |            145 |
|    28 |        491 |         7,071 |            154 |
|    29 |        510 |         7,581 |            164 |
|    30 |        529 |         8,110 |            174 |
|    31 |        548 |         8,658 |            184 |
|    32 |        568 |         9,226 |            195 |
|    33 |        587 |         9,813 |            207 |
|    34 |        607 |        10,420 |            218 |
|    35 |        626 |        11,046 |            230 |
|    36 |        646 |        11,692 |            243 |
|    37 |        665 |        12,357 |            256 |
|    38 |        685 |        13,042 |            269 |
|    39 |        705 |        13,747 |            282 |
|    40 |        725 |        14,472 |            296 |
|    41 |        745 |        15,217 |            311 |
|    42 |        765 |        15,982 |            325 |
|    43 |        785 |        16,767 |            340 |
|    44 |        806 |        17,573 |            356 |
|    45 |        826 |        18,399 |            372 |
|    46 |        846 |        19,245 |            388 |
|    47 |        867 |        20,112 |            405 |
|    48 |        887 |        20,999 |            422 |
|    49 |        908 |        21,907 |            439 |
|    50 |        929 |        22,836 |            457 |

**Key milestones:** Level 5 at ~2 weeks, Level 10 at ~1 month, Level 25 at ~4 months, Level 40 at ~10 months, Level 50 at ~15 months.

---

## Per-Action XP Rewards

| Action | Old Value | New Value | Constant | Notes |
|--------|----------:|----------:|----------|-------|
| Gather (Tier 1) | 5 | 15 | `WORK_GATHER_BASE` | Was `(10 + (tier-1)*5) / 2` for multi-action/day |
| Gather (Tier 2) | 7.5 | 20 | `BASE + 1 * PER_TIER` | +5 per tier above 1 |
| Gather (Tier 3) | 10 | 25 | `BASE + 2 * PER_TIER` | |
| Gather (Tier 4) | 12.5 | 30 | `BASE + 3 * PER_TIER` | |
| Craft | recipe.xpReward (10-50) | 80% of recipe.xpReward (8-40) | `WORK_CRAFT_MULTIPLIER = 0.8` | Multiplier on existing recipe values |
| Travel | 0 | 3 per node | `TRAVEL_PER_NODE = 3` | New; 2-5 nodes = 6-15 XP |
| PvE Win (per mob level) | 25 * mob level | 5 * mob level | `PVE_WIN_PER_MONSTER_LEVEL = 5` | L5 mob: 125 -> 25; L10: 250 -> 50 |
| PvE Survive (flee/lose) | 0 | 5 | `PVE_SURVIVE = 5` | New consolation prize |
| PvP Win (per opp level) | 50 * opp level | 8 * opp level | `PVP_WIN_PER_OPPONENT_LEVEL = 8` | L10 opp: 500 -> 80 |
| Political Action | N/A | 10 | `POLITICAL_ACTION = 10` | Voting, office, laws |
| Login Bonus | N/A | 5 | `LOGIN_BONUS = 5` | For submitting any daily action |
| Streak Bonus | N/A | +2/day, cap 10 | `STREAK_BONUS_PER_DAY = 2` | Caps at 7 consecutive days (max 10 XP) |

---

## Level-Up Rewards

Unchanged from the original system. These values are independent of XP pacing.

| Reward | Per Level |
|--------|----------:|
| Stat Points (str/dex/con/int/wis/cha) | 2 |
| Skill Points (unlock abilities) | 1 |
| Max HP | +10 |
| Max MP | +5 |

---

## Death Penalty

| Penalty | Old Value | New Value | Rationale |
|---------|----------:|----------:|-----------|
| Gold Loss | 10% of gold | 5% of gold | Stings but doesn't bankrupt |
| XP Loss | 50 * level | 15 * level | ~1-3 days of XP at most levels |
| Durability Damage | 10 to all equipped | 5 to all equipped | Equipment lasts longer between repairs |

At level 10, old XP loss was 500 (~10-15 days of daily-economy progress). New XP loss is 150 (~3-4 days). Revenant racial ability (50% death penalty reduction) still applies.

---

## Quest Rebalance Summary

### Main Quests (12 quests)

| Quest | Lvl Req | Key Objectives | XP | Gold |
|-------|--------:|----------------|---:|-----:|
| The Awakening | 1 | Talk to Elder Tomas | 25 | 50 |
| Proving Ground | 1 | Kill 2 Goblins, 2 Giant Rats | 40 | 80 |
| Gathering Supplies | 2 | Gather 3 Ore, 3 Wood | 45 | 100 |
| The Road Ahead | 3 | Visit Hearthshire, kill 2 Bandits | 60 | 130 |
| Shadows Stir | 5 | Visit Nethermire, kill 2 Skeleton Warriors | 85 | 180 |
| Into the Depths | 7 | Visit Kazad-Vorn, kill 3 Giant Spiders | 120 | 280 |
| Rumors of Dragonfire | 12 | Visit Drakenspire, kill 2 Dire Wolves + 1 Young Dragon | 200 | 450 |
| The Final Stand | 16 | Visit Ashenmoor, kill 1 Lich | 250 | 600 |
| The Sunken Throne | 20 | Visit Coralspire, kill 1 Abyssal Kraken, gather 3 Reagents | 350 | 800 |
| Crown of Shadows | 24 | Visit Duskwarden, kill 2 Shadow Weavers + 1 Drow Matriarch | 400 | 1,000 |
| Twilight of Nations | 27 | Visit Kingshold + Aelindra, kill 2 Void Harbingers | 500 | 1,200 |
| Dawn of Eternity | 30 | Visit The Confluence, kill 1 Void Colossus | 600 | 1,500 |

Total main quest XP: 2,675. Total main quest gold: 6,370.

### Town Quests (25 quests)

| Quest | Lvl Req | Region / Town | Key Objectives | XP | Gold |
|-------|--------:|---------------|----------------|---:|-----:|
| Rat Infestation | 1 | Heartlands / Kingshold | Kill 2 Giant Rats | 25 | 60 |
| Harvest Protection | 2 | Heartlands / Kingshold | Kill 2 Wolves | 35 | 80 |
| Blacksmith's Request | 2 | Heartlands / Kingshold | Gather 3 Ore | 35 | 80 |
| Bandit Highway | 3 | Heartlands / Kingshold | Kill 2 Bandits, visit Bridgewater | 50 | 120 |
| Timber for the Mill | 1 | Heartlands / Millhaven | Gather 3 Wood | 25 | 60 |
| Wolf Pack Cull | 2 | Silverwood / Aelindra | Kill 2 Wolves | 35 | 80 |
| Herbal Remedy | 2 | Silverwood / Aelindra | Gather 3 Herbs | 40 | 90 |
| Enchanted Wood | 3 | Silverwood / Aelindra | Gather 4 Wood | 50 | 110 |
| Mine Clearance | 5 | Ironvault / Kazad-Vorn | Kill 2 Giant Spiders | 70 | 160 |
| Ore Requisition | 5 | Ironvault / Kazad-Vorn | Gather 5 Ore | 75 | 170 |
| Stone Guardian | 10 | Ironvault / Kazad-Vorn | Kill 1 Ancient Golem | 150 | 350 |
| Goblin Trouble | 1 | Crossroads / Hearthshire | Kill 3 Goblins | 25 | 60 |
| Grain for the Market | 1 | Crossroads / Hearthshire | Gather 3 Grain | 30 | 70 |
| Trade Route Patrol | 2 | Crossroads / Hearthshire | Visit Greenhollow + Peddler's Rest | 40 | 90 |
| Border Tensions | 8 | Twilight March / Dawnbridge | Kill 3 Orc Skirmishers, visit Dawnbridge | 120 | 280 |
| Diplomatic Correspondence | 6 | Twilight March / Dawnbridge | Visit Aelindra + Kingshold | 85 | 200 |
| Alpha Challenge | 12 | Thornwilds / Fanghollow | Kill 1 Dire Beast, gather 3 Hides | 180 | 400 |
| Silk Harvest | 20 | Underdark / Duskwarden | Kill 3 Giant Spiders, gather 4 Fiber | 350 | 800 |
| Tidal Predators | 10 | Pelagic Depths / Coralspire | Kill 2 Reef Sharks + 2 Giant Eels | 150 | 350 |
| Avalanche Clearing | 22 | Skyspire Peaks / Summit Hold | Kill 2 Frost Giants, gather 5 Stone | 380 | 850 |

Note: The town quest file contains 20 defined quests across 8 regions. Five additional town quests (from Bridgewater, Moonhaven, Greenhollow, Peddler's Rest, and Fanghollow secondary) are referenced in the quest system but defined in region data files.

### Recurring Quests (9 quests)

Renamed from "Daily Quests" -- cooldowns are 72h (3-day) or 168h (weekly) to match the 1-action/day pacing.

| Quest | Lvl Req | Cooldown | Key Objectives | XP | Gold |
|-------|--------:|---------:|----------------|---:|-----:|
| Recurring Hunt | 1 | 72h | Kill any 2 monsters | 30 | 60 |
| Recurring Gathering | 1 | 72h | Gather any 3 resources | 25 | 50 |
| Recurring Patrol | 1 | 72h | Visit any 1 town | 20 | 45 |
| Recurring Slayer | 5 | 72h | Kill any 3 monsters | 55 | 120 |
| Recurring Prospector | 5 | 72h | Gather 3 Ore | 50 | 110 |
| Realm Warden | 15 | 168h | Kill any 3 monsters, visit any 1 town | 150 | 350 |
| War Supplier | 15 | 168h | Gather any 5 resources | 130 | 300 |
| Champion's Trial | 25 | 168h | Kill any 3 creatures, gather 3 Reagents | 300 | 700 |
| *(9th quest reserved)* | -- | -- | -- | -- | -- |

Note: 8 recurring quests are defined in the data file. The 9th slot is referenced in the system design but not yet implemented.

### Guild Quests (3 quests)

Designed for 3-5 players over 1-2 weeks of coordinated play.

| Quest | Lvl Req | Key Objectives | XP | Gold | Rep |
|-------|--------:|----------------|---:|-----:|----:|
| Guild Initiation | 3 | Kill 5 Goblins + 5 Wolves | 60 | 150 | 25 |
| Guild Resource Drive | 5 | Gather 8 Ore + 8 Wood + 5 Herbs | 80 | 200 | 30 |
| Guild Expedition | 7 | Visit Nethermire + Kazad-Vorn | 100 | 250 | 40 |

### Bounty Quests (6 quests)

Repeatable with long cooldowns (336h = 2 weeks, 672h = 4 weeks).

| Quest | Lvl Req | Cooldown | Key Objectives | XP | Gold |
|-------|--------:|---------:|----------------|---:|-----:|
| Bounty: Orc Raiders | 5 | 336h | Kill 3 Orc Warriors | 80 | 180 |
| Bounty: Troll Menace | 8 | 336h | Kill 2 Trolls | 120 | 280 |
| Bounty: Dragon Slayer | 12 | 336h | Kill 1 Young Dragon | 200 | 500 |
| Bounty: Underdark Purge | 18 | 336h | Kill 3 Shadow Wraiths + 1 Wraith Lord | 300 | 700 |
| Bounty: Elemental Surge | 25 | 672h | Kill 3 Rogue Elementals + 1 Elemental Titan | 450 | 1,100 |
| Bounty: Void Incursion | 30 | 672h | Kill 3 Void Stalkers + 1 Void Behemoth | 550 | 1,400 |

---

## Achievement Rebalance Summary

All 27 achievements. Thresholds reduced to match 1-action-per-day pacing. XP rewards scaled from the old 50-2000 range down to 10-150.

| # | Name | Category | Old Threshold | New Threshold | XP | Gold | Title |
|--:|------|----------|---------------|---------------|---:|-----:|-------|
| 1 | First Blood | Combat (PvE) | 1 PvE win | 1 PvE win | 10 | -- | -- |
| 2 | Monster Slayer | Combat (PvE) | 10 PvE wins | 5 PvE wins | 30 | 25 | -- |
| 3 | Veteran Warrior | Combat (PvE) | 50 PvE wins | 20 PvE wins | 75 | 100 | Veteran |
| 4 | Champion of the Realm | Combat (PvE) | 200 PvE wins | 75 PvE wins | 150 | 500 | Champion |
| 5 | Duelist | Combat (PvP) | 1 PvP win | 1 PvP win | 15 | -- | -- |
| 6 | Gladiator | Combat (PvP) | 10 PvP wins | 10 PvP wins | 75 | 50 | Gladiator |
| 7 | Warlord | Combat (PvP) | 50 PvP wins | 50 PvP wins | 150 | 250 | Warlord |
| 8 | Apprentice Crafter | Crafting | 10 items crafted | 5 items crafted | 15 | -- | -- |
| 9 | Journeyman Crafter | Crafting | 50 items crafted | 25 items crafted | 50 | 50 | -- |
| 10 | Master Artisan | Crafting | Expert profession tier | Expert profession tier | 75 | 100 | Master Artisan |
| 11 | Making Friends | Social | 1 friend | 1 friend | 10 | -- | -- |
| 12 | Social Butterfly | Social | 10 friends | 10 friends | 30 | -- | Social Butterfly |
| 13 | Guild Founder | Social | Guild leader | Guild leader | 50 | 50 | -- |
| 14 | Explorer | Exploration | 5 towns visited | 3 towns visited | 25 | -- | -- |
| 15 | World Traveler | Exploration | 15 towns visited | 8 towns visited | 75 | 100 | World Traveler |
| 16 | First Sale | Economy | 1 market sale | 1 market sale | 10 | -- | -- |
| 17 | Merchant | Economy | 20 market sales | 20 market sales | 50 | 50 | -- |
| 18 | Merchant Prince | Economy | 10,000 gold earned | 10,000 gold earned | 100 | -- | Merchant Prince |
| 19 | Elected Official | Political | 1 election won | 1 election won | 75 | 100 | -- |
| 20 | Lawmaker | Political | 1 law enacted | 1 law enacted | 50 | -- | -- |
| 21 | Adventurer | Leveling | Level 10 | Level 10 | 30 | -- | Adventurer |
| 22 | Seasoned Hero | Leveling | Level 25 | Level 25 | 75 | 250 | Hero |
| 23 | Legend | Leveling | Level 50 | Level 50 | 150 | 1,000 | Legend |
| 24 | Gatherer | Gathering | 25 gathering actions | 10 gathering actions | 25 | -- | -- |
| 25 | Resource Baron | Gathering | 100 gathering actions | 40 gathering actions | 75 | 150 | Resource Baron |
| 26 | Specialized | Progression | Has specialization | Has specialization | 30 | -- | -- |
| 27 | Skill Master | Progression | 10 abilities unlocked | 10 abilities unlocked | 75 | -- | Skill Master |

**Categories with changed thresholds:** PvE combat (1/10/50/200 -> 1/5/20/75), Crafting (10/50 -> 5/25), Exploration (5/15 -> 3/8), Gathering (25/100 -> 10/40).

**Categories with unchanged thresholds:** PvP combat (1/10/50), Social (1/10 friends, guild leader), Economy (1/20 sales, 10000 gold), Political (1 election, 1 law), Leveling (10/25/50), Progression (specialization, 10 abilities).

---

## Expected Player Progression Timeline

Assumes average daily play: 1 major action/day, consistent login streak, completing available quests as they unlock.

### Week 1-2 (Days 1-14)

- **Expected level:** 5-6 (329-437 cumulative XP)
- **Daily XP income:** ~25 XP/day (T1 gathering/combat + login bonus, building streak)
- **Quests available:** Main quests 01-04 (The Awakening through The Road Ahead), 8 tier-1 town quests, 3 tier-1 recurring quests
- **Quest XP earned:** ~170 XP from main quests 01-03, ~130 XP from 3-4 town quests
- **Achievements unlocked:** First Blood (1 PvE win, 10 XP), Explorer (3 towns, 25 XP), possibly Making Friends (10 XP), Gatherer (10 gathering actions, 25 XP)
- **Activities:** Learning the ropes, gathering T1 resources, first combat encounters, visiting starting region towns

### Week 3-4 (Days 15-28)

- **Expected level:** 8-9 (699-854 cumulative XP)
- **Daily XP income:** ~35 XP/day (streak established, recurring quests cycling, T2 resources)
- **Quests available:** Main quest 05 (Shadows Stir), tier-2 recurring quests unlock at level 5, mid-level town quests, guild quests, first bounties
- **Quest XP earned:** ~60 XP from main quest 04, ~85 XP from main quest 05, ~140 XP from town quests, recurring quests cycling every 3 days
- **Achievements unlocked:** Monster Slayer (5 PvE wins, 30 XP), Apprentice Crafter (5 crafts, 15 XP)
- **Activities:** Exploring beyond starting region, joining a guild, first bounty attempts, T2 gathering

### Month 2 (Days 29-60)

- **Expected level:** 13-15 (1,637-2,129 cumulative XP)
- **Daily XP income:** ~42 XP/day (mid-tier work, full streak, regular quest completions)
- **Quests available:** Main quests 06-07 (Into the Depths, Rumors of Dragonfire), tier-3 recurring quests unlock at 15, bounties: Orc Raiders and Troll Menace cycling
- **Quest XP earned:** ~120 XP from main quest 06, ~200 XP from main quest 07, bounties cycling every 2 weeks (~200 XP/cycle), recurring quest income ~100-150 XP/week
- **Achievements unlocked:** Veteran Warrior (20 PvE wins, 75 XP), Adventurer (level 10, 30 XP), Journeyman Crafter (25 crafts, 50 XP), World Traveler (8 towns, 75 XP)
- **Activities:** Deep exploration (Ironvault, Frozen Reaches), dragon combat, political system engagement, guild quest chains, crafting specialization

### Month 3 (Days 61-90)

- **Expected level:** 18-21 (2,998-4,027 cumulative XP)
- **Daily XP income:** ~52 XP/day (high-tier work, quest chains, political XP, bounties)
- **Quests available:** Main quest 08 (The Final Stand) at 16, main quest 09 (The Sunken Throne) at 20, tier-3 weekly recurring quests, Dragon Slayer bounty cycling, Underdark Purge bounty unlocks at 18
- **Quest XP earned:** ~250 XP from main quest 08, ~350 XP from main quest 09, weekly recurring quests ~150-300 XP, bounties ~300-500 XP per cycle
- **Achievements unlocked:** Resource Baron (40 gathering, 75 XP), possibly Gladiator (10 PvP wins, 75 XP), political achievements if engaged
- **Activities:** Act II main story begins, Underdark and Pelagic Depths exploration, high-level bounties, guild leadership, political campaigns, T3-T4 resource gathering

### Months 4-6 (Days 91-180)

- **Expected level:** 25-32 (5,655-9,226 cumulative XP)
- **Major milestones:** Main quests 10-12 (Crown of Shadows through Dawn of Eternity), Champion's Trial recurring quest unlocks at 25, Elemental Surge and Void Incursion bounties
- **Achievements:** Seasoned Hero (level 25, 75 XP), Champion of the Realm (75 PvE wins, 150 XP)

### Months 7-15 (Days 181-457)

- **Expected level:** 32-50
- **Endgame focus:** Political dominance, guild wars, repeatable high-level bounties, achievement hunting (Warlord, Legend, Merchant Prince, Skill Master)
- **Level 50 (Legend achievement):** Estimated at day ~457 (~15 months)

---

## All Changed Files

| File | Description |
|------|-------------|
| `shared/src/data/progression/xp-curve.ts` | New XP formula (`floor(10 * level^1.15) + 30`), precomputed XP_TABLE for 50 levels, ACTION_XP constants (all per-action rewards), LEVEL_UP_REWARDS, DEATH_PENALTY, phased daily-income estimator |
| `shared/src/data/progression/index.ts` | Re-exports all progression constants from xp-curve.ts |
| `shared/src/data/quests/main-quests.ts` | 12 main quests rebalanced -- XP rewards 25-600, gold rewards 50-1500, level requirements 1-30 |
| `shared/src/data/quests/town-quests.ts` | 20 town quests across 8 regions rebalanced -- XP rewards 25-380, gold rewards 60-850, level requirements 1-22 |
| `shared/src/data/quests/daily-quests.ts` | 8 recurring quests (renamed from "daily") -- 72h or 168h cooldowns, 4 tiers (lvl 1/5/15/25), XP rewards 20-300 |
| `shared/src/data/quests/guild-quests.ts` | 3 guild quests rebalanced for 3-5 player groups over 1-2 weeks -- XP rewards 60-100, reputation 25-40 |
| `shared/src/data/quests/bounty-quests.ts` | 6 bounty quests with 2-4 week cooldowns (336h-672h), reduced kill counts, XP rewards 80-550 |
| `shared/src/data/achievements.ts` | 27 achievements -- thresholds reduced (PvE 1/5/20/75, crafting 5/25, exploration 3/8, gathering 10/40), XP rewards scaled to 10-150 range |
| `server/src/routes/combat-pve.ts` | PvE win XP: `monster.level * 25` -> `ACTION_XP.PVE_WIN_PER_MONSTER_LEVEL * monster.level` (5x). Added survive XP (5 flat). |
| `server/src/routes/combat-pvp.ts` | PvP win XP: `50 * opponent.level` -> `ACTION_XP.PVP_WIN_PER_OPPONENT_LEVEL * opponent.level` (8x). |
| `server/src/routes/work.ts` | Gathering XP: `10 + (tier-1)*5` -> `ACTION_XP.WORK_GATHER_BASE + (tier-1) * ACTION_XP.WORK_GATHER_PER_TIER` (T1=15 to T4=30). |
| `server/src/routes/crafting.ts` | Crafting XP: `recipe.xpReward` -> `Math.floor(recipe.xpReward * ACTION_XP.WORK_CRAFT_MULTIPLIER)` (80% of recipe value). |
| `server/src/lib/combat-engine.ts` | Death penalties sourced from `DEATH_PENALTY` constants (5% gold, 15*level XP, 5 durability). |

**Files verified unchanged (no modifications needed):**
- `server/src/services/quest-triggers.ts` -- trigger logic only, no XP values
- `server/src/services/progression.ts` -- reads from xp-curve.ts dynamically
- `server/src/services/achievements.ts` -- reads from achievements.ts dynamically
