import { useQuery } from '@tanstack/react-query';
import {
  Swords,
  Shield,
  TrendingUp,
  Timer,
  Heart,
  Sparkles,
  Coins,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import api from '../../../services/api';

interface CombatStats {
  totalEncounters: number;
  pveSurvivalRate: number;
  pvpDuels: number;
  avgRounds: number;
  avgHpRemaining: number;
  totalXpAwarded: number;
  totalGoldAwarded: number;
  lootByRarity: Array<{ rarity: string; count: number }>;
  encountersPerDay: Array<{ date: string; count: number; wins: number; losses: number }>;
  byOutcome: Array<{ outcome: string; count: number }>;
  byTriggerSource: Array<{ source: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
  topMonsters: Array<{ name: string; count: number; playerWinRate: number }>;
  topRaces: Array<{ race: string; count: number; winRate: number }>;
  topClasses: Array<{ class: string; count: number; winRate: number }>;
  balanceAlerts: Array<{
    entity: string;
    entityType: 'race' | 'class' | 'monster';
    winRate: number;
    encounters: number;
    severity: 'warning' | 'critical';
  }>;
}

const RARITY_COLORS: Record<string, string> = {
  POOR: '#9ca3af',
  COMMON: '#ffffff',
  FINE: '#22c55e',
  SUPERIOR: '#3b82f6',
  MASTERWORK: '#a855f7',
  LEGENDARY: '#f59e0b',
  UNKNOWN: '#6b7280',
};

const PIE_COLORS = ['#d4af37', '#4D8FA8', '#A855C7', '#B87333', '#5A8F6E', '#8B2E2E'];
const OUTCOME_COLORS: Record<string, string> = {
  win: '#5A8F6E',
  loss: '#8B2E2E',
  flee: '#C9952B',
  draw: '#6b7280',
};

function survivalRateColor(rate: number): string {
  if (rate > 70) return 'text-realm-success';
  if (rate >= 40) return 'text-realm-warning';
  return 'text-realm-danger';
}

function winRateColor(rate: number): string {
  if (rate > 60) return 'text-realm-success';
  if (rate >= 40) return 'text-realm-warning';
  return 'text-realm-danger';
}

export default function OverviewTab() {
  const { data, isLoading, error } = useQuery<CombatStats>({
    queryKey: ['admin', 'combat', 'stats'],
    queryFn: async () => (await api.get('/admin/combat/stats')).data,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 h-28 animate-pulse" />
          ))}
        </div>
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg h-64 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg h-64 animate-pulse" />
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg h-64 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-realm-bg-700 border border-realm-border rounded-lg h-56 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-realm-bg-700 border border-realm-danger/30 rounded-lg p-6 text-realm-danger">
        Failed to load combat stats.
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Encounters', value: data.totalEncounters.toLocaleString(), icon: Swords, color: 'text-realm-gold-400' },
    { label: 'PvE Survival Rate', value: `${data.pveSurvivalRate}%`, icon: TrendingUp, color: survivalRateColor(data.pveSurvivalRate) },
    { label: 'Avg Rounds', value: data.avgRounds.toFixed(1), icon: Timer, color: 'text-realm-text-secondary' },
    { label: 'Avg HP Left', value: `${data.avgHpRemaining}%`, icon: Heart, color: 'text-realm-hp' },
    { label: 'Total XP', value: data.totalXpAwarded.toLocaleString(), icon: Sparkles, color: 'text-realm-purple-300' },
    { label: 'Total Gold', value: data.totalGoldAwarded.toLocaleString(), icon: Coins, color: 'text-realm-gold-300' },
    { label: 'PvP Duels', value: data.pvpDuels.toLocaleString(), icon: Shield, color: 'text-realm-teal-300' },
  ];

  // Compute flees from the difference for chart data
  const chartData = data.encountersPerDay.map((d) => ({
    ...d,
    flees: d.count - d.wins - d.losses,
  }));

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-realm-bg-700 border border-realm-border rounded-lg p-4 hover:border-realm-gold-600/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className={`text-xl font-display ${card.color}`}>{card.value}</div>
              <div className="text-realm-text-muted text-xs font-display uppercase tracking-wider mt-1">
                {card.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Row 2: Encounters Per Day */}
      {chartData.length > 0 && (
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h3 className="font-display text-realm-text-primary text-sm mb-4">
            Encounters Per Day (Last 30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tick={{ fontSize: 11 }}
                tickFormatter={(d) => d.slice(5)}
              />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #2a2a3a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#d4af37' }}
              />
              <Area
                type="monotone"
                dataKey="wins"
                stackId="1"
                fill="#5A8F6E"
                stroke="#5A8F6E"
                fillOpacity={0.6}
                name="Wins"
              />
              <Area
                type="monotone"
                dataKey="losses"
                stackId="1"
                fill="#8B2E2E"
                stroke="#8B2E2E"
                fillOpacity={0.6}
                name="Losses"
              />
              <Area
                type="monotone"
                dataKey="flees"
                stackId="1"
                fill="#C9952B"
                stroke="#C9952B"
                fillOpacity={0.6}
                name="Flees"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Row 3: Two Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Trigger Source */}
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h3 className="font-display text-realm-text-primary text-sm mb-4">By Trigger Source</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.byTriggerSource}
                dataKey="count"
                nameKey="source"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ source, percent }: { source: string; percent: number }) =>
                  `${source} (${(percent * 100).toFixed(0)}%)`
                }
                labelLine={{ stroke: '#6b7280' }}
              >
                {data.byTriggerSource.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #2a2a3a',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* By Outcome */}
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h3 className="font-display text-realm-text-primary text-sm mb-4">By Outcome</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.byOutcome}
                dataKey="count"
                nameKey="outcome"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ outcome, percent }: { outcome: string; percent: number }) =>
                  `${outcome} (${(percent * 100).toFixed(0)}%)`
                }
                labelLine={{ stroke: '#6b7280' }}
              >
                {data.byOutcome.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={OUTCOME_COLORS[entry.outcome] ?? PIE_COLORS[i % PIE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #2a2a3a',
                  borderRadius: '8px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3.5: Loot by Rarity */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
        <h3 className="font-display text-realm-text-primary text-sm mb-4">Loot Drops by Rarity</h3>
        {data.lootByRarity.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.lootByRarity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="rarity" stroke="#6b7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #2a2a3a',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#d4af37' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.lootByRarity.map((entry) => (
                  <Cell key={entry.rarity} fill={RARITY_COLORS[entry.rarity] ?? '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-10 text-realm-text-muted text-sm">
            No loot drops recorded
          </div>
        )}
      </div>

      {/* Row 4: Top 5 Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Monsters */}
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h3 className="font-display text-realm-text-primary text-sm mb-4">Top Monsters</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-realm-border text-left">
                <th className="pb-2 text-realm-text-muted text-xs font-display">Monster</th>
                <th className="pb-2 text-realm-text-muted text-xs font-display text-right">Fights</th>
                <th className="pb-2 text-realm-text-muted text-xs font-display text-right">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-realm-border/30">
              {data.topMonsters.map((m) => (
                <tr
                  key={m.name}
                  className="hover:bg-realm-bg-800/30 transition-colors cursor-pointer"
                  onClick={() => {}}
                >
                  <td className="py-2 text-sm text-realm-text-primary">{m.name}</td>
                  <td className="py-2 text-sm text-realm-text-secondary text-right">{m.count}</td>
                  <td className={`py-2 text-sm text-right font-display ${winRateColor(m.playerWinRate)}`}>
                    {m.playerWinRate}%
                  </td>
                </tr>
              ))}
              {data.topMonsters.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-realm-text-muted text-sm">No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Top Races */}
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h3 className="font-display text-realm-text-primary text-sm mb-4">Top Races</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-realm-border text-left">
                <th className="pb-2 text-realm-text-muted text-xs font-display">Race</th>
                <th className="pb-2 text-realm-text-muted text-xs font-display text-right">Fights</th>
                <th className="pb-2 text-realm-text-muted text-xs font-display text-right">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-realm-border/30">
              {data.topRaces.map((r) => (
                <tr
                  key={r.race}
                  className="hover:bg-realm-bg-800/30 transition-colors cursor-pointer"
                  onClick={() => {}}
                >
                  <td className="py-2 text-sm text-realm-text-primary">{r.race}</td>
                  <td className="py-2 text-sm text-realm-text-secondary text-right">{r.count}</td>
                  <td className={`py-2 text-sm text-right font-display ${winRateColor(r.winRate)}`}>
                    {r.winRate}%
                  </td>
                </tr>
              ))}
              {data.topRaces.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-realm-text-muted text-sm">No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Top Classes */}
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h3 className="font-display text-realm-text-primary text-sm mb-4">Top Classes</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-realm-border text-left">
                <th className="pb-2 text-realm-text-muted text-xs font-display">Class</th>
                <th className="pb-2 text-realm-text-muted text-xs font-display text-right">Fights</th>
                <th className="pb-2 text-realm-text-muted text-xs font-display text-right">Win Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-realm-border/30">
              {data.topClasses.map((c) => (
                <tr
                  key={c.class}
                  className="hover:bg-realm-bg-800/30 transition-colors cursor-pointer"
                  onClick={() => {}}
                >
                  <td className="py-2 text-sm text-realm-text-primary">{c.class}</td>
                  <td className="py-2 text-sm text-realm-text-secondary text-right">{c.count}</td>
                  <td className={`py-2 text-sm text-right font-display ${winRateColor(c.winRate)}`}>
                    {c.winRate}%
                  </td>
                </tr>
              ))}
              {data.topClasses.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-realm-text-muted text-sm">No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 5: Balance Alerts */}
      {data.balanceAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-realm-text-primary text-sm">Balance Alerts</h3>
          {data.balanceAlerts.map((alert) => (
            <div
              key={`${alert.entityType}-${alert.entity}`}
              className={`flex items-center gap-3 rounded-lg p-4 border ${
                alert.severity === 'critical'
                  ? 'bg-realm-danger/10 border-realm-danger/40'
                  : 'bg-realm-warning/10 border-realm-warning/40'
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 flex-shrink-0 ${
                  alert.severity === 'critical' ? 'text-realm-danger' : 'text-realm-warning'
                }`}
              />
              <span className="text-sm text-realm-text-primary">
                <strong>{alert.entity}</strong> ({alert.entityType}) —{' '}
                <span className={alert.severity === 'critical' ? 'text-realm-danger' : 'text-realm-warning'}>
                  {alert.winRate}% win rate
                </span>{' '}
                across {alert.encounters} encounters
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
