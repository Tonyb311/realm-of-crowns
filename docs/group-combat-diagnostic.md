# Group Combat Diagnostic: Balanced L20 Medium

## Pre-Fix Diagnostic (2026-03-05)

**Config:** Balanced party (Warrior/Mage/Cleric/Rogue/Ranger, all human, all L20 with specs) vs CR-matched medium-difficulty monster groups
**Fights:** 5

### Pre-Fix Results

| Metric | Value |
|--------|-------|
| Win rate | 1/5 (20%) |
| Avg rounds survived | 7.4 |
| Avg party alive at end | 0.4 / 5 |
| Cleric healed an ally | 0 / 5 fights |
| Party damage per fight | 9-41 (fights 2-5) |
| Monster damage per fight | 500-600+ |

### 3 Critical Bugs Found

1. **Cleric never heals allies** — `useWhen: 'low_hp'` only checked the caster's own HP, not allies. Damage abilities (`always`) had higher priority than heals (`low_hp`).
2. **Heal queue priority wrong** — Even when `low_hp` triggered, `Purify` (cleanse) and `Regeneration` (HoT) were classified as 'heal' and picked before `Healing Light` (actual direct heal).
3. **Party damage near-zero** — 4 effect handlers (`handleDamageStatus`, `handleDamageDebuff`, `handleMultiTarget`, `handleDrain`) performed attack rolls but never added weapon damage. Shield Bash dealt flat 3 damage instead of 1d12+10+3=avg 19.5.

---

## Post-Fix Diagnostic (2026-03-05)

### Fixes Applied

**Bug 1+2 (Cleric healing):**
- Added heal intercept in `decideAction()`: if any ally < 60% HP, use first available direct heal (type `'heal'` only, not cleanse/HoT)
- Changed `low_hp` condition to check lowest ally HP%, not just actor HP
- Target selection: lowest HP% ally (including self)

**Bug 3 (Party damage):**
- Added `calcWeaponDamage()` shared helper in `class-ability-resolver.ts`
- Weapon attacks add: weapon dice + stat mod + weapon bonus
- Spell attacks add: class primary stat modifier
- Fixed 4 handlers: `handleDamageStatus`, `handleDamageDebuff`, `handleMultiTarget`, `handleDrain`

### Post-Fix Results

| Metric | Before Fix | After Fix |
|--------|-----------|-----------|
| Win rate | 1/5 (20%) | 1/5 (20%) |
| Avg rounds | 7.4 | 6.2 |
| Avg party alive | 0.4 | 0.8 |
| Cleric healed ally | 0/5 fights | **5/5 fights** |
| Shield Bash damage | 3 | **26** |
| Party damage/fight | 9-625 | **374-648** |
| Ranger damage/fight | ~50 | **161-577** |

### Post-Fix Per-Fight Breakdown

| Fight | Monsters | HP Ratio | Result | Rounds | Party Dmg | Cleric Heals |
|-------|----------|----------|--------|--------|-----------|-------------|
| 1 | 3 (Chuul, Mind Flayer, Frost Giant) | 80% | WIPE | 9 | 570 | 2 (26 HP) |
| 2 | 3 (Vampire Lord, Mind Flayer, Djinn) | 87% | **WIN** | 6 | 648 | 1 (15 HP) |
| 3 | 4 (Mind Flayer, Hydra, Fire Giant, Remorhaz) | 110% | WIPE | 5 | 319 | 2 (19 HP) |
| 4 | 4 (Hydra, Chuul, Chimera, Centaur) | 107% | WIPE | 6 | 374 | 1 (12 HP) |
| 5 | 4 (Behemoth, Hydra, Frost Giant, Mire Hulk) | 133% | WIPE | 5 | 501 | 1 (14 HP) |

### Remaining Balance Issues (Not Bugs)

1. **Monster AoE hits full party** — Designed for 1v1, monster AoE now hits 5 targets. Chimera Fire Breath + Lich Mass Necrotic Wave in R1 can remove 50% of total party HP.
2. **Hydra's Multiple Heads** — 228-510 damage per fight (more than entire party HP pool in some fights). This ability is a balance outlier in group combat.
3. **Mage dies immediately** — AC 10 with 83 HP. Gets deleted by any AoE in R1. By design, but needs party protection.
4. **Healing throughput too low** — Healing Light heals 2d8+3 (avg 12 HP). Party takes 100+ damage per round from monster AoE. Heal-to-damage ratio is ~10%.
5. **CR budget allows 133% HP ratio** — Greedy knapsack packs 4 monsters with 745 total HP vs party's 560.

**Win rate is still low (20%) but the bugs are fixed.** The remaining issues are balance problems (monster AoE scaling, heal throughput, CR formula) not code bugs.
