import { useQuery } from '@tanstack/react-query';
import {
  Swords,
  TrendingUp,
  Timer,
  Coins,
  Package,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from 'recharts';
import api from '../../../services/api';

// ---- Types ----

interface CombatStats {
  totalEncounters: number;
  pveSurvivalRate: number;
  avgRounds: number;
  goldPerDay: number;
  itemsDroppedPerDay: number;
  activeLevelRange: string;
  survivalByLevel: Array<{
    band: string;
    encounters: number;
    wins: number;
    survivalRate: number;
    avgRounds: number;
    avgHpRemainingPct: number;
  }>;
  economyTrend: Array<{ date: string; gold: number; xp: number; itemsDropped: number }>;
  lootByRarity: Array<{ rarity: string; count: number }>;
  pacingByLevel: Array<{ band: string; avgRounds: number; encounters: number }>;
  alerts: Array<{
    category: 'race' | 'class' | 'monster' | 'level_band' | 'loot';
    entity: string;
    metric: string;
    value: number;
    expected: string;
    severity: 'critical' | 'warning';
    message: string;
  }>;
  topMonsters: Array<{ name: string; count: number; playerWinRate: number }>;
  topRaces: Array<{ race: string; count: number; winRate: number }>;
  topClasses: Array<{ class: string; count: number; winRate: number }>;
}

// ---- Constants ----

const LOOT_RARITY_COLORS: Record<string, string> = {
  POOR: '#9ca3af',
  COMMON: '#e5e7eb',
  FINE: '#22c55e',
  SUPERIOR: '#3b82f6',
  MASTERWORK: '#a855f7',
  LEGENDARY: '#f59e0b',
  UNKNOWN: '#6b7280',
};

const TOOLTIP_STYLE = {
  backgroundColor: '#1a1a2e',
  border: '1px solid #2a2a3a',
  borderRadius: '8px',
};

const CATEGORY_LABELS: Record<string, string> = {
  race: 'Race',
  class: 'Class',
  monster: 'Monster',
  level_band: 'Level Band',
  loot: 'Loot',
};

// ---- Helpers ----

function survivalColor(rate: number): string {
  if (rate > 70) return 'text-realm-success';
  if (rate >= 40) return 'text-realm-warning';
  return 'text-realm-danger';
}

function roundsColor(rounds: number): string {
  if (rounds >= 4 && rounds <= 8) return 'text-realm-success';
  if ((rounds >= 2 && rounds < 4) || (rounds > 8 && rounds <= 12)) return 'text-realm-warning';
  return 'text-realm-danger';
}

function winRateColor(rate: number): string {
  if (rate > 60) return 'text-realm-success';
  if (rate >= 40) return 'text-realm-warning';
  return 'text-realm-danger';
}

// ---- Component ----

export default function OverviewTab() {
  const { data, isLoading, error } = useQuery<CombatStats>({
    queryKey: ['admin', 'combat', 'stats'],
    queryFn: async () => (await api.get('/admin/combat/stats')).data,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 h-28 animate-pulse" />
          ))}
        </div>
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg h-72 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg h-64 animate-pulse" />
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg h-64 animate-pulse" />
        </div>
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg h-56 animate-pulse" />
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

  if (data.totalEncounters === 0) {
    return (
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-12 text-center">
        <Swords className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
        <p className="text-realm-text-muted">No combat data yet. Run a simulation or wait for player encounters.</p>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Encounters', value: data.totalEncounters.toLocaleString(), icon: Swords, color: 'text-realm-gold-400' },
    { label: 'PvE Survival Rate', value: `${data.pveSurvivalRate}%`, icon: TrendingUp, color: survivalColor(data.pveSurvivalRate) },
    { label: 'Avg Rounds', value: data.avgRounds.toFixed(1), icon: Timer, color: roundsColor(data.avgRounds) },
    { label: 'Gold / Day', value: data.goldPerDay.toLocaleString(), icon: Coins, color: 'text-realm-gold-300' },
    { label: 'Items / Day', value: data.itemsDroppedPerDay.toFixed(1), icon: Package, color: 'text-realm-teal-300' },
    { label: 'Active Level Range', value: data.activeLevelRange, icon: Layers, color: 'text-realm-text-secondary' },
  ];

  return (
    <div className="space-y-6">
      {/* TIER 1: KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

      {/* TIER 2A: PvE Survival Rate by Level Band */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
        <h3 className="font-display text-realm-text-primary text-sm mb-1">
          PvE Survival Rate by Level Band
        </h3>
        <p className="text-realm-text-muted text-xs mb-4">
          Green zone = healthy range (40-70%). Below = too hard. Above = too easy.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={data.survivalByLevel}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <ReferenceArea y1={40} y2={70} fill="#5A8F6E" fillOpacity={0.1} />
            <XAxis dataKey="band" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" domain={[0, 100]} stroke="#d4af37" tick={{ fontSize: 11 }} label={{ value: 'Survival %', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 10 } }} />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" tick={{ fontSize: 11 }} label={{ value: 'Encounters', angle: 90, position: 'insideRight', style: { fill: '#6b7280', fontSize: 10 } }} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: '#d4af37' }}
              formatter={(value: number, name: string) => {
                if (name === 'survivalRate') return [`${value}%`, 'Survival Rate'];
                if (name === 'encounters') return [value, 'Encounters'];
                return [value, name];
              }}
            />
            <Bar yAxisId="right" dataKey="encounters" fill="#242B45" radius={[4, 4, 0, 0]} />
            <Line yAxisId="left" type="monotone" dataKey="survivalRate" stroke="#d4af37" strokeWidth={3} dot={{ r: 5, fill: '#d4af37' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* TIER 2B: Economy Trend + Loot by Rarity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Economy Injection Trend */}
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h3 className="font-display text-realm-text-primary text-sm mb-4">Economy Injection (Last 30 Days)</h3>
          {data.economyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.economyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#d4af37' }} />
                <Area type="monotone" dataKey="gold" stackId="1" fill="#f59e0b" stroke="#f59e0b" fillOpacity={0.5} name="Gold" />
                <Area type="monotone" dataKey="xp" stackId="1" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.4} name="XP" />
                <Area type="monotone" dataKey="itemsDropped" stackId="1" fill="#22c55e" stroke="#22c55e" fillOpacity={0.4} name="Items" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-10 text-realm-text-muted text-sm">No recent data</div>
          )}
        </div>

        {/* Loot by Rarity */}
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h3 className="font-display text-realm-text-primary text-sm mb-4">Loot Drops by Rarity</h3>
          {data.lootByRarity.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.lootByRarity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis dataKey="rarity" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#d4af37' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.lootByRarity.map((entry) => (
                    <Cell key={entry.rarity} fill={LOOT_RARITY_COLORS[entry.rarity] ?? '#6b7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-10 text-realm-text-muted text-sm">No loot drops recorded</div>
          )}
        </div>
      </div>

      {/* TIER 2C: Fight Pacing by Level Band */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
        <h3 className="font-display text-realm-text-primary text-sm mb-1">
          Fight Pacing by Level Band
        </h3>
        <p className="text-realm-text-muted text-xs mb-4">
          Sweet spot = 4-8 rounds. Under 3 = stomps. Over 10 = tedious.
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data.pacingByLevel}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <ReferenceArea y1={4} y2={8} fill="#5A8F6E" fillOpacity={0.1} />
            <XAxis dataKey="band" stroke="#6b7280" tick={{ fontSize: 12 }} />
            <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#d4af37' }} />
            <Bar dataKey="avgRounds" fill="#d4af37" radius={[4, 4, 0, 0]} name="Avg Rounds" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* TIER 2D: Top 5 Tables */}
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
                <tr key={m.name} className="hover:bg-realm-bg-800/30 transition-colors cursor-pointer" onClick={() => {}}>
                  <td className="py-2 text-sm text-realm-text-primary">{m.name}</td>
                  <td className="py-2 text-sm text-realm-text-secondary text-right">{m.count}</td>
                  <td className={`py-2 text-sm text-right font-display ${winRateColor(m.playerWinRate)}`}>{m.playerWinRate}%</td>
                </tr>
              ))}
              {data.topMonsters.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-realm-text-muted text-sm">No data</td></tr>
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
                <tr key={r.race} className="hover:bg-realm-bg-800/30 transition-colors cursor-pointer" onClick={() => {}}>
                  <td className="py-2 text-sm text-realm-text-primary">{r.race}</td>
                  <td className="py-2 text-sm text-realm-text-secondary text-right">{r.count}</td>
                  <td className={`py-2 text-sm text-right font-display ${winRateColor(r.winRate)}`}>{r.winRate}%</td>
                </tr>
              ))}
              {data.topRaces.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-realm-text-muted text-sm">No data</td></tr>
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
                <tr key={c.class} className="hover:bg-realm-bg-800/30 transition-colors cursor-pointer" onClick={() => {}}>
                  <td className="py-2 text-sm text-realm-text-primary">{c.class}</td>
                  <td className="py-2 text-sm text-realm-text-secondary text-right">{c.count}</td>
                  <td className={`py-2 text-sm text-right font-display ${winRateColor(c.winRate)}`}>{c.winRate}%</td>
                </tr>
              ))}
              {data.topClasses.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-realm-text-muted text-sm">No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* TIER 3: Balance Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-realm-text-primary text-sm">Balance Alerts</h3>
            <span className="bg-realm-danger/20 text-realm-danger text-xs font-display px-2 py-0.5 rounded-full">
              {data.alerts.length}
            </span>
          </div>
          {data.alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-lg p-4 border-l-4 ${
                alert.severity === 'critical'
                  ? 'bg-realm-danger/10 border-realm-danger'
                  : 'bg-realm-warning/10 border-realm-warning'
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  alert.severity === 'critical' ? 'text-realm-danger' : 'text-realm-warning'
                }`}
              />
              <div className="flex-1">
                <span className="text-sm text-realm-text-primary">{alert.message}</span>
              </div>
              <span className="text-xs font-display uppercase tracking-wider text-realm-text-muted bg-realm-bg-800 px-2 py-1 rounded flex-shrink-0">
                {CATEGORY_LABELS[alert.category] ?? alert.category}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
