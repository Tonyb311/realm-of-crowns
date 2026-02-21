import { PrismaClient } from '@prisma/client';
import { TOOL_TEMPLATES } from '@shared/data/tools';

// Base values for tools — estimated from tier material costs
const TOOL_BASE_VALUES: Record<string, number> = {
  // Gathering tools by material tier
  // Copper tier
  'Copper Pickaxe': 20, 'Copper Axe': 20, 'Copper Sickle': 20,
  'Copper Fishing Rod': 15, 'Copper Herb Knife': 15, 'Copper Skinning Knife': 15,
  // Iron tier
  'Iron Pickaxe': 18, 'Iron Axe': 50, 'Iron Sickle': 50,
  'Iron Fishing Rod': 40, 'Iron Herb Knife': 40, 'Iron Skinning Knife': 40,
  // Steel tier
  'Steel Pickaxe': 38, 'Steel Axe': 120, 'Steel Sickle': 120,
  'Steel Fishing Rod': 100, 'Steel Herb Knife': 100, 'Steel Skinning Knife': 100,
  // Mithril tier
  'Mithril Pickaxe': 400, 'Mithril Axe': 400, 'Mithril Sickle': 400,
  'Mithril Fishing Rod': 350, 'Mithril Herb Knife': 350, 'Mithril Skinning Knife': 350,
  // Adamantine tier
  'Adamantine Pickaxe': 1500, 'Adamantine Axe': 1500, 'Adamantine Sickle': 1500,
  'Adamantine Fishing Rod': 1200, 'Adamantine Herb Knife': 1200, 'Adamantine Skinning Knife': 1200,
};

export async function seedTools(prisma: PrismaClient) {
  console.log('  Seeding tools...');

  let created = 0;
  let updated = 0;

  for (const tool of TOOL_TEMPLATES) {
    const stats = {
      speedBonus: tool.speedBonus,
      yieldBonus: tool.yieldBonus,
      toolType: tool.toolType,
      tier: tool.tier,
      professionType: tool.professionType,
    };

    // Use name + type as the natural key for upserting
    const existing = await prisma.itemTemplate.findFirst({
      where: { name: tool.name, type: 'TOOL' },
    });

    const baseValue = TOOL_BASE_VALUES[tool.name] ?? 0;

    if (existing) {
      await prisma.itemTemplate.update({
        where: { id: existing.id },
        data: {
          rarity: tool.rarity as any,
          description: tool.description,
          durability: tool.durability,
          stats,
          professionRequired: tool.professionType as any,
          levelRequired: 1,
          baseValue,
        },
      });
      updated++;
    } else {
      await prisma.itemTemplate.create({
        data: {
          name: tool.name,
          type: 'TOOL',
          rarity: tool.rarity as any,
          description: tool.description,
          durability: tool.durability,
          stats,
          professionRequired: tool.professionType as any,
          levelRequired: 1,
          baseValue,
        },
      });
      created++;
    }
  }

  console.log(`  Seeded ${TOOL_TEMPLATES.length} tool templates (${created} created, ${updated} updated).`);
}
