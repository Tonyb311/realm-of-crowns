# Admin Combat Panel — Research Findings

## 1. Admin Panel Architecture

### Route Registration Pattern

All admin routes are registered in `server/src/routes/admin/index.ts`:

```typescript
import { Router } from 'express';
import { adminGuard } from '../../middleware/admin';
import statsRouter from './stats';
import usersRouter from './users';
import charactersRouter from './characters';
import worldRouter from './world';
import economyRouter from './economy';
import toolsRouter from './tools';
import errorLogsRouter from './errorLogs';
import simulationRouter from './simulation';
import contentReleaseRouter from './contentRelease';
import travelRouter from './travel';
import populationRouter from './population';
import monstersRouter from './monsters';
import marketRouter from './market';

const router = Router();

router.use(adminGuard);  // Central guard applied first
router.use('/stats', statsRouter);
router.use('/users', usersRouter);
router.use('/characters', charactersRouter);
router.use('/world', worldRouter);
router.use('/economy', economyRouter);
router.use('/tools', toolsRouter);
router.use('/error-logs', errorLogsRouter);
router.use('/simulation', simulationRouter);
router.use('/content-release', contentReleaseRouter);
router.use('/travel', travelRouter);
router.use('/population', populationRouter);
router.use('/monsters', monstersRouter);
router.use('/market', marketRouter);

export default router;
```

The admin router is mounted at `/api/admin/` in `server/src/routes/index.ts` (line 91).

### Admin Middleware

**File:** `server/src/middleware/admin.ts`

```typescript
export function adminGuard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  authGuard(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}
```

Flow: JWT verification via `authGuard` → token blacklist check → role check (`req.user.role === 'admin'`) → 403 if not admin.

### Frontend Routing Pattern

**App.tsx:**
```typescript
<Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
  <Route index element={<AdminDashboardPage />} />
  <Route path="users" element={<AdminUsersPage />} />
  <Route path="characters" element={<AdminCharactersPage />} />
  <Route path="world" element={<AdminWorldPage />} />
  <Route path="economy" element={<AdminEconomyPage />} />
  <Route path="tools" element={<AdminToolsPage />} />
  <Route path="error-logs" element={<ErrorLogDashboardPage />} />
  <Route path="simulation" element={<SimulationDashboardPage />} />
  <Route path="content-release" element={<ContentReleasePage />} />
  <Route path="monsters" element={<AdminMonstersPage />} />
</Route>
```

**AdminRoute Guard** (`client/src/components/ui/AdminRoute.tsx`):
- Checks `isLoading` → spinner
- Not authenticated → redirect to `/login`
- Not admin → redirect to `/`
- `isAdmin` derived from `user?.role === 'admin'` in AuthContext

### Layout/Component Patterns

**AdminLayout** (`client/src/components/admin/AdminLayout.tsx`):

```typescript
const ADMIN_NAV = [
  { path: '/admin', label: 'Dashboard', icon: BarChart3, exact: true },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/characters', label: 'Characters', icon: UserCog },
  { path: '/admin/world', label: 'World', icon: Globe },
  { path: '/admin/economy', label: 'Economy', icon: Coins },
  { path: '/admin/tools', label: 'Tools', icon: Wrench },
  { path: '/admin/error-logs', label: 'Error Logs', icon: AlertCircle },
  { path: '/admin/simulation', label: 'Simulation', icon: Bot },
  { path: '/admin/content-release', label: 'Content Release', icon: Layers },
  { path: '/admin/monsters', label: 'Monsters', icon: Skull },
];
```

- Desktop sidebar (56rem width, fixed left) + mobile overlay
- Uses Tailwind + realm-* design tokens, Cinzel display font, Lucide React icons
- Content renders via `<Outlet />`
- Common components: `RealmPanel`, `RealmButton`, `RealmInput`, `ErrorMessage`, Recharts for charts

### SimulationDashboard Current State

**File:** `client/src/pages/admin/SimulationDashboardPage.tsx` (1,546 lines)

**Current sections:**
1. **Control Panel** — Seed bots, run ticks, start/pause/resume/stop, config adjustments, system focus, error storm, cleanup
2. **Status Display** — Status badge (idle/running/paused/stopping), bot count, actions/errors, APM, uptime, game day
3. **Distribution Charts** — Race, class, profession, town, level bar charts (Recharts)
4. **Bot Roster** — Expandable table with name, race, class, profile, level, gold, town, last action, status
5. **Recent Activity Feed** — 50 most recent bot actions with timestamp, endpoint, success/failure, duration
6. **Data Export** — Excel (20+ sheets) + JSON combat detail download
7. **Per-Bot Daily Logs** — Detailed per-bot per-tick breakdown when bot selected

**Query hooks with adaptive polling:**
- Status: 5s when running, 30s idle
- Stats: 10s when running, 30s idle
- Activity: 5s when running, 30s idle

### Pattern for Adding New Admin Pages

1. Create backend route file in `server/src/routes/admin/`
2. Register in `server/src/routes/admin/index.ts` with `router.use('/path', newRouter)`
3. Create frontend page in `client/src/pages/admin/`
4. Add to `ADMIN_NAV` array in `client/src/components/admin/AdminLayout.tsx`
5. Add `<Route>` inside the `<Route path="/admin">` block in `App.tsx`

---

## 2. Combat Engine Data Structures

### CombatState

```typescript
export interface CombatState {
  sessionId: string;
  type: 'PVE' | 'PVP' | 'DUEL' | 'ARENA' | 'WAR';
  status: 'ACTIVE' | 'COMPLETED';
  round: number;
  turnIndex: number;
  combatants: Combatant[];
  turnOrder: string[];          // Combatant IDs sorted by initiative (descending)
  log: TurnLogEntry[];
  winningTeam: number | null;
  peacefulResolution?: boolean; // Set by Diplomat's Gambit
}
```

### Combatant

