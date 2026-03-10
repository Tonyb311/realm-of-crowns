# Live Pipeline Integration Test Results

**Date:** 2026-03-10
**Test Matrix:** 7 classes x 3 levels = 21 characters
**Fights per matchup:** 50

## Warnings

- Template not found: weapon-travelers-lute — skipping slot MAIN_HAND
- Template not found: weapon-masters-lute — skipping slot MAIN_HAND

## Stat Comparison

| Class | Level | Stat | Live | Sim | Match? | Notes |
|-------|-------|------|------|-----|--------|-------|
| warrior | 5 | HP | 36 | 36 | YES |  |
| warrior | 5 | AC | 14 | 14 | YES |  |
| warrior | 5 | Weapon | 1d6 (atk+0) | 1d6 (atk+0) | YES |  |
| warrior | 5 | WeaponStat | atk=str dmg=str | atk=str dmg=str | YES |  |
| warrior | 5 | RawArmor | 30 | (hardcoded) | YES | 7 slots equipped |
| warrior | 15 | HP | 76 | 76 | YES |  |
| warrior | 15 | AC | 16 | 16 | YES |  |
| warrior | 15 | Weapon | 1d8+1 (atk+1) | 1d8+1 (atk+1) | YES |  |
| warrior | 15 | WeaponStat | atk=str dmg=str | atk=str dmg=str | YES |  |
| warrior | 15 | RawArmor | 60 | (hardcoded) | YES | 7 slots equipped |
| warrior | 30 | HP | 137 | 137 | YES |  |
| warrior | 30 | AC | 20 | 20 | YES |  |
| warrior | 30 | Weapon | 1d10+2 (atk+2) | 1d10+2 (atk+2) | YES |  |
| warrior | 30 | WeaponStat | atk=str dmg=str | atk=str dmg=str | YES |  |
| warrior | 30 | RawArmor | 117.30000000000001 | (hardcoded) | YES | 7 slots equipped |
| rogue | 5 | HP | 28 | 28 | YES |  |
| rogue | 5 | AC | 11 | 12 | **NO** | rawArmor: live=3 sim=? delta=-1 |
| rogue | 5 | Weapon | 1d4 (atk+0) | 1d4 (atk+0) | YES |  |
| rogue | 5 | WeaponStat | atk=dex dmg=dex | atk=dex dmg=dex | YES |  |
| rogue | 5 | RawArmor | 3 | (hardcoded) | YES | 3 slots equipped |
| rogue | 15 | HP | 58 | 58 | YES |  |
| rogue | 15 | AC | 13 | 14 | **NO** | rawArmor: live=10 sim=? delta=-1 |
| rogue | 15 | Weapon | 1d6+1 (atk+1) | 1d6+1 (atk+1) | YES |  |
| rogue | 15 | WeaponStat | atk=dex dmg=dex | atk=dex dmg=dex | YES |  |
| rogue | 15 | RawArmor | 10 | (hardcoded) | YES | 4 slots equipped |
| rogue | 30 | HP | 103 | 103 | YES |  |
| rogue | 30 | AC | 17 | 19 | **NO** | rawArmor: live=20.700000000000003 sim=? delta=-2 |
| rogue | 30 | Weapon | 1d8+2 (atk+2) | 1d8+2 (atk+2) | YES |  |
| rogue | 30 | WeaponStat | atk=dex dmg=dex | atk=dex dmg=dex | YES |  |
| rogue | 30 | RawArmor | 20.700000000000003 | (hardcoded) | YES | 4 slots equipped |
| ranger | 5 | HP | 34 | 34 | YES |  |
| ranger | 5 | AC | 11 | 13 | **NO** | rawArmor: live=3 sim=? delta=-2 |
| ranger | 5 | Weapon | 1d6 (atk+0) | 1d6 (atk+0) | YES |  |
| ranger | 5 | WeaponStat | atk=dex dmg=dex | atk=dex dmg=dex | YES |  |
| ranger | 5 | RawArmor | 3 | (hardcoded) | YES | 3 slots equipped |
| ranger | 15 | HP | 74 | 74 | YES |  |
| ranger | 15 | AC | 13 | 16 | **NO** | rawArmor: live=10 sim=? delta=-3 |
| ranger | 15 | Weapon | 1d8+2 (atk+1) | 1d8+2 (atk+1) | YES |  |
| ranger | 15 | WeaponStat | atk=dex dmg=dex | atk=dex dmg=dex | YES |  |
| ranger | 15 | RawArmor | 10 | (hardcoded) | YES | 4 slots equipped |
| ranger | 30 | HP | 134 | 134 | YES |  |
| ranger | 30 | AC | 15 | 19 | **NO** | rawArmor: live=20.700000000000003 sim=? delta=-4 |
| ranger | 30 | Weapon | 1d10+3 (atk+2) | 1d10+3 (atk+2) | YES |  |
| ranger | 30 | WeaponStat | atk=dex dmg=dex | atk=dex dmg=dex | YES |  |
| ranger | 30 | RawArmor | 20.700000000000003 | (hardcoded) | YES | 4 slots equipped |
| mage | 5 | HP | 22 | 22 | YES |  |
| mage | 5 | AC | 10 | 11 | **NO** | rawArmor: live=0 sim=? delta=-1 |
| mage | 5 | Weapon | 1d6 (atk+0) | 1d4 (atk+0) | **NO** | MISMATCH |
| mage | 5 | WeaponStat | atk=int dmg=int | atk=int dmg=int | YES |  |
| mage | 5 | RawArmor | 0 | (hardcoded) | YES | 5 slots equipped |
| mage | 15 | HP | 42 | 42 | YES |  |
| mage | 15 | AC | 11 | 12 | **NO** | rawArmor: live=13 sim=? delta=-1 |
| mage | 15 | Weapon | 1d8+1 (atk+1) | 1d6+1 (atk+1) | **NO** | MISMATCH |
| mage | 15 | WeaponStat | atk=int dmg=int | atk=int dmg=int | YES |  |
| mage | 15 | RawArmor | 13 | (hardcoded) | YES | 5 slots equipped |
| mage | 30 | HP | 72 | 72 | YES |  |
| mage | 30 | AC | 12 | 14 | **NO** | rawArmor: live=14.95 sim=? delta=-2 |
| mage | 30 | Weapon | 1d8+2 (atk+3) | 1d6+2 (atk+2) | **NO** | MISMATCH |
| mage | 30 | WeaponStat | atk=int dmg=int | atk=int dmg=int | YES |  |
| mage | 30 | RawArmor | 14.95 | (hardcoded) | YES | 5 slots equipped |
| cleric | 5 | HP | 30 | 30 | YES |  |
| cleric | 5 | AC | 14 | 14 | YES |  |
| cleric | 5 | Weapon | 1d4 (atk+0) | 1d4 (atk+0) | YES |  |
| cleric | 5 | WeaponStat | atk=wis dmg=wis | atk=wis dmg=wis | YES |  |
| cleric | 5 | RawArmor | 30 | (hardcoded) | YES | 7 slots equipped |
| cleric | 15 | HP | 60 | 60 | YES |  |
| cleric | 15 | AC | 16 | 16 | YES |  |
| cleric | 15 | Weapon | 1d6+1 (atk+1) | 1d4+1 (atk+1) | **NO** | MISMATCH |
| cleric | 15 | WeaponStat | atk=wis dmg=wis | atk=wis dmg=wis | YES |  |
| cleric | 15 | RawArmor | 60 | (hardcoded) | YES | 7 slots equipped |
| cleric | 30 | HP | 106 | 106 | YES |  |
| cleric | 30 | AC | 20 | 20 | YES |  |
| cleric | 30 | Weapon | 1d6+2 (atk+2) | 1d6+2 (atk+2) | YES |  |
| cleric | 30 | WeaponStat | atk=wis dmg=wis | atk=wis dmg=wis | YES |  |
| cleric | 30 | RawArmor | 117.30000000000001 | (hardcoded) | YES | 7 slots equipped |
| bard | 5 | HP | 28 | 28 | YES |  |
| bard | 5 | AC | 10 | 11 | **NO** | rawArmor: live=0 sim=? delta=-1 |
| bard | 5 | Weapon | 1d4 (atk+0) | 1d4 (atk+0) | YES |  |
| bard | 5 | WeaponStat | atk=cha dmg=cha | atk=cha dmg=cha | YES |  |
| bard | 5 | RawArmor | 0 | (hardcoded) | YES | 4 slots equipped |
| bard | 15 | HP | 58 | 58 | YES |  |
| bard | 15 | AC | 11 | 12 | **NO** | rawArmor: live=13 sim=? delta=-1 |
| bard | 15 | Weapon | 1d8+1 (atk+1) | 1d6+1 (atk+1) | **NO** | MISMATCH |
| bard | 15 | WeaponStat | atk=cha dmg=cha | atk=cha dmg=cha | YES |  |
| bard | 15 | RawArmor | 13 | (hardcoded) | YES | 5 slots equipped |
| bard | 30 | HP | 103 | 103 | YES |  |
| bard | 30 | AC | 13 | 15 | **NO** | rawArmor: live=14.95 sim=? delta=-2 |
| bard | 30 | Weapon | 1d4 (atk+0) | 1d6+2 (atk+2) | **NO** | MISMATCH |
| bard | 30 | WeaponStat | atk=cha dmg=cha | atk=cha dmg=cha | YES |  |
| bard | 30 | RawArmor | 14.95 | (hardcoded) | YES | 4 slots equipped |
| psion | 5 | HP | 22 | 22 | YES |  |
| psion | 5 | AC | 10 | 11 | **NO** | rawArmor: live=0 sim=? delta=-1 |
| psion | 5 | Weapon | 1d4 (atk+0) | 1d4 (atk+0) | YES |  |
| psion | 5 | WeaponStat | atk=int dmg=int | atk=int dmg=int | YES |  |
| psion | 5 | RawArmor | 0 | (hardcoded) | YES | 5 slots equipped |
| psion | 15 | HP | 42 | 42 | YES |  |
| psion | 15 | AC | 11 | 12 | **NO** | rawArmor: live=13 sim=? delta=-1 |
| psion | 15 | Weapon | 1d6+1 (atk+1) | 1d4+1 (atk+1) | **NO** | MISMATCH |
| psion | 15 | WeaponStat | atk=int dmg=int | atk=int dmg=int | YES |  |
| psion | 15 | RawArmor | 13 | (hardcoded) | YES | 5 slots equipped |
| psion | 30 | HP | 72 | 72 | YES |  |
| psion | 30 | AC | 12 | 14 | **NO** | rawArmor: live=14.95 sim=? delta=-2 |
| psion | 30 | Weapon | 1d6+2 (atk+2) | 1d6+2 (atk+2) | YES |  |
| psion | 30 | WeaponStat | atk=int dmg=int | atk=int dmg=int | YES |  |
| psion | 30 | RawArmor | 14.95 | (hardcoded) | YES | 5 slots equipped |

