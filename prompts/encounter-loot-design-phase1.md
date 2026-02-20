# Encounter Loot Table Design — Phase 1 (Narrow Scope)

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed.
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable.

## Team Creation Rules

- Each teammate gets a **name**, a **role title**, and a **brief specialty description**.
- Teammates should have complementary — not overlapping — skills.
- Only create teammates that are actually needed.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- Keep analysis brief in chat. Write all detailed output to files.
- One major task per chat to avoid context overflow.

---

## YOUR TASK

Design a Phase 1 encounter loot table for the game's traveling encounter system. This is a **narrow-scope** design — only the monster types and drops that make thematic sense and help the economy. Full loot tables with rare/legendary items come later.

### Context

Read these files for full context:
- `docs/profession-economy-master.yaml` — All crafting recipes and materials
- `docs/profession-economy-analysis-v3.md` — Current economy state (ARMORER and TAILOR are underwater)
- `docs/tax-system-design.md` — Tax system (for understanding profession viability)

### Core Design Decisions (Locked)

1. **Encounter drops give SMALLER quantities than dedicated gatherers.** A HUNTER skinning animals all day should out-produce a random traveler who fought off a wolf. Encounters supplement the gathering economy, they don't replace it.
2. **Drops are percentage-chance, not guaranteed.** Killing a wolf doesn't always drop a pelt. This adds excitement and keeps supply unpredictable enough to not crash gatherer markets.
3. **When loot drops, it's randomly distributed among party members.** No need/greed system, no looting UI. The system picks a random party member and gives them the item. Solo players get everything.
4. **No gold drops from animals.** Wolves, bears, spiders — no gold. Humanoid enemies (goblins, bandits, etc.) CAN drop small amounts of gold because it makes sense they'd carry coins.
5. **Thematic drops only.** Every drop must make in-world sense. A wolf drops a pelt, not a gemstone. A goblin drops crude weapons or stolen goods, not silk.
6. **This is Phase 1.** No rare/legendary quality items yet. No enchanted drops. No boss loot. Just basic crafting materials and small gold amounts. The system should be designed so quality tiers and rare drops can be added later without restructuring.

### Deliverable

Write the full design to: `docs/encounter-loot-design-phase1.md`

### Required Sections

#### 1. Monster Roster (Phase 1)

Define the Phase 1 monster types that appear in traveling encounters. For each monster:
- **Name** and brief description
- **Threat level** (how dangerous — affects who encounters them and party size needed)
- **Where encountered** (road types, regions, terrain)
- **Encounter frequency** (common, uncommon, rare)
- **Solo vs pack** (does this monster appear alone or in groups?)

Start with a manageable roster. Recommend 8-12 monster types spanning:
- **Wildlife** (wolves, bears, boars, giant spiders, etc.) — no gold, animal materials
- **Humanoids** (goblins, bandits, highway robbers, etc.) — small gold + stolen/crafted goods
- **Fantastical** (1-2 fantasy creatures appropriate for early game — nothing epic yet)

#### 2. Loot Tables

For each monster type, define:
- **Drop slots** — what items CAN drop (list of possible items)
- **Drop chance per slot** — percentage chance each item drops on kill (0-100%)
- **Quantity range** — min/max quantity when the item does drop
- **Existing material mapping** — map each drop to an EXISTING material in `profession-economy-master.yaml` where possible. If a new material is needed, flag it clearly.

Format as a clear table per monster. Example structure:
```
### Wolf
| Drop | Chance | Qty | Maps To (YAML) | Used By |
|------|-------:|----:|-----------------|---------|
| Wolf Pelt | 40% | 1 | Leather (raw) | TANNER |
| Wolf Fang | 15% | 1-2 | NEW — crafting component | JEWELER? |
```

#### 3. Economy Impact Analysis

This is critical. For each crafting profession that receives materials from encounter drops:
- How much additional weekly supply does this create? (Estimate based on average encounter frequency × drop rates × active player count assumptions)
- Does this meaningfully improve the margin for underwater professions (ARMORER, TAILOR)?
- Does this threaten to undercut gathering professions (HUNTER, MINER, LUMBERJACK, etc.)?
- What's the sweet spot for drop rates — enough to help crafters, not enough to kill gatherer income?

Use concrete numbers. "This helps TANNER" is not enough. "At 10 encounters/week average, a player generates ~2.8 Leather from wolf encounters, vs HUNTER producing 35/week. Supplement rate: 8%. TANNER input cost drops by ~X gold" is what we need.

#### 4. Supply Channel Comparison

Create a comparison showing dedicated gathering vs encounter drops:

| Material | Gatherer Weekly Output | Encounter Weekly Supply (est.) | Supplement % | Risk to Gatherer? |
|----------|----------------------:|------------------------------:|--------------:|:-----------------:|

The supplement percentage should stay in the **5-15% range** for most materials. If any material exceeds 20% supplement from encounters, the drop rate is too high and will undercut the gatherer profession.

#### 5. Humanoid Gold Drops

For gold-dropping humanoids (goblins, bandits, etc.):
- How much gold per kill? (Keep it small — pocket change, not a goldmine)
- Is this a meaningful income source or just flavor?
- Does this create an XP-farming-for-gold exploit? (Players grinding easy humanoids for gold instead of working a profession)

Gold from encounters should feel like "found a few coins" not "this is a viable career."

#### 6. Party Distribution Mechanics

Detail the random loot distribution:
- Item drops → randomly assigned to one party member
- Gold drops → split evenly among party members (round down, remainder to random member)
- What happens if a player's inventory is full? (Item goes to next random member? Lost? Held in overflow?)
- Solo players get all drops (trivial case)

#### 7. Future-Proofing Notes

Describe how this Phase 1 system supports future expansion WITHOUT restructuring:
- Quality tiers (Common → Uncommon → Rare → Legendary) — how would drop tables incorporate quality?
- Boss monsters with guaranteed + bonus loot
- Region-specific loot tables
- Level-scaling drop rates
- Rare crafting materials only available from specific monsters

Don't design these systems. Just note WHERE in the Phase 1 structure they'd plug in.

### Guidelines

- **Minimize tool calls.** Read the YAML and v3 analysis, then write the output.
- **Keep chat response under 30 lines.** All tables and analysis go in the output file.
- **Map to existing materials first.** Only introduce NEW materials if nothing in the YAML fits. Every new material means a new entry in the economy — don't do it casually.
- **Check the YAML for what ARMORER and TAILOR actually need as inputs.** The whole point of this system is to help their margins. If the loot tables don't include materials they use, the design missed the point.
- **Drop rates should feel intuitive.** A wolf should drop a pelt maybe 30-50% of the time, not 5%. But a wolf dropping an intact, high-quality pelt usable for fine leather? That's the rare drop for Phase 2.
