# Part 3: Political, Social, Quest & Progression Systems

---

## A. Political System

### A.1 Election System

**Source**: `server/src/routes/elections.ts` (593 lines), `server/src/jobs/election-lifecycle.ts` (319 lines)

#### Player Guide: Running for Office

Elections in Realm of Crowns are automatic and cyclical. Every town holds periodic mayor elections, and kingdoms hold ruler elections. Here is how the full lifecycle works from a player's perspective:

1. **Nomination Phase (24 hours)**: When an election opens, any eligible resident can nominate themselves. You can submit an optional campaign platform (up to 2,000 characters). You must be a resident of the town to run for mayor, or already be a mayor to run for kingdom ruler.
2. **Voting Phase (48 hours from election start)**: After nominations close, voting opens. Each character gets exactly one vote per election. You cannot vote for yourself. You must be a resident of the town to vote in its mayor election.
3. **Results**: The candidate with the most votes wins. Ties are broken by earliest nomination time (first to nominate wins). If no one nominated, the election completes with no winner and a new cycle begins.
4. **Term Limits**: A character can hold the same office for a maximum of 3 consecutive terms. After 3 terms, they must sit out at least one term before running again.

#### Technical Breakdown: Election Lifecycle

| Aspect | Detail |
|---|---|
| **Cron Schedule** | Every 5 minutes (`*/5 * * * *`) |
| **Election Types** | `MAYOR` (town-level), `RULER` (kingdom-level) |
| **Phases** | `NOMINATIONS` -> `VOTING` -> `COMPLETED` |
| **Nomination Duration** | 24 hours (`NOMINATION_DURATION_HOURS = 24`) |
| **Voting Duration** | 24 hours after nomination ends (total 48h from start) |
| **Term Limit** | 3 consecutive terms (`MAX_CONSECUTIVE_TERMS = 3`) |
| **Tie-Breaking** | Earliest `nominatedAt` timestamp wins |
| **Auto-Creation** | Towns without an active election automatically get a new MAYOR election created |
| **No-Candidate Handling** | Election immediately moves to COMPLETED with no winner |

**Cron Job Steps** (`election-lifecycle.ts`):

1. `autoCreateElections()` -- Finds all towns that lack a non-COMPLETED election. Creates a new MAYOR election for each, incrementing `termNumber` from the last election. Emits `election:new` socket event.
2. `transitionNominationsToVoting()` -- Finds elections in NOMINATIONS phase where `startDate` is older than 24 hours. If zero candidates, skips directly to COMPLETED (emits `election:results` with `reason: 'no_candidates'`). Otherwise transitions to VOTING phase and emits `election:phase-changed`.
3. `transitionVotingToCompleted()` -- Finds elections in VOTING phase where `endDate <= now`. Tallies votes per candidate via `groupBy`, identifies winner (most votes, tie = earliest nomination). Updates election to COMPLETED, sets `winnerId`. Appoints winner as mayor (`town.mayorId`) or ruler (`kingdom.rulerId`). Emits `election:results`.
4. `resolveExpiredImpeachments()` -- See impeachment section below.