```typescript
export interface Combatant {
  // Core
  id: string;
  name: string;
  entityType: 'character' | 'monster';
  team: number;
  stats: CharacterStats;           // { str, dex, con, int, wis, cha }
  level: number;
  currentHp: number;
  maxHp: number;
  ac: number;
  initiative: number;
  statusEffects: StatusEffect[];
  spellSlots: SpellSlots;          // { [level: number]: remaining_slots }
  weapon: WeaponInfo | null;
  isAlive: boolean;
  isDefending: boolean;
  proficiencyBonus: number;

  // Race & Class
  race?: string;
  subRace?: { id: string; element?: string } | null;
  characterClass?: string | null;
  specialization?: string | null;

  // Psion Mind Control
  controlledBy?: string | null;
  controlDuration?: number;
  banishedUntilRound?: number | null;
  hasReaction?: boolean;
  reactionType?: string | null;
  lastAction?: CombatAction | null;

  // Flee Tracking
  hasFled?: boolean;

  // Class Ability Cooldown & Usage
  abilityCooldowns?: Record<string, number>;      // abilityId -> rounds remaining
  abilityUsesThisCombat?: Record<string, number>;  // abilityId -> times used
  activeBuffs?: ActiveBuff[];
  delayedEffects?: DelayedEffect[];

  // Cooldown Reduction from Passives
  cooldownReductionPercent?: number;  // 0-1 (e.g., 0.3 = 30%)
  cooldownReductionFlat?: number;

  // Class Ability Attack Modifiers (consumed by resolveAttack)
  classAbilityAttackMods?: ClassAbilityAttackMods;

  // Passive Fields (15+)
  critChanceBonus?: number;
  firstStrikeCrit?: boolean;
  hasAttackedThisCombat?: boolean;
  permanentCompanion?: boolean;
  companionImmune?: boolean;
  stackingDamagePerRound?: number;
  roundDamageBonus?: number;
  advantageVsLowHp?: boolean;
  advantageHpThreshold?: number;
  holyDamageBonus?: number;
  antiHealAura?: boolean;
  charmEffectiveness?: number;
  extraActionUsedThisTurn?: boolean;

  // Psion Passive Fields
  psychicResistance?: boolean;
  mentalSaveBonus?: number;
  initiativeBonus?: number;
  cannotBeSurprised?: boolean;
  seeInvisible?: boolean;
  immuneBlinded?: boolean;
  trapDetectionBonus?: number;
  freeDisengage?: boolean;
}
```

### CombatAction

```typescript
export type CombatActionType =
  | 'attack' | 'cast' | 'defend' | 'item' | 'flee'
  | 'racial_ability' | 'psion_ability' | 'class_ability';

export interface CombatAction {
  type: CombatActionType;
  actorId: string;
  targetId?: string;
  resourceId?: string;           // Weapon/spell/item identifier
  spellSlotLevel?: number;
  racialAbilityName?: string;
  targetIds?: string[];           // For AoE abilities
  psionAbilityId?: string;
  classAbilityId?: string;
}
```

**8 Action Types:** attack, cast, defend, item, flee, racial_ability, psion_ability, class_ability

### Round Log Structure

```typescript
export interface TurnLogEntry {
  round: number;
  actorId: string;
  action: CombatActionType;
  result: TurnResult;             // Discriminated union by action type
  statusTicks: StatusTickResult[];  // DoT/HoT ticks at turn START
}

export interface StatusTickResult {
  combatantId: string;
  effectName: StatusEffectName;
  damage?: number;
  healing?: number;
  expired: boolean;
  hpAfter: number;
  killed: boolean;
}
```

Each action produces one `TurnLogEntry`. Status effect ticks happen at the START of a combatant's turn, before their action resolves.

### CombatResult

The `CombatState` object IS the result. When combat ends:
- `status` → `'COMPLETED'`
- `winningTeam` set to the winning team ID
- Full `log: TurnLogEntry[]` preserved
- All `combatants` frozen at final state

### TurnResult Types (Discriminated Union)

**AttackResult:**
```typescript
{
  type: 'attack';
  actorId: string;
  targetId: string;
  attackRoll: number;           // d20 (1-20)
  attackTotal: number;          // roll + all modifiers
  attackModifiers?: [{ source: string; value: number }];
  targetAC: number;
  hit: boolean;
  critical: boolean;
  damageRoll: number;
  damageRolls?: number[];
  damageModifiers?: [{ source: string; value: number }];
  damageType?: string;
  totalDamage: number;
  targetHpBefore?: number;
  targetHpAfter: number;
  targetKilled: boolean;
  weaponName?: string;
  weaponDice?: string;
  negatedAttack?: boolean;      // Precognitive Dodge
}
```

**CastResult:**
```typescript
{
  type: 'cast';
  spellName: string; spellLevel: number; slotExpended: number;
  damageRoll?: number; totalDamage?: number; healAmount?: number;
  saveRequired: boolean; saveRoll?: number; saveTotal?: number; saveDC?: number; saveSucceeded?: boolean;
  statusApplied?: StatusEffectName; statusDuration?: number;
  targetHpAfter: number; targetKilled: boolean;
}
```

**DefendResult:** `{ type: 'defend'; acBonusGranted: number }` (always +2)

**ItemResult:** `{ type: 'item'; itemName: string; healAmount?; damageAmount?; statusApplied?; statusRemoved?; targetHpAfter }`

**FleeResult:** `{ type: 'flee'; fleeRoll: number; fleeDC: number; success: boolean }`

**RacialAbilityResult:** `{ type: 'racial_ability'; abilityName; success; description; targetIds?; damage?; healing?; statusApplied? }`

**PsionAbilityResult:** `{ type: 'psion_ability'; abilityName; abilityId; damage?; saveRequired; saveRoll?; saveDC?; saveSucceeded?; statusApplied?; controlled?; banished?; description; targetHpAfter?; targetKilled? }`

**ClassAbilityResult:**
```typescript
{
  type: 'class_ability';
  abilityId: string; abilityName: string; effectType: string;
  damage?: number; healing?: number; selfHealing?: number;
  buffApplied?: string; buffDuration?: number;
  debuffApplied?: string; debuffDuration?: number;
  statusApplied?: StatusEffectName; statusDuration?: number;
  statModifiers?: Record<string, number>;
  saveRequired?: boolean; saveType?: string; saveDC?: number;
  saveRoll?: number; saveTotal?: number; saveSucceeded?: boolean;
  fleeAttempt?: boolean; fleeSuccess?: boolean;
  cleansedEffects?: string[];
  description: string;
  targetHpAfter?: number; actorHpAfter?: number; targetKilled?: boolean;
  fallbackToAttack?: boolean;
  perTargetResults?: Array<{      // AoE per-target
    targetId: string; targetName: string; damage?: number; healing?: number;
    statusApplied?: string; hpAfter: number; killed: boolean;
  }>;
  strikeResults?: Array<{         // Multi-attack
    strikeNumber: number; hit: boolean; crit: boolean; damage: number;
    attackRoll?: number; attackTotal?: number; targetAc?: number;
  }>;
  totalStrikes?: number; strikesHit?: number;
  goldStolen?: number;
  bonusLootRoll?: boolean;
  peacefulResolution?: boolean;
}
```

### Modifier Calculation Pipeline

**Attack Roll:**
1. Stat modifier (STR or DEX based on weapon)
2. Proficiency bonus
3. Weapon bonus
4. Status effect modifiers (`STATUS_EFFECT_DEFS[effect.name].attackModifier`)
5. Racial passive modifiers (`getPassiveModifiers()` → `attackBonus`)
6. Class ability buff modifiers (`getBuffAttackMod()`)
7. Class ability special mods (`classAbilityAttackMods.accuracyMod`, `autoHit`, `ignoreArmor`, `critBonus`)
8. Advantage vs Low HP (roll d20 twice, take better)
9. First Strike auto-crit check

