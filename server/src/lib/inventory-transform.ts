// ---------------------------------------------------------------------------
// Shared inventory transformation (characters.ts uses this in 2 endpoints)
// ---------------------------------------------------------------------------

/** Shape of a single inventory row from Prisma (with item.template + item.craftedBy includes). */
interface InventoryRow {
  quantity: number;
  item: {
    id: string;
    templateId: string;
    currentDurability: number | null;
    quality: string | null;
    craftedById: string | null;
    enchantments: unknown;
    craftedBy?: { id: string; name: string } | null;
    template: {
      id: string;
      name: string;
      type: string;
      rarity: string;
      description: string | null;
      stats: unknown;
      durability: number | null;
    };
  };
}

interface TransformedItem {
  id: string;
  itemId: string;
  templateId: string;
  templateName: string;
  name: string;
  type: string;
  rarity: string;
  description: string | null;
  quantity: number;
  currentDurability: number | null;
  quality: string | null;
  craftedById: string | null;
  craftedByName: string | null;
  enchantments: unknown;
  template?: {
    id: string;
    name: string;
    type: string;
    rarity: string;
    description: string | null;
    stats: unknown;
    durability: number | null;
  };
}

/**
 * Transform Prisma inventory rows into the frontend-friendly shape expected by
 * CraftingPage, MarketPage, and InventoryPage.
 *
 * @param includeTemplate  If true, includes a nested `template` object with
 *                         stats/durability (used by GET /characters/me).
 */
export function transformInventory(
  inventory: InventoryRow[],
  includeTemplate = false,
): TransformedItem[] {
  return inventory.map((inv) => {
    const item: TransformedItem = {
      id: inv.item.id,
      itemId: inv.item.id,
      templateId: inv.item.templateId,
      templateName: inv.item.template.name,
      name: inv.item.template.name,
      type: inv.item.template.type,
      rarity: inv.item.template.rarity,
      description: inv.item.template.description,
      quantity: inv.quantity,
      currentDurability: inv.item.currentDurability,
      quality: inv.item.quality,
      craftedById: inv.item.craftedById,
      craftedByName: inv.item.craftedBy?.name ?? null,
      enchantments: inv.item.enchantments ?? [],
    };

    if (includeTemplate) {
      item.template = {
        id: inv.item.template.id,
        name: inv.item.template.name,
        type: inv.item.template.type,
        rarity: inv.item.template.rarity,
        description: inv.item.template.description,
        stats: inv.item.template.stats,
        durability: inv.item.template.durability,
      };
    }

    return item;
  });
}
