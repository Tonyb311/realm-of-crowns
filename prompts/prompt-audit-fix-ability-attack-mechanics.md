# Prompt: Audit + Fix Ability Attack Mechanics Across All 7 Classes

```
cat CLAUDE.md
cat .claude/agents/combat.md
cat .claude/agents/game-designer.md
cat .claude/agents/backend-developer.md
cat server/src/lib/class-ability-resolver.ts
cat server/src/lib/combat-engine.ts
cat docs/audit-combat-stat-mechanics.md
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
- Common roles include (but aren't limited to):
  - **Game Designer** — Mechanics, systems, balance, progression, combat
  - **Narrative Designer** — Story, lore, dialogue, quests, world-building
  - **Frontend Developer** — HTML/CSS/JS, UI components, responsive layout, animations
  - **Backend Developer** — Server logic, databases, APIs, authentication, state management
  - **UX/UI Designer** — Interface layout, player flow, menus, HUD, accessibility
  - **Systems Architect** — Data models, infrastructure, tech stack decisions, scalability
  - **QA Tester** — Bug identification, edge cases, balance testing, player experience review
  - **Art Director** — Visual style, asset guidance, theming, mood and atmosphere

## Context Awareness

- This is a browser-based RPG. All solutions should target web technologies (HTML, CSS, JavaScript/TypeScript, Canvas/WebGL where appropriate, and relevant backend stacks).
- Player experience is paramount. Every decision — mechanical, visual, or technical — should serve immersion and engagement.
- Consider both solo and multiplayer implications when relevant.
- Keep scope realistic for a browser game. Avoid over-engineering or suggesting AAA-scale solutions.

## Communication Style

- As Team Lead, speak in first person when coordinating.
- When presenting a teammate's work, use their name and role as a header.
- After all teammates contribute, provide a **Team Lead Summary** that ties everything together and flags open questions or next steps.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- If a task is simple enough for one person, handle it yourself as Team Lead. No need to spin up a full team for a quick answer.
- Keep the game's vision consistent across all teammate contributions.
- Always end with a clear summary of what was delivered and what still needs the user's input.

---

## Task: Audit and Fix Ability Attack/Resolution Mechanics Across All Classes

### The Problem

Class abilities are using incorrect attack resolution mechanics. Example: Psion's Psychic Jab is resolving as a melee attack (STR/DEX + proficiency vs AC) when it should be resolving as either a spell attack (INT + proficiency vs AC) or a save-based ability (target rolls WIS save vs DC). A Psion who correctly invests in INT and dumps STR/DEX will miss with their own primary ability because it's using the wrong stats.

This is likely a systemic issue. The ability resolver probably falls back to the basic weapon attack formula (`resolveAttack()`) for damage abilities instead of having separate resolution paths for:
- **Melee/physical attacks** — STR or DEX + proficiency vs AC (appropriate for Warrior, Rogue melee abilities)
- **Spell attacks** — primary caster stat (INT/WIS/CHA) + proficiency vs AC (appropriate for direct-target spells)
- **Save-based abilities** — target rolls a save vs DC (8 + proficiency + caster's primary stat). No attack roll needed — the ability auto-hits, but the target can resist/reduce with a save.

### D20 Design Reference

In D&D/d20 systems, abilities resolve in one of these ways:

1. **Melee/ranged weapon attack:** d20 + STR/DEX mod + proficiency vs AC. Used for physical attacks — sword swings, bow shots, Rogue Backstab, Warrior Power Strike.

2. **Spell attack roll:** d20 + casting stat mod + proficiency vs AC. Used for targeted spells that need to "hit" — Firebolt, Eldritch Blast, Scorching Ray. The caster uses their casting stat (INT for Wizards, WIS for Clerics, CHA for Bards).

3. **Save-based:** No attack roll. The ability automatically takes effect, but the target can roll a saving throw to resist or reduce the effect. Save DC = 8 + proficiency + casting stat mod. The save stat depends on the ability's nature:
   - DEX save: dodge area effects (Fireball, Lightning Bolt)
   - WIS save: resist mental effects (Charm, Fear, Dominate)
   - CON save: resist physical effects (Poison, Stun, Petrify)
   - STR save: resist force/grapple effects
   - INT save: resist psychic effects (Psion abilities)

4. **Auto-hit:** No attack roll, no save. Always works. Rare — Magic Missile is the classic example. Should be reserved for weaker abilities or abilities with other costs.

### Step 1: Audit the Current Resolution System

**First, understand how abilities currently resolve.** Read:

1. `server/src/lib/class-ability-resolver.ts` — specifically the `handleDamage` handler (and any other damage handlers). How does it determine the attack roll? Does it:
   - Always call `resolveAttack()` (the weapon attack function)?
   - Use the actor's weapon stats for the roll?
   - Have any concept of "spell attack" vs "weapon attack"?

2. `server/src/lib/combat-engine.ts` — the `resolveAttack()` function. What stat does it use? STR? DEX? Whichever is higher? Is there a "spell attack" variant?

3. Check the `AbilityDefinition` type — is there a field that specifies the resolution mechanic? Something like `attackType: 'melee' | 'spell' | 'save' | 'auto'`? If not, that's what's missing.

4. Check the `effects` objects on abilities — do any specify `autoHit: true`, `saveType`, or similar fields? Some abilities might already have partial support.

### Step 2: Classify Every Ability

Go through ALL abilities across all 7 classes (tier 0 + spec) and determine what resolution mechanic each SHOULD use. Write findings to `docs/audit-ability-attack-mechanics.md`.

**Classification guide by class and ability type:**

**Warrior (STR primary):**
- Most Warrior abilities should use **melee weapon attack** (STR + prof vs AC) — they're physical attacks enhanced with special effects. Power Strike, Reckless Strike, Cleave, Shield Bash = weapon attacks.
- Defensive/buff abilities (Defensive Stance, Iron Skin, War Cry) = **auto-apply** to self, no attack roll needed.
- Debuff shouts (Intimidating Shout) = **save-based** (WIS save vs STR-based DC, or CHA-based if it's an intimidation effect).

**Mage (INT primary):**
- Single-target damage (Arcane Spark, Frost Lance, Shadow Bolt) = **spell attack** (INT + prof vs AC)
- AoE damage (Fireball, Chain Lightning, Meteor Strike) = **save-based** (DEX save vs INT-based DC, half damage on save)
- Debuffs (Enfeeble, Arcane Siphon) = **save-based** (WIS or INT save vs INT-based DC)
- Self-buffs (Elemental Shield, Bone Armor, Mana Shield) = **auto-apply** to self
- Arcane Bolt (Enchanter) = **auto-hit** (this is the Magic Missile equivalent — never misses, lower damage to compensate)

**Rogue (DEX primary):**
- Melee attacks (Quick Slash, Backstab, Dual Strike, Flurry) = **melee weapon attack** (DEX + prof vs AC)
- Debuffs/status (Gouge, Cheap Shot, Low Blow) = **melee weapon attack** for the hit, then the debuff auto-applies on hit (or save to resist the debuff portion)
- Stealth/utility (Vanish, Smoke Bomb, Dodge Roll) = **auto-apply**
- Steal (Pilfer, Mug) = **DEX-based check** or **melee attack** + steal on hit
- Poison (Crippling Poison, Poison Blade) = **auto-apply** buff to self (the poison then auto-applies on next hit)

**Cleric (WIS primary):**
- Holy damage (Smite, Sacred Strike, Divine Strike) = **melee weapon attack** (STR or WIS + prof vs AC — Clerics are hybrid, check the design intent. In D&D, Paladins use STR for smite attacks.)
- Ranged holy damage (Holy Fire, Divine Wrath) = **spell attack** (WIS + prof vs AC) or **save-based** (DEX save for AoE)
- Heals (Mending Touch, Healing Light, Rejuvenation) = **auto-apply** to self/ally
- Debuffs (Condemnation, Denounce, Excommunicate) = **save-based** (WIS save vs WIS-based DC)
- Silence = **save-based** (WIS or CON save)
- Purify/cleanse = **auto-apply**

**Ranger (DEX primary):**
- Ranged attacks (Venomous Arrow, Multi-Shot, Piercing Arrow, Headshot) = **ranged weapon attack** (DEX + prof vs AC)
- Traps (Trip Wire, Lay Trap, Explosive Trap) = **save-based** (DEX save vs DEX-based DC) — traps are placed, then the target walks into them
- Self-buffs (Bark Skin, Camouflage) = **auto-apply**
- Companion abilities = depends on implementation

**Bard (CHA primary):**
- Damage songs (Vicious Mockery, Cacophony, Discordant Note) = **save-based** (WIS save vs CHA-based DC — they're verbal/sonic attacks)
- Buff songs (Inspiring Ballad, Hymn of Fortitude, War Song) = **auto-apply** to self/allies
- Debuffs (Jarring Note, Charming Words, Lullaby) = **save-based** (WIS save vs CHA-based DC)
- Shatter = **save-based** (CON save vs CHA-based DC — sonic damage to structures/creatures)

**Psion (INT primary):**
- Psychic damage (Psychic Jab, Mind Spike, Psychic Crush, Mind Shatter) = **spell attack** (INT + prof vs AC) OR **save-based** (INT or WIS save vs INT-based DC). For Psion, save-based is thematically stronger — you're attacking the mind, not throwing a projectile.
- Mind control (Dominate, Enthrall) = **save-based** (WIS save vs INT-based DC) — already implemented this way
- Self-buffs (Foresight, Precognitive Dodge) = **auto-apply**
- Telekinetic (Blink Strike) = **spell attack** (INT + prof vs AC) — it's a targeted strike

### Step 3: Implement the Resolution System

Based on what you find in the audit, the engine needs to support these resolution types:

**If the engine only has `resolveAttack()` (weapon attack):**

Add a `resolveSpellAttack()` function or equivalent:
```typescript
function resolveSpellAttack(
  state: CombatState,
  actor: Combatant,
  target: Combatant,
  castingStat: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'
): { hit: boolean; roll: number; total: number; targetAC: number; isCritical: boolean }
```
- Roll: d20 + getModifier(actor.stats[castingStat]) + actor.proficiencyBonus
- Compare vs target AC
- Natural 20 = critical hit, natural 1 = auto-miss
- This is mechanically identical to resolveAttack() except it uses the casting stat instead of STR/DEX

**Add ability resolution type to the data model:**

Add a field to `AbilityDefinition` in `shared/src/data/skills/types.ts`:
```typescript
/** How this ability resolves against targets */
attackType?: 'weapon' | 'spell' | 'save' | 'auto';
/** For spell attacks: which stat to use (defaults to class primary stat) */
attackStat?: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
```

Then update the damage handlers in `class-ability-resolver.ts`:
- If `attackType === 'weapon'` or undefined (backward compat): use current `resolveAttack()` with weapon stats
- If `attackType === 'spell'`: use `resolveSpellAttack()` with the specified or class-default casting stat
- If `attackType === 'save'`: skip attack roll entirely, the ability auto-hits. The save check (if `saveType` is specified) determines full vs reduced effect.
- If `attackType === 'auto'`: skip attack roll, auto-hit, no save (Arcane Bolt)

**For abilities that already have `autoHit: true`:** Map these to `attackType: 'auto'` or ensure they're handled consistently.

**For abilities that already have `saveType`:** These should use `attackType: 'save'` — the ability hits automatically and the save determines the outcome.

### Step 4: Tag Every Ability

After implementing the resolution types, go through EVERY ability in ALL 7 class data files and add the correct `attackType` (and `attackStat` if it differs from the class default):

```
shared/src/data/skills/warrior.ts
shared/src/data/skills/mage.ts
shared/src/data/skills/rogue.ts
shared/src/data/skills/cleric.ts
shared/src/data/skills/ranger.ts
shared/src/data/skills/bard.ts
shared/src/data/skills/psion.ts
```

For tier 0 abilities too — they should follow the same class-appropriate mechanics.

**Default behavior for backward compatibility:** If `attackType` is not specified, default to `'weapon'` (current behavior). This means you MUST explicitly tag every non-weapon ability. Don't leave them untagged.

### Step 5: Update Damage Type

While you're touching every ability, also verify the `damageType` field. Several abilities probably have no damage type or default to 'slashing':

- Psion abilities should deal `psychic` damage
- Mage fire spells should deal `fire` damage
- Mage frost spells should deal `cold` damage
- Cleric holy abilities should deal `radiant` damage
- Bard sonic abilities should deal `thunder` or `sonic` damage (check what damage types exist in the engine)

Check `shared/src/types/combat.ts` for the `CombatDamageType` enum/type to see what's available.

### Step 6: Verify

Run a targeted sim for the most affected classes:

**Psion (was using STR/DEX for everything):**
- 20 combats, L20 Kineticist vs Mind Flayer
- Check combat logs: Psychic Jab should now use INT + prof for the attack roll (spell attack) or resolve via save
- The attack modifier breakdown should show INT mod, not STR/DEX mod
- Report: average attack bonus before vs after

**Mage:**
- 20 combats, L20 Elementalist vs Mind Flayer
- Fireball should resolve via DEX save (not attack roll)
- Frost Lance should resolve via spell attack (INT + prof)
- Report resolution types observed

**Bard:**
- 20 combats, L20 Minstrel vs Mind Flayer
- Vicious Mockery should resolve via WIS save (not attack roll)
- Report resolution types observed

### Output

Write the full audit to `docs/audit-ability-attack-mechanics.md`:
1. Current system analysis — how abilities resolve today
2. Per-class, per-ability classification table: ability name | current resolution | correct resolution | attackType assigned | damageType assigned
3. List of all abilities that changed
4. Verification results

In chat: brief summary — how many abilities changed, which resolution types were added, verification highlights.

### Deployment

```
git add -A
git commit -m "feat: add spell attack and save-based resolution to ability system, classify all 189 abilities"
git push
```

Build and deploy to Azure with unique image tag. Never use `:latest`. Re-seed.
