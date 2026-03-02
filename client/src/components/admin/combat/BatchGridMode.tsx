import { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Play,
  Loader2,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import api from '../../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MetaData {
  races: string[];
  classes: string[];
  monsters: { name: string; level: number; biome: string }[];
}

interface MatchupResult {
  race: string;
  class: string;
  level: number;
  opponent: string;
  iterations: number;
  playerWins: number;
  monsterWins: number;
  draws: number;
  winRate: number;
  avgRounds: number;
  avgPlayerHpRemaining: number;
  avgMonsterHpRemaining: number;
}

interface BatchResult {
  simulationRunId: string | null;
  totalMatchups: number;
  totalFights: number;
  durationMs: number;
  errors?: string[];
  results: MatchupResult[];
  summary: {
    overallPlayerWinRate: number;
    avgRounds: number;
    raceWinRates: Record<string, number>;
    classWinRates: Record<string, number>;
    monsterDifficulty: Record<string, number>;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LEVEL_PRESETS = [1, 3, 5, 7, 10, 15, 20];

function formatRace(id: string): string {
  return id.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatClass(c: string): string {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function winRateColor(rate: number): string {
  if (rate < 0.35) return 'text-red-400';
  if (rate < 0.45) return 'text-yellow-400';
  if (rate > 0.65) return 'text-green-400';
  if (rate > 0.55) return 'text-green-300';
  return 'text-realm-text-primary';
}

function winRateBg(rate: number): string {
  if (rate < 0.35) return 'bg-red-500/20';
  if (rate < 0.45) return 'bg-yellow-500/15';
  if (rate > 0.65) return 'bg-green-500/20';
  if (rate > 0.55) return 'bg-green-500/10';
  return '';
}

function barFill(rate: number): string {
  if (rate < 0.35) return '#ef4444';
  if (rate < 0.45) return '#eab308';
  if (rate > 0.65) return '#22c55e';
  if (rate > 0.55) return '#86efac';
  return '#d4a574';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BatchGridMode() {
  // Meta data (races, classes, monsters)
  const { data: meta, isLoading: metaLoading } = useQuery<MetaData>({
    queryKey: ['admin', 'combat', 'batch-meta'],
    queryFn: async () => (await api.get('/admin/combat/batch-simulate/meta')).data,
    staleTime: Infinity,
  });

  // Grid config
  const [selectedRaces, setSelectedRaces] = useState<string[]>([]);
  const [allRaces, setAllRaces] = useState(true);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState(true);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([1, 5, 10]);
  const [selectedMonsters, setSelectedMonsters] = useState<string[]>([]);
  const [allMonsters, setAllMonsters] = useState(true);
  const [iterations, setIterations] = useState(100);
  const [persist, setPersist] = useState(false);
  const [notes, setNotes] = useState('');

  // Results
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);

  // Table sorting/filtering
  const [sortKey, setSortKey] = useState<keyof MatchupResult>('winRate');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterRace, setFilterRace] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterMonster, setFilterMonster] = useState('');

  // Compute grid preview
  const gridPreview = useMemo(() => {
    if (!meta) return null;
    const races = allRaces ? meta.races.length : selectedRaces.length;
    const classes = allClasses ? meta.classes.length : selectedClasses.length;
    const levels = selectedLevels.length;
    const monsters = allMonsters ? meta.monsters.length : selectedMonsters.length;
    const matchups = races * classes * levels * monsters;
    const fights = matchups * iterations;
    return { races, classes, levels, monsters, matchups, fights };
  }, [meta, allRaces, selectedRaces, allClasses, selectedClasses, selectedLevels, allMonsters, selectedMonsters, iterations]);

  // Mutation
  const batchMutation = useMutation({
    mutationFn: async () => {
      const grid = {
        races: allRaces ? ['ALL'] : selectedRaces,
        classes: allClasses ? ['ALL'] : selectedClasses,
        levels: selectedLevels,
        monsters: allMonsters ? ['ALL'] : selectedMonsters,
        iterationsPerMatchup: iterations,
      };
      const res = await api.post('/admin/combat/batch-simulate', { grid, persist, notes: notes || undefined });
      return res.data as BatchResult;
    },
    onSuccess: (data) => {
      setBatchResult(data);
      toast.success(`Batch complete: ${data.totalMatchups} matchups, ${(data.durationMs / 1000).toFixed(1)}s`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Batch simulation failed');
    },
  });

  // Sorted/filtered results
  const sortedResults = useMemo(() => {
    if (!batchResult) return [];
    let filtered = batchResult.results;
    if (filterRace) filtered = filtered.filter((r) => r.race === filterRace);
    if (filterClass) filtered = filtered.filter((r) => r.class === filterClass);
    if (filterMonster) filtered = filtered.filter((r) => r.opponent === filterMonster);

    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [batchResult, sortKey, sortAsc, filterRace, filterClass, filterMonster]);

  // Red flags
  const redFlags = useMemo(() => {
    if (!batchResult) return [];
    return batchResult.results
      .filter((r) => r.winRate < 0.35 || r.winRate > 0.65)
      .sort((a, b) => {
        const aDist = Math.abs(a.winRate - 0.5);
        const bDist = Math.abs(b.winRate - 0.5);
        return bDist - aDist;
      })
      .slice(0, 20);
  }, [batchResult]);

  const toggleLevel = (lvl: number) => {
    setSelectedLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl].sort((a, b) => a - b),
    );
  };

  const toggleSort = (key: keyof MatchupResult) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'winRate'); }
  };

  if (metaLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-realm-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading configuration...
      </div>
    );
  }

  const canRun = selectedLevels.length > 0 &&
    (allRaces || selectedRaces.length > 0) &&
    (allClasses || selectedClasses.length > 0) &&
    (allMonsters || selectedMonsters.length > 0);

  return (
    <div className="space-y-6">
      {/* Grid Configuration */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
        <h3 className="font-display text-realm-text-primary text-sm mb-4">Batch Grid Configuration</h3>

        <div className="space-y-4">
          {/* Races */}
          <div>
            <label className="text-xs text-realm-text-muted block mb-1">Races</label>
            <div className="flex items-center gap-3 mb-2">
              <label className="flex items-center gap-1.5 text-xs text-realm-text-secondary cursor-pointer">
                <input type="checkbox" checked={allRaces} onChange={() => setAllRaces(!allRaces)}
                  className="accent-realm-gold-400" />
                All ({meta?.races.length})
              </label>
              {!allRaces && (
                <span className="text-xs text-realm-text-muted">{selectedRaces.length} selected</span>
              )}
            </div>
            {!allRaces && meta && (
              <div className="flex flex-wrap gap-1.5">
                {meta.races.map((r) => (
                  <button key={r}
                    onClick={() => setSelectedRaces((prev) =>
                      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
                    )}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      selectedRaces.includes(r)
                        ? 'bg-realm-gold-500/30 text-realm-gold-400 border border-realm-gold-500/50'
                        : 'bg-realm-bg-600 text-realm-text-muted border border-realm-border/50 hover:text-realm-text-secondary'
                    }`}
                  >
                    {formatRace(r)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Classes */}
          <div>
            <label className="text-xs text-realm-text-muted block mb-1">Classes</label>
            <div className="flex items-center gap-3 mb-2">
              <label className="flex items-center gap-1.5 text-xs text-realm-text-secondary cursor-pointer">
                <input type="checkbox" checked={allClasses} onChange={() => setAllClasses(!allClasses)}
                  className="accent-realm-gold-400" />
                All ({meta?.classes.length})
              </label>
              {!allClasses && (
                <span className="text-xs text-realm-text-muted">{selectedClasses.length} selected</span>
              )}
            </div>
            {!allClasses && meta && (
              <div className="flex flex-wrap gap-1.5">
                {meta.classes.map((c) => (
                  <button key={c}
                    onClick={() => setSelectedClasses((prev) =>
                      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                    )}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      selectedClasses.includes(c)
                        ? 'bg-realm-teal-300/30 text-realm-teal-300 border border-realm-teal-300/50'
                        : 'bg-realm-bg-600 text-realm-text-muted border border-realm-border/50 hover:text-realm-text-secondary'
                    }`}
                  >
                    {formatClass(c)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Levels */}
          <div>
            <label className="text-xs text-realm-text-muted block mb-1">Levels ({selectedLevels.length} selected)</label>
            <div className="flex flex-wrap gap-1.5">
              {LEVEL_PRESETS.map((lvl) => (
                <button key={lvl}
                  onClick={() => toggleLevel(lvl)}
                  className={`w-10 h-8 text-xs font-display rounded transition-colors ${
                    selectedLevels.includes(lvl)
                      ? 'bg-realm-purple-400/30 text-realm-purple-300 border border-realm-purple-400/50'
                      : 'bg-realm-bg-600 text-realm-text-muted border border-realm-border/50 hover:text-realm-text-secondary'
                  }`}
                >
                  {lvl}
                </button>
              ))}
              <input
                type="number" min={1} max={100} placeholder="+"
                className="w-14 h-8 bg-realm-bg-800 border border-realm-border rounded px-2 text-xs text-center text-realm-text-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt((e.target as HTMLInputElement).value);
                    if (val >= 1 && val <= 100 && !selectedLevels.includes(val)) {
                      toggleLevel(val);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Monsters */}
          <div>
            <label className="text-xs text-realm-text-muted block mb-1">Monsters</label>
            <div className="flex items-center gap-3 mb-2">
              <label className="flex items-center gap-1.5 text-xs text-realm-text-secondary cursor-pointer">
                <input type="checkbox" checked={allMonsters} onChange={() => setAllMonsters(!allMonsters)}
                  className="accent-realm-gold-400" />
                All ({meta?.monsters.length})
              </label>
              {!allMonsters && (
                <span className="text-xs text-realm-text-muted">{selectedMonsters.length} selected</span>
              )}
            </div>
            {!allMonsters && meta && (
              <div className="flex flex-wrap gap-1.5">
                {meta.monsters.map((m) => (
                  <button key={m.name}
                    onClick={() => setSelectedMonsters((prev) =>
                      prev.includes(m.name) ? prev.filter((x) => x !== m.name) : [...prev, m.name],
                    )}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      selectedMonsters.includes(m.name)
                        ? 'bg-red-500/30 text-red-400 border border-red-500/50'
                        : 'bg-realm-bg-600 text-realm-text-muted border border-realm-border/50 hover:text-realm-text-secondary'
                    }`}
                  >
                    {m.name} (L{m.level})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Iterations & Options */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-realm-text-muted block mb-1">Iterations/matchup</label>
              <input
                type="number" min={1} max={1000} value={iterations}
                onChange={(e) => setIterations(Math.max(1, parseInt(e.target.value) || 100))}
                className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-xs text-realm-text-secondary cursor-pointer pb-2">
                <input type="checkbox" checked={persist} onChange={() => setPersist(!persist)}
                  className="accent-realm-gold-400" />
                <Save className="w-3 h-3" />
                Save results
              </label>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-realm-text-muted block mb-1">Notes</label>
              <input
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Label for this batch run..."
                className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-2 text-sm text-realm-text-primary placeholder:text-realm-text-muted/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Preview & Run */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            {gridPreview && (
              <div className="text-xs text-realm-text-muted space-y-1">
                <div>
                  {gridPreview.races} races x {gridPreview.classes} classes x {gridPreview.levels} levels x {gridPreview.monsters} monsters
                  = <span className="text-realm-text-primary font-display">{gridPreview.matchups.toLocaleString()}</span> matchups
                </div>
                <div>
                  x {iterations} iterations = <span className={`font-display ${gridPreview.fights > 500_000 ? 'text-red-400' : 'text-realm-gold-400'}`}>
                    {gridPreview.fights.toLocaleString()}
                  </span> fights
                </div>
                {gridPreview.fights > 500_000 && (
                  <div className="flex items-center gap-1 text-red-400 mt-1">
                    <AlertTriangle className="w-3 h-3" />
                    Exceeds 500K limit. Reduce grid or iterations.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => batchMutation.mutate()}
              disabled={batchMutation.isPending || !canRun || (gridPreview?.fights ?? 0) > 500_000}
              className="flex items-center gap-2 px-5 py-2.5 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50"
            >
              {batchMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {batchMutation.isPending ? 'Running batch...' : 'Run Batch'}
            </button>

            {batchResult && (
              <button
                onClick={() => setBatchResult(null)}
                className="flex items-center gap-2 px-4 py-2.5 bg-realm-bg-600 text-realm-text-secondary font-display text-sm rounded hover:text-realm-text-primary transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {batchResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              label="Overall Win Rate"
              value={`${(batchResult.summary.overallPlayerWinRate * 100).toFixed(1)}%`}
              color={winRateColor(batchResult.summary.overallPlayerWinRate)}
            />
            <SummaryCard
              label="Avg Rounds"
              value={batchResult.summary.avgRounds.toFixed(1)}
              color="text-realm-gold-400"
            />
            <SummaryCard
              label="Total Fights"
              value={batchResult.totalFights.toLocaleString()}
              color="text-realm-text-primary"
            />
            <SummaryCard
              label="Duration"
              value={`${(batchResult.durationMs / 1000).toFixed(1)}s`}
              color="text-realm-teal-300"
            />
          </div>

          {/* Errors */}
          {batchResult.errors && batchResult.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h4 className="font-display text-red-400 text-sm mb-2">Errors ({batchResult.errors.length})</h4>
              <div className="text-xs text-red-300 space-y-1">
                {batchResult.errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            </div>
          )}

          {/* Race Win Rates Chart */}
          <WinRateChart
            title="Race Win Rates"
            data={Object.entries(batchResult.summary.raceWinRates)
              .map(([name, rate]) => ({ name: formatRace(name), rate }))
              .sort((a, b) => b.rate - a.rate)}
          />

          {/* Class Win Rates Chart */}
          <WinRateChart
            title="Class Win Rates"
            data={Object.entries(batchResult.summary.classWinRates)
              .map(([name, rate]) => ({ name: formatClass(name), rate }))
              .sort((a, b) => b.rate - a.rate)}
          />

          {/* Monster Difficulty Chart */}
          <WinRateChart
            title="Monster Difficulty (Player Death Rate)"
            data={Object.entries(batchResult.summary.monsterDifficulty)
              .map(([name, rate]) => ({ name, rate }))
              .sort((a, b) => b.rate - a.rate)}
            invertColors
          />

          {/* Red Flags */}
          {redFlags.length > 0 && (
            <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
              <h3 className="font-display text-red-400 text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Balance Red Flags ({redFlags.length})
              </h3>
              <div className="space-y-1.5">
                {redFlags.map((r, i) => (
                  <div key={i} className={`flex items-center justify-between text-xs px-3 py-1.5 rounded ${winRateBg(r.winRate)}`}>
                    <span className="text-realm-text-secondary">
                      {formatRace(r.race)} {formatClass(r.class)} L{r.level} vs {r.opponent}
                    </span>
                    <span className={`font-display ${winRateColor(r.winRate)}`}>
                      {(r.winRate * 100).toFixed(0)}% win rate
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Results Table */}
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
            <h3 className="font-display text-realm-text-primary text-sm mb-3">
              Detailed Results ({sortedResults.length} of {batchResult.results.length})
            </h3>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-3">
              <select value={filterRace} onChange={(e) => setFilterRace(e.target.value)}
                className="bg-realm-bg-800 border border-realm-border rounded px-2 py-1 text-xs text-realm-text-primary">
                <option value="">All Races</option>
                {[...new Set(batchResult.results.map((r) => r.race))].map((r) => (
                  <option key={r} value={r}>{formatRace(r)}</option>
                ))}
              </select>
              <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
                className="bg-realm-bg-800 border border-realm-border rounded px-2 py-1 text-xs text-realm-text-primary">
                <option value="">All Classes</option>
                {[...new Set(batchResult.results.map((r) => r.class))].map((c) => (
                  <option key={c} value={c}>{formatClass(c)}</option>
                ))}
              </select>
              <select value={filterMonster} onChange={(e) => setFilterMonster(e.target.value)}
                className="bg-realm-bg-800 border border-realm-border rounded px-2 py-1 text-xs text-realm-text-primary">
                <option value="">All Monsters</option>
                {[...new Set(batchResult.results.map((r) => r.opponent))].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-realm-text-muted border-b border-realm-border">
                    <SortTh label="Race" sortKey="race" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                    <SortTh label="Class" sortKey="class" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                    <SortTh label="Lvl" sortKey="level" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                    <SortTh label="Monster" sortKey="opponent" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                    <SortTh label="Win Rate" sortKey="winRate" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                    <SortTh label="Avg Rounds" sortKey="avgRounds" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                    <SortTh label="Avg HP" sortKey="avgPlayerHpRemaining" current={sortKey} asc={sortAsc} onClick={toggleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.slice(0, 200).map((r, i) => (
                    <tr key={i} className={`border-b border-realm-border/30 hover:bg-realm-bg-600/50 ${winRateBg(r.winRate)}`}>
                      <td className="py-1.5 px-2 text-realm-text-secondary">{formatRace(r.race)}</td>
                      <td className="py-1.5 px-2 text-realm-text-secondary">{formatClass(r.class)}</td>
                      <td className="py-1.5 px-2 text-realm-text-primary font-display">{r.level}</td>
                      <td className="py-1.5 px-2 text-realm-text-secondary">{r.opponent}</td>
                      <td className={`py-1.5 px-2 font-display ${winRateColor(r.winRate)}`}>
                        {(r.winRate * 100).toFixed(0)}%
                      </td>
                      <td className="py-1.5 px-2 text-realm-gold-400">{r.avgRounds}</td>
                      <td className="py-1.5 px-2 text-realm-text-muted">{r.avgPlayerHpRemaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sortedResults.length > 200 && (
                <div className="text-xs text-realm-text-muted text-center py-2">
                  Showing first 200 of {sortedResults.length} results. Use filters to narrow down.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-realm-bg-600 border border-realm-border/50 rounded-lg p-4">
      <div className="text-xs text-realm-text-muted mb-1">{label}</div>
      <div className={`text-xl font-display ${color}`}>{value}</div>
    </div>
  );
}

function WinRateChart({
  title,
  data,
  invertColors,
}: {
  title: string;
  data: { name: string; rate: number }[];
  invertColors?: boolean;
}) {
  const chartData = data.map((d) => ({
    name: d.name,
    rate: +(d.rate * 100).toFixed(1),
  }));

  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
      <h3 className="font-display text-realm-text-primary text-sm mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 28 + 40)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 30, top: 5, bottom: 5 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#d1d5db', fontSize: 11 }} width={95} />
          <Tooltip
            contentStyle={{ background: '#1e1e2e', border: '1px solid #333', borderRadius: 6 }}
            labelStyle={{ color: '#d4a574' }}
            formatter={(value: number) => [`${value}%`, invertColors ? 'Death Rate' : 'Win Rate']}
          />
          <ReferenceLine x={50} stroke="#555" strokeDasharray="3 3" />
          <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={invertColors ? barFill(1 - entry.rate / 100) : barFill(entry.rate / 100)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SortTh({
  label,
  sortKey: key,
  current,
  asc,
  onClick,
}: {
  label: string;
  sortKey: keyof MatchupResult;
  current: keyof MatchupResult;
  asc: boolean;
  onClick: (key: keyof MatchupResult) => void;
}) {
  const active = current === key;
  return (
    <th
      onClick={() => onClick(key)}
      className="py-2 px-2 text-left cursor-pointer hover:text-realm-text-secondary select-none whitespace-nowrap"
    >
      <span className="flex items-center gap-0.5">
        {label}
        {active && (asc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </span>
    </th>
  );
}
