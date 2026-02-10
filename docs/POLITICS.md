# Political System

> Auto-generated from implementation code. Last updated: 2026-02-08.

## Overview

Realm of Crowns features a full political simulation with **democratic elections**, **governance mechanics**, **law proposals**, **taxation**, and **inter-kingdom diplomacy** (war and peace). The political system operates at the **town** level (mayors) and **kingdom** level (rulers), with automated lifecycle management via cron jobs.

---

## Elections

**Source:** `server/src/routes/elections.ts`, `server/src/jobs/election-lifecycle.ts`

### Election Types

- **Mayor Elections**: Automatically created for any town that lacks a current mayor.
- Elections are town-scoped; each town holds independent elections.

### Election Phases

| Phase | Duration | Description |
|-------|----------|-------------|
| `NOMINATIONS` | 24 hours | Characters can nominate themselves as candidates. |
| `VOTING` | 48 hours | Registered voters cast one vote each. |
| `COMPLETED` | -- | Votes are tallied; winner is appointed. |

Phase transitions are managed by a **cron job** that runs every 5 minutes (`election-lifecycle.ts`).

### Nomination Rules

- Must be a **resident** of the town (residency check).
- **Term limits**: Maximum 3 consecutive terms as mayor of the same town.
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

- **Initiation**: `POST /elections/impeach` - Any town resident can start an impeachment vote against the current mayor.
- **Duration**: 48 hours.
- **Resolution**: If a majority of voters support removal, the mayor is removed from office and a new election is automatically created.
- Processed by the election lifecycle cron job.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/elections/nominate` | Nominate self as candidate |
| `POST` | `/elections/vote` | Cast a vote |
| `GET` | `/elections/current/:townId` | Get current/active elections for a town |
| `GET` | `/elections/results/:electionId` | Get election results with vote counts |
| `GET` | `/elections/candidates/:electionId` | List candidates |
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
- **Threshold**: A law is **auto-activated** when it receives 3+ votes with a simple majority.
- Laws that don't reach the threshold remain in a pending state.

### Tax System

- **Set Tax Rate**: `POST /governance/tax-rate`
  - Only the **mayor** can set the town's tax rate.
  - Range: **0% to 25%** (hard cap).
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

### Treasury Management

- Endpoint: `POST /governance/treasury/allocate`
- Mayor can allocate treasury funds to: **buildings**, **military**, **infrastructure**, **events**.
- Spending is deducted from the town treasury balance.

### Diplomacy

| Action | Endpoint | Description |
|--------|----------|-------------|
| Declare War | `POST /governance/war/declare` | Ruler declares war on another kingdom |
| Propose Peace | `POST /governance/peace/propose` | Ruler proposes a peace treaty |

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
| `POST` | `/governance/laws/propose` | Propose a new law |
| `POST` | `/governance/laws/vote` | Vote on a proposed law |
| `POST` | `/governance/tax-rate` | Set town tax rate (mayor only) |
| `POST` | `/governance/appoint` | Appoint an official |
| `POST` | `/governance/treasury/allocate` | Allocate treasury funds |
| `POST` | `/governance/war/declare` | Declare war |
| `POST` | `/governance/peace/propose` | Propose peace |
| `GET` | `/governance/kingdom/:kingdomId` | Get kingdom info |

---

## Lifecycle Automation

**Source:** `server/src/jobs/election-lifecycle.ts`, `server/src/jobs/tax-collection.ts`

| Job | Schedule | Description |
|-----|----------|-------------|
| Election Lifecycle | Every 5 minutes | Creates elections for mayor-less towns, transitions phases, tallies votes, resolves impeachments |
| Tax Collection | Every hour | Collects marketplace transaction taxes per town, deposits to treasury |

Both jobs are registered as cron tasks on server startup.