**API Endpoints**:

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/elections/nominate` | Yes | Nominate yourself for an election |
| POST | `/api/elections/vote` | Yes | Cast a vote for a candidate |
| GET | `/api/elections/current` | Yes | List active (non-completed) elections for your town/kingdom |
| GET | `/api/elections/results` | Yes | Historical election results (paginated, max 50) |
| GET | `/api/elections/candidates/:electionId` | Yes | List candidates for an election (includes vote counts if voting/completed) |
| POST | `/api/elections/impeach` | Yes | Initiate an impeachment |
| POST | `/api/elections/impeach/vote` | Yes | Vote on an active impeachment |

#### Impeachment System

**Player Guide**: Any resident can initiate an impeachment against their town's mayor or their kingdom's ruler. The impeachment lasts 48 hours. During this time, other residents can vote for or against. If the impeachment passes (more votes for than against), the official is removed from office immediately, and a new election cycle begins automatically on the next cron tick.

| Aspect | Detail |
|---|---|
| **Duration** | 48 hours (`IMPEACHMENT_DURATION_HOURS = 48`) |
| **Initiation** | Any resident (cannot impeach yourself) |
| **Voting** | One vote per character, for or against |
| **Resolution** | `votesFor > votesAgainst` = PASSED (official removed), else FAILED |
| **Residency Check** | Must be a town resident for town impeachments |
| **Duplicate Check** | Only one active impeachment per target per scope at a time |
| **Auto-Vote** | Initiator automatically counts as 1 vote in favor |

---

### A.2 Governance System

**Source**: `server/src/routes/governance.ts` (665 lines)

#### Player Guide: Governance Powers

Once elected, mayors and rulers gain significant powers:

- **Mayors** can: set tax rates, appoint a sheriff, appoint town council members, allocate town treasury funds, propose laws.
- **Rulers** can: appoint kingdom council members, allocate kingdom treasury, declare war, propose peace, propose laws.
- **Council members** and rulers can vote on proposed laws.

#### Law System

**5 Law Types**: `tax`, `trade`, `military`, `building`, `general`

| Aspect | Detail |
|---|---|
| **Who Can Propose** | Rulers or mayors (for their kingdom) |
| **Who Can Vote** | Council members + the kingdom ruler |
| **Activation** | Simple majority: `votesFor > votesAgainst` AND at least 3 total votes |
| **Statuses** | `proposed` -> `voting` -> `active` / `expired` |
| **Expiration** | Optional `expiresAt` datetime; checked every 15 min by cron |
| **Effects** | JSON object stored in `effects` column -- interpreted by `law-effects.ts` |
| **Socket Event** | `governance:law-passed` emitted when activated |

**API Endpoints**:

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| POST | `/api/governance/propose-law` | Yes | Ruler/Mayor | Propose a new law |
| POST | `/api/governance/vote-law` | Yes | Council/Ruler | Vote for or against a proposed law |
| GET | `/api/governance/laws` | Yes | Any | List laws for a kingdom (filterable by status) |
| POST | `/api/governance/set-tax` | Yes | Mayor only | Set town tax rate (0-25%) |
| GET | `/api/governance/town-info/:townId` | Yes | Any | Town details: mayor, sheriff, council, treasury, tax rate |
| POST | `/api/governance/appoint` | Yes | Mayor/Ruler | Appoint sheriff or council member |
| POST | `/api/governance/allocate-treasury` | Yes | Mayor/Ruler | Spend treasury on buildings/military/infrastructure/events |
| GET | `/api/governance/kingdom/:kingdomId` | Yes | Any | Kingdom overview: ruler, laws, wars, council, treasury |
| POST | `/api/governance/declare-war` | Yes | Ruler only | Declare war on another kingdom |
| POST | `/api/governance/propose-peace` | Yes | Ruler only | Propose peace (ends war immediately) |

#### Tax System

**Source**: `server/src/routes/governance.ts` (set-tax), `server/src/services/law-effects.ts` (210 lines), `server/src/jobs/tax-collection.ts` (64 lines)

**Player Guide**: Each town has a tax rate set by its mayor. Taxes are collected automatically every hour from marketplace transactions. The effective tax rate combines the mayor's base rate with any active kingdom-level tax laws.

| Aspect | Detail |
|---|---|
| **Mayor Tax Rate** | 0% to 25% (hard cap at 0.25 in Zod validation) |
| **Law Tax Modifier** | Active `tax` type laws add `effects.taxModifier` to the rate |
| **Effective Tax Cap** | 0% to 50% (clamped in `getEffectiveTaxRate`) |
| **Collection Frequency** | Hourly cron (`0 * * * *`) |
| **Collection Source** | `tradeTransaction` records since `lastCollectedAt` |
| **Tax Formula** | `floor(price * quantity * taxRate)` per transaction |
| **Deposit Target** | `townTreasury.balance` |
| **Socket Event** | `governance:tax-changed` on rate change |

#### Treasury Allocation

Mayors and rulers can allocate treasury funds to 4 purposes:

| Purpose | Description |
|---|---|
| `buildings` | Town/kingdom construction projects |
| `military` | Defense and military spending |
| `infrastructure` | Roads, walls, utilities |
| `events` | Community events and festivals |

The system validates sufficient balance before deducting.

#### Official Appointments

| Role | Appointed By | Scope |
|---|---|---|
| Sheriff | Mayor | Town-level; target must be a town resident |
| Council Member | Mayor (town) or Ruler (kingdom) | Town or Kingdom level |

---

### A.3 Law Effects Service

**Source**: `server/src/services/law-effects.ts` (210 lines)

5 exported service functions:

| Function | Purpose |
|---|---|
| `getEffectiveTaxRate(townId)` | Combines base TownPolicy rate + active tax law modifiers. Clamps 0-50%. |
| `getTradeRestrictions(townId, buyerId, sellerId)` | Checks for trade embargo laws and active wars between kingdoms. Returns `{ blocked, reason }`. |
| `getWarStatus(kingdomId1, kingdomId2)` | Checks if two kingdoms are actively at war. Returns `{ atWar, war? }`. |
| `isLawActive(lawId)` | Checks if a specific law is active and not expired. |
| `getActiveWarsForKingdom(kingdomId)` | Returns all active wars for a kingdom (both attacking and defending). |

---

### A.4 Law Expiration Job

**Source**: `server/src/jobs/law-expiration.ts` (40 lines)

| Aspect | Detail |
|---|---|
| **Schedule** | Every 15 minutes (`*/15 * * * *`) |
| **Logic** | `UPDATE law SET status='expired' WHERE status='active' AND expiresAt <= now()` |
| **Bulk Update** | Uses `prisma.law.updateMany` for efficiency |

---

### A.5 Diplomacy System (Advanced)

**Source**: `server/src/routes/diplomacy.ts` (761 lines), `server/src/services/diplomacy-engine.ts` (227 lines)

#### Player Guide: Diplomacy

The diplomacy system tracks relationships between all 20 races on a matrix, manages treaties between kingdoms, and handles inter-kingdom wars with scoring.

**Racial Relations**: Every pair of the 20 races has a relation status on a 6-tier scale:

| Rank | Status | Description |
|---|---|---|
| 0 | BLOOD_FEUD | Worst possible; deep-rooted hatred |
| 1 | HOSTILE | Active aggression |
| 2 | DISTRUSTFUL | Suspicious, wary interactions |
| 3 | NEUTRAL | Default starting position |
| 4 | FRIENDLY | Cooperative, amicable |
| 5 | ALLIED | Best possible; deep mutual trust |

**Improving relations costs gold and time**:

| Transition | Gold Cost | Days Required |
|---|---|---|
| BLOOD_FEUD -> HOSTILE | 15,000 | 10 |
| HOSTILE -> DISTRUSTFUL | 8,000 | 7 |
| DISTRUSTFUL -> NEUTRAL | 3,000 | 4 |
| NEUTRAL -> FRIENDLY | 5,000 | 5 |
| FRIENDLY -> ALLIED | 10,000 | 10 (requires 14-day trade agreement) |

**Changeling Diplomat Bonus**: If either kingdom's ruler is a Changeling race, all gold costs for diplomacy are reduced by 20%.

**Worsening is always instant and free.** War declaration worsens relations by 2 steps.

#### Treaties

3 treaty types with different requirements:

| Treaty Type | Min Relation | Gold Cost | Days | Special |
|---|---|---|---|---|
| TRADE_AGREEMENT | NEUTRAL | 2,000 | 3 | -- |
| NON_AGGRESSION_PACT | DISTRUSTFUL | 1,500 | 2 | -- |
| ALLIANCE | FRIENDLY | 10,000 | 7 | Requires 14-day active TRADE_AGREEMENT |

- **Proposal Flow**: Ruler proposes -> Receiver's ruler accepts or rejects. Gold deducted from proposer on acceptance.
- **Duration**: Non-alliance treaties expire after 30 days. Alliances have no expiration.
- **Breaking Treaties**: Either ruler can break an active treaty, but it incurs penalties:

| Treaty Broken | Relation Worsened By | Gold Penalty |
|---|---|---|
| ALLIANCE | 3 steps | 5,000 |
| NON_AGGRESSION_PACT | 2 steps | 2,000 |
| TRADE_AGREEMENT | 1 step | 1,000 |

#### War System (Diplomacy Routes)

| Aspect | Detail |
|---|---|
| **Declaration** | Ruler only; cannot declare on self or if already at war |
| **On Declaration** | All active treaties between the kingdoms are set to BROKEN; racial relation worsens by 2 steps |
| **War Scoring** | PvP kills (10 pts each), Raids (25 pts each), Territory net (50 pts each) |
| **Peace Negotiation** | Either ruler can negotiate; immediately ends the war |
| **History Log** | All diplomatic events logged in `diplomacyEvent` table with initiator, target, details |

**API Endpoints**:

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/diplomacy/relations` | No | Full 20x20 racial relations matrix |
| GET | `/api/diplomacy/relations/:race1/:race2` | No | Specific pair's relation |
| POST | `/api/diplomacy/propose-treaty` | Yes | Propose treaty (ruler only) |
| POST | `/api/diplomacy/respond-treaty/:proposalId` | Yes | Accept/reject treaty (receiver ruler only) |
| POST | `/api/diplomacy/declare-war` | Yes | Declare war (ruler only) |
| POST | `/api/diplomacy/break-treaty/:treatyId` | Yes | Cancel active treaty (ruler only) |
| GET | `/api/diplomacy/treaties` | No | List all active treaties |
| GET | `/api/diplomacy/wars` | No | List all active wars |
| GET | `/api/diplomacy/wars/:id` | No | War details with scoring breakdown |
| POST | `/api/diplomacy/wars/:id/negotiate-peace` | Yes | End a war (ruler only) |
| GET | `/api/diplomacy/history` | No | Paginated diplomacy event history |

