# Prompt 09 — Profession System Foundation
# Dependencies: 03
# Teammates: 4
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

You are the team lead. Use agent teams. Spawn a team of 4 teammates
to build the profession system foundation.

Context: This game has a player-driven economy where NO item appears
from nothing. Every finished item traces back through a chain of player
professions. A single character can have a maximum of 3 professions
(mix of Gathering, Crafting, and Service). Professions level from 1-100
with tiers: Apprentice (1-10), Journeyman (11-25), Craftsman (26-50),
Expert (51-75), Master (76-90), Grandmaster (91-100).

1. Teammate "profession-schema" — Extend the Prisma schema with:
   - PlayerProfession model (playerId, professionType, level, currentXP,
     xpToNextLevel, tier, specialization)
   - Profession enum: FARMER, RANCHER, FISHERMAN, LUMBERJACK, MINER,
     HERBALIST, HUNTER, SMELTER, BLACKSMITH, ARMORER, WOODWORKER, TANNER,
     LEATHERWORKER, TAILOR, ALCHEMIST, ENCHANTER, COOK, BREWER, JEWELER,
     FLETCHER, MASON, SCRIBE, MERCHANT, INNKEEPER, HEALER, STABLE_MASTER,
     BANKER, COURIER
   - ProfessionCategory enum: GATHERING, CRAFTING, SERVICE
   - ProfessionTier enum: APPRENTICE, JOURNEYMAN, CRAFTSMAN, EXPERT,
     MASTER, GRANDMASTER
   - Validation: max 3 professions per character, with rules
     (max 2 gathering, max 2 crafting, max 1 service)
   - ProfessionXPLog (track XP gains over time for analytics)
   - Run migration

2. Teammate "profession-backend" — Build profession management APIs:
   - POST /api/professions/learn — learn a new profession (validates
     the 3-profession limit and category rules)
   - POST /api/professions/abandon — abandon a profession (confirms
     with warning about losing all progress)
   - GET /api/professions/mine — get all my professions with levels
   - GET /api/professions/info/:type — get profession details,
     description, tier unlocks, what it produces
   - Profession XP system: addProfessionXP(playerId, professionType, amount)
     — handles leveling up, tier promotions, notifications
   - Tier unlock checker: what recipes/abilities are available at current level
   - XP curve: each level requires progressively more XP
     (level 1->2: 100xp, level 99->100: 50,000xp)

3. Teammate "profession-selection-frontend" — Build the profession
   selection UI in /client:
   - Profession browser page: show all 28 professions organized by
     category (Gathering, Crafting, Service)
   - Each profession card shows: icon, name, description, what it
     produces, what it needs as input, which town types are best for it
   - "Learn Profession" flow with validation (shows remaining slots,
     warns about limits)
   - My Professions dashboard: current professions, level bars,
     tier badges, XP progress

4. Teammate "profession-data" — Create the profession data files
   in /shared:
   - Full profession definitions (name, category, description,
     stat that affects quality, related professions)
   - XP curve table (level -> XP required)
   - Tier definitions (level range, title, perks description)
   - Profession compatibility rules (which combos are allowed)
   - Profession-to-town-type affinity map (miners do best in
     mountain towns, farmers in plains, etc.)
   - Export as typed constants so both frontend and backend use
     the same data

After all teammates complete and report back, verify that a player
can browse professions, learn up to 3, see their profession dashboard,
and that the XP system correctly levels them up through tiers.
Summarize what was built and flag any design decisions that need my input.
