import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play,
  Pause,
  Square,
  Trash2,
  Loader2,
  Bot,
  Activity,
  Zap,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Target,
  Flame,
  ChevronDown,
  ChevronRight,
  Users,
  Coins,
  Gauge,
  Sliders,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BotSummary {
  characterId: string;
  characterName: string;
  username: string;
  profile: string;
  race: string;
  class: string;
  level: number;
  gold: number;
  currentTownId: string;
  lastAction: string | null;
  lastActionAt: number;
  actionsCompleted: number;
  errorsTotal: number;
  isActive: boolean;
  status: 'active' | 'idle' | 'paused' | 'error';
}

interface ActivityEntry {
  timestamp: string;
  characterId: string;
  botName: string;
  profile: string;
  action: string;
  endpoint: string;
  success: boolean;
  detail: string;
  durationMs: number;
}

interface SimulationStatus {
  status: 'idle' | 'running' | 'paused' | 'stopping';
  startedAt: string | null;
  botCount: number;
  activeBots: number;
  totalActions: number;
  totalErrors: number;
  actionsPerMinute: number;
  uptime: number;
  dbTestPlayers: number;
  intelligence: number;
  gameDay: number;
  gameDayOffset: number;
  runProgress: { current: number; total: number } | null;
  lastTickNumber: number;
  bots: BotSummary[];
  recentActivity: ActivityEntry[];
}

interface GoldStats {
  totalEarned: number;
  totalSpent: number;
  netGoldChange: number;
  byProfession: Record<string, { earned: number; spent: number; net: number; botCount: number }>;
  byTown: Record<string, { earned: number; spent: number; net: number }>;
  byLevel: Record<number, { earned: number; spent: number; net: number }>;
  topEarners: { botName: string; profession: string; town: string; earned: number }[];
}

interface BotDayLog {
  tickNumber: number;
  gameDay: number;
  botId: string;
  botName: string;
  race: string;
  class: string;
  profession: string;
  town: string;
  level: number;
  goldStart: number;
  goldEnd: number;
  goldNet: number;
  actionsUsed: number;
  actions: {
    order: number;
    type: string;
    detail: string;
    success: boolean;
    goldDelta: number;
    error?: string;
  }[];
  summary: string;
}

interface SimTickResult {
  tickNumber: number;
  botsProcessed: number;
  actionBreakdown: Record<string, number>;
  successes: number;
  failures: number;
  errors: string[];
  durationMs: number;
  gameDay: number;
  goldStats?: GoldStats;
}

