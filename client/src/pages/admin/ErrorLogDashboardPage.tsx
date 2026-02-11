import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  CheckCircle2,
  XCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
  RefreshCw,
  X,
  Clock,
  Activity,
  ShieldAlert,
  Eye,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import { SkeletonCard, SkeletonTable } from '../../components/ui/LoadingSkeleton';
import ErrorMessage from '../../components/ui/ErrorMessage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  category: string;
  endpoint: string;
  statusCode: number;
  message: string;
  detail?: string | null;
  userId?: string | null;
  characterId?: string | null;
  requestBody?: Record<string, unknown> | null;
  userAgent?: string | null;
  ip?: string | null;
  resolved: boolean;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  notes?: string | null;
}

interface LogsResponse {
  logs: ErrorLog[];
  total: number;
  page: number;
  pageSize: number;
}

interface StatsResponse {
  counts: { last24h: number; last7d: number; last30d: number };
  unresolved: number;
  byLevel: { level: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byStatusCode: { statusCode: number; count: number }[];
  topMessages: { message: string; count: number }[];
  hourlyTrend: { hour: string; count: number }[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 25;

const LEVEL_STYLES: Record<string, { bg: string; text: string; icon: typeof AlertCircle }> = {
  ERROR: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', icon: XCircle },
  WARN: { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400', icon: AlertTriangle },
  INFO: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', icon: Info },
  DEBUG: { bg: 'bg-gray-500/10 border-gray-500/30', text: 'text-gray-400', icon: Bug },
};

const BAR_COLORS: Record<string, string> = {
  ERROR: '#EF4444',
  WARN: '#EAB308',
  INFO: '#3B82F6',
  DEBUG: '#6B7280',
};

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function LevelBadge({ level }: { level: string }) {
  const style = LEVEL_STYLES[level] || LEVEL_STYLES.INFO;
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${style.bg} ${style.text}`}
    >
      <Icon className="w-3 h-3" />
      {level}
    </span>
  );
}

function StatusCodeBadge({ code }: { code: number }) {
  const color =
    code >= 500
      ? 'text-red-400 bg-red-400/10 border-red-400/30'
      : code >= 400
        ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
        : 'text-green-400 bg-green-400/10 border-green-400/30';
  return (
    <span className={`inline-flex text-xs font-mono font-semibold px-2 py-0.5 rounded border ${color}`}>
      {code}
    </span>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatHour(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ErrorLogDashboardPage() {
  const queryClient = useQueryClient();

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('');
  const [page, setPage] = useState(1);

  // Row expansion
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modals
  const [resolveLog, setResolveLog] = useState<ErrorLog | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [showPurge, setShowPurge] = useState(false);
  const [purgeDays, setPurgeDays] = useState(30);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    error: statsErr,
    refetch: refetchStats,
  } = useQuery<StatsResponse>({
    queryKey: ['admin', 'error-logs', 'stats'],
    queryFn: async () => (await api.get('/admin/error-logs/stats')).data,
    refetchInterval: 30000,
  });

  const {
    data: logsData,
    isLoading: logsLoading,
    isError: logsError,
    error: logsErr,
    refetch: refetchLogs,
  } = useQuery<LogsResponse>({
    queryKey: ['admin', 'error-logs', debouncedSearch, levelFilter, categoryFilter, resolvedFilter, page],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        pageSize: String(PAGE_SIZE),
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (levelFilter) params.level = levelFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (resolvedFilter) params.resolved = resolvedFilter;
      return (await api.get('/admin/error-logs', { params })).data;
    },
  });

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) =>
      (await api.patch(`/admin/error-logs/${id}/resolve`, { notes })).data,
    onSuccess: () => {
      toast.success('Error log resolved');
      queryClient.invalidateQueries({ queryKey: ['admin', 'error-logs'] });
      setResolveLog(null);
      setResolveNotes('');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to resolve'),
  });

  const unresolveMutation = useMutation({
    mutationFn: async (id: string) =>
      (await api.patch(`/admin/error-logs/${id}/unresolve`)).data,
    onSuccess: () => {
      toast.success('Error log reopened');
      queryClient.invalidateQueries({ queryKey: ['admin', 'error-logs'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to unresolve'),
  });

  const purgeMutation = useMutation({
    mutationFn: async (days: number) =>
      (await api.delete('/admin/error-logs/purge', { data: { olderThanDays: days } })).data,
    onSuccess: (data: { deleted: number }) => {
      toast.success(`Purged ${data.deleted} old log(s)`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'error-logs'] });
      setShowPurge(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Purge failed'),
  });

  // -------------------------------------------------------------------------
  // Socket.io real-time updates
  // -------------------------------------------------------------------------

  const handleRealtimeError = useCallback(
    (payload: { id: string; level: string; message: string }) => {
      toast(`New ${payload.level}: ${payload.message}`, {
        icon: payload.level === 'ERROR' ? '🔴' : payload.level === 'WARN' ? '🟡' : 'ℹ️',
        duration: 4000,
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'error-logs'] });
    },
    [queryClient],
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.on('admin:error-log', handleRealtimeError);
    return () => {
      socket.off('admin:error-log', handleRealtimeError);
    };
  }, [handleRealtimeError]);

  // -------------------------------------------------------------------------
  // Render — Loading / Error states
  // -------------------------------------------------------------------------

  if (statsLoading && logsLoading) {
    return (
      <div>
        <h1 className="text-2xl font-display text-primary-400 mb-6">Error Logs</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <SkeletonTable />
      </div>
    );
  }

  if (statsError && logsError) {
    return (
      <div>
        <h1 className="text-2xl font-display text-primary-400 mb-6">Error Logs</h1>
        <ErrorMessage error={statsErr || logsErr} onRetry={() => { refetchStats(); refetchLogs(); }} />
      </div>
    );
  }

  const totalPages = logsData ? Math.ceil(logsData.total / PAGE_SIZE) : 1;

  // Unique categories from stats for the filter dropdown
  const categories = stats?.byCategory?.map((c) => c.category) || [];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display text-primary-400">Error Logs</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { refetchStats(); refetchLogs(); }}
            className="p-2 border border-dark-50 rounded text-parchment-400 hover:bg-dark-300 hover:text-primary-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowPurge(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-red-500/30 text-red-400 text-sm font-display rounded hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Purge Old
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-parchment-500 text-xs">Errors (24h)</span>
            </div>
            <p className="text-2xl font-display text-parchment-200">{stats.counts.last24h}</p>
          </div>
          <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-4 h-4 text-yellow-400" />
              <span className="text-parchment-500 text-xs">Unresolved</span>
            </div>
            <p className="text-2xl font-display text-parchment-200">{stats.unresolved}</p>
          </div>
          <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-parchment-500 text-xs">Last 7 Days</span>
            </div>
            <p className="text-2xl font-display text-parchment-200">{stats.counts.last7d}</p>
          </div>
          <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary-400" />
              <span className="text-parchment-500 text-xs">Last 30 Days</span>
            </div>
            <p className="text-2xl font-display text-parchment-200">{stats.counts.last30d}</p>
          </div>
        </div>
      )}

      {/* Hourly Trend Chart */}
      {stats?.hourlyTrend && stats.hourlyTrend.length > 0 && (
        <div className="bg-dark-300 border border-dark-50 rounded-lg p-5 mb-6">
          <h2 className="font-display text-parchment-200 text-lg mb-4">Error Rate (Last 24 Hours)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.hourlyTrend} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,154,128,0.1)" />
              <XAxis
                dataKey="hour"
                tick={{ fill: '#A89A80', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(168,154,128,0.2)' }}
                tickFormatter={formatHour}
              />
              <YAxis
                tick={{ fill: '#A89A80', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(168,154,128,0.2)' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1A1A2E',
                  border: '1px solid rgba(168,154,128,0.3)',
                  borderRadius: '8px',
                  color: '#D4C5A9',
                  fontSize: '12px',
                }}
                labelFormatter={formatHour}
              />
              <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]} name="Errors" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* By-Level Breakdown Chart */}
      {stats?.byLevel && stats.byLevel.length > 0 && (
        <div className="bg-dark-300 border border-dark-50 rounded-lg p-5 mb-6">
          <h2 className="font-display text-parchment-200 text-lg mb-4">By Severity (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.byLevel} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,154,128,0.1)" />
              <XAxis
                dataKey="level"
                tick={{ fill: '#A89A80', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(168,154,128,0.2)' }}
              />
              <YAxis
                tick={{ fill: '#A89A80', fontSize: 10 }}
                axisLine={{ stroke: 'rgba(168,154,128,0.2)' }}
                allowDecimals={false}
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
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
                {stats.byLevel.map((entry) => (
                  <Cell key={entry.level} fill={BAR_COLORS[entry.level] || '#6B7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-parchment-500 text-xs mb-1 block">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search messages, endpoints..."
                className="w-full pl-10 pr-3 py-2 bg-dark-400 border border-dark-50 rounded text-parchment-300 text-sm placeholder:text-parchment-500/50 focus:border-primary-400 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-parchment-500 text-xs mb-1 block">Level</label>
            <select
              value={levelFilter}
              onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
              className="bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
            >
              <option value="">All Levels</option>
              <option value="ERROR">ERROR</option>
              <option value="WARN">WARN</option>
              <option value="INFO">INFO</option>
              <option value="DEBUG">DEBUG</option>
            </select>
          </div>
          <div>
            <label className="text-parchment-500 text-xs mb-1 block">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              className="bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-parchment-500 text-xs mb-1 block">Status</label>
            <select
              value={resolvedFilter}
              onChange={(e) => { setResolvedFilter(e.target.value); setPage(1); }}
              className="bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
            >
              <option value="">All</option>
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Log Table */}
      {logsLoading ? (
        <SkeletonTable />
      ) : logsError ? (
        <ErrorMessage error={logsErr} onRetry={refetchLogs} />
      ) : !logsData?.logs?.length ? (
        <div className="text-center py-20">
          <CheckCircle2 className="w-12 h-12 text-green-400/30 mx-auto mb-4" />
          <p className="text-parchment-500">No error logs found matching your filters.</p>
        </div>
      ) : (
        <>
          <div className="bg-dark-300 border border-dark-50 rounded-lg overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-dark-50 text-left">
                  <th className="px-4 py-3 text-parchment-500 text-xs font-display w-8" />
                  <th className="px-4 py-3 text-parchment-500 text-xs font-display">Timestamp</th>
                  <th className="px-4 py-3 text-parchment-500 text-xs font-display">Level</th>
                  <th className="px-4 py-3 text-parchment-500 text-xs font-display">Status</th>
                  <th className="px-4 py-3 text-parchment-500 text-xs font-display">Category</th>
                  <th className="px-4 py-3 text-parchment-500 text-xs font-display">Endpoint</th>
                  <th className="px-4 py-3 text-parchment-500 text-xs font-display">Message</th>
                  <th className="px-4 py-3 text-parchment-500 text-xs font-display">Resolved</th>
                  <th className="px-4 py-3 text-parchment-500 text-xs font-display w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-50">
                {logsData.logs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <LogRow
                      key={log.id}
                      log={log}
                      isExpanded={isExpanded}
                      onToggle={() => setExpandedId(isExpanded ? null : log.id)}
                      onResolve={() => { setResolveLog(log); setResolveNotes(log.notes || ''); }}
                      onUnresolve={() => unresolveMutation.mutate(log.id)}
                      isUnresolving={unresolveMutation.isPending}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <span className="text-parchment-500 text-sm">
                {logsData.total} total log{logsData.total !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded border border-dark-50 text-parchment-400 hover:bg-dark-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded text-xs font-display transition-colors ${
                        page === pageNum
                          ? 'bg-primary-400/20 text-primary-400 border border-primary-400/40'
                          : 'text-parchment-400 hover:bg-dark-300 border border-transparent'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded border border-dark-50 text-parchment-400 hover:bg-dark-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Resolve Modal */}
      {resolveLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setResolveLog(null)}
        >
          <div
            className="bg-dark-400 border border-dark-50 rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-primary-400">Resolve Error</h3>
              <button
                onClick={() => setResolveLog(null)}
                className="text-parchment-500 hover:text-parchment-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-parchment-300 text-sm mb-4 truncate">{resolveLog.message}</p>
            <label className="text-parchment-500 text-xs mb-1 block">Notes (optional)</label>
            <textarea
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              placeholder="What was the fix? Root cause?"
              rows={3}
              className="w-full bg-dark-500 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm placeholder:text-parchment-500/50 focus:border-primary-400 focus:outline-none resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setResolveLog(null)}
                className="flex-1 py-2 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => resolveMutation.mutate({ id: resolveLog.id, notes: resolveNotes })}
                disabled={resolveMutation.isPending}
                className="flex-1 py-2 bg-green-600 text-white font-display text-sm rounded hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {resolveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge Confirmation Modal */}
      {showPurge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setShowPurge(false)}
        >
          <div
            className="bg-dark-400 border border-dark-50 rounded-lg p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-red-400">Purge Old Logs</h3>
              <button
                onClick={() => setShowPurge(false)}
                className="text-parchment-500 hover:text-parchment-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-parchment-300 text-sm mb-4">
              Permanently delete all error logs older than the specified number of days. This cannot be undone.
            </p>
            <label className="text-parchment-500 text-xs mb-1 block">Delete logs older than (days)</label>
            <input
              type="number"
              value={purgeDays}
              onChange={(e) => setPurgeDays(Math.max(7, parseInt(e.target.value, 10) || 7))}
              min={7}
              className="w-full bg-dark-500 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowPurge(false)}
                className="flex-1 py-2 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => purgeMutation.mutate(purgeDays)}
                disabled={purgeMutation.isPending}
                className="flex-1 py-2 bg-red-600 text-white font-display text-sm rounded hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {purgeMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Purge Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LogRow sub-component
// ---------------------------------------------------------------------------

function LogRow({
  log,
  isExpanded,
  onToggle,
  onResolve,
  onUnresolve,
  isUnresolving,
}: {
  log: ErrorLog;
  isExpanded: boolean;
  onToggle: () => void;
  onResolve: () => void;
  onUnresolve: () => void;
  isUnresolving: boolean;
}) {
  return (
    <>
      <tr
        className="hover:bg-dark-400/30 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-parchment-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-parchment-500" />
          )}
        </td>
        <td className="px-4 py-3 text-xs text-parchment-300 whitespace-nowrap">
          {formatTimestamp(log.timestamp)}
        </td>
        <td className="px-4 py-3">
          <LevelBadge level={log.level} />
        </td>
        <td className="px-4 py-3">
          <StatusCodeBadge code={log.statusCode} />
        </td>
        <td className="px-4 py-3 text-xs text-parchment-300">{log.category}</td>
        <td className="px-4 py-3 text-xs text-parchment-300 font-mono max-w-[200px] truncate">
          {log.endpoint}
        </td>
        <td className="px-4 py-3 text-xs text-parchment-300 max-w-[250px] truncate">
          {log.message}
        </td>
        <td className="px-4 py-3">
          {log.resolved ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-400">
              <CheckCircle2 className="w-3 h-3" />
              Yes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-red-400">
              <XCircle className="w-3 h-3" />
              No
            </span>
          )}
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            {!log.resolved ? (
              <button
                onClick={onResolve}
                className="p-1.5 text-parchment-400 border border-dark-50 rounded hover:bg-dark-400 hover:text-green-400 transition-colors"
                title="Resolve"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={onUnresolve}
                disabled={isUnresolving}
                className="p-1.5 text-parchment-400 border border-dark-50 rounded hover:bg-dark-400 hover:text-yellow-400 transition-colors disabled:opacity-50"
                title="Reopen"
              >
                {isUnresolving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            <button
              onClick={onToggle}
              className="p-1.5 text-parchment-400 border border-dark-50 rounded hover:bg-dark-400 hover:text-primary-400 transition-colors"
              title="Details"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr className="bg-dark-400/20">
          <td colSpan={9} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <h4 className="text-parchment-500 font-display mb-2">Error Details</h4>
                {log.detail && (
                  <pre className="bg-dark-500 border border-dark-50 rounded p-3 text-parchment-300 text-xs overflow-x-auto max-h-48 whitespace-pre-wrap break-words">
                    {log.detail}
                  </pre>
                )}
                {!log.detail && (
                  <p className="text-parchment-500 italic">No stack trace available</p>
                )}
              </div>
              <div className="space-y-2">
                <h4 className="text-parchment-500 font-display mb-2">Context</h4>
                <div className="space-y-1">
                  {log.userId && (
                    <p className="text-parchment-300">
                      <span className="text-parchment-500">User ID:</span> <span className="font-mono">{log.userId}</span>
                    </p>
                  )}
                  {log.characterId && (
                    <p className="text-parchment-300">
                      <span className="text-parchment-500">Character ID:</span> <span className="font-mono">{log.characterId}</span>
                    </p>
                  )}
                  {log.ip && (
                    <p className="text-parchment-300">
                      <span className="text-parchment-500">IP:</span> <span className="font-mono">{log.ip}</span>
                    </p>
                  )}
                  {log.userAgent && (
                    <p className="text-parchment-300">
                      <span className="text-parchment-500">User Agent:</span> {log.userAgent}
                    </p>
                  )}
                </div>
                {log.requestBody && Object.keys(log.requestBody).length > 0 && (
                  <>
                    <h4 className="text-parchment-500 font-display mt-3 mb-1">Request Body</h4>
                    <pre className="bg-dark-500 border border-dark-50 rounded p-3 text-parchment-300 text-xs overflow-x-auto max-h-32 whitespace-pre-wrap break-words">
                      {JSON.stringify(log.requestBody, null, 2)}
                    </pre>
                  </>
                )}
                {log.resolved && (
                  <>
                    <h4 className="text-parchment-500 font-display mt-3 mb-1">Resolution</h4>
                    <p className="text-parchment-300">
                      <span className="text-parchment-500">Resolved by:</span> {log.resolvedBy || 'Unknown'}
                    </p>
                    {log.resolvedAt && (
                      <p className="text-parchment-300">
                        <span className="text-parchment-500">Resolved at:</span> {formatTimestamp(log.resolvedAt)}
                      </p>
                    )}
                    {log.notes && (
                      <p className="text-parchment-300">
                        <span className="text-parchment-500">Notes:</span> {log.notes}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
