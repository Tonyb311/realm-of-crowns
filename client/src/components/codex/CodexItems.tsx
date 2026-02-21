import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RealmCard } from '../ui/RealmCard';
import { RealmBadge } from '../ui/RealmBadge';
import api from '../../services/api';

interface CodexItemsProps {
  searchQuery: string;
}

// ---------------------------------------------------------------------------
// Types (match API response shape)
// ---------------------------------------------------------------------------

interface ItemTemplate {
  id: string;
  name: string;
  type: string;
  rarity: string;
  description: string | null;
  stats: any;
  durability: number | null;
  baseValue: number | null;
  professionRequired: string | null;
  levelRequired: number | null;
}

interface RecipeEntry {
  id: string;
  name: string;
  professionType: string;
  tier: string;
  ingredients: any;
  result: string;
  craftTime: number;
  xpReward: number;
  specialization: string | null;
  levelRequired: number | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_ORDER = ['WEAPON', 'ARMOR', 'CONSUMABLE', 'TOOL', 'MATERIAL', 'ACCESSORY', 'HOUSING', 'RESOURCE'];

const TYPE_LABELS: Record<string, string> = {
  WEAPON: 'Weapons',
  ARMOR: 'Armor',
  CONSUMABLE: 'Consumables',
  TOOL: 'Tools',
  MATERIAL: 'Materials',
  ACCESSORY: 'Accessories',
  HOUSING: 'Housing',
  RESOURCE: 'Resources',
};

const RARITY_COLORS: Record<string, string> = {
  POOR: 'text-realm-text-muted',
  COMMON: 'text-realm-text-secondary',
  FINE: 'text-realm-success',
  SUPERIOR: 'text-realm-teal-300',
  MASTERWORK: 'text-realm-purple-300',
  LEGENDARY: 'text-realm-gold-400',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatProfession(profession: string): string {
  return profession
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function formatRarity(rarity: string): string {
  return rarity.charAt(0) + rarity.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CodexItems({ searchQuery }: CodexItemsProps) {
  const [activeType, setActiveType] = useState<'All' | string>('All');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const { data: itemsData, isLoading: itemsLoading } = useQuery<{ items: ItemTemplate[]; total: number }>({
    queryKey: ['codex', 'items'],
    queryFn: async () => (await api.get('/codex/items')).data,
    staleTime: 5 * 60 * 1000,
  });

  const { data: recipesData } = useQuery<{ recipes: RecipeEntry[]; total: number }>({
    queryKey: ['codex', 'recipes'],
    queryFn: async () => (await api.get('/codex/recipes')).data,
    staleTime: 5 * 60 * 1000,
  });

  const items = itemsData?.items ?? [];
  const recipes = recipesData?.recipes ?? [];

  // Build recipe cross-references (what produces/uses each item)
  const { recipesByItem } = useMemo(() => {
    const refs = new Map<string, { name: string; profession: string; role: 'input' | 'output' }[]>();

    const addRef = (itemName: string, ref: { name: string; profession: string; role: 'input' | 'output' }) => {
      const list = refs.get(itemName) ?? [];
      list.push(ref);
      refs.set(itemName, list);
    };

    for (const r of recipes) {
      const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
      for (const inp of ingredients) {
        if (inp.itemName) {
          addRef(inp.itemName, { name: r.name, profession: r.professionType, role: 'input' });
        }
      }
      if (r.result) {
        addRef(r.result, { name: r.name, profession: r.professionType, role: 'output' });
      }
    }

    return { recipesByItem: refs };
  }, [recipes]);

  // Group items by type
  const itemsByType = useMemo(() => {
    const grouped = new Map<string, ItemTemplate[]>();
    for (const item of items) {
      const list = grouped.get(item.type) ?? [];
      list.push(item);
      grouped.set(item.type, list);
    }
    return grouped;
  }, [items]);

  // Filter by search query
  const filteredItemsByType = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase();
    const result = new Map<string, ItemTemplate[]>();

    for (const [type, typeItems] of itemsByType) {
      const filtered = typeItems.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.description || '').toLowerCase().includes(query)
      );
      if (filtered.length > 0) {
        result.set(type, filtered);
      }
    }

    return result;
  }, [itemsByType, searchQuery]);

  // Compute counts
  const totalCount = items.length;
  const filteredCount = Array.from(filteredItemsByType.values()).reduce((sum, arr) => sum + arr.length, 0);

  // Types to display
  const displayTypes = activeType === 'All'
    ? TYPE_ORDER.filter(t => filteredItemsByType.has(t))
    : filteredItemsByType.has(activeType) ? [activeType] : [];

  const handleItemClick = (itemId: string) => {
    setExpandedItem((prev) => (prev === itemId ? null : itemId));
  };