**Damage Roll:**
1. Weapon dice + stat modifier + weapon bonus
2. Critical: double weapon dice
3. Racial modifiers: `damageMultiplier` (e.g., Orc +25%), `damageFlatBonus`, `extraCritDice`
4. Class ability buff damage (`getBuffDamageMod()`)
5. Buff consumption (single-use buffs removed)
6. Bonus damage from source (MECH-5)
7. Poison application from charges
8. Damage reduction (`getBuffDamageReduction()`)

**AC Calculation:**
1. Base: 10 + DEX modifier (or equipment AC)
2. Defend stance: +2
3. Status effect AC modifiers
4. Racial passive AC bonus
5. Class ability buff AC (`getBuffAcMod()`)

---

## 3. Combat Log Database

### Schema Model

```prisma
model CombatLog {
  id        String   @id @default(uuid())
  sessionId String   @map("session_id")
  round     Int
  actorId   String   @map("actor_id")
  action    String
  result    Json     @default("{}")
  createdAt DateTime @default(now()) @map("created_at")

  session CombatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([sessionId, round])
  @@index([actorId])
  @@map("combat_logs")
}
```

### Stored Data

- **id**: UUID
- **sessionId**: FK to CombatSession (cascade delete)
- **round**: Combat round number (1-indexed)
- **actorId**: Character or monster UUID
- **action**: Action type string ('attack', 'cast', 'defend', 'item', 'flee', 'racial_ability', 'psion_ability', 'class_ability')
- **result**: Full `TurnResult` object as JSON (polymorphic — discriminated by action field)
- **createdAt**: Auto-set timestamp

### Round-by-Round Storage: YES

Each action creates ONE `CombatLog` record immediately after `resolveTurn`:

```typescript
const lastEntry = newState.log[newState.log.length - 1];
if (lastEntry) {
  await prisma.combatLog.create({
    data: {
      sessionId,
      round: lastEntry.round,
      actorId: lastEntry.actorId,
      action: lastEntry.action,
      result: lastEntry.result as object,
    },
  });
}
```

Written in 3 places: after monster auto-turn, after player action, after monster follow-up turn.

### Existing Query Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/combat/pve/state` | GET | Returns active combat (Redis) or completed session with full `combatLogs` from DB |

Query pattern:
```typescript
const session = await prisma.combatSession.findUnique({
  where: { id: sessionId },
  include: {
    combatLogs: { orderBy: { createdAt: 'asc' } },
    participants: true,
  },
});
```

### Data Gaps

- **No dedicated combat history endpoint** — logs are only accessible via `/state` for a specific session
- **No character combat history** — despite the `actorId` index, no endpoint queries all combats for a character
- **StatusTickResults NOT persisted separately** — they're inside the TurnLogEntry result JSON but not queryable independently
- **No aggregate combat stats** — win/loss ratios, average damage, etc. not pre-computed
- **Session metadata** not in CombatLog — the CombatSession model stores type, status, winnerId but not easily joined for analytics

---

## 4. Race Data Inventory

### Race Interface

```typescript
export interface RaceDefinition {
  id: string;
  name: string;
  tier: 'core' | 'common' | 'exotic';
  lore: string;
  trait: { name: string; description: string };
  statModifiers: StatModifiers;       // { str, dex, con, int, wis, cha }
  abilities: RacialAbility[];
  professionBonuses: ProfessionBonus[];
  gatheringBonuses?: GatheringBonus[];
  subRaces?: SubRaceOption[];
  homelandRegion: string;
  startingTowns: string[];
  specialMechanics?: Record<string, any>;
  exclusiveZone?: string;
}

export interface RacialAbility {
  name: string;
  description: string;
  levelRequired: number;
  type: 'active' | 'passive';
  effectType: string;
  effectValue: any;
  cooldownSeconds?: number;
  duration?: number;
  targetType: 'self' | 'party' | 'enemy' | 'aoe';
}

export interface ProfessionBonus {
  professionType: string;
  speedBonus: number;
  qualityBonus: number;
  yieldBonus: number;
  xpBonus: number;
}

export interface SubRaceOption {
  id: string;
  name: string;
  description: string;
  bonusStat?: string;
  bonusValue?: number;
  specialPerk?: string;
  element?: string;
  resistance?: string;
}
```

### Total Races: 20

### File Listing

| # | Race | In-Game Name | File | Tier | Abilities | Starting Towns |
|---|------|-------------|------|------|-----------|----------------|
| 1 | Human | Humans | `shared/src/data/races/core/human.ts` | Core | 6 | 5 |
| 2 | Elf | Elves | `shared/src/data/races/core/elf.ts` | Core | 6 | 5 |
| 3 | Dwarf | Dwarves | `shared/src/data/races/core/dwarf.ts` | Core | 6 | 5 |
| 4 | Halfling | Harthfolk | `shared/src/data/races/core/harthfolk.ts` | Core | 6 | 5 |
| 5 | Orc | Orcs | `shared/src/data/races/core/orc.ts` | Core | 6 | 5 |
| 6 | Tiefling | Nethkin | `shared/src/data/races/core/nethkin.ts` | Core | 6 | 5 |
| 7 | Dragonborn | Drakonid | `shared/src/data/races/core/drakonid.ts` | Core | 5 | 5 |
| 8 | Half-Elf | Half-Elf | `shared/src/data/races/common/halfElf.ts` | Common | 4 | 3 |
| 9 | Half-Orc | Half-Orc | `shared/src/data/races/common/halfOrc.ts` | Common | 6 | 3 |
| 10 | Gnome | Gnome | `shared/src/data/races/common/gnome.ts` | Common | 1 | 3 |
| 11 | Merfolk | Merfolk | `shared/src/data/races/common/merfolk.ts` | Common | 6 | 3 |
| 12 | Beastfolk | Beastfolk | `shared/src/data/races/common/beastfolk.ts` | Common | 4 | 3 |
| 13 | Faefolk | Faefolk | `shared/src/data/races/common/faefolk.ts` | Common | 5 | 3 |
| 14 | Goliath | Goliath | `shared/src/data/races/exotic/goliath.ts` | Exotic | 3 | 2 |
| 15 | Drow | Nightborne | `shared/src/data/races/exotic/nightborne.ts` | Exotic | 7 | 2 |
| 16 | Firbolg | Mosskin | `shared/src/data/races/exotic/mosskin.ts` | Exotic | 5 | 2 |
| 17 | Warforged | Forgeborn | `shared/src/data/races/exotic/forgeborn.ts` | Exotic | 6 | 1 |
| 18 | Genasi | Elementari | `shared/src/data/races/exotic/elementari.ts` | Exotic | 6 | 2 |
| 19 | Revenant | Revenant | `shared/src/data/races/exotic/revenant.ts` | Exotic | 5 | 1 |
| 20 | Changeling | Changeling | `shared/src/data/races/exotic/changeling.ts` | Exotic | 5 | 0 |

