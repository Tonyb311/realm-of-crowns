import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Minus, Check, RotateCcw } from 'lucide-react';
import api from '../services/api';

interface StatAllocationProps {
  currentStats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  unspentStatPoints: number;
  onDone?: () => void;
}

const STAT_LABELS: { key: keyof StatAllocationProps['currentStats']; label: string; color: string }[] = [
  { key: 'str', label: 'Strength', color: 'text-red-400' },
  { key: 'dex', label: 'Dexterity', color: 'text-green-400' },
  { key: 'con', label: 'Constitution', color: 'text-amber-400' },
  { key: 'int', label: 'Intelligence', color: 'text-blue-400' },
  { key: 'wis', label: 'Wisdom', color: 'text-purple-400' },
  { key: 'cha', label: 'Charisma', color: 'text-pink-400' },
];

export default function StatAllocation({ currentStats, unspentStatPoints, onDone }: StatAllocationProps) {
  const queryClient = useQueryClient();
  const [allocations, setAllocations] = useState<Record<string, number>>({
    str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0,
  });

  const totalAllocated = Object.values(allocations).reduce((s, v) => s + v, 0);
  const remaining = unspentStatPoints - totalAllocated;

  const mutation = useMutation({
    mutationFn: async (body: Record<string, number>) => {
      return (await api.post('/characters/allocate-stats', body)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      setAllocations({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
      onDone?.();
    },
  });

  function increment(stat: string) {
    if (remaining <= 0) return;
    setAllocations((prev) => ({ ...prev, [stat]: prev[stat] + 1 }));
  }

  function decrement(stat: string) {
    if (allocations[stat] <= 0) return;
    setAllocations((prev) => ({ ...prev, [stat]: prev[stat] - 1 }));
  }

  function reset() {
    setAllocations({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });
  }

  function confirm() {
    const body: Record<string, number> = {};
    for (const [k, v] of Object.entries(allocations)) {
      if (v > 0) body[k] = v;
    }
    if (Object.keys(body).length === 0) return;
    mutation.mutate(body);
  }

  if (unspentStatPoints === 0) {
    return (
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-6 text-center">
        <p className="text-parchment-500 text-sm">No stat points to allocate.</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-300 border border-dark-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-primary-400">Allocate Stats</h3>
        <span className="text-sm font-display text-parchment-200">
          {remaining} <span className="text-parchment-500">points remaining</span>
        </span>
      </div>

      <div className="space-y-3">
        {STAT_LABELS.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-3">
            <span className={`w-24 text-sm font-semibold ${color}`}>{label}</span>
            <span className="text-parchment-200 text-sm w-8 text-right font-display">
              {currentStats[key]}
            </span>
            {allocations[key] > 0 && (
              <span className="text-green-400 text-sm font-display w-10">
                +{allocations[key]}
              </span>
            )}
            {allocations[key] === 0 && <span className="w-10" />}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => decrement(key)}
                disabled={allocations[key] <= 0}
                className="w-7 h-7 rounded border border-dark-50 flex items-center justify-center text-parchment-400 hover:bg-dark-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => increment(key)}
                disabled={remaining <= 0}
                className="w-7 h-7 rounded border border-dark-50 flex items-center justify-center text-parchment-400 hover:bg-dark-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {mutation.isError && (
        <p className="mt-3 text-red-400 text-xs">Failed to allocate stats. Please try again.</p>
      )}

      <div className="flex gap-3 mt-6">
        <button
          onClick={reset}
          disabled={totalAllocated === 0}
          className="flex items-center gap-1.5 px-4 py-2 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-200 disabled:opacity-30 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
        <button
          onClick={confirm}
          disabled={totalAllocated === 0 || mutation.isPending}
          className="flex items-center gap-1.5 px-6 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {mutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Confirm
        </button>
      </div>
    </div>
  );
}