---

### A.6 Kingdom Reputation

**Source**: `server/src/services/diplomacy-reputation.ts` (98 lines)

A kingdom's reputation is calculated from its diplomatic history:

| Factor | Points |
|---|---|
| Each treaty kept (ACTIVE or EXPIRED) | +2 |
| Each treaty BROKEN | -5 |
| Each war declared (as attacker) | -2 |
| Each peace treaty reached (war ended) | +3 |

**Reputation Tiers**:

| Score Range | Tier | Treaty Cost Multiplier |
|---|---|---|
| >= 50 | Honored | 0.90x (10% discount) |
| >= 20 | Respected | 0.95x (5% discount) |
| >= -10 | Neutral | 1.00x (no change) |
| >= -30 | Suspect | 1.25x (25% surcharge) |
| < -30 | Oathbreaker | 1.50x (50% surcharge) |

---

### A.7 Herald Announcement System

**Source**: `server/src/services/herald.ts` (192 lines)

The Herald generates immersive, lore-flavored world event announcements for major diplomatic actions. Each announcement is persisted as a `WorldEvent` record and broadcast via Socket.io.

**20 Supported Races** (all with flavor names): Human, Elf, Dwarf, Halfling, Orc, Tiefling, Dragonborn, Half-Elf, Half-Orc, Gnome, Merfolk, Beastfolk, Faefolk, Goliath, Drow, Firbolg, Warforged, Genasi, Revenant, Changeling.

| Generator Function | Event Type | Trigger |
|---|---|---|
| `generateWarDeclaration` | WAR_DECLARATION | War declared |
| `generatePeaceTreaty` | PEACE_TREATY | War ended |
| `generateAllianceFormed` | ALLIANCE_FORMED | Alliance treaty activated |
| `generateTradeAgreement` | TRADE_AGREEMENT | Trade agreement activated |
| `generateBorderChange` | BORDER_CHANGE | Racial relation status changes |
| `generateTreatyBroken` | TREATY_BROKEN | Treaty broken by a kingdom |
| `generateStateReport` | STATE_REPORT | Monthly world state summary |

---

