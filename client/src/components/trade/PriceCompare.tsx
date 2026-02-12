import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from 'lucide-react';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ItemTemplate {
  id: string;
  name: string;
  type: string;
  rarity: string;
}

interface TownPrice {
  townId: string;
  townName: string;
  avgPrice: number;
  volume: number;
  trend: 'up' | 'down' | 'stable';
}

interface PriceResult {
  itemTemplate: ItemTemplate;
  towns: TownPrice[];
}

interface SearchResult {
  items: Array<{ id: string; name: string; type: string; rarity: string }>;
}

// ---------------------------------------------------------------------------
// Rarity color helper
// ---------------------------------------------------------------------------
const RARITY_COLORS: Record<string, string> = {
  COMMON: 'text-realm-text-secondary',
  UNCOMMON: 'text-realm-success',
  RARE: 'text-realm-teal-300',
  EPIC: 'text-realm-purple-300',
  LEGENDARY: 'text-realm-gold-400',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PriceCompare() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Search items
  const { data: searchData, isLoading: searchLoading } = useQuery<SearchResult>({
    queryKey: ['item-search', searchTerm],
    queryFn: async () => {
      const res = await api.get(`/items/search?q=${encodeURIComponent(searchTerm)}`);
      return res.data;
    },
    enabled: searchTerm.length >= 2,
  });

  // Fetch prices for selected item
  const { data: priceData, isLoading: priceLoading } = useQuery<PriceResult>({
    queryKey: ['trade-prices', selectedItemId],
    queryFn: async () => {
      const res = await api.get(`/trade/prices/${selectedItemId}`);
      return res.data;
    },
    enabled: !!selectedItemId,
  });

  const searchResults = searchData?.items ?? [];
  const towns = priceData?.towns ?? [];

  // Find min/max for color coding
  const prices = towns.map(t => t.avgPrice).filter(p => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  function priceColor(price: number): string {
    if (maxPrice === minPrice) return 'text-realm-text-primary';
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    if (ratio <= 0.33) return 'text-realm-success';
    if (ratio >= 0.66) return 'text-realm-danger';
    return 'text-realm-gold-400';
  }

  function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
    if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-realm-success" />;
    if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-realm-danger" />;
    return <Minus className="w-3.5 h-3.5 text-realm-text-muted" />;
  }

  function demandBadge(volume: number, avgVolume: number): JSX.Element | null {
    if (avgVolume === 0) return null;
    const ratio = volume / avgVolume;
    if (ratio >= 1.5) {
      return (
        <span className="px-1.5 py-0.5 text-[9px] font-display bg-realm-success/15 text-realm-success border border-realm-success/30 rounded-full">
          High Demand
        </span>
      );
    }
    if (ratio <= 0.5) {
      return (
        <span className="px-1.5 py-0.5 text-[9px] font-display bg-realm-danger/15 text-realm-danger border border-realm-danger/30 rounded-full">
          Low Demand
        </span>
      );
    }
    return null;
  }

  const avgVolume = towns.length > 0
    ? towns.reduce((sum, t) => sum + t.volume, 0) / towns.length
    : 0;

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-realm-text-muted" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (e.target.value.length < 2) setSelectedItemId(null);
          }}
          placeholder="Search for an item to compare prices..."
          className="w-full pl-10 pr-4 py-2.5 bg-realm-bg-700 border border-realm-border rounded-lg text-realm-text-primary text-sm placeholder:text-realm-text-muted/60 focus:outline-none focus:border-realm-gold-500/50"
        />
      </div>

      {/* Search results dropdown */}
      {searchTerm.length >= 2 && !selectedItemId && (
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden">
          {searchLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 text-realm-gold-400 animate-spin" />
            </div>
          ) : searchResults.length === 0 ? (
            <p className="text-realm-text-muted text-xs p-4 text-center">No items found</p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {searchResults.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedItemId(item.id);
                    setSearchTerm(item.name);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-realm-bg-800 transition-colors border-b border-realm-border last:border-b-0"
                >
                  <span className={`text-sm ${RARITY_COLORS[item.rarity] ?? 'text-realm-text-primary'}`}>
                    {item.name}
                  </span>
                  <span className="text-realm-text-muted/60 text-[10px] ml-2">
                    {item.type.replace(/_/g, ' ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Price comparison table */}
      {selectedItemId && (
        priceLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
          </div>
        ) : towns.length === 0 ? (
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
            <BarChart3 className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
            <p className="text-realm-text-muted text-sm">
              No price data available for this item yet.
            </p>
          </div>
        ) : (
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden">
            {priceData?.itemTemplate && (
              <div className="px-4 py-3 border-b border-realm-border">
                <h3 className={`font-display text-sm ${RARITY_COLORS[priceData.itemTemplate.rarity] ?? 'text-realm-text-primary'}`}>
                  {priceData.itemTemplate.name}
                </h3>
                <p className="text-realm-text-muted text-[10px]">
                  {priceData.itemTemplate.type.replace(/_/g, ' ')} &middot; {priceData.itemTemplate.rarity}
                </p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-realm-border">
                    <th className="text-left px-4 py-2 text-realm-text-muted text-xs font-display uppercase tracking-wider">Town</th>
                    <th className="text-right px-4 py-2 text-realm-text-muted text-xs font-display uppercase tracking-wider">Avg Price</th>
                    <th className="text-right px-4 py-2 text-realm-text-muted text-xs font-display uppercase tracking-wider">Volume</th>
                    <th className="text-center px-4 py-2 text-realm-text-muted text-xs font-display uppercase tracking-wider">Trend</th>
                    <th className="text-right px-4 py-2 text-realm-text-muted text-xs font-display uppercase tracking-wider">Demand</th>
                  </tr>
                </thead>
                <tbody>
                  {towns.map(town => (
                    <tr key={town.townId} className="border-b border-realm-border/50 hover:bg-realm-bg-800/50">
                      <td className="px-4 py-2.5 text-realm-text-primary">{town.townName}</td>
                      <td className={`px-4 py-2.5 text-right font-display ${priceColor(town.avgPrice)}`}>
                        {town.avgPrice}g
                      </td>
                      <td className="px-4 py-2.5 text-right text-realm-text-secondary">{town.volume}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-center">
                          <TrendIcon trend={town.trend} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {demandBadge(town.volume, avgVolume)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Price spread summary */}
            {prices.length >= 2 && (
              <div className="px-4 py-3 border-t border-realm-border flex items-center justify-between text-xs text-realm-text-muted">
                <span>
                  Lowest: <span className="text-realm-success font-display">{minPrice}g</span>
                </span>
                <span>
                  Spread: <span className="text-realm-gold-400 font-display">{Math.round((maxPrice - minPrice) * 100) / 100}g</span>
                </span>
                <span>
                  Highest: <span className="text-realm-danger font-display">{maxPrice}g</span>
                </span>
              </div>
            )}
          </div>
        )
      )}

      {!selectedItemId && searchTerm.length < 2 && (
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
          <BarChart3 className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
          <p className="text-realm-text-muted text-sm">
            Search for an item to compare prices across all towns.
          </p>
        </div>
      )}
    </div>
  );
}
