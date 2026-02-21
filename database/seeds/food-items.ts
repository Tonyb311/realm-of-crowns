/**
 * Food & Beverage Item Template Seed for Realm of Crowns
 *
 * Seeds ~30 food/beverage ItemTemplates for the daily-tick food system.
 * Categories:
 *   - Raw ingredients (6): shortest shelf life, no buffs
 *   - Basic prepared (6): moderate shelf life, no buffs
 *   - Preserved (5): long shelf life, no buffs
 *   - Quality meals (5): moderate shelf life, single stat buff
 *   - Fine cuisine (5): short shelf life, powerful buffs
 *   - Beverages (5): long shelf life, CHA/CON buffs
 *
 * Uses findFirst + update/create since ItemTemplate has no unique name constraint.
 */

import { PrismaClient } from '@prisma/client';

// ============================================================
// FOOD TEMPLATE DEFINITIONS
// ============================================================

interface FoodBuff {
  stat: string;
  value: number;
  penalty_stat?: string;
  penalty_value?: number;
}

interface FoodTemplateDef {
  name: string;
  description: string;
  shelfLifeDays: number;
  isFood: boolean;
  isBeverage: boolean;
  isPerishable: boolean;
  foodBuff: FoodBuff | null;
  rarity: 'COMMON' | 'FINE' | 'SUPERIOR' | 'MASTERWORK';
  baseValue: number;
}

