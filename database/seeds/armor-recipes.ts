/**
 * Armor Recipe Seed Data for Realm of Crowns
 *
 * Seeds item templates and recipes for all armor types:
 *   - ARMORER: Metal plate armor (Copper -> Iron -> Steel -> Mithril -> Adamantine)
 *   - LEATHERWORKER: Leather accessories, boots, gloves, bags & utility (Cured -> Wolf -> Bear)
 *   - TAILOR: Cloth armor (Cloth -> Linen -> Woven Wool -> Silk -> Enchanted Silk)
 *
 * Depends on: seedRecipes() having already created material templates (ingots, leather, cloth).
 */

import { PrismaClient, ItemType, ItemRarity, ProfessionType, ProfessionTier } from '@prisma/client';
import { ALL_ARMOR_RECIPES } from '@shared/data/recipes/armor';

// ============================================================
// ARMOR ITEM TEMPLATE DEFINITIONS
// ============================================================

interface ArmorTemplateDef {
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  description: string;
  stats: Record<string, number>;
  durability: number;
  professionRequired: ProfessionType;
  levelRequired: number;
  baseValue: number;
}

const ARMOR_TEMPLATES: ArmorTemplateDef[] = [
  // --- ARMORER: Copper ---
  { name: 'Copper Helm', type: 'ARMOR', rarity: 'COMMON', description: 'A crude copper helm offering basic head protection.', stats: { armor: 4 }, durability: 60, professionRequired: 'ARMORER', levelRequired: 1, baseValue: 45 },
  { name: 'Copper Chestplate', type: 'ARMOR', rarity: 'COMMON', description: 'A hammered copper breastplate. Heavy but protective.', stats: { armor: 8 }, durability: 70, professionRequired: 'ARMORER', levelRequired: 1, baseValue: 90 },
  { name: 'Copper Gauntlets', type: 'ARMOR', rarity: 'COMMON', description: 'Copper hand guards with leather lining.', stats: { armor: 3 }, durability: 55, professionRequired: 'ARMORER', levelRequired: 1, baseValue: 45 },
  { name: 'Copper Greaves', type: 'ARMOR', rarity: 'COMMON', description: 'Copper leg guards strapped over leather.', stats: { armor: 5 }, durability: 65, professionRequired: 'ARMORER', levelRequired: 1, baseValue: 55 },
  { name: 'Copper Shield', type: 'ARMOR', rarity: 'COMMON', description: 'A round copper shield with a wooden core.', stats: { armor: 6 }, durability: 70, professionRequired: 'ARMORER', levelRequired: 1, baseValue: 55 },

  // --- ARMORER: Iron ---
  { name: 'Iron Helm', type: 'ARMOR', rarity: 'COMMON', description: 'A solid iron helm with cheek guards.', stats: { armor: 8 }, durability: 120, professionRequired: 'ARMORER', levelRequired: 10, baseValue: 130 },
  { name: 'Iron Chestplate', type: 'ARMOR', rarity: 'COMMON', description: 'Thick iron plate armor covering the torso.', stats: { armor: 16 }, durability: 150, professionRequired: 'ARMORER', levelRequired: 10, baseValue: 250 },
  { name: 'Iron Gauntlets', type: 'ARMOR', rarity: 'COMMON', description: 'Articulated iron gauntlets for battle.', stats: { armor: 6 }, durability: 110, professionRequired: 'ARMORER', levelRequired: 10, baseValue: 110 },
  { name: 'Iron Greaves', type: 'ARMOR', rarity: 'COMMON', description: 'Iron leg plates that protect from knee to ankle.', stats: { armor: 10 }, durability: 130, professionRequired: 'ARMORER', levelRequired: 10, baseValue: 175 },
  { name: 'Iron Shield', type: 'ARMOR', rarity: 'COMMON', description: 'A sturdy iron kite shield.', stats: { armor: 12 }, durability: 140, professionRequired: 'ARMORER', levelRequired: 10, baseValue: 150 },

  // --- ARMORER: Steel ---
  { name: 'Steel Helm', type: 'ARMOR', rarity: 'FINE', description: 'A polished steel helm with a visor.', stats: { armor: 14 }, durability: 200, professionRequired: 'ARMORER', levelRequired: 30, baseValue: 500 },
  { name: 'Steel Chestplate', type: 'ARMOR', rarity: 'FINE', description: 'Steel plate armor, the standard of professional soldiers.', stats: { armor: 26 }, durability: 260, professionRequired: 'ARMORER', levelRequired: 30, baseValue: 1000 },
  { name: 'Steel Gauntlets', type: 'ARMOR', rarity: 'FINE', description: 'Steel gauntlets with reinforced knuckles.', stats: { armor: 10 }, durability: 180, professionRequired: 'ARMORER', levelRequired: 30, baseValue: 420 },
  { name: 'Steel Greaves', type: 'ARMOR', rarity: 'FINE', description: 'Steel leg armor with articulated knee joints.', stats: { armor: 18 }, durability: 220, professionRequired: 'ARMORER', levelRequired: 30, baseValue: 700 },
  { name: 'Steel Shield', type: 'ARMOR', rarity: 'FINE', description: 'A kite shield of tempered steel.', stats: { armor: 20 }, durability: 240, professionRequired: 'ARMORER', levelRequired: 30, baseValue: 550 },

  // --- ARMORER: Mithril ---
  { name: 'Mithril Helm', type: 'ARMOR', rarity: 'MASTERWORK', description: 'A gleaming mithril helm, light as a feather.', stats: { armor: 22, magicResist: 5 }, durability: 320, professionRequired: 'ARMORER', levelRequired: 55, baseValue: 1800 },
  { name: 'Mithril Chestplate', type: 'ARMOR', rarity: 'MASTERWORK', description: 'Mithril plate that weighs less than leather yet stops steel.', stats: { armor: 38, magicResist: 10 }, durability: 400, professionRequired: 'ARMORER', levelRequired: 55, baseValue: 3500 },
  { name: 'Mithril Gauntlets', type: 'ARMOR', rarity: 'MASTERWORK', description: 'Mithril gauntlets with gem-inlaid wrists.', stats: { armor: 16, magicResist: 4 }, durability: 300, professionRequired: 'ARMORER', levelRequired: 55, baseValue: 1500 },
  { name: 'Mithril Greaves', type: 'ARMOR', rarity: 'MASTERWORK', description: 'Mithril leg guards that shimmer in moonlight.', stats: { armor: 28, magicResist: 6 }, durability: 340, professionRequired: 'ARMORER', levelRequired: 55, baseValue: 2200 },
  { name: 'Mithril Shield', type: 'ARMOR', rarity: 'MASTERWORK', description: 'A tower shield of mithril that deflects both steel and spells.', stats: { armor: 30, magicResist: 8 }, durability: 360, professionRequired: 'ARMORER', levelRequired: 55, baseValue: 2000 },

  // --- ARMORER: Adamantine ---
  { name: 'Adamantine Helm', type: 'ARMOR', rarity: 'LEGENDARY', description: 'A crown-like helm of adamantine. Nearly indestructible.', stats: { armor: 32, magicResist: 8 }, durability: 500, professionRequired: 'ARMORER', levelRequired: 75, baseValue: 6000 },
  { name: 'Adamantine Chestplate', type: 'ARMOR', rarity: 'LEGENDARY', description: 'The ultimate in physical protection, forged from the hardest metal.', stats: { armor: 52, magicResist: 14 }, durability: 600, professionRequired: 'ARMORER', levelRequired: 75, baseValue: 12000 },
  { name: 'Adamantine Gauntlets', type: 'ARMOR', rarity: 'LEGENDARY', description: 'Adamantine gauntlets that can catch a blade bare-handed.', stats: { armor: 24, magicResist: 6 }, durability: 460, professionRequired: 'ARMORER', levelRequired: 75, baseValue: 5000 },
  { name: 'Adamantine Greaves', type: 'ARMOR', rarity: 'LEGENDARY', description: 'Leg armor of pure adamantine, impervious to all but the mightiest blows.', stats: { armor: 40, magicResist: 10 }, durability: 520, professionRequired: 'ARMORER', levelRequired: 75, baseValue: 8000 },
  { name: 'Adamantine Shield', type: 'ARMOR', rarity: 'LEGENDARY', description: 'A fortress in one arm. This shield has never been breached.', stats: { armor: 44, magicResist: 12 }, durability: 550, professionRequired: 'ARMORER', levelRequired: 75, baseValue: 8500 },

  // --- LEATHERWORKER: Apprentice (Cured Leather) ---
  { name: 'Leather Gloves', type: 'ARMOR', rarity: 'COMMON', description: 'Supple leather gloves, perfect for nimble fingers.', stats: { armor: 1, dexBonus: 1 }, durability: 45, professionRequired: 'LEATHERWORKER', levelRequired: 1, baseValue: 58 },
  { name: 'Leather Boots', type: 'ARMOR', rarity: 'COMMON', description: 'Sturdy leather boots with soft soles for quiet movement.', stats: { armor: 2, dexBonus: 1 }, durability: 50, professionRequired: 'LEATHERWORKER', levelRequired: 3, baseValue: 58 },
  { name: 'Leather Backpack', type: 'ACCESSORY', rarity: 'COMMON', description: 'A roomy leather backpack supported by a wooden frame.', stats: {}, durability: 60, professionRequired: 'LEATHERWORKER', levelRequired: 5, baseValue: 78 },
  { name: 'Leather Waterskin', type: 'CONSUMABLE', rarity: 'COMMON', description: 'A sealed leather waterskin for long journeys.', stats: {}, durability: 1, professionRequired: 'LEATHERWORKER', levelRequired: 8, baseValue: 35 },

  // --- LEATHERWORKER: Journeyman (Wolf Leather) ---
  { name: 'Wolf Leather Gloves', type: 'ARMOR', rarity: 'FINE', description: 'Tough wolf leather gloves with reinforced palms for a sure grip.', stats: { armor: 3, dexBonus: 2 }, durability: 80, professionRequired: 'LEATHERWORKER', levelRequired: 12, baseValue: 145 },
  { name: 'Wolf Leather Boots', type: 'ARMOR', rarity: 'FINE', description: 'Wolf leather boots with iron-studded soles for grip on any terrain.', stats: { armor: 4, dexBonus: 2 }, durability: 90, professionRequired: 'LEATHERWORKER', levelRequired: 15, baseValue: 145 },
  { name: 'Toolbelt', type: 'ACCESSORY', rarity: 'FINE', description: 'A sturdy toolbelt with loops and pouches for crafting implements.', stats: {}, durability: 80, professionRequired: 'LEATHERWORKER', levelRequired: 18, baseValue: 140 },
  { name: 'Leather Repair Kit', type: 'TOOL', rarity: 'FINE', description: 'Leather patches, needles, and wax for repairing leather goods.', stats: { yieldBonus: 15 }, durability: 25, professionRequired: 'LEATHERWORKER', levelRequired: 20, baseValue: 80 },
  { name: "Ranger's Pack", type: 'ACCESSORY', rarity: 'FINE', description: 'A wolf leather pack built for long wilderness expeditions.', stats: {}, durability: 100, professionRequired: 'LEATHERWORKER', levelRequired: 22, baseValue: 240 },

  // --- LEATHERWORKER: Craftsman (Bear Leather) ---
  { name: 'Bear Hide Vambraces', type: 'ARMOR', rarity: 'SUPERIOR', description: 'Thick bear hide forearm guards that shrug off blows.', stats: { armor: 5, dexBonus: 3 }, durability: 120, professionRequired: 'LEATHERWORKER', levelRequired: 28, baseValue: 310 },
  { name: 'Bear Leather Boots', type: 'ARMOR', rarity: 'SUPERIOR', description: 'Heavy bear leather boots reinforced with layered hide.', stats: { armor: 6, dexBonus: 3 }, durability: 130, professionRequired: 'LEATHERWORKER', levelRequired: 32, baseValue: 260 },
  { name: "Hunter's Kit", type: 'TOOL', rarity: 'SUPERIOR', description: 'A comprehensive kit of tracking tools, snares, and field supplies.', stats: { yieldBonus: 25 }, durability: 40, professionRequired: 'LEATHERWORKER', levelRequired: 36, baseValue: 280 },
  { name: "Explorer's Pack", type: 'ACCESSORY', rarity: 'SUPERIOR', description: 'The finest leather backpack, reinforced with bear hide and a hardwood frame.', stats: {}, durability: 150, professionRequired: 'LEATHERWORKER', levelRequired: 40, baseValue: 480 },

  // --- TAILOR: Cloth ---
  { name: 'Cloth Hood', type: 'ARMOR', rarity: 'COMMON', description: 'A simple cotton hood favored by apprentice mages.', stats: { magicResist: 2 }, durability: 35, professionRequired: 'TAILOR', levelRequired: 1, baseValue: 30 },
  { name: 'Cloth Robes', type: 'ARMOR', rarity: 'COMMON', description: 'Plain cotton robes, the uniform of novice spellcasters.', stats: { magicResist: 4 }, durability: 40, professionRequired: 'TAILOR', levelRequired: 1, baseValue: 55 },
  { name: 'Cloth Gloves', type: 'ARMOR', rarity: 'COMMON', description: 'Thin cotton gloves that leave fingers free for gesturing.', stats: { magicResist: 1 }, durability: 30, professionRequired: 'TAILOR', levelRequired: 1, baseValue: 25 },
  { name: 'Cloth Boots', type: 'ARMOR', rarity: 'COMMON', description: 'Soft cloth shoes suited to library floors and magic circles.', stats: { magicResist: 2 }, durability: 35, professionRequired: 'TAILOR', levelRequired: 1, baseValue: 30 },

  // --- TAILOR: Linen ---
  { name: 'Linen Hood', type: 'ARMOR', rarity: 'COMMON', description: 'A crisp linen hood with an Elven weave pattern.', stats: { magicResist: 3 }, durability: 40, professionRequired: 'TAILOR', levelRequired: 5, baseValue: 50 },
  { name: 'Linen Robes', type: 'ARMOR', rarity: 'COMMON', description: 'Breathable linen robes preferred in warm climates.', stats: { magicResist: 6 }, durability: 50, professionRequired: 'TAILOR', levelRequired: 5, baseValue: 90 },
  { name: 'Linen Gloves', type: 'ARMOR', rarity: 'COMMON', description: 'Light linen gloves with rune-stitched fingertips.', stats: { magicResist: 2 }, durability: 35, professionRequired: 'TAILOR', levelRequired: 5, baseValue: 40 },
  { name: 'Linen Boots', type: 'ARMOR', rarity: 'COMMON', description: 'Linen ankle boots with enchantment-friendly thread.', stats: { magicResist: 3 }, durability: 40, professionRequired: 'TAILOR', levelRequired: 5, baseValue: 45 },

  // --- TAILOR: Woven Wool ---
  { name: 'Woven Wool Hood', type: 'ARMOR', rarity: 'COMMON', description: 'A warm woolen hood that muffles wind and whispers alike.', stats: { armor: 3, magicResist: 5 }, durability: 60, professionRequired: 'TAILOR', levelRequired: 10, baseValue: 80 },
  { name: 'Woven Wool Robes', type: 'ARMOR', rarity: 'COMMON', description: 'Thick woolen robes that ward against cold and cantrips.', stats: { armor: 5, magicResist: 10 }, durability: 75, professionRequired: 'TAILOR', levelRequired: 10, baseValue: 160 },
  { name: 'Woven Wool Gloves', type: 'ARMOR', rarity: 'COMMON', description: 'Warm wool gloves with flexible knit for spellcasting.', stats: { armor: 2, magicResist: 4 }, durability: 50, professionRequired: 'TAILOR', levelRequired: 10, baseValue: 65 },
  { name: 'Woven Wool Boots', type: 'ARMOR', rarity: 'COMMON', description: 'Felted wool boots, warm and quiet on stone floors.', stats: { armor: 3, magicResist: 5 }, durability: 60, professionRequired: 'TAILOR', levelRequired: 10, baseValue: 80 },
  { name: 'Woven Wool Cloak', type: 'ARMOR', rarity: 'COMMON', description: 'A heavy wool traveling cloak that resists rain and weak spells.', stats: { armor: 2, magicResist: 6 }, durability: 55, professionRequired: 'TAILOR', levelRequired: 10, baseValue: 100 },

  // --- TAILOR: Silk ---
  { name: 'Silk Hood', type: 'ARMOR', rarity: 'SUPERIOR', description: 'A shimmering silk hood that channels arcane energy.', stats: { armor: 6, magicResist: 12 }, durability: 100, professionRequired: 'TAILOR', levelRequired: 40, baseValue: 300 },
  { name: 'Silk Robes', type: 'ARMOR', rarity: 'SUPERIOR', description: 'Luxurious silk robes woven with spell-conducting thread.', stats: { armor: 10, magicResist: 22 }, durability: 120, professionRequired: 'TAILOR', levelRequired: 40, baseValue: 600 },
  { name: 'Silk Gloves', type: 'ARMOR', rarity: 'SUPERIOR', description: 'Silk gloves so fine they amplify the wearer\'s magical touch.', stats: { armor: 4, magicResist: 8 }, durability: 80, professionRequired: 'TAILOR', levelRequired: 40, baseValue: 250 },
  { name: 'Silk Boots', type: 'ARMOR', rarity: 'SUPERIOR', description: 'Silk slippers enchanted for silent movement.', stats: { armor: 6, magicResist: 12 }, durability: 100, professionRequired: 'TAILOR', levelRequired: 40, baseValue: 300 },
  { name: 'Silk Cloak', type: 'ARMOR', rarity: 'SUPERIOR', description: 'A flowing silk cloak that billows dramatically and absorbs spells.', stats: { armor: 4, magicResist: 14 }, durability: 90, professionRequired: 'TAILOR', levelRequired: 40, baseValue: 500 },

  // --- TAILOR: Enchanted Silk ---
  { name: 'Enchanted Silk Hood', type: 'ARMOR', rarity: 'LEGENDARY', description: 'A hood woven from arcane-infused silk that hums with power.', stats: { armor: 10, magicResist: 24 }, durability: 180, professionRequired: 'TAILOR', levelRequired: 70, baseValue: 1200 },
  { name: 'Enchanted Silk Robes', type: 'ARMOR', rarity: 'LEGENDARY', description: 'Robes of pure magical silk. Worn by archmages and high priests.', stats: { armor: 16, magicResist: 40 }, durability: 220, professionRequired: 'TAILOR', levelRequired: 70, baseValue: 2500 },
  { name: 'Enchanted Silk Gloves', type: 'ARMOR', rarity: 'LEGENDARY', description: 'Gloves that crackle with residual energy between the fingers.', stats: { armor: 8, magicResist: 18 }, durability: 150, professionRequired: 'TAILOR', levelRequired: 70, baseValue: 950 },
  { name: 'Enchanted Silk Boots', type: 'ARMOR', rarity: 'LEGENDARY', description: 'Boots that barely touch the ground, leaving no tracks.', stats: { armor: 10, magicResist: 24 }, durability: 180, professionRequired: 'TAILOR', levelRequired: 70, baseValue: 1200 },
  { name: 'Enchanted Silk Cloak', type: 'ARMOR', rarity: 'LEGENDARY', description: 'A cloak that shifts color with the wearer\'s mood and absorbs hostile magic.', stats: { armor: 8, magicResist: 30 }, durability: 160, professionRequired: 'TAILOR', levelRequired: 70, baseValue: 2000 },
];

