import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Loader2,
  Play,
  Send,
  Activity,
  Server,
  Database,
  Clock,
  Cpu,
  HardDrive,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import ErrorMessage from '../../components/ui/ErrorMessage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ServerHealth {
  status: string;
  uptime: number;
  uptimeFormatted: string;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  nodeVersion: string;
  dbStatus: string;
  redisStatus?: string;
  timestamp: string;
}

interface TickResult {
  message: string;
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function StatusBadge({ status }: { status: string }) {
  const isOk = status === 'ok' || status === 'connected' || status === 'healthy';
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded ${
        isOk
          ? 'text-green-400 bg-green-400/10 border border-green-400/30'
          : 'text-blood-light bg-blood-dark/20 border border-blood-dark/40'
      }`}
    >
      {isOk ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminToolsPage() {
  // Broadcast form state
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // Daily tick mutation
  const tickMutation = useMutation<TickResult>({
    mutationFn: async () => {
      return (await api.post('/admin/tools/tick')).data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Daily tick completed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Daily tick failed');
    },
  });

  // Broadcast mutation
  const broadcastMutation = useMutation({
    mutationFn: async ({ title, message }: { title: string; message: string }) => {
      return (await api.post('/admin/tools/broadcast', { title, message })).data;
    },
    onSuccess: () => {
      toast.success('Broadcast sent successfully');
      setBroadcastTitle('');
      setBroadcastMessage('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to send broadcast');
    },
  });

  // Server health query (auto-refresh every 10s)
  const {
    data: health,
    isLoading: healthLoading,
    isError: healthError,
    error: healthErr,
    refetch: healthRefetch,
  } = useQuery<ServerHealth>({
    queryKey: ['admin', 'tools', 'health'],
    queryFn: async () => (await api.get('/admin/tools/health')).data,
    refetchInterval: 10000,
  });

  const handleTick = useCallback(() => {
    tickMutation.mutate();
  }, [tickMutation]);

  const handleBroadcast = useCallback(() => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error('Please fill in both title and message');
      return;
    }
    broadcastMutation.mutate({ title: broadcastTitle.trim(), message: broadcastMessage.trim() });
  }, [broadcastTitle, broadcastMessage, broadcastMutation]);

  return (
    <div>
      <h1 className="text-2xl font-display text-primary-400 mb-6">Admin Tools</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trigger Daily Tick */}
        <div className="bg-dark-300 border border-dark-50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Play className="w-5 h-5 text-primary-400" />
            <h2 className="font-display text-parchment-200 text-lg">Trigger Daily Tick</h2>
          </div>
          <p className="text-parchment-500 text-sm mb-4">
            Manually trigger the daily game tick. This processes resource respawns, building upkeep,
            food consumption, item durability decay, and other daily maintenance tasks.
          </p>
          <button
            onClick={handleTick}
            disabled={tickMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {tickMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {tickMutation.isPending ? 'Running Tick...' : 'Run Daily Tick'}
          </button>
          {tickMutation.isSuccess && (
            <p className="text-green-400 text-xs mt-3">
              Tick completed successfully.
            </p>
          )}
          {tickMutation.isError && (
            <p className="text-blood-light text-xs mt-3">
              Tick failed. Check server logs for details.
            </p>
          )}
        </div>

        {/* System Broadcast */}
        <div className="bg-dark-300 border border-dark-50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-5 h-5 text-primary-400" />
            <h2 className="font-display text-parchment-200 text-lg">System Broadcast</h2>
          </div>
          <p className="text-parchment-500 text-sm mb-4">
            Send a system-wide notification to all connected players.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-parchment-500 text-xs mb-1 block">Title</label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="Announcement title..."
                className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm placeholder:text-parchment-500/50 focus:border-primary-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-parchment-500 text-xs mb-1 block">Message</label>
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Write your announcement..."
                rows={4}
                className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm placeholder:text-parchment-500/50 focus:border-primary-400 focus:outline-none resize-none"
              />
            </div>
            <button
              onClick={handleBroadcast}
              disabled={broadcastMutation.isPending || !broadcastTitle.trim() || !broadcastMessage.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {broadcastMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {broadcastMutation.isPending ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        </div>

        {/* Server Health */}
        <div className="bg-dark-300 border border-dark-50 rounded-lg p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-400" />
              <h2 className="font-display text-parchment-200 text-lg">Server Health</h2>
            </div>
            <span className="text-parchment-500 text-[10px]">Auto-refreshes every 10s</span>
          </div>

          {healthLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 bg-dark-500 rounded" />
              ))}
            </div>
          ) : healthError ? (
            <ErrorMessage error={healthErr} onRetry={healthRefetch} />
          ) : health ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status */}
              <div className="bg-dark-500/50 border border-dark-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-3.5 h-3.5 text-parchment-500" />
                  <span className="text-parchment-500 text-xs">Status</span>
                </div>
                <StatusBadge status={health.status} />
              </div>

              {/* Uptime */}
              <div className="bg-dark-500/50 border border-dark-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5 text-parchment-500" />
                  <span className="text-parchment-500 text-xs">Uptime</span>
                </div>
                <p className="text-parchment-200 text-sm font-display">
                  {health.uptimeFormatted || formatUptime(health.uptime)}
                </p>
              </div>

              {/* Node Version */}
              <div className="bg-dark-500/50 border border-dark-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-3.5 h-3.5 text-parchment-500" />
                  <span className="text-parchment-500 text-xs">Node.js</span>
                </div>
                <p className="text-parchment-200 text-sm font-display">{health.nodeVersion}</p>
              </div>

              {/* DB Status */}
              <div className="bg-dark-500/50 border border-dark-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-3.5 h-3.5 text-parchment-500" />
                  <span className="text-parchment-500 text-xs">Database</span>
                </div>
                <StatusBadge status={health.dbStatus} />
              </div>

              {/* Memory RSS */}
              <div className="bg-dark-500/50 border border-dark-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-3.5 h-3.5 text-parchment-500" />
                  <span className="text-parchment-500 text-xs">Memory (RSS)</span>
                </div>
                <p className="text-parchment-200 text-sm font-display">
                  {formatBytes(health.memory.rss)}
                </p>
              </div>

              {/* Heap Used */}
              <div className="bg-dark-500/50 border border-dark-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="w-3.5 h-3.5 text-parchment-500" />
                  <span className="text-parchment-500 text-xs">Heap Used</span>
                </div>
                <p className="text-parchment-200 text-sm font-display">
                  {formatBytes(health.memory.heapUsed)} / {formatBytes(health.memory.heapTotal)}
                </p>
              </div>

              {/* Redis Status */}
              {health.redisStatus && (
                <div className="bg-dark-500/50 border border-dark-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-3.5 h-3.5 text-parchment-500" />
                    <span className="text-parchment-500 text-xs">Redis</span>
                  </div>
                  <StatusBadge status={health.redisStatus} />
                </div>
              )}

              {/* Last Checked */}
              <div className="bg-dark-500/50 border border-dark-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5 text-parchment-500" />
                  <span className="text-parchment-500 text-xs">Last Checked</span>
                </div>
                <p className="text-parchment-200 text-sm font-display">
                  {new Date(health.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  return parts.join(' ');
}
