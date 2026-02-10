import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  TrendingUp,
  ArrowRight,
  Truck,
  Coins,
  MapPin,
} from 'lucide-react';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TradeRoute {
  item: { id: string; name: string; type: string; rarity: string };
  buyTown: { id: string; name: string };
  buyPrice: number;
  sellTown: { id: string; name: string };
  sellPrice: number;
  distance: number | null;
  estimatedProfit: number;
  profitMargin: number;
}

interface BestRoutesResponse {
  routes: TradeRoute[];
}

interface BestTradesProps {
  onStartTrade?: (fromTownId: string, toTownId: string) => void;
}

// ---------------------------------------------------------------------------
// Rarity color helper
// ---------------------------------------------------------------------------
const RARITY_COLORS: Record<string, string> = {
  COMMON: 'text-parchment-400',
  UNCOMMON: 'text-green-400',
  RARE: 'text-blue-400',
  EPIC: 'text-purple-400',
  LEGENDARY: 'text-yellow-400',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function BestTrades({ onStartTrade }: BestTradesProps) {
  const { data, isLoading } = useQuery<BestRoutesResponse>({
    queryKey: ['trade', 'best-routes'],
    queryFn: async () => {
      const res = await api.get('/trade/best-routes');
      return res.data;
    },
    staleTime: 120000,
  });

  const routes = data?.routes ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-8 text-center">
        <TrendingUp className="w-10 h-10 text-parchment-500/30 mx-auto mb-3" />
        <p className="text-parchment-500 text-sm">
          No profitable trade routes found yet. Prices need more market activity.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-parchment-500 text-xs">
        Top {routes.length} most profitable trade routes based on recent market data.
      </p>

      {routes.map((route, index) => (
        <div
          key={`${route.item.id}-${route.buyTown.id}-${route.sellTown.id}`}
          className="bg-dark-300 border border-dark-50 rounded-lg p-4 hover:border-primary-400/20 transition-all"
        >
          <div className="flex items-start justify-between gap-4">
            {/* Left: item + route */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-parchment-600 text-[10px] font-display">#{index + 1}</span>
                <span className={`font-display text-sm truncate ${RARITY_COLORS[route.item.rarity] ?? 'text-parchment-200'}`}>
                  {route.item.name}
                </span>
                <span className="text-parchment-600 text-[10px]">
                  {route.item.type.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Route */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-green-400" />
                  <span className="text-parchment-300">{route.buyTown.name}</span>
                  <span className="text-green-400 font-display">{route.buyPrice}g</span>
                </div>
                <ArrowRight className="w-3 h-3 text-parchment-600" />
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-red-400" />
                  <span className="text-parchment-300">{route.sellTown.name}</span>
                  <span className="text-red-400 font-display">{route.sellPrice}g</span>
                </div>
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-parchment-500">
                {route.distance !== null && <span>Distance: {route.distance}</span>}
                <span>
                  Profit: <span className="text-primary-400 font-display">{route.estimatedProfit}g/unit</span>
                </span>
                <span>
                  Margin: <span className={`font-display ${route.profitMargin >= 50 ? 'text-green-400' : route.profitMargin >= 20 ? 'text-yellow-400' : 'text-parchment-400'}`}>
                    {route.profitMargin}%
                  </span>
                </span>
              </div>
            </div>

            {/* Right: profit badge + start trade button */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-xs font-display">
                <Coins className="w-3 h-3" />
                +{route.estimatedProfit}g
              </div>
              {onStartTrade && (
                <button
                  onClick={() => onStartTrade(route.buyTown.id, route.sellTown.id)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-primary-400/15 text-primary-400 text-[10px] font-display rounded hover:bg-primary-400/25 transition-colors"
                >
                  <Truck className="w-3 h-3" />
                  Start Trade
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