### Ability Format Example

```typescript
{
  name: 'Rally the People',
  description: 'Party buff: +2 all stats for 1 hour',
  levelRequired: 10,
  type: 'active',
  effectType: 'stat_buff',
  effectValue: { allStats: 2 },
  cooldownSeconds: 86400,
  duration: 3600,
  targetType: 'party',
}
```

### Sub-Race Format

**Drakonid (7 ancestries):**
```typescript
{ id: 'red', name: 'Red Drakonid', description: 'Fire ancestry, 15ft Cone breath shape', element: 'fire', resistance: 'fire' }
```

**Beastfolk (6 clans):**
```typescript
{ id: 'wolf', name: 'Wolf Clan', description: 'Pack Tactics: +2 attack when ally is adjacent', bonusStat: 'dex', bonusValue: 1, specialPerk: 'Pack Tactics: +2 attack when ally is adjacent' }
```

**Elementari (4 elements):**
```typescript
{ id: 'fire', name: 'Fire Elementari', description: '+25% smelting speed...', bonusStat: 'cha', bonusValue: 2, element: 'fire', resistance: 'fire' }
```

### Stat Modifier Format Example

```typescript
// Human: balanced
statModifiers: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }

// Elf: graceful, fragile
statModifiers: { str: 0, dex: 3, con: -1, int: 2, wis: 2, cha: 1 }

// Dwarf: sturdy, slow
statModifiers: { str: 2, dex: -1, con: 3, int: 1, wis: 1, cha: 0 }
```

### Profession Bonus Format Example

```typescript
// Merfolk
professionBonuses: [
  { professionType: 'fishing', speedBonus: 0, qualityBonus: 0, yieldBonus: 0.40, xpBonus: 0 },
  { professionType: 'pearl_diving', speedBonus: 0, qualityBonus: 0, yieldBonus: 0.30, xpBonus: 0 },
  { professionType: 'alchemy', speedBonus: 0, qualityBonus: 0.20, yieldBonus: 0, xpBonus: 0 },
  { professionType: 'land_gathering', speedBonus: -0.15, qualityBonus: 0, yieldBonus: 0, xpBonus: 0 },
]
```

---

## 5. Class & Skill Data Inventory

### Skill Tree Interface

```typescript
export interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
  class: string;
  specialization: string;
  tier: number;
  effects: Record<string, unknown>;
  cooldown: number;
  prerequisiteAbilityId?: string;
  levelRequired: number;
}

export interface SpecializationDefinition {
  name: string;
  description: string;
  abilities: AbilityDefinition[];
}

export interface ClassDefinition {
  name: string;
  specializations: SpecializationDefinition[];
}
```

### Ability Interface

Each ability has: id, name, description, class, specialization, tier (1-6), effects (type-specific), cooldown (rounds, 0=none), prerequisiteAbilityId (optional), levelRequired.

**ID format:** `{class}-{spec}-{number}` (e.g., `war-ber-1`, `psi-tel-6`)

### Classes: 7

`warrior`, `mage`, `rogue`, `cleric`, `ranger`, `bard`, `psion`

### Specializations: 21

| Class | Specializations |
|-------|----------------|
| Warrior | Berserker, Guardian, Warlord |
| Mage | Elementalist, Necromancer, Enchanter |
| Rogue | Assassin, Thief, Swashbuckler |
| Cleric | Healer, Paladin, Inquisitor |
| Ranger | Beastmaster, Sharpshooter, Tracker |
| Bard | Diplomat, Battlechanter, Lorekeeper |
| Psion | Telepath, Seer, Nomad |

### Abilities per Class: 18 (6 per specialization)

### Total Abilities: 126

**Warrior (18):**
- Berserker: Reckless Strike, Blood Rage, Cleave, Frenzy, Berserker Rage, Undying Fury
- Guardian: Shield Bash, Fortify, Taunt, Shield Wall, Iron Bulwark, Unbreakable
- Warlord: Rally Cry, Commanding Strike, Tactical Advance, Inspiring Presence, Warlords Decree, Legendary Commander

**Mage (18):**
- Elementalist: Fireball, Frost Lance, Chain Lightning, Elemental Shield, Meteor Strike, Arcane Mastery
- Necromancer: Life Drain, Shadow Bolt, Corpse Explosion, Bone Armor, Soul Harvest, Lichdom
- Enchanter: Arcane Bolt, Enfeeble, Haste, Arcane Siphon, Polymorph, Spell Weaver

**Rogue (18):**
- Assassin: Backstab, Vanish, Poison Blade, Ambush, Death Mark, Shadow Mastery
- Thief: Pilfer, Smoke Bomb, Quick Fingers, Disengage, Mug, Treasure Sense
- Swashbuckler: Riposte, Dual Strike, Evasion, Flurry of Blades, Dance of Steel, Untouchable

**Cleric (18):**
- Healer: Healing Light, Purify, Regeneration, Divine Shield, Resurrection, Miracle
- Paladin: Smite, Holy Armor, Consecrate, Judgment, Divine Wrath, Avatar of Light
- Inquisitor: Denounce, Penance, Silence, Purging Flame, Excommunicate, Inquisitors Verdict

**Ranger (18):**
- Beastmaster: Call Companion, Wild Bond, Pack Tactics, Bestial Fury, Alpha Predator, Spirit Bond
- Sharpshooter: Aimed Shot, Multi-Shot, Piercing Arrow, Headshot, Rain of Arrows, Eagles Eye
- Tracker: Lay Trap, Snare, Hunters Mark, Explosive Trap, Predator Instinct, Master Tracker

**Bard (18):**
- Diplomat: Charming Words, Silver Tongue, Soothing Presence, Diplomats Gambit, Enthrall, Legendary Charisma
- Battlechanter: War Song, Discordant Note, Marching Cadence, Shatter, Crescendo, Epic Finale
- Lorekeeper: Analyze, Recall Lore, Exploit Weakness, Arcane Insight, Tome of Secrets, Omniscient

**Psion (18):**
- Telepath: Mind Spike, Thought Shield, Psychic Crush, Dominate, Mind Shatter, Absolute Dominion
- Seer: Foresight, Danger Sense, Precognitive Dodge, Third Eye, Temporal Echo, Prescient Mastery
- Nomad: Blink Strike, Phase Step, Dimensional Pocket, Translocation, Rift Walk, Banishment

### Ability Effect Types (unique)

`damage`, `aoe_damage`, `buff`, `debuff`, `status`, `heal`, `hot`, `drain`, `passive`, `summon`, `teleport_attack`, `counter`, `trap`, `control`, `multi_attack`, `steal`, `companion`, `dispel`, `death_prevention`, `special`

### Ability Lookup Method

