# Prompt 06 — Social, Guilds & Real-Time
# Dependencies: 01
# Teammates: 4
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

You are the team lead. Use agent teams. Spawn a team of 4 teammates
to build social and real-time systems:

1. Teammate "messaging-system" — Build messaging backend:
   - Private messages between players
   - Town chat (all players in same town)
   - Kingdom chat (all players in same kingdom)
   - Guild chat
   - Global announcements channel (political events, wars, etc.)
   - Use Socket.io for real-time delivery
   - API: POST /api/messages/send, GET /api/messages/inbox,
     GET /api/messages/conversation/:id

2. Teammate "guild-system" — Build guild backend:
   - Create guild (costs gold), set name, crest, description
   - Invite/kick members, officer ranks with permissions
   - Guild treasury (members can donate)
   - Guild quests (cooperative objectives)
   - Guild hall building in towns (unlocks perks)
   - Guild reputation earned through member actions
   - API: full CRUD for guilds, membership management, treasury

3. Teammate "realtime-engine" — Build the real-time event system:
   - Socket.io server integrated with Express
   - Events: player enters/leaves town, combat results, elections,
     trade completed, chat messages, travel updates
   - Presence system: show who's online, who's in your town
   - Notification system: toast notifications for relevant events
   - Rate limiting and authentication on socket connections

4. Teammate "social-frontend" — Build social UI in /client:
   - Chat panel (tabbed: town, kingdom, guild, private)
   - Player profile pages (character sheet, achievements, reputation)
   - Guild page (members, treasury, quests, management for officers)
   - Friends list and online status
   - Notification dropdown with recent events
   - Player search/lookup

After all teammates complete and report back, integrate real-time
features across the entire app — chat should work everywhere,
notifications should fire for political, economic, and combat events,
and player presence should show on town views.
