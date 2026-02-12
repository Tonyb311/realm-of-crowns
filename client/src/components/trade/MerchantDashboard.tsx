import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  Coins,
  TrendingUp,
  BarChart3,
  MapPin,
  Star,
  ShoppingCart,
  ArrowUpRight,
} from 'lucide-react';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MerchantStatsResponse {
  character: { id: string; name: string };
  profession: {
    level: number;
    tier: string;
    xp: number;
  } | null;
  stats: {
    totalTrades: number;
    totalBought: number;
    totalSold: number;
    netProfit: number;
    totalTradeVolume: number;
    townsTraded: number;
    crossTownTrades: number;
    crossTownProfit: number;
  };
  topItemTypes: Array<{ type: string; revenue: number }>;
  recentSales: Array<{
    itemName: string;
    quantity: number;
    price: number;
    townName: string;
    timestamp: string;
  }>;
}

// ---------------------------------------------------------------------------
// XP thresholds (simplified - matching server-side progression)
// ---------------------------------------------------------------------------
function xpForLevel(level: number): number {
  return level * 100 + Math.floor(level * level * 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function MerchantDashboard() {
  const { data: charData } = useQuery<{ id: string }>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data;
    },
  });

  const characterId = charData?.id;

  const { data, isLoading } = useQuery<MerchantStatsResponse>({
    queryKey: ['trade', 'merchant-stats', characterId],
    queryFn: async () => {
      const res = await api.get(`/trade/merchant/${characterId}/stats`);
      return res.data;
    },
    enabled: !!characterId,
    staleTime: 30000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  const { profession, stats, topItemTypes, recentSales } = data;

  // XP bar
  const currentLevel = profession?.level ?? 0;
  const currentXp = profession?.xp ?? 0;
  const xpNeeded = xpForLevel(currentLevel + 1);
  const xpProgress = xpNeeded > 0 ? Math.min(100, Math.round((currentXp / xpNeeded) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* Profession level card */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-realm-gold-500/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-realm-gold-400" />
            </div>
            <div>
              <h3 className="font-display text-realm-text-primary text-sm">Merchant</h3>
              <p className="text-realm-text-muted text-[10px]">
                {profession ? `${profession.tier} - Level ${profession.level}` : 'Not yet started'}
              </p>
            </div>
          </div>
          {profession && (
            <div className="text-right">
              <p className="font-display text-realm-gold-400 text-lg">Lv.{profession.level}</p>
            </div>
          )}
        </div>
        {profession && (
          <div>
            <div className="flex items-center justify-between text-[10px] text-realm-text-muted mb-1">
              <span>{currentXp} XP</span>
              <span>{xpNeeded} XP to next level</span>
            </div>
            <div className="w-full h-2 bg-realm-bg-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-realm-gold-500 rounded-full transition-all duration-300"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<BarChart3 className="w-4 h-4 text-realm-teal-300" />}
          label="Total Trades"
          value={stats.totalTrades.toString()}
        />
        <StatCard
          icon={<Coins className="w-4 h-4 text-realm-gold-400" />}
          label="Net Profit"
          value={`${stats.netProfit >= 0 ? '+' : ''}${stats.netProfit}g`}
          valueColor={stats.netProfit >= 0 ? 'text-realm-success' : 'text-realm-danger'}
        />
        <StatCard
          icon={<MapPin className="w-4 h-4 text-realm-purple-300" />}
          label="Towns Traded"
          value={stats.townsTraded.toString()}
        />
        <StatCard
          icon={<ArrowUpRight className="w-4 h-4 text-realm-success" />}
          label="Cross-Town Profit"
          value={`${stats.crossTownProfit}g`}
          valueColor="text-realm-success"
        />
      </div>

      {/* Two-column layout for details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top item types */}
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
          <h4 className="font-display text-sm text-realm-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-realm-gold-400" />
            Top Item Types
          </h4>
          {topItemTypes.length === 0 ? (
            <p className="text-realm-text-muted text-xs">No trade data yet.</p>
          ) : (
            <div className="space-y-2">
              {topItemTypes.map((item, index) => {
                const maxRevenue = topItemTypes[0]?.revenue ?? 1;
                const barWidth = Math.round((item.revenue / maxRevenue) * 100);
                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-realm-text-secondary">
                        {item.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-realm-gold-400 font-display">{item.revenue}g</span>
                    </div>
                    <div className="w-full h-1 bg-realm-bg-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-realm-gold-500/40 rounded-full"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent sales */}
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
          <h4 className="font-display text-sm text-realm-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-realm-success" />
            Recent Sales
          </h4>
          {recentSales.length === 0 ? (
            <p className="text-realm-text-muted text-xs">No sales yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {recentSales.map((sale, index) => (
                <div key={index} className="flex items-center justify-between text-xs py-1 border-b border-realm-border/50 last:border-b-0">
                  <div className="min-w-0">
                    <p className="text-realm-text-primary truncate">{sale.itemName}</p>
                    <p className="text-realm-text-muted/60 text-[10px]">
                      x{sale.quantity} at {sale.townName}
                    </p>
                  </div>
                  <span className="text-realm-gold-400 font-display flex-shrink-0 ml-2">
                    {sale.price * sale.quantity}g
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary row */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-realm-text-muted text-[10px] uppercase tracking-wider mb-1">Total Bought</p>
            <p className="font-display text-realm-text-primary">{stats.totalBought}g</p>
          </div>
          <div>
            <p className="text-realm-text-muted text-[10px] uppercase tracking-wider mb-1">Total Sold</p>
            <p className="font-display text-realm-text-primary">{stats.totalSold}g</p>
          </div>
          <div>
            <p className="text-realm-text-muted text-[10px] uppercase tracking-wider mb-1">Trade Volume</p>
            <p className="font-display text-realm-text-primary">{stats.totalTradeVolume} items</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card sub-component
// ---------------------------------------------------------------------------
function StatCard({
  icon,
  label,
  value,
  valueColor = 'text-realm-text-primary',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-realm-text-muted text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`font-display text-lg ${valueColor}`}>{value}</p>
    </div>
  );
}