```typescript
export const ALL_ABILITIES: AbilityDefinition[] = [
  ...warriorAbilities, ...mageAbilities, ...rogueAbilities,
  ...clericAbilities, ...rangerAbilities, ...bardAbilities, ...psionAbilities,
];

export const ABILITIES_BY_CLASS: Record<string, AbilityDefinition[]> = {
  warrior: warriorAbilities, mage: mageAbilities, rogue: rogueAbilities,
  cleric: clericAbilities, ranger: rangerAbilities, bard: bardAbilities, psion: psionAbilities,
};

// In combat: lookup by abilityId via Map
const abilityMap = new Map<string, AbilityDefinition>();
for (const a of ALL_ABILITIES) {
  abilityMap.set(a.id, a);
}
```

---

## 6. Racial Combat Abilities Detail

### Ability Data Structure

```typescript
export interface RacialAbilityResult {
  success: boolean;
  abilityName: string;
  description: string;
  state: CombatState;
  combatLog: RacialCombatLogEntry[];
}

export interface RacialCombatLogEntry {
  type: 'racial_ability';
  actorId: string;
  abilityName: string;
  targetIds?: string[];
  damage?: number;
  healing?: number;
  statusApplied?: string;
  statusDuration?: number;
  message: string;
}

export interface RacialCombatTracker {
  usesRemaining: Record<string, number>;
  triggeredThisCombat: Set<string>;
  activeBuffs: Record<string, { remainingRounds: number; data: Record<string, unknown> }>;
}

export interface PassiveModifiers {
  acBonus: number;
  attackBonus: number;
  damageMultiplier: number;       // 1.0 = no change
  damageFlatBonus: number;
  extraCritDice: number;
  saveBonus: number;
  rangedAdvantage: boolean;
  reflectMeleeDamage: number;
  statBonuses: Partial<CharacterStats>;
}
```

### Total: 103 (in code; docs say 121)

**Note:** The CLAUDE.md says "121 racial abilities" but the actual code has **103 abilities** across all 20 races. Discrepancy is because several races have fewer than 6 abilities (Gnome: 1, Goliath: 3, Half-Elf: 4, Beastfolk: 4, Drakonid: 5, Faefolk: 5, Mosskin: 5, Revenant: 5, Changeling: 5).

### By Category

