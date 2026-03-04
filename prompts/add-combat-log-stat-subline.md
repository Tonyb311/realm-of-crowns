# Add Combatant Vital Stats Subline to Combat Log Entries

Read `cat CLAUDE.md` before starting.

---

## THE REQUEST

In the admin combat dashboard History tab, each combatant's action entry should show a **vital stats subline** immediately below the action header. This gives instant visibility into each combatant's state at that moment in the fight.

### Current Display

```
⚔ L3 Drakonid Warrior uses Reckless Strike
  Reckless Strike: 14 damage to Mana Wisp | self AC -2
  Deals 14 damage

✕ Mana Wisp attacks L3 Drakonid Warrior with Natural Attack
  ATTACK ROLL
    d20 = 12 ...
```

### Desired Display

```
⚔ L3 Drakonid Warrior uses Reckless Strike
  HP: 29/29 | AC: 12 | STR: +3 | DEX: +1 | CON: +2 | INT: +0 | WIS: +0 | CHA: -1
  Reckless Strike: 14 damage to Mana Wisp | self AC -2
  Deals 14 damage

✕ Mana Wisp attacks L3 Drakonid Warrior with Natural Attack
  HP: 16/16 | AC: 8 | STR: -2 | DEX: +1 | CON: +0 | INT: -3 | WIS: +0 | CHA: -4
  ATTACK ROLL
    d20 = 12 ...
```

The stat line should:
- Show **current HP / max HP** at the moment that combatant acts (BEFORE their action resolves, so you see what they had going into their turn)
- Show **current effective AC** (including any active buffs/debuffs — e.g., after Reckless Strike's -2 applies, the warrior's AC line should drop by 2 on subsequent rounds)
- Show **stat modifiers** (not raw scores) for the six stats: STR, DEX, CON, INT, WIS, CHA — formatted as +N or -N
- Be styled as a subdued/muted line (smaller font, dimmer color) so it doesn't visually compete with the action details
- Update per-round — if the warrior takes 10 damage in round 1, their HP line in round 2 should reflect the lower HP

## INVESTIGATION

### Step 1: Check what data is available in the round log entries

Query a recent encounter log and examine the `rounds` JSONB to see what combatant data is stored per round:

```bash
cd /d/realm_of_crowns
npx ts-node -e "
const { PrismaClient } = require('./database/prisma/generated/client');
const p = new PrismaClient();
p.combatEncounterLog.findFirst({
  where: { createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
  orderBy: { createdAt: 'desc' },
  select: { rounds: true }
}).then(r => { console.log(JSON.stringify(r?.rounds, null, 2)); p.\$disconnect(); });
"
```

Check:
- Is `hpAfter` tracked per combatant per round? (Likely yes — the HP timeline chart needs this)
- Are stat modifiers stored anywhere in the round data?
- Is the AC breakdown stored per round? (We added `acBreakdown` to `CombatantSnapshot` recently)
- Is there an `_encounterContext` entry at index 0 with combatant starting stats?

### Step 2: Determine what's available vs what needs to be added

**Likely already available:**
- HP per round (from `hpAfter` in round entries)
- Max HP (from `_encounterContext` combatant data)
- AC (from `acBreakdown` if stored, or from `_encounterContext`)

**Likely NOT stored but needed:**
- Stat modifiers per combatant — these might only be in the `_encounterContext` starting snapshot
- Current effective AC per round (base AC is static, but buffs/debuffs change it mid-fight)

If stat modifiers aren't stored per round, they're probably static (stats don't change mid-combat in this system). Pull them from `_encounterContext` and display the same values every round. That's fine — stats are fixed, only HP and AC change.

If effective AC isn't tracked per round, compute it from base AC + active status effects at that round.

### Step 3: Determine the best data source approach

**Option A (preferred):** If `_encounterContext` has combatant stats and the round entries have `hpAfter`, the frontend can compute everything it needs without backend changes. Pull stats from context, pull HP from the round, compute AC from base + active effects.

**Option B:** If the data isn't sufficient, add a `combatantState` snapshot to each round entry in `buildRoundsData()` in `combat-logger.ts`. This is more data per round but gives the frontend everything.

**Go with whichever option requires less backend change.** If Option A works, this is a frontend-only change.

### Step 4: Implement the frontend subline

**File:** `client/src/components/admin/combat/HistoryTab.tsx` (or the relevant sub-component that renders individual round entries)

Add a component like `CombatantStatLine`:

```tsx
function CombatantStatLine({ name, hp, maxHp, ac, stats }: {
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
}) {
  const mod = (stat: number) => {
    const m = Math.floor((stat - 10) / 2);
    return m >= 0 ? `+${m}` : `${m}`;
  };
  
  return (
    <div className="text-xs text-gray-500 mt-0.5 mb-1 font-mono">
      HP: {hp}/{maxHp} | AC: {ac} | 
      STR: {mod(stats.str)} | DEX: {mod(stats.dex)} | CON: {mod(stats.con)} | 
      INT: {mod(stats.int)} | WIS: {mod(stats.wis)} | CHA: {mod(stats.cha)}
    </div>
  );
}
```

Render this immediately below each combatant's action header line, before the roll details.

**Important:** The stat line shows the combatant's state at the START of their turn (before their action resolves). So:
- For HP: use the HP value from the PREVIOUS round's `hpAfter` for this combatant (or starting HP for round 1)
- For AC: use base AC modified by any active status effects at that point

### Step 5: Handle AC changes mid-combat

If Reckless Strike applies self AC -2 in round 1, the warrior's stat line in round 2 should show the reduced AC. Check if the round data tracks active status effects. If so, compute effective AC = base AC + sum of AC modifiers from active effects.

If status effects aren't tracked per round, at minimum show base AC with a note that buffs/debuffs may modify it. But ideally, track it.

---

## TESTING

1. All existing tests pass
2. Run a quick smoke sim if needed for fresh data:

```bash
npx ts-node server/src/scripts/batch-combat-sim.ts run --race orc --class warrior --level 3 --monster "Mana Wisp" --iterations 5 --notes "Verify stat subline display"
```

3. Check the admin dashboard History tab:
   - Every action entry has a stat subline
   - HP decreases over rounds as damage is taken
   - AC reflects any active buffs/debuffs
   - Stat modifiers are correct for the race/class combo
   - Subline is visually subdued (doesn't compete with action details)
   - Monster entries also have stat sublines

---

## DEPLOYMENT

```bash
git add -A
git commit -m "feat: combatant vital stats subline in admin combat log

- Shows HP/maxHP, AC, and stat modifiers below each action entry
- HP updates per round reflecting damage taken
- AC reflects active buffs/debuffs (e.g., Reckless Strike -2)
- Subdued styling (small mono font, muted color)"
git push origin main
docker build -t rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M) .
docker push rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
az containerapp update --name realm-of-crowns --resource-group realm-of-crowns-rg --image rocregistry.azurecr.io/realm-of-crowns:$(date +%Y%m%d%H%M)
```

---

## DO NOT

- Do not change combat engine logic
- Do not change how combat resolves
- Do not change ability definitions or balance values
- Do not modify the combat logger unless data is missing (prefer frontend-only if possible)
- Do not delete any sim data

## SUMMARY FOR CHAT

```
Combatant vital stats subline added to admin combat log:
- Every action entry shows: HP X/X | AC X | STR +X | DEX +X | CON +X | INT +X | WIS +X | CHA +X
- HP updates per round as damage is taken
- AC reflects active buffs/debuffs
- Stats pulled from encounter context (static) and round HP tracking (dynamic)
- Subdued styling below action header
Deployed: tag [TAG]
```
