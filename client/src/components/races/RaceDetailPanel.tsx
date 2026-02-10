import { motion } from 'framer-motion';
import { Lock, Unlock, Swords, MapPin } from 'lucide-react';
import type { RaceDefinition } from '@shared/types/race';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RaceDetailPanelProps {
  race: RaceDefinition;
  onClose?: () => void;
}

// ---------------------------------------------------------------------------
// Stat keys + rendering
// ---------------------------------------------------------------------------
const STAT_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

function renderStatMod(val: number) {
  if (val > 0) return <span className="text-green-400 font-display">+{val}</span>;
  if (val < 0) return <span className="text-red-400 font-display">{val}</span>;
  return <span className="text-parchment-500 font-display">+0</span>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RaceDetailPanel({ race, onClose }: RaceDetailPanelProps) {
  return (
    <motion.div
      className="bg-dark-300 border border-dark-50 rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="p-5 border-b border-dark-50">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl text-primary-400">{race.name}</h2>
            <p className="text-xs text-parchment-500 mt-0.5">
              <MapPin className="w-3 h-3 inline mr-1" />
              {race.homelandRegion}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-parchment-500 hover:text-parchment-200 text-sm"
            >
              Close
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Lore */}
        <div>
          <h3 className="font-display text-primary-400 text-xs uppercase tracking-wider mb-2">Lore</h3>
          <p className="text-xs text-parchment-300 leading-relaxed">{race.lore}</p>
        </div>

        {/* Stat modifiers */}
        <div>
          <h3 className="font-display text-primary-400 text-xs uppercase tracking-wider mb-2">Stat Modifiers</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {STAT_KEYS.map(s => (
              <div key={s} className="bg-dark-400 rounded p-2 text-center">
                <p className="text-[10px] text-parchment-500 uppercase">{s}</p>
                <p className="text-lg">{renderStatMod(race.statModifiers[s])}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Racial trait */}
        <div>
          <h3 className="font-display text-primary-400 text-xs uppercase tracking-wider mb-2">Racial Trait</h3>
          <div className="bg-dark-400 border border-primary-400/20 rounded p-3">
            <p className="text-sm text-primary-400 font-display">{race.trait.name}</p>
            <p className="text-xs text-parchment-300 mt-1">{race.trait.description}</p>
          </div>
        </div>

        {/* Abilities */}
        <div>
          <h3 className="font-display text-primary-400 text-xs uppercase tracking-wider mb-2">Abilities</h3>
          <div className="space-y-2">
            {race.abilities.map(ability => {
              const locked = ability.levelRequired > 1;
              return (
                <div
                  key={ability.name}
                  className={`bg-dark-400 rounded p-3 ${locked ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {locked ? (
                      <Lock className="w-3.5 h-3.5 text-parchment-500" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-green-400" />
                    )}
                    <span className="text-sm text-parchment-200 font-display">{ability.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      ability.type === 'active'
                        ? 'bg-blue-700/50 text-blue-300'
                        : 'bg-dark-50/50 text-parchment-500'
                    }`}>
                      {ability.type}
                    </span>
                    <span className="text-[10px] text-parchment-500 ml-auto">
                      Lv.{ability.levelRequired}
                    </span>
                  </div>
                  <p className="text-xs text-parchment-300">{ability.description}</p>
                  {ability.cooldownSeconds && (
                    <p className="text-[10px] text-parchment-500 mt-1">
                      Cooldown: {ability.cooldownSeconds}s
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Profession bonuses */}
        {race.professionBonuses.length > 0 && (
          <div>
            <h3 className="font-display text-primary-400 text-xs uppercase tracking-wider mb-2">Profession Affinities</h3>
            <div className="space-y-1.5">
              {race.professionBonuses.map(pb => {
                const bonuses: string[] = [];
                if (pb.speedBonus) bonuses.push(`Speed +${(pb.speedBonus * 100).toFixed(0)}%`);
                if (pb.qualityBonus) bonuses.push(`Quality +${(pb.qualityBonus * 100).toFixed(0)}%`);
                if (pb.yieldBonus) bonuses.push(`Yield +${(pb.yieldBonus * 100).toFixed(0)}%`);
                if (pb.xpBonus) bonuses.push(`XP +${(pb.xpBonus * 100).toFixed(0)}%`);

                return (
                  <div key={pb.professionType} className="flex items-center justify-between bg-dark-400 rounded px-3 py-2">
                    <span className="text-xs text-parchment-200 capitalize">
                      {pb.professionType.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    <span className="text-xs text-green-400">{bonuses.join(', ')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Homeland info */}
        <div>
          <h3 className="font-display text-primary-400 text-xs uppercase tracking-wider mb-2">Homeland</h3>
          <div className="bg-dark-400 rounded p-3">
            <p className="text-sm text-parchment-200 font-display">{race.homelandRegion}</p>
            {race.startingTowns.length > 0 && (
              <p className="text-xs text-parchment-500 mt-1">
                Starting towns: {race.startingTowns.join(', ')}
              </p>
            )}
            {race.exclusiveZone && (
              <p className="text-xs text-purple-400 mt-1">
                <Swords className="w-3 h-3 inline mr-1" />
                Exclusive zone: {race.exclusiveZone}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
