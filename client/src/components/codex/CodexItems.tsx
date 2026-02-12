import { useMemo, useState } from 'react';
import { ITEMS } from '@shared/data/items/item-names';
import {
  ALL_PROCESSING_RECIPES,
  ALL_FINISHED_GOODS_RECIPES,
  ALL_CONSUMABLE_RECIPES,
  ALL_ACCESSORY_RECIPES,
} from '@shared/data/recipes';
import type { RecipeDefinition, FinishedGoodsRecipe, ConsumableRecipe } from '@shared/data/recipes/types';
import { RealmCard } from '../ui/RealmCard';
import { RealmBadge } from '../ui/RealmBadge';

interface CodexItemsProps {
  searchQuery: string;
}

type CategoryName =
  | 'Gathered Resources'
  | 'Processed Materials'
  | 'Weapons'
  | 'Armor'
  | 'Consumables'
  | 'Accessories & Misc'
  | 'Raw Materials';

const CATEGORY_ORDER: CategoryName[] = [
  'Gathered Resources',
  'Processed Materials',
  'Weapons',
  'Armor',
  'Consumables',
  'Accessories & Misc',
  'Raw Materials',
];

const CATEGORY_ICONS: Record<CategoryName, string> = {
  'Gathered Resources': '\u{1F33E}',
  'Processed Materials': '\u{2699}',
  'Weapons': '\u{2694}',
  'Armor': '\u{1F6E1}',
  'Consumables': '\u{1F9EA}',
  'Accessories & Misc': '\u{1F48D}',
  'Raw Materials': '\u{1FAA8}',
};

interface RecipeReference {
  recipeId: string;
  name: string;
  profession: string;
  role: 'input' | 'output';
}

