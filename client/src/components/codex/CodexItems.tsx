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

function camelToReadable(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').trim().replace(/^./, c => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Type-specific stat renderers
// ---------------------------------------------------------------------------

const DAMAGE_TYPE_COLORS: Record<string, string> = {
  slashing: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  piercing: 'bg-sky-500/20 text-sky-400 border-sky-500/40',
  bludgeoning: 'bg-stone-500/20 text-stone-400 border-stone-500/40',
};

const TYPE_BORDER_COLORS: Record<string, string> = {
  WEAPON: 'border-l-amber-500/60',
  ARMOR: 'border-l-sky-500/60',
  ACCESSORY: 'border-l-realm-purple-300/60',
  TOOL: 'border-l-realm-success/60',
  CONSUMABLE: 'border-l-realm-teal-300/60',
};

const EFFECT_DESCRIPTIONS: Record<string, (m: number, d: number) => string> = {
  heal_hp: (m) => `Heals ${m} HP`,
  heal_mana: (m) => `Restores ${m} Mana`,
  hp_regen: (m, d) => `Regenerates ${m} HP over ${d} min`,
  mana_regen: (m, d) => `Regenerates ${m} Mana over ${d} min`,
  buff_strength: (m, d) => `+${m} Strength for ${d} min`,
  buff_dexterity: (m, d) => `+${m} Dexterity for ${d} min`,
  buff_intelligence: (m, d) => `+${m} Intelligence for ${d} min`,
  buff_constitution: (m, d) => `+${m} Constitution for ${d} min`,
  buff_wisdom: (m, d) => `+${m} Wisdom for ${d} min`,
  buff_charisma: (m, d) => `+${m} Charisma for ${d} min`,
  buff_all_stats: (m, d) => `+${m} All Stats for ${d} min`,
  buff_armor: (m, d) => `+${m} Armor for ${d} min`,
  cure_poison: () => 'Cures Poison',
  cure_disease: () => 'Cures Disease',
  cure_all: () => 'Cures All Ailments',
  poison_immunity: (_m, d) => `Poison Immunity for ${d} min`,
  apply_poison: (m) => `Applies Poison (${m} damage)`,
  damage_fire: (m) => `Deals ${m} Fire Damage`,
  damage_ice: (m) => `Deals ${m} Ice Damage`,
  damage_lightning: (m) => `Deals ${m} Lightning Damage`,
  damage_area: (m) => `Deals ${m} AoE Damage`,
  damage_healing: (m) => `Heals ${m} HP`,
  blind: (_m, d) => `Blinds Target for ${d} min`,
  stun: (_m, d) => `Stuns Target for ${d} min`,
  obscure: (_m, d) => `Obscures Area for ${d} min`,
  sustenance: (_m, d) => `Removes Hunger for ${d} min`,
  reveal_map: () => 'Reveals Map',
  identify: () => 'Identifies Item',
  buff_strength_debuff_intelligence: (m, d) => `+${m} STR / -${m} INT for ${d} min`,
};

function formatEffect(effect: string, magnitude: number, duration: number): string {
  const formatter = EFFECT_DESCRIPTIONS[effect];
  if (formatter) {
    const text = formatter(magnitude, duration);
    return duration === 0 && text.includes(' min') ? text : text;
  }
  return `${camelToReadable(effect)}: ${magnitude}`;
}

// Keys to hide from all stats displays
const HIDDEN_STAT_KEYS = new Set([
  'equipSlot', 'professionType', 'toolType', 'tier',
  'speed', 'durability', 'levelToEquip',
]);

function WeaponStats({ stats }: { stats: Record<string, unknown> }) {
  const dmg = typeof stats.baseDamage === 'number' ? stats.baseDamage : null;
  const dmgType = typeof stats.damageType === 'string' ? stats.damageType : null;
  const twoHanded = stats.twoHanded === true;
  const range = typeof stats.range === 'number' ? stats.range : null;
  const reqStr = typeof stats.requiredStr === 'number' ? stats.requiredStr : null;
  const reqDex = typeof stats.requiredDex === 'number' ? stats.requiredDex : null;

  return (
    <div className="space-y-1.5 text-xs">
      {dmg != null && (
        <div className="flex items-center gap-2">
          <span className="text-realm-text-muted">Damage:</span>
          <span className="text-realm-text-primary font-semibold">{dmg}</span>
          {dmgType && (
            <span className={`px-1.5 py-0.5 rounded-sm text-[10px] border ${DAMAGE_TYPE_COLORS[dmgType] ?? 'bg-realm-bg-600 text-realm-text-secondary border-realm-border'}`}>
              {dmgType}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <span className={`px-1.5 py-0.5 rounded-sm text-[10px] border ${twoHanded ? 'bg-realm-bg-600 text-realm-text-secondary border-realm-border' : 'bg-realm-bg-600 text-realm-text-muted border-realm-border'}`}>
          {twoHanded ? 'Two-Handed' : 'One-Handed'}
        </span>
        {range != null && (
          <span className="px-1.5 py-0.5 rounded-sm text-[10px] border bg-realm-bg-600 text-realm-text-secondary border-realm-border">
            Range: {range}
          </span>
        )}
      </div>
      {(reqStr != null || reqDex != null) && (
        <div className="text-realm-text-muted">
          Requires:{' '}
          {reqStr != null && <span className="text-realm-text-secondary">STR {reqStr}</span>}
          {reqStr != null && reqDex != null && ', '}
          {reqDex != null && <span className="text-realm-text-secondary">DEX {reqDex}</span>}
        </div>
      )}
    </div>
  );
}

function ArmorStats({ stats }: { stats: Record<string, unknown> }) {
  const armor = typeof stats.armor === 'number' ? stats.armor : null;
  const magicResist = typeof stats.magicResist === 'number' ? stats.magicResist : null;
  const movePen = typeof stats.movementPenalty === 'number' && stats.movementPenalty > 0 ? stats.movementPenalty : null;
  const stealthPen = typeof stats.stealthPenalty === 'number' && stats.stealthPenalty > 0 ? stats.stealthPenalty : null;
  const reqStr = typeof stats.requiredStr === 'number' ? stats.requiredStr : null;

  if (armor == null && magicResist == null) return null;

  return (
    <div className="space-y-1 text-xs">
      {armor != null && (
        <div className="flex items-center gap-2">
          <span className="text-realm-text-muted">Armor:</span>
          <span className="text-realm-success font-semibold">+{armor} AC</span>
        </div>
      )}
      {magicResist != null && (
        <div className="flex items-center gap-2">
          <span className="text-realm-text-muted">Magic Resist:</span>
          <span className="text-realm-purple-300 font-semibold">+{magicResist}</span>
        </div>
      )}
      {movePen != null && (
        <div className="flex items-center gap-2">
          <span className="text-realm-text-muted">Movement Penalty:</span>
          <span className="text-realm-danger font-semibold">-{movePen}</span>
        </div>
      )}
      {stealthPen != null && (
        <div className="flex items-center gap-2">
          <span className="text-realm-text-muted">Stealth Penalty:</span>
          <span className="text-realm-danger font-semibold">-{stealthPen}</span>
        </div>
      )}
      {reqStr != null && (
        <div className="text-realm-text-muted">Requires: <span className="text-realm-text-secondary">STR {reqStr}</span></div>
      )}
    </div>
  );
}

function ToolStats({ stats }: { stats: Record<string, unknown> }) {
  const speedBonus = typeof stats.speedBonus === 'number' ? stats.speedBonus : null;
  const yieldBonus = typeof stats.yieldBonus === 'number' ? stats.yieldBonus : null;
  const profType = typeof stats.professionType === 'string' ? stats.professionType : null;
  const toolType = typeof stats.toolType === 'string' ? stats.toolType : null;

  if (speedBonus == null && yieldBonus == null) return null;

  return (
    <div className="space-y-1 text-xs">
      {speedBonus != null && (
        <div className="flex items-center gap-2">
          <span className="text-realm-text-muted">Gathering Speed:</span>
          <span className="text-realm-success font-semibold">+{Math.round(speedBonus * 100)}%</span>
        </div>
      )}
      {yieldBonus != null && (
        <div className="flex items-center gap-2">
          <span className="text-realm-text-muted">Yield Bonus:</span>
          <span className="text-realm-success font-semibold">+{Math.round(yieldBonus * 100)}%</span>
        </div>
      )}
      {profType && toolType && (
        <div className="text-realm-text-muted">
          For: <span className="text-realm-text-secondary">{formatProfession(profType)} ({toolType})</span>
        </div>
      )}
    </div>
  );
}

function ConsumableStats({ stats, name }: { stats: Record<string, unknown>; name: string }) {
  // Enchantment scrolls use custom keys (fireDamage, coldDamage, etc.)
  const isEnchantment = name.toLowerCase().includes('enchantment') || name.toLowerCase().includes('scroll');
  if (isEnchantment) {
    const entries = Object.entries(stats).filter(([k]) => !HIDDEN_STAT_KEYS.has(k));
    if (entries.length === 0) return null;
    return (
      <div className="space-y-1 text-xs">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="text-realm-text-muted">{camelToReadable(key)}:</span>
            <span className="text-realm-success font-semibold">+{typeof val === 'number' ? val : String(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  const effect = typeof stats.effect === 'string' ? stats.effect : null;
  const magnitude = typeof stats.magnitude === 'number' ? stats.magnitude : 0;
  const duration = typeof stats.duration === 'number' ? stats.duration : 0;
  const stackSize = typeof stats.stackSize === 'number' ? stats.stackSize : null;
  const secondaryEffect = typeof stats.secondaryEffect === 'string' ? stats.secondaryEffect : null;
  const secondaryMag = typeof stats.secondaryMagnitude === 'number' ? stats.secondaryMagnitude : 0;

  if (!effect) return null;

  return (
    <div className="space-y-1 text-xs">
      <div className="text-realm-text-primary font-semibold">
        {formatEffect(effect, magnitude, duration)}
        {duration === 0 && <span className="text-realm-text-muted font-normal ml-1">(instant)</span>}
      </div>
      {secondaryEffect && (
        <div className="text-realm-text-secondary">
          {formatEffect(secondaryEffect, secondaryMag, duration)}
        </div>
      )}
      {stackSize != null && (
        <div className="text-realm-text-muted">Stack Size: {stackSize}</div>
      )}
    </div>
  );
}

function AccessoryStats({ stats }: { stats: Record<string, unknown> }) {
  const entries = Object.entries(stats).filter(
    ([k]) => !HIDDEN_STAT_KEYS.has(k) && typeof stats[k] === 'number',
  );
  if (entries.length === 0) return null;

  return (
    <div className="space-y-1 text-xs">
      {entries.map(([key, val]) => {
        const numVal = val as number;
        return (
          <div key={key} className="flex justify-between">
            <span className="text-realm-text-muted">{camelToReadable(key)}</span>
            <span className={numVal > 0 ? 'text-realm-success font-semibold' : numVal < 0 ? 'text-realm-danger font-semibold' : 'text-realm-text-secondary'}>
              {numVal > 0 ? '+' : ''}{numVal}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ItemStatsBlock({ item }: { item: ItemTemplate }) {
  const stats = item.stats as Record<string, unknown> | null;
  if (!stats || Object.keys(stats).length === 0) return null;

  // Check if there are any displayable keys
  const displayableKeys = Object.keys(stats).filter(k => !HIDDEN_STAT_KEYS.has(k));
  if (displayableKeys.length === 0) return null;

  const borderColor = TYPE_BORDER_COLORS[item.type] ?? 'border-l-realm-border';

  let content: React.ReactNode = null;
  switch (item.type) {
    case 'WEAPON':
      content = <WeaponStats stats={stats} />;
      break;
    case 'ARMOR':
      content = <ArmorStats stats={stats} />;
      break;
    case 'TOOL':
      content = <ToolStats stats={stats} />;
      break;
    case 'CONSUMABLE':
      content = <ConsumableStats stats={stats} name={item.name} />;
      break;
    case 'ACCESSORY':
      content = <AccessoryStats stats={stats} />;
      break;
    default: {
      // Generic fallback for any other type with numeric stats
      const genericEntries = displayableKeys.filter(k => typeof stats[k] === 'number');
      if (genericEntries.length === 0) return null;
      content = <AccessoryStats stats={stats} />;
      break;
    }
  }

  if (!content) return null;

  return (
    <div className={`bg-realm-bg-900/30 rounded-sm px-3 py-2 border-l-2 ${borderColor}`}>
      {content}
    </div>
  );
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
          className={`px-3 py-1.5 rounded-sm text-sm font-body transition-colors ${
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
              className={`px-3 py-1.5 rounded-sm text-sm font-body transition-colors ${
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

                          {/* Scalar fields */}
                          <div className="flex flex-wrap gap-4 text-xs text-realm-text-muted">
                            {item.baseValue != null && item.baseValue > 0 && <span>Value: {item.baseValue}g</span>}
                            {item.durability != null && <span>Durability: {item.durability}</span>}
                            {item.levelRequired != null && item.levelRequired > 1 && <span>Lv. {item.levelRequired}</span>}
                          </div>

                          {/* Item combat/mechanical stats */}
                          <ItemStatsBlock item={item} />

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
                                    className="flex items-center gap-2 bg-realm-bg-800 rounded-sm px-3 py-1.5"
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
                                    className="flex items-center gap-2 bg-realm-bg-800 rounded-sm px-3 py-1.5"
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