## Armor Coverage Analysis

| Class | Level | Slot | Template | Raw Armor | Notes |
|-------|-------|------|----------|-----------|-------|
| warrior | 5 | HEAD | Copper Helm | 4 |  |
| warrior | 5 | CHEST | Copper Chestplate | 8 |  |
| warrior | 5 | HANDS | Copper Gauntlets | 3 |  |
| warrior | 5 | LEGS | Copper Greaves | 5 |  |
| warrior | 5 | FEET | Copper Boots | 4 |  |
| warrior | 5 | OFF_HAND | Copper Shield | 6 |  |
| warrior | 15 | HEAD | Iron Helm | 8 |  |
| warrior | 15 | CHEST | Iron Chestplate | 16 |  |
| warrior | 15 | HANDS | Iron Gauntlets | 6 |  |
| warrior | 15 | LEGS | Iron Greaves | 10 |  |
| warrior | 15 | FEET | Iron Boots | 8 |  |
| warrior | 15 | OFF_HAND | Iron Shield | 12 |  |
| warrior | 30 | HEAD | Steel Helm | 14 |  |
| warrior | 30 | CHEST | Steel Chestplate | 26 |  |
| warrior | 30 | HANDS | Steel Gauntlets | 10 |  |
| warrior | 30 | LEGS | Steel Greaves | 18 |  |
| warrior | 30 | FEET | Steel Boots | 14 |  |
| warrior | 30 | OFF_HAND | Steel Shield | 20 |  |
| rogue | 5 | HANDS | Leather Gloves | 1 |  |
| rogue | 5 | FEET | Leather Boots | 2 |  |
| rogue | 15 | HEAD | Hard Leather Cap | 3 |  |
| rogue | 15 | HANDS | Wolf Leather Gloves | 3 |  |
| rogue | 15 | FEET | Wolf Leather Boots | 4 |  |
| rogue | 30 | HANDS | Bear Hide Vambraces | 5 |  |
| rogue | 30 | LEGS | Bear Leather Leggings | 7 |  |
| rogue | 30 | FEET | Bear Leather Boots | 6 |  |
| ranger | 5 | HANDS | Leather Gloves | 1 |  |
| ranger | 5 | FEET | Leather Boots | 2 |  |
| ranger | 15 | HEAD | Hard Leather Cap | 3 |  |
| ranger | 15 | HANDS | Wolf Leather Gloves | 3 |  |
| ranger | 15 | FEET | Wolf Leather Boots | 4 |  |
| ranger | 30 | HANDS | Bear Hide Vambraces | 5 |  |
| ranger | 30 | LEGS | Bear Leather Leggings | 7 |  |
| ranger | 30 | FEET | Bear Leather Boots | 6 |  |
| mage | 5 | HEAD | Cloth Hood | 0 | NO ARMOR STAT (magicResist: 2) |
| mage | 5 | CHEST | Cloth Robes | 0 | NO ARMOR STAT (magicResist: 4) |
| mage | 5 | HANDS | Cloth Gloves | 0 | NO ARMOR STAT (magicResist: 1) |
| mage | 5 | FEET | Cloth Boots | 0 | NO ARMOR STAT (magicResist: 2) |
| mage | 15 | HEAD | Woven Wool Hood | 3 |  |
| mage | 15 | CHEST | Woven Wool Robes | 5 |  |
| mage | 15 | HANDS | Woven Wool Gloves | 2 |  |
| mage | 15 | FEET | Woven Wool Boots | 3 |  |
| mage | 30 | HEAD | Woven Wool Hood | 3 |  |
| mage | 30 | CHEST | Woven Wool Robes | 5 |  |
| mage | 30 | HANDS | Woven Wool Gloves | 2 |  |
| mage | 30 | FEET | Woven Wool Boots | 3 |  |
| cleric | 5 | HEAD | Copper Helm | 4 |  |
| cleric | 5 | CHEST | Copper Chestplate | 8 |  |
| cleric | 5 | HANDS | Copper Gauntlets | 3 |  |
| cleric | 5 | LEGS | Copper Greaves | 5 |  |
| cleric | 5 | FEET | Copper Boots | 4 |  |
| cleric | 5 | OFF_HAND | Copper Shield | 6 |  |
| cleric | 15 | HEAD | Iron Helm | 8 |  |
| cleric | 15 | CHEST | Iron Chestplate | 16 |  |
| cleric | 15 | HANDS | Iron Gauntlets | 6 |  |
| cleric | 15 | LEGS | Iron Greaves | 10 |  |
| cleric | 15 | FEET | Iron Boots | 8 |  |
| cleric | 15 | OFF_HAND | Iron Shield | 12 |  |
| cleric | 30 | HEAD | Steel Helm | 14 |  |
| cleric | 30 | CHEST | Steel Chestplate | 26 |  |
| cleric | 30 | HANDS | Steel Gauntlets | 10 |  |
| cleric | 30 | LEGS | Steel Greaves | 18 |  |
| cleric | 30 | FEET | Steel Boots | 14 |  |
| cleric | 30 | OFF_HAND | Steel Shield | 20 |  |
| bard | 5 | HEAD | Cloth Hood | 0 | NO ARMOR STAT (magicResist: 2) |
| bard | 5 | CHEST | Cloth Robes | 0 | NO ARMOR STAT (magicResist: 4) |
| bard | 5 | HANDS | Cloth Gloves | 0 | NO ARMOR STAT (magicResist: 1) |
| bard | 5 | FEET | Cloth Boots | 0 | NO ARMOR STAT (magicResist: 2) |
| bard | 15 | HEAD | Woven Wool Hood | 3 |  |
| bard | 15 | CHEST | Woven Wool Robes | 5 |  |
| bard | 15 | HANDS | Woven Wool Gloves | 2 |  |
| bard | 15 | FEET | Woven Wool Boots | 3 |  |
| bard | 30 | HEAD | Woven Wool Hood | 3 |  |
| bard | 30 | CHEST | Woven Wool Robes | 5 |  |
| bard | 30 | HANDS | Woven Wool Gloves | 2 |  |
| bard | 30 | FEET | Woven Wool Boots | 3 |  |
| psion | 5 | HEAD | Cloth Hood | 0 | NO ARMOR STAT (magicResist: 2) |
| psion | 5 | CHEST | Cloth Robes | 0 | NO ARMOR STAT (magicResist: 4) |
| psion | 5 | HANDS | Cloth Gloves | 0 | NO ARMOR STAT (magicResist: 1) |
| psion | 5 | FEET | Cloth Boots | 0 | NO ARMOR STAT (magicResist: 2) |
| psion | 15 | HEAD | Woven Wool Hood | 3 |  |
| psion | 15 | CHEST | Woven Wool Robes | 5 |  |
| psion | 15 | HANDS | Woven Wool Gloves | 2 |  |
| psion | 15 | FEET | Woven Wool Boots | 3 |  |
| psion | 30 | HEAD | Woven Wool Hood | 3 |  |
| psion | 30 | CHEST | Woven Wool Robes | 5 |  |
| psion | 30 | HANDS | Woven Wool Gloves | 2 |  |
| psion | 30 | FEET | Woven Wool Boots | 3 |  |

