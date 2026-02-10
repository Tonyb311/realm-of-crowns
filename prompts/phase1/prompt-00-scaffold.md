# Prompt 00 — Project Bootstrap
# Dependencies: None (run first)
# Teammates: 3
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

You are the team lead for a large full-stack game project called "Realm of Crowns."
This is a browser-based fantasy MMORPG inspired by Renaissance Kingdoms but with
D&D-style races, classes, magic, and combat.

Before we begin development, I need you to set up the project foundation.
Use agent teams. Spawn a team of 3 teammates:

1. Teammate "project-scaffolder" — Create the monorepo folder structure:
   - /client (React + TypeScript frontend)
   - /server (Node.js + Express + TypeScript backend)
   - /shared (shared types, constants, enums used by both)
   - /database (migration files, seed data)
   - /docs (game design docs, architecture docs)
   Initialize package.json in each, set up TypeScript configs, and install
   core dependencies (React, Express, Prisma, Socket.io, Zod).

2. Teammate "schema-architect" — Create a comprehensive Prisma schema
   covering these core models:
   - Player (auth, profile, race, class, stats, level, XP, gold, location)
   - Kingdom (name, ruler, treasury, laws, tax rate)
   - Town (name, kingdom, mayor, population, buildings, resources)
   - Character (race, class, HP, MP, STR, DEX, CON, INT, WIS, CHA, inventory)
   - Building (type, town, owner, level, production, workers)
   - Item (name, type, rarity, stats, effects, craftable, recipe)
   - Quest (name, description, requirements, rewards, type)
   - Trade (buyer, seller, item, quantity, price, status)
   - Election (type, town/kingdom, candidates, votes, status, endDate)
   - CombatLog (attacker, defender, actions, outcome, loot)
   - Guild (name, leader, members, treasury, reputation)
   - Message (sender, recipient, subject, body, read)
   Use proper relations, indexes, and enums for things like Race, Class,
   BuildingType, ItemType, Rarity, ElectionType.

3. Teammate "doc-writer" — Create /docs/GAME_DESIGN.md with a full Game
   Design Document covering:
   - Core gameplay loop (work, earn, craft, trade, fight, govern)
   - Races: Human, Elf, Dwarf, Halfling, Orc, Tiefling (with stat bonuses)
   - Classes: Warrior, Mage, Rogue, Cleric, Ranger, Bard (with abilities)
   - Economy system (resources, crafting, trading, taxes, supply/demand)
   - Political system (town mayors, kingdom rulers, elections, laws)
   - Combat system (turn-based, D&D-style with dice rolls, abilities, spells)
   - Magic system (spell slots, schools of magic, mana)
   - Progression system (XP, leveling, skill trees)
   - Time system (real-time actions like travel, crafting, rest)
   - Social systems (guilds, messaging, reputation, alliances)

After all teammates complete and report back, give me a summary of what
was created and flag any decisions that need my input.
