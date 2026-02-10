# Realm of Crowns -- Prompt Execution Queue

## Status Key
- Not started
- In progress
- Complete
- Blocked

## Phase 1 -- Core Systems (Run in Order)
| # | Prompt | Teammates | Dependencies | Status |
|---|--------|-----------|-------------|--------|
| 00 | Project Scaffold | 3 | None (or use bootstrap) | Complete |
| 01 | Authentication & Players | 4 | 00 | Complete |
| 02 | World, Towns & Navigation | 4 | 01 | Complete |
| 03 | Economy & Trading (basic) | 4 | 02 | Complete |
| 04 | Combat System | 5 | 03 | Complete |
| 05 | Political System | 4 | 02 | Complete |
| 06 | Social & Guilds | 3 | 01 | Complete |
| 07 | Quests & Progression | 4 | 04 | Complete |
| 08 | Polish & Testing | 4 | All above | Complete |

## Phase 2A -- Economy Expansion
| # | Prompt | Teammates | Dependencies | Status |
|---|--------|-----------|-------------|--------|
| 09 | Profession Foundation | 4 | 03 | Complete |
| 10 | Gathering & Resources | 4 | 09 | Complete |
| 11 | Processing & Refining | 3 | 10 | Complete |
| 12 | Finished Goods Crafting | 5 | 11 | Complete |
| 13 | Player Housing & Buildings | 3 | 09 (parallel w/ 12) | Complete |
| 14 | Trade Routes & Caravans | 3 | 12 | Complete |

## Phase 2B -- Race Expansion (Can parallel with 2A)
| # | Prompt | Teammates | Dependencies | Status |
|---|--------|-----------|-------------|--------|
| 15 | Race Foundation (20 races) | 5 | 01 | Complete |
| 16 | World Map V2 (68 towns) | 4 | 15 | Complete |
| 17 | Racial Diplomacy | 3 | 16, 05 | Complete |
| 18 | Racial Abilities | 4 | 17, 04, 12 | Complete |

## Parallel Execution Map
```
Phase 1:  00 -> 01 -> 02 -> 03 -> 04 -> 05 -> 06 -> 07 -> 08   [ALL COMPLETE]
                              |
Phase 2A: .................. 09 -> 10 -> 11 -> 12 -> 14   [ALL COMPLETE]
                              |              ^
                              13 ------------+
Phase 2B: ............. 15 -> 16 -> 17                     [ALL COMPLETE]
                                    |
Merge:   .......................... 18 (needs 2A + 2B done) [COMPLETE]
```

## Totals
- 19 prompts
- ~70 agent teammates across all prompts
- 20 races, 28 professions, 68 towns, 120 racial abilities
