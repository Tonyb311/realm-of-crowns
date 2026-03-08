/**
 * Seed data for accessories, enchantments, housing, and mount gear.
 *
 * Seeds item templates for all new crafted items, then inserts
 * recipes that reference those templates (plus existing materials).
 */

import * as schema from '../schema';
import type { ItemType, ItemRarity, ProfessionType, ProfessionTier } from '@shared/enums';
import { ACCESSORY_RECIPES } from '@shared/data/recipes/accessories';
import { ENCHANTMENT_RECIPES } from '@shared/data/recipes/enchantments';
import { HOUSING_RECIPES } from '@shared/data/recipes/housing';
import { MOUNT_GEAR_RECIPES } from '@shared/data/recipes/mount-gear';

// ============================================================
// ITEM TEMPLATE DEFINITIONS
// ============================================================

interface ItemTemplateDef {
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  description: string;
  stats: Record<string, number>;
  durability: number;
  professionRequired: ProfessionType | null;
  levelRequired: number;
  baseValue: number;
  weight: number;
}

const ACCESSORY_ITEM_TEMPLATES: ItemTemplateDef[] = [
  // ── Rings ──────────────────────────────────────────────────
  {
    name: 'Copper Ring',
    type: 'ACCESSORY',
    rarity: 'COMMON',
    description: 'A simple ring of hammered copper. Better than nothing.',
    stats: { armor: 1 },
    durability: 80,
    professionRequired: 'JEWELER',
    levelRequired: 1,
    baseValue: 55,
    weight: 0.1,
  },
  {
    name: 'Iron Ring',
    type: 'ACCESSORY',
    rarity: 'COMMON',
    description: 'A sturdy iron band. Plain but reliable.',
    stats: { armor: 2, strength: 1 },
    durability: 100,
    professionRequired: 'JEWELER',
    levelRequired: 10,
    baseValue: 120,
    weight: 0.1,
  },
  {
    name: 'Silver Ring',
    type: 'ACCESSORY',
    rarity: 'FINE',
    description: 'A polished silver ring set with a small gem. Favored by spellcasters.',
    stats: { intelligence: 3, armor: 2 },
    durability: 90,
    professionRequired: 'JEWELER',
    levelRequired: 20,
    baseValue: 155,
    weight: 0.1,
  },
  {
    name: 'Gold Ring',
    type: 'ACCESSORY',
    rarity: 'SUPERIOR',
    description: 'A gleaming gold ring adorned with precious stones. Radiates faint warmth.',
    stats: { intelligence: 5, charisma: 3, wisdom: 2 },
    durability: 90,
    professionRequired: 'JEWELER',
    levelRequired: 30,
    baseValue: 380,
    weight: 0.1,
  },
  {
    name: 'Mithril Ring',
    type: 'ACCESSORY',
    rarity: 'MASTERWORK',
    description: 'A ring of legendary mithril, nearly weightless yet humming with power.',
    stats: { intelligence: 8, armor: 5, dexterity: 3 },
    durability: 150,
    professionRequired: 'JEWELER',
    levelRequired: 55,
    baseValue: 2500,
    weight: 0.1,
  },

  {
    name: 'Adamantine Ring',
    type: 'ACCESSORY',
    rarity: 'LEGENDARY',
    description: 'A ring forged from adamantine and set with arcane gems. Virtually indestructible.',
    stats: { armor: 8, intelligence: 10, dexterity: 5 },
    durability: 200,
    professionRequired: 'JEWELER',
    levelRequired: 75,
    baseValue: 5000,
    weight: 0.1,
  },

  // ── Necklaces ──────────────────────────────────────────────
  {
    name: 'Copper Necklace',
    type: 'ACCESSORY',
    rarity: 'COMMON',
    description: 'A simple copper chain. Keeps trinkets close to the heart.',
    stats: { armor: 1, constitution: 2 },
    durability: 80,
    professionRequired: 'JEWELER',
    levelRequired: 1,
    baseValue: 75,
    weight: 0.3,
  },
  {
    name: 'Silver Necklace',
    type: 'ACCESSORY',
    rarity: 'FINE',
    description: 'A delicate silver chain with a faceted gem pendant.',
    stats: { intelligence: 4, constitution: 3 },
    durability: 90,
    professionRequired: 'JEWELER',
    levelRequired: 20,
    baseValue: 290,
    weight: 0.3,
  },
  {
    name: 'Gold Necklace',
    type: 'ACCESSORY',
    rarity: 'SUPERIOR',
    description: 'An ornate gold necklace dripping with gems. Marks its wearer as someone of means.',
    stats: { intelligence: 6, constitution: 4, charisma: 4 },
    durability: 90,
    professionRequired: 'JEWELER',
    levelRequired: 30,
    baseValue: 650,
    weight: 0.3,
  },

  {
    name: 'Mithril Necklace',
    type: 'ACCESSORY',
    rarity: 'MASTERWORK',
    description: 'A mithril chain inset with enchanted gemstones. Light as air, strong as iron.',
    stats: { intelligence: 8, constitution: 5, armor: 3 },
    durability: 150,
    professionRequired: 'JEWELER',
    levelRequired: 55,
    baseValue: 2800,
    weight: 0.3,
  },
  {
    name: 'Adamantine Necklace',
    type: 'ACCESSORY',
    rarity: 'LEGENDARY',
    description: 'An adamantine chain with a massive arcane gem. Radiates raw power.',
    stats: { intelligence: 12, constitution: 6, wisdom: 4, armor: 5 },
    durability: 200,
    professionRequired: 'JEWELER',
    levelRequired: 75,
    baseValue: 5500,
    weight: 0.3,
  },

  // ── Circlets & Crowns ──────────────────────────────────────
  {
    name: 'Circlet of Focus',
    type: 'ACCESSORY',
    rarity: 'FINE',
    description: 'A silver circlet inset with a sapphire that sharpens the mind.',
    stats: { intelligence: 5, wisdom: 3 },
    durability: 100,
    professionRequired: 'JEWELER',
    levelRequired: 25,
    baseValue: 350,
    weight: 1,
  },
  {
    name: 'Crown of Wisdom',
    type: 'ACCESSORY',
    rarity: 'MASTERWORK',
    description: 'A golden crown studded with brilliant gems. Worn by leaders and sages.',
    stats: { intelligence: 10, wisdom: 6, charisma: 5 },
    durability: 120,
    professionRequired: 'JEWELER',
    levelRequired: 50,
    baseValue: 1500,
    weight: 1,
  },

  // ── Brooches ───────────────────────────────────────────────
  {
    name: 'Brooch of Protection',
    type: 'ACCESSORY',
    rarity: 'FINE',
    description: 'An iron brooch set with a warding gem. Deflects minor harm.',
    stats: { armor: 4, constitution: 2 },
    durability: 100,
    professionRequired: 'JEWELER',
    levelRequired: 15,
    baseValue: 180,
    weight: 0.2,
  },
  {
    name: 'Brooch of Speed',
    type: 'ACCESSORY',
    rarity: 'SUPERIOR',
    description: 'A gold brooch that hums with kinetic energy. Quickens the wearer.',
    stats: { dexterity: 4 },
    durability: 100,
    professionRequired: 'JEWELER',
    levelRequired: 30,
    baseValue: 400,
    weight: 0.2,
  },
];

