# Prompt 17 — Racial Diplomacy V2 (20-Race Relations)
# Dependencies: 16, 05
# Teammates: 3
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

You are the team lead. Use agent teams. Spawn a team of 3 teammates
to build the diplomacy system for 20 races.

Context: With 20 races, the diplomacy matrix is 20x20 (190 unique
pairings). Most start at Neutral, but there are significant
predefined relationships: Dwarf-Orc Blood Feud, Elf-Faefolk-Firbolg
Alliance, Outcast solidarity (Tiefling-Drow-Revenant-Changeling
Friendly), Crafter alliance (Dwarf-Gnome-Warforged), etc. Players
can shift these over time through political actions.

Use the complete 20x20 racial relations matrix from the design
document as the starting state.

1. Teammate "diplomacy-engine-v2" — Build the expanded diplomacy backend:
   - Seed the full 20x20 relations matrix (190 unique pairings) with
     default values from the design document
   - Diplomatic action system for kingdom/region rulers:
     * PROPOSE_TREATY: improve relations one step (needs other side approval)
     * DECLARE_WAR: worsen relations (unilateral)
     * TRADE_AGREEMENT: reduce tariffs between two kingdoms
     * NON_AGGRESSION_PACT: prevent PvP between kingdoms' players
     * ALLIANCE: full military alliance (requires FRIENDLY+ status)
     * BREAK_TREATY: cancel agreement (reputation penalty)
   - Relation change requirements scale with how deep the change is:
     * BLOOD_FEUD -> HOSTILE: 15,000 gold + 10 real days + both agree + zero PvP incidents
     * HOSTILE -> DISTRUSTFUL: 8,000 gold + 7 days
     * DISTRUSTFUL -> NEUTRAL: 3,000 gold + 4 days
     * NEUTRAL -> FRIENDLY: 5,000 gold + 5 days
     * FRIENDLY -> ALLIED: 10,000 gold + 10 days + active trade agreement 14+ days
     * Worsening is always instant and free
   - Exotic race diplomacy: exotic races with only 1-2 towns can
     still participate in diplomacy through their regional leader
   - Changeling special: Changelings can serve as neutral diplomatic
     intermediaries, reducing treaty costs by 20%
   - War system: declaration, war score (PvP kills, raids, territory),
     peace negotiation, reparations
   - Treaty history log: permanent record of all diplomatic actions
   - API: full diplomacy CRUD + war management + treaty history

2. Teammate "diplomacy-events-v2" — Build the world events system:
   - Global announcement system for diplomatic events:
     * War declarations, peace treaties, alliance formations
     * Border status changes, trade agreement signings
     * Formatted as in-game "Herald" messages with flavor text
   - War bulletin board during active conflicts
   - Diplomatic reputation per kingdom (treaty-keepers vs oathbreakers)
   - Monthly "State of Aethermere" report: all current relations,
     active treaties, ongoing wars, recent changes
   - Citizen petition system: players can petition their ruler for
     specific diplomatic actions (threshold of signatures triggers
     ruler notification)
   - Integration with notification/socket system for real-time alerts

3. Teammate "diplomacy-frontend-v2" — Build the diplomacy UI:
   - World Diplomacy overlay on the map:
     * Color-coded borders between all 21 regions
     * Active treaty icons, war indicators (crossed swords)
     * Click between two regions for full diplomatic history
   - Diplomacy panel for rulers: propose treaties, respond to proposals,
     manage wars, view active agreements
   - Diplomacy panel for citizens: view current relations, active
     treaties/wars, petition system, diplomatic history timeline
   - War dashboard: war score, battle log, enlist button for war quests
   - 20x20 relations matrix view: interactive grid showing all
     racial relationships with color coding, click any cell for details
   - Changeling diplomat bonus indicator when applicable

After all teammates complete and report back, verify: the full 20x20
matrix is seeded correctly, rulers can propose and accept treaties,
war can be declared and tracked, border statuses update based on
relations, and the diplomacy map overlay reflects current state.
Test changing Dwarf-Orc relations from Blood Feud toward Hostile
to verify the full process works.