## B. Social Systems

### B.1 Guild System

**Source**: `server/src/routes/guilds.ts` (587 lines)

#### Player Guide: Guilds

Guilds are player-created organizations with shared treasury, ranks, and social features.

- **Creation Cost**: 500 gold
- **Name**: 3-30 characters
- **Tag**: 2-4 alphanumeric characters (stored uppercase)
- **Description**: Up to 500 characters (optional)
- **You can only lead one guild at a time**

**Rank Hierarchy** (lowest to highest):

| Rank | Level | Permissions |
|---|---|---|
| Member | 0 | Basic membership, donate to treasury |
| Officer | 1 | Invite players, kick members (lower rank only), update guild info |
| Co-Leader | 2 | Same as officer |
| Leader | 3 | All permissions: promote, transfer leadership, disband |

**Key Rules**:
- Leaders cannot leave -- they must transfer leadership first or disband the guild
- Officers can only kick members of lower rank
- When leadership is transferred, the old leader is demoted to co-leader
- When a guild is disbanded, the entire treasury is returned to the leader
- Guild names and tags must be unique (409 conflict on duplicate)

**API Endpoints**:

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| POST | `/api/guilds` | Yes | Any | Create a new guild (costs 500g) |
| GET | `/api/guilds` | Yes | Any | List guilds (paginated, searchable) -- cached 60s |
| GET | `/api/guilds/:id` | Yes | Any | Guild details with full member list |
| PATCH | `/api/guilds/:id` | Yes | Officer+ | Update guild name/description |
| DELETE | `/api/guilds/:id` | Yes | Leader | Disband guild (treasury returned) |
| POST | `/api/guilds/:id/invite` | Yes | Officer+ | Invite a character to the guild |
| POST | `/api/guilds/:id/join` | Yes | Any | Open-join a guild |
| POST | `/api/guilds/:id/kick` | Yes | Officer+ | Kick a lower-rank member |
| POST | `/api/guilds/:id/leave` | Yes | Non-leader | Leave the guild |
| POST | `/api/guilds/:id/promote` | Yes | Leader | Change a member's rank |
| POST | `/api/guilds/:id/donate` | Yes | Member+ | Donate gold to guild treasury |
| GET | `/api/guilds/:id/quests` | Yes | Any | List guild quests (placeholder, returns `[]`) |
| POST | `/api/guilds/:id/transfer` | Yes | Leader | Transfer leadership to another member |

**Socket Events**: `guild:dissolved`, `guild:member-joined`, `guild:member-left`

---

### B.2 Messaging System

**Source**: `server/src/routes/messages.ts` (323 lines)

#### Player Guide: Chat Channels

The game supports 7 chat channel types with different scoping and permissions:

| Channel | Scope | Permission | Requires |
|---|---|---|---|
| GLOBAL | Server-wide | Admin only | Admin user role |
| TOWN | Town residents | Must be in a town | `currentTownId` auto-resolved |
| GUILD | Guild members | Must be a guild member | `guildId` parameter |
| PARTY | Party members | Any | -- |
| WHISPER | Direct message | Any | `recipientId` parameter (cannot whisper self) |
| TRADE | Trade channel | Any | -- |
| SYSTEM | System messages | Any | -- |

- **Max message length**: 2,000 characters
- **Pagination**: Default 50 per page, max 100

**API Endpoints**:

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/messages/send` | Yes | Send a message to a channel |
| GET | `/api/messages/inbox` | Yes | Whisper inbox (sent + received) |
| GET | `/api/messages/conversation/:characterId` | Yes | Whisper thread with a specific character |
| GET | `/api/messages/channel/:channelType` | Yes | Read messages from a channel |
| PATCH | `/api/messages/:id/read` | Yes | Mark a whisper as read |
| DELETE | `/api/messages/:id` | Yes | Delete your own message |

---

### B.3 Friends System

**Source**: `server/src/routes/friends.ts` (341 lines)

#### Player Guide: Friends

- Send a friend request to any character. They can accept, decline, or block.
- If declined, you can re-request later (old record is deleted and a new one created).
- Either party can unfriend at any time.
- Your friends list shows their online status, level, race, and current town.
- Friend requests trigger real-time socket notifications.

**Friendship States**: `PENDING` -> `ACCEPTED` / `DECLINED` / `BLOCKED`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/friends/request` | Yes | Send friend request |
| POST | `/api/friends/:id/accept` | Yes | Accept a pending request |
| POST | `/api/friends/:id/decline` | Yes | Decline a pending request |
| DELETE | `/api/friends/:id` | Yes | Remove a friend / cancel request |
| GET | `/api/friends` | Yes | List all accepted friends (with online status) |
| GET | `/api/friends/requests` | Yes | List incoming + outgoing pending requests |

**Real-time Events**: `emitFriendRequest`, `emitFriendAccepted`, notifications for both parties.

**Online Tracking**: The friends list calls `isOnline(characterId)` from `server/src/socket/presence.ts` to show live online status.

---

### B.4 Notifications System

**Source**: `server/src/routes/notifications.ts` (138 lines)

#### Player Guide

Notifications are server-generated alerts for game events. They appear in your notification panel and can be marked as read or deleted.

