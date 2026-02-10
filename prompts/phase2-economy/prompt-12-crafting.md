# Prompt 12 — Finished Goods Crafting (Weapons, Armor, Gear)
# Dependencies: 11
# Teammates: 5
# Paste everything below this line into Claude Code
# ─────────────────────────────────────────────────

You are the team lead. Use agent teams. Spawn a team of 5 teammates
to build all finished goods crafting — the final products players
actually use.

Context: These are the END of the crafting chain. Every item here
requires refined materials from processing professions. Items have
quality tiers (Poor through Legendary), durability that degrades
with use, and stats that matter in combat. Item demand is constant
because items break.

1. Teammate "weapon-recipes" — Create the full weapon recipe database:
   - BLACKSMITH weapons by tier (Apprentice through Grandmaster):
     Daggers, Swords, Longswords, Greatswords, Axes, Battleaxes,
     Maces, Warhammers, Halberds, Spears
   - Material tiers: Copper -> Iron -> Steel -> Mithril -> Adamantine
   - Each weapon has: base damage, damage type (slashing/piercing/bludgeoning),
     speed, required STR/DEX, durability, level requirement to equip
   - Higher material tier = better base stats
   - Quality multiplier on all stats (Poor 0.7x through Legendary 1.5x)
   - WOODWORKER/FLETCHER ranged weapons:
     Shortbow, Longbow, Crossbow, Elven Longbow
     + Arrows, Bolts, Throwing Knives (consumable ammo)
   - Store as typed recipe data with full ingredient lists and craft times

2. Teammate "armor-recipes" — Create the full armor recipe database:
   - ARMORER metal armor:
     Helmets, Chestplates, Gauntlets, Greaves, Shields
     Material tiers: Copper -> Iron -> Steel -> Mithril -> Adamantine
   - LEATHERWORKER leather armor:
     Leather Cap, Leather Vest, Leather Gloves, Leather Boots,
     Leather Bracers
     Material tiers: Soft Leather -> Hard Leather -> Studded -> Exotic -> Dragonscale
   - TAILOR cloth armor (robes for mages):
     Cloth Hood, Robes, Cloth Gloves, Cloth Boots, Cloak
     Material tiers: Cotton Cloth -> Linen -> Woven Wool -> Silk -> Enchanted Silk
   - Equipment slots: Head, Chest, Hands, Legs, Feet, Main Hand,
     Off Hand, Accessory 1, Accessory 2, Back (cloak)
   - Each armor piece has: AC bonus, stat bonuses, weight, durability,
     class restrictions, level requirement
   - Quality multiplier on AC and durability

3. Teammate "consumable-recipes" — Create all consumable item recipes:
   - ALCHEMIST potions:
     Minor/Standard/Greater/Supreme Healing Potion
     Minor/Standard/Greater/Supreme Mana Potion
     Potion of Strength, Dexterity, Intelligence, etc. (buff potions)
     Antidotes, Cure Poison, Cure Disease
     Poisons (applied to weapons — rogues love these)
     Fire Bomb, Smoke Bomb, Flash Bomb
   - COOK food (buff items):
     Bread, Rations (basic, cheap)
     Roast Meat, Fish Stew, Vegetable Soup (moderate buffs)
     Hearty Feast, Royal Banquet (party-wide buffs, expensive)
     Each food gives a specific buff for a real-time duration
   - BREWER drinks:
     Ale (cheap, small buff), Wine (moderate), Mead (good),
     Spirits (strong but penalties), Elven Wine (rare, excellent buffs)
   - SCRIBE scrolls:
     Spell Scrolls (single-use spells anyone can use)
     Maps (reveal hidden areas), Identification Scrolls
   - All consumables: single use, stack in inventory, have shelf life

4. Teammate "accessory-recipes" — Create accessory and housing recipes:
   - JEWELER accessories:
     Rings (stat bonuses), Necklaces (resistances),
     Circlets (mana bonuses), Brooches (special effects)
     Material tiers: Copper + Quartz -> Silver + Amethyst ->
     Gold + Ruby -> Mithril + Diamond
   - ENCHANTER enchantments (applied to existing finished items):
     Flaming (fire damage), Frost (cold damage),
     Lightning, Poisoned, Holy, Shadow
     Fortified (extra durability), Swift (attack speed),
     Warding (magic resistance)
     Requires: finished item + arcane reagents + specific gem
   - WOODWORKER/MASON housing items:
     Furniture: Bed, Table, Chairs, Storage Chest, Bookshelf,
     Weapon Rack, Armor Stand, Alchemy Table
     Building materials: Planks, Beams, Cut Stone, Bricks,
     Nails, Glass Panes
   - STABLE MASTER mount gear:
     Saddle, Horseshoes, Horse Armor, Saddlebags

5. Teammate "item-system-v2" — Rebuild the item system backend to
   support all of this:
   - Item model extended: quality tier, durability (current/max),
     crafted_by (player ID — maker's mark!), crafted_at, enchantments,
     stat bonuses calculated from base + material + quality + enchantment
   - Equipment system: equip/unequip items to character slots,
     validate class restrictions, calculate total stat bonuses
   - Durability system: items lose 1 durability per use (combat action,
     gathering action), break at 0, can be repaired by appropriate
     crafter for materials + gold
   - Repair API: POST /api/items/repair (crafter profession required,
     costs materials based on item)
   - Item comparison: GET /api/items/compare?equipped=X&candidate=Y
   - Full item stat calculation engine that accounts for:
     base stats + material tier + quality multiplier + enchantments +
     set bonuses (if we add item sets later)

After all teammates complete and report back, verify the FULL chain:
Miner mines ore -> Smelter makes ingots -> Blacksmith forges a sword ->
the sword has proper stats based on material and quality -> a player
equips it -> the sword affects their combat stats -> using it in combat
reduces durability -> at 0 durability it breaks. Test with at least
3 different crafting chains.
