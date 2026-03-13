# Religion System Design — Realm of Crowns

> **STATUS:** Complete design. Ready for implementation planning.
> **DATE:** March 13, 2026
> **SCOPE:** 12 gods, church system, membership tiers, elections, tithing, per-god mechanics, shrine system, supporting systems (Public Health, Defenses, racial reputation, corruption detection, etc.)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Architecture](#core-architecture)
3. [Membership Tiers](#membership-tiers)
4. [Tithing & Church Treasury](#tithing--church-treasury)
5. [High Priest Elections](#high-priest-elections)
6. [Shrine System](#shrine-system)
7. [Conversion Rules](#conversion-rules)
8. [The Twelve Gods — Full Mechanical Specs](#the-twelve-gods)
9. [Supporting Systems Required](#supporting-systems-required)
10. [Implementation Phases](#implementation-phases)

---

## System Overview

Religion is a political, social, and mechanical system that rivals governance in importance. Every town has a public Temple where players choose a patron god. Churches compete for membership, and the dominant church in each town applies its god's buffs town-wide to ALL residents — even non-members and atheists.

This creates natural tension: a town dominated by Aurvandos has great defenses but no economic perks. A town dominated by Tessivane has a thriving black market but weak law enforcement. Players — even those who don't follow any god — have a stake in which church dominates their town.

**Key design principles:**
- Religion mirrors governance: Mayor controls secular power, High Priest controls spiritual/cultural influence
- One patron god per character (atheism valid — no penalties, just no personal buffs)
- Multiple churches can exist in a town, but only the dominant one gets town-wide effects
- Player-driven entirely — gods don't intervene directly, players organize and compete
- Every god plays differently — not just different numbers, different SYSTEMS

---

## Core Architecture

### The Temple (Public Building)
- One Temple per town (part of the 6 universal public buildings)
- Any player can visit to: choose/change patron god, worship, view church standings
- Displays: all active church chapters in town, membership counts, current dominant church, High Priest(s)

### Church Chapters
- A church chapter forms when 20%+ of town residents follow the same god
- Each chapter can elect a High Priest
- Chapters have a treasury funded by member tithes
- Multiple chapters can coexist in the same town

### Dominance
- The church with the most members controls the Temple
- At 60%+ of town residents, the church is "dominant" and applies town-wide buffs
- If no church reaches 60%, no town-wide buff applies (chapters still get personal buffs)
- Dominance is recalculated at each daily tick (not real-time)

### Patron God Selection
- Characters choose a patron god at the Temple (free action)
- Atheism is valid — choose "None" for no patron
- First selection is free; changing costs reputation (see Conversion Rules)

---

## Membership Tiers

Based on percentage of town RESIDENTS (characters with `homeTownId` = this town):

| Tier | Threshold | What Unlocks |
|------|-----------|-------------|
| **Minority** | <20% of residents | Personal buff only (small, member-only) |
| **Chapter** | 20% of residents | Can elect High Priest, church treasury starts collecting |
| **Established** | 40% of residents | Stronger personal buff, mid-tier god mechanic unlocks |
| **Dominant** | 60% of residents | Town-wide buff for ALL residents, full god mechanics, Shrine upgrade available |

Tiers are recalculated at each daily tick. A church can rise or fall between tiers as members join, leave, convert, or relocate.

**Only one church can be dominant at a time.** If two churches both have 60%+ (mathematically impossible with the percentage system), the one with more members wins. In practice, a 60% threshold means at most one church can be dominant.

---

## Tithing & Church Treasury

### Tithe System
- Each church member sets a personal tithe rate: 1-20% of daily gold income
- "Daily gold income" = all gold earned that day (job wages, market sales, gathering income, etc.)
- Tithe is auto-collected during the daily tick, after income is calculated
- Tithe gold goes to the church chapter's treasury in the character's home town
- Default tithe rate on joining a church: 10% (player can change anytime)

### Church Treasury
- Each church chapter in each town has its own treasury
- Funded by member tithes
- Spent by the High Priest on: Shrine consecration, church events, Shrine abilities (diplomatic summits, town-wide healing, etc.)
- Treasury balance visible to all chapter members
- High Priest controls spending (with potential accountability mechanics from Morvaine/Solimene churches)

---

## High Priest Elections

Mirror the Mayor election system:
- **Eligibility:** Any member of the church chapter in that town
- **Nominations phase:** 2 game days. Members nominate themselves with a platform statement.
- **Voting phase:** 3 game days. One vote per member.
- **Term length:** Same as Mayor term (check current mayor term length in codebase)
- **Term limits:** None (can be re-elected indefinitely)

**High Priest powers (universal — all gods):**
- Spend church treasury gold
- Consecrate/deconsecrate the Shrine (when dominant)
- Activate Shrine abilities (god-specific, once per term unless stated otherwise)
- Set church policy (tithe suggestions, membership drives)
- Represent the church in political interactions with the Mayor

**If the chapter falls below 20%, the High Priest loses their position.** A new election is triggered if the chapter rises back above 20%.

---

## Shrine System

The Shrine is an upgrade to the public Temple, NOT a separate building.

### How It Works
- Available only to the dominant church (60%+ membership)
- High Priest consecrates the Temple to their god — costs gold from church treasury (amount TBD, probably 500-1000g)
- Consecration is visible: Temple description changes, god-specific visual theming
- Unlocks the highest-tier god mechanic (the "Shrine" row in each god's spec)
- If the church loses dominance (falls below 60%), the Shrine deconsecrates automatically at the next tick
- Consecration gold is NOT refunded on deconsecration (it's an investment/gold sink)

### Shrine Abilities
- Each god has ONE unique Shrine ability (detailed in the god specs below)
- Activated by the High Priest
- Usually once per term with a church treasury cost
- These are the most powerful political tools in the game

---

## Conversion Rules

- First patron god selection: free, immediate
- Changing patron god: reputation loss with old church + 7-day cooldown
- During cooldown: no personal buffs from any church (still receive town-wide dominant buff)
- After cooldown: new church buffs apply, old church reputation reduced
- Converting to atheism: same cooldown, no reputation loss (you're just leaving)
- Converting from atheism: no cooldown (you're just joining)
- Reputation with old church can be rebuilt by converting back, but at a slow rate

---

## The Twelve Gods — Full Mechanical Specs

### The Committed (Clear philosophy, never wavered)

---

### God 1 — Aurvandos, The Unyielding
**Domain:** Duty, protection, endurance, martial honor
**Church:** The Order of the Unbroken Shield
**Philosophy:** Warden
**Racial lean:** Dwarves, militaristic Humans, Frost Drakonid, honor-bound Orcs

| Tier | Personal Buff (members) | Town Effect |
|------|------------------------|-------------|
| Minority | +2% combat defense | — |
| Chapter | +4% combat defense | — |
| Established | +6% combat defense, -5% road danger for members | -5% road danger for all |
| Dominant | +8% combat defense, -10% road danger for members | -10% road danger for all, +5% town Defenses |
| **Shrine** | +10% combat defense | Town guard patrols: road encounter rate reduced by 25% on adjacent routes |

**Supporting system needed:** Defenses metric on towns, road danger modifier on travel routes.

---

### God 2 — Veradine, The Weigher of Costs
**Domain:** Sacrifice, pragmatism, governance, difficult choices
**Church:** The Conclave of the Balanced Scale
**Philosophy:** Pragmatist
**Racial lean:** Humans (institutional), Harthfolk (pragmatic), political factions everywhere

| Tier | Personal Buff (members) | Town Effect |
|------|------------------------|-------------|
| Minority | -2% tax overhead on personal transactions | — |
| Chapter | -4% tax overhead | — |
| Established | -6% tax overhead, +5% market efficiency | -3% tax overhead for all |
| Dominant | -8% tax overhead, +10% market efficiency | -5% tax overhead for all |
| **Shrine** | High Priest can propose economic policies that bypass normal law-making | — |

**Supporting system needed:** Tax overhead as a modifier on existing tax calculations, market efficiency modifier on listing duration/fees.

---

### God 3 — Tyrvex, The Unmaker
**Domain:** Knowledge, ambition, arcane power, transformation
**Church:** The Crucible of the Seeking Flame
**Philosophy:** Reclaimer
**Racial lean:** Nethkin, Gnomes, scholarly Elves, Crystal Drakonid

| Tier | Personal Buff (members) | Town Effect |
|------|------------------------|-------------|
| Minority | +2% crafting quality | — |
| Chapter | +4% crafting quality | — |
| Established | +6% crafting quality, access to unique research recipes | +2% crafting quality for all |
| Dominant | +8% crafting quality, advanced research unlocks | +4% crafting quality for all |
| **Shrine** | Predict chaotic incursion patterns — High Priest gets advance warning of world events. Can share intel with the town. | — |

**Supporting system needed:** Research recipes (new recipe category), world event system for predictions.

---

### God 4 — Xol'Thira, The Dissolved
**Domain:** Transformation, entropy, mysticism, the void
**Church:** The Communion of the Threshold
**Philosophy:** Embraced
**Racial lean:** Revenants, Changelings, Nethkin scholars, small followings everywhere

| Tier | Personal Buff (members) | Town Effect |
|------|------------------------|-------------|
| Minority | Daily meditation: random effect (small stat boost OR small stat penalty — truly random) | — |
| Chapter | Meditation improved: 70% positive / 30% negative odds | — |
| Established | 80% positive meditation, occasional "visions" (hints about game events, rare item locations) | +2% rare drop chance for all |
| Dominant | 85% positive meditation, reliable prophecy access | +3% rare drops for all, strange ambient events |
| **Shrine** | High Priest performs communal meditation granting party-wide random buffs. Prophecy system: detect barrier weaknesses, sense hidden things. | — |

**Supporting system needed:** Meditation action (daily free action, generates random active effect), vision/prophecy system, rare drop modifier on gathering/combat loot.

---

### The Waverers (Changed position as events unfolded)

---

### God 5 — Kethara, The Reluctant
**Domain:** Mercy, healing, grief, compassion
**Church:** The Sisterhood of Gentle Hands
**Philosophy:** Warden → Pragmatist (wavered)
**Racial lean:** Everywhere. Half-Elves, Half-Orcs, any community that's suffered.

| Tier | Personal Buff (members) | Town Effect |
|------|------------------------|-------------|
| Minority | +5% food effectiveness (buffs last longer or stronger) | — |
| Chapter | +10% food effectiveness, -1 hunger tier penalty | — |
| Established | +15% food effectiveness, reduced hunger penalties | +5% food effectiveness for all, +5 Public Health |
| Dominant | +20% food effectiveness, free hunger penalty removal | +10% food effectiveness for all, +10 Public Health |
| **Shrine** | Healing House: members cure status effects/debuffs once/day (free action). High Priest town-wide healing event (costs treasury). | — |

**Supporting system needed:** Public Health metric on towns, food effectiveness modifier on consumable system, status effect/debuff curing mechanic, hunger penalty modifier.

---

### God 6 — Vareth, The Walled
**Domain:** Borders, self-reliance, protection of kin, exclusion
**Church:** The Covenant of Hearth and Wall
**Philosophy:** Withdrawn
**Racial lean:** Dwarves, Orcs (protect the tribe), Frost Drakonid, small towns

| Tier | Personal Buff (members) | Town Effect |
|------|------------------------|-------------|
| Minority | +3% local crafting yield (home town only) | — |
| Chapter | +5% local crafting yield | — |
| Established | +8% local crafting yield, -5% material costs for local crafting | +3% local crafting yield for all |
| Dominant | +10% local crafting yield, -10% material costs | +5% local crafting yield for all, visitor market fees +10% |
| **Shrine** | High Priest sets tariffs: non-residents pay 10-25% surcharge on market (configurable). Restricts foreign merchant activity. | — |

**Supporting system needed:** Local crafting yield modifier, material cost modifier (distinct from existing racial bonuses), visitor vs resident market fee system (tariff mechanic).

---

### God 7 — Solimene, The Undecided
**Domain:** Balance, deliberation, law, neutrality
**Church:** The Court of Even Measure
**Philosophy:** Uniter (neutral arbiter)
**Racial lean:** Half-Elves, scholarly types, Harthfolk

| Tier | Personal Buff (members) | Town Effect |
|------|------------------------|-------------|
| Minority | +5% election integrity | — |
| Chapter | +10% election integrity, access to dispute resolution | — |
| Established | +15% election integrity, can file formal disputes | +5% election integrity for all |
| Dominant | +20% election integrity, dispute arbitration service | +10% election integrity for all |
| **Shrine** | High Priest can call binding referendums bypassing the mayor — town-wide vote on a single policy question. One per term. | — |

**Supporting system needed:** Election integrity metric (modifies vote manipulation resistance), dispute resolution system, referendum mechanic (town-wide vote on a policy).

---

### God 8 — Tessivane, The Smiling Shadow
**Domain:** Fortune, trickery, adaptability, survival
**Church:** The Fellowship of the Silver Tongue
**Philosophy:** Pragmatist (survival-focused)
**Racial lean:** Harthfolk, Nethkin, Changelings, Storm Drakonid

| Tier | Personal Buff (members) | Town Effect |
|------|------------------------|-------------|
| Minority | +3% bonus gold on market transactions | — |
| Chapter | +5% market bonus, access to price trend info (see rising/falling items) | — |
| Established | +8% market bonus, price trends + cross-town price visibility | +2% market bonus for all |
| Dominant | +10% market bonus, full price intelligence | +3% market bonus for all |
| **Shrine** | Black Market unlocked: alternative market channel. Zero fees, zero protections, no transaction records. High Priest operates. Items can be scammed (buyer beware). | — |

**Supporting system needed:** Market transaction bonus modifier, price trend tracking system (historical price data + trend analysis), cross-town price visibility, Black Market system (parallel market with different rules).

---

### The Uniters (Tried to keep the pantheon together)

---

### God 9 — Valtheris, The Bridge-Builder
**Domain:** Unity, cooperation, communication, hope
**Church:** The Accord of the Open Hand
**Philosophy:** Uniter
**Racial lean:** Half-Elves, cosmopolitan Humans, Storm Drakonid, trade hubs

| Tier | Personal Buff (members) | Town Effect |
|------|------------------------|-------------|
| Minority | +5% inter-racial reputation gains | — |
| Chapter | +10% reputation gains, reduced conversion cooldown (5 days instead of 7) | — |
| Established | +15% reputation gains, +5% foreign trade terms | +5% reputation gains for all |
| Dominant | +20% reputation gains, +10% foreign trade terms | +10% reputation gains for all, +5% foreign trade for all |
| **Shrine** | High Priest hosts diplomatic summits — temporary event improving racial relations in the entire region for 7 days. Costs church treasury. One per term. | — |

**Supporting system needed:** Racial reputation system (per-character standing with each race), foreign trade modifier (cross-town market transactions), diplomatic summit event system.

---

### God 10 — Domakhar, The Iron Crown
**Domain:** Authority, order, law through strength, empire
**Church:** The Mandate of the Iron Crown
**Philosophy:** Uniter (through force)
**Racial lean:** Authoritarian factions everywhere, ambitious Humans, Orc war-chiefs, Flame Drakonid

| Tier | Personal Buff (members) | Town Effect |
|------|------------------------|-------------|
| Minority | +3% law enforcement effectiveness | — |
| Chapter | +5% law enforcement, town guard strength bonus | — |
| Established | +8% law enforcement, reduced crime/corruption impact | +3% law enforcement for all |
| Dominant | +10% law enforcement, strong town guard | +5% law enforcement for all, +10% guard capability |
| **Shrine** | High Priest can declare martial law — suspend elections for 7 days, mayor gets expanded powers, crime penalties doubled. Once per term. Most politically dangerous ability in the game. | — |

**Supporting system needed:** Law enforcement metric on towns, town guard system, crime system (for penalties to apply to), martial law mechanic (election suspension + power expansion).

---

### The Nihilists (Wanted it all to burn)

---

### God 11 — Morvaine, The Hollow
**Domain:** Truth, disillusionment, entropy, endings
**Church:** The Ashen Witness
**Philosophy:** Nihilist (passive)
**Racial lean:** Revenants, disillusioned veterans, Nethkin scholars. Small followings everywhere.

| Tier | Personal Buff (members) | Town Effect |
|------|------------------------|-------------|
| Minority | +5% corruption detection (see hidden political manipulation) | — |
| Chapter | +10% corruption detection, can identify anonymous notice board posters | — |
| Established | Expose hidden info: secret deals, embezzlement, concealed alliances | -10% political manipulation effectiveness for all |
| Dominant | Full transparency: all hidden political actions visible | -20% political manipulation for all |
| **Shrine** | High Priest triggers "Crisis of Faith" targeting another church — reduces that church's effectiveness by 25% for 7 days. Once per term. Tears down, never builds. | — |

**Supporting system needed:** Corruption/political manipulation system (hidden actions that can be detected), anonymous identity system on notice board, Crisis of Faith mechanic (temporary church debuff).

---

### God 12 — Seraphiel, The Grieving
**Domain:** Loss, memory, vengeance, bittersweet beauty
**Church:** The Choir of Ashes
**Philosophy:** Nihilist (active, grief-driven)
**Racial lean:** Dwarves (grudge-keepers), Half-Orcs, anyone who's lost something

| Tier | Personal Buff (members) | Town Effect |
|------|------------------------|-------------|
| Minority | Access to historical records (town political history, past elections, past wars) | — |
| Chapter | Historical records + "blood memory" — surface racial grudges for diplomatic leverage | — |
| Established | Blood memory active: invoke historical events to influence diplomacy (+/-) | +5% diplomatic/reputation interactions for all |
| Dominant | Full blood memory + grudge tracking system | +10% diplomatic/reputation interactions for all |
| **Shrine** | High Priest calls a Reckoning — formal demand for justice for a historical wrong. Forces town-wide vote. Passed: targeted diplomatic penalty against a race/town for 30 days. Failed: calling church loses 10% membership. Highest-stakes ability in the game. | — |

**Supporting system needed:** Historical records system (log of major events, elections, wars per town), blood memory mechanic (surface historical grudges for diplomatic modifiers), Reckoning mechanic (town vote with pass/fail consequences), grudge tracking system.

---

## Supporting Systems Required

These systems don't exist yet and must be built to support the god mechanics. Organized by how many gods depend on them:

### Tier 1 — Multiple Gods Need These

| System | Used By | Description |
|--------|---------|-------------|
| **Town Metrics** (Defenses, Public Health, Law Enforcement) | Aurvandos, Kethara, Domakhar | Numeric values on towns (0-100) that affect gameplay. Religion modifies them, other systems read them. |
| **Racial Reputation** | Valtheris, Seraphiel | Per-character standing with each race. Affects trade terms, NPC interactions, diplomacy. |
| **Market Modifiers** | Veradine, Tessivane, Vareth, Valtheris | Tax overhead, market fees, transaction bonuses — modifiers on existing market calculations. |
| **Crafting Modifiers** | Tyrvex, Vareth | Quality bonus, yield bonus, material cost reduction — modifiers on existing crafting calculations. |
| **Election Integrity** | Solimene, Domakhar | Metric that affects how resistant elections are to manipulation. |

### Tier 2 — One or Two Gods Need These

| System | Used By | Description |
|--------|---------|-------------|
| **Road Danger Modifier** | Aurvandos | Modify encounter rates on travel routes near the town. |
| **Food Effectiveness Modifier** | Kethara | Scale food buff duration/magnitude. |
| **Price Trend Tracking** | Tessivane | Historical price data per item per town, trend analysis. |
| **Black Market** | Tessivane | Parallel market channel with zero fees, zero protections. |
| **Meditation System** | Xol'Thira | Daily free action generating random active effects. |
| **Prophecy/Vision System** | Xol'Thira, Tyrvex | Hints about upcoming events, hidden information. |

### Tier 3 — Unique Political Mechanics

| System | Used By | Description |
|--------|---------|-------------|
| **Referendum** | Solimene | Town-wide vote on a policy question, bypasses mayor. |
| **Martial Law** | Domakhar | Temporary election suspension + expanded mayor powers. |
| **Tariff System** | Vareth | Non-resident surcharge on market transactions. |
| **Corruption/Transparency** | Morvaine | Hidden political actions that can be detected/exposed. |
| **Crisis of Faith** | Morvaine | Temporary debuff on a target church. |
| **Blood Memory / Grudge Tracking** | Seraphiel | Historical event log + diplomatic modifier invocation. |
| **Reckoning** | Seraphiel | Town vote with diplomatic penalty on pass, membership loss on fail. |
| **Diplomatic Summit** | Valtheris | Temporary regional reputation boost event. |
| **Economic Policy Bypass** | Veradine | High Priest proposes policy without council vote. |
| **Healing House** | Kethara | Debuff/status effect curing service. |
| **Research Recipes** | Tyrvex | New recipe category for knowledge/arcane progression. |
| **Historical Records** | Seraphiel | Log of major events per town for reference/leverage. |

---

## Implementation Phases

Ordered by dependency — each phase builds on the previous, and earlier phases provide the most foundational systems.

### Phase A — Core Religion Infrastructure
**Systems built:** Patron god selection, church membership tracking, tithe system, church treasury, membership tier calculation, High Priest elections, Temple page UI.
**Gods implemented:** None with unique mechanics yet — all gods provide standardized personal buffs (placeholder values) while infrastructure is built.
**Estimated scope:** ~4-5 prompts (schema + server + tick + elections + client).

### Phase B — Buff Gods (Tier A: Aurvandos, Kethara, Tyrvex, Vareth)
**Systems built:** Town Metrics (Defenses, Public Health), crafting modifiers, food effectiveness modifier, road danger modifier, local crafting yield modifier, Shrine system.
**Gods fully implemented:** 4 gods with per-tier buffs and Shrine abilities.
**Estimated scope:** ~4-5 prompts (modifiers + town metrics + shrine + per-god wiring).

### Phase C — Economic Gods (Tier B: Veradine, Tessivane, Valtheris)
**Systems built:** Market modifiers (tax overhead, transaction bonus, fees), price trend tracking, cross-town price visibility, racial reputation, foreign trade modifiers, tariff system, Black Market.
**Gods fully implemented:** 3 more gods (7 total).
**Estimated scope:** ~5-6 prompts (market modifiers + price trends + Black Market + racial reputation + tariffs).

### Phase D — Political Gods (Tier C: Solimene, Domakhar, Seraphiel)
**Systems built:** Election integrity, dispute resolution, referendum mechanic, law enforcement metric, crime system, martial law, historical records, blood memory, grudge tracking, Reckoning.
**Gods fully implemented:** 3 more gods (10 total).
**Estimated scope:** ~6-8 prompts (election integrity + referendums + law enforcement + martial law + historical records + Reckoning).

### Phase E — Novel Gods (Tier D: Xol'Thira, Morvaine)
**Systems built:** Meditation system (random effects), prophecy/vision system, corruption detection/transparency, Crisis of Faith mechanic.
**Gods fully implemented:** 2 final gods (all 12 complete).
**Estimated scope:** ~4-5 prompts (meditation + prophecy + corruption + crisis of faith).

### Total estimated scope: ~23-29 implementation prompts across 5 phases.

---

## Open Design Questions (to resolve during implementation)

1. **Consecration cost:** How much gold from church treasury to consecrate a Shrine? Suggest 500-1000g scaling with town prosperity.
2. **Tithe collection timing:** Collected at what point in the daily tick? After income calculation, before expenses.
3. **Church-Mayor conflict:** Can the Mayor block church actions? Can the High Priest block mayor actions? Suggest: neither can directly block, but Solimene's referendum and Domakhar's martial law create indirect checks.
4. **Cross-town church coordination:** The lore mentions this unlocks at higher membership tiers. Design needed: what does cross-town coordination look like? Suggest: churches with chapters in multiple towns can share treasury, coordinate Shrine abilities, and the High Priest of the largest chapter becomes the regional church leader.
5. **Atheist gameplay:** Are there any mechanics specifically for atheists, or are they simply unaffected by personal buffs? Suggest: no special atheist mechanics — they just benefit from town-wide dominant buffs without contributing tithes.
6. **Multiple High Priests:** If a god has chapters in multiple towns, each town has its own High Priest. They operate independently unless cross-town coordination is unlocked.
7. **Shrine ability cooldowns:** "Once per term" for most abilities. How long is a term? Match the mayor election term length.
8. **Black Market scam mechanic (Tessivane):** How does "items can be scammed" work? Suggest: Black Market transactions have a small random chance of failure (item not delivered, gold not refunded). Risk/reward tradeoff for zero-fee trading.
9. **Meditation negative effects (Xol'Thira):** How bad can the negative roll be? Suggest: cap at -1 to a random stat for 24h. Annoying but not crippling. Higher tiers reduce negative frequency.
10. **Reckoning failure membership loss (Seraphiel):** "10% membership loss" means what exactly? Suggest: 10% of the church's members in that town are auto-converted to atheism. Harsh but thematic — the church overreached and people leave in disgust.

---

*Designed March 13, 2026. Based on WORLD_LORE.md god definitions and brainstorming session.*
*Implementation begins with Phase A (Core Infrastructure).*
