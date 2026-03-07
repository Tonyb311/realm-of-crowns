import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Swords,
  TrendingUp,
  Timer,
  Coins,
  Package,
  Layers,
  AlertTriangle,
  LogOut,
  Users,
  Repeat,
  Shield,
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
  Legend,
  ReferenceArea,
} from 'recharts';
import api from '../../../services/api';

// ---- Types ----

interface CombatStats {
  totalEncounters: number;
  pveSurvivalRate: number;
  fleeAttemptRate: number;
  avgRounds: number;
  goldPerDay: number;
  itemsDroppedPerDay: number;
  activeLevelRange: string;
  survivalByLevel: Array<{
    band: string;
    encounters: number;
    wins: number;
    flees: number;
    fleeRate: number;
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
  dateRange: {
    start: string;
    end: string;
    preset: string | null;
    comparisonStart: string | null;
    comparisonEnd: string | null;
  };
  deltas: {
    totalEncounters: number;
    pveSurvivalRate: number;
    fleeAttemptRate: number;
    avgRounds: number;
    goldPerDay: number;
    itemsDroppedPerDay: number;
  } | null;
  engagement: {
    uniquePlayers: number;
    encountersPerPlayer: number;
    repeatCombatants: number;
    repeatRate: number;
    newPlayerSurvivalRate: number;
    newPlayerEncounters: number;
  };
  groupAnalysis: {
    soloEncounters: number;
    groupEncounters: number;
    groupRate: number;
    solo: {
      survivalRate: number;
      avgRounds: number;
      avgHpRemainingPct: number;
      avgGoldPerEncounter: number;
      avgXpPerEncounter: number;
      fleeRate: number;
    };
    group: {
      survivalRate: number;
      avgRounds: number;
      avgHpRemainingPct: number;
      avgGoldPerEncounter: number;
      avgXpPerEncounter: number;
      fleeRate: number;
    };
    survivalGap: number;
    sizeDistribution: Array<{ size: number; encounters: number; survivalRate: number }>;
  };
}

// ---- Constants ----

const LOOT_RARITY_COLORS: Record<string, string> = {
  POOR: '#9ca3af',
  COMMON: '#d1d5db',
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

const PRESETS = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'all', label: 'All Time' },
] as const;

// ---- Helpers ----

function survivalColor(rate: number): string {
  if (rate > 70) return 'text-realm-success';
  if (rate >= 40) return 'text-realm-warning';
  return 'text-realm-danger';
}