const FOOD_TEMPLATES: FoodTemplateDef[] = [
  // ---- Raw Ingredients ----
  {
    name: 'Raw Fish',
    description: 'Fresh-caught fish. Must be cooked or preserved quickly.',
    shelfLifeDays: 1,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 3,
  },
  {
    name: 'Raw Meat',
    description: 'Uncooked meat from a fresh kill. Spoils quickly.',
    shelfLifeDays: 2,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 5,
  },
  {
    name: 'Fresh Dairy',
    description: 'Milk, cream, or butter. Highly perishable.',
    shelfLifeDays: 2,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 4,
  },
  {
    name: 'Fresh Herbs',
    description: 'Aromatic herbs picked from the wild. Best used quickly.',
    shelfLifeDays: 2,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 5,
  },
  {
    name: 'Fresh Produce',
    description: 'Vegetables and fruits from the garden or market.',
    shelfLifeDays: 3,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 4,
  },
  {
    name: 'Grain Sack',
    description: 'A sack of milled grain. Keeps well in dry storage.',
    shelfLifeDays: 7,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 5,
  },

  // ---- Basic Prepared Foods ----
  {
    name: 'Bread Loaf',
    description: 'A hearty loaf of baked bread. Staple traveler fare.',
    shelfLifeDays: 4,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 20,
  },
  {
    name: 'Porridge',
    description: 'Thick oat porridge. Simple but filling.',
    shelfLifeDays: 3,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 15,
  },
  {
    name: 'Cooked Meat',
    description: 'Seasoned and fire-roasted meat. Satisfying fare.',
    shelfLifeDays: 3,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 12,
  },
  {
    name: 'Stew',
    description: 'A thick stew of meat and vegetables. Warms the belly.',
    shelfLifeDays: 3,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 15,
  },
  {
    name: 'Grilled Fish',
    description: 'Fish grilled over open flame with herbs.',
    shelfLifeDays: 3,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 17,
  },
  {
    name: 'Cheese Wheel',
    description: 'A wheel of aged cheese. Keeps reasonably well.',
    shelfLifeDays: 5,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 10,
  },

  // ---- Preserved Foods ----
  {
    name: 'Jerky',
    description: 'Dried and salted meat. The adventurer\'s standby.',
    shelfLifeDays: 10,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 8,
  },
  {
    name: 'Smoked Fish',
    description: 'Fish preserved by cold smoking. Rich and flavorful.',
    shelfLifeDays: 10,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 10,
  },
  {
    name: 'Salted Provisions',
    description: 'Heavily salted meat and vegetables packed for long journeys.',
    shelfLifeDays: 12,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 12,
  },
  {
    name: 'Pickled Vegetables',
    description: 'Vegetables preserved in vinegar brine. Tart but nutritious.',
    shelfLifeDays: 14,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 8,
  },
  {
    name: 'Hardtack',
    description: 'Dense, dry biscuit that lasts nearly forever. Tastes like it too.',
    shelfLifeDays: 14,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: null,
    rarity: 'COMMON',
    baseValue: 5,
  },

  // ---- Quality Meals (with buffs) ----
  {
    name: 'Hearty Stew',
    description: 'A rich, meaty stew that strengthens the body.',
    shelfLifeDays: 3,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: { stat: 'STR', value: 1 },
    rarity: 'FINE',
    baseValue: 25,
  },
  {
    name: "Fisherman's Feast",
    description: 'An elaborate fish dish that sharpens reflexes.',
    shelfLifeDays: 3,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: { stat: 'DEX', value: 1 },
    rarity: 'FINE',
    baseValue: 35,
  },
  {
    name: 'Herbalist Salad',
    description: 'A salad of rare wild herbs that clears the mind.',
    shelfLifeDays: 2,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: { stat: 'WIS', value: 1 },
    rarity: 'FINE',
    baseValue: 20,
  },
  {
    name: "Miner's Pie",
    description: 'A dense meat pie favored by miners. Improves gathering yield.',
    shelfLifeDays: 3,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: { stat: 'gather_bonus', value: 0.05 },
    rarity: 'FINE',
    baseValue: 30,
  },
  {
    name: "Scholar's Broth",
    description: 'A delicate broth of rare ingredients that aids focus.',
    shelfLifeDays: 2,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: { stat: 'craft_bonus', value: 0.05 },
    rarity: 'FINE',
    baseValue: 25,
  },

  // ---- Fine Cuisine (powerful buffs) ----
  {
    name: 'Royal Feast',
    description: 'A magnificent spread fit for royalty. Empowers a chosen attribute.',
    shelfLifeDays: 2,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: { stat: 'chosen', value: 2 },
    rarity: 'SUPERIOR',
    baseValue: 60,
  },
  {
    name: "Warrior's Banquet",
    description: 'A protein-rich meal designed for combat readiness.',
    shelfLifeDays: 2,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: { stat: 'combat_damage', value: 0.10 },
    rarity: 'SUPERIOR',
    baseValue: 50,
  },
  {
    name: "Artisan's Delight",
    description: 'A carefully crafted meal that inspires artisanal excellence.',
    shelfLifeDays: 2,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: { stat: 'craft_quality', value: 0.10 },
    rarity: 'SUPERIOR',
    baseValue: 45,
  },
  {
    name: "Explorer's Rations",
    description: 'Magically preserved rations that bolster all attributes.',
    shelfLifeDays: 7,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: { stat: 'all', value: 1 },
    rarity: 'SUPERIOR',
    baseValue: 40,
  },
  {
    name: 'Elixir-Infused Meal',
    description: 'A meal infused with alchemical elixirs. Greatly enhances professional output.',
    shelfLifeDays: 2,
    isFood: true,
    isBeverage: false,
    isPerishable: true,
    foodBuff: { stat: 'profession_bonus', value: 0.15 },
    rarity: 'MASTERWORK',
    baseValue: 80,
  },

  // ---- Beverages ----
  {
    name: 'Ale',
    description: 'A frothy tankard of ale. Loosens the tongue and lifts spirits.',
    shelfLifeDays: 14,
    isFood: false,
    isBeverage: true,
    isPerishable: true,
    foodBuff: { stat: 'CHA', value: 1 },
    rarity: 'COMMON',
    baseValue: 6,
  },
  {
    name: 'Wine',
    description: 'A bottle of fine wine. Improves social graces.',
    shelfLifeDays: 30,
    isFood: false,
    isBeverage: true,
    isPerishable: true,
    foodBuff: { stat: 'CHA', value: 1 },
    rarity: 'FINE',
    baseValue: 15,
  },
  {
    name: 'Mead',
    description: 'Honey wine brewed by traditional methods. Fortifies constitution.',
    shelfLifeDays: 21,
    isFood: false,
    isBeverage: true,
    isPerishable: true,
    foodBuff: { stat: 'CON', value: 1 },
    rarity: 'COMMON',
    baseValue: 8,
  },
  {
    name: 'Spirits',
    description: 'Strong distilled spirits. Powerful social lubricant with side effects.',
    shelfLifeDays: 60,
    isFood: false,
    isBeverage: true,
    isPerishable: false,
    foodBuff: { stat: 'CHA', value: 2, penalty_stat: 'WIS', penalty_value: -1 },
    rarity: 'FINE',
    baseValue: 18,
  },
  {
    name: 'Healing Draught',
    description: 'A restorative tonic brewed with medicinal herbs. Aids recovery.',
    shelfLifeDays: 7,
    isFood: false,
    isBeverage: true,
    isPerishable: true,
    foodBuff: { stat: 'hp_recovery', value: 0.10 },
    rarity: 'FINE',
    baseValue: 25,
  },
];

// ============================================================
// SOUL ESSENCE TEMPLATE DEFINITIONS (Revenant Sustenance)
// ============================================================

interface SoulEssenceTemplateDef {
  name: string;
  description: string;
  isPerishable: false;
  rarity: 'COMMON' | 'FINE' | 'SUPERIOR' | 'MASTERWORK';
  baseValue: number;
}