interface SimulationStats {
  raceDistribution: { name: string; count: number }[];
  classDistribution: { name: string; count: number }[];
  professionDistribution: { name: string; count: number }[];
  townDistribution: { name: string; count: number }[];
  levelDistribution: { level: number; count: number }[];
  totalGold: number;
  totalItems: number;
  averageLevel: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROFILE_COLORS: Record<string, string> = {
  gatherer: 'bg-realm-success/20 text-realm-success border-realm-success/30',
  crafter: 'bg-realm-gold-500/20 text-realm-gold-400 border-realm-gold-500/30',
  merchant: 'bg-realm-gold-500/20 text-realm-gold-400 border-realm-gold-500/30',
  warrior: 'bg-realm-danger/20 text-realm-danger border-realm-danger/30',
  politician: 'bg-realm-purple-300/20 text-realm-purple-300 border-realm-purple-300/30',
  socialite: 'bg-realm-teal-300/20 text-realm-teal-300 border-realm-teal-300/30',
  explorer: 'bg-realm-teal-300/20 text-realm-teal-300 border-realm-teal-300/30',
  balanced: 'bg-realm-bg-900/20 text-realm-text-muted border-realm-border/30',
};

const BOT_STATUS_STYLES: Record<string, string> = {
  active: 'text-realm-success bg-realm-success/10 border-realm-success/30',
  idle: 'text-realm-gold-400 bg-realm-gold-400/10 border-realm-gold-400/30',
  paused: 'text-realm-text-muted bg-realm-bg-600/10 border-realm-border/30',
  error: 'text-realm-danger bg-realm-danger/10 border-realm-danger/30',
};

const ACTION_COLORS: Record<string, string> = {
  gather: 'text-realm-success',
  craft: 'text-realm-gold-400',
  sell: 'text-realm-gold-500',
  combat: 'text-realm-danger',
  travel: 'text-realm-purple-300',
  social: 'text-realm-teal-300',
};

const FOCUS_SYSTEMS = [
  'combat',
  'crafting',
  'gathering',
  'market',
  'quests',
  'governance',
  'guilds',
  'travel',
  'social',
] as const;

const QUICK_BOT_COUNTS = [10, 25, 50, 100] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function formatRelativeTime(value: string | number): string {
  if (!value) return '-';
  const ts = typeof value === 'number' ? value : new Date(value).getTime();
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function getActionColorClass(action: string): string {
  const lower = action.toLowerCase();
  for (const [key, cls] of Object.entries(ACTION_COLORS)) {
    if (lower.includes(key)) return cls;
  }
  return 'text-realm-text-secondary';
}

function getIntelligenceLabel(value: number): { label: string; colorClass: string } {
  if (value <= 30) return { label: 'Random', colorClass: 'text-realm-danger' };
  if (value <= 70) return { label: 'Semi-Smart', colorClass: 'text-realm-warning' };
  return { label: 'Optimized', colorClass: 'text-realm-success' };
}

function getActionColor(type: string): string {
  switch (type) {
    case 'gather': return 'text-realm-success';
    case 'craft': return 'text-realm-gold-400';
    case 'sell': case 'buy': return 'text-realm-gold-500';
    case 'combat': return 'text-realm-danger';
    case 'travel': return 'text-realm-purple-300';
    case 'social': case 'message': case 'friend': return 'text-realm-teal-300';
    case 'quest': return 'text-realm-warning';
    default: return 'text-realm-text-muted';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProfileBadge({ profile }: { profile: string }) {
  const style = PROFILE_COLORS[profile] || PROFILE_COLORS.balanced;
  return (
    <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded border ${style}`}>
      {profile}
    </span>
  );
}

function SimStatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; pulse: boolean }> = {
    idle: { className: 'text-realm-text-muted bg-realm-bg-600/10 border-realm-border/30', pulse: false },
    running: { className: 'text-realm-success bg-realm-success/10 border-realm-success/30', pulse: true },
    paused: { className: 'text-realm-gold-400 bg-realm-gold-400/10 border-realm-gold-400/30', pulse: false },
    stopping: { className: 'text-realm-danger bg-realm-danger/10 border-realm-danger/30', pulse: false },
  };
  const c = config[status] || config.idle;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded border ${c.className}`}>
      {c.pulse && <span className="w-2 h-2 rounded-full bg-realm-success animate-pulse" />}
      {status.toUpperCase()}
    </span>
  );
}

function DistributionChart({ data, title }: { data: { name: string; count: number }[]; title: string }) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-4 text-realm-text-muted text-sm">No data</div>
    );
  }
  return (
    <div>
      <h3 className="font-display text-sm text-realm-text-secondary mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            axisLine={{ stroke: '#374151' }}
            tickLine={false}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            axisLine={{ stroke: '#374151' }}
            tickLine={false}
            allowDecimals={false}
          />
          <RechartsTooltip
            contentStyle={{
              backgroundColor: '#1a1625',
              border: '1px solid #2d2640',
              borderRadius: '8px',
              color: '#e5e7eb',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="count" fill="#d4a84b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  danger?: boolean;
}) {
  return (
    <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-realm-text-muted text-sm">{label}</span>
      </div>
      <p className={`text-3xl font-bold ${danger ? 'text-realm-danger' : 'text-realm-gold-400'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-realm-text-muted mt-1">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SimulationDashboardPage() {
  const queryClient = useQueryClient();

  // -- Local state ----------------------------------------------------------
  const [botCount, setBotCount] = useState(25);
  const [intelligence, setIntelligence] = useState(50);
  const [startingLevel, setStartingLevel] = useState(1);
  const [raceDistribution, setRaceDistribution] = useState<'even' | 'realistic'>('realistic');
  const [classDistribution, setClassDistribution] = useState<'even' | 'realistic'>('realistic');
  const [professionDistribution, setProfessionDistribution] = useState<'even' | 'diverse'>('diverse');
  const [selectedTowns, setSelectedTowns] = useState<string[] | 'all'>('all');
  const [runTickCount, setRunTickCount] = useState(5);
  const [lastTickResult, setLastTickResult] = useState<SimTickResult | null>(null);
  const [showBotRoster, setShowBotRoster] = useState(false);
  const [focusSystem, setFocusSystem] = useState<string>(FOCUS_SYSTEMS[0]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [isMultiTickRunning, setIsMultiTickRunning] = useState(false);

  // -- Queries --------------------------------------------------------------

  const {
    data: status,
    isLoading,
    isError,
    error,
    refetch: refetchStatus,
  } = useQuery<SimulationStatus>({
    queryKey: ['admin', 'simulation', 'status'],
    queryFn: async () => (await api.get('/admin/simulation/status')).data,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      if (s === 'running') return 5000;
      if (isMultiTickRunning || query.state.data?.runProgress) return 3000;
      return 30000;
    },
    retry: (failureCount, err: any) => {
      if (err?.response?.status === 429) return failureCount < 3;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });

  const { data: stats } = useQuery<SimulationStats>({
    queryKey: ['admin', 'simulation', 'stats'],
    queryFn: async () => (await api.get('/admin/simulation/stats')).data,
    enabled: (status?.botCount ?? 0) > 0,
    refetchInterval: () => (status?.status === 'running' ? 10000 : 30000),
    retry: (failureCount, err: any) => {
      if (err?.response?.status === 429) return failureCount < 3;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });

  const { data: activityData } = useQuery<{ recentActivity: ActivityEntry[] }>({
    queryKey: ['admin', 'simulation', 'activity'],
    queryFn: async () => (await api.get('/admin/simulation/activity', { params: { count: 50 } })).data,
    refetchInterval: () => (status?.status === 'running' ? 5000 : 30000),
    retry: (failureCount, err: any) => {
      if (err?.response?.status === 429) return failureCount < 3;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });

  const { data: botLogsData } = useQuery<{ logs: BotDayLog[] }>({
    queryKey: ['admin', 'simulation', 'bot-logs', selectedBotId],
    queryFn: async () => (await api.get('/admin/simulation/bot-logs', { params: { botId: selectedBotId } })).data,
    enabled: !!selectedBotId,
  });

  const botLogs = botLogsData?.logs ?? [];

  const { data: townsData } = useQuery<{ id: string; name: string; regionName: string }[]>({
    queryKey: ['admin', 'towns', 'released'],
    queryFn: async () => {
      const raw = (await api.get('/admin/world/towns', { params: { pageSize: '200' } })).data;
      const rawTowns: any[] = raw?.towns ?? raw?.data ?? [];
      return rawTowns
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          regionName: t.regionName ?? t.region?.name ?? '',
        }))
        .sort((a, b) => a.regionName.localeCompare(b.regionName) || a.name.localeCompare(b.name));
    },
  });
  const towns = townsData ?? [];

  // -- Derived data ---------------------------------------------------------

  const isRunning = status?.status === 'running';
  const isPaused = status?.status === 'paused';
  const isIdle = status?.status === 'idle';
  const bots = status?.bots ?? [];
  const recentActivity = activityData?.recentActivity ?? status?.recentActivity ?? [];
  const totalGold = stats?.totalGold ?? 0;
  const raceData = stats?.raceDistribution ?? [];
  const classData = stats?.classDistribution ?? [];
  const professionData = stats?.professionDistribution ?? [];

  const intelligenceInfo = useMemo(() => getIntelligenceLabel(intelligence), [intelligence]);

  // -- Mutations ------------------------------------------------------------

  const seedMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/admin/simulation/seed', {
          count: botCount,
          intelligence,
          startingLevel,
          raceDistribution,
          classDistribution,
          professionDistribution,
          townIds: selectedTowns,
          namePrefix: 'Bot',
        })
      ).data,
    onSuccess: (data: { botsCreated: number }) => {
      toast.success(`Seeded ${data.botsCreated} bots`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to seed'),
  });

  const startMutation = useMutation({
    mutationFn: async () => (await api.post('/admin/simulation/start')).data,
    onSuccess: () => {
      toast.success('Simulation started');
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Failed to start simulation'),
  });

  const pauseMutation = useMutation({
    mutationFn: async () => (await api.post('/admin/simulation/pause')).data,
    onSuccess: () => {
      toast.success('Simulation paused');
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Failed to pause simulation'),
  });

  const resumeMutation = useMutation({
    mutationFn: async () => (await api.post('/admin/simulation/resume')).data,
    onSuccess: () => {
      toast.success('Simulation resumed');
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Failed to resume simulation'),
  });

  const stopMutation = useMutation({
    mutationFn: async () => (await api.post('/admin/simulation/stop')).data,
    onSuccess: () => {
      toast.success('Simulation stopped');
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Failed to stop simulation'),
  });

  const tickMutation = useMutation({
    mutationFn: async () => (await api.post('/admin/simulation/tick')).data as SimTickResult,
    onSuccess: (data) => {
      setLastTickResult(data);
      toast.success(
        `Tick ${data.tickNumber}: ${data.botsProcessed} bots, ${data.successes} success, ${data.failures} failures`,
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Tick failed'),
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      setIsMultiTickRunning(true);
      return (await api.post('/admin/simulation/run', { ticks: runTickCount })).data;
    },
    onSuccess: (data: { ticksRun: number; results: SimTickResult[] }) => {
      setIsMultiTickRunning(false);
      const results = data.results;
      if (results.length > 0) setLastTickResult(results[results.length - 1]);
      toast.success(`Completed ${data.ticksRun} ticks`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) => {
      setIsMultiTickRunning(false);
      toast.error(err.response?.data?.error || 'Run failed');
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async () =>
      (await api.delete('/admin/simulation/cleanup', { data: { confirm: true } })).data,
    onSuccess: (data: { deletedUsers: number; deletedCharacters: number }) => {
      toast.success(
        `Cleaned up ${data.deletedUsers} users, ${data.deletedCharacters} characters`,
      );
      setLastTickResult(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Cleanup failed'),
  });

  const errorStormMutation = useMutation({
    mutationFn: async () =>
      (await api.post('/admin/simulation/error-storm', { durationSeconds: 30 })).data,
    onSuccess: () => {
      toast.success('Error storm triggered (30s)');
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Error storm failed'),
  });

  const focusMutation = useMutation({
    mutationFn: async (system: string) =>
      (await api.post('/admin/simulation/focus', { system, durationSeconds: 60 })).data,
    onSuccess: () => {
      toast.success(`Focusing on ${focusSystem} for 60s`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Focus failed'),
  });

  // -- Computed flags -------------------------------------------------------

  const anyMutationPending =
    seedMutation.isPending ||
    startMutation.isPending ||
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    stopMutation.isPending ||
    cleanupMutation.isPending ||
    tickMutation.isPending ||
    runMutation.isPending;

  // -- Handlers -------------------------------------------------------------

  function handleCleanup() {
    if (
      window.confirm(
        'This will permanently delete ALL test/simulation data (bots, their characters, items, actions). Are you sure?',
      )
    ) {
      cleanupMutation.mutate();
    }
  }

  async function handleExport() {
    try {
      const response = await api.get('/admin/simulation/export', {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simulation-export-day${lastTickResult?.gameDay ?? 0}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Export failed');
    }
  }

  // -- Loading state --------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display text-realm-gold-400">Simulation Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-realm-bg-700 border border-realm-border rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 bg-realm-bg-700 border border-realm-border rounded-xl animate-pulse" />
      </div>
    );
  }

  // -- Error state ----------------------------------------------------------

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display text-realm-gold-400">Simulation Dashboard</h1>
        <div className="bg-realm-bg-700 border border-realm-border rounded-xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-realm-danger mx-auto mb-3" />
          <p className="text-realm-text-secondary mb-4">
            {(error as any)?.response?.data?.error || 'Failed to load simulation status'}
          </p>
          <button
            onClick={() => refetchStatus()}
            className="px-5 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // -- Main render ----------------------------------------------------------

  const currentStatus = status?.status ?? 'idle';

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* 1. Header Row                                                     */}
      {/* ================================================================= */}
      <div className="flex flex-wrap items-center gap-4 pr-20">
        <h1 className="text-2xl font-display text-realm-gold-400">Simulation Dashboard</h1>
        <SimStatusBadge status={currentStatus} />
        {status?.runProgress && (
          <span className="inline-flex items-center gap-1.5 text-sm font-display text-realm-gold-400 bg-realm-gold-500/10 border border-realm-gold-500/30 px-3 py-1 rounded">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Tick {status.runProgress.current} / {status.runProgress.total}
          </span>
        )}
        <div className="flex items-center gap-1.5 text-realm-text-muted text-sm ml-auto">
          <Clock className="w-4 h-4" />
          <span>
            Game Day: <span className="text-realm-gold-400 font-display">{lastTickResult?.gameDay ?? status?.gameDay ?? 0}</span>
          </span>
          {(status?.lastTickNumber ?? 0) > 0 && !status?.runProgress && (
            <span className="ml-3">
              Last Tick: <span className="text-realm-text-secondary font-medium">{status?.lastTickNumber}</span>
            </span>
          )}
          {status?.uptime ? (
            <span className="ml-3">
              Uptime: <span className="text-realm-text-secondary font-medium">{formatUptime(status.uptime)}</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. Seed Controls Panel                                            */}
      {/* ================================================================= */}
      <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5 space-y-4">
        {/* Row 1: Bot Count, Intelligence, Starting Level */}
        <div className="flex flex-wrap items-end gap-6">
          {/* Bot Count */}
          <div className="space-y-1.5">
            <label className="text-realm-text-muted text-xs font-display block">Bot Count</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={500}
                value={botCount}
                onChange={(e) =>
                  setBotCount(Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1)))
                }
                className="w-20 bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-realm-text-secondary text-sm focus:border-realm-gold-500 focus:outline-none"
              />
              <div className="flex gap-1">
                {QUICK_BOT_COUNTS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setBotCount(n)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      botCount === n
                        ? 'bg-realm-gold-500/20 text-realm-gold-400 border-realm-gold-500/40'
                        : 'bg-realm-bg-800 text-realm-text-muted border-realm-border hover:border-realm-gold-500/40 hover:text-realm-text-secondary'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Intelligence Slider */}
          <div className="space-y-1.5 min-w-[200px]">
            <label className="text-realm-text-muted text-xs font-display flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" />
              Intelligence
              <span className={`ml-auto font-bold ${intelligenceInfo.colorClass}`}>
                {intelligence} - {intelligenceInfo.label}
              </span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={intelligence}
              onChange={(e) => setIntelligence(parseInt(e.target.value, 10))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-realm-bg-800 accent-realm-gold-500"
            />
            <div className="flex justify-between text-[10px] text-realm-text-muted">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* Starting Level */}
          <div className="space-y-1.5">
            <label className="text-realm-text-muted text-xs font-display block">Starting Level</label>
            <input
              type="number"
              min={1}
              max={10}
              value={startingLevel}
              onChange={(e) =>
                setStartingLevel(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))
              }
              className="w-20 bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-realm-text-secondary text-sm focus:border-realm-gold-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Row 2: Distribution Radio Groups */}
        <div className="flex flex-wrap items-end gap-8">
          {/* Race Distribution */}
          <fieldset className="space-y-1.5">
            <legend className="text-realm-text-muted text-xs font-display">Race Distribution</legend>
            <div className="flex gap-3">
              {(['even', 'realistic'] as const).map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-1.5 cursor-pointer text-sm text-realm-text-secondary"
                >
                  <input
                    type="radio"
                    name="raceDistribution"
                    value={opt}
                    checked={raceDistribution === opt}
                    onChange={() => setRaceDistribution(opt)}
                    className="accent-realm-gold-500"
                  />
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Class Distribution */}
          <fieldset className="space-y-1.5">
            <legend className="text-realm-text-muted text-xs font-display">Class Distribution</legend>
            <div className="flex gap-3">
              {(['even', 'realistic'] as const).map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-1.5 cursor-pointer text-sm text-realm-text-secondary"
                >
                  <input
                    type="radio"
                    name="classDistribution"
                    value={opt}
                    checked={classDistribution === opt}
                    onChange={() => setClassDistribution(opt)}
                    className="accent-realm-gold-500"
                  />
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Profession Distribution */}
          <fieldset className="space-y-1.5">
            <legend className="text-realm-text-muted text-xs font-display">Profession Distribution</legend>
            <div className="flex gap-3">
              {(['even', 'diverse'] as const).map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-1.5 cursor-pointer text-sm text-realm-text-secondary"
                >
                  <input
                    type="radio"
                    name="professionDistribution"
                    value={opt}
                    checked={professionDistribution === opt}
                    onChange={() => setProfessionDistribution(opt)}
                    className="accent-realm-gold-500"
                  />
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {/* Row 3: Town Selection */}
        <div className="space-y-1.5">
          <label className="text-realm-text-muted text-xs font-display block">Town Selection</label>
          <select
            value={selectedTowns === 'all' ? 'all' : selectedTowns[0] ?? 'all'}
            onChange={(e) => {
              if (e.target.value === 'all') setSelectedTowns('all');
              else setSelectedTowns([e.target.value]);
            }}
            className="bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-realm-text-secondary text-sm focus:border-realm-gold-500 focus:outline-none w-full max-w-md"
          >
            <option value="all">All Towns (distributed by race)</option>
            {towns.map((town) => (
              <option key={town.id} value={town.id}>
                {town.name}{town.regionName ? ` — ${town.regionName}` : ''}
              </option>
            ))}
          </select>
          {selectedTowns !== 'all' && (
            <p className="text-xs text-realm-gold-400">
              All {botCount} bots will spawn in {towns.find(t => t.id === selectedTowns[0])?.name ?? 'selected town'}
            </p>
          )}
        </div>

        {/* Row 4: Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-realm-border/50">
          {/* Seed Bots */}
          <button
            onClick={() => seedMutation.mutate()}
            disabled={anyMutationPending || isRunning}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {seedMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            Seed Bots
          </button>

          {/* Run 1 Tick */}
          <button
            onClick={() => tickMutation.mutate()}
            disabled={anyMutationPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {tickMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Run 1 Tick
          </button>

          {/* Run N Ticks */}
          <div className="inline-flex items-center gap-1.5">
            <button
              onClick={() => runMutation.mutate()}
              disabled={anyMutationPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded-l hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {runMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              Run
            </button>
            <input
              type="number"
              min={1}
              max={100}
              value={runTickCount}
              onChange={(e) =>
                setRunTickCount(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))
              }
              className="w-14 bg-realm-bg-800 border border-realm-border rounded-r px-2 py-2 text-realm-text-secondary text-sm focus:border-realm-gold-500 focus:outline-none text-center"
            />
            <span className="text-realm-text-muted text-xs">ticks</span>
          </div>

          {/* Start */}
          {isIdle && (
            <button
              onClick={() => startMutation.mutate()}
              disabled={anyMutationPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Start
            </button>
          )}

          {/* Pause / Resume toggle */}
          {isRunning && (
            <button
              onClick={() => pauseMutation.mutate()}
              disabled={anyMutationPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pauseMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              Pause
            </button>
          )}
          {isPaused && (
            <button
              onClick={() => resumeMutation.mutate()}
              disabled={anyMutationPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resumeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Resume
            </button>
          )}

          {/* Stop */}
          {(isRunning || isPaused) && (
            <button
              onClick={() => stopMutation.mutate()}
              disabled={anyMutationPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-danger text-realm-text-primary font-display text-sm rounded hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {stopMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Stop
            </button>
          )}

          {/* Export Excel */}
          <button
            onClick={handleExport}
            disabled={(status?.botCount ?? 0) === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Cleanup */}
          <button
            onClick={handleCleanup}
            disabled={anyMutationPending || isRunning}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-danger text-realm-text-primary font-display text-sm rounded hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cleanupMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Cleanup All Bots
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. Overview Stats (4 cards)                                       */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Bot className="w-4 h-4 text-realm-gold-400" />}
          label="Total Bots"
          value={String(status?.botCount ?? 0)}
          sub={`${status?.activeBots ?? 0} active`}
        />
        <StatCard
          icon={<Gauge className="w-4 h-4 text-realm-gold-400" />}
          label={lastTickResult ? `Actions — Tick ${lastTickResult.tickNumber}` : 'Actions This Tick'}
          value={lastTickResult ? String(lastTickResult.botsProcessed) : '-'}
          sub={
            lastTickResult
              ? `${lastTickResult.successes} ok / ${lastTickResult.failures} fail (${lastTickResult.durationMs}ms)`
              : 'Run a tick to see results'
          }
        />
        <StatCard
          icon={<Coins className="w-4 h-4 text-realm-gold-400" />}
          label="Total Gold"
          value={formatNumber(totalGold)}
          sub={stats ? `Avg level: ${stats.averageLevel.toFixed(1)}` : undefined}
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4 text-realm-danger" />}
          label="Errors"
          value={formatNumber(status?.totalErrors ?? 0)}
          sub={`${(status?.totalActions ?? 0) > 0 ? (((status?.totalErrors ?? 0) / (status?.totalActions ?? 1)) * 100).toFixed(1) : '0.0'}% error rate`}
          danger={(status?.totalErrors ?? 0) > 0}
        />
      </div>

      {/* ================================================================= */}
      {/* 4. Distribution Charts + Economy Stats (2 columns)               */}
      {/* ================================================================= */}
      {(status?.botCount ?? 0) > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Distribution Charts (takes 2 columns) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5">
              <DistributionChart data={raceData} title="Race Distribution" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5">
                <DistributionChart data={classData} title="Class Distribution" />
              </div>
              <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5">
                <DistributionChart data={professionData} title="Profession Distribution" />
              </div>
            </div>
          </div>

          {/* Right: Last Tick Summary + Quick Actions */}
          <div className="space-y-4">
            {/* Last Tick Summary */}
            <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5">
              <h3 className="font-display text-sm text-realm-text-secondary mb-3">Last Tick Summary</h3>
              {lastTickResult ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-realm-text-muted">Tick #</span>
                    <span className="text-realm-text-primary font-medium">
                      {lastTickResult.tickNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-realm-text-muted">Bots Processed</span>
                    <span className="text-realm-text-primary font-medium">
                      {lastTickResult.botsProcessed}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-realm-text-muted">Duration</span>
                    <span className="text-realm-text-primary font-medium">
                      {lastTickResult.durationMs}ms
                    </span>
                  </div>

                  {/* Action Breakdown */}
                  <div className="pt-2 border-t border-realm-border/50">
                    <p className="text-realm-text-muted text-xs mb-2">Action Breakdown</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(lastTickResult.actionBreakdown).map(([action, count]) => (
                        <div
                          key={action}
                          className="bg-realm-bg-800 rounded px-2.5 py-1.5 flex items-center justify-between"
                        >
                          <span className={`text-xs ${getActionColorClass(action)}`}>{action}</span>
                          <span className="text-xs text-realm-text-primary font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Errors in last tick */}
                  {lastTickResult.failures > 0 && (
                    <div className="pt-2 border-t border-realm-border/50">
                      <p className="text-realm-danger text-xs font-semibold">
                        {lastTickResult.failures} error{lastTickResult.failures !== 1 ? 's' : ''} in
                        this tick
                      </p>
                      {lastTickResult.errors.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {lastTickResult.errors.slice(0, 5).map((err, i) => (
                            <li
                              key={i}
                              className="text-[10px] text-realm-text-muted truncate"
                              title={err}
                            >
                              {err}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-realm-text-muted text-sm text-center py-4">
                  No tick results yet
                </p>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5 space-y-4">
              <h3 className="font-display text-sm text-realm-text-secondary">Quick Actions</h3>

              {/* Error Storm */}
              <div>
                <p className="text-realm-text-muted text-xs mb-2">
                  Trigger error storm (30s stress test)
                </p>
                <button
                  onClick={() => errorStormMutation.mutate()}
                  disabled={errorStormMutation.isPending || !isRunning}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-realm-danger text-realm-text-primary font-display text-xs rounded hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {errorStormMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Flame className="w-3.5 h-3.5" />
                  )}
                  Error Storm
                </button>
              </div>

              {/* Focus System */}
              <div>
                <p className="text-realm-text-muted text-xs mb-2">
                  Focus bots on system (60s)
                </p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <select
                      value={focusSystem}
                      onChange={(e) => setFocusSystem(e.target.value)}
                      className="appearance-none w-full bg-realm-bg-800 border border-realm-border rounded pl-3 pr-8 py-1.5 text-realm-text-secondary text-sm focus:border-realm-gold-500 focus:outline-none cursor-pointer"
                    >
                      {FOCUS_SYSTEMS.map((sys) => (
                        <option key={sys} value={sys}>
                          {sys.charAt(0).toUpperCase() + sys.slice(1)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-realm-text-muted pointer-events-none" />
                  </div>
                  <button
                    onClick={() => focusMutation.mutate(focusSystem)}
                    disabled={focusMutation.isPending || !isRunning}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-realm-gold-500 text-realm-bg-900 font-display text-xs rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {focusMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Target className="w-3.5 h-3.5" />
                    )}
                    Focus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4b. Gold Economy Stats                                            */}
      {/* ================================================================= */}
      {lastTickResult?.goldStats && (
        <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5">
          <h2 className="font-display text-lg text-realm-gold-400 mb-4">Gold Economy</h2>

          {/* Summary row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-realm-bg-800 rounded-lg p-3 text-center">
              <p className="text-xs text-realm-text-muted">Earned</p>
              <p className="text-lg font-display text-realm-success">+{lastTickResult.goldStats.totalEarned.toLocaleString()}g</p>
            </div>
            <div className="bg-realm-bg-800 rounded-lg p-3 text-center">
              <p className="text-xs text-realm-text-muted">Spent</p>
              <p className="text-lg font-display text-realm-danger">-{lastTickResult.goldStats.totalSpent.toLocaleString()}g</p>
            </div>
            <div className="bg-realm-bg-800 rounded-lg p-3 text-center">
              <p className="text-xs text-realm-text-muted">Net</p>
              <p className={`text-lg font-display ${lastTickResult.goldStats.netGoldChange >= 0 ? 'text-realm-success' : 'text-realm-danger'}`}>
                {lastTickResult.goldStats.netGoldChange >= 0 ? '+' : ''}{lastTickResult.goldStats.netGoldChange.toLocaleString()}g
              </p>
            </div>
          </div>

          {/* By Profession table */}
          {Object.keys(lastTickResult.goldStats.byProfession).length > 0 && (
            <>
              <h3 className="font-display text-sm text-realm-text-secondary mb-2">By Profession</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-realm-text-muted text-xs border-b border-realm-border">
                      <th className="text-left py-1 px-2">Profession</th>
                      <th className="text-right py-1 px-2">Bots</th>
                      <th className="text-right py-1 px-2">Earned</th>
                      <th className="text-right py-1 px-2">Spent</th>
                      <th className="text-right py-1 px-2">Net/Bot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(lastTickResult.goldStats.byProfession)
                      .sort(([, a], [, b]) => b.net - a.net)
                      .map(([prof, data]) => (
                        <tr key={prof} className="text-realm-text-secondary border-t border-realm-border/30">
                          <td className="py-1 px-2">{prof}</td>
                          <td className="text-right py-1 px-2">{data.botCount}</td>
                          <td className="text-right py-1 px-2 text-realm-success">+{data.earned}g</td>
                          <td className="text-right py-1 px-2 text-realm-danger">-{data.spent}g</td>
                          <td className="text-right py-1 px-2">
                            {data.botCount > 0 ? Math.round(data.net / data.botCount) : 0}g
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 5. Activity Log                                                   */}
      {/* ================================================================= */}
      <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-realm-gold-400" />
            <h2 className="font-display text-realm-text-primary text-lg">Activity Log</h2>
          </div>
          <span className="text-realm-text-muted text-[10px]">
            Auto-refreshes every {isRunning ? '5s' : '30s'} -- showing last 50 entries
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <div className="text-center py-10 text-realm-text-muted text-sm">
            No recent activity. Seed bots and run a tick to see actions here.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full min-w-[800px]">
              <thead className="sticky top-0 bg-realm-bg-700">
                <tr className="border-b border-realm-border text-left">
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Time</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Bot</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Action</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display w-10">Status</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Detail</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display text-right">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-realm-border/50">
                {recentActivity.map((entry, idx) => (
                  <tr
                    key={`${entry.timestamp}-${entry.characterId}-${idx}`}
                    className={`hover:bg-realm-bg-800/30 transition-colors ${
                      entry.success ? '' : 'bg-realm-danger/5'
                    }`}
                  >
                    <td className="px-3 py-2 text-xs text-realm-text-secondary whitespace-nowrap">
                      {formatRelativeTime(entry.timestamp)}
                    </td>
                    <td className="px-3 py-2 text-xs text-realm-text-primary font-medium">
                      {entry.botName}
                    </td>
                    <td className={`px-3 py-2 text-xs font-mono ${getActionColorClass(entry.action)}`}>
                      {entry.action}
                    </td>
                    <td className="px-3 py-2">
                      {entry.success ? (
                        <CheckCircle2 className="w-4 h-4 text-realm-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-realm-danger" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-realm-text-secondary max-w-[250px] truncate">
                      {entry.detail}
                    </td>
                    <td className="px-3 py-2 text-xs text-realm-text-muted text-right whitespace-nowrap">
                      {entry.durationMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* 6. Bot Roster (collapsible)                                       */}
      {/* ================================================================= */}
      <div className="bg-realm-bg-700 rounded-xl border border-realm-border">
        <button
          onClick={() => setShowBotRoster((prev) => !prev)}
          className="w-full flex items-center gap-2 p-5 text-left hover:bg-realm-bg-800/30 transition-colors rounded-xl"
        >
          <Users className="w-5 h-5 text-realm-gold-400" />
          <h2 className="font-display text-realm-text-primary text-lg">Bot Roster</h2>
          <span className="text-realm-text-muted text-xs ml-2">({bots.length} bots)</span>
          <span className="ml-auto">
            {showBotRoster ? (
              <ChevronDown className="w-5 h-5 text-realm-text-muted" />
            ) : (
              <ChevronRight className="w-5 h-5 text-realm-text-muted" />
            )}
          </span>
        </button>

        {showBotRoster && (
          <div className="px-5 pb-5">
            {bots.length === 0 ? (
              <div className="text-center py-10 text-realm-text-muted text-sm">
                No bots seeded yet. Use the Seed Bots button above to create test bots.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-realm-border text-left">
                      <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Name</th>
                      <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Race</th>
                      <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Class</th>
                      <th className="px-3 py-2 text-realm-text-muted text-xs font-display text-right">
                        Level
                      </th>
                      <th className="px-3 py-2 text-realm-text-muted text-xs font-display text-right">
                        Gold
                      </th>
                      <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Profile</th>
                      <th className="px-3 py-2 text-realm-text-muted text-xs font-display">
                        Last Action
                      </th>
                      <th className="px-3 py-2 text-realm-text-muted text-xs font-display text-right">
                        Actions
                      </th>
                      <th className="px-3 py-2 text-realm-text-muted text-xs font-display text-right">
                        Errors
                      </th>
                      <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-realm-border/50">
                    {bots.map((bot) => (
                      <tr
                        key={bot.characterId}
                        className="hover:bg-realm-bg-800/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedBotId(selectedBotId === bot.characterId ? null : bot.characterId)}
                      >
                        <td className="px-3 py-2 text-xs text-realm-text-primary font-medium">
                          {bot.characterName}
                        </td>
                        <td className="px-3 py-2 text-xs text-realm-text-secondary">{bot.race}</td>
                        <td className="px-3 py-2 text-xs text-realm-text-secondary">{bot.class}</td>
                        <td className="px-3 py-2 text-xs text-realm-text-secondary text-right">
                          {bot.level}
                        </td>
                        <td className="px-3 py-2 text-xs text-realm-gold-400 text-right font-mono">
                          {bot.gold.toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <ProfileBadge profile={bot.profile} />
                        </td>
                        <td className="px-3 py-2 text-xs text-realm-text-secondary">
                          <div className="flex flex-col">
                            <span className="truncate max-w-[150px]">{bot.lastAction || '-'}</span>
                            {bot.lastActionAt ? (
                              <span className="text-realm-text-muted text-[10px]">
                                {formatRelativeTime(bot.lastActionAt)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-realm-text-secondary text-right">
                          {bot.actionsCompleted}
                        </td>
                        <td className="px-3 py-2 text-xs text-right">
                          <span
                            className={
                              bot.errorsTotal > 0 ? 'text-realm-danger' : 'text-realm-text-muted'
                            }
                          >
                            {bot.errorsTotal}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded border ${
                              BOT_STATUS_STYLES[bot.status] || BOT_STATUS_STYLES.idle
                            }`}
                          >
                            {bot.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Per-Bot Detail View */}
            {selectedBotId && (
              <div className="bg-realm-bg-700 rounded-xl border border-realm-gold-500/30 p-5 mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-display text-lg text-realm-gold-400">
                    {status?.bots?.find(b => b.characterId === selectedBotId)?.characterName ?? 'Bot'} — Daily History
                  </h3>
                  <button
                    onClick={() => setSelectedBotId(null)}
                    className="text-realm-text-muted hover:text-realm-text-secondary text-lg"
                  >
                    ✕
                  </button>
                </div>

                {botLogs.length === 0 ? (
                  <p className="text-realm-text-muted text-sm text-center py-4">No logs yet. Run some ticks first.</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {botLogs.map((day) => (
                      <div key={day.tickNumber} className="bg-realm-bg-800 rounded-lg p-3">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-realm-gold-400 font-display">Day {day.gameDay} (Tick {day.tickNumber})</span>
                          <span className="text-realm-text-muted text-xs">{day.summary}</span>
                          <span className={`font-display ${day.goldNet >= 0 ? 'text-realm-success' : 'text-realm-danger'}`}>
                            {day.goldNet >= 0 ? '+' : ''}{day.goldNet}g
                          </span>
                        </div>

                        <div className="space-y-1">
                          {day.actions.map((action) => (
                            <div key={action.order} className="flex items-center text-xs text-realm-text-secondary gap-2">
                              <span className="w-5 text-realm-text-muted">{action.order}.</span>
                              <span className={`w-14 font-medium ${getActionColor(action.type)}`}>{action.type}</span>
                              <span className="flex-grow truncate">{action.detail}</span>
                              {action.goldDelta !== 0 && (
                                <span className={`whitespace-nowrap ${action.goldDelta > 0 ? 'text-realm-success' : 'text-realm-danger'}`}>
                                  {action.goldDelta > 0 ? '+' : ''}{action.goldDelta}g
                                </span>
                              )}
                              {!action.success && <span className="text-realm-danger">✗</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
