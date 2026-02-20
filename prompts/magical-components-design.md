# Magical Crafting Components & Monster Sources — ENCHANTER/SCRIBE Materials

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

Design magical crafting components for ENCHANTER and SCRIBE professions that are sourced from monster encounters. These components connect the combat/encounter system directly into the magical crafting economy. Also design the new monsters that drop these components.

### Source Files

- `docs/profession-economy-master.yaml` — Current recipes for ENCHANTER and SCRIBE, existing materials
- `docs/encounter-loot-design-phase1.md` — Phase 1 monster roster and loot table structure (10 monsters already designed)
- `docs/profession-economy-audit-v4.md` — Economy state, ENCHANTER/SCRIBE viability data

### Context

The game is a D&D-inspired fantasy MMORPG. The world has 20 playable races and a Renaissance-meets-fantasy setting. Magic exists but isn't ubiquitous — enchanted items are special, scrolls are valuable. The encounter system already has 10 Phase 1 monsters (wolves, goblins, bandits, etc.) dropping mundane materials. This task adds magical/fantastical monsters that drop components specifically for magical crafting.

### Core Design Principles (Locked)

1. **Component matches effect.** The name and source of every magical component should intuitively connect to what it does. Troll Blood → regeneration. Shadow Essence → stealth/darkness. A player should be able to guess the enchantment from the ingredient.

2. **Monster drops, not gathering.** These components come ONLY from killing specific monsters. No gathering profession collects them. This makes ENCHANTER/SCRIBE dependent on combat-active players for supply — creating a trade relationship between fighters and crafters.

3. **Rarity tiers through monster difficulty.** Common enchantments use drops from common monsters. Powerful enchantments use drops from rare/dangerous monsters. The encounter difficulty IS the rarity control — no need for artificial drop rate manipulation on top of that.

4. **Percentage-chance drops, same as Phase 1.** Not guaranteed. When loot drops, randomly assigned to a party member. Consistent with existing loot system.

5. **Smaller quantities than a dedicated "magical gatherer" would produce** — but since there IS no magical gathering profession, encounters are the PRIMARY source. Drop rates can be higher than Phase 1 mundane drops since there's no gatherer to undercut.

6. **Components are tradeable.** Players who fight monsters can sell components to ENCHANTER/SCRIBE players on the market. This creates a natural economic link between combat and crafting.

### Deliverable

Write the full design to: `docs/magical-components-design.md`

### Required Sections

#### 1. Magical Component Catalog

Design the full set of magical crafting components. For each:

- **Component name** — evocative, immediately suggests its magical property
- **Description** — 1-2 sentences, what it looks like and what it does
- **Magical property/school** — what type of enchantment/scroll it enables (fire, ice, healing, protection, stealth, strength, etc.)
- **Source monster** — which monster drops it
- **Drop chance** — percentage per kill
- **Quantity per drop** — how many you get when it does drop
- **Base value** — NPC vendor floor price (follow the 1.3x margin rules from the base_value completion pass)
- **Used by** — ENCHANTER, SCRIBE, or both
- **Used in which recipes** — map to existing YAML recipes where possible, flag new recipes needed

Aim for **15-25 components** spanning a range of magical schools/effects. Don't go overboard — each component should have a clear purpose and at least one recipe that uses it.

Group components by magical school/theme:
- **Elemental** (fire, ice, lightning, earth)
- **Life** (healing, regeneration, vitality)
- **Protection** (shielding, resistance, warding)
- **Enhancement** (strength, speed, perception)
- **Shadow/Arcane** (stealth, illusion, raw magic)
- **Nature** (growth, animal, plant)

#### 2. New Monster Roster

Design new monsters that drop these magical components. For each:

- **Name** and description
- **Monster type** (beast, undead, elemental, fey, demon, construct, etc.)
- **Threat level** — Low / Medium / High / Elite
  - Low: solo player can handle, common encounters
  - Medium: small party (2-3) recommended
  - High: full party (4-5) required
  - Elite: organized group needed, rare spawn