**Known Notification Types** (from code analysis):
- `friend_request` -- Someone wants to be your friend
- `friend_accepted` -- Your friend request was accepted
- `petition_fulfilled` -- Your petition reached its signature goal
- `quest_ready` -- All objectives for a quest are complete

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/notifications` | Yes | List notifications (paginated, filterable by unread) |
| PATCH | `/api/notifications/:id/read` | Yes | Mark single notification as read |
| PATCH | `/api/notifications/read-all` | Yes | Mark all notifications as read |
| DELETE | `/api/notifications/:id` | Yes | Delete a notification |

---

### B.5 Citizen Petition System

**Source**: `server/src/routes/petitions.ts` (295 lines)

#### Player Guide: Petitions

Citizens can create petitions to pressure rulers into diplomatic actions. Petitions have a signature goal (default 10, configurable 3-100) and expire after 7 days.

**4 Petition Types**:

| Type | Description |
|---|---|
| DECLARE_WAR | Citizens demand war on another kingdom |
| PROPOSE_TREATY | Citizens request a treaty with another kingdom |
| BREAK_TREATY | Citizens demand breaking an existing treaty |
| CHANGE_RELATIONS | Citizens want diplomatic relations changed |

**Lifecycle**:
1. Creator submits petition with title, description, type, and optional `targetData`
2. Creator automatically signs their own petition (count starts at 1)
3. Other players sign the petition
4. When signature goal is reached, status changes to `FULFILLED` and the creator receives a notification
5. Petitions not fulfilled within 7 days expire

**Rules**:
- One active petition per type per creator
- Each character can only sign a petition once
- Expired petitions cannot be signed

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/petitions` | Yes | Create a petition |
| POST | `/api/petitions/:id/sign` | Yes | Sign a petition |
| GET | `/api/petitions` | Yes | List petitions (filterable by status, paginated) |
| GET | `/api/petitions/:id` | Yes | Petition details with all signatures |

---

### B.6 World Events API

**Source**: `server/src/routes/world-events.ts` (121 lines)