**Passive abilities (always-on in combat):**
- Stat bonuses (Draconic Scales +2 AC, Titan's Grip +1d8 damage)
- AC bonuses (Flutter, Integrated Armor)
- Damage modifiers (Blood Fury +25% below 50% HP, Apex Predator +30%)
- Resistance/Immunity (Poison Mastery, Hellish Resistance)
- Ranged advantage (Elven Accuracy)
- Save bonuses (Dwarven Resilience +3 vs poison)
- Reflect melee damage (Infernal Rebuke 1d6 fire)

**Active abilities (triggered during combat):**
- Party buffs (Rally the People, Clan Warhorn, Alpha's Howl)
- AoE attacks (Breath Weapon 2d6-4d8, Tsunami Strike 3d8, Elemental Burst 3d8, Earthshaker)
- Crowd control (Frightful Presence, Dominate NPC)
- Stealth (Spirit Walk invisibility, Shadow Step)
- Transformation (Beast Form, Siege Mode, Guardian Form, Primordial Awakening)
- Life drain (Life Drain, Soul Bargain)
- Summon (Call of the Deep)

**Reactive/conditional abilities:**
- Death prevention (Relentless Endurance → 1 HP)
- HP-triggered (Ancestral Fury below 25% → +5 STR/CON)
- Rerolls (Indomitable Will, Harthfolk Luck)

### Resolution Function Signature

```typescript
export function resolveRacialAbility(
  state: CombatState,
  actorId: string,
  abilityName: string,
  race: string,
  level: number,
  tracker: RacialCombatTracker,
  targetIds?: string[],
  subRace?: { id: string; element?: string } | null,
): RacialAbilityResult
```

### What Ability Execution Returns

```typescript
{
  success: boolean,                    // Did ability resolve?
  abilityName: string,                 // Ability display name
  description: string,                 // Effect description
  state: CombatState,                  // Modified combat state
  combatLog: RacialCombatLogEntry[],   // Array of log entries (damage, status, messages)
}
```

---

## 7. Item & Equipment Inventory

### Item Interface

**Recipe Types:**
```typescript
export interface RecipeDefinition {
  recipeId: string;
  name: string;
  professionRequired: CraftingProfession;
  levelRequired: number;
  inputs: RecipeInput[];
  outputs: RecipeOutput[];
  craftTime: number;    // minutes
  xpReward: number;
  tier: number;         // 1-5
}
```

**Finished Goods (weapons, armor) extend with:**
```typescript
outputItemType: 'WEAPON' | 'ARMOR';
equipSlot: string;
classRestrictions?: string[];
outputStats: WeaponStats | ArmorStats;
```

**Equipment Stat Calculation Output:**
```typescript
export interface CalculatedItemStats {
  baseStats: ItemStats;
  qualityMultiplier: number;
  enchantmentBonuses: ItemStats;
  finalStats: ItemStats;
}

export interface EquipmentTotals {
  totalAC: number;
  totalDamage: number;
  totalStatBonuses: Record<string, number>;
  totalResistances: Record<string, number>;
  items: Array<{ slot: string; itemId: string; itemName: string; quality: ItemRarity; stats: CalculatedItemStats }>;
}
```

### Weapon Stats Format with Example

```typescript
export interface WeaponStats {
  baseDamage: number;
  damageType: DamageType;      // 'slashing' | 'piercing' | 'bludgeoning'
  speed: number;
  requiredStr: number;
  requiredDex: number;
  durability: number;
  levelToEquip: number;
  twoHanded?: boolean;
  range?: number;
}
```

**Example — Copper Sword:**
```typescript
outputStats: { baseDamage: 6, damageType: 'slashing', speed: 8, requiredStr: 5, requiredDex: 4, durability: 70, levelToEquip: 1 }
```

### Armor Stats Format with Example

```typescript
export interface ArmorStats {
  armor: number;
  magicResist?: number;
  durability: number;
  levelToEquip: number;
  requiredStr?: number;
  movementPenalty?: number;
  stealthPenalty?: number;
}
```

**Example — Copper Helm:**
```typescript
outputStats: { armor: 4, durability: 60, levelToEquip: 1, requiredStr: 4, movementPenalty: 0, stealthPenalty: 1 }
```

### Consumable Format with Example

```typescript
export interface ConsumableStats {
  effect: ConsumableEffect;
  magnitude: number;
  duration: number;       // minutes (0 = instant)
  stackSize: number;
  secondaryEffect?: ConsumableEffect;
  secondaryMagnitude?: number;
}
```

**Example — Minor Healing Potion:**
```typescript
consumableStats: { effect: 'heal_hp', magnitude: 15, duration: 0, stackSize: 20 }
```

### Equipment → Combat Stat Pipeline

1. Load ItemTemplate base stats (from recipe outputStats)
2. Apply quality multiplier: `POOR: 0.7, COMMON: 1.0, FINE: 1.15, SUPERIOR: 1.3, MASTERWORK: 1.5, LEGENDARY: 1.8`
3. Load enchantments from `Item.enchantments` JSON array
4. Sum enchantment bonuses
5. Final stats = base × quality + enchantments
6. Aggregate across all equipped items → `EquipmentTotals`

### Item Counts by Category

| Category | Count | Source Files |
|----------|-------|--------------|
| Processing recipes | 54 | smelter.ts (10), tanner.ts (3), tailor.ts (4), mason.ts (12), woodworker.ts (25) |
| Weapon recipes | 47 | weapons.ts (33), ranged-weapons.ts (14) |
| Armor/Finished goods | 90 | armor.ts (62), blacksmith.ts (28) |
| Consumable recipes | 56 | consumables.ts |
| Accessories/Special | 42 | accessories.ts (12), enchantments.ts (13), housing.ts (11), mount-gear.ts (6) |
| Cook/Food | 9 | cook.ts |
| **Total** | **~298** | |

---

## 8. Monster Data

### Monster Interface

```typescript
interface MonsterDef {
  name: string;
  level: number;
  biome: BiomeType;
  regionName: string;
  stats: {
    hp: number; ac: number; attack: number; damage: string;
    speed: number; str: number; dex: number; con: number;
    int: number; wis: number; cha: number;
  };
  lootTable: {
    dropChance: number; minQty: number; maxQty: number;
    gold: number; itemTemplateName?: string;
  }[];
}
```

### Total Monsters: 21

| # | Name | Level | Biome | HP | AC | Attack | Damage | Sentient | Drop |
|---|------|-------|-------|----|----|--------|--------|----------|------|
| 1 | Goblin | 1 | HILLS | 24 | 12 | +3 | 1d4+1 | Yes | 1-5 gold |
| 2 | Wolf | 2 | FOREST | 15 | 11 | +4 | 1d6+1 | No | Animal Pelts |
| 3 | Bandit | 3 | PLAINS | 25 | 13 | +4 | 1d8+2 | Yes | 2-10 gold |
| 4 | Giant Rat | 1 | UNDERGROUND | 18 | 12 | +3 | 1d4+1 | No | Bones |
| 5 | Slime | 2 | SWAMP | 15 | 8 | +2 | 1d6 | No | Bones |
| 6 | Mana Wisp | 3 | SWAMP | 16 | 13 | +3 | 1d6+1 | No | Arcane Reagents |
| 7 | Bog Wraith | 4 | SWAMP | 22 | 12 | +4 | 1d6+2 | No | Arcane Reagents |
| 8 | Skeleton Warrior | 5 | SWAMP | 40 | 15 | +5 | 1d10+3 | Yes | 3-10 gold |
| 9 | Orc Warrior | 6 | BADLANDS | 50 | 14 | +6 | 1d12+4 | Yes | 5-15 gold |
| 10 | Giant Spider | 7 | UNDERGROUND | 45 | 13 | +6 | 1d10+3 | No | Bones |
| 11 | Arcane Elemental | 7 | VOLCANIC | 48 | 14 | +6 | 1d10+3 | No | Arcane Reagents |
| 12 | Dire Wolf | 8 | TUNDRA | 55 | 13 | +7 | 2d6+3 | No | Animal Pelts |
| 13 | Troll | 9 | SWAMP | 75 | 12 | +7 | 2d6+4 | Yes | 5-20 gold |
| 14 | Shadow Wraith | 9 | UNDERGROUND | 55 | 15 | +7 | 2d6+3 | No | Arcane Reagents |
| 15 | Ancient Golem | 12 | MOUNTAIN | 140 | 19 | +8 | 2d10+5 | No | Bones |
| 16 | Void Stalker | 13 | UNDERGROUND | 110 | 17 | +9 | 2d8+5 | No | Arcane Reagents |
| 17 | Young Dragon | 14 | TUNDRA | 150 | 18 | +10 | 2d10+6 | Yes | 20-80 gold |
| 18 | Hydra | 15 | COASTAL | 160 | 15 | +8 | 3d6+4 | No | Bones |
| 19 | Demon | 16 | VOLCANIC | 130 | 17 | +10 | 2d8+6 | Yes | 25-60 gold |
| 20 | Elder Fey Guardian | 16 | FOREST | 135 | 17 | +10 | 2d10+5 | No | Arcane Reagents |
| 21 | Lich | 18 | SWAMP | 120 | 17 | +9 | 3d6+5 | Yes | 30-100 gold |

### Per-Biome Breakdown

| Biome | Count | Level Range | Monsters |
|-------|-------|-------------|----------|
| SWAMP | 6 | 2-18 | Slime, Mana Wisp, Bog Wraith, Skeleton Warrior, Troll, Lich |
| UNDERGROUND | 4 | 1-13 | Giant Rat, Giant Spider, Shadow Wraith, Void Stalker |
| VOLCANIC | 2 | 7-16 | Arcane Elemental, Demon |
| TUNDRA | 2 | 8-14 | Dire Wolf, Young Dragon |
| FOREST | 2 | 2-16 | Wolf, Elder Fey Guardian |
| PLAINS | 1 | 3 | Bandit |
| MOUNTAIN | 1 | 12 | Ancient Golem |
| HILLS | 1 | 1 | Goblin |
| COASTAL | 1 | 15 | Hydra |
| BADLANDS | 1 | 6 | Orc Warrior |

### Stat Ranges

| Stat | Min | Max |
|------|-----|-----|
| HP | 15 (Wolf) | 160 (Hydra) |
| AC | 8 (Slime) | 19 (Ancient Golem) |
| Attack | +2 (Slime) | +10 (Young Dragon, Demon, Elder Fey Guardian) |
| Damage | 1d4+1 (Goblin, Giant Rat) | 3d6+5 (Lich) |

### Loot Table Format Examples

```typescript
// Gold drop (sentient)
{ dropChance: 0.9, minQty: 2, maxQty: 10, gold: 8 }

// Material drop (non-sentient)
{ dropChance: 0.6, minQty: 1, maxQty: 1, gold: 0, itemTemplateName: 'Animal Pelts' }

// Multi-drop table (Lich)
[
  { dropChance: 1.0, minQty: 30, maxQty: 100, gold: 80 },
  { dropChance: 0.5, minQty: 1, maxQty: 2, gold: 0 },
  { dropChance: 0.15, minQty: 1, maxQty: 1, gold: 0 },
]
```

### Monster Selection for Encounters

1. Route terrain string → `TERRAIN_TO_BIOME` regex (road-encounter.ts ~line 71) → BiomeType
2. Query monsters WHERE `biome = terrainToBiome(route.terrain)`
3. Filter by level range: `getMonsterLevelRange(charLevel)` returns {min, max}
4. Random selection from filtered pool

---

## 9. Combat Simulator Infrastructure

### Existing Simulation Endpoints (18 in `server/src/routes/admin/simulation.ts`, 982 lines)

| # | Endpoint | Method | Description |
|---|----------|--------|-------------|
| 1 | `/api/admin/simulation/seed` | POST | Create test bots with configurable distributions |
| 2 | `/api/admin/simulation/tick` | POST | Run one simulation tick |
| 3 | `/api/admin/simulation/run` | POST | Run N ticks sequentially |
| 4 | `/api/admin/simulation/stats` | GET | Distribution & economy stats |
| 5 | `/api/admin/simulation/start` | POST | Start continuous simulation loop |
| 6 | `/api/admin/simulation/pause` | POST | Pause running simulation |
| 7 | `/api/admin/simulation/resume` | POST | Resume paused simulation |
| 8 | `/api/admin/simulation/stop` | POST | Stop simulation (bots persist) |
| 9 | `/api/admin/simulation/status` | GET | Current state + bot summaries |
| 10 | `/api/admin/simulation/activity` | GET | Recent activity entries (max 200) |
| 11 | `/api/admin/simulation/config` | PATCH | Adjust speed/systems on the fly |
| 12 | `/api/admin/simulation/cleanup` | DELETE | Stop + delete ALL test data |
| 13 | `/api/admin/simulation/error-storm` | POST | Trigger error storm for testing |
| 14 | `/api/admin/simulation/focus` | POST | Focus all bots on one system |
| 15 | `/api/admin/simulation/history` | GET | Tick history array |
| 16 | `/api/admin/simulation/bot-logs` | GET | Per-bot daily logs with filters |
| 17 | `/api/admin/simulation/export` | GET | Download Excel report (20+ sheets) |
| 18 | `/api/admin/simulation/combat-detail` | GET | Download combat round JSON |

### Current Sim Capabilities

**Bot Simulation (admin API):**
- Seed N bots with configurable race/class/profession/level/gold distribution
- 9-tier priority chain: Harvest → Collect Rancher → Craft → Gather → Buy → Jobs → Combat Travel → General Travel → Gather Fallback → Idle
- Full combat via road encounters (P6 priority)
- System focus mode (force all bots to one activity)
- Real-time monitoring with adaptive polling
- Excel export with 20+ analysis sheets

**CLI Combat Simulator (`server/src/scripts/combat-sim*.ts`):**
- `combat-sim.ts` (222 lines) — CLI entry point
- `combat-sim-runner.ts` (980 lines) — Instrumented round-by-round loop
- `combat-sim-logger.ts` (633 lines) — Colored console + JSON file output
- `combat-sim-scenarios.ts` (3,762 lines) — **34 preset combat scenarios**
- `combat-sim-config.json` — Custom scenario template
- `combat-sim-results/` — Output directory (~50 JSON results)

**npm script:** `npm run combat-sim -- --scenario=basic-melee --seed=42 --verbose`

**34 Preset Scenarios include:** basic-melee, spell-vs-melee, status-effects, flee-test, racial-abilities, team-fight (3v3), AoE, multi-hit, stun/freeze/poison, companion interception, death prevention, and 23 more.

### Current Sim Limitations

- `/combat/pve/start` endpoint is disabled (PvE only via road encounters)
- No frontend player-facing combat sim UI (only admin dashboard)
- No real-time WebSocket streaming of individual combat rounds
- Monster AI is simple (`autoAttackLowestHp` logic only)
- No combat replay/visualization tool
- No aggregate combat statistics dashboard
- No way to configure custom 1v1 duels from the admin panel

### Frontend Sim UI

The SimulationDashboardPage (1,546 lines) exists and shows bot simulation data (distributions, activity, bot roster, exports) but has **no dedicated combat viewer or combat-specific simulator interface**. Combat data is available via the Excel export (Combat Logs, Combat Rounds sheets) and JSON combat detail download.

### Sim Configuration Options

**Bot seed config:**
```typescript
{
  count: number (1-500),
  townIds: string[] | 'all',
  intelligence: number (0-100),
  raceDistribution: 'even' | 'realistic',
  classDistribution: 'even' | 'realistic',
  professionDistribution: 'even' | 'diverse',
  startingLevel: number (1-10) | 'diverse',
  startingGold: number (0-1000),
  namePrefix: string,
}
```

**CLI combat sim config:**
- Scenario selection (34 presets or custom JSON)
- Seeded PRNG (deterministic runs)
- Batch mode (N iterations with aggregated stats)
- Verbose logging toggle

### Class Ability Resolver

**File:** `server/src/lib/class-ability-resolver.ts` (1,898 lines)

Data-driven dispatch system with 12+ effect handlers:

```typescript
export function resolveClassAbility(
  state: CombatState, actor: Combatant, abilityId: string,
  targetId?: string, targetIds?: string[],
): { state: CombatState; result: ClassAbilityResult }
```

**Handlers:** handleDamage, handleHealing, handleStatus, handleAoE, handleCounter, handleTrap, handleSummon, handleSteal, handleCompanion, handleDispel, handleDeath, handleSpecial. Unimplemented effect types fall back to basic attack with warning.

---

## 10. Status Effects

### All Status Effects: 22

```typescript
export type StatusEffectName =
  | 'poisoned' | 'stunned' | 'blessed' | 'burning' | 'frozen'
  | 'paralyzed' | 'blinded' | 'shielded' | 'weakened' | 'hasted'
  | 'slowed' | 'regenerating' | 'dominated' | 'banished' | 'phased'
  | 'foresight' | 'taunt' | 'silence' | 'root' | 'skip_turn'
  | 'mesmerize' | 'polymorph';
```

### Each Effect's Mechanical Behavior

| Effect | Prevents Action | Attack Mod | AC Mod | Save Mod | DoT | HoT | Notes |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|-------|
| poisoned | No | -2 | 0 | 0 | 3/rnd | — | Configurable `damagePerRound` |
| stunned | YES | 0 | -2 | -4 | — | — | Cannot act |
| blessed | No | +2 | 0 | +2 | — | — | Buff |
| burning | No | 0 | 0 | 0 | 5/rnd | — | Fire DoT |
| frozen | YES | 0 | -4 | -2 | — | — | Cannot act, severe AC penalty |
| paralyzed | YES | 0 | -4 | -4 | — | — | Cannot act, worst penalties |
| blinded | No | -4 | -2 | 0 | — | — | Can't cast effectively |
| shielded | No | 0 | +4 | 0 | — | — | Barrier buff |
| weakened | No | -3 | 0 | -2 | — | — | Debuff |
| hasted | No | +2 | +2 | 0 | — | — | Speed buff |
| slowed | No | -2 | -2 | -2 | — | — | Movement debuff |
| regenerating | No | 0 | 0 | 0 | — | 5/rnd | Heal over time |
| dominated | YES | 0 | 0 | 0 | — | — | Mind control (attack allies) |
| banished | YES | 0 | 0 | 0 | — | — | Removed from combat |
| phased | No | 0 | +4 | 0 | — | — | Ethereal, hard to hit |
| foresight | No | 0 | +2 | +2 | — | — | Dodge & save buff |
| taunt | No | 0 | 0 | 0 | — | — | Must attack taunt source |
| silence | No | 0 | 0 | 0 | — | — | Cannot cast spells |
| root | No | 0 | -3 | 0 | — | — | Cannot flee |
| skip_turn | YES | 0 | 0 | 0 | — | — | Skips next action |
| mesmerize | YES | 0 | 0 | 0 | — | — | Breaks on damage |
| polymorph | No | -4 | -5 | -2 | — | — | Reduced to 1d4 damage |

**CC Statuses (8):** stunned, frozen, paralyzed, dominated, mesmerize, polymorph, root, skip_turn

### Duration Format

```typescript
export interface StatusEffect {
  id: string;                    // Unique per-application
  name: StatusEffectName;
  remainingRounds: number;       // Countdown per turn
  damagePerRound?: number;       // For DoT override
  sourceId: string;              // Who applied it
}
```

Duration decrements by 1 at the **start** of the affected combatant's turn, after DoT/HoT ticks.

### Application/Removal

**Application (`applyStatusEffect`):**
1. Check CC immunity (if `ccImmune` buff active, CC statuses blocked)
2. Create effect with unique ID
3. Replace existing instance of same name (no stacking)
4. Return updated combatant

**Removal:**
- Duration expiry (remainingRounds → 0)
- Cleanse items (remove first harmful effect)
- Mesmerize breaks on spell damage
- Control end when controlDuration expires

### Combat Log Display

**StatusTickResult (per-tick):**
```typescript
{
  combatantId: string;
  effectName: StatusEffectName;
  damage?: number;    // DoT
  healing?: number;   // HoT
  expired: boolean;
  hpAfter: number;
  killed: boolean;
}
```

Stored inside each `TurnLogEntry.statusTicks` array. Client displays as badges with name + remaining duration, DoT/HoT ticks shown in combat feed.

---

## 11. Admin API Patterns

### Auth Middleware

```typescript
// server/src/middleware/admin.ts
export function adminGuard(req, res, next) {
  authGuard(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}
```

### Response Format

**Success with data:**
```typescript
return res.json({
  data: [...],
  total: number,
  page: number,
  pageSize: number,
  totalPages: Math.ceil(total / pageSize),
});
```

**Success with message:** `{ message: string, ...metadata }`

**Error:** `{ error: string }`

### Pagination Pattern

```typescript
const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
const pageSize = Math.max(1, Math.min(100, parseInt(req.query.pageSize as string, 10) || 20));
const skip = (page - 1) * pageSize;

const [data, total] = await Promise.all([
  prisma.model.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
  prisma.model.count({ where }),
]);
```

### Error Handling

```typescript
try {
  // Route logic
} catch (error) {
  if (handlePrismaError(error, res, 'operation-name', req)) return;
  logRouteError(req, 500, '[Admin] Operation error', error);
  return res.status(500).json({ error: 'Internal server error' });
}
```

### Query Params

Common patterns: `page`, `pageSize` (default 20, max 100), `search` (case-insensitive), `race`, `characterClass`, `minLevel`/`maxLevel`. Multi-filter example in admin/characters.ts builds dynamic Prisma `where` clause.

### Validation Pattern (Zod)

```typescript
const schema = z.object({
  count: z.number().int().min(1).max(500).default(20),
  // ...
});

router.post('/endpoint', validate(schema), async (req, res) => {
  // req.body guaranteed to match schema
});
```

---

## 12. Implementation Recommendations

### Data Gaps That Need Filling

1. **No character combat history endpoint** — Need new API to query all combats for a character (the `actorId` index exists but no endpoint uses it)
2. **No aggregate combat statistics** — Win/loss ratios, average damage, kills per encounter not pre-computed
3. **No combat search/filter API** — Can't query combats by race, class, level range, biome, outcome
4. **StatusTickResults not independently queryable** — Embedded in JSON, would need parsing for status effect analytics
5. **No combat replay data format** — Current logs have all the data but no structured "replay" endpoint
6. **CombatSession metadata** — Need to verify what fields exist beyond type/status/winnerId (participants, timing, etc.)

### Whether Combat Logs Store Enough for Round-by-Round Replay: YES

The `CombatLog.result` JSON column stores the **full TurnResult discriminated union** with every dice roll, modifier breakdown, damage calculation, status tick, and HP change. Combined with the `CombatSession` participant data, this is sufficient for a complete round-by-round replay visualization. No data gaps for replay purposes.

### New API Endpoints Needed

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/combat/history` | Paginated combat session list with filters (race, class, level, biome, outcome, date range) |
| `GET /api/admin/combat/session/:id` | Full combat detail with round-by-round data |
| `GET /api/admin/combat/character/:id` | Combat history for a specific character |
| `GET /api/admin/combat/stats` | Aggregate combat statistics (win rates, damage averages, popular abilities) |
| `POST /api/admin/combat/simulate` | Run a custom 1v1 or team combat with configurable combatants (race, class, level, equipment) |
| `GET /api/admin/codex/races` | Race browser data (all 20 races with abilities, stats, bonuses) |
| `GET /api/admin/codex/classes` | Class browser data (all 7 classes, 21 specs, 126 abilities) |
| `GET /api/admin/codex/items` | Item browser data (~298 recipes with stats) |
| `GET /api/admin/codex/monsters` | Monster browser data (all 21 monsters) — already partially exists |
| `GET /api/admin/codex/status-effects` | All 22 status effects with mechanical descriptions |

### Shared Types That May Need Extending

- `CombatSession` model: may need additional queryable fields (biome, average_level, total_rounds, etc.)
- Status effect definitions: currently only in combat-engine.ts as a const object — may need shared export for codex display
- Monster loot table type: currently untyped JSON in DB, could benefit from shared type
- Combat replay type: a new structured format for the frontend replay viewer

### Estimated Scope

| Section | Scope | Rationale |
|---------|-------|-----------|
| **Codex (races, classes, items, monsters, status effects)** | **Medium** | All data exists in shared/src/data — need 4-5 read-only API endpoints + frontend browser pages. No new data to create. |
| **Combat viewer (past combats)** | **Medium** | Need 3-4 new API endpoints (history, session detail, character history, stats) + frontend combat log viewer with filtering. All data is already in DB. |
| **Combat simulator (admin panel)** | **Medium-Large** | The CLI sim framework exists with 34 scenarios and the full combat engine. Need a frontend UI to configure custom combats (pick race, class, level, gear) and display results. Backend endpoint already possible via existing engine. |
| **Round-by-round reports** | **Medium** | All round data is persisted in CombatLog.result JSON. Need frontend visualization: initiative order, per-round action timeline, HP tracking, status effect timeline, modifier breakdowns. This is primarily a frontend effort. |