const ENCHANTMENT_ITEM_TEMPLATES: ItemTemplateDef[] = [
  {
    name: 'Flaming Enchantment Scroll',
    type: 'CONSUMABLE',
    rarity: 'FINE',
    description: 'Apply to a weapon to add fire damage. The scroll is consumed on use.',
    stats: { fireDamage: 8 },
    durability: 1,
    professionRequired: 'ENCHANTER',
    levelRequired: 10,
    baseValue: 155,
    weight: 0.1,
  },
  {
    name: 'Frost Enchantment Scroll',
    type: 'CONSUMABLE',
    rarity: 'FINE',
    description: 'Apply to a weapon to add cold damage. The scroll is consumed on use.',
    stats: { coldDamage: 8 },
    durability: 1,
    professionRequired: 'ENCHANTER',
    levelRequired: 10,
    baseValue: 155,
    weight: 0.1,
  },
  {
    name: 'Lightning Enchantment Scroll',
    type: 'CONSUMABLE',
    rarity: 'FINE',
    description: 'Apply to a weapon to add lightning damage. The scroll is consumed on use.',
    stats: { lightningDamage: 10 },
    durability: 1,
    professionRequired: 'ENCHANTER',
    levelRequired: 15,
    baseValue: 175,
    weight: 0.1,
  },
  {
    name: 'Poisoned Enchantment Scroll',
    type: 'CONSUMABLE',
    rarity: 'FINE',
    description: 'Apply to a weapon to add poison damage. The scroll is consumed on use.',
    stats: { poisonDamage: 12 },
    durability: 1,
    professionRequired: 'ENCHANTER',
    levelRequired: 20,
    baseValue: 200,
    weight: 0.1,
  },
  {
    name: 'Holy Enchantment Scroll',
    type: 'CONSUMABLE',
    rarity: 'SUPERIOR',
    description: 'Apply to a weapon to add holy damage with bonus effect against undead.',
    stats: { holyDamage: 15, undeadBonus: 10 },
    durability: 1,
    professionRequired: 'ENCHANTER',
    levelRequired: 30,
    baseValue: 340,
    weight: 0.1,
  },
  {
    name: 'Shadow Enchantment Scroll',
    type: 'CONSUMABLE',
    rarity: 'SUPERIOR',
    description: 'Apply to a weapon to add shadow damage. Drains vitality on hit.',
    stats: { shadowDamage: 15 },
    durability: 1,
    professionRequired: 'ENCHANTER',
    levelRequired: 30,
    baseValue: 330,
    weight: 0.1,
  },
  {
    name: 'Fortified Enchantment Scroll',
    type: 'CONSUMABLE',
    rarity: 'COMMON',
    description: 'Apply to any item to increase its durability by 25%.',
    stats: { durabilityBonus: 25 },
    durability: 1,
    professionRequired: 'ENCHANTER',
    levelRequired: 5,
    baseValue: 110,
    weight: 0.1,
  },
  {
    name: 'Swift Enchantment Scroll',
    type: 'CONSUMABLE',
    rarity: 'FINE',
    description: 'Apply to a weapon to increase attack speed.',
    stats: { attackSpeedBonus: 10 },
    durability: 1,
    professionRequired: 'ENCHANTER',
    levelRequired: 15,
    baseValue: 195,
    weight: 0.1,
  },
  {
    name: 'Warding Enchantment Scroll',
    type: 'CONSUMABLE',
    rarity: 'FINE',
    description: 'Apply to armor to increase magic resistance.',
    stats: { magicResistanceBonus: 15 },
    durability: 1,
    professionRequired: 'ENCHANTER',
    levelRequired: 20,
    baseValue: 210,
    weight: 0.1,
  },
];

