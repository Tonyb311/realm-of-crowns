/**
 * Armor Recipe Seed Data for Realm of Crowns
 *
 * Seeds item templates and recipes for all armor types:
 *   - ARMORER: Metal plate armor (Copper -> Iron -> Steel -> Mithril -> Adamantine)
 *   - LEATHERWORKER: Leather armor (Soft -> Hard -> Studded -> Exotic -> Dragonscale)
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
}

const ARMOR_TEMPLATES: ArmorTemplateDef[] = [
  // --- ARMORER: Copper ---
  { name: 'Copper Helm', type: 'ARMOR', rarity: 'COMMON', description: 'A crude copper helm offering basic head protection.', stats: { armor: 4 }, durability: 60, professionRequired: 'ARMORER', levelRequired: 1 },
  { name: 'Copper Chestplate', type: 'ARMOR', rarity: 'COMMON', description: 'A hammered copper breastplate. Heavy but protective.', stats: { armor: 8 }, durability: 70, professionRequired: 'ARMORER', levelRequired: 1 },
  { name: 'Copper Gauntlets', type: 'ARMOR', rarity: 'COMMON', description: 'Copper hand guards with leather lining.', stats: { armor: 3 }, durability: 55, professionRequired: 'ARMORER', levelRequired: 1 },
  { name: 'Copper Greaves', type: 'ARMOR', rarity: 'COMMON', description: 'Copper leg guards strapped over leather.', stats: { armor: 5 }, durability: 65, professionRequired: 'ARMORER', levelRequired: 1 },
  { name: 'Copper Shield', type: 'ARMOR', rarity: 'COMMON', description: 'A round copper shield with a wooden core.', stats: { armor: 6 }, durability: 70, professionRequired: 'ARMORER', levelRequired: 1 },

  // --- ARMORER: Iron ---
  { name: 'Iron Helm', type: 'ARMOR', rarity: 'COMMON', description: 'A solid iron helm with cheek guards.', stats: { armor: 8 }, durability: 120, professionRequired: 'ARMORER', levelRequired: 10 },
  { name: 'Iron Chestplate', type: 'ARMOR', rarity: 'COMMON', description: 'Thick iron plate armor covering the torso.', stats: { armor: 16 }, durability: 150, professionRequired: 'ARMORER', levelRequired: 10 },
  { name: 'Iron Gauntlets', type: 'ARMOR', rarity: 'COMMON', description: 'Articulated iron gauntlets for battle.', stats: { armor: 6 }, durability: 110, professionRequired: 'ARMORER', levelRequired: 10 },
  { name: 'Iron Greaves', type: 'ARMOR', rarity: 'COMMON', description: 'Iron leg plates that protect from knee to ankle.', stats: { armor: 10 }, durability: 130, professionRequired: 'ARMORER', levelRequired: 10 },

  // --- ARMORER: Steel ---
  { name: 'Steel Helm', type: 'ARMOR', rarity: 'FINE', description: 'A polished steel helm with a visor.', stats: { armor: 14 }, durability: 200, professionRequired: 'ARMORER', levelRequired: 30 },
  { name: 'Steel Chestplate', type: 'ARMOR', rarity: 'FINE', description: 'Steel plate armor, the standard of professional soldiers.', stats: { armor: 26 }, durability: 260, professionRequired: 'ARMORER', levelRequired: 30 },
  { name: 'Steel Gauntlets', type: 'ARMOR', rarity: 'FINE', description: 'Steel gauntlets with reinforced knuckles.', stats: { armor: 10 }, durability: 180, professionRequired: 'ARMORER', levelRequired: 30 },
  { name: 'Steel Greaves', type: 'ARMOR', rarity: 'FINE', description: 'Steel leg armor with articulated knee joints.', stats: { armor: 18 }, durability: 220, professionRequired: 'ARMORER', levelRequired: 30 },
  { name: 'Steel Shield', type: 'ARMOR', rarity: 'FINE', description: 'A kite shield of tempered steel.', stats: { armor: 20 }, durability: 240, professionRequired: 'ARMORER', levelRequired: 30 },

  // --- ARMORER: Mithril ---
  { name: 'Mithril Helm', type: 'ARMOR', rarity: 'MASTERWORK', description: 'A gleaming mithril helm, light as a feather.', stats: { armor: 22, magicResist: 5 }, durability: 320, professionRequired: 'ARMORER', levelRequired: 55 },
  { name: 'Mithril Chestplate', type: 'ARMOR', rarity: 'MASTERWORK', description: 'Mithril plate that weighs less than leather yet stops steel.', stats: { armor: 38, magicResist: 10 }, durability: 400, professionRequired: 'ARMORER', levelRequired: 55 },
  { name: 'Mithril Gauntlets', type: 'ARMOR', rarity: 'MASTERWORK', description: 'Mithril gauntlets with gem-inlaid wrists.', stats: { armor: 16, magicResist: 4 }, durability: 300, professionRequired: 'ARMORER', levelRequired: 55 },
  { name: 'Mithril Greaves', type: 'ARMOR', rarity: 'MASTERWORK', description: 'Mithril leg guards that shimmer in moonlight.', stats: { armor: 28, magicResist: 6 }, durability: 340, professionRequired: 'ARMORER', levelRequired: 55 },
  { name: 'Mithril Shield', type: 'ARMOR', rarity: 'MASTERWORK', description: 'A tower shield of mithril that deflects both steel and spells.', stats: { armor: 30, magicResist: 8 }, durability: 360, professionRequired: 'ARMORER', levelRequired: 55 },

  // --- ARMORER: Adamantine ---
  { name: 'Adamantine Helm', type: 'ARMOR', rarity: 'LEGENDARY', description: 'A crown-like helm of adamantine. Nearly indestructible.', stats: { armor: 32, magicResist: 8 }, durability: 500, professionRequired: 'ARMORER', levelRequired: 75 },
  { name: 'Adamantine Chestplate', type: 'ARMOR', rarity: 'LEGENDARY', description: 'The ultimate in physical protection, forged from the hardest metal.', stats: { armor: 52, magicResist: 14 }, durability: 600, professionRequired: 'ARMORER', levelRequired: 75 },
  { name: 'Adamantine Gauntlets', type: 'ARMOR', rarity: 'LEGENDARY', description: 'Adamantine gauntlets that can catch a blade bare-handed.', stats: { armor: 24, magicResist: 6 }, durability: 460, professionRequired: 'ARMORER', levelRequired: 75 },
  { name: 'Adamantine Greaves', type: 'ARMOR', rarity: 'LEGENDARY', description: 'Leg armor of pure adamantine, impervious to all but the mightiest blows.', stats: { armor: 40, magicResist: 10 }, durability: 520, professionRequired: 'ARMORER', levelRequired: 75 },
  { name: 'Adamantine Shield', type: 'ARMOR', rarity: 'LEGENDARY', description: 'A fortress in one arm. This shield has never been breached.', stats: { armor: 44, magicResist: 12 }, durability: 550, professionRequired: 'ARMORER', levelRequired: 75 },

  // --- LEATHERWORKER: Soft Leather ---
  { name: 'Leather Cap', type: 'ARMOR', rarity: 'COMMON', description: 'A simple leather skullcap offering minimal protection.', stats: { armor: 2 }, durability: 50, professionRequired: 'LEATHERWORKER', levelRequired: 1 },
  { name: 'Leather Vest', type: 'ARMOR', rarity: 'COMMON', description: 'A flexible leather vest that does not hinder movement.', stats: { armor: 5 }, durability: 60, professionRequired: 'LEATHERWORKER', levelRequired: 1 },
  { name: 'Leather Gloves', type: 'ARMOR', rarity: 'COMMON', description: 'Supple leather gloves, perfect for nimble fingers.', stats: { armor: 1 }, durability: 45, professionRequired: 'LEATHERWORKER', levelRequired: 1 },
  { name: 'Leather Boots', type: 'ARMOR', rarity: 'COMMON', description: 'Sturdy leather boots with soft soles for quiet movement.', stats: { armor: 2 }, durability: 50, professionRequired: 'LEATHERWORKER', levelRequired: 1 },
  { name: 'Leather Bracers', type: 'ARMOR', rarity: 'COMMON', description: 'Simple leather wrist guards.', stats: { armor: 2 }, durability: 45, professionRequired: 'LEATHERWORKER', levelRequired: 1 },

  // --- LEATHERWORKER: Hard Leather ---
  { name: 'Hard Leather Cap', type: 'ARMOR', rarity: 'FINE', description: 'A boiled leather cap hardened against blows.', stats: { armor: 5 }, durability: 90, professionRequired: 'LEATHERWORKER', levelRequired: 15 },
  { name: 'Hard Leather Vest', type: 'ARMOR', rarity: 'FINE', description: 'Molded hard leather offering improved protection.', stats: { armor: 10 }, durability: 110, professionRequired: 'LEATHERWORKER', levelRequired: 15 },
  { name: 'Hard Leather Gloves', type: 'ARMOR', rarity: 'FINE', description: 'Stiffened leather gloves with reinforced palms.', stats: { armor: 4 }, durability: 80, professionRequired: 'LEATHERWORKER', levelRequired: 15 },
  { name: 'Hard Leather Boots', type: 'ARMOR', rarity: 'FINE', description: 'Thick-soled hard leather boots for rough terrain.', stats: { armor: 5 }, durability: 90, professionRequired: 'LEATHERWORKER', levelRequired: 15 },
  { name: 'Hard Leather Bracers', type: 'ARMOR', rarity: 'FINE', description: 'Hard leather forearm guards with buckle clasps.', stats: { armor: 4 }, durability: 85, professionRequired: 'LEATHERWORKER', levelRequired: 15 },

  // --- LEATHERWORKER: Studded Leather ---
  { name: 'Studded Leather Cap', type: 'ARMOR', rarity: 'FINE', description: 'A leather cap studded with iron rivets.', stats: { armor: 8 }, durability: 150, professionRequired: 'LEATHERWORKER', levelRequired: 30 },
  { name: 'Studded Leather Vest', type: 'ARMOR', rarity: 'FINE', description: 'Hard leather reinforced with iron studs.', stats: { armor: 16 }, durability: 180, professionRequired: 'LEATHERWORKER', levelRequired: 30 },
  { name: 'Studded Leather Gloves', type: 'ARMOR', rarity: 'FINE', description: 'Leather gloves with iron-studded knuckles.', stats: { armor: 6 }, durability: 130, professionRequired: 'LEATHERWORKER', levelRequired: 30 },
  { name: 'Studded Leather Boots', type: 'ARMOR', rarity: 'FINE', description: 'Iron-studded boots that can deliver a punishing kick.', stats: { armor: 8 }, durability: 150, professionRequired: 'LEATHERWORKER', levelRequired: 30 },
  { name: 'Studded Leather Bracers', type: 'ARMOR', rarity: 'FINE', description: 'Studded forearm guards useful for parrying.', stats: { armor: 7 }, durability: 140, professionRequired: 'LEATHERWORKER', levelRequired: 30 },

  // --- LEATHERWORKER: Exotic Leather ---
  { name: 'Exotic Leather Cap', type: 'ARMOR', rarity: 'SUPERIOR', description: 'A sleek cap of rare exotic leather, supple yet tough.', stats: { armor: 14, magicResist: 3 }, durability: 240, professionRequired: 'LEATHERWORKER', levelRequired: 50 },
  { name: 'Exotic Leather Vest', type: 'ARMOR', rarity: 'SUPERIOR', description: 'A vest crafted from exotic beast hide. Light and resilient.', stats: { armor: 24, magicResist: 6 }, durability: 300, professionRequired: 'LEATHERWORKER', levelRequired: 50 },
  { name: 'Exotic Leather Gloves', type: 'ARMOR', rarity: 'SUPERIOR', description: 'Gloves of exotic leather that seem to anticipate the wearer\'s grip.', stats: { armor: 10, magicResist: 2 }, durability: 210, professionRequired: 'LEATHERWORKER', levelRequired: 50 },
  { name: 'Exotic Leather Boots', type: 'ARMOR', rarity: 'SUPERIOR', description: 'Silent boots of exotic leather, prized by scouts.', stats: { armor: 14, magicResist: 3 }, durability: 240, professionRequired: 'LEATHERWORKER', levelRequired: 50 },
  { name: 'Exotic Leather Bracers', type: 'ARMOR', rarity: 'SUPERIOR', description: 'Exotic leather wrist guards with faint magical shimmer.', stats: { armor: 12, magicResist: 3 }, durability: 220, professionRequired: 'LEATHERWORKER', levelRequired: 50 },

  // --- LEATHERWORKER: Dragonscale ---
  { name: 'Dragonscale Helm', type: 'ARMOR', rarity: 'LEGENDARY', description: 'A helm forged from overlapping dragon scales. Fireproof.', stats: { armor: 24, magicResist: 10 }, durability: 400, professionRequired: 'LEATHERWORKER', levelRequired: 80 },
  { name: 'Dragonscale Vest', type: 'ARMOR', rarity: 'LEGENDARY', description: 'Dragon scale armor that rivals plate in protection while remaining flexible.', stats: { armor: 40, magicResist: 16 }, durability: 500, professionRequired: 'LEATHERWORKER', levelRequired: 80 },
  { name: 'Dragonscale Gloves', type: 'ARMOR', rarity: 'LEGENDARY', description: 'Dragonscale gauntlets that radiate warmth and power.', stats: { armor: 18, magicResist: 8 }, durability: 360, professionRequired: 'LEATHERWORKER', levelRequired: 80 },
  { name: 'Dragonscale Boots', type: 'ARMOR', rarity: 'LEGENDARY', description: 'Boots of dragonscale that leave scorch marks on stone.', stats: { armor: 24, magicResist: 10 }, durability: 400, professionRequired: 'LEATHERWORKER', levelRequired: 80 },
  { name: 'Dragonscale Bracers', type: 'ARMOR', rarity: 'LEGENDARY', description: 'Bracers of interlocking dragon scales, warm to the touch.', stats: { armor: 20, magicResist: 8 }, durability: 380, professionRequired: 'LEATHERWORKER', levelRequired: 80 },

  // --- TAILOR: Cloth ---
  { name: 'Cloth Hood', type: 'ARMOR', rarity: 'COMMON', description: 'A simple cotton hood favored by apprentice mages.', stats: { magicResist: 2 }, durability: 35, professionRequired: 'TAILOR', levelRequired: 1 },
  { name: 'Cloth Robes', type: 'ARMOR', rarity: 'COMMON', description: 'Plain cotton robes, the uniform of novice spellcasters.', stats: { magicResist: 4 }, durability: 40, professionRequired: 'TAILOR', levelRequired: 1 },
  { name: 'Cloth Gloves', type: 'ARMOR', rarity: 'COMMON', description: 'Thin cotton gloves that leave fingers free for gesturing.', stats: { magicResist: 1 }, durability: 30, professionRequired: 'TAILOR', levelRequired: 1 },
  { name: 'Cloth Boots', type: 'ARMOR', rarity: 'COMMON', description: 'Soft cloth shoes suited to library floors and magic circles.', stats: { magicResist: 2 }, durability: 35, professionRequired: 'TAILOR', levelRequired: 1 },

  // --- TAILOR: Linen ---
  { name: 'Linen Hood', type: 'ARMOR', rarity: 'COMMON', description: 'A crisp linen hood with an Elven weave pattern.', stats: { magicResist: 3 }, durability: 40, professionRequired: 'TAILOR', levelRequired: 5 },
  { name: 'Linen Robes', type: 'ARMOR', rarity: 'COMMON', description: 'Breathable linen robes preferred in warm climates.', stats: { magicResist: 6 }, durability: 50, professionRequired: 'TAILOR', levelRequired: 5 },
  { name: 'Linen Gloves', type: 'ARMOR', rarity: 'COMMON', description: 'Light linen gloves with rune-stitched fingertips.', stats: { magicResist: 2 }, durability: 35, professionRequired: 'TAILOR', levelRequired: 5 },
  { name: 'Linen Boots', type: 'ARMOR', rarity: 'COMMON', description: 'Linen ankle boots with enchantment-friendly thread.', stats: { magicResist: 3 }, durability: 40, professionRequired: 'TAILOR', levelRequired: 5 },

  // --- TAILOR: Woven Wool ---
  { name: 'Woven Wool Hood', type: 'ARMOR', rarity: 'COMMON', description: 'A warm woolen hood that muffles wind and whispers alike.', stats: { armor: 3, magicResist: 5 }, durability: 60, professionRequired: 'TAILOR', levelRequired: 10 },
  { name: 'Woven Wool Robes', type: 'ARMOR', rarity: 'COMMON', description: 'Thick woolen robes that ward against cold and cantrips.', stats: { armor: 5, magicResist: 10 }, durability: 75, professionRequired: 'TAILOR', levelRequired: 10 },
  { name: 'Woven Wool Gloves', type: 'ARMOR', rarity: 'COMMON', description: 'Warm wool gloves with flexible knit for spellcasting.', stats: { armor: 2, magicResist: 4 }, durability: 50, professionRequired: 'TAILOR', levelRequired: 10 },
  { name: 'Woven Wool Boots', type: 'ARMOR', rarity: 'COMMON', description: 'Felted wool boots, warm and quiet on stone floors.', stats: { armor: 3, magicResist: 5 }, durability: 60, professionRequired: 'TAILOR', levelRequired: 10 },
  { name: 'Woven Wool Cloak', type: 'ARMOR', rarity: 'COMMON', description: 'A heavy wool traveling cloak that resists rain and weak spells.', stats: { armor: 2, magicResist: 6 }, durability: 55, professionRequired: 'TAILOR', levelRequired: 10 },

  // --- TAILOR: Silk ---
  { name: 'Silk Hood', type: 'ARMOR', rarity: 'SUPERIOR', description: 'A shimmering silk hood that channels arcane energy.', stats: { armor: 6, magicResist: 12 }, durability: 100, professionRequired: 'TAILOR', levelRequired: 40 },
  { name: 'Silk Robes', type: 'ARMOR', rarity: 'SUPERIOR', description: 'Luxurious silk robes woven with spell-conducting thread.', stats: { armor: 10, magicResist: 22 }, durability: 120, professionRequired: 'TAILOR', levelRequired: 40 },
  { name: 'Silk Gloves', type: 'ARMOR', rarity: 'SUPERIOR', description: 'Silk gloves so fine they amplify the wearer\'s magical touch.', stats: { armor: 4, magicResist: 8 }, durability: 80, professionRequired: 'TAILOR', levelRequired: 40 },
  { name: 'Silk Boots', type: 'ARMOR', rarity: 'SUPERIOR', description: 'Silk slippers enchanted for silent movement.', stats: { armor: 6, magicResist: 12 }, durability: 100, professionRequired: 'TAILOR', levelRequired: 40 },
  { name: 'Silk Cloak', type: 'ARMOR', rarity: 'SUPERIOR', description: 'A flowing silk cloak that billows dramatically and absorbs spells.', stats: { armor: 4, magicResist: 14 }, durability: 90, professionRequired: 'TAILOR', levelRequired: 40 },

  // --- TAILOR: Enchanted Silk ---
  { name: 'Enchanted Silk Hood', type: 'ARMOR', rarity: 'LEGENDARY', description: 'A hood woven from arcane-infused silk that hums with power.', stats: { armor: 10, magicResist: 24 }, durability: 180, professionRequired: 'TAILOR', levelRequired: 70 },
  { name: 'Enchanted Silk Robes', type: 'ARMOR', rarity: 'LEGENDARY', description: 'Robes of pure magical silk. Worn by archmages and high priests.', stats: { armor: 16, magicResist: 40 }, durability: 220, professionRequired: 'TAILOR', levelRequired: 70 },
  { name: 'Enchanted Silk Gloves', type: 'ARMOR', rarity: 'LEGENDARY', description: 'Gloves that crackle with residual energy between the fingers.', stats: { armor: 8, magicResist: 18 }, durability: 150, professionRequired: 'TAILOR', levelRequired: 70 },
  { name: 'Enchanted Silk Boots', type: 'ARMOR', rarity: 'LEGENDARY', description: 'Boots that barely touch the ground, leaving no tracks.', stats: { armor: 10, magicResist: 24 }, durability: 180, professionRequired: 'TAILOR', levelRequired: 70 },
  { name: 'Enchanted Silk Cloak', type: 'ARMOR', rarity: 'LEGENDARY', description: 'A cloak that shifts color with the wearer\'s mood and absorbs hostile magic.', stats: { armor: 8, magicResist: 30 }, durability: 160, professionRequired: 'TAILOR', levelRequired: 70 },
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
      },
    });
    templateMap.set(tmpl.name, created.id);
  }
  console.log(`  Armor templates: ${ARMOR_TEMPLATES.length}`);

  // Seed armor recipes
  console.log('--- Seeding Armor Recipes ---');

  for (const recipe of ALL_ARMOR_RECIPES) {
    const ingredients = recipe.inputs.map((inp) => {
      const templateId = templateMap.get(inp.itemName);
      if (!templateId) {
        throw new Error(`Item template not found for input: ${inp.itemName} (recipe: ${recipe.name})`);
      }
      return { itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity };
    });

    const output = recipe.outputs[0];
    const resultId = templateMap.get(output.itemName);
    if (!resultId) {
      throw new Error(`Item template not found for output: ${output.itemName} (recipe: ${recipe.name})`);
    }

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
