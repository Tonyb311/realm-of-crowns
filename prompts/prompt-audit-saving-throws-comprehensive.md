# Prompt: Comprehensive Saving Throw Audit — All Abilities, Both Sides

```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/sim-analyst.md
cat docs/audit-combat-stat-mechanics.md
cat docs/group-combat-deep-analysis.md
```

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed (frontend, backend, game design, narrative, art direction, etc.).
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable. Ensure game mechanics, narrative, UI, and code all align.

## Team Creation Rules

- Each teammate gets a **name**, a **role title**, and a **brief specialty description**.
- Teammates should have complementary — not overlapping — skills.
- Only create teammates that are actually needed. Don't pad the team.

## Context Awareness

- This is a browser-based RPG. All solutions should target web technologies.
- Player experience is paramount.

## Key Principles

- Bias toward action.
- Truth-seeking: challenge flawed premises, flag scope creep, highlight trade-offs.

---

## Task: Comprehensive Saving Throw Audit — All Abilities, Both Sides, Code + Logs

Two-part audit: (1) trace every ability in the code that SHOULD involve a saving throw, and (2) verify saves are actually happening in the 450 group combat logs.

### Part 1: Code Audit — Which Abilities Should Have Saves?

Scan every ability definition across both player and monster data:

**Player abilities (all 7 classes, tier 0 + spec):**

For every ability in `shared/src/data/skills/*.ts`:
- Does it have `saveType` in its effects? If yes, what save?
- Does it have `attackType: 'save'`? If yes, it auto-hits and the target saves for reduced effect.
- Does it have `attackType: 'spell'` or `'weapon'`? These use attack rolls, not saves (unless they ALSO have a save for a secondary effect like "hit + save vs poison").

Produce a table:

| Class | Ability | attackType | Has saveType? | Save Stat | What Happens on Save? |
|-------|---------|------------|---------------|-----------|----------------------|
| Warrior | Intimidating Shout | save | yes (wis) | WIS | Resist debuff entirely |
| Mage | Fireball | save | yes (dex) | DEX | Half damage |
| ... | ... | ... | ... | ... | ... |

Flag any ability that:
- Has `attackType: 'save'` but NO `saveType` (broken — auto-hits with no save)
- Has a status effect (stun, slow, poison, etc.) but no save to resist it
- Applies CC (crowd control) without a save — this is a design problem, not just a bug

**Monster abilities (all 129 monsters):**

For every monster ability in `database/seeds/monsters.ts`:
- Does it have `saveDC` and `saveType`? If yes, save is defined.
- What type is the ability? (damage, aoe, status, on_hit, fear_aura, death_throes, swallow)
- For `aoe` type: should ALWAYS have a save (DEX save for half damage is standard d20)
- For `status` type: should have a save to resist
- For `on_hit` type: the hit is determined by the attack roll, but the secondary effect (poison, knockdown) should have a save
- For `fear_aura` type: should have a WIS save
- For `death_throes` type: should have a save for half damage
- For `swallow` type: should have a save to resist being swallowed

Flag any monster ability that:
- Is `type: 'aoe'` but has no `saveDC`/`saveType`
- Is `type: 'status'` but has no save
- Applies a status effect via `on_hit` but has no save for the status portion
- Has a `saveDC` that doesn't match 8 + proficiency + stat modifier (recalculate and compare)

### Part 2: Handler Audit — Do Handlers Actually Check Saves?

For each ability handler in the combat engine, verify saves are enforced:

**Player ability handlers in `server/src/lib/class-ability-resolver.ts`:**

- `handleDamage` — for `attackType: 'save'`: does it roll a save and apply half damage on success?
- `handleDamageStatus` — for save-based: does it roll a save? On success, is the status resisted?
- `handleDamageDebuff` — same check
- `handleDebuff` — does it check saveType and roll before applying?
- `handleAoeDamage` — does it roll a per-target save? Half damage on success?
- `handleStatus` — does it check saveType? (Polymorph was fixed to add a WIS save — verify others)
- `handleDrain` — for save-based: does it allow a save?
- `handleMultiTarget` — per-target saves?
- `handleAoeDrain` — per-target saves?

**Monster ability handlers in `server/src/lib/combat-engine.ts`:**