## Combat Results

| Class | Level | Monster | Live Win% | Sim Win% | Delta | Avg Rounds (L/S) | Flag? |
|-------|-------|---------|-----------|----------|-------|-------------------|-------|
| warrior | 5 | Skeleton Warrior | 96% | 96% | 0% | 4.9/4.7 |  |
| warrior | 15 | Mire Hulk | 90% | 82% | +8% | 8.8/8.8 |  |
| warrior | 30 | Storm Giant | 30% | 48% | -18% | 10/9.3 | **YES** |
| rogue | 5 | Skeleton Warrior | 76% | 46% | +30% | 5.4/5.8 | **YES** |
| rogue | 15 | Mire Hulk | 24% | 54% | -30% | 8.6/8 | **YES** |
| rogue | 30 | Storm Giant | 2% | 6% | -4% | 6.8/8 |  |
| ranger | 5 | Skeleton Warrior | 84% | 90% | -6% | 5.2/4.8 |  |
| ranger | 15 | Mire Hulk | 82% | 92% | -10% | 7.7/7.4 |  |
| ranger | 30 | Storm Giant | 44% | 48% | -4% | 8.7/9.4 |  |
| mage | 5 | Skeleton Warrior | 56% | 24% | +32% | 3.9/4.5 | **YES** |
| mage | 15 | Mire Hulk | 20% | 4% | +16% | 6/6.5 | **YES** |
| mage | 30 | Storm Giant | 2% | 0% | +2% | 5.1/5.3 |  |
| cleric | 5 | Skeleton Warrior | 62% | 78% | -16% | 5.9/5.7 | **YES** |
| cleric | 15 | Mire Hulk | 64% | 36% | +28% | 9.3/10.3 | **YES** |
| cleric | 30 | Storm Giant | 2% | 10% | -8% | 8.4/9.1 |  |
| bard | 5 | Skeleton Warrior | 50% | 70% | -20% | 5.3/5.4 | **YES** |
| bard | 15 | Mire Hulk | 44% | 42% | +2% | 7.4/7.9 |  |
| bard | 30 | Storm Giant | 0% | 0% | 0% | 7.1/7.1 |  |
| psion | 5 | Skeleton Warrior | 40% | 58% | -18% | 4.6/5.3 | **YES** |
| psion | 15 | Mire Hulk | 4% | 4% | 0% | 5.8/6.2 |  |
| psion | 30 | Storm Giant | 0% | 0% | 0% | 5.3/5.2 |  |

