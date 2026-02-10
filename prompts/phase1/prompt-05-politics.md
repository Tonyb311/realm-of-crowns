# Prompt 05 — Political System & Governance
# Dependencies: 02
# Teammates: 3
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

You are the team lead. Use agent teams. Spawn a team of 3 teammates
to build the political and governance system:

1. Teammate "election-system" — Build elections backend in /server:
   - Town Mayor elections: any resident can run, all residents vote
   - Kingdom Ruler elections: only mayors can run, all citizens vote
   - Election cycle: nominations open -> campaigning period -> voting -> results
   - Real-time timers (e.g., voting lasts 48 real hours)
   - API: POST /api/elections/nominate, POST /api/elections/vote,
     GET /api/elections/current, GET /api/elections/results
   - Term limits and impeachment voting

2. Teammate "governance-system" — Build laws & governance backend:
   - Mayor powers: set tax rate, build/upgrade buildings, appoint
     sheriff, set trade policies, allocate treasury
   - Ruler powers: declare war/peace, set kingdom-wide laws,
     appoint council, manage kingdom treasury
   - Law system: mayors/rulers propose laws, council votes
   - Laws affect gameplay: tax rates change trade fees, military
     funding affects town guards, trade embargoes block certain items
   - Treasury management: income from taxes, spending on buildings/military
   - API: POST /api/governance/propose-law, POST /api/governance/vote-law,
     POST /api/governance/set-tax, GET /api/governance/laws

3. Teammate "politics-frontend" — Build the political UI in /client:
   - Town Hall page: current mayor, active laws, treasury balance,
     upcoming elections
   - Election page: candidates with platforms, voting booth, results
   - Governance panel (for mayors/rulers): propose laws, manage treasury,
     appoint officials
   - Kingdom overview: ruler, member towns, kingdom laws, diplomacy status
   - Notification system for political events (new election, law passed,
     war declared)

After all teammates complete and report back, integrate politics with
the economy — tax rates should actually affect marketplace fees,
building construction should cost from treasury, and wars between
kingdoms should affect travel and trade.