export default function CodexItems({ searchQuery }: CodexItemsProps) {
  const [activeCategory, setActiveCategory] = useState<'All' | CategoryName>('All');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Build categorized item lists and recipe lookup maps
  const { categories, recipesByItem } = useMemo(() => {
    const allItemNames = Object.values(ITEMS);

    const gatheringItems = new Set([
      'Apples', 'Raw Fish', 'Wild Berries', 'Wild Herbs',
      'Iron Ore Chunks', 'Wood Logs', 'Stone Blocks', 'Clay',
    ]);

    // Collect processing recipe outputs
    const processingOutputs = new Set<string>();
    for (const r of (ALL_PROCESSING_RECIPES || [])) {
      for (const o of (r.outputs || [])) {
        processingOutputs.add(o.itemName);
      }
    }

    // Collect weapon and armor outputs from finished goods
    const weaponOutputs = new Set<string>();
    const armorOutputs = new Set<string>();
    for (const r of (ALL_FINISHED_GOODS_RECIPES || [])) {
      for (const o of (r.outputs || [])) {
        if (r.outputItemType === 'WEAPON') weaponOutputs.add(o.itemName);
        else if (r.outputItemType === 'ARMOR') armorOutputs.add(o.itemName);
      }
    }

    // Collect consumable outputs
    const consumableOutputs = new Set<string>();
    for (const r of (ALL_CONSUMABLE_RECIPES || [])) {
      if (r.output) consumableOutputs.add(r.output.itemName);
    }

    // Collect accessory outputs
    const accessoryOutputs = new Set<string>();
    for (const r of (ALL_ACCESSORY_RECIPES || [])) {
      for (const o of (r.outputs || [])) {
        accessoryOutputs.add(o.itemName);
      }
    }

    // Categorize each item
    const cats: Record<CategoryName, string[]> = {
      'Gathered Resources': [],
      'Processed Materials': [],
      'Weapons': [],
      'Armor': [],
      'Consumables': [],
      'Accessories & Misc': [],
      'Raw Materials': [],
    };

    const assigned = new Set<string>();
    for (const name of allItemNames) {
      if (gatheringItems.has(name)) {
        cats['Gathered Resources'].push(name);
        assigned.add(name);
      } else if (weaponOutputs.has(name)) {
        cats['Weapons'].push(name);
        assigned.add(name);
      } else if (armorOutputs.has(name)) {
        cats['Armor'].push(name);
        assigned.add(name);
      } else if (consumableOutputs.has(name)) {
        cats['Consumables'].push(name);
        assigned.add(name);
      } else if (accessoryOutputs.has(name)) {
        cats['Accessories & Misc'].push(name);
        assigned.add(name);
      } else if (processingOutputs.has(name)) {
        cats['Processed Materials'].push(name);
        assigned.add(name);
      }
    }
    // Everything else -> Raw Materials
    for (const name of allItemNames) {
      if (!assigned.has(name)) {
        cats['Raw Materials'].push(name);
      }
    }

    // Sort each category alphabetically
    for (const key of CATEGORY_ORDER) {
      cats[key].sort((a, b) => a.localeCompare(b));
    }

    // Build recipe references for each item (used-in / produced-by)
    const refs = new Map<string, RecipeReference[]>();

    const addRef = (itemName: string, ref: RecipeReference) => {
      const list = refs.get(itemName) ?? [];
      list.push(ref);
      refs.set(itemName, list);
    };

    // Processing recipes (RecipeDefinition)
    for (const r of (ALL_PROCESSING_RECIPES || [])) {
      for (const inp of (r.inputs || [])) {
        addRef(inp.itemName, { recipeId: r.recipeId, name: r.name, profession: r.professionRequired, role: 'input' });
      }
      for (const out of (r.outputs || [])) {
        addRef(out.itemName, { recipeId: r.recipeId, name: r.name, profession: r.professionRequired, role: 'output' });
      }
    }

    // Finished goods recipes (FinishedGoodsRecipe)
    for (const r of (ALL_FINISHED_GOODS_RECIPES || [])) {
      for (const inp of (r.inputs || [])) {
        addRef(inp.itemName, { recipeId: r.recipeId, name: r.name, profession: r.professionRequired, role: 'input' });
      }
      for (const out of (r.outputs || [])) {
        addRef(out.itemName, { recipeId: r.recipeId, name: r.name, profession: r.professionRequired, role: 'output' });
      }
    }

    // Consumable recipes (ConsumableRecipe -- single output)
    for (const r of (ALL_CONSUMABLE_RECIPES || [])) {
      for (const inp of (r.inputs || [])) {
        addRef(inp.itemName, { recipeId: r.recipeId, name: r.name, profession: r.professionRequired, role: 'input' });
      }
      if (r.output) {
        addRef(r.output.itemName, { recipeId: r.recipeId, name: r.name, profession: r.professionRequired, role: 'output' });
      }
    }

    // Accessory recipes (RecipeDefinition)
    for (const r of (ALL_ACCESSORY_RECIPES || [])) {
      for (const inp of (r.inputs || [])) {
        addRef(inp.itemName, { recipeId: r.recipeId, name: r.name, profession: r.professionRequired, role: 'input' });
      }
      for (const out of (r.outputs || [])) {
        addRef(out.itemName, { recipeId: r.recipeId, name: r.name, profession: r.professionRequired, role: 'output' });
      }
    }

    return { categories: cats, recipesByItem: refs };
  }, []);

  // Determine which category an item belongs to
  const getCategoryForItem = (itemName: string): CategoryName => {
    for (const cat of CATEGORY_ORDER) {
      if ((categories[cat] || []).includes(itemName)) return cat;
    }
    return 'Raw Materials';
  };

  // Filter items by search query
  const filteredCategories = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase();
    const result: Record<CategoryName, string[]> = {
      'Gathered Resources': [],
      'Processed Materials': [],
      'Weapons': [],
      'Armor': [],
      'Consumables': [],
      'Accessories & Misc': [],
      'Raw Materials': [],
    };

    for (const cat of CATEGORY_ORDER) {
      result[cat] = (categories[cat] || []).filter((name) =>
        name.toLowerCase().includes(query)
      );
    }

    return result;
  }, [categories, searchQuery]);

  // Compute total counts
  const totalItemCount = Object.values(ITEMS).length;
  const filteredTotalCount = CATEGORY_ORDER.reduce(
    (sum, cat) => sum + (filteredCategories[cat]?.length ?? 0),
    0
  );

  // Categories to display
  const displayCategories =
    activeCategory === 'All'
      ? CATEGORY_ORDER
      : [activeCategory];

  const handleItemClick = (itemName: string) => {
    setExpandedItem((prev) => (prev === itemName ? null : itemName));
  };

  const formatProfession = (profession: string): string => {
    return profession
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header with total count */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-realm-text-primary">
          Items Encyclopedia
        </h2>
        <span className="text-sm text-realm-text-muted">
          {filteredTotalCount === totalItemCount
            ? `${totalItemCount} items`
            : `${filteredTotalCount} of ${totalItemCount} items`}
        </span>
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('All')}
          className={`px-3 py-1.5 rounded text-sm font-body transition-colors ${
            activeCategory === 'All'
              ? 'bg-realm-gold-400/20 text-realm-gold-400 border border-realm-gold-400/40'
              : 'bg-realm-bg-700 text-realm-text-secondary border border-realm-border hover:border-realm-border-strong hover:text-realm-text-primary'
          }`}
        >
          All ({filteredTotalCount})
        </button>
        {CATEGORY_ORDER.map((cat) => {
          const count = filteredCategories[cat]?.length ?? 0;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded text-sm font-body transition-colors ${
                activeCategory === cat
                  ? 'bg-realm-gold-400/20 text-realm-gold-400 border border-realm-gold-400/40'
                  : 'bg-realm-bg-700 text-realm-text-secondary border border-realm-border hover:border-realm-border-strong hover:text-realm-text-primary'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Item grid by category */}
      {filteredTotalCount === 0 ? (
        <div className="text-center py-12">
          <p className="text-realm-text-muted text-lg font-body">
            No items match your search.
          </p>
          <p className="text-realm-text-muted/60 text-sm mt-2 font-body">
            Try a different search term or clear the filter.
          </p>
        </div>
      ) : (
        displayCategories.map((cat) => {
          const items = filteredCategories[cat] ?? [];
          if (items.length === 0) return null;

          return (
            <div key={cat} className="space-y-3">
              {/* Category header */}
              <div className="flex items-center gap-2 border-b border-realm-border pb-2">
                <span className="text-lg" role="img" aria-label={cat}>
                  {CATEGORY_ICONS[cat]}
                </span>
                <h3 className="font-display text-lg text-realm-text-primary">
                  {cat}
                </h3>
                <span className="text-sm text-realm-text-muted ml-auto">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Items grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {items.map((itemName) => {
                  const isExpanded = expandedItem === itemName;
                  const refs = recipesByItem.get(itemName) ?? [];
                  const producedBy = refs.filter((r) => r.role === 'output');
                  const usedIn = refs.filter((r) => r.role === 'input');

                  return (
                    <RealmCard
                      key={itemName}
                      onClick={() => handleItemClick(itemName)}
                      selected={isExpanded}
                      className={`flex flex-col min-h-[100px] ${isExpanded ? 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4' : ''}`}
                    >
                      {/* Item name and category badge */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-display text-sm text-realm-text-primary leading-tight">
                          {itemName}
                        </h4>
                        {!isExpanded && (
                          <RealmBadge variant="default" className="shrink-0 text-[10px]">
                            {getCategoryForItem(itemName)}
                          </RealmBadge>
                        )}
                      </div>

                      {/* Recipe connection summary (collapsed) — flex-grow fills space */}
                      {!isExpanded && (
                        <p className="text-xs text-realm-text-muted font-body truncate mt-2 flex-grow">
                          {producedBy.length > 0 && (
                            <span>
                              Crafted by {formatProfession(producedBy[0].profession)}
                              {producedBy.length > 1 ? ` +${producedBy.length - 1}` : ''}
                            </span>
                          )}
                          {producedBy.length > 0 && usedIn.length > 0 && ' \u00B7 '}
                          {usedIn.length > 0 && (
                            <span>Used in {usedIn.length} {usedIn.length === 1 ? 'recipe' : 'recipes'}</span>
                          )}
                        </p>
                      )}

                      {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-3 space-y-4 border-t border-realm-border pt-3">
                            {/* Category */}
                            <div>
                              <span className="text-xs uppercase tracking-wider text-realm-text-muted font-display">
                                Category
                              </span>
                              <div className="mt-1">
                                <RealmBadge variant="default">
                                  {getCategoryForItem(itemName)}
                                </RealmBadge>
                              </div>
                            </div>

                            {/* Produced by (OUTPUT recipes) */}
                            <div>
                              <span className="text-xs uppercase tracking-wider text-realm-text-muted font-display">
                                Produced By
                              </span>
                              {producedBy.length === 0 ? (
                                <p className="text-sm text-realm-text-muted/60 mt-1 font-body">
                                  Not produced by any known recipe (gathered or dropped).
                                </p>
                              ) : (
                                <div className="mt-1 space-y-1">
                                  {producedBy.map((ref) => (
                                    <div
                                      key={ref.recipeId}
                                      className="flex items-center gap-2 bg-realm-bg-800 rounded px-3 py-1.5"
                                    >
                                      <span className="text-sm text-realm-text-primary font-body">
                                        {ref.name}
                                      </span>
                                      <RealmBadge variant="uncommon" className="text-[10px]">
                                        {formatProfession(ref.profession)}
                                      </RealmBadge>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Used in (INPUT recipes) */}
                            <div>
                              <span className="text-xs uppercase tracking-wider text-realm-text-muted font-display">
                                Used In
                              </span>
                              {usedIn.length === 0 ? (
                                <p className="text-sm text-realm-text-muted/60 mt-1 font-body">
                                  Not used as an ingredient in any known recipe.
                                </p>
                              ) : (
                                <div className="mt-1 space-y-1">
                                  {usedIn.map((ref) => (
                                    <div
                                      key={ref.recipeId}
                                      className="flex items-center gap-2 bg-realm-bg-800 rounded px-3 py-1.5"
                                    >
                                      <span className="text-sm text-realm-text-primary font-body">
                                        {ref.name}
                                      </span>
                                      <RealmBadge variant="rare" className="text-[10px]">
                                        {formatProfession(ref.profession)}
                                      </RealmBadge>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                    </RealmCard>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
