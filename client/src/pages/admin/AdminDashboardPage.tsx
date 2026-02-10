import { useQuery } from '@tanstack/react-query';
import {
  Users,
  UserCog,
  Wifi,
  CircleDollarSign,
  Store,
  Shield,
  Swords,
  Vote,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../../services/api';
import { SkeletonCard } from '../../components/ui/LoadingSkeleton';
import ErrorMessage from '../../components/ui/ErrorMessage';

interface DashboardStats {
  totalUsers: number;
  totalCharacters: number;
  onlineNow: number;
  totalGold: number;
  activeListings: number;
  totalGuilds: number;
  activeWars: number;
  activeElections: number;
  raceDistribution: { race: string; count: number }[];
  classDistribution: { className: string; count: number }[];
}

const STAT_CARDS_CONFIG = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, format: 'number' },
  { key: 'totalCharacters', label: 'Total Characters', icon: UserCog, format: 'number' },
  { key: 'onlineNow', label: 'Online Now', icon: Wifi, format: 'number' },
  { key: 'totalGold', label: 'Total Gold', icon: CircleDollarSign, format: 'gold' },
  { key: 'activeListings', label: 'Active Listings', icon: Store, format: 'number' },
  { key: 'totalGuilds', label: 'Total Guilds', icon: Shield, format: 'number' },
] as const;

const PIE_COLORS = [
  '#C9A461', '#8B7355', '#6B8E6B', '#5B7FB5', '#9B6B9B',
  '#B5785B', '#5BB5A5', '#B55B6B', '#7B9B5B', '#6B6BB5',
  '#B59B5B', '#5B9BB5',
];

function formatValue(value: number, format: string): string {
  if (format === 'gold') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString();
  }
  return value.toLocaleString();
}

export default function AdminDashboardPage() {
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => (await api.get('/admin/stats/dashboard')).data,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-display text-primary-400 mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard className="h-80" />
          <SkeletonCard className="h-80" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <h1 className="text-2xl font-display text-primary-400 mb-6">Dashboard</h1>
        <ErrorMessage error={error} onRetry={refetch} />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <h1 className="text-2xl font-display text-primary-400 mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {STAT_CARDS_CONFIG.map((card) => {
          const Icon = card.icon;
          const value = stats[card.key as keyof DashboardStats] as number;
          return (
            <div
              key={card.key}
              className="bg-dark-300 border border-dark-50 rounded-lg p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-primary-400" />
                <span className="text-parchment-500 text-xs">{card.label}</span>
              </div>
              <p className="text-2xl font-display text-parchment-200">
                {formatValue(value ?? 0, card.format)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Active Wars & Elections Badges */}
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blood-dark/20 border border-blood-dark/40 rounded-lg">
          <Swords className="w-4 h-4 text-blood-light" />
          <span className="text-blood-light text-sm font-display">
            {stats.activeWars ?? 0} Active War{(stats.activeWars ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-400/10 border border-primary-400/30 rounded-lg">
          <Vote className="w-4 h-4 text-primary-400" />
          <span className="text-primary-400 text-sm font-display">
            {stats.activeElections ?? 0} Active Election{(stats.activeElections ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Race Distribution Bar Chart */}
        <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
          <h2 className="font-display text-parchment-200 text-lg mb-4">Race Distribution</h2>
          {stats.raceDistribution && stats.raceDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={stats.raceDistribution}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,154,128,0.1)" />
                <XAxis
                  type="number"
                  tick={{ fill: '#A89A80', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(168,154,128,0.2)' }}
                />
                <YAxis
                  type="category"
                  dataKey="race"
                  tick={{ fill: '#A89A80', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(168,154,128,0.2)' }}
                  width={75}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A2E',
                    border: '1px solid rgba(168,154,128,0.3)',
                    borderRadius: '8px',
                    color: '#D4C5A9',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#C9A461" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-parchment-500 text-sm">
              No race data available
            </div>
          )}
        </div>

        {/* Class Distribution Pie Chart */}
        <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
          <h2 className="font-display text-parchment-200 text-lg mb-4">Class Distribution</h2>
          {stats.classDistribution && stats.classDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={stats.classDistribution}
                  dataKey="count"
                  nameKey="className"
                  cx="50%"
                  cy="50%"
                  outerRadius={130}
                  label={({ className: cn, percent }) =>
                    `${cn} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={{ stroke: '#A89A80' }}
                >
                  {stats.classDistribution.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1A1A2E',
                    border: '1px solid rgba(168,154,128,0.3)',
                    borderRadius: '8px',
                    color: '#D4C5A9',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: '#A89A80' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-parchment-500 text-sm">
              No class data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