- **Where encountered** — terrain, region, conditions (some monsters only at night? only in forests? only near water?)
- **Encounter frequency** — Common / Uncommon / Rare
- **Solo vs pack** — appears alone or in groups?
- **Full loot table** — ALL drops, not just magical components. Include mundane drops too (gold for humanoids, pelts for beasts, etc.) following Phase 1 conventions.

Aim for **8-15 new monsters**. These should be more fantastical than Phase 1's mostly-mundane roster. Think:
- Trolls, ogres, elementals, wraiths, basilisks, wyverns, treants, will-o-wisps, dark fey, etc.
- Scale from "slightly tougher than Phase 1 wolves" to "serious threat requiring coordination"
- Avoid anything world-ending (no dragons, no liches, no demon lords — those are endgame content)

#### 3. Component-to-Recipe Mapping

For each existing ENCHANTER and SCRIBE recipe in the YAML:
- What magical component(s) should it require?
- How many per craft?
- Does this change the recipe's input cost? By how much?
- Does the recipe need a base_value adjustment to maintain the 1.3x margin rule?

For components that don't map to existing recipes:
- Propose new recipes that use them
- Define: inputs, output, crafting time, profession tier required, output base_value
- Keep new recipes consistent with existing recipe structure in the YAML

#### 4. Economy Impact

- What does this do to ENCHANTER/SCRIBE input costs?
- If components are rare (low drop rates), they'll be expensive on the market. Does this make enchanted items too costly?
- If components are common (high drop rates), they'll be cheap. Does this make enchanted items too accessible?
- Find the sweet spot: components should be a meaningful cost but not the dominant cost of crafting
- **Target: magical components should represent 20-40% of total recipe input cost.** The rest is mundane materials (ink, parchment, gems, etc.)
- Model the price at different supply levels (few hunters selling components vs many)

#### 5. Combat-Crafter Economy Loop

Map out the economic relationship this creates:

```
Fighters kill monsters → Components drop → Sold on market → ENCHANTER/SCRIBE buy → 
Craft enchanted items → Sold to fighters → Fighters use items to kill harder monsters → 
Better components drop → ...
```

Does this loop work? Is it self-sustaining? Are there bottlenecks? What breaks if one side of the loop has too few players?

Consider:
- If no one fights magical monsters, ENCHANTER/SCRIBE have no materials. Is there enough combat incentive beyond component drops? (XP, gold, other loot)
- If no ENCHANTER/SCRIBE exist in a town, do monster components just pile up unsold? (They still have base_value for NPC vendoring, so they're never worthless)
- What's the minimum viable player count for this loop to function?

#### 6. Integration with Phase 1 Loot System

- How do these new monsters integrate with the existing encounter system?
- Do any Phase 1 monsters also drop magical components? (e.g., Giant Spider already drops Spider Venom — is that a magical component too, or just mundane?)
- Updated combined monster roster (Phase 1 + new magical monsters) — one reference table
- Any changes needed to Phase 1 loot tables based on this expansion?

#### 7. YAML Update Plan

List every change needed to `docs/profession-economy-master.yaml`:
- New materials to add (all components)
- Existing recipes to modify (add component inputs)
- New recipes to create
- Base_value adjustments needed

**Do NOT modify the YAML in this prompt.** Just list the changes. We'll do a separate implementation pass.

### Guidelines

- **Minimize tool calls.** Read the YAML and existing docs, then write the output.
- **Keep chat response under 30 lines.** All detail goes in the output file.
- **Every component must have a recipe that uses it.** No orphan materials. If you design a component, it must have a crafting destination.
- **Every monster must drop at least one unique component.** No monsters that exist purely for mundane loot (Phase 1 already covers that).
- **Theme consistency matters.** This is Renaissance-fantasy, not sci-fi or anime. Magical components should feel like D&D reagents — visceral, natural, slightly dark. Troll Blood, not "Quantum Essence."
- **Check what ENCHANTER/SCRIBE currently need in the YAML.** Don't design components in a vacuum — anchor them to existing recipes first, then expand.
