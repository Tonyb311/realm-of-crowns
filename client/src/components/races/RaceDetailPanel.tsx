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
  if (val > 0) return <span className="text-realm-success font-display">+{val}</span>;
  if (val < 0) return <span className="text-realm-danger font-display">{val}</span>;
  return <span className="text-realm-text-muted font-display">+0</span>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RaceDetailPanel({ race, onClose }: RaceDetailPanelProps) {
  return (
    <motion.div
      className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header */}
      <div className="p-5 border-b border-realm-border">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl text-realm-gold-400">{race.name}</h2>
            <p className="text-xs text-realm-text-muted mt-0.5">
              <MapPin className="w-3 h-3 inline mr-1" />
              {race.homelandRegion}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-realm-text-muted hover:text-realm-text-primary text-sm"
            >
              Close
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Lore */}
        <div>
          <h3 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">Lore</h3>
          <p className="text-xs text-realm-text-secondary leading-relaxed">{race.lore}</p>
        </div>

        {/* Stat modifiers */}
        <div>
          <h3 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">Stat Modifiers</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {STAT_KEYS.map(s => (
              <div key={s} className="bg-realm-bg-800 rounded p-2 text-center">
                <p className="text-[10px] text-realm-text-muted uppercase">{s}</p>
                <p className="text-lg">{renderStatMod(race.statModifiers[s])}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Racial trait */}
        <div>
          <h3 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">Racial Trait</h3>
          <div className="bg-realm-bg-800 border border-realm-gold-400/20 rounded p-3">
            <p className="text-sm text-realm-gold-400 font-display">{race.trait.name}</p>
            <p className="text-xs text-realm-text-secondary mt-1">{race.trait.description}</p>
          </div>
        </div>

        {/* Abilities */}
        <div>
          <h3 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">Abilities</h3>
          <div className="space-y-2">
            {race.abilities.map(ability => {
              const locked = ability.levelRequired > 1;
              return (
                <div
                  key={ability.name}
                  className={`bg-realm-bg-800 rounded p-3 ${locked ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {locked ? (
                      <Lock className="w-3.5 h-3.5 text-realm-text-muted" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-realm-success" />
                    )}
                    <span className="text-sm text-realm-text-primary font-display">{ability.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      ability.type === 'active'
                        ? 'bg-realm-teal-300/20 text-realm-teal-300'
                        : 'bg-realm-border/50 text-realm-text-muted'
                    }`}>
                      {ability.type}
                    </span>
                    <span className="text-[10px] text-realm-text-muted ml-auto">
                      Lv.{ability.levelRequired}
                    </span>
                  </div>
                  <p className="text-xs text-realm-text-secondary">{ability.description}</p>
                  {ability.cooldownSeconds && (
                    <p className="text-[10px] text-realm-text-muted mt-1">
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
            <h3 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">Profession Affinities</h3>
            <div className="space-y-1.5">
              {race.professionBonuses.map(pb => {
                const bonuses: string[] = [];
                if (pb.speedBonus) bonuses.push(`Speed +${(pb.speedBonus * 100).toFixed(0)}%`);
                if (pb.qualityBonus) bonuses.push(`Quality +${(pb.qualityBonus * 100).toFixed(0)}%`);
                if (pb.yieldBonus) bonuses.push(`Yield +${(pb.yieldBonus * 100).toFixed(0)}%`);
                if (pb.xpBonus) bonuses.push(`XP +${(pb.xpBonus * 100).toFixed(0)}%`);

                return (
                  <div key={pb.professionType} className="flex items-center justify-between bg-realm-bg-800 rounded px-3 py-2">
                    <span className="text-xs text-realm-text-primary capitalize">
                      {pb.professionType.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    <span className="text-xs text-realm-success">{bonuses.join(', ')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Homeland info */}
        <div>
          <h3 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">Homeland</h3>
          <div className="bg-realm-bg-800 rounded p-3">
            <p className="text-sm text-realm-text-primary font-display">{race.homelandRegion}</p>
            {race.startingTowns.length > 0 && (
              <p className="text-xs text-realm-text-muted mt-1">
                Starting towns: {race.startingTowns.join(', ')}
              </p>
            )}
            {race.exclusiveZone && (
              <p className="text-xs text-realm-purple-300 mt-1">
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
