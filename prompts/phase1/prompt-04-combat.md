# Prompt 04 — Combat System
# Dependencies: 03
# Teammates: 4
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

You are the team lead. Use agent teams. Spawn a team of 4 teammates
to build the D&D-inspired combat system:

1. Teammate "combat-engine" — Build the core combat engine in /server:
   - Turn-based combat using initiative rolls (d20 + DEX modifier)
   - Action types: Attack, Cast Spell, Use Item, Defend, Flee
   - Attack rolls: d20 + modifiers vs target AC
   - Damage rolls: weapon die + STR/DEX modifier
   - Spell system: spell slots per level, save DCs, spell effects
   - Status effects: poisoned, stunned, blessed, burning, frozen, etc.
   - Death at 0 HP -> player respawns in town with penalties
     (gold loss, XP loss, equipment damage)
   - Combat log recording every action for replay

2. Teammate "pve-system" — Build PvE encounters:
   - Monster database with stats (Goblin, Wolf, Bandit, Skeleton, Dragon, etc.)
   - Encounter zones near each town with level-appropriate monsters
   - Dungeon system: multi-room encounters with boss at the end
   - Loot tables per monster (items, gold, XP)
   - API: POST /api/combat/pve/start, POST /api/combat/pve/action,
     GET /api/combat/pve/state
   - Quest-linked encounters

3. Teammate "pvp-system" — Build PvP combat:
   - Challenge another player to a duel (both must accept)
   - Arena system in towns with barracks
   - Wager system (bet gold on the outcome)
   - Rankings/leaderboard based on PvP wins
   - API: POST /api/combat/pvp/challenge, POST /api/combat/pvp/accept,
     POST /api/combat/pvp/action
   - Anti-grief: level difference limits, cooldowns

4. Teammate "combat-frontend" — Build the combat UI in /client:
   - Battle screen with player and enemy portraits, HP/MP bars
   - Action menu: Attack, Spells (expandable list), Items, Defend, Flee
   - Animated combat log showing each action and result
   - Dice roll animations (show the d20 rolling)
   - Damage numbers floating up
   - Victory/defeat screen with loot summary
   - Turn indicator and initiative order display

After all teammates complete and report back, connect combat to the
world — players can enter encounter zones from the town view, fight
monsters, earn loot and XP, level up, and challenge other players.
