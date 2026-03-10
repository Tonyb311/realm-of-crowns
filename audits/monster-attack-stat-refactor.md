# Monster Attack Stat Refactor — Full Recalculation Table

**Date:** 2026-03-10
**Status:** Complete — all 155 monsters verified

## Summary

Added `attackStat` field to all monsters. Recalculated `stats.attack` and damage bonuses to be base values (excluding stat modifier). Removed the `entityType === 'monster' → statMod = 0` hack from combat-engine.ts. The engine now applies stat modifiers to monsters the same way it does to players.

**Net combat effect:** ZERO. Every monster produces identical attack rolls and damage as before.

## Distribution

| Stat | Count | % |
|------|-------|---|
| str | 100 | 64.5% |
| dex | 34 | 21.9% |
| int | 11 | 7.1% |
| cha | 10 | 6.5% |
| wis | 0 | 0% |

## Full Table

Format: `#|Name|Level|Category|attackStat|StatVal|Mod|OldAtk|NewAtk|OldDmg|NewDmg|Verified`

```
1|Cinder Wisp|1|elemental|dex|14|+2|3|1|1d4+1|1d4-1|Y
2|Dust Sprite|1|elemental|dex|14|+2|3|1|1d4+1|1d4-1|Y
3|Dustjaw Hyena|1|beast|dex|13|+1|3|2|1d4+1|1d4|Y
4|Frost Sprite|1|elemental|dex|14|+2|3|1|1d4+1|1d4-1|Y
5|Giant Rat|1|beast|dex|14|+2|3|1|1d4+1|1d4-1|Y
6|Goblin|1|humanoid|dex|14|+2|3|1|1d4+1|1d4-1|Y
7|Marsh Rat|1|beast|dex|14|+2|2|0|1d4+1|1d4-1|Y
8|River Pike|1|beast|dex|12|+1|3|2|1d4+1|1d4|Y
9|Sand Beetle|1|beast|dex|12|+1|3|2|1d4+1|1d4|Y
10|Sea Spray|1|elemental|dex|14|+2|3|1|1d4+1|1d4-1|Y
11|Timber Wolf Pup|1|beast|dex|14|+2|3|1|1d4+1|1d4-1|Y
12|Wild Boar|1|beast|str|12|+1|3|2|1d4+1|1d4|Y
13|Bone Rattler|2|undead|str|10|+0|3|3|1d6+1|1d6+1|Y
14|Giant Ant|2|beast|str|12|+1|3|2|1d6+1|1d6|Y
15|Goblin Archer|2|humanoid|dex|14|+2|4|2|1d6|1d6-2|Y
16|Pixie Trickster|2|fey|cha|16|+3|4|1|1d6|1d6-3|Y
17|Scorpion Swarm|2|beast|dex|12|+1|3|2|1d6|1d6-1|Y
18|Slime|2|ooze|str|12|+1|2|1|1d6|1d6-1|Y
19|Snapping Turtle|2|beast|str|14|+2|3|1|1d6|1d6-2|Y
20|Thornvine Creeper|2|plant|str|14|+2|3|1|1d6|1d6-2|Y
21|Wolf|2|beast|dex|14|+2|4|2|1d6+1|1d6-1|Y
22|Bandit|3|humanoid|str|12|+1|4|3|1d6+2|1d6+1|Y
23|Ember Beetle|3|beast|dex|14|+2|3|1|1d4+1|1d4-1|Y
24|Frost Mote|3|elemental|dex|16|+3|4|1|1d6|1d6-3|Y
25|Giant Crayfish|3|beast|str|14|+2|4|2|1d6+1|1d6-1|Y
26|Goblin Shaman|3|humanoid|int|12|+1|3|2|1d6+1|1d6|Y
27|Mana Wisp|3|elemental|dex|16|+3|3|0|1d6+1|1d6-2|Y
28|Prairie Stalker|3|beast|str|14|+2|4|2|1d6+1|1d6-1|Y
29|Sand Lurker|3|beast|dex|14|+2|4|2|1d6+1|1d6-1|Y
30|Shambling Corpse|3|undead|str|14|+2|2|0|1d6+1|1d6-1|Y
31|Spider Hatchling|3|beast|dex|14|+2|4|2|1d6+1|1d6-1|Y
32|Tide Crab|3|beast|str|13|+1|3|2|1d4+2|1d4+1|Y
33|Worg|3|beast|str|14|+2|4|2|1d6+2|1d6|Y
34|Alpha Wolf|4|beast|dex|14|+2|5|3|1d6+2|1d6|Y
35|Bandit Marksman|4|humanoid|dex|14|+2|5|3|1d6+2|1d6|Y
36|Bloodwing Stirge|4|monstrosity|dex|16|+3|5|2|1d4+2|1d4-1|Y
37|Bog Wraith|4|undead|dex|14|+2|4|2|1d6+2|1d6|Y
38|Bone Archer|4|undead|dex|14|+2|5|3|1d6+2|1d6|Y
39|Glimmerfae|4|fey|cha|16|+3|4|1|1d4+2|1d4-1|Y
40|Sand Viper|4|beast|dex|16|+3|5|2|1d6+2|1d6-1|Y
41|Satyr Prankster|4|fey|cha|16|+3|5|2|1d6+1|1d6-2|Y
42|Brambleback Toad|5|beast|str|16|+3|4|1|1d6+1|1d6-2|Y
43|Ghoul Pack Leader|5|undead|str|14|+2|5|3|1d6+2|1d6|Y
44|Ghoul Stalker|5|undead|str|14|+2|5|3|1d6+1|1d6-1|Y
45|Hollow Sentinel|5|construct|str|16|+3|5|2|1d6+1|1d6-2|Y
46|River Serpent|5|beast|str|16|+3|5|2|1d6+2|1d6-1|Y
47|Skeleton Warrior|5|undead|str|14|+2|5|3|1d6+2|1d6|Y
48|Bandit Captain|6|humanoid|str|14|+2|6|4|1d6+2|1d6|Y
49|Dune Scorpion|6|beast|str|16|+3|6|3|1d6+2|1d6-1|Y
50|Orc Warrior|6|humanoid|str|16|+3|6|3|1d6+2|1d6-1|Y
51|Tidal Elemental|6|elemental|str|16|+3|6|3|1d6+1|1d6-2|Y
52|Arcane Elemental|7|elemental|int|18|+4|6|2|1d8+2|1d8-2|Y
53|Giant Spider|7|beast|dex|16|+3|6|3|1d8+2|1d8-1|Y
54|Harrowsong Harpy|7|monstrosity|cha|16|+3|6|3|1d6+2|1d6-1|Y
55|Hooktusk|7|monstrosity|str|18|+4|7|3|1d8+2|1d8-2|Y
56|Stoneclaw Gargoyle|7|construct|str|16|+3|6|3|1d8+2|1d8-1|Y
57|Dire Wolf|8|beast|dex|14|+2|7|5|1d8+2|1d8|Y
58|Frostfang Wolf|8|beast|dex|14|+2|7|5|1d8+2|1d8|Y
59|Ironhide Ogre|8|humanoid|str|20|+5|7|2|1d8+3|1d8-2|Y
60|Lavamaw Salamander|8|elemental|str|18|+4|7|3|1d8+2|1d8-2|Y
61|Broodmother Spider|9|beast|str|16|+3|7|4|1d8+2|1d8-1|Y
62|Rust Lurker|9|monstrosity|str|14|+2|6|4|1d8+1|1d8-1|Y
63|Shadow Wraith|9|undead|dex|16|+3|7|4|1d8+2|1d8-1|Y
64|Troll|9|humanoid|str|18|+4|7|3|1d8+3|1d8-1|Y
65|Sandscale Basilisk|10|monstrosity|str|16|+3|8|5|1d8+2|1d8-1|Y
66|Crypt Warden|11|undead|str|14|+2|8|6|1d8+2|1d8|Y
67|Razormane Manticore|11|monstrosity|str|17|+3|9|6|1d8+3|1d8|Y
68|Thornwarden|11|plant|str|16|+3|8|5|1d8+2|1d8-1|Y
69|Ancient Golem|12|construct|str|22|+6|8|2|1d10+3|1d10-3|Y
70|Cyclops Brute|12|humanoid|str|20|+5|9|4|1d8+3|1d8-2|Y
71|Dune Revenant|12|undead|str|16|+3|8|5|1d8+2|1d8-1|Y
72|Magma Crawler|13|elemental|str|18|+4|8|4|1d8+3|1d8-1|Y
73|Tidecaller Siren|13|fey|cha|18|+4|8|4|1d8+2|1d8-2|Y
74|Void Stalker|13|aberration|int|16|+3|9|6|1d8+3|1d8|Y
75|Cairn Specter|14|undead|dex|16|+3|9|6|1d8+3|1d8|Y
76|Steppe Lion|14|beast|str|18|+4|9|5|1d8+3|1d8-1|Y
77|Young Dragon|14|dragon|str|20|+5|10|5|1d10+4|1d10-1|Y
78|Hydra|15|monstrosity|str|20|+5|8|3|1d8+3|1d8-2|Y
79|Mire Hulk|15|plant|str|20|+5|9|4|1d8+3|1d8-2|Y
80|Demon|16|fiend|str|18|+4|10|6|1d8+4|1d8|Y
81|Elder Fey Guardian|16|fey|cha|18|+4|10|6|1d10+3|1d10-1|Y
82|Gorgon Bull|16|monstrosity|str|20|+5|10|5|1d10+3|1d10-2|Y
83|Remorhaz Burrower|16|monstrosity|str|22|+6|10|4|1d8+3|1d8-3|Y
84|Prairie Centaur|17|humanoid|str|18|+4|10|6|1d8+3|1d8-1|Y
85|Wyvern|17|dragon|str|19|+4|9|5|1d8+3|1d8-1|Y
86|Feywild Enchantress|18|fey|cha|22|+6|10|4|1d8+3|1d8-3|Y
87|Lich|18|undead|int|22|+6|9|3|1d10+3|1d10-3|Y
88|Treant|18|plant|str|22|+6|10|4|1d10+3|1d10-3|Y
89|Chimera|19|monstrosity|str|19|+4|10|6|1d8+3|1d8-1|Y
90|Chuul Predator|19|aberration|str|20|+5|10|5|1d8+3|1d8-2|Y
91|Thornfang Wyvern|19|monstrosity|str|19|+4|10|6|1d8+3|1d8-1|Y
92|Mind Flayer|20|aberration|int|22|+6|10|4|1d8+3|1d8-3|Y
93|Sandstorm Djinn|20|elemental|str|20|+5|12|7|1d10+3|1d10-2|Y
94|Bone Fiend|21|fiend|str|16|+3|12|9|1d10+3|1d10|Y
95|Hill Ettin|21|humanoid|str|22|+6|12|6|1d10+3|1d10-3|Y
96|Vampire Lord|21|undead|dex|18|+4|11|7|1d8+3|1d8-1|Y
97|Fey Dragon|22|dragon|str|16|+3|11|8|1d8+3|1d8|Y
98|Frost Giant|22|humanoid|str|23|+6|11|5|2d8+4|2d8-2|Y
99|Sea Serpent|22|beast|str|22|+6|11|5|1d10+3|1d10-3|Y
100|Coastal Behemoth|23|beast|str|24|+7|12|5|2d8+3|2d8-4|Y
101|Iron Golem|23|construct|str|24|+7|12|5|2d8+4|2d8-3|Y
102|Fire Giant|24|humanoid|str|25|+7|12|5|2d8+4|2d8-3|Y
103|Obsidian Golem|24|construct|str|24|+7|13|6|2d8+4|2d8-3|Y
104|Ashlands Wyrm|25|dragon|str|22|+6|13|7|2d8+3|2d8-3|Y
105|Feywood Archon|25|fey|cha|22|+6|13|7|2d8+4|2d8-2|Y
106|Purple Worm|25|monstrosity|str|28|+9|13|4|2d8+4|2d8-5|Y
107|Beholder|26|aberration|int|20|+5|12|7|1d10+3|1d10-2|Y
108|Wasteland Behir|26|monstrosity|str|24|+7|13|6|2d8+3|2d8-4|Y
109|Frost Revenant|27|undead|str|20|+5|13|8|2d8+3|2d8-2|Y
110|Reef Terror|27|aberration|str|22|+6|13|7|2d8+3|2d8-3|Y
111|Death Knight|28|undead|str|22|+6|14|8|2d8+4|2d8-2|Y
112|Infernal Ravager|28|fiend|str|22|+6|14|8|2d8+3|2d8-3|Y
113|Dread Colossus|29|construct|str|28|+9|14|5|2d10+4|2d10-5|Y
114|Moonveil Stalker|29|fey|cha|20|+5|13|8|2d8+3|2d8-2|Y
115|Storm Giant|30|humanoid|str|29|+9|15|6|2d10+5|2d10-4|Y
116|Ironbark Treant|31|plant|str|24|+7|14|7|2d8+4|2d8-3|Y
117|Sand Wyrm|31|monstrosity|str|26|+8|14|6|2d10+4|2d10-4|Y
118|Dune Colossus|32|construct|str|26|+8|14|6|2d8+4|2d8-4|Y
119|Kraken Spawn|32|monstrosity|str|24|+7|14|7|2d8+4|2d8-3|Y
120|Steppe Behemoth|32|beast|str|26|+8|14|6|2d8+4|2d8-4|Y
121|Nightwalker|33|undead|str|22|+6|15|9|2d10+4|2d10-2|Y
122|War Mammoth|33|beast|str|28|+9|15|6|2d10+4|2d10-5|Y
123|River Leviathan|34|beast|str|26|+8|15|7|2d10+4|2d10-4|Y
124|Thornbloom Horror|34|plant|str|20|+5|15|10|2d8+4|2d8-1|Y
125|Volcanic Drake|34|dragon|str|22|+6|15|9|2d8+4|2d8-2|Y
126|Basilisk King|35|monstrosity|str|24|+7|15|8|2d8+5|2d8-2|Y
127|Dust Devil|35|elemental|dex|20|+5|14|9|2d8+4|2d8-1|Y
128|Spectral Knight|35|undead|dex|14|+2|15|13|2d8+4|2d8+2|Y
129|Coastal Wyrm|36|dragon|str|22|+6|16|10|2d10+4|2d10-2|Y
130|Infernal Bladedancer|36|fiend|dex|20|+5|16|11|2d8+4|2d8-1|Y
131|Aboleth|37|aberration|int|22|+6|16|10|2d10+5|2d10-1|Y
132|Feywild Warden|37|fey|cha|18|+4|16|12|2d8+4|2d8|Y
133|Frost Wyrm|37|dragon|str|24|+7|16|9|2d10+4|2d10-3|Y
134|Djinn Lord|38|elemental|str|22|+6|17|11|2d8+5|2d8-1|Y
135|Hill Giant Warlord|38|humanoid|str|26|+8|17|9|2d8+5|2d8-3|Y
136|Dracolich|39|undead|int|18|+4|17|13|2d8+5|2d8+1|Y
137|Roc|39|beast|str|28|+9|17|8|2d10+5|2d10-4|Y
138|Archlich|40|undead|int|24|+7|18|11|2d8+5|2d8-2|Y
139|Ancient Forest Guardian|41|plant|str|28|+9|19|10|2d10+5|2d10-4|Y
140|Ember Titan|41|elemental|str|26|+8|19|11|2d8+5|2d8-3|Y
141|Phoenix|42|elemental|str|22|+6|19|13|2d10+5|2d10-1|Y
142|Pit Fiend|43|fiend|str|28|+9|19|10|2d10+5|2d10-4|Y
143|Swamp Hydra|43|monstrosity|str|24|+7|19|12|2d8+5|2d8-2|Y
144|Deep Kraken|44|monstrosity|str|30|+10|20|10|2d10+5|2d10-5|Y
145|Mind Reaver|44|aberration|int|24|+7|19|12|2d8+5|2d8-2|Y
146|Tundra Sentinel|44|construct|str|22|+6|19|13|2d8+5|2d8-1|Y
147|Blight Dragon|45|dragon|str|26|+8|20|12|2d8+6|2d8-2|Y
148|Plains Thunderherd|45|beast|str|28|+9|20|11|2d10+5|2d10-4|Y
149|Elder Wyrm|46|dragon|str|30|+10|21|11|2d8+6|2d8-4|Y
150|Granite Warden|46|construct|str|26|+8|20|12|2d10+5|2d10-3|Y
151|Arcane Titan|47|construct|str|28|+9|21|12|2d8+6|2d8-3|Y
152|Abyssal Ravager|48|fiend|str|24|+7|21|14|2d8+6|2d8-1|Y
153|Siege Wurm|48|monstrosity|str|28|+9|21|12|2d8+6|2d8-3|Y
154|Tarrasque|49|monstrosity|str|30|+10|22|12|3d10+7|3d10-3|Y
155|Void Emperor|50|aberration|int|28|+9|22|13|3d10+7|3d10-2|Y
```

