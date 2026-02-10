import { PrismaClient } from '@prisma/client';
import { TOOL_TEMPLATES } from '@shared/data/tools';

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
        },
      });
      created++;
    }
  }

  console.log(`  Seeded ${TOOL_TEMPLATES.length} tool templates (${created} created, ${updated} updated).`);
}
