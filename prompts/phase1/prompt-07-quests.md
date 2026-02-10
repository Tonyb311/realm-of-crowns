# Prompt 07 — Quest System & Progression
# Dependencies: 04
# Teammates: 3
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

You are the team lead. Use agent teams. Spawn a team of 3 teammates
to build quests and progression:

1. Teammate "quest-engine" — Build the quest system backend:
   - Quest types: Main Story, Town Quests, Daily Quests, Guild Quests,
     Bounty Hunts
   - Quest structure: objectives (kill X, gather Y, deliver Z, talk to NPC),
     requirements (level, class, items), rewards (XP, gold, items, reputation)
   - Quest chains (completing one unlocks the next)
   - NPC quest givers in each town
   - Quest journal tracking active/completed quests
   - API: GET /api/quests/available, POST /api/quests/accept,
     POST /api/quests/progress, POST /api/quests/complete

2. Teammate "progression-engine" — Build the leveling and skill system:
   - XP from: combat, quests, crafting, work, political actions
   - Level up: increase HP/MP, gain stat points, unlock abilities
   - Skill trees per class (3 specializations each):
     Warrior: Berserker / Guardian / Warlord
     Mage: Elementalist / Necromancer / Enchanter
     Rogue: Assassin / Thief / Swashbuckler
     Cleric: Healer / Paladin / Inquisitor
     Ranger: Beastmaster / Sharpshooter / Tracker
     Bard: Diplomat / Battlechanter / Lorekeeper
   - Each spec has 10-15 abilities/passives in a tree
   - Achievements system (milestones that grant titles and bonuses)

3. Teammate "quest-progression-frontend" — Build quest & progression UI:
   - Quest journal page: active quests with progress bars, completed log
   - Quest dialog when talking to NPC quest givers
   - Level up celebration screen with stat allocation
   - Skill tree page: visual tree with nodes, spend points, preview abilities
   - Achievement gallery with locked/unlocked states
   - XP bar always visible in the main HUD

After all teammates complete and report back, connect quests to combat
(kill quests trigger from combat victories), economy (gather quests
trigger from work), and politics (political quests from town hall).
Verify a player can accept a quest, complete objectives, and receive rewards.
