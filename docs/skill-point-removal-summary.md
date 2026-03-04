# Skill Point Removal & Auto-Grant Summary

## Overview

Removed the skill point system entirely. Specialization abilities are now auto-granted when a character reaches the required level (and has a specialization selected).

## New Level Schedule

All 126 abilities (7 classes x 3 specs x 6 abilities) updated:

| Tier | Old Level | New Level | Notes |
|------|-----------|-----------|-------|
| 1 | 1 | 10 | Aligns with specialization selection at level 10 |
| 2 | 5 | 14 | |
| 3 | 10 (Psion: 12) | 20 | |
| 4 | 18 | 25 | |
| 5 | 28 | 32 | |
| 6 (Capstone) | 40 | 40 | Unchanged |

## How Auto-Grant Works

**Hook location:** `server/src/services/ability-grants.ts` — `autoGrantAbilities(characterId)`

**Logic:**
1. Fetch character's class, specialization, and level
2. Filter abilities from `shared/src/data/skills/{class}.ts` where `specialization` matches AND `levelRequired <= level`
3. Check existing `CharacterAbility` rows — skip any already granted
4. For each new ability: ensure the `Ability` DB row exists, then create `CharacterAbility` row
5. Return list of newly granted ability IDs

**Called from:**
- `server/src/services/progression.ts` — `checkLevelUp()` (after level increment)
- `server/src/routes/skills.ts` — `POST /api/skills/specialize` (after specialization saved)

**Idempotent:** Safe to run multiple times — won't create duplicate abilities.

## Files Modified

### Shared Data (Level Requirements)
- `shared/src/data/skills/warrior.ts` — 18 abilities updated
- `shared/src/data/skills/mage.ts` — 18 abilities updated
- `shared/src/data/skills/rogue.ts` — 18 abilities updated
- `shared/src/data/skills/cleric.ts` — 18 abilities updated
- `shared/src/data/skills/ranger.ts` — 18 abilities updated
- `shared/src/data/skills/bard.ts` — 18 abilities updated
- `shared/src/data/skills/psion.ts` — 18 abilities updated (tier 3: 12→20)
- `shared/src/data/progression/xp-curve.ts` — Removed `SKILL_POINTS_PER_LEVEL`

### Database
- `database/prisma/schema.prisma` — Removed `unspentSkillPoints` field from Character model
- `database/prisma/migrations/20260304100000_remove_skill_points/migration.sql` — DROP COLUMN

### Backend (New)
- `server/src/services/ability-grants.ts` — New auto-grant service

### Backend (Modified)
- `server/src/services/progression.ts` — Removed skill point awarding, added auto-grant call
- `server/src/routes/skills.ts` — Removed `POST /api/skills/unlock`, removed `canUnlock`/`unspentSkillPoints` from tree response, added `status` field (unlocked/upcoming/locked), added auto-grant on specialize
- `server/src/socket/events.ts` — Replaced `skillPoints` with `abilitiesGranted` in level-up event
- `server/src/routes/admin/characters.ts` — Removed `unspentSkillPoints` from edit schema
- `server/src/lib/simulation/seed.ts` — Removed skill point seeding

### Tests
- `server/src/__tests__/setup.ts` — Removed `unspentSkillPoints` from test helpers
- `server/src/__tests__/progression.test.ts` — Removed unlock tests, added auto-grant test, adjusted test character levels

### Frontend
- `client/src/pages/SkillTreePage.tsx` — Removed unlock button/mutation, skill point counter; uses `status` field for display
- `client/src/pages/admin/AdminCharactersPage.tsx` — Removed skill points from edit form
- `client/src/components/LevelUpCelebration.tsx` — Shows abilities granted instead of skill points
- `client/src/hooks/useProgressionEvents.ts` — Replaced `skillPoints` with `abilitiesGranted`
- `client/src/services/socket.ts` — Updated LevelUpPayload type
- `client/src/components/codex/CodexMechanics.tsx` — Updated progression text

## Edge Cases

- **No respec system exists** — confirmed by codebase search. No cleanup needed.
- **Existing characters with skill points** — The DB column is dropped. Any existing unlocked abilities remain in `CharacterAbility` table.
- **Characters below level 10** — Have no abilities (tier 0 abilities will come in a separate prompt).
- **Combat simulator** — `buildAbilityQueue()` already filters by `levelRequired <= level` from shared data, so it automatically uses the new schedule.

## Removed Endpoint

`POST /api/skills/unlock` — Removed entirely. Abilities are auto-granted, no manual unlock needed.

## Skill Tree API Changes

`GET /api/skills/tree` response changes:
- Removed: `unspentSkillPoints`, `canUnlock` per ability
- Added: `status` per ability (`'unlocked'` | `'upcoming'` | `'locked'`)