## Key Findings

### Stat Mismatches (22 found)

- **rogue L5 AC**: live=11 sim=12 rawArmor: live=3 sim=? delta=-1
- **rogue L15 AC**: live=13 sim=14 rawArmor: live=10 sim=? delta=-1
- **rogue L30 AC**: live=17 sim=19 rawArmor: live=20.700000000000003 sim=? delta=-2
- **ranger L5 AC**: live=11 sim=13 rawArmor: live=3 sim=? delta=-2
- **ranger L15 AC**: live=13 sim=16 rawArmor: live=10 sim=? delta=-3
- **ranger L30 AC**: live=15 sim=19 rawArmor: live=20.700000000000003 sim=? delta=-4
- **mage L5 AC**: live=10 sim=11 rawArmor: live=0 sim=? delta=-1
- **mage L5 Weapon**: live=1d6 (atk+0) sim=1d4 (atk+0) MISMATCH
- **mage L15 AC**: live=11 sim=12 rawArmor: live=13 sim=? delta=-1
- **mage L15 Weapon**: live=1d8+1 (atk+1) sim=1d6+1 (atk+1) MISMATCH
- **mage L30 AC**: live=12 sim=14 rawArmor: live=14.95 sim=? delta=-2
- **mage L30 Weapon**: live=1d8+2 (atk+3) sim=1d6+2 (atk+2) MISMATCH
- **cleric L15 Weapon**: live=1d6+1 (atk+1) sim=1d4+1 (atk+1) MISMATCH
- **bard L5 AC**: live=10 sim=11 rawArmor: live=0 sim=? delta=-1
- **bard L15 AC**: live=11 sim=12 rawArmor: live=13 sim=? delta=-1
- **bard L15 Weapon**: live=1d8+1 (atk+1) sim=1d6+1 (atk+1) MISMATCH
- **bard L30 AC**: live=13 sim=15 rawArmor: live=14.95 sim=? delta=-2
- **bard L30 Weapon**: live=1d4 (atk+0) sim=1d6+2 (atk+2) MISMATCH
- **psion L5 AC**: live=10 sim=11 rawArmor: live=0 sim=? delta=-1
- **psion L15 AC**: live=11 sim=12 rawArmor: live=13 sim=? delta=-1
- **psion L15 Weapon**: live=1d6+1 (atk+1) sim=1d4+1 (atk+1) MISMATCH
- **psion L30 AC**: live=12 sim=14 rawArmor: live=14.95 sim=? delta=-2

