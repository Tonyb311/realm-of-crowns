import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar, Filter, ChevronLeft, ChevronRight, ScrollText } from 'lucide-react';
import api from '../../../services/api';
import CombatReplay from './CombatReplay';

// ── Types ────────────────────────────────────────────────────────────────────

interface SessionParticipant {
  id: string;
  team: number;
  initiative: number;
  currentHp: number;
  character: { id: string; name: string; race: string; class: string; level: number };
}

interface SessionSummary {
  id: string;
  type: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  participants: SessionParticipant[];
  logCount: number;
  attackerParams: any;
  defenderParams: any;
}

interface SessionDetail extends SessionSummary {
  location: { id: string; name: string } | null;
  logs: Array<{
    id: string;
    round: number;
    actorId: string;
    action: string;
    result: any;
    createdAt: string;
  }>;
}

interface HistoryResponse {
  sessions: SessionSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ── Constants ────────────────────────────────────────────────────────────────

const COMBAT_TYPES = ['', 'PVE', 'PVP', 'DUEL', 'ARENA', 'WAR', 'SPAR'] as const;

const TYPE_COLORS: Record<string, string> = {
  PVE: 'bg-realm-teal-300/20 text-realm-teal-300',
  PVP: 'bg-red-500/20 text-red-400',
  DUEL: 'bg-purple-500/20 text-purple-400',
  ARENA: 'bg-realm-gold-500/20 text-realm-gold-400',
  WAR: 'bg-red-600/20 text-red-500',
  SPAR: 'bg-blue-500/20 text-blue-400',
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-500/20 text-green-400',
  IN_PROGRESS: 'bg-realm-gold-500/20 text-realm-gold-400',
  ABANDONED: 'bg-realm-text-muted/20 text-realm-text-muted',
  FLED: 'bg-realm-warning/20 text-realm-warning',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) return 'In Progress';
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}

function getParticipantNames(session: SessionSummary): string {
  const names = session.participants.map((p) => p.character.name);
  // Add monster name from params
  if (session.attackerParams?.name && !names.includes(session.attackerParams.name)) {
    names.push(session.attackerParams.name);
  }
  if (session.defenderParams?.name && !names.includes(session.defenderParams.name)) {
    names.push(session.defenderParams.name);
  }
  if (names.length === 0) return 'Unknown';
  if (names.length <= 3) return names.join(' vs ');
  return `${names[0]} vs ${names[1]} +${names.length - 2}`;
}

// ── Components ───────────────────────────────────────────────────────────────

