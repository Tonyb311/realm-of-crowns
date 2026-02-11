# Political System

> Updated from implementation code. Last updated: 2026-02-10.

## Overview

Realm of Crowns features a full political simulation with **democratic elections**, **governance mechanics**, **law proposals**, **taxation**, and **inter-kingdom diplomacy** (war and peace). The political system operates at the **town** level (mayors) and **kingdom** level (rulers), with automated lifecycle management via cron jobs.

---

## Elections

**Source:** `server/src/routes/elections.ts`, `server/src/jobs/election-lifecycle.ts`

### Election Types

| Type | Scope | Description |
|------|-------|-------------|
| `MAYOR` | Town | Automatically created for any town that lacks a current mayor |
| `RULER` | Kingdom | Kingdom-level ruler elections |

Elections are town-scoped for mayors and kingdom-scoped for rulers. Each entity holds independent elections.

### Election Phases

| Phase | Duration | Description |
|-------|----------|-------------|
| `NOMINATIONS` | 24 hours | Characters can nominate themselves as candidates. |
| `VOTING` | 48 hours | Registered voters cast one vote each. |
| `COMPLETED` | -- | Votes are tallied; winner is appointed. |

Phase transitions are managed by a **cron job** that runs every 5 minutes (`election-lifecycle.ts`).

### Nomination Rules

- Must be a **resident** of the town (residency check).
- **Term limits**: Maximum **3 consecutive terms** as mayor of the same town (`MAX_CONSECUTIVE_TERMS = 3`).
- One nomination per character per election.

### Voting Rules

- One vote per character per election.
- **Cannot vote for yourself**.
- Must be a resident of the town holding the election.

### Vote Tallying

When the VOTING phase expires:
1. All votes are counted per candidate.
2. The candidate with the most votes wins (simple plurality).
3. The winner is appointed as mayor via database update.
4. If no votes were cast, no mayor is appointed and a new election is auto-created.

### Impeachment

- **Initiation**: `POST /elections/impeach` -- Any town resident can start an impeachment vote against the current mayor.
- **Duration**: 48 hours.
- **Resolution**: If a majority of voters support removal, the mayor is removed from office and a new election is automatically created.
- Processed by the election lifecycle cron job.

### Psion Perks in Elections

The Psion class has specialization-specific perks that affect election endpoints:

| Psion Spec | Perk Name | Effect |
|------------|-----------|--------|
| **Seer** | Election Oracle | When viewing candidates, Seers receive projected vote count data |
| **Telepath** | Mind Reader | When viewing candidates, Telepaths see a "sincerity score" on each candidate's platform |

These perks are implemented in `server/src/services/psion-perks.ts` and checked via `getPsionSpec()`.

### Election Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/elections/nominate` | Nominate self as candidate |
| `POST` | `/elections/vote` | Cast a vote |
| `GET` | `/elections/current` | Get current/active election for the character's town |
| `GET` | `/elections/results` | Get election results with vote counts (query params) |
| `GET` | `/elections/candidates/:electionId` | List candidates for an election |
| `POST` | `/elections/impeach` | Initiate impeachment |
| `POST` | `/elections/impeach/vote` | Vote on an active impeachment |

---

## Governance

**Source:** `server/src/routes/governance.ts`

### Law Proposals

Mayors and rulers can propose laws that affect their town or kingdom.

**5 Law Types:**

| Type | Description |
|------|-------------|
| `tax` | Modify tax rates on trade, income, or property |
| `trade` | Trade restrictions, embargoes against specific kingdoms |
| `military` | Military policy, conscription, defense spending |
| `building` | Construction projects, infrastructure improvements |
| `general` | Catch-all for other governance decisions |

### Law Voting

- **Who votes**: Council members + the ruler/mayor.
- **Threshold**: A law is **auto-activated** when it receives **3+ votes** with a simple majority.
- Laws that do not reach the threshold remain in a pending state.

### Tax System

- **Set Tax Rate**: `POST /governance/set-tax`
  - Only the **mayor** can set the town's tax rate.
  - Range: **0% to 25%** (hard cap enforced server-side).
- **Effective Tax Rate** (from `law-effects.ts`):
  - Base rate from TownPolicy + modifiers from active tax laws.
  - Final rate clamped to **0-50%** (laws can push it above the 25% direct cap).

