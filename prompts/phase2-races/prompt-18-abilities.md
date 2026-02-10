# Prompt 18 — All 20 Race Abilities in Combat & Professions
# Dependencies: 17, 04, 12
# Teammates: 4
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

You are the team lead. Use agent teams. Spawn a team of 4 teammates
to integrate ALL 20 races' abilities into combat and profession systems.

Context: Each race has 6 abilities (120 total abilities across 20 races).
Some are combat (Orc's Blood Fury, Dragonborn's Breath Weapon), some
affect professions (Dwarf's Master Forger, Gnome's Efficient Engineering),
and some are utility (Halfling's Luck, Changeling's shapeshifting).
All need to work in the actual game systems.

1. Teammate "combat-abilities-all" — Implement ALL combat-relevant
   racial abilities across 20 races:

   This includes (but is not limited to):
   - Human: Rally the People (party buff), Indomitable Will (save reroll)
   - Elf: Elven Accuracy (ranged advantage), Spirit Walk (invisibility)
   - Dwarf: Dwarven Resilience (poison resist), Ancestral Fury (low HP buff)
   - Halfling: Halfling Luck (d20 reroll)
   - Orc: Intimidating Presence, Relentless Endurance, Blood Fury, Orcish Rampage
   - Tiefling: Hellish Resistance, Infernal Rebuke, Soul Bargain
   - Dragonborn: Breath Weapon (7 elements), Draconic Scales, Frightful Presence, Ancient Wrath
   - Half-Elf: Fey Ancestry (charm immune), Inspiring Presence
   - Half-Orc: Savage Attacks (extra crit die), Unstoppable Force
   - Gnome: Gnome Cunning (magic save advantage)
   - Merfolk: Tidal Healing, Call of the Deep (water elemental), Tsunami Strike
   - Beastfolk: Natural Weapons, Beast Form (transformation), Alpha's Howl,
     Apex Predator, plus 6 clan-specific perks
   - Faefolk: Flutter (flying), Wild Magic Surge, Nature's Wrath (entangle)
   - Goliath: Stone's Endurance, Earthshaker (AoE prone), Titan's Grip
   - Drow: Drow Magic (darkness), Poison Mastery, Shadow Step, Dominate
   - Firbolg: Hidden Step, Druidic Magic buffs, Guardian Form (treant)
   - Warforged: Integrated Armor, Self-Repair, Siege Mode
   - Genasi: Elemental Cantrip, Elemental Burst (4 element variants),
     Primordial Awakening (elemental form)
   - Revenant: Life Drain, Undying Fortitude, Army of the Dead
   - Changeling: Unsettling Visage, Thousand Faces (combat shifting)

   Each ability needs: activation trigger, effect calculation,
   duration/cooldown tracking, combat log entry, interaction with
   existing combat engine (turn order, damage calculation, status effects)

2. Teammate "profession-abilities-all" — Integrate ALL profession-
   affecting racial bonuses for 20 races:

   Hook into existing gathering yield calculator:
   - Human +10% farming in Heartlands, +5% all craft speed
   - Elf +25% herbalism forests, +20% enchanting quality
   - Dwarf +30% mining mountains, +25% smithing quality, +20% smelting
   - Halfling +25% cooking, +20% brewing/trade, +15% farming, +10% gather speed
   - Orc +30% hunting, +20% tanning/leatherworking
   - Tiefling +30% alchemy, +25% herbalism swamps, +20% enchanting
   - Dragonborn +20% mining volcanic, +20% smelting
   - Half-Elf +20% one chosen profession
   - Half-Orc +20% hunting, +15% smithing/tanning
   - Gnome +15% tinker quality, +10% craft speed, +10% fewer materials
   - Merfolk +40% fishing, +30% pearl/coral, -15% land gathering
   - Beastfolk +35% hunting, +25% tanning, -20% enchanting
   - Faefolk +35% enchanting, +30% herbalism, -25% physical crafting
   - Goliath +35% extreme mining, +25% masonry, -20% finesse crafting
   - Drow +30% alchemy (poison), +25% spider-silk tailoring, -10% daytime
   - Firbolg +40% herbalism, +30% farming, -25% mining/building
   - Warforged +25% smelting, +25% craft speed, -30% cooking, -20% herbalism
   - Genasi per-element crafting bonuses (Fire->smelting, Water->alchemy, etc.)
   - Revenant +25% death-herbs, +15% mining (no air needed), -25% cooking
   - Changeling +30% merchant, +25% courier, +20% innkeeper

   Also implement special profession mechanics:
   - Human Adaptable Crafter: allow 4th profession slot
   - Gnome Efficient Engineering: 10% material reduction
   - Gnome Eureka Moment: instant craft completion
   - Warforged Overclock: double craft speed temporarily
   - Warforged Tireless Worker: 50% more queue slots

