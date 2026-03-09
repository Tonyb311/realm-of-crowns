// ---------------------------------------------------------------------------
// Shared inventory transformation (characters.ts uses this in 2 endpoints)
// ---------------------------------------------------------------------------

/** Shape of a single inventory row (Drizzle relation names: itemTemplate + character_craftedById). */
interface InventoryRow {
  quantity: number;
  item: {
    id: string;
    templateId: string;
    currentDurability: number | null;
    quality: string | null;
    craftedById: string | null;
    enchantments: unknown;
    character_craftedById?: { id: string; name: string } | null;
    itemTemplate: {
      id: string;
      name: string;
      type: string;
      rarity: string;
      description: string | null;
      weight: number | null;
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
  weight?: number;
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
    weight?: number;
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
      templateName: inv.item.itemTemplate.name,
      name: inv.item.itemTemplate.name,
      type: inv.item.itemTemplate.type,
      rarity: inv.item.itemTemplate.rarity,
      description: inv.item.itemTemplate.description,
      weight: inv.item.itemTemplate.weight ?? 0,
      quantity: inv.quantity,
      currentDurability: inv.item.currentDurability,
      quality: inv.item.quality,
      craftedById: inv.item.craftedById,
      craftedByName: inv.item.character_craftedById?.name ?? null,
      enchantments: inv.item.enchantments ?? [],
    };

    if (includeTemplate) {
      item.template = {
        id: inv.item.itemTemplate.id,
        name: inv.item.itemTemplate.name,
        type: inv.item.itemTemplate.type,
        rarity: inv.item.itemTemplate.rarity,
        description: inv.item.itemTemplate.description,
        weight: inv.item.itemTemplate.weight ?? undefined,
        stats: inv.item.itemTemplate.stats,
        durability: inv.item.itemTemplate.durability,
      };
    }

    return item;
  });
}