- `resolveMonsterAbility()` — how does it handle saves?
- For `type: 'aoe'`: is `saveDC`/`saveType` checked? Per-target save roll?
- For `type: 'status'`: is the save rolled before applying the status?
- For `type: 'on_hit'`: is the save for the secondary effect rolled?
- For `type: 'fear_aura'`: is the WIS save rolled per target?
- For `type: 'death_throes'`: is the save rolled for half damage?
- For `type: 'swallow'`: is the save rolled to resist?

**Legendary Resistance check:**
- When a monster fails a save vs a player ability, does `checkLegendaryResistance()` fire?
- When a player succeeds on a save vs a monster ability, are there any player-side "save bonuses" being applied? (Proficiency? Class features? Or just raw stat modifier?)

### Part 3: Log Verification — Are Saves Actually Happening?

Pull the 450 group combat logs. For every ability use that SHOULD involve a save:

**Monster AoE saves (most critical):**
- Find every monster `aoe` ability use (Cold Breath, Infernal Blaze, Hellfire Orb, etc.)
- For each use: was `saveRequired: true` logged?
- For each target hit: was a `saveRoll` logged? Was `saveSucceeded` true/false?
- Calculate: total AoE hits, saves rolled, saves succeeded, saves not rolled
- If saves are NOT being rolled → BUG: the handler skips saves for monster AoEs
- If saves ARE rolled → what's the success rate? (Expected: 30-50% at L10, lower at L20+ without gear)
- Total full-damage vs half-damage hits

**Monster status ability saves:**
- Find every monster `status` ability use (Psychic Grasp, Petrifying Gaze, etc.)
- Was a save rolled before the status applied?
- What's the save failure rate?

**Monster on_hit effect saves:**
- Find every `on_hit` effect (Venomous Bite, Knockdown, Life Drain, etc.)
- Was a save rolled for the secondary effect?
- If no save → is the effect auto-applying on every hit with no counterplay?

**Player save-based abilities:**
- Find every player ability with `attackType: 'save'` (Fireball, Intimidating Shout, Vicious Mockery, etc.)
- Was the monster's save rolled?
- Did legendary resistance trigger on failed saves?
- What's the save failure rate for monsters? (Expected: varies by monster stat vs player DC)

**Player status-applying abilities:**
- Find every player ability that applies a status (Shield Bash stun, Frost Lance slow, Hamstring slow, etc.)
- Was a save offered to the target?
- Or does the status auto-apply on hit with no save? (Some should auto-apply on hit — like "you hit, the target is poisoned" — but CC like stun should always have a save)

### Part 4: Save Balance Check

For all saves that DID happen:

**Save DC vs Save Bonus analysis:**
- Average player save DC by level (should be 8 + prof + stat mod)
- Average monster save bonus vs player DCs (do monsters save too often? Too rarely?)
- Average monster save DC by level
- Average player save bonus vs monster DCs (do players save too often? Too rarely?)
- Plot save success rate by level bracket: L10, L20, L30

**Expected ranges (d20 design):**
- Players vs monster saves at-level: 40-60% success rate
- Monsters vs player saves at-level: 40-60% success rate
- If either side succeeds 80%+ or 10%-, saves are too easy/hard

### Output

Write everything to `docs/audit-saving-throws-comprehensive.md`:

1. Ability save requirement table (all player + monster abilities)
2. Handler audit findings (which handlers check saves, which skip)
3. Log verification (save roll rates, success rates, missing saves)
4. Balance analysis (DC vs bonus, success rates by level)
5. Summary: bugs found (saves not rolling), missing saves (abilities that should have saves but don't), dead saves (saves that roll but don't affect outcomes)

**Summary table at the end:**

| Category | Total Uses | Save Rolled? | Success Rate | Verdict |
|----------|-----------|-------------|--------------|---------|
| Monster AoE | X | Y/X (Z%) | W% | OK / BUG / MISSING |
| Monster Status | X | Y/X (Z%) | W% | OK / BUG / MISSING |
| Monster On-Hit | X | Y/X (Z%) | W% | OK / BUG / MISSING |
| Player Save-Based | X | Y/X (Z%) | W% | OK / BUG / MISSING |
| Player Status | X | Y/X (Z%) | W% | OK / BUG / MISSING |

**In chat, report:**
- Total saves that should have happened vs actually happened
- Any abilities where saves are completely missing (biggest bugs)
- Save success rates by level (are they in the expected 40-60% range?)
- The single most important finding

### Do NOT fix anything. Audit and document only. No deploy needed.
