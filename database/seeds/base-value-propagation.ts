/**
 * Catch-All Base Value Propagation Seed
 *
 * This seed runs LAST in the pipeline and sets baseValue on ANY ItemTemplate
 * that still has baseValue = 0 or NULL, regardless of how it was created.
 *
 * Items are matched by NAME (case-insensitive) because items come from
 * multiple sources:
 *   - Seed files (stable IDs like weapon-*, armor-*, consumable-*)
 *   - Runtime crafting system (stable IDs generated from name)
 *   - Starter weapon creation (starter-* IDs)
 *   - Simulation bots (random UUID IDs)
 *   - Old standalone scripts (run-tanner.ts, run-tailor.ts)
 *
 * Only updates items where baseValue = 0 or NULL — never overwrites
 * existing non-zero values.
 *
 * Source: docs/zero-value-items-pricing.md + docs/profession-economy-master.yaml
 */

import { PrismaClient } from '@prisma/client';

// ============================================================
// COMPREHENSIVE NAME → BASE VALUE MAP
// ============================================================

const BASE_VALUES: Record<string, number> = {
  // ── WEAPONS: Copper (L1, T1) ──
  'Copper Dagger': 20,
  'Copper Sword': 28,
  'Copper Mace': 28,
  'Copper Axe': 28,
  'Copper Spear': 22,

  // ── WEAPONS: Iron (L10, T2) ──
  'Iron Dagger': 48,
  'Iron Sword': 60,
  'Iron Longsword': 75,
  'Iron Axe': 55,
  'Iron Battleaxe': 85,
  'Iron Mace': 55,
  'Iron Warhammer': 90,
  'Iron Spear': 50,

  // ── WEAPONS: Steel (L30, T3) ──
  'Steel Dagger': 150,
  'Steel Sword': 200,
  'Steel Longsword': 250,
  'Steel Greatsword': 350,
  'Steel Axe': 190,
  'Steel Battleaxe': 310,
  'Steel Mace': 190,
  'Steel Warhammer': 320,
  'Steel Halberd': 300,
  'Steel Spear': 160,

  // ── WEAPONS: Mithril (L55, T4) ──
  'Mithril Sword': 750,
  'Mithril Longsword': 900,
  'Mithril Greatsword': 1200,
  'Mithril Battleaxe': 1100,
  'Mithril Warhammer': 1100,
  'Mithril Halberd': 1000,

  // ── WEAPONS: Adamantine (L75, T5) ──
  'Adamantine Greatsword': 2500,
  'Adamantine Battleaxe': 2200,
  'Adamantine Warhammer': 2200,
  'Adamantine Halberd': 2000,

  // ── WEAPONS: Ranged/Other ──
  'Crossbow': 90,
  'Elven Longbow': 280,

  // ── ARMORER: Copper Armor (L1, T1) ──
  'Copper Helm': 45,
  'Copper Chestplate': 90,
  'Copper Gauntlets': 45,
  'Copper Greaves': 55,
  'Copper Shield': 55,

  // ── ARMORER: Iron Armor (L10, T2) ──
  'Iron Helm': 130,
  'Iron Chestplate': 250,
  'Iron Gauntlets': 110,
  'Iron Greaves': 175,
  'Iron Shield': 150,

  // ── ARMORER: Steel Armor (L30, T3) ──
  'Steel Helm': 500,
  'Steel Chestplate': 1000,
  'Steel Gauntlets': 420,
  'Steel Greaves': 700,
  'Steel Shield': 550,

  // ── ARMORER: Mithril Armor (L55, T4) ──
  'Mithril Helm': 1800,
  'Mithril Chestplate': 3500,
  'Mithril Gauntlets': 1500,
  'Mithril Greaves': 2200,
  'Mithril Shield': 2000,

  // ── ARMORER: Adamantine Armor (L75, T5) ──
  'Adamantine Helm': 6000,
  'Adamantine Chestplate': 12000,
  'Adamantine Gauntlets': 5000,
  'Adamantine Greaves': 8000,
  'Adamantine Shield': 8500,

  // ── TANNER: Finished Goods ──
  'Leather Cap': 28,
  'Leather Vest': 50,
  'Leather Belt': 30,
  'Leather Armor': 65,
  'Leather Bracers': 35,
  'Leather Greaves': 50,
  'Wolf Leather Armor': 200,
  'Wolf Leather Hood': 125,
  'Bear Hide Cuirass': 340,
  'Leather Satchel': 28,

  // ── TAILOR: Cloth Armor ──
  'Cloth Hood': 25,
  'Cloth Sash': 25,
  'Cloth Robe': 55,
  'Wool Trousers': 38,
  "Scholar's Robe": 80,
  "Traveler's Cloak": 65,
  "Merchant's Hat": 40,
  "Herbalist's Apron": 60,
  "Archmage's Robe": 250,
  "Diplomat's Regalia": 230,
  'Silk Hood of Insight': 155,
  "Noble's Leggings": 200,
  'Enchanted Cloak': 350,

  // ── LEATHERWORKER: Accessories ──
  'Leather Gloves': 58,
  'Leather Boots': 58,
  'Leather Backpack': 78,
  'Leather Waterskin': 35,
  'Wolf Leather Gloves': 145,
  'Wolf Leather Boots': 145,
  'Toolbelt': 140,
  'Leather Repair Kit': 80,
  "Ranger's Pack": 240,
  'Bear Hide Vambraces': 310,
  'Bear Leather Boots': 260,
  "Hunter's Kit": 280,
  "Explorer's Pack": 480,

  // ── BLACKSMITH: Crafted (Apprentice) ──
  'Iron Pickaxe': 18,
  'Iron Hatchet': 18,
  'Iron Hoe': 17,
  'Iron Chain Shirt': 28,
  'Wooden Shield': 22,

  // ── BLACKSMITH: Crafted (Journeyman) ──
  'Steel Pickaxe': 38,
  'Steel Hatchet': 38,
  'Steel Hoe': 38,
  "Herbalist's Sickle": 30,
  'Fishing Hook Set': 25,
  'Steel Chain Mail': 48,
  'Steel Helmet': 35,

  // ── BLACKSMITH: Specialist - Toolsmith ──
  'Silver Pickaxe': 95,
  'Hardwood Hatchet': 80,
  "Hunter's Knife": 85,
  'Reinforced Hoe': 75,

  // ── BLACKSMITH: Specialist - Weaponsmith ──
  'Silver Longsword': 120,
  'Silver Dagger': 90,
  'Silver Battleaxe': 125,
  'War Pick': 100,

  // ── BLACKSMITH: Specialist - Armorer ──
  'Silver-Studded Plate': 130,
  'Silver Helm': 95,
  'Hardwood Tower Shield': 108,
  'Reinforced Chain Leggings': 105,

  // ── WOODWORKER: Processing ──
  'Rough Planks': 4,
  'Softwood Planks': 3,
  'Hardwood Planks': 18,
  'Exotic Planks': 40,
  'Wooden Dowels': 4,
  'Wooden Handle': 5,
  'Bow Stave': 11,
  'Beams': 17,
  'Wooden Beams': 17,
  'Barrel': 55,
  'Wooden Frame': 58,
  'Furniture': 63,

  // ── WOODWORKER: Finished Goods ──
  'Wooden Pickaxe': 19,
  'Fishing Rod': 14,
  'Carving Knife': 12,
  'Wooden Chair': 19,
  'Tanning Rack': 58,
  'Fine Fishing Rod': 45,
  'Wooden Table': 78,
  'Storage Chest': 117,
  'Wooden Bed Frame': 110,
  'Wooden Shelf': 75,
  'Reinforced Crate': 130,
  'Practice Bow': 45,

  // ── SMELTER: Processing ──
  'Copper Ingot': 16,
  'Iron Ingot': 52,
  'Steel Ingot': 210,
  'Silver Ingot': 72,
  'Gold Ingot': 185,
  'Mithril Ingot': 700,
  'Adamantine Ingot': 2350,
  'Glass': 12,
  'Nails': 1,
  'Iron Fittings': 8,
  'Maintenance Kit': 12,
  'Precision Maintenance Kit': 55,

  // ── MASON: Processing & Housing ──
  'Cut Stone': 19,
  'Cut Sandstone': 50,
  'Bricks': 33,
  'Stone Slab': 55,
  'Stone Hearth': 82,
  'Clay Pot': 30,
  'Brick Oven': 120,
  'Stone Fountain': 295,
  'Polished Marble': 65,
  'Marble Statue': 365,

  // ── ALCHEMIST: Consumables ──
  'Minor Healing Potion': 19,
  'Antidote': 14,
  'Berry Salve': 15,
  'Healing Potion': 27,
  'Elixir of Strength': 55,
  'Elixir of Wisdom': 55,
  'Poison Resistance Tonic': 20,
  'Greater Healing Potion': 85,
  'Elixir of Fortitude': 95,
  'Glowcap Extract': 95,
  'Universal Antidote': 100,

  // ── COOK: Processing (cook.ts) ──
  'Flour': 8,
  'Apple Sauce': 9,
  'Porridge': 8,
  'Vegetable Stew': 10,
  'Bread Loaf': 15,
  'Seasoned Roast Vegetables': 14,
  'Harvest Feast': 40,
  "Fisherman's Banquet": 42,
  'Spiced Pastry': 35,

  // ── COOK: Consumables (consumables.ts) ──
  'Bread': 5,
  'Rations': 3,
  'Roast Meat': 12,
  'Vegetable Soup': 8,
  'Berry Jam': 8,
  'Herbal Tea': 10,
  'Smoked Meat': 12,
  'Apple Pie': 14,
  'Berry Tart': 18,
  'Seasoned Fish Platter': 20,
  'Scrambled Eggs': 8,
  'Creamy Porridge': 8,
  'Farm Breakfast': 12,
  'Hearty Feast': 55,
  'Royal Banquet': 120,
  'Grilled Fish': 12,
  'Fish Stew': 15,
  'Smoked Fish': 10,
  'Pan-Seared Trout': 40,
  'Perch Feast': 50,
  "Fisherman's Pie": 60,
  'Smoked Trout Rations': 25,

  // ── BREWER: Consumables ──
  'Ale': 6,
  'Apple Cider': 6,
  'Berry Cordial': 8,
  'Strong Ale': 12,
  'Mulled Cider': 14,
  'Herbal Brew': 15,
  'Hopped Beer': 15,
  'Grape Wine': 15,
  'Pale Ale': 18,

  // ── ENCHANTER: Scrolls ──
  'Fortified Enchantment Scroll': 110,
  'Flaming Enchantment Scroll': 155,
  'Frost Enchantment Scroll': 155,
  'Lightning Enchantment Scroll': 175,
  'Swift Enchantment Scroll': 195,
  'Poisoned Enchantment Scroll': 200,
  'Warding Enchantment Scroll': 210,
  'Holy Enchantment Scroll': 340,
  'Shadow Enchantment Scroll': 330,
  'Earthen Enchantment Scroll': 250,
  'Vitality Enchantment Scroll': 220,
  "Nature's Ward Enchantment Scroll": 300,
  'True Sight Enchantment Scroll': 350,

  // ── SCRIBE: Scrolls & Maps ──
  'Area Map': 15,
  'Scroll of Fire': 82,
  'Identification Scroll': 28,
  'Scroll of Ice': 80,
  'Scroll of Healing': 75,
  'Dungeon Map': 80,
  'Scroll of Lightning': 85,
  'Scroll of Stone Skin': 90,
  'Scroll of Might': 85,
  'Scroll of Entangle': 100,
  'Scroll of Restoration': 130,

  // ── JEWELER: Accessories ──
  'Copper Ring': 55,
  'Copper Necklace': 75,
  'Iron Ring': 120,
  'Silver Ring': 155,
  'Gold Ring': 380,
  'Mithril Ring': 2500,
  'Silver Necklace': 290,
  'Gold Necklace': 650,
  'Circlet of Focus': 350,
  'Crown of Wisdom': 1500,
  'Brooch of Protection': 180,
  'Brooch of Speed': 400,

  // ── FLETCHER: Bows & Arrows ──
  'Bowstring': 24,
  'Arrows': 2,
  'Shortbow': 46,
  'Hunting Bow': 70,
  'Longbow': 85,
  'War Arrows': 7,
  'War Bow': 180,
  'Quiver': 45,
  'Barbed Arrows': 8,
  'Composite Bow': 225,
  "Ranger's Quiver": 175,
  'Flight Arrows': 2,
  "Ranger's Longbow": 260,

  // ── TAILOR: Processing ──
  'Cloth': 8,
  'Woven Cloth': 18,
  'Fine Cloth': 59,
  'Silk Fabric': 75,

  // ── TANNER: Processing ──
  'Cured Leather': 18,
  'Wolf Leather': 73,
  'Bear Leather': 91,

  // ── MAGICAL COMPONENTS (Monster Drops) ──
  'Ember Core': 15,
  'Frost Essence': 15,
  'Storm Feather': 15,
  'Earth Crystal': 12,
  'Troll Blood': 15,
  'Fey Tear': 35,
  'Heartwood Sap': 10,
  'Basilisk Scale': 25,
  'Wyvern Scale': 45,
  'Ogre Sinew': 12,
  'Wind Mote': 12,
  'Basilisk Eye': 20,
  'Shadow Essence': 30,
  'Wisp Mote': 8,
  'Spectral Dust': 10,
  'Living Bark': 8,
  'Dryad Blossom': 15,
  'Spider Venom': 12,

  // ── RAW RESOURCES ──
  'Apples': 3,
  'Wild Herbs': 5,
  'Raw Fish': 4,
  'Wood Logs': 5,
  'Iron Ore': 6,
  'Stone Blocks': 7,
  'Clay': 4,
  'Coal': 12,
  'Silver Ore': 30,
  'Hardwood': 25,
  'Copper Ore': 4,
  'Iron Ore Chunks': 4,
  'Grain': 3,
  'Vegetables': 3,
  'Wild Berries': 3,
  'Eggs': 5,
  'Milk': 6,
  'Wool': 10,
  'Cotton': 4,
  'Wild Game Meat': 5,
  'Animal Pelts': 8,
  'Wolf Pelts': 28,
  'Bear Hides': 35,
  'Medicinal Herbs': 28,
  'Glowcap Mushrooms': 32,
  'River Trout': 22,
  'Lake Perch': 25,
  'Wheat': 3,
  'Salt': 2,
  'Spices': 8,
  'Hops': 5,
  'Grapes': 4,
  'Softwood': 3,
  'Exotic Wood': 50,
  'Fine Wool': 35,
  'Silkworm Cocoons': 40,
  'Arcane Reagents': 35,
  'Gemstones': 25,
  'Flowers': 3,
  'Marble': 15,
  'Silite Sand': 5,
  'Gold Ore': 40,
  'Mithril Ore': 80,
  'Adamantine Ore': 150,
  'Raw Stone': 5,
  'Rare Herbs': 15,
  'Spider Silk': 6,
  'Cocoons': 38,

  // ── LIVESTOCK PRODUCTS ──
  'Beef': 10,
  'Pork': 10,
  'Chicken': 7,

  // ── STARTER & CRUDE ITEMS ──
  'Cloth Padding': 5,
  'Cloth Boots': 15,
  'Cloth Gloves': 12,
  'Cloth Robes': 20,
  'Soft Leather': 14,

  // ── PROGRESSION: Hard Leather Set (L15, T2) ──
  'Hard Leather': 24,
  'Hard Leather Cap': 40,
  'Hard Leather Vest': 60,
  'Hard Leather Gloves': 35,
  'Hard Leather Bracers': 38,
  'Hard Leather Boots': 42,

  // ── PROGRESSION: Studded Leather Set (L30, T3) ──
  'Studded Leather Cap': 85,
  'Studded Leather Vest': 140,
  'Studded Leather Gloves': 75,
  'Studded Leather Bracers': 80,
  'Studded Leather Boots': 90,

  // ── PROGRESSION: Exotic Leather Set (L50, T4) ──
  'Exotic Leather Cap': 220,
  'Exotic Leather Vest': 380,
  'Exotic Leather Gloves': 200,
  'Exotic Leather Bracers': 210,
  'Exotic Leather Boots': 240,

  // ── PROGRESSION: Dragonscale Leather Set (L80, T5) ──
  'Dragonscale Leather': 300,
  'Dragonscale Helm': 1800,
  'Dragonscale Vest': 3500,
  'Dragonscale Gloves': 1500,
  'Dragonscale Bracers': 1600,
  'Dragonscale Boots': 2000,

  // ── PROGRESSION: Linen Set (L5, T1) ──
  'Linen': 10,
  'Linen Hood': 18,
  'Linen Robes': 30,
  'Linen Gloves': 15,
  'Linen Boots': 16,

  // ── PROGRESSION: Woven Wool Set (L10, T2) ──
  'Woven Wool': 18,
  'Woven Wool Hood': 30,
  'Woven Wool Robes': 55,
  'Woven Wool Gloves': 25,
  'Woven Wool Boots': 28,
  'Woven Wool Cloak': 45,

  // ── PROGRESSION: Silk Set (L40, T3) ──
  'Silk Hood': 110,
  'Silk Robes': 200,
  'Silk Gloves': 90,
  'Silk Boots': 95,
  'Silk Cloak': 160,

  // ── PROGRESSION: Enchanted Silk Set (L70, T5) ──
  'Enchanted Silk Hood': 800,
  'Enchanted Silk Robes': 1500,
  'Enchanted Silk Gloves': 650,
  'Enchanted Silk Boots': 700,
  'Enchanted Silk Cloak': 1200,

  // ── EXOTIC MATERIALS & RARE DROPS ──
  'Exotic Hide': 55,
  'Exotic Leather': 120,
  'Dragon Hide': 150,
  'Silk Thread': 20,
  'Silk Cloth': 30,
  'Fur Leather': 30,
  'Raw Leather': 6,
  'Pelts': 8,
  'Bark': 3,
  'Flax': 4,
  'Corn': 3,
  'Mushrooms': 5,
  'Common Fish': 4,
  'Common Herbs': 5,
  'Bear Claw': 6,
  'Sandstone': 7,

  // ── POTIONS & CONSUMABLES (No Recipe) ──
  'Potion of Strength': 55,
  'Potion of Dexterity': 55,
  'Potion of Constitution': 55,
  'Potion of Intelligence': 55,
  'Potion of Wisdom': 55,
  'Potion of Charisma': 55,
  'Supreme Healing Potion': 200,
  'Cure Disease': 30,
  'Cure Poison': 14,
  'Herb Poultice': 12,
  'Herbal Remedy': 15,
  'Weak Poison': 20,
  'Poison': 40,
  'Deadly Poison': 80,
  'Fire Bomb': 45,
  'Flash Bomb': 35,
  'Smoke Bomb': 30,
  'Elven Wine': 200,
  'Berry Wine': 12,
  'Wine': 15,
  'Mead': 12,
  'Spirits': 20,
  'Bolts': 2,
  'Throwing Knives': 5,
  'Basic Rations': 3,

  // ── HOUSING & WORKSHOP ──
  'Alchemy Table': 150,
  'Armor Stand': 45,
  'Weapon Rack': 50,
  'Bookshelf': 85,
  'Bed': 120,
  'Chairs': 19,
  'Table': 78,

  // ── MOUNT & STABLE ──
  'Saddle': 150,
  'War Saddle': 350,
  'Saddlebags': 80,
  'Horseshoes': 25,
  'Mithril Horseshoes': 450,
  'Horse Armor': 500,

  // ── SPECIAL/RARE ──
  'Refined Soul Essence': 100,
  'Soul Essence': 50,

  // ── WOODEN SHIELDS (alternate names) ──
  'Wooden Shield': 22,
  'Hardwood Tower Shield': 108,

  // ── FOOD ITEMS (food-items.ts) ──
  'Raw Meat': 3,
  'Fresh Vegetables': 3,

  // ── STARTER ITEMS (starting-weapons.ts, created at runtime) ──
  'Rustic Shortsword': 5,
  'Rustic Shortbow': 5,
  'Rustic Dagger': 3,
  'Rustic Staff': 4,
  'Rustic Crystal Focus': 4,
  'Rustic Lute Blade': 5,
  'Rustic Mace': 4,
  'Rustic Leather Vest': 8,

  // ── DUPLICATE/ALTERNATE NAMES (catch production variants) ──
  'Raw Leather': 6,
  'Basic Rations': 3,
  'Iron Chain Shirt': 28,
  'Wooden Beams': 17,
  'Leather Waterskin': 35,
};

export async function seedBaseValuePropagation(prisma: PrismaClient): Promise<void> {
  console.log('--- Base Value Propagation (catch-all) ---');

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  const entries = Object.entries(BASE_VALUES);

  for (const [name, baseValue] of entries) {
    const result = await prisma.itemTemplate.updateMany({
      where: {
        name,
        baseValue: 0,
      },
      data: { baseValue },
    });

    if (result.count > 0) {
      updated += result.count;
    } else {
      // Check if the item exists with a non-zero value already
      const existing = await prisma.itemTemplate.findFirst({
        where: { name },
        select: { baseValue: true },
      });
      if (existing) {
        skipped++;
      } else {
        notFound++;
      }
    }
  }

  // Count remaining zeros
  const remaining = await prisma.itemTemplate.count({
    where: { baseValue: 0 },
  });

  console.log(`  Updated ${updated} item template(s) with base values`);
  console.log(`  Skipped ${skipped} (already had non-zero values)`);
  console.log(`  Not found ${notFound} (not yet in DB)`);
  console.log(`  Remaining zero-value items: ${remaining}`);
}