World events are global announcements generated by the Herald service and other systems. Players can browse them as a news feed.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/world-events` | Yes | List recent world events (paginated, filterable by `eventType`) |
| GET | `/api/world-events/war-bulletin` | Yes | Active wars + 10 most recent war-related events |
| GET | `/api/world-events/state-report` | Yes | Latest "State of Aethermere" monthly report |

**Event Types**: WAR_DECLARATION, PEACE_TREATY, ALLIANCE_FORMED, TRADE_AGREEMENT, BORDER_CHANGE, TREATY_BROKEN, STATE_REPORT

---

## C. Quest & Progression System

### C.1 Quest Type Definitions

**Source**: `shared/src/data/quests/types.ts` (30 lines)

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique quest identifier |
| `name` | string | Display name |
| `type` | enum | MAIN, TOWN, DAILY, GUILD, BOUNTY, RACIAL |
| `description` | string | Quest narrative text |
| `objectives` | QuestObjective[] | Array of objectives |
| `rewards` | QuestRewards | XP, gold, items, reputation |
| `levelRequired` | number | Minimum character level |
| `prerequisiteQuestId` | string? | Must complete this quest first |
| `regionId` | string? | Region association |
| `townId` | string? | Town association |
| `npcGiverId` | string? | NPC quest giver |
| `isRepeatable` | boolean? | Can be repeated after completion |
| `cooldownHours` | number? | Hours between repeats |

**5 Objective Types**: `KILL`, `GATHER`, `DELIVER`, `TALK`, `VISIT`

**Reward Structure**: `{ xp: number, gold: number, items?: string[], reputation?: number }`

---

### C.2 Complete Quest Catalog

**Source**: `shared/src/data/quests/` (7 files)

#### Main Story Quests (8 quests)

**Source**: `shared/src/data/quests/main-quests.ts` (107 lines)

These form a linear story chain. Each requires completing the previous quest.

| ID | Name | Level | Objectives | Rewards (XP/Gold) |
|---|---|---|---|---|
| main-01-awakening | The Awakening | 1 | Talk to Elder Tomas | 100 / 25 |
| main-02-proving-ground | Proving Ground | 1 | Kill 5 Goblins, Kill 3 Giant Rats | 250 / 50 |
| main-03-gathering-supplies | Gathering Supplies | 2 | Gather 5 ORE, Gather 5 WOOD | 300 / 75 |
| main-04-the-road-ahead | The Road Ahead | 3 | Visit Hearthshire, Kill 5 Bandits | 500 / 100 |
| main-05-shadows-stir | Shadows Stir | 5 | Visit Nethermire, Kill 5 Skeleton Warriors | 750 / 150 |
| main-06-into-the-depths | Into the Depths | 7 | Visit Kazad-Vorn, Kill 8 Giant Spiders | 1000 / 200 |
| main-07-dragon-rumor | Rumors of Dragonfire | 12 | Visit Drakenspire, Kill 5 Dire Wolves, Kill 1 Young Dragon | 2000 / 500 |
| main-08-final-stand | The Final Stand | 16 | Visit Ashenmoor, Kill 1 Lich | 5000 / 1000 |

**Total main quest rewards**: 9,900 XP, 2,100 gold

#### Town Quests (15 quests across 4 regions)

**Source**: `shared/src/data/quests/town-quests.ts` (179 lines)

**Verdant Heartlands (Kingshold/Millhaven)** -- 5 quests:

| ID | Name | Level | Town | Objectives | XP / Gold |
|---|---|---|---|---|---|
| town-heartlands-01 | Rat Infestation | 1 | Kingshold | Kill 5 Giant Rats | 100 / 30 |
| town-heartlands-02 | Harvest Protection | 2 | Kingshold | Kill 4 Wolves | 150 / 40 |
| town-heartlands-03 | Blacksmith's Request | 2 | Kingshold | Gather 8 ORE | 150 / 50 |
| town-heartlands-04 | Bandit Highway | 3 | Kingshold | Kill 6 Bandits, Visit Bridgewater | 250 / 75 |
| town-heartlands-05 | Timber for the Mill | 1 | Millhaven | Gather 10 WOOD | 120 / 40 |

**Silverwood Forest (Aelindra)** -- 3 quests:

| ID | Name | Level | Town | Objectives | XP / Gold |
|---|---|---|---|---|---|
| town-silverwood-01 | Wolf Pack Cull | 2 | Aelindra | Kill 6 Wolves | 150 / 35 |
| town-silverwood-02 | Herbal Remedy | 2 | Aelindra | Gather 8 HERB | 175 / 45 |
| town-silverwood-03 | Enchanted Wood | 3 | Aelindra | Gather 12 WOOD | 200 / 55 |

**Ironvault Mountains (Kazad-Vorn)** -- 3 quests:

| ID | Name | Level | Town | Objectives | XP / Gold |
|---|---|---|---|---|---|
| town-ironvault-01 | Mine Clearance | 5 | Kazad-Vorn | Kill 5 Giant Spiders | 200 / 60 |
| town-ironvault-02 | Ore Requisition | 5 | Kazad-Vorn | Gather 15 ORE | 250 / 80 |
| town-ironvault-03 | Stone Guardian | 10 | Kazad-Vorn | Kill 1 Ancient Golem | 400 / 120 |

**The Crossroads (Hearthshire)** -- 3 quests:

| ID | Name | Level | Town | Objectives | XP / Gold |
|---|---|---|---|---|---|
| town-crossroads-01 | Goblin Trouble | 1 | Hearthshire | Kill 8 Goblins | 120 / 35 |
| town-crossroads-02 | Grain for the Market | 1 | Hearthshire | Gather 10 GRAIN | 130 / 40 |
| town-crossroads-03 | Trade Route Patrol | 2 | Hearthshire | Visit Greenhollow, Visit Peddler's Rest | 200 / 60 |

#### Daily Quests (5 quests, all repeatable)

**Source**: `shared/src/data/quests/daily-quests.ts` (59 lines)

All daily quests have a **24-hour cooldown** and use wildcard (`*`) targets where applicable.

| ID | Name | Level | Objectives | XP / Gold |
|---|---|---|---|---|
| daily-hunt | Daily Hunt | 1 | Kill 5 any monsters | 150 / 30 |
| daily-gather | Daily Gathering | 1 | Gather 5 any resources | 125 / 25 |
| daily-patrol | Daily Patrol | 1 | Visit 2 any towns | 100 / 20 |
| daily-slayer | Monster Slayer | 3 | Kill 10 any monsters | 300 / 60 |
| daily-prospector | Prospector | 3 | Gather 10 ORE | 200 / 45 |

**Max daily XP from dailies**: 875 XP (all 5 completed)

#### Guild Quests (3 quests)

**Source**: `shared/src/data/quests/guild-quests.ts` (42 lines)

| ID | Name | Level | Objectives | XP / Gold / Rep |
|---|---|---|---|---|
| guild-01-initiation | Guild Initiation | 3 | Kill 10 Goblins, Kill 10 Wolves | 500 / 100 / 25 |
| guild-02-resource-drive | Guild Resource Drive | 5 | Gather 20 ORE, 20 WOOD, 10 HERB | 600 / 150 / 30 |
| guild-03-expedition | Guild Expedition | 7 | Visit Nethermire, Kazad-Vorn, Drakenspire | 800 / 200 / 40 |

#### Bounty Quests (3 quests)

**Source**: `shared/src/data/quests/bounty-quests.ts` (34 lines)

| ID | Name | Level | Region | Objectives | XP / Gold |
|---|---|---|---|---|---|
| bounty-orc-raiders | Bounty: Orc Raiders | 5 | Ashenfang Wastes | Kill 8 Orc Warriors | 400 / 120 |
| bounty-troll-menace | Bounty: Troll Menace | 8 | Shadowmere Marshes | Kill 4 Trolls | 600 / 180 |
| bounty-dragon-slayer | Bounty: Dragon Slayer | 12 | Frozen Reaches | Kill 2 Young Dragons | 2000 / 500 |

#### Quest Summary

| Type | Count | Level Range | Total XP | Total Gold |
|---|---|---|---|---|
| MAIN | 8 | 1-16 | 9,900 | 2,100 |
| TOWN | 15 | 1-10 | 2,595 | 765 |
| DAILY | 5 (repeatable) | 1-3 | 875/day | 180/day |
| GUILD | 3 | 3-7 | 1,900 | 450 |
| BOUNTY | 3 | 5-12 | 3,000 | 800 |
| **Total (one-time)** | **29** | -- | **17,395** | **4,115** |

---

### C.3 Quest Lifecycle API

**Source**: `server/src/routes/quests.ts` (567 lines)

#### Player Guide: Quest Lifecycle

1. **Browse**: Check `/api/quests/available` to see quests you qualify for. The system filters by level, prerequisite completion, cooldown, and repeatability.
2. **Accept**: POST to `/api/quests/accept`. Progress is initialized at 0 for each objective.
3. **Auto-Progress**: Combat, gathering, and travel automatically update quest objectives via triggers (no manual reporting needed for most actions).
4. **Manual Progress**: POST to `/api/quests/progress` if needed (e.g., for custom objectives).
5. **Complete**: When all objectives are met, POST to `/api/quests/complete` to claim rewards (XP + gold added atomically in a transaction).
6. **Abandon**: POST to `/api/quests/abandon` to delete progress and give up the quest.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/quests/available` | Yes | Available quests for your level (cached 60s) |
| GET | `/api/quests/active` | Yes | Your active quests with current progress |
| GET | `/api/quests/completed` | Yes | Your completed quest history |
| POST | `/api/quests/accept` | Yes | Accept a quest |
| POST | `/api/quests/progress` | Yes | Manually report objective progress |
| POST | `/api/quests/complete` | Yes | Turn in completed quest for rewards |
| POST | `/api/quests/abandon` | Yes | Abandon an active quest |
| GET | `/api/quests/npcs/:townId` | Yes | List NPCs in a town with their quests and your status |

