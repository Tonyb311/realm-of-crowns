import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Swords,
  Shield,
  Zap,
  Wind,
  Scale,
  Loader2,
  Save,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CombatStance = 'AGGRESSIVE' | 'BALANCED' | 'DEFENSIVE' | 'EVASIVE';

interface CombatParams {
  combatStance: CombatStance;
  retreatHpThreshold: number;
  retreatOppositionRatio: number;
  retreatRoundLimit: number;
  neverRetreat: boolean;
  abilityPriorityQueue: string[];
  itemUsageRules: Record<string, unknown>;
  pvpLootBehavior: string;
}

// ---------------------------------------------------------------------------
// Stance config
// ---------------------------------------------------------------------------

const STANCES: {
  key: CombatStance;
  label: string;
  icon: typeof Swords;
  color: string;
  description: string;
}[] = [
  {
    key: 'AGGRESSIVE',
    label: 'Aggressive',
    icon: Swords,
    color: 'text-red-400 border-red-500/40 bg-red-500/10',
    description: '+2 Attack / -2 AC',
  },
  {
    key: 'BALANCED',
    label: 'Balanced',
    icon: Scale,
    color: 'text-parchment-300 border-parchment-500/40 bg-parchment-500/10',
    description: 'No modifiers',
  },
  {
    key: 'DEFENSIVE',
    label: 'Defensive',
    icon: Shield,
    color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
    description: '-2 Attack / +2 AC',
  },
  {
    key: 'EVASIVE',
    label: 'Evasive',
    icon: Wind,
    color: 'text-green-400 border-green-500/40 bg-green-500/10',
    description: '-4 Attack / +4 AC / +4 Flee',
  },
];

const PVP_LOOT_OPTIONS = [
  { value: 'TAKE_ALL', label: 'Take everything' },
  { value: 'TAKE_GOLD', label: 'Gold only' },
  { value: 'TAKE_ITEMS', label: 'Items only' },
  { value: 'TAKE_NOTHING', label: 'Take nothing' },
];

const TOAST_STYLE = {
  background: '#1a1a2e',
  color: '#e8d5b7',
  border: '1px solid #c9a84c',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CombatParameterPanel() {
  const queryClient = useQueryClient();

  const { data: paramsData, isLoading } = useQuery<{ combatParams: CombatParams | null }>({
    queryKey: ['actions', 'combat-params'],
    queryFn: async () => {
      const res = await api.get('/actions/combat-params');
      return res.data;
    },
  });

  const [stance, setStance] = useState<CombatStance>('BALANCED');
  const [hpThreshold, setHpThreshold] = useState(25);
  const [oppositionRatio, setOppositionRatio] = useState(3);
  const [roundLimit, setRoundLimit] = useState(10);
  const [neverRetreat, setNeverRetreat] = useState(false);
  const [pvpLoot, setPvpLoot] = useState('TAKE_GOLD');

  // Sync from server
  useEffect(() => {
    if (paramsData?.combatParams) {
      const p = paramsData.combatParams;
      setStance(p.combatStance ?? 'BALANCED');
      setHpThreshold(Math.round((p.retreatHpThreshold ?? 0.25) * 100));
      setOppositionRatio(p.retreatOppositionRatio ?? 3);
      setRoundLimit(p.retreatRoundLimit ?? 10);
      setNeverRetreat(p.neverRetreat ?? false);
      setPvpLoot(p.pvpLootBehavior ?? 'TAKE_GOLD');
    }
  }, [paramsData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put('/actions/combat-params', {
        combatStance: stance,
        retreatHpThreshold: hpThreshold / 100,
        retreatOppositionRatio: oppositionRatio,
        retreatRoundLimit: roundLimit,
        neverRetreat,
        pvpLootBehavior: pvpLoot,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions', 'combat-params'] });
      toast.success('Combat parameters saved', { style: TOAST_STYLE });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to save', { style: TOAST_STYLE });
    },
  });

  if (isLoading) {
    return (
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-dark-300 border border-dark-50 rounded-lg p-5 space-y-5">
      <h3 className="font-display text-primary-400 text-sm flex items-center gap-2">
        <Zap className="w-4 h-4" />
        Combat Parameters
      </h3>

      {/* Stance selector */}
      <div>
        <p className="text-[10px] text-parchment-500 uppercase tracking-wider mb-2">Combat Stance</p>
        <div className="grid grid-cols-2 gap-2">
          {STANCES.map((s) => {
            const Icon = s.icon;
            const isActive = stance === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setStance(s.key)}
                className={`flex items-center gap-2 p-3 rounded-lg border text-xs font-display transition-all
                  ${isActive ? s.color : 'border-dark-50 text-parchment-500 hover:border-parchment-500/30'}`}
              >
                <Icon className="w-4 h-4" />
                <div className="text-left">
                  <p>{s.label}</p>
                  <p className="text-[10px] opacity-70 font-sans">{s.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Retreat conditions */}
      <div>
        <p className="text-[10px] text-parchment-500 uppercase tracking-wider mb-2">Retreat Conditions</p>
        <div className="space-y-3 p-3 bg-dark-400 rounded-lg">
          {/* Never retreat toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={neverRetreat}
              onChange={(e) => setNeverRetreat(e.target.checked)}
              className="w-4 h-4 rounded border-dark-50 bg-dark-500 text-primary-400 focus:ring-primary-400 focus:ring-offset-0"
            />
            <span className={`text-xs ${neverRetreat ? 'text-red-400 font-display' : 'text-parchment-300'}`}>
              Never Retreat (fight to the death)
            </span>
          </label>

          {!neverRetreat && (
            <>
              {/* HP threshold */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-parchment-300">HP Threshold</span>
                  <span className="text-xs text-primary-400 font-display">{hpThreshold}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={hpThreshold}
                  onChange={(e) => setHpThreshold(Number(e.target.value))}
                  className="w-full h-1.5 bg-dark-500 rounded-full appearance-none cursor-pointer accent-primary-400"
                />
              </div>

              {/* Opposition ratio */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-parchment-300">Opposition Ratio</span>
                  <span className="text-xs text-primary-400 font-display">{oppositionRatio}:1</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={oppositionRatio}
                  onChange={(e) => setOppositionRatio(Number(e.target.value))}
                  className="w-full h-1.5 bg-dark-500 rounded-full appearance-none cursor-pointer accent-primary-400"
                />
              </div>

              {/* Round limit */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-parchment-300">Round Limit</span>
                  <span className="text-xs text-primary-400 font-display">{roundLimit}</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={30}
                  step={1}
                  value={roundLimit}
                  onChange={(e) => setRoundLimit(Number(e.target.value))}
                  className="w-full h-1.5 bg-dark-500 rounded-full appearance-none cursor-pointer accent-primary-400"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* PvP Loot */}
      <div>
        <p className="text-[10px] text-parchment-500 uppercase tracking-wider mb-2">PvP Loot Behavior</p>
        <div className="space-y-1">
          {PVP_LOOT_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-dark-400 transition-colors"
            >
              <input
                type="radio"
                name="pvpLoot"
                checked={pvpLoot === opt.value}
                onChange={() => setPvpLoot(opt.value)}
                className="w-3.5 h-3.5 border-dark-50 bg-dark-500 text-primary-400 focus:ring-primary-400 focus:ring-offset-0"
              />
              <span className="text-xs text-parchment-300">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full py-2.5 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saveMutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        Save Combat Parameters
      </button>

      {saveMutation.isError && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {(saveMutation.error as any)?.response?.data?.error ?? 'Failed to save parameters'}
        </div>
      )}
    </div>
  );
}