  if (itemsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-realm-text-muted">
          <div className="w-5 h-5 border-2 border-realm-gold-400/50 border-t-realm-gold-400 rounded-full animate-spin" />
          <span className="font-body text-sm">Loading items...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with total count */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-realm-text-primary">
          Items Encyclopedia
        </h2>
        <span className="text-sm text-realm-text-muted">
          {filteredCount === totalCount
            ? `${totalCount} items`
            : `${filteredCount} of ${totalCount} items`}
        </span>
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveType('All')}
          className={`px-3 py-1.5 rounded text-sm font-body transition-colors ${
            activeType === 'All'
              ? 'bg-realm-gold-400/20 text-realm-gold-400 border border-realm-gold-400/40'
              : 'bg-realm-bg-700 text-realm-text-secondary border border-realm-border hover:border-realm-border-strong hover:text-realm-text-primary'
          }`}
        >
          All ({filteredCount})
        </button>
        {TYPE_ORDER.map((type) => {
          const count = filteredItemsByType.get(type)?.length ?? 0;
          if (count === 0 && !itemsByType.has(type)) return null;
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-3 py-1.5 rounded text-sm font-body transition-colors ${
                activeType === type
                  ? 'bg-realm-gold-400/20 text-realm-gold-400 border border-realm-gold-400/40'
                  : 'bg-realm-bg-700 text-realm-text-secondary border border-realm-border hover:border-realm-border-strong hover:text-realm-text-primary'
              }`}
            >
              {TYPE_LABELS[type] || type} ({count})
            </button>
          );
        })}
      </div>

      {/* Items grid by type */}
      {filteredCount === 0 ? (
        <div className="text-center py-12">
          <p className="text-realm-text-muted text-lg font-body">
            No items match your search.
          </p>
          <p className="text-realm-text-muted/60 text-sm mt-2 font-body">
            Try a different search term or clear the filter.
          </p>
        </div>
      ) : (
        displayTypes.map((type) => {
          const typeItems = filteredItemsByType.get(type) ?? [];
          if (typeItems.length === 0) return null;

          return (
            <div key={type} className="space-y-3">
              {/* Type header */}
              <div className="flex items-center gap-2 border-b border-realm-border pb-2">
                <h3 className="font-display text-lg text-realm-text-primary">
                  {TYPE_LABELS[type] || type}
                </h3>
                <span className="text-sm text-realm-text-muted ml-auto">
                  {typeItems.length} {typeItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Items grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {typeItems.map((item) => {
                  const isExpanded = expandedItem === item.id;
                  const refs = recipesByItem.get(item.name) ?? [];
                  const producedBy = refs.filter((r) => r.role === 'output');
                  const usedIn = refs.filter((r) => r.role === 'input');

                  return (
                    <RealmCard
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      selected={isExpanded}
                      className={`flex flex-col min-h-[100px] ${isExpanded ? 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4' : ''}`}
                    >
                      {/* Item name and rarity */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`font-display text-sm leading-tight ${RARITY_COLORS[item.rarity] || 'text-realm-text-primary'}`}>
                          {item.name}
                        </h4>
                        {!isExpanded && (
                          <RealmBadge variant="default" className="shrink-0 text-[10px]">
                            {formatRarity(item.rarity)}
                          </RealmBadge>
                        )}
                      </div>

                      {/* Recipe connection summary (collapsed) */}
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
                          {/* Rarity & Type */}
                          <div className="flex flex-wrap gap-2">
                            <RealmBadge variant="default">{formatRarity(item.rarity)}</RealmBadge>
                            <RealmBadge variant="default">{TYPE_LABELS[item.type] || item.type}</RealmBadge>
                            {item.professionRequired && (
                              <RealmBadge variant="rare">{formatProfession(item.professionRequired)}</RealmBadge>
                            )}
                          </div>

                          {/* Description */}
                          {item.description && (
                            <p className="text-sm text-realm-text-secondary font-body">{item.description}</p>
                          )}

                          {/* Stats */}
                          <div className="flex flex-wrap gap-4 text-xs text-realm-text-muted">
                            {item.baseValue != null && item.baseValue > 0 && <span>Value: {item.baseValue}g</span>}
                            {item.durability != null && <span>Durability: {item.durability}</span>}
                            {item.levelRequired != null && item.levelRequired > 1 && <span>Lv. {item.levelRequired}</span>}
                          </div>

                          {/* Produced by */}
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
                                {producedBy.map((ref, i) => (
                                  <div
                                    key={i}
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

                          {/* Used in */}
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
                                {usedIn.map((ref, i) => (
                                  <div
                                    key={i}
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