// ============================================================
// HELPER: Map level to ProfessionTier
// ============================================================

function levelToTier(level: number): ProfessionTier {
  if (level >= 75) return 'MASTER';
  if (level >= 50) return 'EXPERT';
  if (level >= 30) return 'CRAFTSMAN';
  if (level >= 10) return 'JOURNEYMAN';
  return 'APPRENTICE';
}

// ============================================================
// SEED FUNCTION
// ============================================================

export async function seedArmorRecipes(prisma: PrismaClient) {
  console.log('--- Seeding Armor Item Templates ---');

  const templateMap = new Map<string, string>();

  // First, load existing material templates so recipes can reference them
  const existingTemplates = await prisma.itemTemplate.findMany({
    select: { id: true, name: true },
  });
  for (const t of existingTemplates) {
    templateMap.set(t.name, t.id);
  }
  console.log(`  Loaded ${existingTemplates.length} existing templates`);

  // Helper: resolve template or fail loudly
  function ensureTemplate(itemName: string, context: string): string {
    const id = templateMap.get(itemName);
    if (!id) {
      throw new Error(
        `Recipe references unknown item template "${itemName}" (recipe: ${context}). ` +
        `Add it to ITEM_TEMPLATES in database/seeds/recipes.ts first.`
      );
    }
    return id;
  }

  // Seed armor item templates
  for (const tmpl of ARMOR_TEMPLATES) {
    const stableId = `armor-${tmpl.name.toLowerCase().replace(/\s+/g, '-')}`;
    const created = await prisma.itemTemplate.upsert({
      where: { id: stableId },
      update: {
        name: tmpl.name,
        type: tmpl.type,
        rarity: tmpl.rarity,
        description: tmpl.description,
        stats: tmpl.stats,
        durability: tmpl.durability,
        professionRequired: tmpl.professionRequired,
        levelRequired: tmpl.levelRequired,
        baseValue: tmpl.baseValue,
      },
      create: {
        id: stableId,
        name: tmpl.name,
        type: tmpl.type,
        rarity: tmpl.rarity,
        description: tmpl.description,
        stats: tmpl.stats,
        durability: tmpl.durability,
        professionRequired: tmpl.professionRequired,
        levelRequired: tmpl.levelRequired,
        baseValue: tmpl.baseValue,
      },
    });
    templateMap.set(tmpl.name, created.id);
  }
  console.log(`  Armor templates: ${ARMOR_TEMPLATES.length}`);

  // Seed armor recipes
  console.log('--- Seeding Armor Recipes ---');

  for (const recipe of ALL_ARMOR_RECIPES) {
    const ingredients: { itemTemplateId: string; itemName: string; quantity: number }[] = [];
    for (const inp of recipe.inputs) {
      const templateId = ensureTemplate(inp.itemName, recipe.name);
      ingredients.push({ itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity });
    }

    const output = recipe.outputs[0];
    const resultId = ensureTemplate(output.itemName, recipe.name);

    const recipeId = `recipe-${recipe.recipeId}`;
    const tier = levelToTier(recipe.levelRequired);

    await prisma.recipe.upsert({
      where: { id: recipeId },
      update: {
        name: recipe.name,
        professionType: recipe.professionRequired as ProfessionType,
        tier,
        ingredients,
        result: resultId,
        craftTime: recipe.craftTime,
        xpReward: recipe.xpReward,
      },
      create: {
        id: recipeId,
        name: recipe.name,
        professionType: recipe.professionRequired as ProfessionType,
        tier,
        ingredients,
        result: resultId,
        craftTime: recipe.craftTime,
        xpReward: recipe.xpReward,
      },
    });

    console.log(`  + ${recipe.name} (${recipe.professionRequired} Lvl ${recipe.levelRequired})`);
  }

  console.log(`  Armor recipes: ${ALL_ARMOR_RECIPES.length}`);
  console.log(`  Total templates now: ${templateMap.size}`);
}
