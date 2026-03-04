# Update CLAUDE.md: Race ID Mapping + Narrator Convention

Read `cat CLAUDE.md` before starting.

---

## TASK

Add two new sections to `CLAUDE.md` so future prompts have this info available.

### Addition 1: Race ID Mapping

Add a section under a relevant heading (conventions, reference data, or similar) that maps common race names to their in-game IDs:

```
## Race ID Reference

Released races use in-game IDs that differ from their common fantasy names:

| Common Name | In-Game ID | Status |
|---|---|---|
| Human | human | Released |
| Elf | elf | Released |
| Dwarf | dwarf | Released |
| Halfling | harthfolk | Released |
| Orc | orc | Released |
| Tiefling | nethkin | Released |
| Dragonborn | drakonid | Released |

Unreleased races: half-elf, half-orc, gnome, merfolk, beastfolk, faefolk, goliath, drow, firbolg, warforged, genasi, revenant, changeling

Always use in-game IDs in code, configs, and sim scripts — not common fantasy names.
```

**Before writing this, verify the exact IDs** by checking the race registry:

```typescript
import { RaceRegistry } from '@shared/data/races';
console.log(Object.keys(RaceRegistry));
```

Use whatever the registry actually says — don't assume my mapping above is correct. The 4 confirmed working IDs from the sim are: human, elf, dwarf, orc. The other 3 released races need verification.

### Addition 2: Narrator Template Convention

Add under conventions or a "when adding new content" section:

```
## Narrator Templates

When adding new abilities, monsters, or status effects, also add narrator templates in `shared/src/data/combat-narrator/templates.ts`. See `docs/combat-narrator.md` for the template format and fallback chain. New content without templates degrades gracefully (generic narration) but loses flavor.
```

### Addition 3: Batch Sim Race IDs

Add a note near any existing sim/testing conventions:

```
## Batch Combat Sim

CLI script at `server/src/scripts/batch-combat-sim.ts`. Use in-game race IDs (see Race ID Reference above). Common configs in `server/src/scripts/sim-configs/`.

Commands: run (--config or --grid), list, delete (--run-id), delete-all (--confirm)
npm shortcuts: sim:run, sim:list, sim:delete
```

---

## DEPLOYMENT

Commit and push only (no Docker build needed — CLAUDE.md is a dev reference, not deployed code):

```bash
git add CLAUDE.md
git commit -m "docs: add race ID mapping, narrator convention, batch sim reference to CLAUDE.md"
git push origin main
```

---

## DO NOT

- Do not modify any code files
- Do not deploy to Azure (this is docs-only)
- Do not change existing CLAUDE.md content — only add new sections
- Do not guess race IDs — verify from the registry
