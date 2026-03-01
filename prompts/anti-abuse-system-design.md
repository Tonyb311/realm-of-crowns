# Anti-Abuse & Multi-Account Detection System — Design Document

You are the Team Lead for a browser-based roleplay game project. Your role is to analyze incoming tasks, break them down into work items, and dynamically create virtual teammates with specialized roles to complete them efficiently.

Be a truth-seeking collaborator, not a cheerleader. Challenge flawed premises directly, flag scope creep, point out overcomplication, and highlight trade-offs being glossed over. Accuracy > agreement. Think beyond the request — anticipate implications, spot gaps, and suggest unconsidered approaches proactively.

## How You Operate

When given a task:

1. **Assess the Task** — Determine the scope, complexity, and which disciplines are needed (frontend, backend, game design, narrative, art direction, etc.).
2. **Assemble the Team** — Create the minimum number of virtual teammates needed, each with a clear name, role, and specialty.
3. **Delegate & Execute** — Assign work items to each teammate. Present each teammate's contribution clearly, prefixed with their name and role.
4. **Integrate & Deliver** — Combine all outputs into a cohesive deliverable. Ensure game mechanics, narrative, UI, and code all align.

## Team Creation Rules

- Each teammate gets a **name**, a **role title**, and a **brief specialty description**.
- Teammates should have complementary — not overlapping — skills.
- Only create teammates that are actually needed. Don't pad the team.
- Common roles include (but aren't limited to):
  - **Game Designer** — Mechanics, systems, balance, progression, combat
  - **Narrative Designer** — Story, lore, dialogue, quests, world-building
  - **Frontend Developer** — HTML/CSS/JS, UI components, responsive layout, animations
  - **Backend Developer** — Server logic, databases, APIs, authentication, state management
  - **UX/UI Designer** — Interface layout, player flow, menus, HUD, accessibility
  - **Systems Architect** — Data models, infrastructure, tech stack decisions, scalability
  - **QA Tester** — Bug identification, edge cases, balance testing, player experience review
  - **Art Director** — Visual style, asset guidance, theming, mood and atmosphere

## Context Awareness

- This is a browser-based RPG. All solutions should target web technologies (HTML, CSS, JavaScript/TypeScript, Canvas/WebGL where appropriate, and relevant backend stacks).
- Player experience is paramount. Every decision — mechanical, visual, or technical — should serve immersion and engagement.
- Consider both solo and multiplayer implications when relevant.
- Keep scope realistic for a browser game. Avoid over-engineering or suggesting AAA-scale solutions.

## Communication Style

- As Team Lead, speak in first person when coordinating.
- When presenting a teammate's work, use their name and role as a header.
- After all teammates contribute, provide a **Team Lead Summary** that ties everything together and flags open questions or next steps.

## Key Principles

- Bias toward action. Start producing rather than over-planning.
- If a task is simple enough for one person, handle it yourself as Team Lead. No need to spin up a full team for a quick answer.
- Keep the game's vision consistent across all teammate contributions.
- Always end with a clear summary of what was delivered and what still needs the user's input.

---

## First Steps

Read the project operational guide and relevant agent instructions:

```
cat CLAUDE.md
cat .claude/agents/backend.md
```

## Task

Design a comprehensive **Anti-Abuse & Multi-Account Detection System** for Realm of Crowns. This is a design document — no code implementation yet. The output should be a detailed architecture blueprint saved to `docs/anti-abuse-system-design.md`.

## Context & Constraints

**Why This System Exists — Protecting the Core Game Design:**
- Realm of Crowns is built on **player interdependence**. The profession system is deliberately designed so that no single character can be self-sufficient. You NEED other players to supply what you can't make, buy what you produce, and cooperate on progression. This interdependence is what drives the entire social fabric of the game — trading, guilds, politics, alliances, and the player-driven economy.
- A player who creates mule accounts with complementary professions (their own blacksmith, farmer, herbalist, etc.) **destroys this design**. They become a self-contained economy. They don't need the community, so they don't participate in it. And the legitimate players who chose those professions lose a potential customer/trading partner.
- Multi-accounting doesn't just break rules — it hollows out the multiplayer experience from the inside. Every self-sufficient mule ring is one fewer node in the player economy, one fewer participant in political life, one fewer reason for other players to engage.
- The one-character-per-person rule exists to protect this interdependence. The anti-abuse system exists to enforce it.

**The Core Problem — One Account Per Person Rule:**
- Players WILL try to violate this rule in ways we cannot fully predict.
- We can anticipate some methods (resource mule accounts, vote manipulation alts, espionage alts) but players are creative — they will find cheating angles we haven't imagined.
- Therefore the system MUST have two layers of defense:
  1. **General anomaly detection** — a broad baseline that flags ANY account behavior that deviates significantly from what the population normally does, regardless of whether we predicted that specific cheat method.
  2. **Known threat pattern matching** — specific detection logic for cheating methods we CAN anticipate (mule accounts, bot automation, vote manipulation, etc.).
- The general layer is arguably more important because it catches the things we didn't think of. The specific layer catches known threats faster and with higher confidence.

**Known Threat: Human-Operated Mule Accounts**
- A player creates 2-5 alt accounts and manually plays them as resource mules to feed their main character.
- These mule accounts are human-operated, so each one individually will exhibit human-like behavior. You CANNOT detect them by looking for robotic patterns.
- Detection must focus on the **relationships between accounts** — the economic flow, temporal exclusivity, and social asymmetry that reveal one person operating multiple accounts.
- Mule accounts exist to serve a main account. They gather, craft, and send resources in one direction. They don't socialize, explore, engage in politics, or do anything that doesn't serve the main's progression.
- A human can only actively play one account at a time. Mule accounts and main accounts are almost never online simultaneously — this temporal exclusivity is one of the strongest signals.
- Mule accounts have narrow, purposeful progression — they level exactly the professions the main needs, nothing more.

**Known Threat: Automated Bots**
- Actual scripted bots are detectable through non-human action patterns, suspicious optimality, and zero social engagement.

**Known Threat: Political Manipulation**
- Alt accounts created to vote for themselves or allies in elections, or to stack political outcomes.
- These may have zero economic trail — purely political engagement without the trade/resource signals that mule detection would catch.

**Known Threat: Social Manipulation / Espionage**
- Alt accounts used to infiltrate rival guilds, grief other players, or manipulate social dynamics.
- These may look like normal players individually — detection depends on relationship analysis and behavioral anomalies.

**Unknown Threats:**
- Players will invent cheating methods we have not anticipated. Alts exploiting event systems, daily rewards, market mechanics, or game systems that don't exist yet.
- The general anomaly detection layer must be broad enough to surface unusual patterns even when we don't know what specific cheat to look for. Anything that makes an account's behavioral profile a statistical outlier compared to the population should be surfaced for review.

**Why Traditional Prevention Fails:**
- 1 account per IP doesn't work: IPs are trivially changed, and we MUST allow multiple players from the same household/network.
- 1 account per email doesn't work: Free email addresses are unlimited.
- Phone verification adds friction for legitimate players and can be bypassed with VoIP numbers.

**The Philosophy:**
- Do NOT try to prevent account creation. That creates friction for legitimate players.
- Instead: **detect and flag post-creation.** Let cheaters invest time before action is taken — this is a stronger deterrent.
- Flags should be **explainable** — a human reviewer (or the solo dev) must understand WHY an account was flagged. No black-box scoring.
- The core question is never "is this account a bot?" — it's "does the relationship between Account A and Account B look like two independent people, or one person feeding themselves?"

## What the Design Document Must Cover

### 1. Behavioral Signal Taxonomy
Define every category of suspicious behavior the system should track. **Organize into a general anomaly layer (catches unknown threats) and specific threat pattern layers (catches known threats faster).**

**GENERAL ANOMALY DETECTION — The Safety Net:**
This layer doesn't look for specific cheat methods. It builds a behavioral profile for every account across ALL measurable dimensions and flags anything that's a statistical outlier compared to the population. This is the most important layer because it catches cheating methods we haven't predicted.

Design a comprehensive "account behavioral profile" that tracks at minimum:
- Activity distribution (% time spent on each game system: crafting, combat, trading, socializing, politics, exploration, etc.)
- Social graph metrics (number of unique interactions, diversity of connections, reciprocity of relationships)
- Economic profile (income sources, spending patterns, trade partner diversity, net flow direction)
- Progression shape (how skills/levels were acquired, breadth vs. depth, comparison to population norms)
- Temporal patterns (session frequency, duration, time-of-day distribution, regularity)
- Engagement breadth (how many of the game's systems does this account actually use?)

Any account whose profile deviates significantly from the population norm in ANY dimension should be surfaced for review — even if we can't categorize WHY it's unusual. The reviewer decides if it's cheating, a unique playstyle, or a false positive. Over time, confirmed cases teach us new threat patterns we didn't anticipate.

**KNOWN THREAT PATTERNS — Targeted Detection:**
These are specific cheat methods we can anticipate. They generate higher-confidence flags faster than general anomaly detection.

**Pattern A — Mule Account Detection:**
These signals detect the RELATIONSHIP between accounts, not individual account behavior. A mule account may look perfectly human in isolation — the tells are in how accounts interact with each other.

- **Economic Directionality** — The single strongest signal. One-directional resource flows between accounts (Account A always sends to B, never receives). Accounts that trade exclusively with each other. Gift/trade volume disproportionate to relationship age. Track the net resource flow between every account pair over time.
- **Temporal Exclusivity** — One human can only play one account at a time. If Account A and Account B are never online simultaneously (or only overlap briefly during account switching), that's a massive red flag. Track login/logout timing correlations. Look for "handoff" patterns where one account logs out and another logs in within minutes.
- **Social Asymmetry** — The main account has friends, guild membership, political activity, chat history. The mule accounts have none of this, or only interact with the main. Compare social engagement breadth between linked accounts.
- **Progression Narrowness** — Mule accounts level exactly the professions the main needs. They don't explore, don't try different things, don't make "mistakes" in their build. Their skill progression is suspiciously purposeful and complementary to specific other accounts.
- **Account Lifecycle Patterns** — Mules are often created around the same time, or created when the main hits a resource bottleneck. Track account creation clustering and correlate with the main account's progression timeline.
- **Relationship Graph Isolation** — Real players have diverse social connections. A cluster of 3-5 accounts that interact almost exclusively with each other and have minimal connections to the broader player network is a classic mule ring.

**Pattern B — Automated Bot Detection:**
These signals detect non-human behavior patterns for cases where players use actual scripts/automation.

- **Action Sequence Analysis** — Identical or near-identical sequences of actions repeated mechanically. Suspiciously optimal pathing (no exploration, no wasted actions). Inhuman consistency in timing between actions.
- **Session Shape Anomalies** — No warmup/cooldown periods. Immediate optimal action chains upon login. Unnaturally consistent session durations. No breaks or idle periods.
- **Reaction to Novelty** — When new content is released, real players explore it. Bots continue executing their existing routines until reprogrammed.

**Pattern C — Political Manipulation:**
- Accounts that register, vote in elections or referendums, but have minimal other engagement.
- Coordinated voting blocs — groups of accounts that always vote the same way and have suspicious relationship patterns.
- Accounts whose political engagement dramatically outweighs their gameplay engagement.

**Pattern D — Social Manipulation / Espionage:**
- Alt accounts joining multiple opposing guilds simultaneously.
- Accounts with access to privileged guild information that correlates with strategic actions by rival players.
- Unusual patterns of guild joining/leaving.

**SURVEILLANCE TIER SYSTEM — Elevated Monitoring Watchlist:**
Not all accounts need the same level of scrutiny. Design a tiered monitoring system that conserves resources by running lightweight checks on everyone and deep behavioral analysis only on accounts that have been elevated to a watchlist.

Accounts should be elevated to closer monitoring (NOT flagged or punished — just watched more carefully) based on infrastructure signals:

- **Shared IP accounts** — Any accounts that have logged in from the same IP address. Could be a household, could be mules. The relationship between these accounts gets deeper analysis than two random unconnected accounts.
- **Known VPN / Proxy IPs** — Maintain a list of known VPN/proxy/datacenter IP ranges. Legitimate players use VPNs, but this justifies tighter behavioral monitoring. Cross-reference with public VPN IP databases.
- **Frequent IP changes** — Compare each account's IP change frequency against the population baseline. Most players connect from 1-3 IPs (home, work, mobile). An account cycling through many different IPs is a statistical outlier worth watching.
- **Flagged network origins** — If cheating has been previously confirmed from a specific network fingerprint or IP range, new accounts originating from that same source get immediate elevated monitoring.
- **Device fingerprint sharing** — Multiple accounts sharing the same browser/device fingerprint get elevated monitoring on their inter-account relationship.
- **Account age + behavior mismatch** — Brand new accounts that immediately exhibit expert-level optimal play patterns (suggesting an experienced player's alt, not a new player).

Design the monitoring tiers:
- **Tier: Standard** — All accounts. Lightweight periodic profiling. General anomaly detection runs on population-level aggregated data.
- **Tier: Elevated** — Accounts matching any of the above infrastructure signals. More frequent behavioral profiling. Relationship analysis runs actively between all elevated accounts that share signals.
- **Tier: Active Investigation** — Accounts that have triggered anomaly flags or known threat pattern matches. Full deep behavioral analysis. All interactions logged in detail.

The tier system must be invisible to players — no player should be able to tell what monitoring tier they're on. Tier elevation/de-elevation should happen automatically based on signals, with manual override capability for the admin.

**CORRELATION SIGNALS — Supporting Evidence Only:**
These are never sufficient on their own but strengthen a case when combined with anomaly flags or known threat patterns.

- **Browser/Device Fingerprinting** — Canvas fingerprint, WebGL renderer, installed fonts, screen resolution, timezone, language settings. NOT used as proof — used as a correlation signal alongside behavioral data. Must be privacy-respecting (hashed, not stored raw). Multiple accounts sharing the same fingerprint is suspicious but not conclusive (family computer).
- **Network Correlation** — Shared network signatures as a weak signal only (because households are legitimate). Only meaningful when combined with behavioral signals.

### 2. AI-Assisted Evasion & Countermeasures
AI tools (ChatGPT, Claude, etc.) are freely available to players. Assume every cheater has access to an AI advisor that can:
- Analyze how anti-cheat systems work and suggest specific evasion strategies.
- Generate natural-looking chat messages so mule/bot accounts appear socially engaged without the player investing real time.
- Advise players on adding realistic behavioral noise (random trades, varied timing, fake exploration) to blur their statistical profile toward the population mean.
- Reverse-engineer detection logic from warnings or bans — if a player is warned, they can feed that context to an AI and get a tailored evasion plan.
- Help players build sophisticated automation scripts that mimic human behavior patterns including realistic delays, session variability, and error injection.

The design document must address:
- **What signals remain strong even when a cheater uses AI to optimize evasion?** (Hint: temporal exclusivity — one person physically cannot play two accounts simultaneously with fully organic behavior, no matter what an AI advises. Economic directionality is also hard to avoid because eliminating it defeats the purpose of having mules.)
- **How does the system handle "AI-polished" mule accounts that chat, explore, and add behavioral noise?** The general anomaly layer should still catch these because manufactured noise has different statistical properties than organic behavior — it tends to be too evenly distributed, too consistent in its randomness, or poorly correlated with in-game events.
- **Adversarial self-testing** — The design should include a recommendation for the dev team to literally attempt to cheat the game using AI assistance during testing phases. Try to create and operate mule accounts while using AI to evade detection. Document what works and what doesn't. This is the single best way to find weaknesses before players do.
- **Detection of AI-generated social content** — Chat messages generated by AI have statistical properties (sentence structure, vocabulary distribution, response timing, topic relevance) that differ from genuine human chat. Consider whether chat analysis is feasible and valuable.

### 3. Game Design as Anti-Cheat
Detection is only half the solution. The other half is designing game mechanics that inherently make multi-accounting less valuable, so cheating isn't worth the effort even if you don't get caught.

The design document must explore (and recommend which are appropriate for Realm of Crowns):

- **Relationship-gated trading** — High-value trades require an established in-game relationship (time-gated, built through mutual activities). New or shallow relationships can only trade low-value items. This makes mule-to-main transfers slow and inefficient.
- **Diminishing returns from same source** — Resources received from the same account yield progressively less value, or trigger cooldowns. The 50th iron delivery from Account B is worth less than the 1st.
- **Trade taxes or friction** — A percentage of every trade is lost to the system. More frequent trades between the same pair incur increasing tax rates. This makes mule transfers inherently wasteful.
- **Social reputation systems** — Economic privileges (market access, trade limits, crafting tier unlocks) are gated behind social engagement metrics that can't be faked without significant time investment on every account.
- **Profession self-sufficiency** — If the profession system is designed so that mules provide only marginal advantage over self-sufficient play, the incentive to create alts is reduced.
- **Account-bound resources** — Certain high-value resources or progression tokens that simply cannot be traded, removing the mule incentive for those items.

For each mechanic, analyze: Does this hurt legitimate players? Does it reduce the mule advantage enough to matter? Does it fit the game's design philosophy? The goal is to find the sweet spot where cheating is unrewarding WITHOUT making normal trading and cooperation feel punitive.

### 4. Account Selling, Group Coordination & Other Threats
Threats beyond multi-accounting that the system should detect or account for:

- **Account selling/trading** — A player builds up a character and sells it to another person for real money. The behavioral profile (play patterns, decision-making style, session timing, social connections) suddenly shifts because a different human is now operating the account. Design detection for abrupt behavioral profile changes.
- **Account sharing is NOT a threat** — The game uses a daily action economy where each character gets a fixed number of actions per day regardless of who is playing. Multiple humans sharing one account cannot progress faster than a solo player — the action cap is per-character, not per-session. Free actions (chatting, socializing, exploring) provide no mechanical/economic advantage. Therefore account sharing does not need detection or enforcement. This is a deliberate game design decision that naturally prevents this category of abuse.
- **NOTE: The daily action economy also caps mule account output** — Each mule account can only generate a fixed amount of resources per day regardless of how actively it's played. This limits the damage multi-accounting can do and should be factored into how aggressively the system needs to respond to suspected mules. The threat is real but bounded.
- **Coordinated group cheating** — A real group of different people (not alts) who coordinate to exploit economic or political systems. Every account is genuinely a different person, so traditional alt-detection fails. Detection requires analyzing whether group behavior patterns indicate external coordination (e.g., market manipulation where multiple real players coordinate buying/selling through an outside Discord channel). This is the hardest threat to detect and should be acknowledged as such.
- **Real Money Trading (RMT)** — Players selling in-game resources for real money. Creates economic distortions and incentivizes botting/muling. May manifest as unusual trade patterns where one side of the trade gets nothing in-game (because they received payment externally).

### 5. Community Reporting & Behavioral Biometrics

- **Player reporting system** — Players are often the first to notice cheating. They see who's acting suspicious in their guild, their market, their political race. Design a reporting system that: captures useful context from the reporter, feeds into the flag/review queue alongside automated flags, tracks reporter reliability over time (to weight reports and identify false/malicious reporting), and protects reporters from retaliation.
- **Behavioral biometrics (research/future)** — Mouse movement patterns, click timing, scroll behavior, decision-making cadence, and navigation habits are unique to individual humans — like a behavioral fingerprint. If two accounts share near-identical biometric profiles, that's strong evidence they're the same person. This is extremely hard to fake even with AI assistance. Evaluate feasibility for a browser-based game — what can be captured client-side? What are the privacy implications? Is this Phase 2 or Phase 3 territory?

### 6. Enforcement & Economic Rollback
Catching cheaters is only half the problem. The design must address what happens AFTER detection.

**Economic Rollback & Clawback:**
- If a mule ring operated for 3 months before detection, the main account accumulated months of funneled resources, crafted items, and progression. Simply banning the mules while leaving the main untouched effectively rewards the cheater for not getting caught sooner.
- Design a resource clawback system: How do you calculate what was gained through illegitimate multi-accounting? How do you reverse it without breaking the character? What if those resources were already consumed, crafted into other items, sold on the market, or used in progression?
- Consider: full rollback (nuclear — reset the main to pre-mule state), partial clawback (remove estimated ill-gotten gains), economic penalty (fine the main account a percentage of wealth), or progression freeze (lock the account at current state while investigation completes).
- What happens to items the cheater sold to LEGITIMATE players through the market? You can't punish innocent buyers. The ripple effects of clawback in a player-driven economy are complex.

**Punishment Tiers & Policy:**
- What happens to mule accounts? (Permanent ban is obvious, but when?)
- What happens to the MAIN account? First offense warning? Trading restriction? Temporary ban? Permanent ban? This needs a clear escalation policy.
- What if the player spent real money (cosmetics, future premium features)? Banning a paying customer has legal and customer service implications. Does a refund apply? Does spending money buy leniency? (It shouldn't, but the policy needs to be explicit.)
- Community communication — when a prominent player is banned for multi-accounting, how is this communicated? Transparency builds trust but also gives cheaters information about what got caught.
- Appeal process — false positives WILL happen. A wrongly banned player needs a clear path to appeal, and the system needs to be able to present its evidence in a way the player can understand and dispute.

**Deterrence Strategy:**
- Visible deterrence stops casual cheaters before they start. Include language in Terms of Service, registration page, and potentially in-game that multi-accounting is monitored and enforced.
- How much do you reveal about detection methods? Enough to deter ("we use behavioral analysis and relationship monitoring") without giving a roadmap (don't list specific signals or thresholds).
- Publicize enforcement actions in general terms ("X accounts were banned this month for multi-accounting violations") to signal that the system is active without revealing specifics.
- The strongest deterrent is uncertainty — cheaters should never be confident they know exactly what the system checks.

### 7. Honeypot & Bait Mechanics
Game design elements that specifically bait multi-accounters into revealing themselves.

- **"Refer a friend" or account-linking bonuses** — Tempting for someone creating alts. Both accounts get flagged for elevated surveillance when a referral link is used. Legitimate referrals pass surveillance easily; mule referrals get caught by relationship analysis.
- **First-trade bonuses** — New accounts get a small bonus on their first few trades. Multi-accounters creating fresh mules will trigger this repeatedly from the same network/fingerprint.
- **Crafting chain efficiency traps** — Certain profession combinations that are suspiciously efficient ONLY if one person controls both sides. If the system detects two accounts exploiting these chains exclusively with each other, it's a strong signal.
- **"Too good to be true" economic opportunities** — Market scenarios or limited-time offers that are only exploitable with coordinated multi-account action. Accounts that exploit these together get relationship-flagged.
- For each honeypot, the design must ensure legitimate players are never harmed or disadvantaged by these mechanics. The bait should only be meaningful to cheaters.

### 8. Solo Dev Operational Reality
This is an indie game run by one person. The anti-abuse system must be designed for that constraint.

- **Review capacity modeling** — At 100 players, manual review is feasible. At 1,000 players, how many flags per day? At 5,000? At 10,000? Model the expected flag volume at each scale and design the system so the solo dev isn't drowning in alerts.
- **Auto-resolution for clear-cut cases** — High-confidence flags (e.g., 5 accounts sharing a fingerprint, never online simultaneously, with 100% one-directional resource flow) should be auto-actionable with a single confirmation click, not requiring deep investigation.
- **Priority queue** — Flags should be ranked by severity AND by economic impact. A mule ring funneling massive resources is more urgent than a suspicious new account that hasn't done much yet.
- **Weekly/monthly digest mode** — For low-severity flags, batch them into a periodic review rather than real-time alerts. The solo dev should spend 30 minutes a week on anti-abuse, not 2 hours a day.
- **Dashboard requirements** — What does the admin interface actually need to show? Design for fast decision-making: account relationship visualizations, resource flow diagrams, timeline views of suspicious activity, one-click actions (warn, restrict, ban), and comparison views ("here's what normal looks like, here's what this account looks like").
- **Scaling plan** — At what player count does anti-abuse require dedicated time? At what point does it justify hiring a community moderator? At what point does automated ML become necessary to maintain the system without burning out?

### 9. Feedback Loop Into Game Design
The anti-abuse system is an intelligence source, not just an enforcement tool.

- **Pattern reporting** — The system should generate periodic reports on HOW players attempt to cheat. If 80% of mule rings exploit a specific crafting chain or profession combination, that's a signal that the game design needs rebalancing, not just better detection.
- **Economy health metrics** — Anti-abuse data reveals the health of the interdependence model. If many players FEEL the need to create mules, maybe certain profession supply chains are too bottlenecked and the legitimate economy isn't meeting demand.
- **Detection-informed design changes** — New game features should be evaluated through an anti-abuse lens before release. "If we add this feature, how would a multi-accounter exploit it?" The anti-abuse team (even if it's just you) should review major feature designs.
- **Community sentiment integration** — Player reports and forum complaints about suspected cheating are qualitative data. Track what the community thinks is unfair even if the system hasn't flagged it yet — they may be seeing things the algorithm missed.
- **Cheater innovation tracking** — When new evasion techniques are discovered (through detection or through adversarial self-testing), document them. Build a living knowledge base of known cheating methods and their counters. This becomes the training data for future ML models.

### 10. Detection Architecture
Design a layered detection system:

- **Layer 1: Rules-Based Heuristics** — Simple, fast, deterministic checks. "Account A has sent resources to Account B 50 times and received 0 times" is a rule, not AI. Define the specific rules and their thresholds.
- **Layer 2: Statistical Anomaly Detection** — Compare each account's behavior profile against the population distribution. Z-score or percentile-based flagging. "This account's trade pattern is in the 99.8th percentile for one-directional transfers." Define what metrics get statistical tracking.
- **Layer 3: Relationship Graph Analysis** — Build an account relationship graph based on interactions (trades, party membership, political alliances, guild co-membership). Identify suspicious clusters — tightly connected subgraphs with minimal outside connections. Detect ring trading patterns.
- **Layer 4: AI/ML Pattern Recognition (Future)** — Design the interface for this layer even if implementation is later. What training data would be needed? What model architecture makes sense for this scale? How do you handle the cold-start problem (no labeled data at launch)?

### 11. Data Model Design
Define what data needs to be collected and stored:

- What new database tables/collections are needed?
- What existing game actions need to emit tracking events?
- Data retention policies (how long to keep behavioral data).
- Schema designs for the behavioral event log, account relationship graph, and flag/review queue.
- Consider storage costs — this system will generate significant data volume.

### 12. Flag & Review System
Design the workflow for when suspicious activity is detected:

- Flag severity levels (informational, suspicious, high-confidence).
- What information is presented to the reviewer for each flag?
- What actions can be taken (warn, restrict trading, temporary ban, permanent ban)?
- Appeal process considerations.
- Dashboard/admin UI requirements (what views does the solo dev need?).

### 13. Evasion Resistance
Think like an attacker. For each detection method, describe:

- How a sophisticated cheater would try to evade it.
- What countermeasures make evasion harder.
- Which signals are hardest to fake (these are your most valuable signals).

### 14. Privacy & Ethics
- What data is collected and how is it protected?
- GDPR/privacy law implications.
- Transparency — should players know this system exists? (Yes — deterrence value.)
- False positive handling — how do you protect legitimate players?

### 15. Implementation Roadmap
Phase the system for realistic indie development:

- **Phase 1 (Launch):** What's the minimum viable detection? What can be done with simple database queries?
- **Phase 2 (Post-Launch):** What gets added as the player base grows and you have real data?
- **Phase 3 (Scale):** When does actual ML become justified? What player count makes the investment worthwhile?

### 16. Integration Points
Map where this system touches the existing Realm of Crowns codebase:

- Which existing systems need to emit events (trading, crafting, combat, politics)?
- Where does the detection engine run (background job? Separate service? Cron?)?
- How does it interact with the existing auth/account system?
- Admin API endpoints needed.

## Output

Save the complete design document to: `docs/anti-abuse-system-design.md`

The document should be detailed enough that a developer could pick it up 6 months from now and implement the system without needing additional context. Include diagrams described in text (mermaid-compatible where possible), concrete threshold examples, and specific PostgreSQL schema proposals.

## Deliverables

1. Complete design document at `docs/anti-abuse-system-design.md`
2. Git commit with message: `docs: add anti-abuse multi-account detection system design`
3. Push to remote

Do NOT deploy or run database migrations — this is a design document only.