---

### C.4 Quest Trigger Service

**Source**: `server/src/services/quest-triggers.ts` (205 lines)

This service enables **automatic quest progression**. Game events call these trigger functions, which scan all active quests for matching objectives and update progress accordingly.

| Trigger Function | Called By | Matches Objective Type | Wildcard Support |
|---|---|---|---|
| `onMonsterKill(characterId, monsterType, count)` | PvE combat routes | KILL | Yes (`*` = any monster) |
| `onResourceGather(characterId, resourceType, count)` | Gathering/work routes | GATHER | Yes (`*` = any resource) |
| `onVisitLocation(characterId, townId)` | Travel routes | VISIT | Yes (`*` = any town) |

**When all objectives are met**, the trigger automatically sends a real-time `quest_ready` notification to the player: "All objectives for [quest name] are complete. Turn it in to claim your reward!"

**Pattern**: Each trigger loads all `IN_PROGRESS` quests for the character, iterates objectives, updates progress (capped at `quantity`), and writes back to the database. This runs on every combat kill, gather, and travel event.

---

### C.5 Progression System

**Source**: `server/src/services/progression.ts` (114 lines)

#### XP Formula

```
XP required for level N -> N+1 = N * 100
```

| Level | XP to Next Level | Cumulative XP |
|---|---|---|
| 1 | 100 | 0 |
| 2 | 200 | 100 |
| 3 | 300 | 300 |
| 5 | 500 | 1,000 |
| 10 | 1,000 | 4,500 |
| 15 | 1,500 | 10,500 |
| 20 | 2,000 | 19,000 |
| 25 | 2,500 | 30,000 |
| 30 | 3,000 | 43,500 |
| 40 | 4,000 | 78,000 |
| 50 | 5,000 | 122,500 |

**Cumulative formula**: `totalXP = 100 * (level - 1) * level / 2`

#### Level-Up Rewards

Each level grants:

| Reward | Amount Per Level |
|---|---|
| Stat Points | 2 |
| Skill Points | 1 |
| Max Health | +10 |
| Max Mana | +5 |
| Full Heal | HP and Mana restored to new max |

**Multi-level handling**: If a character gains enough XP to skip levels (e.g., a large quest reward), all intermediate levels are granted at once. A character going from level 5 to 8 gets 6 stat points, 3 skill points, +30 HP, +15 MP.

**On Level-Up**:
1. Character stats updated in database
2. Achievement check runs (`checkAchievements(characterId, 'leveling', { level })`)
3. Socket.io `levelUp` event emitted with full reward breakdown

#### Player Guide: XP Sources and Leveling Path

**XP Sources**:
- Main quests (100-5000 XP per quest)
- Town quests (100-400 XP per quest)
- Daily quests (100-300 XP per day, repeatable)
- Guild quests (500-800 XP)
- Bounty quests (400-2000 XP)
- PvE combat victories
- Achievement rewards (25-2000 XP)

**Leveling Path Milestones**:

| Level | Cumulative XP | Milestone |
|---|---|---|
| 1 | 0 | Starting level |
| 5 | 1,000 | Access to mid-tier town quests |
| 10 | 4,500 | Specialization unlocked (via achievement system) |
| 15 | 10,500 | High-level quests available |
| 25 | 30,000 | "Hero" title achievement |
| 30 | 43,500 | Endgame content begins |
| 40 | 78,000 | Veteran player territory |
| 50 | 122,500 | "Legend" title achievement |

**XP Boosting Strategy**: Focus on daily quests (875 XP/day guaranteed), main story chain for one-time bonuses, and grinding bounties for repeatable high-XP content. Guild quests provide reputation alongside XP.

---

### C.6 Achievement System

**Source**: `shared/src/data/achievements.ts` (64 lines)

26 achievements across 9 categories:

#### Combat (PvE) -- 4 achievements

| Name | Requirement | Rewards |
|---|---|---|
| First Blood | Win 1 PvE combat | 50 XP |
| Monster Slayer | Win 10 PvE combats | 200 XP, 50g |
| Veteran Warrior | Win 50 PvE combats | 500 XP, 200g, "Veteran" title |
| Champion of the Realm | Win 200 PvE combats | 2000 XP, 1000g, "Champion" title |

