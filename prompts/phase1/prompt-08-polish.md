# Prompt 08 — Polish, Testing & Deployment
# Dependencies: 00, 01, 02, 03, 04, 05, 06, 07
# Teammates: 4
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

You are the team lead. Use agent teams. Spawn a team of 4 teammates
for final integration, polish, and deployment prep:

1. Teammate "integration-tester" — Write comprehensive tests:
   - API integration tests for all routes (auth, character, combat,
     economy, politics, quests)
   - Test the full gameplay loops end-to-end
   - Test edge cases: insufficient gold, duplicate votes, travel while
     in combat, crafting without materials
   - Socket.io event tests
   - Use Jest + Supertest

2. Teammate "ui-polish" — Polish the frontend:
   - Consistent fantasy theme across all pages (dark backgrounds,
     parchment textures, medieval fonts, gold accents)
   - Responsive design (desktop primary, tablet secondary)
   - Loading states and skeleton screens everywhere
   - Error handling with user-friendly messages
   - Tooltips on all interactive elements
   - Sound effects for key actions (combat hit, level up, gold earned)
   - Main HUD: character portrait, HP/MP bars, gold, XP bar,
     location, notifications

3. Teammate "performance-optimizer" — Optimize for multiplayer:
   - Database query optimization (add indexes, eager loading)
   - Redis caching for frequently accessed data (town info, market prices)
   - Rate limiting on all API routes
   - Socket.io room management (don't broadcast to everyone)
   - Lazy loading for frontend routes
   - Image optimization and CDN-ready asset pipeline

4. Teammate "deployment-setup" — Prepare deployment:
   - Docker Compose setup: app server, PostgreSQL, Redis
   - Environment variable configuration (.env.example)
   - Database migration and seed scripts
   - README.md with full setup instructions
   - CI/CD pipeline config (GitHub Actions)
   - Nginx reverse proxy config
   - SSL/HTTPS setup guide

After all teammates complete and report back, do a final review of the
entire codebase. Make sure all systems are connected, all APIs work,
the database schema is consistent, and the app can be started with a
single docker-compose up command. Give me a final status report.
