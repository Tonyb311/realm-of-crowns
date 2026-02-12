import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronDown, Loader2, GitCompareArrows } from 'lucide-react';
import api from '../../services/api';
import type { RaceDefinition } from '@shared/types/race';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RaceSummary {
  id: string;
  name: string;
  tier: string;
}

interface RacesByTier {
  core: RaceSummary[];
  common: RaceSummary[];
  exotic: RaceSummary[];
}

// ---------------------------------------------------------------------------
// Stat keys
// ---------------------------------------------------------------------------
const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const STAT_LABELS: Record<string, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

// ---------------------------------------------------------------------------
// Stat bar rendering
// ---------------------------------------------------------------------------
function StatBar({ label, value, maxValue }: { label: string; value: number; maxValue: number }) {
  const percent = Math.max(0, Math.min(100, ((value + 4) / 8) * 100));
  const color = value > 0 ? 'bg-realm-success' : value < 0 ? 'bg-realm-danger' : 'bg-realm-text-muted/40';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-realm-text-muted uppercase w-8 text-right">{label}</span>
      <div className="flex-1 h-2 bg-realm-bg-900 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${percent}%` }} />
      </div>
      <span className={`text-xs font-display w-8 text-right ${
        value > 0 ? 'text-realm-success' : value < 0 ? 'text-realm-danger' : 'text-realm-text-muted'
      }`}>
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RaceCompare() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch all races list
  const { data: racesData } = useQuery<{ races: RacesByTier }>({
    queryKey: ['races'],
    queryFn: async () => {
      const res = await api.get('/races');
      return res.data;
    },
  });

  const allRaces: RaceSummary[] = racesData
    ? [...racesData.races.core, ...racesData.races.common, ...racesData.races.exotic]
    : [];

  // Fetch full details for selected races
  const raceQueries = selectedIds.map(id =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery<{ race: RaceDefinition }>({
      queryKey: ['race', id],
      queryFn: async () => {
        const res = await api.get(`/races/${id}`);
        return res.data;
      },
      enabled: !!id,
    })
  );

  const selectedRaces = raceQueries
    .map(q => q.data?.race)
    .filter((r): r is RaceDefinition => !!r);

  const isLoading = raceQueries.some(q => q.isLoading);

  // Add/remove race from comparison
  function toggleRace(slotIndex: number, raceId: string) {
    setSelectedIds(prev => {
      const next = [...prev];
      if (raceId === '') {
        next.splice(slotIndex, 1);
      } else {
        next[slotIndex] = raceId;
      }
      return next;
    });
  }

  function addSlot() {
    if (selectedIds.length < 3) {
      setSelectedIds(prev => [...prev, '']);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <GitCompareArrows className="w-5 h-5 text-realm-gold-400" />
        <h2 className="font-display text-xl text-realm-gold-400">Compare Races</h2>
      </div>

      {/* Race selectors */}
      <div className="flex flex-wrap gap-3 mb-6">
        {selectedIds.map((id, idx) => (
          <div key={idx} className="relative">
            <select
              value={id}
              onChange={e => toggleRace(idx, e.target.value)}
              className="appearance-none bg-realm-bg-700 border border-realm-border rounded px-4 py-2 text-sm text-realm-text-primary pr-8 focus:border-realm-gold-400 focus:outline-none min-w-[180px]"
            >
              <option value="">Select race...</option>
              {allRaces.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-realm-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        ))}
        {selectedIds.length < 3 && (
          <button
            onClick={addSlot}
            className="px-4 py-2 border border-dashed border-realm-gold-400/40 text-realm-gold-400 text-sm font-display rounded hover:bg-realm-bg-700 transition-colors"
          >
            + Add Race
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
        </div>
      )}

      {/* Comparison grid */}
      {selectedRaces.length >= 2 && !isLoading && (
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Stat comparison */}
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
            <h3 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-4">Stat Modifiers</h3>

            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedRaces.length}, 1fr)` }}>
              {/* Race names */}
              {selectedRaces.map(race => (
                <div key={race.id} className="text-center">
                  <p className="font-display text-sm text-realm-text-primary">{race.name}</p>
                  <p className="text-[10px] text-realm-text-muted capitalize">{race.tier}</p>
                </div>
              ))}
            </div>

            {STAT_KEYS.map(stat => (
              <div key={stat} className="mt-3">
                <p className="text-[10px] text-realm-text-muted uppercase mb-1">{STAT_LABELS[stat]}</p>
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedRaces.length}, 1fr)` }}>
                  {selectedRaces.map(race => (
                    <StatBar
                      key={`${race.id}-${stat}`}
                      label=""
                      value={race.statModifiers[stat]}
                      maxValue={4}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Ability comparison */}
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
            <h3 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-4">Abilities</h3>

            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedRaces.length}, 1fr)` }}>
              {selectedRaces.map(race => (
                <div key={race.id} className="space-y-2">
                  <p className="font-display text-sm text-realm-text-primary border-b border-realm-border pb-1">{race.name}</p>
                  {race.abilities.map(a => (
                    <div key={a.name} className="bg-realm-bg-800 rounded p-2">
                      <p className="text-xs text-realm-text-primary font-display">{a.name}</p>
                      <p className="text-[10px] text-realm-text-muted">
                        Lv.{a.levelRequired} | {a.type}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Profession bonus comparison */}
          <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
            <h3 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-4">Profession Bonuses</h3>

            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedRaces.length}, 1fr)` }}>
              {selectedRaces.map(race => (
                <div key={race.id} className="space-y-1.5">
                  <p className="font-display text-sm text-realm-text-primary border-b border-realm-border pb-1">{race.name}</p>
                  {race.professionBonuses.length === 0 ? (
                    <p className="text-xs text-realm-text-muted">No bonuses</p>
                  ) : (
                    race.professionBonuses.map(pb => {
                      const parts: string[] = [];
                      if (pb.speedBonus) parts.push(`Spd +${(pb.speedBonus * 100).toFixed(0)}%`);
                      if (pb.qualityBonus) parts.push(`Qual +${(pb.qualityBonus * 100).toFixed(0)}%`);
                      if (pb.yieldBonus) parts.push(`Yield +${(pb.yieldBonus * 100).toFixed(0)}%`);
                      if (pb.xpBonus) parts.push(`XP +${(pb.xpBonus * 100).toFixed(0)}%`);
                      return (
                        <div key={pb.professionType} className="bg-realm-bg-800 rounded px-2 py-1.5">
                          <p className="text-xs text-realm-text-primary capitalize">
                            {pb.professionType.replace(/_/g, ' ').toLowerCase()}
                          </p>
                          <p className="text-[10px] text-realm-success">{parts.join(', ')}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {selectedRaces.length < 2 && !isLoading && selectedIds.length > 0 && (
        <p className="text-sm text-realm-text-muted text-center py-8">
          Select at least 2 races to compare.
        </p>
      )}
    </div>
  );
}