### Tax Collection

**Source:** `server/src/jobs/tax-collection.ts`

- Runs as an **hourly cron job**.
- Collects taxes from **marketplace transactions** in each town.
- Tax revenue is deposited into the **town treasury**.

### Official Appointments

| Role | Appointed By | Description |
|------|-------------|-------------|
| `sheriff` | Mayor | Law enforcement for the town |
| `council` | Ruler or Mayor | Advisory council members who vote on laws |

- Endpoint: `POST /governance/appoint`

### Treasury Management

- Endpoint: `POST /governance/allocate-treasury`
- Mayor can allocate treasury funds to: **buildings**, **military**, **infrastructure**, **events**.
- Spending is deducted from the town treasury balance.

### Diplomacy

| Action | Endpoint | Description |
|--------|----------|-------------|
| Declare War | `POST /governance/declare-war` | Ruler declares war on another kingdom |
| Propose Peace | `POST /governance/propose-peace` | Ruler proposes a peace treaty |

- **War Status**: Checked via `getWarStatus()` and `getActiveWarsForKingdom()` in `law-effects.ts`.
- **Trade Impact**: Active wars trigger trade embargoes between the warring kingdoms (`getTradeRestrictions()`).

### Law Effects Service

**Source:** `server/src/services/law-effects.ts`

| Function | Purpose |
|----------|---------|
| `getEffectiveTaxRate(townId)` | Base rate + law modifiers, clamped 0-50% |
| `getTradeRestrictions(townId)` | Active embargo laws + war-based embargoes |
| `getWarStatus(kingdomId1, kingdomId2)` | Check if two kingdoms are at war |
| `isLawActive(lawId)` | Check if a specific law is currently in effect |
| `getActiveWarsForKingdom(kingdomId)` | List all active wars for a kingdom |

### Governance Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/governance/propose-law` | Propose a new law |
| `POST` | `/governance/vote-law` | Vote on a proposed law |
| `POST` | `/governance/set-tax` | Set town tax rate (mayor only, 0-25%) |
| `POST` | `/governance/appoint` | Appoint an official (sheriff or council) |
| `POST` | `/governance/allocate-treasury` | Allocate treasury funds |
| `POST` | `/governance/declare-war` | Declare war |
| `POST` | `/governance/propose-peace` | Propose peace |
| `GET` | `/governance/kingdom/:kingdomId` | Get kingdom info |
| `GET` | `/governance/laws` | List laws (with query param filters) |
| `GET` | `/governance/town-info/:townId` | Get town governance info |

---

## Lifecycle Automation

**Source:** `server/src/jobs/election-lifecycle.ts`, `server/src/jobs/tax-collection.ts`

| Job | Schedule | Description |
|-----|----------|-------------|
| Election Lifecycle | Every 5 minutes | Creates elections for mayor-less towns, transitions phases, tallies votes, resolves impeachments |
| Tax Collection | Every hour | Collects marketplace transaction taxes per town, deposits to treasury |

Both jobs are registered as cron tasks on server startup.

---

## Implementation Notes (P0/P1 Fixes)

- **Vote Deduplication**: The `LawVote` model (`@@unique([lawId, characterId])`) prevents duplicate law votes at the database level. The `/vote-law` endpoint checks for existing votes before creating a `LawVote` record, then recalculates `votesFor`/`votesAgainst` from `LawVote.count()` instead of blindly incrementing counters.
- **Election Population Threshold**: Elections are only created for towns with `MIN_ELECTION_POPULATION = 3` or more characters, preventing election lifecycle churn in empty towns.
- **Impeachment Majority**: Impeachment requires a majority of eligible voters in the town, not just more yes than no votes.
- **Treaty Gold Validation**: Treasury balance checks for treaty gold payments are performed inside the database transaction to prevent race conditions.
- **Tax Rate Sync**: The `set-tax` endpoint upserts both `TownPolicy.taxRate` AND `TownTreasury.taxRate` so all read paths return a consistent value.
- **Double Tax Prevention**: Marketplace tax is collected at purchase time in `market.ts`. The hourly `tax-collection.ts` cron only updates `lastCollectedAt` timestamps -- it does not re-calculate or re-deposit tax.
