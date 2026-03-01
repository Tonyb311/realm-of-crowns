import { useQuery } from '@tanstack/react-query';
import { BarChart3, Swords, TrendingUp, LogOut } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import api from '../../../services/api';

interface CombatStats {
  totalFights: number;
  completedFights: number;
  fightsByType: { type: string; count: number }[];
  fightsPerDay: { date: string; count: number }[];
  outcomes: { wins: number; losses: number; flees: number };
  topMonsters: { name: string; count: number }[];
}

export default function OverviewTab() {
  const { data, isLoading, error } = useQuery<CombatStats>({
    queryKey: ['admin', 'combat', 'stats'],
    queryFn: async () => (await api.get('/admin/combat/stats')).data,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 h-28 animate-pulse" />
          ))}
        </div>
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg h-64 animate-pulse" />
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

  const totalOutcomes = data.outcomes.wins + data.outcomes.losses + data.outcomes.flees;
  const winRate = totalOutcomes > 0 ? (data.outcomes.wins / totalOutcomes * 100).toFixed(1) : '0';
  const fleeRate = totalOutcomes > 0 ? (data.outcomes.flees / totalOutcomes * 100).toFixed(1) : '0';

  const summaryCards = [
    { label: 'Total Fights', value: data.totalFights.toLocaleString(), icon: Swords, color: 'text-realm-gold-400' },
    { label: 'Completed', value: data.completedFights.toLocaleString(), icon: BarChart3, color: 'text-realm-teal-300' },
    { label: 'Win Rate', value: `${winRate}%`, icon: TrendingUp, color: 'text-realm-success' },
    { label: 'Flee Rate', value: `${fleeRate}%`, icon: LogOut, color: 'text-realm-warning' },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-realm-text-muted text-xs font-display uppercase tracking-wider">{card.label}</span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <span className={`text-2xl font-display ${card.color}`}>{card.value}</span>
            </div>
          );
        })}
      </div>

      {/* Fights Per Day Chart */}
      {data.fightsPerDay.length > 0 && (
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h3 className="font-display text-realm-text-primary text-sm mb-4">Fights Per Day (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.fightsPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '8px' }}
                labelStyle={{ color: '#d4af37' }}
              />
              <Line type="monotone" dataKey="count" stroke="#d4af37" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fights By Type */}
        {data.fightsByType.length > 0 && (
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
            <h3 className="font-display text-realm-text-primary text-sm mb-4">Fights By Type</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.fightsByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                <XAxis dataKey="type" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #2a2a3a', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#d4af37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Monsters */}
        {data.topMonsters.length > 0 && (
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
            <h3 className="font-display text-realm-text-primary text-sm mb-4">Most Encountered Monsters</h3>
            <div className="space-y-2">
              {data.topMonsters.map((m, i) => (
                <div key={m.name} className="flex items-center justify-between py-1.5 px-2 rounded bg-realm-bg-800/50">
                  <div className="flex items-center gap-2">
                    <span className="text-realm-text-muted text-xs w-5">#{i + 1}</span>
                    <span className="text-realm-text-primary text-sm">{m.name}</span>
                  </div>
                  <span className="text-realm-gold-400 font-display text-sm">{m.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Outcomes Breakdown */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
        <h3 className="font-display text-realm-text-primary text-sm mb-4">Combat Outcomes (Last 30 Days)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-display text-realm-success">{data.outcomes.wins}</div>
            <div className="text-xs text-realm-text-muted">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-display text-realm-danger">{data.outcomes.losses}</div>
            <div className="text-xs text-realm-text-muted">Losses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-display text-realm-warning">{data.outcomes.flees}</div>
            <div className="text-xs text-realm-text-muted">Flees</div>
          </div>
        </div>
      </div>
    </div>
  );
}