### Flagged Combat Deltas (>15% gap)

- **warrior L30 vs Storm Giant**: live=30% sim=48% (delta=-18%)
- **rogue L5 vs Skeleton Warrior**: live=76% sim=46% (delta=+30%)
- **rogue L15 vs Mire Hulk**: live=24% sim=54% (delta=-30%)
- **mage L5 vs Skeleton Warrior**: live=56% sim=24% (delta=+32%)
- **mage L15 vs Mire Hulk**: live=20% sim=4% (delta=+16%)
- **cleric L5 vs Skeleton Warrior**: live=62% sim=78% (delta=-16%)
- **cleric L15 vs Mire Hulk**: live=64% sim=36% (delta=+28%)
- **bard L5 vs Skeleton Warrior**: live=50% sim=70% (delta=-20%)
- **psion L5 vs Skeleton Warrior**: live=40% sim=58% (delta=-18%)

### AC Divergences

The sim uses hardcoded `RAW_ARMOR_BY_CLASS_TIER` values that may not match real DB templates:

- **rogue L5**: live AC=11, sim AC=12 (rawArmor: live=3 sim=? delta=-1)
- **rogue L15**: live AC=13, sim AC=14 (rawArmor: live=10 sim=? delta=-1)
- **rogue L30**: live AC=17, sim AC=19 (rawArmor: live=20.700000000000003 sim=? delta=-2)
- **ranger L5**: live AC=11, sim AC=13 (rawArmor: live=3 sim=? delta=-2)
- **ranger L15**: live AC=13, sim AC=16 (rawArmor: live=10 sim=? delta=-3)
- **ranger L30**: live AC=15, sim AC=19 (rawArmor: live=20.700000000000003 sim=? delta=-4)
- **mage L5**: live AC=10, sim AC=11 (rawArmor: live=0 sim=? delta=-1)
- **mage L15**: live AC=11, sim AC=12 (rawArmor: live=13 sim=? delta=-1)
- **mage L30**: live AC=12, sim AC=14 (rawArmor: live=14.95 sim=? delta=-2)
- **bard L5**: live AC=10, sim AC=11 (rawArmor: live=0 sim=? delta=-1)
- **bard L15**: live AC=11, sim AC=12 (rawArmor: live=13 sim=? delta=-1)
- **bard L30**: live AC=13, sim AC=15 (rawArmor: live=14.95 sim=? delta=-2)
- **psion L5**: live AC=10, sim AC=11 (rawArmor: live=0 sim=? delta=-1)
- **psion L15**: live AC=11, sim AC=12 (rawArmor: live=13 sim=? delta=-1)
- **psion L30**: live AC=12, sim AC=14 (rawArmor: live=14.95 sim=? delta=-2)

Root causes: cloth armor has magicResist but no armor stat at T1, leather armor coverage is sparse, Silk T3 cloth requires L40.