const HOUSING_ITEM_TEMPLATES: ItemTemplateDef[] = [
  {
    name: 'Bed',
    type: 'HOUSING',
    rarity: 'COMMON',
    description: 'A sturdy wooden bed with a straw mattress. Rest increases regeneration.',
    stats: { restBonus: 10 },
    durability: 200,
    professionRequired: 'WOODWORKER',
    levelRequired: 5,
    baseValue: 40,
    weight: 5,
  },
  {
    name: 'Table',
    type: 'HOUSING',
    rarity: 'COMMON',
    description: 'A solid hardwood table for meals and planning.',
    stats: {},
    durability: 200,
    professionRequired: 'WOODWORKER',
    levelRequired: 5,
    baseValue: 78,
    weight: 5,
  },
  {
    name: 'Chairs',
    type: 'HOUSING',
    rarity: 'COMMON',
    description: 'A pair of simple wooden chairs.',
    stats: {},
    durability: 150,
    professionRequired: 'WOODWORKER',
    levelRequired: 5,
    baseValue: 19,
    weight: 5,
  },
  {
    name: 'Storage Chest',
    type: 'HOUSING',
    rarity: 'COMMON',
    description: 'An iron-banded wooden chest. Adds extra storage slots to your home.',
    stats: { storageSlots: 20 },
    durability: 250,
    professionRequired: 'WOODWORKER',
    levelRequired: 10,
    baseValue: 117,
    weight: 5,
  },
  {
    name: 'Bookshelf',
    type: 'HOUSING',
    rarity: 'COMMON',
    description: 'A tall bookshelf that can hold tomes and scrolls.',
    stats: { storageSlots: 10 },
    durability: 180,
    professionRequired: 'WOODWORKER',
    levelRequired: 15,
    baseValue: 75,
    weight: 5,
  },
  {
    name: 'Weapon Rack',
    type: 'HOUSING',
    rarity: 'COMMON',
    description: 'A wall-mounted rack for displaying and quick-accessing weapons.',
    stats: { storageSlots: 6 },
    durability: 180,
    professionRequired: 'WOODWORKER',
    levelRequired: 15,
    baseValue: 55,
    weight: 5,
  },
  {
    name: 'Armor Stand',
    type: 'HOUSING',
    rarity: 'COMMON',
    description: 'A wooden stand for displaying a full set of armor.',
    stats: { storageSlots: 5 },
    durability: 150,
    professionRequired: 'WOODWORKER',
    levelRequired: 15,
    baseValue: 50,
    weight: 5,
  },
  {
    name: 'Alchemy Table',
    type: 'HOUSING',
    rarity: 'FINE',
    description: 'A reinforced table with built-in glass apparatus. Enables home alchemy.',
    stats: { craftingBonus: 5 },
    durability: 200,
    professionRequired: 'WOODWORKER',
    levelRequired: 20,
    baseValue: 100,
    weight: 5,
  },
  {
    name: 'Stone Hearth',
    type: 'HOUSING',
    rarity: 'COMMON',
    description: 'A stone fireplace that warms the home and allows cooking.',
    stats: { restBonus: 5, cookingEnabled: 1 },
    durability: 500,
    professionRequired: 'MASON',
    levelRequired: 10,
    baseValue: 82,
    weight: 5,
  },
  {
    name: 'Stone Fountain',
    type: 'HOUSING',
    rarity: 'FINE',
    description: 'An elegant marble fountain for the courtyard. Boosts town prestige.',
    stats: { prestige: 10 },
    durability: 500,
    professionRequired: 'MASON',
    levelRequired: 25,
    baseValue: 295,
    weight: 5,
  },
  {
    name: 'Brick Oven',
    type: 'HOUSING',
    rarity: 'COMMON',
    description: 'A brick oven that allows baking and cooking at home.',
    stats: { cookingEnabled: 1, cookingBonus: 5 },
    durability: 400,
    professionRequired: 'MASON',
    levelRequired: 15,
    baseValue: 120,
    weight: 5,
  },
  {
    name: 'Marble Statue',
    type: 'HOUSING',
    rarity: 'SUPERIOR',
    description: 'A hand-carved marble statue. A sign of wealth and artistry.',
    stats: { prestige: 20 },
    durability: 500,
    professionRequired: 'MASON',
    levelRequired: 35,
    baseValue: 365,
    weight: 5,
  },
];