function SessionListItem({
  session,
  isSelected,
  onClick,
}: {
  session: SessionSummary;
  isSelected: boolean;
  onClick: () => void;
}) {
  const typeColor = TYPE_COLORS[session.type] ?? 'bg-realm-bg-600/50 text-realm-text-muted';
  const statusColor = STATUS_COLORS[session.status] ?? 'bg-realm-bg-600/50 text-realm-text-muted';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded transition-colors ${
        isSelected
          ? 'bg-realm-bg-800/80 border border-realm-gold-500/50'
          : 'bg-realm-bg-800/30 border border-transparent hover:bg-realm-bg-800/50 hover:border-realm-border/30'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-display ${typeColor}`}>
            {session.type}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-display ${statusColor}`}>
            {session.status}
          </span>
        </div>
        <span className="text-xs text-realm-text-muted">
          {session.logCount} turn{session.logCount !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="text-sm text-realm-text-primary truncate">{getParticipantNames(session)}</div>
      <div className="text-xs text-realm-text-muted mt-0.5">
        {formatDate(session.startedAt)} {formatTime(session.startedAt)}
      </div>
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  // Build a page range showing at most 5 pages centered on current
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 pt-3">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-1 rounded text-realm-text-secondary hover:text-realm-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-7 h-7 rounded text-xs font-display transition-colors ${
            p === page
              ? 'bg-realm-gold-500 text-realm-bg-900'
              : 'bg-realm-bg-600 text-realm-text-secondary hover:text-realm-text-primary'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="p-1 rounded text-realm-text-secondary hover:text-realm-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function HistoryTab() {
  // Filter state
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [characterSearch, setCharacterSearch] = useState<string>('');
  const [debouncedCharacter, setDebouncedCharacter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Debounce character search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCharacter(characterSearch);
      setPage(1); // Reset to page 1 on search change
    }, 300);
    return () => clearTimeout(timer);
  }, [characterSearch]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, dateFrom, dateTo]);

  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = { page: String(page), limit: '20' };
    if (typeFilter) params.type = typeFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (debouncedCharacter) params.character = debouncedCharacter;
    return params;
  }, [page, typeFilter, dateFrom, dateTo, debouncedCharacter]);

  // Fetch session list
  const {
    data: historyData,
    isLoading: listLoading,
    error: listError,
  } = useQuery<HistoryResponse>({
    queryKey: ['admin', 'combat', 'history', queryParams],
    queryFn: async () => (await api.get('/admin/combat/history', { params: queryParams })).data,
  });

  // Fetch selected session detail
  const {
    data: sessionDetail,
    isLoading: detailLoading,
    error: detailError,
  } = useQuery<SessionDetail>({
    queryKey: ['admin', 'combat', 'session', selectedSessionId],
    queryFn: async () => (await api.get(`/admin/combat/session/${selectedSessionId}`)).data,
    enabled: !!selectedSessionId,
  });

  const sessions = historyData?.sessions ?? [];
  const pagination = historyData?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 };

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
      {/* Left panel: Session list */}
      <div className="w-1/3 flex flex-col bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden">
        {/* Filters */}
        <div className="p-3 border-b border-realm-border space-y-2">
          {/* Type filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-realm-text-muted shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-1 bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
            >
              <option value="">All Types</option>
              {COMBAT_TYPES.filter(Boolean).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Character search */}
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-realm-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search by character name..."
              value={characterSearch}
              onChange={(e) => setCharacterSearch(e.target.value)}
              className="flex-1 bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary placeholder:text-realm-text-muted/50"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-realm-text-muted shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary"
              placeholder="From"
            />
            <span className="text-realm-text-muted text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary"
              placeholder="To"
            />
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {listLoading && (
            <div className="space-y-2 p-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-16 bg-realm-bg-800/50 rounded animate-pulse" />
              ))}
            </div>
          )}

          {listError && (
            <div className="p-4 text-center text-realm-danger text-sm">
              Failed to load combat history.
            </div>
          )}

          {!listLoading && !listError && sessions.length === 0 && (
            <div className="p-4 text-center text-realm-text-muted text-sm">
              No combat sessions found.
            </div>
          )}

          {!listLoading &&
            sessions.map((session) => (
              <SessionListItem
                key={session.id}
                session={session}
                isSelected={session.id === selectedSessionId}
                onClick={() => setSelectedSessionId(session.id)}
              />
            ))}
        </div>

        {/* Pagination */}
        <div className="border-t border-realm-border px-3 py-2">
          <div className="text-xs text-realm-text-muted text-center mb-1">
            {pagination.total.toLocaleString()} session{pagination.total !== 1 ? 's' : ''}
          </div>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>
      </div>

      {/* Right panel: Session detail / replay */}
      <div className="w-2/3 bg-realm-bg-700 border border-realm-border rounded-lg overflow-y-auto">
        {!selectedSessionId && (
          <div className="h-full flex flex-col items-center justify-center text-realm-text-muted gap-3">
            <ScrollText className="w-10 h-10 opacity-30" />
            <span className="text-sm">Select a combat session to view replay</span>
          </div>
        )}

        {selectedSessionId && detailLoading && (
          <div className="p-5 space-y-4">
            <div className="h-8 bg-realm-bg-800/50 rounded animate-pulse w-2/3" />
            <div className="h-4 bg-realm-bg-800/50 rounded animate-pulse w-1/3" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-realm-bg-800/50 rounded animate-pulse" />
              ))}
            </div>
          </div>
        )}

        {selectedSessionId && detailError && (
          <div className="p-6 text-center text-realm-danger text-sm">
            Failed to load session details.
          </div>
        )}

        {selectedSessionId && sessionDetail && !detailLoading && (
          <div className="p-5 space-y-4">
            {/* Session header */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-display ${
                    TYPE_COLORS[sessionDetail.type] ?? 'bg-realm-bg-600/50 text-realm-text-muted'
                  }`}
                >
                  {sessionDetail.type}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-display ${
                    STATUS_COLORS[sessionDetail.status] ?? 'bg-realm-bg-600/50 text-realm-text-muted'
                  }`}
                >
                  {sessionDetail.status}
                </span>
                {sessionDetail.location && (
                  <span className="text-xs text-realm-text-muted">
                    at <span className="text-realm-text-secondary">{sessionDetail.location.name}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-realm-text-muted">
                <span>{formatDate(sessionDetail.startedAt)} {formatTime(sessionDetail.startedAt)}</span>
                <span>Duration: {formatDuration(sessionDetail.startedAt, sessionDetail.endedAt)}</span>
                <span>{sessionDetail.logs.length} turn{sessionDetail.logs.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Participant info */}
              <div className="mt-3 flex flex-wrap gap-2">
                {sessionDetail.participants.map((p) => (
                  <div
                    key={p.id}
                    className="bg-realm-bg-800/50 rounded px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-display text-realm-text-primary">{p.character.name}</span>
                    <span className="text-realm-text-muted ml-1.5">
                      Lvl {p.character.level} {p.character.race} {p.character.class}
                    </span>
                    <span className="text-realm-text-muted ml-1.5">
                      Team {p.team}
                    </span>
                  </div>
                ))}
                {/* Monster from params */}
                {sessionDetail.attackerParams?.name && (
                  <div className="bg-realm-bg-800/50 rounded px-2.5 py-1.5 text-xs">
                    <span className="font-display text-red-400">{sessionDetail.attackerParams.name}</span>
                    {sessionDetail.attackerParams.level && (
                      <span className="text-realm-text-muted ml-1.5">Lvl {sessionDetail.attackerParams.level}</span>
                    )}
                  </div>
                )}
                {sessionDetail.defenderParams?.name && (
                  <div className="bg-realm-bg-800/50 rounded px-2.5 py-1.5 text-xs">
                    <span className="font-display text-red-400">{sessionDetail.defenderParams.name}</span>
                    {sessionDetail.defenderParams.level && (
                      <span className="text-realm-text-muted ml-1.5">Lvl {sessionDetail.defenderParams.level}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Combat replay */}
            <CombatReplay
              logs={sessionDetail.logs}
              participants={sessionDetail.participants}
              attackerParams={sessionDetail.attackerParams}
              defenderParams={sessionDetail.defenderParams}
            />
          </div>
        )}
      </div>
    </div>
  );
}
