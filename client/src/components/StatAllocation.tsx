import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Minus, Check, RotateCcw } from 'lucide-react';
import api from '../services/api';
import { RealmButton } from './ui/realm-index';

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
  { key: 'str', label: 'Strength', color: 'text-realm-danger' },
  { key: 'dex', label: 'Dexterity', color: 'text-realm-success' },
  { key: 'con', label: 'Constitution', color: 'text-realm-gold-400' },
  { key: 'int', label: 'Intelligence', color: 'text-realm-teal-300' },
  { key: 'wis', label: 'Wisdom', color: 'text-realm-purple-300' },
  { key: 'cha', label: 'Charisma', color: 'text-realm-bronze-400' },
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
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-6 text-center">
        <p className="text-realm-text-muted text-sm">No stat points to allocate.</p>
      </div>
    );
  }

  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-realm-gold-400">Allocate Stats</h3>
        <span className="text-sm font-display text-realm-text-primary">
          {remaining} <span className="text-realm-text-muted">points remaining</span>
        </span>
      </div>

      <div className="space-y-3">
        {STAT_LABELS.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-3">
            <span className={`w-24 text-sm font-semibold ${color}`}>{label}</span>
            <span className="text-realm-text-primary text-sm w-8 text-right font-display">
              {currentStats[key]}
            </span>
            {allocations[key] > 0 && (
              <span className="text-realm-success text-sm font-display w-10">
                +{allocations[key]}
              </span>
            )}
            {allocations[key] === 0 && <span className="w-10" />}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => decrement(key)}
                disabled={allocations[key] <= 0}
                className="w-7 h-7 rounded border border-realm-border flex items-center justify-center text-realm-text-secondary hover:bg-realm-bg-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => increment(key)}
                disabled={remaining <= 0}
                className="w-7 h-7 rounded border border-realm-border flex items-center justify-center text-realm-text-secondary hover:bg-realm-bg-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {mutation.isError && (
        <p className="mt-3 text-realm-danger text-xs">Failed to allocate stats. Please try again.</p>
      )}

      <div className="flex gap-3 mt-6">
        <RealmButton
          onClick={reset}
          disabled={totalAllocated === 0}
          variant="secondary"
          size="sm"
          className="flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </RealmButton>
        <RealmButton
          onClick={confirm}
          disabled={totalAllocated === 0 || mutation.isPending}
          variant="primary"
          className="flex items-center gap-1.5"
        >
          {mutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Confirm
        </RealmButton>
      </div>
    </div>
  );
}