#### Combat (PvP) -- 3 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Duelist | Win 1 PvP duel | 100 XP |
| Gladiator | Win 10 PvP duels | 500 XP, 100g, "Gladiator" title |
| Warlord | Win 50 PvP duels | 2000 XP, 500g, "Warlord" title |

#### Crafting -- 3 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Apprentice Crafter | Craft 10 items | 100 XP |
| Journeyman Crafter | Craft 50 items | 300 XP, 100g |
| Master Artisan | Reach Expert tier in any profession | 500 XP, 200g, "Master Artisan" title |

#### Social -- 3 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Making Friends | Have 1 friend | 25 XP |
| Social Butterfly | Have 10 friends | 200 XP, "Social Butterfly" title |
| Guild Founder | Create or lead a guild | 300 XP, 100g |

#### Exploration -- 2 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Explorer | Visit 5 towns | 150 XP |
| World Traveler | Visit 15 towns | 500 XP, 200g, "World Traveler" title |

#### Economy -- 3 achievements

| Name | Requirement | Rewards |
|---|---|---|
| First Sale | 1 market sale | 50 XP |
| Merchant | 20 market sales | 300 XP, 100g |
| Merchant Prince | Earn 10,000g from sales | 1000 XP, "Merchant Prince" title |

#### Political -- 2 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Elected Official | Win 1 election | 500 XP, 200g |
| Lawmaker | Enact 1 law | 300 XP |

#### Leveling -- 3 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Adventurer | Reach level 10 | 200 XP, "Adventurer" title |
| Seasoned Hero | Reach level 25 | 500 XP, 500g, "Hero" title |
| Legend | Reach level 50 | 2000 XP, 2000g, "Legend" title |

#### Gathering -- 2 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Gatherer | 25 gathering actions | 150 XP |
| Resource Baron | 100 gathering actions | 500 XP, 300g, "Resource Baron" title |

#### Progression -- 2 achievements

| Name | Requirement | Rewards |
|---|---|---|
| Specialized | Choose a class specialization | 200 XP |
| Skill Master | Unlock 10 abilities | 500 XP, "Skill Master" title |

#### Achievement Summary

| Category | Count | Total XP | Total Gold | Titles |
|---|---|---|---|---|
| Combat (PvE) | 4 | 2,750 | 1,250 | Veteran, Champion |
| Combat (PvP) | 3 | 2,600 | 600 | Gladiator, Warlord |
| Crafting | 3 | 900 | 300 | Master Artisan |
| Social | 3 | 525 | 100 | Social Butterfly |
| Exploration | 2 | 650 | 200 | World Traveler |
| Economy | 3 | 1,350 | 100 | Merchant Prince |
| Political | 2 | 800 | 200 | -- |
| Leveling | 3 | 2,700 | 2,500 | Adventurer, Hero, Legend |
| Gathering | 2 | 650 | 300 | Resource Baron |
| Progression | 2 | 700 | 0 | Skill Master |
| **Total** | **26** | **13,625** | **5,550** | **11 unique titles** |

---

## File Index

| File | Lines | Section |
|---|---|---|
| `server/src/routes/elections.ts` | 593 | A.1 Election System |
| `server/src/jobs/election-lifecycle.ts` | 319 | A.1 Election Lifecycle Cron |
| `server/src/routes/governance.ts` | 665 | A.2 Governance System |
| `server/src/services/law-effects.ts` | 210 | A.3 Law Effects Service |
| `server/src/jobs/tax-collection.ts` | 64 | A.2 Tax Collection |
| `server/src/jobs/law-expiration.ts` | 40 | A.4 Law Expiration |
| `server/src/routes/diplomacy.ts` | 761 | A.5 Diplomacy System |
| `server/src/services/diplomacy-engine.ts` | 227 | A.5 Diplomacy Engine |
| `server/src/services/herald.ts` | 192 | A.7 Herald System |
| `server/src/services/diplomacy-reputation.ts` | 98 | A.6 Kingdom Reputation |
| `server/src/routes/guilds.ts` | 587 | B.1 Guild System |
| `server/src/routes/messages.ts` | 323 | B.2 Messaging System |
| `server/src/routes/friends.ts` | 341 | B.3 Friends System |
| `server/src/routes/notifications.ts` | 138 | B.4 Notifications |
| `server/src/routes/petitions.ts` | 295 | B.5 Petition System |
| `server/src/routes/world-events.ts` | 121 | B.6 World Events |
| `shared/src/data/quests/types.ts` | 30 | C.1 Quest Types |
| `shared/src/data/quests/main-quests.ts` | 107 | C.2 Main Quests |
| `shared/src/data/quests/town-quests.ts` | 179 | C.2 Town Quests |
| `shared/src/data/quests/daily-quests.ts` | 59 | C.2 Daily Quests |
| `shared/src/data/quests/guild-quests.ts` | 42 | C.2 Guild Quests |
| `shared/src/data/quests/bounty-quests.ts` | 34 | C.2 Bounty Quests |
| `shared/src/data/quests/index.ts` | 26 | C.2 Quest Index |
| `server/src/routes/quests.ts` | 567 | C.3 Quest API |
| `server/src/services/quest-triggers.ts` | 205 | C.4 Quest Triggers |
| `server/src/services/progression.ts` | 114 | C.5 Progression |
| `shared/src/data/achievements.ts` | 64 | C.6 Achievements |
| **Total** | **5,999** | -- |
