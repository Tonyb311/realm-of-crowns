# Audit: Monster System — Current State + D20 SRD Alignment

Read `cat CLAUDE.md` before starting.

---

## CONTEXT

Our monsters need proper D20 foundations — correct damage types, abilities, resistances, and tactical variety modeled after open-source D20 SRD monsters. We're NOT doing balance tuning (items and abilities aren't finalized yet). We're ensuring the monster system has a solid foundation that works correctly and can scale to level 50.

Before designing anything, we need a complete picture of what exists and what the engine supports.

## TASK — Investigation Only

### Step 1: Document the current monster data model

Read the Prisma schema for the Monster model:
```bash
cat database/prisma/schema.prisma | grep -A 50 "model Monster"
```

Document every field — what data can a monster store? Pay attention to:
- Stat block fields (HP, AC, STR, DEX, etc.)
- Damage string format
- Abilities/special attacks — is there a field for these?
- Damage types — is there a field? Or is all damage untyped?
- Resistances/vulnerabilities/immunities
- Challenge rating / difficulty tier
- Loot tables
- Biome assignment
- Any JSON/JSONB fields that could hold structured ability data

### Step 2: Document all 15+ current monsters

Read the monster seed file:
```bash
cat database/seeds/monsters.ts
```

For each monster, record:
- Name, level, biome
- Full stat block (HP, AC, attack, damage, STR/DEX/CON/INT/WIS/CHA)
- Any special abilities or damage types defined
- Loot table entries
- Gold drop range

Organize into a table sorted by level.

### Step 3: Audit the combat engine's monster capabilities

Check what the combat engine can actually DO with monster data. Read these files:

1. `server/src/lib/combat-engine.ts` — How are monsters represented as combatants? What fields does `createMonsterCombatant()` use? Does the engine support:
   - Monster abilities (like player class abilities)?
   - Damage types (fire, cold, poison, etc.)?
   - Damage resistances/vulnerabilities/immunities?
   - Multi-attack (multiple attacks per turn)?
   - Special attack effects (poison on hit, life drain, etc.)?
   - Saving throws for monster abilities?
   - Monster AI / action selection?

2. `server/src/services/tick-combat-resolver.ts` — How does the auto-combat AI handle monsters? Do monsters only basic attack, or can they use abilities?

3. `server/src/services/combat-simulator.ts` — `buildSyntheticMonster()` — what fields does it use? Does it support anything beyond basic attack?

4. `server/src/lib/road-encounter.ts` — How are monsters selected for encounters? Level range? Biome filtering?

5. `shared/src/types/combat.ts` — What monster-related types exist? Is there a `MonsterAbility` type?

### Step 4: Identify engine gaps

Based on Steps 2-3, list what the combat engine CANNOT currently do that D20 SRD monsters need:

Examples of things to check:
- Can monsters have abilities that trigger on specific conditions (e.g., Troll regeneration)?
- Can monsters apply status effects on hit (e.g., Giant Spider poison)?
- Can monsters have damage resistances (e.g., Skeleton slashing resistance)?
- Can monsters do multiple attacks per turn (e.g., Dragon bite + 2 claws)?
- Can monsters have different damage types (fire breath, poison bite)?
- Can monsters have saving throw DCs for special abilities?
- Can monsters have legendary actions or lair effects?

### Step 5: Research D20 SRD monsters for our level tiers

Our game goes to level 50. Map D20 SRD Challenge Ratings to our level system:

| Our Level Range | D20 CR Range | Tier Name | Example SRD Monsters |
|---|---|---|---|
| 1-5 | CR 1/8 - CR 2 | Low | Giant Rat, Goblin, Wolf, Skeleton, Zombie, Kobold, Orc |
| 6-10 | CR 3 - CR 5 | Mid-Low | Owlbear, Basilisk, Manticore, Winter Wolf, Wight |
| 11-15 | CR 6 - CR 10 | Mid | Young Dragon, Medusa, Stone Golem, Frost Giant |
| 16-20 | CR 11 - CR 15 | Mid-High | Beholder, Purple Worm, Adult Dragon, Rakshasa |
| 21-30 | CR 16 - CR 20 | High | Adult Dragon (stronger), Iron Golem, Lich, Balor |
| 31-40 | CR 21+ | Epic | Ancient Dragon, Tarrasque, Empyrean, Solar |
| 41-50 | Beyond CR | Mythic | Custom endgame threats — world bosses, planar entities |

For each tier, identify 5-8 iconic SRD monsters that would fit. Focus on:
- Tactical variety (not just "hits hard" — monsters with status effects, resistances, multi-attacks, AoE)
- Thematic fit for our biomes (forest, mountain, swamp, plains, underdark, etc.)
- Interesting combat mechanics that make fights feel different from each other

### Step 6: Gap analysis — what our monsters are missing vs SRD equivalents

Compare our current 15 monsters against what the SRD versions would have. Focus on MECHANICAL CORRECTNESS, not balance numbers. For example:

**Our Goblin vs SRD Goblin:**
- SRD: Nimble Escape (disengage/hide as bonus action), Scimitar (1d6+2 slashing), Shortbow (1d6+2 piercing)
- Ours: [whatever we have] — does it have the right damage TYPE? Does it have any abilities at all?

**Our Wolf vs SRD Wolf:**
- SRD: Pack Tactics (advantage when ally adjacent), Bite (2d4+2 piercing + DC 11 STR save or prone)
- Ours: [whatever we have] — can the engine even represent a knockdown-on-hit mechanic?

Do this for every monster we currently have. The question is not "are the numbers right" but "does the monster have the right CAPABILITIES modeled?"

## OUTPUT

Write everything to `D:\realm_of_crowns\docs\investigations\monster-system-audit.md`:

1. **Current Monster Data Model** — every field, what it supports
2. **Current Monster Roster** — table of all monsters with full stats
3. **Combat Engine Capabilities** — what the engine CAN and CANNOT do with monsters
4. **Engine Gaps** — features needed for SRD-quality monsters (prioritized)
5. **Level Tier → CR Mapping** — how D20 CR maps to our L1-50 system
6. **SRD Monster Candidates** — 5-8 per tier, with key abilities and why they'd be interesting
7. **Current Monster vs SRD Gap Analysis** — what each of our 15 monsters is missing
8. **Recommendations** — prioritized list of:
   - Engine changes needed for a solid D20 foundation (monster abilities, damage types, resistances, multi-attack)
   - Data model changes needed (new fields on Monster model)
   - Which SRD monster features our engine already supports vs which need new work
   - New monsters to add per tier for variety
   - What can be done WITHOUT engine changes (data/seed only)
   - What REQUIRES engine changes (new features)
   - NOTE: Do NOT recommend specific stat number changes for balance — that comes later after items and abilities are finalized

Then print a brief summary to chat.

---

## DO NOT

- Do not modify any code — investigation only
- Do not modify any monster data
- Do not run any simulations
- Do not make balance changes
- Keep the audit focused on what EXISTS and what's NEEDED — design decisions come after review