const SOUL_ESSENCE_TEMPLATES: SoulEssenceTemplateDef[] = [
  {
    name: 'Soul Essence',
    description: 'A shimmering vial of distilled spiritual energy. Revenants consume this to anchor their consciousness to the mortal plane.',
    isPerishable: false,
    rarity: 'COMMON',
    baseValue: 15,
  },
  {
    name: 'Refined Soul Essence',
    description: 'A concentrated vial of spiritual energy, refined through advanced alchemy. Sustains a Revenant\'s form for longer.',
    isPerishable: false,
    rarity: 'FINE',
    baseValue: 40,
  },
];

// ============================================================
// MAINTENANCE KIT TEMPLATE DEFINITIONS (Forgeborn Sustenance)
// ============================================================

const MAINTENANCE_KIT_TEMPLATES: SoulEssenceTemplateDef[] = [
  {
    name: 'Maintenance Kit',
    description: 'A carefully assembled kit of oils, replacement cogs, and calibration tools. Forgeborn require regular maintenance to keep their mechanical bodies functioning.',
    isPerishable: false,
    rarity: 'COMMON',
    baseValue: 20,
  },
  {
    name: 'Precision Maintenance Kit',
    description: "A masterfully engineered kit with arcane-infused lubricants and precision-machined components. Sustains a Forgeborn's systems for an extended period.",
    isPerishable: false,
    rarity: 'FINE',
    baseValue: 50,
  },
];

// ============================================================
// SEED FUNCTION
// ============================================================

export async function seedFoodItems(prisma: PrismaClient) {
  console.log('  Seeding food & beverage item templates...');

  let created = 0;
  let updated = 0;

  for (const food of FOOD_TEMPLATES) {
    // Use name + type as the natural key for upserting
    const existing = await prisma.itemTemplate.findFirst({
      where: { name: food.name, type: 'CONSUMABLE' },
    });

    const stats = food.foodBuff
      ? { foodBuff: { stat: food.foodBuff.stat, value: food.foodBuff.value } }
      : {};

    const data = {
      rarity: food.rarity as any,
      description: food.description,
      stats,
      durability: 1,
      shelfLifeDays: food.shelfLifeDays,
      isFood: food.isFood,
      foodBuff: food.foodBuff as any,
      isPerishable: food.isPerishable,
      isBeverage: food.isBeverage,
      baseValue: food.baseValue,
    };

    if (existing) {
      await prisma.itemTemplate.update({
        where: { id: existing.id },
        data,
      });
      updated++;
    } else {
      await prisma.itemTemplate.create({
        data: {
          name: food.name,
          type: 'CONSUMABLE',
          ...data,
        },
      });
      created++;
    }
  }

  console.log(`  Seeded ${FOOD_TEMPLATES.length} food/beverage templates (${created} created, ${updated} updated).`);

  // Seed Soul Essence templates
  let seCreated = 0;
  let seUpdated = 0;

  for (const se of SOUL_ESSENCE_TEMPLATES) {
    const existing = await prisma.itemTemplate.findFirst({ where: { name: se.name } });
    if (existing) {
      await prisma.itemTemplate.update({
        where: { id: existing.id },
        data: {
          description: se.description,
          type: 'CONSUMABLE',
          rarity: se.rarity,
          isPerishable: se.isPerishable,
          isFood: false,
          isBeverage: false,
          baseValue: se.baseValue,
        },
      });
      seUpdated++;
    } else {
      await prisma.itemTemplate.create({
        data: {
          name: se.name,
          description: se.description,
          type: 'CONSUMABLE',
          rarity: se.rarity,
          isPerishable: se.isPerishable,
          isFood: false,
          isBeverage: false,
          baseValue: se.baseValue,
        },
      });
      seCreated++;
    }
  }

  console.log(`  Seeded ${SOUL_ESSENCE_TEMPLATES.length} soul essence templates (${seCreated} created, ${seUpdated} updated).`);

  // Seed Maintenance Kit templates
  let mkCreated = 0;
  let mkUpdated = 0;

  for (const mk of MAINTENANCE_KIT_TEMPLATES) {
    const existing = await prisma.itemTemplate.findFirst({ where: { name: mk.name } });
    if (existing) {
      await prisma.itemTemplate.update({
        where: { id: existing.id },
        data: {
          description: mk.description,
          type: 'CONSUMABLE',
          rarity: mk.rarity,
          isPerishable: mk.isPerishable,
          isFood: false,
          isBeverage: false,
          baseValue: mk.baseValue,
        },
      });
      mkUpdated++;
    } else {
      await prisma.itemTemplate.create({
        data: {
          name: mk.name,
          description: mk.description,
          type: 'CONSUMABLE',
          rarity: mk.rarity,
          isPerishable: mk.isPerishable,
          isFood: false,
          isBeverage: false,
          baseValue: mk.baseValue,
        },
      });
      mkCreated++;
    }
  }

  console.log(`  Seeded ${MAINTENANCE_KIT_TEMPLATES.length} maintenance kit templates (${mkCreated} created, ${mkUpdated} updated).`);
}
