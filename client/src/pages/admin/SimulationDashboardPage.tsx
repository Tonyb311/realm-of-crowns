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
  TrendingUp,
  CheckCircle2,
  XCircle,
  Target,
  FlameKindling,
  ChevronDown,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
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
  lastAction: string;
  lastActionAt: string;
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
  bots: BotSummary[];
  recentActivity: ActivityEntry[];
}

interface SeedResponse {
  botsCreated: number;
  bots: BotSummary[];
}

interface ActivityResponse {
  recentActivity: ActivityEntry[];
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

function formatRelativeTime(iso: string): string {
  if (!iso) return '-';
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SimulationDashboardPage() {
  const queryClient = useQueryClient();

  // Local state
  const [botCount, setBotCount] = useState(10);
  const [focusSystem, setFocusSystem] = useState<string>(FOCUS_SYSTEMS[0]);

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

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
      return s === 'running' ? 3000 : 10000;
    },
  });

  const { data: activityData } = useQuery<ActivityResponse>({
    queryKey: ['admin', 'simulation', 'activity'],
    queryFn: async () => (await api.get('/admin/simulation/activity', { params: { count: 50 } })).data,
    refetchInterval: (query) => {
      // Match the status polling interval
      return status?.status === 'running' ? 3000 : 10000;
    },
  });

  const isRunning = status?.status === 'running';
  const isPaused = status?.status === 'paused';
  const isIdle = status?.status === 'idle';

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const seedMutation = useMutation<SeedResponse>({
    mutationFn: async () =>
      (await api.post('/admin/simulation/seed', { botCount })).data,
    onSuccess: (data) => {
      toast.success(`Seeded ${data.botsCreated} bots successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to seed bots');
    },
  });

  const startMutation = useMutation({
    mutationFn: async () => (await api.post('/admin/simulation/start')).data,
    onSuccess: () => {
      toast.success('Simulation started');
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to start simulation');
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => (await api.post('/admin/simulation/pause')).data,
    onSuccess: () => {
      toast.success('Simulation paused');
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to pause simulation');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => (await api.post('/admin/simulation/resume')).data,
    onSuccess: () => {
      toast.success('Simulation resumed');
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to resume simulation');
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => (await api.post('/admin/simulation/stop')).data,
    onSuccess: () => {
      toast.success('Simulation stopped');
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to stop simulation');
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async () =>
      (await api.delete('/admin/simulation/cleanup', { data: { confirm: true } })).data,
    onSuccess: () => {
      toast.success('All test data cleaned up');
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Cleanup failed');
    },
  });

  const errorStormMutation = useMutation({
    mutationFn: async () =>
      (await api.post('/admin/simulation/error-storm', { durationSeconds: 30 })).data,
    onSuccess: () => {
      toast.success('Error storm triggered (30s)');
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Error storm failed');
    },
  });

  const focusMutation = useMutation({
    mutationFn: async (system: string) =>
      (await api.post('/admin/simulation/focus', { system, durationSeconds: 60 })).data,
    onSuccess: () => {
      toast.success(`Focusing on ${focusSystem} for 60s`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'simulation'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Focus failed');
    },
  });

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const errorRate = useMemo(() => {
    if (!status || status.totalActions === 0) return '0.0';
    return ((status.totalErrors / status.totalActions) * 100).toFixed(1);
  }, [status]);

  const recentActivity = activityData?.recentActivity || status?.recentActivity || [];

  const anyMutationPending =
    seedMutation.isPending ||
    startMutation.isPending ||
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    stopMutation.isPending ||
    cleanupMutation.isPending;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleCleanup() {
    if (window.confirm('This will permanently delete ALL test/simulation data (bots, their characters, items, actions). Are you sure?')) {
      cleanupMutation.mutate();
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-display text-realm-gold-400 mb-6">Simulation Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-realm-bg-700 border border-realm-border rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-realm-bg-700 border border-realm-border rounded-xl animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <h1 className="text-2xl font-display text-realm-gold-400 mb-6">Simulation Dashboard</h1>
        <div className="bg-realm-bg-700 border border-realm-border rounded-xl p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-realm-danger mx-auto mb-3" />
          <p className="text-realm-text-secondary mb-4">
            {(error as any)?.response?.data?.message || 'Failed to load simulation status'}
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

  return (
    <div>
      <h1 className="text-2xl font-display text-realm-gold-400 mb-6">Simulation Dashboard</h1>

      {/* ------------------------------------------------------------------- */}
      {/* 1. Control Panel                                                     */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status badge */}
          <SimStatusBadge status={status?.status || 'idle'} />

          {/* Bot count input */}
          <div className="flex items-center gap-2">
            <label className="text-realm-text-muted text-xs whitespace-nowrap">Bots:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={botCount}
              onChange={(e) => setBotCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-20 bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-realm-text-secondary text-sm focus:border-realm-gold-500 focus:outline-none"
            />
          </div>

          {/* Seed */}
          <button
            onClick={() => seedMutation.mutate()}
            disabled={anyMutationPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Seed
          </button>

          {/* Start */}
          <button
            onClick={() => startMutation.mutate()}
            disabled={anyMutationPending || isRunning}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {startMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Start
          </button>

          {/* Pause / Resume toggle */}
          {isPaused ? (
            <button
              onClick={() => resumeMutation.mutate()}
              disabled={anyMutationPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resumeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Resume
            </button>
          ) : (
            <button
              onClick={() => pauseMutation.mutate()}
              disabled={anyMutationPending || !isRunning}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-gold-500 text-realm-text-primary font-display text-sm rounded hover:bg-realm-gold-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pauseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
              Pause
            </button>
          )}

          {/* Stop */}
          <button
            onClick={() => stopMutation.mutate()}
            disabled={anyMutationPending || isIdle}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-danger hover:bg-realm-danger text-realm-text-primary font-display text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {stopMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
            Stop
          </button>

          {/* Cleanup */}
          <button
            onClick={handleCleanup}
            disabled={anyMutationPending || isRunning}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-danger hover:bg-realm-danger text-realm-text-primary font-display text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cleanupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Cleanup
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. Stats Cards                                                       */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {/* Active Bots */}
        <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-realm-gold-400" />
            <span className="text-realm-text-muted text-sm">Active Bots</span>
          </div>
          <p className="text-3xl font-bold text-realm-gold-400">{status?.activeBots ?? 0}</p>
        </div>

        {/* Total Actions */}
        <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-realm-gold-400" />
            <span className="text-realm-text-muted text-sm">Total Actions</span>
          </div>
          <p className="text-3xl font-bold text-realm-gold-400">{(status?.totalActions ?? 0).toLocaleString()}</p>
        </div>

        {/* Actions/Min */}
        <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-realm-gold-400" />
            <span className="text-realm-text-muted text-sm">Actions/Min</span>
          </div>
          <p className="text-3xl font-bold text-realm-gold-400">{(status?.actionsPerMinute ?? 0).toFixed(1)}</p>
        </div>

        {/* Errors */}
        <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-realm-danger" />
            <span className="text-realm-text-muted text-sm">Errors</span>
          </div>
          <p className="text-3xl font-bold text-realm-gold-400">{(status?.totalErrors ?? 0).toLocaleString()}</p>
        </div>

        {/* Error Rate */}
        <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-realm-gold-400" />
            <span className="text-realm-text-muted text-sm">Error Rate %</span>
          </div>
          <p className="text-3xl font-bold text-realm-gold-400">{errorRate}%</p>
        </div>

        {/* Uptime */}
        <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-realm-gold-400" />
            <span className="text-realm-text-muted text-sm">Uptime</span>
          </div>
          <p className="text-3xl font-bold text-realm-gold-400">{formatUptime(status?.uptime ?? 0)}</p>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. Activity Feed                                                     */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-realm-gold-400" />
            <h2 className="font-display text-realm-text-primary text-lg">Activity Feed</h2>
          </div>
          <span className="text-realm-text-muted text-[10px]">
            Auto-refreshes every {isRunning ? '3s' : '10s'}
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <div className="text-center py-10 text-realm-text-muted text-sm">
            No recent activity. Seed bots and start the simulation to see actions here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-realm-border text-left">
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Time</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Bot</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Profile</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Action</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display w-10">OK</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Detail</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display text-right">Duration</th>
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
                    <td className="px-3 py-2">
                      <ProfileBadge profile={entry.profile} />
                    </td>
                    <td className="px-3 py-2 text-xs text-realm-text-secondary font-mono">
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

      {/* ------------------------------------------------------------------- */}
      {/* 4. Bot Roster Table                                                  */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-realm-gold-400" />
          <h2 className="font-display text-realm-text-primary text-lg">Bot Roster</h2>
          {status?.bots && (
            <span className="text-realm-text-muted text-xs ml-auto">{status.bots.length} bots</span>
          )}
        </div>

        {!status?.bots || status.bots.length === 0 ? (
          <div className="text-center py-10 text-realm-text-muted text-sm">
            No bots seeded yet. Use the Seed button above to create test bots.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-realm-border text-left">
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Name</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Profile</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Race</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Class</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display text-right">Level</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display text-right">Gold</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Last Action</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display text-right">Errors</th>
                  <th className="px-3 py-2 text-realm-text-muted text-xs font-display">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-realm-border/50">
                {status.bots.map((bot) => (
                  <tr key={bot.characterId} className="hover:bg-realm-bg-800/30 transition-colors">
                    <td className="px-3 py-2 text-xs text-realm-text-primary font-medium">
                      {bot.characterName}
                    </td>
                    <td className="px-3 py-2">
                      <ProfileBadge profile={bot.profile} />
                    </td>
                    <td className="px-3 py-2 text-xs text-realm-text-secondary">{bot.race}</td>
                    <td className="px-3 py-2 text-xs text-realm-text-secondary">{bot.class}</td>
                    <td className="px-3 py-2 text-xs text-realm-text-secondary text-right">{bot.level}</td>
                    <td className="px-3 py-2 text-xs text-realm-gold-400 text-right font-mono">
                      {bot.gold.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-xs text-realm-text-secondary">
                      <div className="flex flex-col">
                        <span className="truncate max-w-[150px]">{bot.lastAction || '-'}</span>
                        {bot.lastActionAt && (
                          <span className="text-realm-text-muted text-[10px]">
                            {formatRelativeTime(bot.lastActionAt)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-right">
                      <span className={bot.errorsTotal > 0 ? 'text-realm-danger' : 'text-realm-text-muted'}>
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
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 5. Quick Actions                                                     */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-realm-bg-700 rounded-xl border border-realm-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-realm-gold-400" />
          <h2 className="font-display text-realm-text-primary text-lg">Quick Actions</h2>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          {/* Error Storm */}
          <div>
            <p className="text-realm-text-muted text-xs mb-2">
              Trigger an error storm for 30 seconds to stress-test error handling.
            </p>
            <button
              onClick={() => errorStormMutation.mutate()}
              disabled={errorStormMutation.isPending || !isRunning}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-danger hover:bg-realm-danger text-realm-text-primary font-display text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {errorStormMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FlameKindling className="w-4 h-4" />
              )}
              Error Storm (30s)
            </button>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-10 bg-realm-bg-600" />

          {/* Focus System */}
          <div>
            <p className="text-realm-text-muted text-xs mb-2">
              Focus all bots on a single system for 60 seconds.
            </p>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={focusSystem}
                  onChange={(e) => setFocusSystem(e.target.value)}
                  className="appearance-none bg-realm-bg-800 border border-realm-border rounded pl-3 pr-8 py-2 text-realm-text-secondary text-sm focus:border-realm-gold-500 focus:outline-none cursor-pointer"
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
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {focusMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Target className="w-4 h-4" />
                )}
                Focus (60s)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