## Files Changed

1. `database/schema/tables.ts` — Added `attackStat: text('attack_stat')` column
2. `database/schema/tables.js` — Added same column to JS schema
3. `database/seeds/monsters.ts` — Added `attackStat` to MonsterDef + all 155 monsters + recalculated values
4. `server/src/lib/combat-engine.ts` — Removed `entityType === 'monster' ? 0 :` hack (lines 255, 582)
5. `server/src/lib/road-encounter.ts` — Updated `buildMonsterWeapon()` + call sites
6. `server/src/services/tick-combat-resolver.ts` — Updated `buildMonsterWeapon()` + call site
7. `server/src/routes/combat-pve.ts` — Updated `buildMonsterWeapon()` (dead code)
8. `server/src/services/combat-simulator.ts` — Added `attackStat` to MonsterStats + buildSyntheticMonster
9. `server/src/scripts/batch-combat-sim.ts` — Pass `m.attackStat` into monsterMap
10. `server/src/scripts/group-combat-diagnostic.ts` — Pass `m.attackStat` into monsterMap
11. `server/src/routes/admin/combat.ts` — Pass `m.attackStat` into monsterLookup
12. `server/src/scripts/verify-road-encounters.ts` — Updated local buildMonsterWeapon copy
13. `database/drizzle-migrations/0006_add_monster_attack_stat.sql` — Migration
