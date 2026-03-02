import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Calendar, Filter, ChevronLeft, ChevronRight, ScrollText, ArrowUpDown, Swords, Heart } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import api from '../../../services/api';

// ── Types ────────────────────────────────────────────────────────────────────

interface EncounterCharacter {
  race: string;
  class: string | null;
  level: number;
}

interface Encounter {
  id: string;
  type: string;
  characterName: string;
  opponentName: string;
  outcome: string;
  totalRounds: number;
  characterStartHp: number;
  characterEndHp: number;
  opponentStartHp: number;
  opponentEndHp: number;
  characterWeapon: string;
  opponentWeapon: string;
  xpAwarded: number;
  goldAwarded: number;
  lootDropped: string;
  triggerSource: string;
  startedAt: string;
  endedAt: string;
  summary: string;
  rounds: unknown;
  simulationTick: number | null;
  character: EncounterCharacter | null;
}

interface HistoryResponse {
  encounters: Encounter[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const OUTCOME_COLORS: Record<string, string> = {
  win: 'bg-green-500/20 text-green-400',
  loss: 'bg-red-500/20 text-red-400',
  flee: 'bg-yellow-500/20 text-yellow-400',
  draw: 'bg-gray-500/20 text-gray-400',
};

const TYPE_COLORS: Record<string, string> = {
  pve: 'bg-realm-teal-300/20 text-realm-teal-300',
  pvp: 'bg-purple-500/20 text-purple-400',
};

const SORT_OPTIONS = [
  { value: 'startedAt:desc', label: 'Newest First' },
  { value: 'startedAt:asc', label: 'Oldest First' },
  { value: 'totalRounds:desc', label: 'Most Rounds' },
  { value: 'xpAwarded:desc', label: 'Most XP' },
  { value: 'goldAwarded:desc', label: 'Most Gold' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function HpBar({ current, max, label }: { current: number; max: number; label: string }) {
  if (max <= 0) return null;
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-realm-text-muted w-12 text-right shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-red-900/40 rounded overflow-hidden">
        <div className="h-full bg-green-500/70 rounded" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-realm-text-secondary w-16 shrink-0">{current}/{max}</span>
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────────

function EncounterCard({
  encounter: e,
  isSelected,
  onClick,
}: {
  encounter: Encounter;
  isSelected: boolean;
  onClick: () => void;
}) {
  const typeColor = TYPE_COLORS[e.type] ?? 'bg-realm-bg-600/50 text-realm-text-muted';
  const outcomeColor = OUTCOME_COLORS[e.outcome] ?? 'bg-realm-bg-600/50 text-realm-text-muted';
  const charClass = e.character?.class ? ` ${e.character.class}` : '';
  const charInfo = e.character ? `(${e.character.race}${charClass}, Lv ${e.character.level})` : '';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded transition-colors ${
        isSelected
          ? 'bg-realm-bg-800/80 border border-realm-gold-500/50'
          : 'bg-realm-bg-800/30 border border-transparent hover:bg-realm-bg-800/50 hover:border-realm-border/30'
      }`}
    >
      {/* Row 1: badges + rounds */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-display uppercase ${typeColor}`}>
            {e.type}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-display uppercase ${outcomeColor}`}>
            {e.outcome}
          </span>
        </div>
        <span className="text-xs text-realm-text-muted">{e.totalRounds} round{e.totalRounds !== 1 ? 's' : ''}</span>
      </div>

      {/* Row 2: character name + info */}
      <div className="text-sm text-realm-text-primary truncate">
        {e.characterName} <span className="text-realm-text-muted text-xs">{charInfo}</span>
      </div>

      {/* Row 3: vs opponent */}
      <div className="text-xs text-realm-text-secondary ml-2 truncate">vs {e.opponentName}</div>

      {/* Row 4: HP bars */}
      <div className="mt-1 space-y-0.5">
        <HpBar current={e.characterEndHp} max={e.characterStartHp} label="Player" />
        <HpBar current={e.opponentEndHp} max={e.opponentStartHp} label="Enemy" />
      </div>

      {/* Row 5: rewards */}
      {(e.xpAwarded > 0 || e.goldAwarded > 0 || e.lootDropped) && (
        <div className="flex items-center gap-2 mt-1 text-xs text-realm-text-muted">
          {e.xpAwarded > 0 && <span className="text-blue-400">XP: +{e.xpAwarded}</span>}
          {e.goldAwarded > 0 && <span className="text-realm-gold-400">Gold: +{e.goldAwarded}</span>}
          {e.lootDropped && <span className="text-green-400 truncate">{e.lootDropped}</span>}
        </div>
      )}

      {/* Row 6: sim tick + trigger + date */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1.5">
          {e.simulationTick != null && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-display bg-purple-500/20 text-purple-400">
              SIM Tick {e.simulationTick}
            </span>
          )}
          <span className="text-[10px] text-realm-text-muted">{e.triggerSource}</span>
        </div>
        <span className="text-[10px] text-realm-text-muted">{formatDateTime(e.startedAt)}</span>
      </div>
    </button>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1 && total <= limit) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pages.push(i);

  const showStart = (page - 1) * limit + 1;
  const showEnd = Math.min(page * limit, total);

  return (
    <div className="text-center">
      <div className="text-xs text-realm-text-muted mb-1">
        Showing {showStart}-{showEnd} of {total.toLocaleString()}
      </div>
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
          className="p-1 rounded text-realm-text-secondary hover:text-realm-text-primary disabled:opacity-30 disabled:cursor-not-allowed text-xs"
        >
          &laquo;
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1 rounded text-realm-text-secondary hover:text-realm-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages[0] > 1 && <span className="text-realm-text-muted text-xs px-1">...</span>}
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
        {pages[pages.length - 1] < totalPages && <span className="text-realm-text-muted text-xs px-1">...</span>}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1 rounded text-realm-text-secondary hover:text-realm-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="p-1 rounded text-realm-text-secondary hover:text-realm-text-primary disabled:opacity-30 disabled:cursor-not-allowed text-xs"
        >
          &raquo;
        </button>
      </div>
    </div>
  );
}

function DetailPanel({ encounter: e }: { encounter: Encounter }) {
  // Parse rounds JSON for HP timeline
  const roundsData = useMemo(() => {
    try {
      const raw = Array.isArray(e.rounds) ? e.rounds : JSON.parse(e.rounds as string);
      if (!Array.isArray(raw) || raw.length === 0) return null;
      return raw.map((r: any, i: number) => ({
        round: i + 1,
        playerHp: r.characterHp ?? r.playerHp ?? r.attackerHp ?? undefined,
        enemyHp: r.opponentHp ?? r.enemyHp ?? r.defenderHp ?? undefined,
      })).filter((r: any) => r.playerHp !== undefined || r.enemyHp !== undefined);
    } catch {
      return null;
    }
  }, [e.rounds]);

  const hasHpTimeline = roundsData && roundsData.length > 0 && roundsData.some((r: any) => r.playerHp !== undefined);

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 rounded text-xs font-display uppercase ${TYPE_COLORS[e.type] ?? ''}`}>
            {e.type}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-display uppercase ${OUTCOME_COLORS[e.outcome] ?? ''}`}>
            {e.outcome}
          </span>
          {e.simulationTick != null && (
            <span className="px-2 py-0.5 rounded text-xs font-display bg-purple-500/20 text-purple-400">
              SIM Tick {e.simulationTick}
            </span>
          )}
          <span className="text-xs text-realm-text-muted ml-auto">{formatDateTime(e.startedAt)}</span>
        </div>

        <div className="text-lg font-display text-realm-text-primary">
          {e.characterName} <span className="text-realm-text-muted text-sm">vs</span> {e.opponentName}
        </div>

        {e.character && (
          <div className="text-xs text-realm-text-muted mt-0.5">
            {e.character.race}{e.character.class ? ` ${e.character.class}` : ''}, Level {e.character.level}
          </div>
        )}
      </div>

      {/* Combat stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-realm-bg-800/50 rounded p-3 space-y-2">
          <div className="text-xs font-display text-realm-text-secondary mb-1">
            <Swords className="w-3 h-3 inline mr-1" />Player
          </div>
          <HpBar current={e.characterEndHp} max={e.characterStartHp} label="HP" />
          {e.characterWeapon && (
            <div className="text-xs text-realm-text-muted">Weapon: <span className="text-realm-text-secondary">{e.characterWeapon}</span></div>
          )}
        </div>
        <div className="bg-realm-bg-800/50 rounded p-3 space-y-2">
          <div className="text-xs font-display text-realm-text-secondary mb-1">
            <Heart className="w-3 h-3 inline mr-1" />Opponent
          </div>
          <HpBar current={e.opponentEndHp} max={e.opponentStartHp} label="HP" />
          {e.opponentWeapon && (
            <div className="text-xs text-realm-text-muted">Weapon: <span className="text-realm-text-secondary">{e.opponentWeapon}</span></div>
          )}
        </div>
      </div>

      {/* Rewards */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-realm-text-muted">Rounds: <span className="text-realm-text-primary">{e.totalRounds}</span></span>
        {e.xpAwarded > 0 && <span className="text-blue-400">+{e.xpAwarded} XP</span>}
        {e.goldAwarded > 0 && <span className="text-realm-gold-400">+{e.goldAwarded} Gold</span>}
        {e.lootDropped && <span className="text-green-400">{e.lootDropped}</span>}
      </div>

      <div className="text-xs text-realm-text-muted">
        Source: {e.triggerSource}
      </div>

      {/* Summary */}
      {e.summary && (
        <div className="bg-realm-bg-800/50 rounded p-3">
          <div className="text-xs font-display text-realm-text-secondary mb-1">Summary</div>
          <div className="text-sm text-realm-text-primary whitespace-pre-wrap">{e.summary}</div>
        </div>
      )}

      {/* HP Timeline */}
      {hasHpTimeline && (
        <div className="bg-realm-bg-800/50 rounded p-3">
          <div className="text-xs font-display text-realm-text-secondary mb-2">HP Timeline</div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={roundsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="round" tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#d1d5db' }}
              />
              <Line type="monotone" dataKey="playerHp" stroke="#10b981" strokeWidth={2} dot={false} name="Player HP" />
              <Line type="monotone" dataKey="enemyHp" stroke="#ef4444" strokeWidth={2} dot={false} name="Enemy HP" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Round-by-round data */}
      {Array.isArray(e.rounds) && (e.rounds as any[]).length > 0 && (
        <div className="bg-realm-bg-800/50 rounded p-3">
          <div className="text-xs font-display text-realm-text-secondary mb-2">Round Data</div>
          <div className="max-h-64 overflow-y-auto">
            <pre className="text-xs text-realm-text-muted whitespace-pre-wrap">
              {JSON.stringify(e.rounds, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function HistoryTab({ dataSource = 'live' }: { dataSource?: string }) {
  // Filter state
  const [typeFilter, setTypeFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('startedAt:desc');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [typeFilter, outcomeFilter, dateFrom, dateTo, sort, dataSource]);

  // Build query params
  const [sortBy, sortOrder] = sort.split(':');
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: String(page),
      limit: '25',
      dataSource,
      sortBy,
      sortOrder,
    };
    if (typeFilter !== 'all') params.type = typeFilter;
    if (outcomeFilter !== 'all') params.outcome = outcomeFilter;
    if (debouncedSearch) params.search = debouncedSearch;
    if (dateFrom) params.startDate = new Date(dateFrom).toISOString();
    if (dateTo) params.endDate = new Date(dateTo + 'T23:59:59.999Z').toISOString();
    return params;
  }, [page, dataSource, typeFilter, outcomeFilter, debouncedSearch, dateFrom, dateTo, sortBy, sortOrder]);

  // Fetch encounter list
  const {
    data: historyData,
    isLoading: listLoading,
    error: listError,
  } = useQuery<HistoryResponse>({
    queryKey: ['admin', 'combat', 'history', queryParams],
    queryFn: async () => (await api.get('/admin/combat/history', { params: queryParams })).data,
  });

  const encounters = historyData?.encounters ?? [];
  const total = historyData?.total ?? 0;
  const totalPages = historyData?.totalPages ?? 0;

  // Find selected encounter from current page
  const selectedEncounter = encounters.find((e) => e.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-realm-text-muted" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary focus:border-realm-gold-500/50 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="pve">PvE</option>
              <option value="pvp">PvP</option>
            </select>
          </div>

          {/* Outcome filter */}
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary focus:border-realm-gold-500/50 focus:outline-none"
          >
            <option value="all">All Outcomes</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="flee">Flee</option>
            <option value="draw">Draw</option>
          </select>

          {/* Search */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-realm-text-muted" />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary placeholder:text-realm-text-muted/50 focus:border-realm-gold-500/50 focus:outline-none"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-realm-text-muted" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary focus:border-realm-gold-500/50 focus:outline-none"
            />
            <span className="text-realm-text-muted text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary focus:border-realm-gold-500/50 focus:outline-none"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-realm-text-muted" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-realm-bg-800 border border-realm-border rounded px-2 py-1.5 text-xs text-realm-text-primary focus:border-realm-gold-500/50 focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main panels */}
      <div className="flex gap-3 h-[calc(100vh-280px)] min-h-[500px]">
        {/* Left panel: Encounter list (~55%) */}
        <div className="w-[55%] flex flex-col bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden">
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {listLoading && (
              <div className="space-y-2 p-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-28 bg-realm-bg-800/50 rounded animate-pulse" />
                ))}
              </div>
            )}

            {listError && (
              <div className="p-4 text-center text-realm-danger text-sm">
                Failed to load combat encounters.
              </div>
            )}

            {!listLoading && !listError && encounters.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-realm-text-muted gap-2">
                <ScrollText className="w-8 h-8 opacity-30" />
                <span className="text-sm">No encounters found matching your filters.</span>
              </div>
            )}

            {!listLoading &&
              encounters.map((enc) => (
                <EncounterCard
                  key={enc.id}
                  encounter={enc}
                  isSelected={enc.id === selectedId}
                  onClick={() => setSelectedId(enc.id)}
                />
              ))}
          </div>

          {/* Pagination */}
          <div className="border-t border-realm-border px-3 py-2">
            <Pagination page={page} totalPages={totalPages} total={total} limit={25} onPageChange={setPage} />
          </div>
        </div>

        {/* Right panel: Detail (~45%) */}
        <div className="w-[45%] bg-realm-bg-700 border border-realm-border rounded-lg overflow-y-auto">
          {!selectedEncounter && (
            <div className="h-full flex flex-col items-center justify-center text-realm-text-muted gap-3">
              <ScrollText className="w-10 h-10 opacity-30" />
              <span className="text-sm">Select a combat encounter to view details</span>
            </div>
          )}

          {selectedEncounter && <DetailPanel encounter={selectedEncounter} />}
        </div>
      </div>
    </div>
  );
}