const MOUNT_GEAR_ITEM_TEMPLATES: ItemTemplateDef[] = [
  {
    name: 'Saddle',
    type: 'ACCESSORY',
    rarity: 'COMMON',
    description: 'A basic leather saddle. Allows comfortable mounted travel.',
    stats: { mountSpeed: 5 },
    durability: 150,
    professionRequired: 'STABLE_MASTER',
    levelRequired: 1,
    baseValue: 50,
    weight: 5,
  },
  {
    name: 'Horseshoes',
    type: 'ACCESSORY',
    rarity: 'COMMON',
    description: 'A set of iron horseshoes. Improves mount speed on roads.',
    stats: { mountSpeed: 3, mountStamina: 5 },
    durability: 200,
    professionRequired: 'STABLE_MASTER',
    levelRequired: 5,
    baseValue: 30,
    weight: 1,
  },
  {
    name: 'Saddlebags',
    type: 'ACCESSORY',
    rarity: 'COMMON',
    description: 'Leather saddlebags for extra inventory space while mounted.',
    stats: { mountCarryCapacity: 20 },
    durability: 150,
    professionRequired: 'STABLE_MASTER',
    levelRequired: 10,
    baseValue: 60,
    weight: 3,
  },
  {
    name: 'Horse Armor',
    type: 'ARMOR',
    rarity: 'FINE',
    description: 'Leather and iron barding that protects your mount in combat.',
    stats: { mountDefense: 10, mountSpeed: -2 },
    durability: 200,
    professionRequired: 'STABLE_MASTER',
    levelRequired: 20,
    baseValue: 150,
    weight: 20,
  },
  {
    name: 'War Saddle',
    type: 'ACCESSORY',
    rarity: 'SUPERIOR',
    description: 'A reinforced saddle designed for mounted combat. Reduces knockoff chance.',
    stats: { mountSpeed: 8, mountedCombatBonus: 5 },
    durability: 200,
    professionRequired: 'STABLE_MASTER',
    levelRequired: 30,
    baseValue: 200,
    weight: 8,
  },
  {
    name: 'Mithril Horseshoes',
    type: 'ACCESSORY',
    rarity: 'MASTERWORK',
    description: 'Legendary horseshoes that make a mount swift as the wind.',
    stats: { mountSpeed: 12, mountStamina: 15 },
    durability: 500,
    professionRequired: 'STABLE_MASTER',
    levelRequired: 50,
    baseValue: 1500,
    weight: 1,
  },
];

// ============================================================
// RESOURCE ITEM TEMPLATES (new materials referenced by recipes)
// ============================================================

interface ResourceItemDef {
  name: string;
  type: ItemType;
  description: string;
}