function fleeColor(rate: number): string {
  if (rate < 10) return 'text-realm-success';
  if (rate <= 30) return 'text-realm-warning';
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

function engagementPerPlayerColor(val: number): string {
  if (val > 3) return 'text-realm-success';
  if (val >= 1) return 'text-realm-warning';
  return 'text-realm-danger';
}

function repeatRateColor(rate: number): string {
  if (rate > 50) return 'text-realm-success';
  if (rate >= 25) return 'text-realm-warning';
  return 'text-realm-danger';
}

function newPlayerSurvivalColor(rate: number): string {
  if (rate > 60) return 'text-realm-success';
  if (rate >= 35) return 'text-realm-warning';
  return 'text-realm-danger';
}

function survivalGapColor(gap: number): string {
  if (gap < 15) return 'text-realm-success';
  if (gap <= 30) return 'text-realm-warning';
  return 'text-realm-danger';
}

function comparisonHighlight(soloVal: number, groupVal: number, isPercentage: boolean): string {
  const diff = Math.abs(groupVal - soloVal);
  const threshold = isPercentage ? 15 : soloVal * 0.5;
  if (diff <= threshold) return '';
  return groupVal > soloVal ? 'text-realm-warning' : 'text-realm-success';
}

type DeltaDirection = 'positive' | 'negative' | 'neutral';

function formatDelta(
  value: number | undefined,
  hasDeltas: boolean,
  direction: DeltaDirection,
  isPercent = false,
): { text: string; color: string } {
  if (!hasDeltas) return { text: 'No prior data', color: 'text-realm-text-muted' };
  if (value === undefined || value === null) return { text: '—', color: 'text-realm-text-muted' };
  if (value === 0) return { text: '— 0', color: 'text-realm-text-muted' };

  const arrow = value > 0 ? '▲' : '▼';
  const sign = value > 0 ? '+' : '';
  const suffix = isPercent ? 'pp' : '';
  const formatted = isPercent ? `${sign}${value.toFixed(1)}${suffix}` : `${sign}${value}`;
  const text = `${arrow} ${formatted} vs prev`;

  if (direction === 'neutral') return { text, color: 'text-realm-warning' };
  if (direction === 'positive') return { text, color: value > 0 ? 'text-realm-success' : 'text-realm-danger' };
  // negative: up is bad, down is good
  return { text, color: value > 0 ? 'text-realm-danger' : 'text-realm-success' };
}

// ---- Component ----

export default function OverviewTab({ dataSource = 'live', runId, compareRunId }: { dataSource?: string; runId?: string | null; compareRunId?: string | null }) {
  const [preset, setPreset] = useState<string>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const isCustom = !!(customStart && customEnd);

  const { data, isLoading, isFetching, error } = useQuery<CombatStats>({
    queryKey: ['admin', 'combat', 'stats', { dataSource, runId, ...(isCustom ? { startDate: customStart, endDate: customEnd } : { preset }) }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('dataSource', dataSource);
      if (runId) params.set('runId', runId);
      if (isCustom) {
        params.set('startDate', new Date(customStart).toISOString());
        params.set('endDate', new Date(customEnd + 'T23:59:59.999Z').toISOString());
      } else {
        params.set('preset', preset);
      }
      return (await api.get(`/admin/combat/stats?${params}`)).data;
    },
  });

  // Compare run data (only fetched when compareRunId is set)
  const { data: compareData } = useQuery<CombatStats>({
    queryKey: ['admin', 'combat', 'stats', { dataSource, runId: compareRunId, ...(isCustom ? { startDate: customStart, endDate: customEnd } : { preset }) }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('dataSource', dataSource);
      if (compareRunId) params.set('runId', compareRunId);
      if (isCustom) {
        params.set('startDate', new Date(customStart).toISOString());
        params.set('endDate', new Date(customEnd + 'T23:59:59.999Z').toISOString());
      } else {
        params.set('preset', preset);
      }
      return (await api.get(`/admin/combat/stats?${params}`)).data;
    },
    enabled: !!compareRunId,
  });

  function selectPreset(key: string) {
    setPreset(key);
    setCustomStart('');
    setCustomEnd('');
  }

  function handleCustomDate(start: string, end: string) {
    setCustomStart(start);
    setCustomEnd(end);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-3 h-12 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 h-32 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 h-24 animate-pulse" />
          ))}
        </div>
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg h-72 animate-pulse" />
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
      <div className="space-y-6">
        {/* Date picker still shown so user can change range */}
        <div className="flex items-center justify-between bg-realm-bg-700 border border-realm-border rounded-lg px-4 py-2">
          <div className="flex gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => selectPreset(p.key)}
                className={`px-3 py-1 text-xs font-display rounded-full transition-colors ${
                  !isCustom && preset === p.key
                    ? 'bg-realm-gold-600/20 text-realm-gold-400 border border-realm-gold-600/40'
                    : 'text-realm-text-muted hover:text-realm-text-secondary border border-transparent'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-12 text-center">
          <Swords className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
          <p className="text-realm-text-muted">No combat data in this period. Try a wider date range.</p>
        </div>
      </div>
    );
  }

  const hasDeltas = data.deltas !== null;

  // Compute cross-run comparison deltas when in compare mode
  const crossRunDeltas = compareData ? {
    totalEncounters: data.totalEncounters - compareData.totalEncounters,
    pveSurvivalRate: +(data.pveSurvivalRate - compareData.pveSurvivalRate).toFixed(1),
    fleeAttemptRate: +(data.fleeAttemptRate - compareData.fleeAttemptRate).toFixed(1),
    avgRounds: +(data.avgRounds - compareData.avgRounds).toFixed(1),
    goldPerDay: data.goldPerDay - compareData.goldPerDay,
    itemsDroppedPerDay: +(data.itemsDroppedPerDay - compareData.itemsDroppedPerDay).toFixed(1),
  } : null;

  const kpiCards: Array<{
    label: string;
    value: string;
    icon: typeof Swords;
    color: string;
    deltaKey?: keyof NonNullable<CombatStats['deltas']>;
    deltaDir?: DeltaDirection;
    isPercent?: boolean;
  }> = [
    { label: 'Total Encounters', value: data.totalEncounters.toLocaleString(), icon: Swords, color: 'text-realm-gold-400', deltaKey: 'totalEncounters', deltaDir: 'positive' },
    { label: 'PvE Survival Rate', value: `${data.pveSurvivalRate}%`, icon: TrendingUp, color: survivalColor(data.pveSurvivalRate), deltaKey: 'pveSurvivalRate', deltaDir: 'positive', isPercent: true },
    { label: 'Flee Rate', value: `${data.fleeAttemptRate}%`, icon: LogOut, color: fleeColor(data.fleeAttemptRate), deltaKey: 'fleeAttemptRate', deltaDir: 'negative', isPercent: true },
    { label: 'Avg Rounds', value: data.avgRounds.toFixed(1), icon: Timer, color: roundsColor(data.avgRounds), deltaKey: 'avgRounds', deltaDir: 'neutral' },
    { label: 'Gold / Day', value: data.goldPerDay.toLocaleString(), icon: Coins, color: 'text-realm-gold-300', deltaKey: 'goldPerDay', deltaDir: 'neutral' },
    { label: 'Items / Day', value: data.itemsDroppedPerDay.toFixed(1), icon: Package, color: 'text-realm-teal-300', deltaKey: 'itemsDroppedPerDay', deltaDir: 'neutral' },
    { label: 'Active Level Range', value: data.activeLevelRange, icon: Layers, color: 'text-realm-text-secondary' },
  ];

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="flex items-center justify-between bg-realm-bg-700 border border-realm-border rounded-lg px-4 py-2">
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => selectPreset(p.key)}
              className={`px-3 py-1 text-xs font-display rounded-full transition-colors ${
                !isCustom && preset === p.key
                  ? 'bg-realm-gold-600/20 text-realm-gold-400 border border-realm-gold-600/40'
                  : 'text-realm-text-muted hover:text-realm-text-secondary border border-transparent'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => handleCustomDate(e.target.value, customEnd)}
            className="bg-realm-bg-800 border border-realm-border text-realm-text-secondary text-xs rounded-sm px-2 py-1 focus:border-realm-gold-600/60 focus:outline-hidden"
          />
          <span className="text-realm-text-muted text-xs">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => handleCustomDate(customStart, e.target.value)}
            className="bg-realm-bg-800 border border-realm-border text-realm-text-secondary text-xs rounded-sm px-2 py-1 focus:border-realm-gold-600/60 focus:outline-hidden"
          />
        </div>
      </div>

      {/* TIER 1: KPI Cards */}
      <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 ${isFetching ? 'opacity-60' : ''}`}>
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const delta = card.deltaKey && data.deltas ? data.deltas[card.deltaKey] : undefined;
          const deltaInfo = card.deltaKey
            ? formatDelta(delta, hasDeltas, card.deltaDir ?? 'neutral', card.isPercent)
            : null;
          // Cross-run comparison delta (from compare mode)
          const crossDelta = card.deltaKey && crossRunDeltas
            ? (crossRunDeltas as Record<string, number>)[card.deltaKey]
            : undefined;
          const crossDeltaInfo = crossDelta !== undefined
            ? formatDelta(crossDelta, true, card.deltaDir ?? 'neutral', card.isPercent)
            : null;
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
              {crossDeltaInfo ? (
                <div className={`text-[10px] mt-1.5 ${crossDeltaInfo.color}`}>
                  {crossDeltaInfo.text.replace('vs prev', 'vs Run B')}
                </div>
              ) : deltaInfo ? (
                <div className={`text-[10px] mt-1.5 ${deltaInfo.color}`}>
                  {deltaInfo.text}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Player Engagement */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-3 hover:border-realm-gold-600/40 transition-colors">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-realm-text-muted" />
            <span className="text-realm-text-muted text-[10px] font-display uppercase tracking-wider">Unique Players</span>
          </div>
          <div className="text-lg font-display text-realm-text-primary">{data.engagement.uniquePlayers}</div>
          <div className="text-realm-text-muted text-[10px]">fought in this period</div>
        </div>
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-3 hover:border-realm-gold-600/40 transition-colors">
          <div className="flex items-center gap-1.5 mb-1">
            <Swords className="w-3.5 h-3.5 text-realm-text-muted" />
            <span className="text-realm-text-muted text-[10px] font-display uppercase tracking-wider">Encounters / Player</span>
          </div>
          <div className={`text-lg font-display ${engagementPerPlayerColor(data.engagement.encountersPerPlayer)}`}>
            {data.engagement.encountersPerPlayer}
          </div>
          <div className="text-realm-text-muted text-[10px]">avg per player</div>
        </div>
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-3 hover:border-realm-gold-600/40 transition-colors">
          <div className="flex items-center gap-1.5 mb-1">
            <Repeat className="w-3.5 h-3.5 text-realm-text-muted" />
            <span className="text-realm-text-muted text-[10px] font-display uppercase tracking-wider">Repeat Rate</span>
          </div>
          <div className={`text-lg font-display ${repeatRateColor(data.engagement.repeatRate)}`}>
            {data.engagement.repeatRate}%
          </div>
          <div className="text-realm-text-muted text-[10px]">
            {data.engagement.repeatCombatants} of {data.engagement.uniquePlayers} fought again
          </div>
        </div>
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-3 hover:border-realm-gold-600/40 transition-colors">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-realm-text-muted" />
            <span className="text-realm-text-muted text-[10px] font-display uppercase tracking-wider">New Player Survival</span>
          </div>
          <div className={`text-lg font-display ${newPlayerSurvivalColor(data.engagement.newPlayerSurvivalRate)}`}>
            {data.engagement.newPlayerSurvivalRate}%
          </div>
          <div className="text-realm-text-muted text-[10px]">
            Level 1-3 PvE ({data.engagement.newPlayerEncounters} fights)
          </div>
        </div>
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-3 hover:border-realm-gold-600/40 transition-colors">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-realm-text-muted" />
            <span className="text-realm-text-muted text-[10px] font-display uppercase tracking-wider">Group Rate</span>
          </div>
          <div className="text-lg font-display text-realm-text-primary">{data.groupAnalysis.groupRate}%</div>
          <div className="text-realm-text-muted text-[10px]">
            {data.groupAnalysis.groupEncounters} of {data.groupAnalysis.soloEncounters + data.groupAnalysis.groupEncounters} in groups
          </div>
        </div>
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
                if (name === 'fleeRate') return [`${value}%`, 'Flee Rate'];
                if (name === 'encounters') return [value, 'Encounters'];
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#9ca3af' }} />
            <Bar yAxisId="right" dataKey="encounters" fill="#242B45" radius={[4, 4, 0, 0]} name="Encounters" />
            <Line yAxisId="left" type="monotone" dataKey="survivalRate" stroke="#d4af37" strokeWidth={3} dot={{ r: 5, fill: '#d4af37' }} name="Survival Rate" />
            <Line yAxisId="left" type="monotone" dataKey="fleeRate" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: '#ef4444' }} name="Flee Rate" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Solo vs Group Combat */}
      {data.groupAnalysis.groupEncounters > 0 && (
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h3 className="font-display text-realm-text-primary text-sm mb-4">Solo vs Group Combat</h3>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
            {/* Solo column */}
            <div className="border-l-4 border-slate-500 bg-realm-bg-800/40 rounded-r-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Swords className="w-4 h-4 text-slate-400" />
                <span className="font-display text-sm text-realm-text-primary">Solo</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-realm-text-muted">Survival Rate</span><span className="text-realm-text-primary font-display">{data.groupAnalysis.solo.survivalRate}%</span></div>
                <div className="flex justify-between"><span className="text-realm-text-muted">Avg Rounds</span><span className="text-realm-text-primary font-display">{data.groupAnalysis.solo.avgRounds}</span></div>
                <div className="flex justify-between"><span className="text-realm-text-muted">Avg HP Left</span><span className="text-realm-text-primary font-display">{data.groupAnalysis.solo.avgHpRemainingPct}%</span></div>
                <div className="flex justify-between"><span className="text-realm-text-muted">Flee Rate</span><span className="text-realm-text-primary font-display">{data.groupAnalysis.solo.fleeRate}%</span></div>
                <div className="flex justify-between"><span className="text-realm-text-muted">Gold/Fight</span><span className="text-realm-text-primary font-display">{data.groupAnalysis.solo.avgGoldPerEncounter}</span></div>
                <div className="flex justify-between"><span className="text-realm-text-muted">XP/Fight</span><span className="text-realm-text-primary font-display">{data.groupAnalysis.solo.avgXpPerEncounter}</span></div>
              </div>
              <div className="text-realm-text-muted text-[10px] mt-3">({data.groupAnalysis.soloEncounters} encounters)</div>
            </div>

            {/* Gap indicator */}
            <div className="flex flex-col items-center justify-center px-2">
              <span className="text-realm-text-muted text-[10px] font-display uppercase tracking-wider mb-1">Gap</span>
              <span className={`text-2xl font-display ${survivalGapColor(data.groupAnalysis.survivalGap)}`}>
                {data.groupAnalysis.survivalGap > 0 ? '+' : ''}{data.groupAnalysis.survivalGap}pp
              </span>
              <span className={`text-[10px] mt-1 ${survivalGapColor(data.groupAnalysis.survivalGap)}`}>
                {data.groupAnalysis.survivalGap > 30 ? 'imbalanced' : data.groupAnalysis.survivalGap > 15 ? 'monitor' : 'healthy'}
              </span>
            </div>

            {/* Group column */}
            <div className="border-l-4 border-realm-gold-600/60 bg-realm-bg-800/40 rounded-r-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-realm-gold-400" />
                <span className="font-display text-sm text-realm-text-primary">Group</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-realm-text-muted">Survival Rate</span><span className={`font-display ${comparisonHighlight(data.groupAnalysis.solo.survivalRate, data.groupAnalysis.group.survivalRate, true) || 'text-realm-text-primary'}`}>{data.groupAnalysis.group.survivalRate}%</span></div>
                <div className="flex justify-between"><span className="text-realm-text-muted">Avg Rounds</span><span className={`font-display ${comparisonHighlight(data.groupAnalysis.solo.avgRounds, data.groupAnalysis.group.avgRounds, false) || 'text-realm-text-primary'}`}>{data.groupAnalysis.group.avgRounds}</span></div>
                <div className="flex justify-between"><span className="text-realm-text-muted">Avg HP Left</span><span className={`font-display ${comparisonHighlight(data.groupAnalysis.solo.avgHpRemainingPct, data.groupAnalysis.group.avgHpRemainingPct, true) || 'text-realm-text-primary'}`}>{data.groupAnalysis.group.avgHpRemainingPct}%</span></div>
                <div className="flex justify-between"><span className="text-realm-text-muted">Flee Rate</span><span className="text-realm-text-primary font-display">{data.groupAnalysis.group.fleeRate}%</span></div>
                <div className="flex justify-between"><span className="text-realm-text-muted">Gold/Fight</span><span className="text-realm-text-primary font-display">{data.groupAnalysis.group.avgGoldPerEncounter}</span></div>
                <div className="flex justify-between"><span className="text-realm-text-muted">XP/Fight</span><span className="text-realm-text-primary font-display">{data.groupAnalysis.group.avgXpPerEncounter}</span></div>
              </div>
              <div className="text-realm-text-muted text-[10px] mt-3">({data.groupAnalysis.groupEncounters} encounters)</div>
            </div>
          </div>

          {/* Group Size Distribution */}
          {data.groupAnalysis.sizeDistribution.length > 0 && (
            <div className="mt-5">
              <h4 className="font-display text-realm-text-secondary text-xs mb-3">Encounters by Group Size</h4>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={data.groupAnalysis.sizeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
                  <XAxis dataKey="size" stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={(s) => `${s} players`} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={{ color: '#d4af37' }}
                    formatter={(value: number, name: string) => {
                      if (name === 'encounters') return [value, 'Encounters'];
                      return [value, name];
                    }}
                    labelFormatter={(s) => `Group of ${s}`}
                  />
                  <Bar dataKey="encounters" fill="#d4af37" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 10, fill: '#9ca3af', formatter: (_: unknown, __: unknown, idx: number) => `${data.groupAnalysis.sizeDistribution[idx]?.survivalRate ?? 0}%` }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* TIER 2B: Economy Trend + Loot by Rarity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Economy Injection Trend */}
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h3 className="font-display text-realm-text-primary text-sm mb-4">Economy Injection</h3>
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
            <div className="text-center py-10 text-realm-text-muted text-sm">No data in this period</div>
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
              <span className="text-xs font-display uppercase tracking-wider text-realm-text-muted bg-realm-bg-800 px-2 py-1 rounded-sm flex-shrink-0">
                {CATEGORY_LABELS[alert.category] ?? alert.category}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
