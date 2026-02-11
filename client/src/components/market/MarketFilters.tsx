import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
} from 'lucide-react';

type Rarity = 'POOR' | 'COMMON' | 'FINE' | 'SUPERIOR' | 'MASTERWORK' | 'LEGENDARY';
type SortField = 'price_asc' | 'price_desc' | 'newest' | 'rarity';

const RARITY_ORDER: Rarity[] = ['POOR', 'COMMON', 'FINE', 'SUPERIOR', 'MASTERWORK', 'LEGENDARY'];
const ITEM_TYPES = ['All', 'Weapon', 'Armor', 'Consumable', 'Material', 'Accessory', 'Tool', 'Misc'];

interface MarketFiltersProps {
  searchText: string;
  onSearchChange: (v: string) => void;
  filterType: string;
  onFilterTypeChange: (v: string) => void;
  filterRarity: string;
  onFilterRarityChange: (v: string) => void;
  priceMin: string;
  onPriceMinChange: (v: string) => void;
  priceMax: string;
  onPriceMaxChange: (v: string) => void;
  sort: SortField;
  onSortChange: (v: SortField) => void;
}

export default function MarketFilters({
  searchText, onSearchChange,
  filterType, onFilterTypeChange,
  filterRarity, onFilterRarityChange,
  priceMin, onPriceMinChange,
  priceMax, onPriceMaxChange,
  sort, onSortChange,
}: MarketFiltersProps) {
  return (
    <div className="bg-dark-300 border border-dark-50 rounded-lg p-4 mb-6">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="text-parchment-500 text-xs mb-1 block">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-500" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Item name..."
              className="w-full pl-9 pr-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm placeholder:text-parchment-500/50 focus:border-primary-400/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Type filter */}
        <div>
          <label className="text-parchment-500 text-xs mb-1 block">Type</label>
          <select
            value={filterType}
            onChange={(e) => onFilterTypeChange(e.target.value)}
            className="px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm focus:border-primary-400/50 focus:outline-none"
          >
            {ITEM_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Rarity filter */}
        <div>
          <label className="text-parchment-500 text-xs mb-1 block">Rarity</label>
          <select
            value={filterRarity}
            onChange={(e) => onFilterRarityChange(e.target.value)}
            className="px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm focus:border-primary-400/50 focus:outline-none"
          >
            <option value="All">All</option>
            {RARITY_ORDER.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Price range */}
        <div className="flex items-end gap-2">
          <div>
            <label className="text-parchment-500 text-xs mb-1 block">Min Price</label>
            <input
              type="number"
              value={priceMin}
              onChange={(e) => onPriceMinChange(e.target.value)}
              placeholder="0"
              min="0"
              className="w-24 px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm placeholder:text-parchment-500/50 focus:border-primary-400/50 focus:outline-none"
            />
          </div>
          <span className="text-parchment-500 pb-2">-</span>
          <div>
            <label className="text-parchment-500 text-xs mb-1 block">Max Price</label>
            <input
              type="number"
              value={priceMax}
              onChange={(e) => onPriceMaxChange(e.target.value)}
              placeholder="Any"
              min="0"
              className="w-24 px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm placeholder:text-parchment-500/50 focus:border-primary-400/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="text-parchment-500 text-xs mb-1 block">Sort</label>
          <div className="flex gap-1">
            {([
              { key: 'price_asc', label: 'Price', icon: ArrowUp },
              { key: 'price_desc', label: 'Price', icon: ArrowDown },
              { key: 'newest', label: 'Newest', icon: Clock },
              { key: 'rarity', label: 'Rarity', icon: ArrowUpDown },
            ] as const).map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => onSortChange(s.key)}
                  className={`flex items-center gap-1 px-2.5 py-2 rounded text-xs transition-colors ${
                    sort === s.key
                      ? 'bg-primary-400/20 text-primary-400 border border-primary-400/40'
                      : 'bg-dark-500 text-parchment-500 border border-dark-50 hover:text-parchment-300'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
