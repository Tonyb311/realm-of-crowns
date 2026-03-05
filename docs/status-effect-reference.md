# Status Effect Reference — Realm of Crowns

Canonical reference for all 27 status effects. Source of truth: `shared/src/data/combat/status-effect-defs.ts`.

## Movement / Speed Effects

### Slowed
- **AC:** -2
- **DEX Saves:** -2
- **Blocks Multiattack:** Yes (only single attacks per turn)
- **Flee DC:** +5
- **Description:** Movements become sluggish, defenses weakened, cannot chain attacks.

### Root
- **AC:** -3
- **DEX Saves:** -2
- **Blocks Flee:** Yes
- **Blocks Movement Abilities:** Yes (Vanish, Blink Strike, Disengage)
- **Description:** Pinned in place. Can still attack and cast, but cannot flee or use movement-based abilities.

### Restrained
- **AC:** -4
- **DEX Saves:** -4
- **Blocks Multiattack:** Yes
- **Blocks Flee:** Yes
- **Blocks Movement Abilities:** Yes
- **Attackers Get:** +2 to hit
- **Description:** Bound and unable to move. Worse than slowed in every way.

## Mental Effects

### Frightened
- **Attack:** -2
- **Saves:** -2
- **AI Behavior:** Prefers defensive actions. 30% chance to attempt flee each turn.
- **Description:** Shaking with fear. Reduced combat effectiveness, may try to run.

### Mesmerize (Charm)
- **Prevents Action:** No (changed from yes)
- **Special:** Cannot attack the charmer. If charmer is the only enemy, skips turn. Breaks on taking damage.
- **Description:** Charmed. Can attack other enemies but not the source of the charm.

### Dominated
- **Prevents Action:** Yes (mind controlled)
- **Special:** Attacks own allies. Most powerful CC in the game. Rare, short duration.
- **Description:** Full mind control. The dominated combatant attacks random allies.

## Action-Preventing Effects

### Stunned
- **Prevents Action:** Yes
- **AC:** -4
- **Auto-fail:** DEX and STR saves
- **Attackers Get:** +4 to hit
- **Description:** Completely incapacitated. Defenseless, auto-fails physical saves, easy target.

### Paralyzed
- **Prevents Action:** Yes
- **AC:** -4
- **Auto-fail:** DEX and STR saves
- **Attackers Get:** +4 to hit
- **Melee Auto-Crit:** Yes (d20 standard for paralyzed)
- **Description:** Identical to stunned but melee attacks automatically critical hit.

### Frozen
- **Prevents Action:** Yes
- **AC:** -4
- **Immune To:** COLD damage
- **Vulnerable To:** BLUDGEONING (+50% damage, shatter the ice)
- **Removed By:** FIRE damage (thaws)
- **Description:** Encased in ice. Immune to further cold, brittle against bludgeoning, thaws on fire.

### Knocked Down
- **AC:** -4
- **Melee Attackers Get:** +2 to hit
- **Ranged Attackers Get:** -2 to hit (harder to hit prone target)
- **Description:** Knocked prone. Melee advantage, ranged disadvantage.

### Skip Turn
- **Prevents Action:** Yes
- **Description:** Generic "lose a turn" status. No other effects.

### Polymorph
- **Attack:** -4
- **AC:** -5
- **Saves:** -2
- **Blocks Spells:** Yes (cannot use any abilities)
- **Description:** Transformed into a weak creature. Can only basic attack at severe penalty.

## Damage Over Time

### Poisoned
- **DoT:** 3 damage/round (or custom)
- **Attack:** -2
- **Saves:** -2
- **Description:** Poison damage each round plus reduced accuracy and willpower.

### Burning
- **DoT:** 5 fire damage/round (or custom)
- **Removed By:** COLD damage, or taking the Defend action (stop, drop, roll)
- **Description:** On fire. Can be extinguished by defending or by cold damage.

### Diseased
- **Attack:** -2
- **AC:** -2
- **Saves:** -2
- **Damage Dealt:** -2
- **Healing Received:** x0.5 (halved)
- **Does NOT expire naturally** (persists until cleansed)
- **No DoT** (disease is a long-term debuff, not damage per round)
- **Description:** Virulent sickness weakening body and resisting recovery. Needs Purify/Cure.

## Defensive Debuffs

### Weakened
- **Attack:** -3
- **AC:** -2
- **Damage Dealt:** -2
- **Description:** General debilitation. Worse at attacking, dealing damage, and defending.

### Blinded
- **Attack:** -4
- **AC:** -4
- **Attackers Get:** +2 to hit
- **Description:** Cannot see. Severe penalty to attacking and defending. Attackers gain advantage.

### Silenced
- **Blocks Spells:** Yes (class_ability and cast actions blocked, except damage/passive effects)
- **Does NOT block:** basic attacks, psion_ability, monster abilities, items
- **Description:** Cannot speak. Prevents spellcasting and support abilities.

## Positive Effects

### Blessed
- **Attack:** +2
- **Saves:** +2
- **Description:** Divine favor. Standard offensive/defensive buff.

### Shielded
- **AC:** +4
- **Description:** Protective barrier. Absorbs damage before HP is affected.

### Hasted
- **Attack:** +2
- **AC:** +2
- **Extra Action:** Yes (one additional attack per turn)
- **Description:** Supernatural speed. Bonus attack plus combat modifiers. Rare and powerful.

### Regenerating
- **HoT:** 5 HP/round (or custom)
- **Disabled By:** FIRE or ACID damage (like troll regeneration — no healing that round)
- **Description:** Heals HP each round. Can be suppressed by fire or acid.

### Foresight
- **AC:** +2
- **DEX Saves:** +2
- **Description:** Precognitive awareness. Better at dodging and avoiding danger.

### Phased
- **AC:** +4
- **Description:** Partially incorporeal. High defensive bonus.

## Special

### Swallowed
- **Attack:** -4
- **AC:** -2
- **Saves:** -2
- **Special:** Can only attack the swallower. Takes digestion damage per round. Escape by dealing enough cumulative damage.

### Taunt
- **Special:** Must attack the taunter. Cannot switch targets. Ends if taunter dies.

### Banished
- **Prevents Action:** Yes
- **Special:** Removed from combat entirely for several rounds. Cannot act or be targeted. Stunned on return.

---

*Generated from `STATUS_EFFECT_MECHANICS` in `shared/src/data/combat/status-effect-defs.ts`.*