const NEW_RESOURCE_ITEMS: ResourceItemDef[] = [
  { name: 'Gemstones', type: 'MATERIAL', description: 'Rough gemstones of various types waiting to be cut and polished.' },
];

// ============================================================
// HELPER
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

export async function seedAccessoryRecipes(db: any) {
  console.log('--- Seeding Accessory, Enchantment, Housing & Mount Gear ---');

  const templateMap = new Map<string, string>(); // name -> id

  // Pull existing item templates into the map so recipe inputs resolve.
  // When duplicates exist, prefer stable-ID templates (resource-* / crafted-*).
  const existing = await db.select({
    id: schema.itemTemplates.id,
    name: schema.itemTemplates.name,
  }).from(schema.itemTemplates);
  for (const t of existing) {
    const current = templateMap.get(t.name);
    if (!current || t.id.startsWith('resource-') || t.id.startsWith('crafted-')) {
      templateMap.set(t.name, t.id);
    }
  }

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

  // Seed new resource item templates (e.g. Gemstones if not yet present)
  for (const res of NEW_RESOURCE_ITEMS) {
    if (templateMap.has(res.name)) continue;
    const stableId = `resource-${res.name.toLowerCase().replace(/\s+/g, '-')}`;
    const resData = { name: res.name, type: res.type, description: res.description };
    await db.insert(schema.itemTemplates).values({
      id: stableId,
      ...resData,
      rarity: 'COMMON',
      stats: {},
      durability: 100,
      professionRequired: null,
      levelRequired: 1,
    }).onConflictDoUpdate({
      target: schema.itemTemplates.id,
      set: resData,
    });
    templateMap.set(res.name, stableId);
  }

  // Seed all new crafted item templates
  const allTemplates = [
    ...ACCESSORY_ITEM_TEMPLATES,
    ...ENCHANTMENT_ITEM_TEMPLATES,
    ...HOUSING_ITEM_TEMPLATES,
    ...MOUNT_GEAR_ITEM_TEMPLATES,
  ];

  for (const tmpl of allTemplates) {
    const stableId = `crafted-${tmpl.name.toLowerCase().replace(/\s+/g, '-')}`;
    const data = {
      name: tmpl.name,
      type: tmpl.type,
      rarity: tmpl.rarity,
      description: tmpl.description,
      stats: tmpl.stats,
      durability: tmpl.durability,
      professionRequired: tmpl.professionRequired,
      levelRequired: tmpl.levelRequired,
      baseValue: tmpl.baseValue,
      weight: tmpl.weight,
    };
    await db.insert(schema.itemTemplates).values({
      id: stableId,
      ...data,
    }).onConflictDoUpdate({
      target: schema.itemTemplates.id,
      set: data,
    });
    templateMap.set(tmpl.name, stableId);
  }
  console.log(`  Item templates seeded: ${allTemplates.length}`);

  // Seed all recipes
  const allRecipes = [
    ...ACCESSORY_RECIPES,
    ...ENCHANTMENT_RECIPES,
    ...HOUSING_RECIPES,
    ...MOUNT_GEAR_RECIPES,
  ];

  for (const recipe of allRecipes) {
    const ingredients: { itemTemplateId: string; itemName: string; quantity: number }[] = [];
    for (const inp of recipe.inputs) {
      const templateId = ensureTemplate(inp.itemName, recipe.name);
      ingredients.push({ itemTemplateId: templateId, itemName: inp.itemName, quantity: inp.quantity });
    }

    const output = recipe.outputs[0];
    const resultId = ensureTemplate(output.itemName, recipe.name);

    const recipeId = `recipe-${recipe.recipeId}`;
    const tier = levelToTier(recipe.levelRequired);

    const recipeData = {
      name: recipe.name,
      professionType: recipe.professionRequired as ProfessionType,
      tier,
      ingredients,
      result: resultId,
      craftTime: recipe.craftTime,
      xpReward: recipe.xpReward,
      levelRequired: recipe.levelRequired,
    };

    await db.insert(schema.recipes).values({
      id: recipeId,
      ...recipeData,
    }).onConflictDoUpdate({
      target: schema.recipes.id,
      set: recipeData,
    });

    console.log(`  + ${recipe.name} (${recipe.professionRequired} Lvl ${recipe.levelRequired})`);
  }

  console.log(`  Recipes seeded: ${allRecipes.length}`);
  console.log(`  Categories: Accessories (${ACCESSORY_RECIPES.length}), Enchantments (${ENCHANTMENT_RECIPES.length}), Housing (${HOUSING_RECIPES.length}), Mount Gear (${MOUNT_GEAR_RECIPES.length})`);
}