3. Teammate "special-mechanics" — Build the unique mechanics for
   exotic races:

   CHANGELING SHAPESHIFTING:
   - Can change visible race at will (cosmetic + NPC interaction)
   - Level 10: fools racial detection (treated as displayed race for tariffs/penalties)
   - Level 15: can copy specific player's appearance
   - Level 25: Veil Network access (spy intelligence marketplace)
   - Track true race vs displayed race, handle edge cases

   WARFORGED MAINTENANCE:
   - No food/rest needed (save gold on food, no inn costs)
   - Maintenance system: need Repair Kit every 7 days
   - Without maintenance: -1% all stats per day overdue
   - Repair Kits crafted by Blacksmith (Metal Ingots + Arcane Components)
   - Self-Repair ability: partial heal without kits

   MERFOLK AMPHIBIOUS:
   - 3x movement speed in water zones
   - 85% movement speed on land
   - Access underwater resource nodes exclusively
   - Water-adjacent town bonus: can fish from anywhere

   DROW SUNLIGHT SENSITIVITY:
   - Day/night cycle tracking (or simplified: surface vs underground)
   - Daytime surface: -2 attack, -2 perception
   - Nighttime or underground: no penalty
   - Incentivizes nocturnal play pattern or underground living

   FAEFOLK FLIGHT:
   - Can bypass ground-level obstacles
   - Dodge ground traps in combat
   - Cross water/gaps without bridge
   - Can't fly while carrying heavy loads

   REVENANT REDUCED DEATH:
   - Death penalty halved (gold loss, XP loss, durability loss)
   - Respawn timer halved
   - Makes them ideal for dangerous/experimental content

   API endpoints for each special mechanic

4. Teammate "racial-frontend-v2" — Build the complete racial ability UI:
   - Character sheet Racial Abilities tab:
     * All 6 abilities displayed, locked/unlocked by level
     * Active abilities have "Use" button with cooldown timer
     * Passive abilities show as always-on buff icons
     * Sub-race abilities highlighted (clan perks, element perks)
   - Combat integration:
     * Racial abilities in combat action menu
     * Breath weapon targeting overlay (cone/line based on ancestry)
     * Beast Form transformation animation
     * Dragonborn elemental glow on portrait
     * Changeling mid-combat shift visual
   - Profession integration:
     * Show racial bonuses as line items in crafting preview
     * Gathering UI shows racial yield bonus
     * Warforged maintenance indicator in HUD
     * Merfolk water/land speed indicator
     * Drow sunlight warning indicator
   - Level-up racial ability unlock celebration screen
   - Special mechanic HUD elements:
     * Changeling: current appearance indicator + "True Form" toggle
     * Warforged: maintenance status bar
     * Drow: sun/shade indicator
     * Merfolk: water proximity indicator

After all teammates complete and report back, test at LEAST one race
from each tier through both combat and crafting:
- Core: test Dragonborn Breath Weapon (Red vs Blue ancestry) in combat
- Common: test Gnome Efficient Engineering reducing craft materials
- Exotic: test Changeling shapeshifting fooling a merchant NPC in
  a Distrustful town, test Warforged maintenance degradation
Give me a full status report and flag any abilities that seem
over/underpowered.
