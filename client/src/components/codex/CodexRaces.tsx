import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { RealmCard } from '../ui/RealmCard';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types (match API response shape)
// ---------------------------------------------------------------------------
interface StatModifiers {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

interface RacialAbility {
  name: string;
  type: 'active' | 'passive';
  description: string;
  levelRequired: number;
  cooldownSeconds?: number;
  duration?: number;
}

interface SubRaceOption {
  id: string;
  name: string;
  bonusStat?: string;
  bonusValue?: number;
  description: string;
  element?: string;
  resistance?: string;
  specialPerk?: string;
}

interface ProfessionBonus {
  professionType: string;
  speedBonus?: number;
  qualityBonus?: number;
  yieldBonus?: number;
  xpBonus?: number;
}

interface RaceDefinition {
  id: string;
  name: string;
  tier: string;
  lore: string;
  trait: { name: string; description: string };
  statModifiers: StatModifiers;
  abilities: RacialAbility[];
  subRaces?: SubRaceOption[];
  professionBonuses?: ProfessionBonus[];
  startingTowns?: string[];
  homelandRegion?: string;
  exclusiveZone?: string;
}

const STAT_KEYS: (keyof StatModifiers)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatStat(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '0';
}

function formatStatClass(value: number): string {
  if (value > 0) return 'text-realm-success';
  if (value < 0) return 'text-realm-danger';
  return 'text-realm-text-muted';
}

function formatCooldown(seconds?: number): string {
  if (!seconds) return '';
  if (seconds >= 86400) {
    const days = Math.round(seconds / 86400);
    return `${days}d cooldown`;
  }
  if (seconds >= 3600) {
    const hours = Math.round(seconds / 3600);
    return `${hours}h cooldown`;
  }
  const mins = Math.round(seconds / 60);
  return `${mins}m cooldown`;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  if (seconds >= 3600) {
    const hours = Math.round(seconds / 3600);
    return `${hours}h`;
  }
  const mins = Math.round(seconds / 60);
  return `${mins}m`;
}

function matchesSearch(race: RaceDefinition, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();

  if (race.name.toLowerCase().includes(q)) return true;
  if (race.lore.toLowerCase().includes(q)) return true;
  if (race.trait?.name?.toLowerCase().includes(q)) return true;
  if ((race.abilities || []).some(a => a.name.toLowerCase().includes(q))) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatModifiersDisplay({ stats }: { stats: StatModifiers }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5">
      {STAT_KEYS.map(key => (
        <span key={key} className="text-xs font-body">
          <span className="text-realm-text-muted uppercase">{key}</span>{' '}
          <span className={formatStatClass(stats[key])}>{formatStat(stats[key])}</span>
        </span>
      ))}
    </div>
  );
}

function AbilitiesTable({ abilities }: { abilities: RacialAbility[] }) {
  if (!abilities || abilities.length === 0) {
    return <p className="text-realm-text-muted text-xs italic">No abilities defined.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-realm-border">
            <th className="text-left py-1.5 pr-3 text-realm-text-muted font-display uppercase tracking-wider">Lvl</th>
            <th className="text-left py-1.5 pr-3 text-realm-text-muted font-display uppercase tracking-wider">Name</th>
            <th className="text-left py-1.5 pr-3 text-realm-text-muted font-display uppercase tracking-wider">Type</th>
            <th className="text-left py-1.5 text-realm-text-muted font-display uppercase tracking-wider">Description</th>
          </tr>
        </thead>
        <tbody>
          {(abilities || []).map((ability, idx) => (
            <tr key={ability.name || idx} className="border-b border-realm-border/30">
              <td className="py-1.5 pr-3 text-realm-gold-400 font-display">{ability.levelRequired}</td>
              <td className="py-1.5 pr-3 text-realm-text-primary whitespace-nowrap">{ability.name}</td>
              <td className="py-1.5 pr-3">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-display ${
                    ability.type === 'active'
                      ? 'bg-realm-teal-300/10 text-realm-teal-300 border border-realm-teal-300/30'
                      : 'bg-realm-purple-300/10 text-realm-purple-300 border border-realm-purple-300/30'
                  }`}
                >
                  {ability.type}
                </span>
              </td>
              <td className="py-1.5 text-realm-text-secondary">
                {ability.description}
                {ability.cooldownSeconds ? (
                  <span className="ml-1 text-realm-text-muted">({formatCooldown(ability.cooldownSeconds)})</span>
                ) : null}
                {ability.duration ? (
                  <span className="ml-1 text-realm-text-muted">[{formatDuration(ability.duration)}]</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubRacesSection({ subRaces, raceName }: { subRaces: SubRaceOption[]; raceName: string }) {
  if (!subRaces || subRaces.length === 0) return null;

  return (
    <div>
      <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
        Sub-races ({subRaces.length})
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {(subRaces || []).map(sr => (
          <div
            key={sr.id}
            className="bg-realm-bg-800 border border-realm-border/50 rounded p-2.5"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-realm-text-primary font-display">{sr.name}</span>
              {sr.bonusStat && sr.bonusValue ? (
                <span className="text-[10px] text-realm-success">
                  +{sr.bonusValue} {sr.bonusStat?.toUpperCase()}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-realm-text-secondary leading-relaxed">{sr.description}</p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {sr.element ? (
                <span className="text-[10px] text-realm-text-muted">
                  Element: <span className="text-realm-teal-300">{sr.element}</span>
                </span>
              ) : null}
              {sr.resistance ? (
                <span className="text-[10px] text-realm-text-muted">
                  Resist: <span className="text-realm-purple-300">{sr.resistance}</span>
                </span>
              ) : null}
              {sr.specialPerk ? (
                <span className="text-[10px] text-realm-text-muted">
                  Perk: <span className="text-realm-gold-400">{sr.specialPerk}</span>
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfessionBonusesSection({ bonuses }: { bonuses?: ProfessionBonus[] }) {
  if (!bonuses || bonuses.length === 0) return null;

  return (
    <div>
      <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
        Profession Bonuses
      </h4>
      <div className="space-y-1">
        {(bonuses || []).map((bonus, idx) => {
          const parts: string[] = [];
          if (bonus.speedBonus) parts.push(`+${Math.round(bonus.speedBonus * 100)}% speed`);
          if (bonus.qualityBonus) parts.push(`+${Math.round(bonus.qualityBonus * 100)}% quality`);
          if (bonus.yieldBonus) parts.push(`+${Math.round(bonus.yieldBonus * 100)}% yield`);
          if (bonus.xpBonus) parts.push(`+${Math.round(bonus.xpBonus * 100)}% XP`);

          return (
            <div key={bonus.professionType || idx} className="flex items-center gap-2 text-xs">
              <span className="text-realm-text-primary capitalize">
                {bonus.professionType?.replace(/_/g, ' ')}
              </span>
              <span className="text-realm-text-muted">—</span>
              <span className="text-realm-success">{parts.join(', ') || 'No bonuses'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expanded Race Detail
// ---------------------------------------------------------------------------
function RaceExpandedDetail({ race }: { race: RaceDefinition }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="mt-4 pt-4 border-t border-realm-border/50 space-y-5">
        {/* Lore */}
        <div>
          <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-1.5">
            Lore
          </h4>
          <p className="text-xs text-realm-text-secondary leading-relaxed">
            {race.lore || 'No lore available.'}
          </p>
        </div>

        {/* Trait */}
        <div>
          <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-1.5">
            Racial Trait
          </h4>
          <div className="bg-realm-bg-800 border border-realm-border/50 rounded p-2.5">
            <span className="text-sm text-realm-text-primary font-display">{race.trait?.name}</span>
            <p className="text-xs text-realm-text-secondary mt-0.5">{race.trait?.description}</p>
          </div>
        </div>

        {/* Abilities */}
        <div>
          <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
            Racial Abilities ({(race.abilities || []).length})
          </h4>
          <AbilitiesTable abilities={race.abilities || []} />
        </div>

        {/* Sub-races */}
        <SubRacesSection subRaces={race.subRaces || []} raceName={race.name} />

        {/* Profession Bonuses */}
        <ProfessionBonusesSection bonuses={race.professionBonuses} />

        {/* Starting Towns */}
        {(race.startingTowns || []).length > 0 && (
          <div>
            <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
              Starting Towns
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(race.startingTowns || []).map(town => (
                <span
                  key={town}
                  className="text-xs bg-realm-bg-800 text-realm-text-primary px-2 py-1 rounded border border-realm-border/30"
                >
                  {town}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Homeland */}
        {race.homelandRegion && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-realm-text-muted">Homeland:</span>
            <span className="text-realm-text-primary">{race.homelandRegion}</span>
          </div>
        )}

        {/* Exclusive Zone */}
        {race.exclusiveZone && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-realm-text-muted">Exclusive Zone:</span>
            <span className="text-realm-gold-400 font-display">{race.exclusiveZone}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
interface CodexRacesProps {
  searchQuery: string;
}

export default function CodexRaces({ searchQuery }: CodexRacesProps) {
  const [expandedRaceId, setExpandedRaceId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ races: RaceDefinition[] }>({
    queryKey: ['codex', 'races'],
    queryFn: async () => (await api.get('/codex/races')).data,
    staleTime: 5 * 60 * 1000,
  });

  const races = data?.races ?? [];

  // Filter by search query
  const filteredRaces = useMemo(() => {
    if (!searchQuery) return races;
    return races.filter(race => matchesSearch(race, searchQuery));
  }, [races, searchQuery]);

  function handleCardClick(raceId: string) {
    setExpandedRaceId(prev => (prev === raceId ? null : raceId));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-realm-text-muted">
          <div className="w-5 h-5 border-2 border-realm-gold-400/50 border-t-realm-gold-400 rounded-full animate-spin" />
          <span className="font-body text-sm">Loading races...</span>
        </div>
      </div>
    );
  }

  return (
    <div>

      {/* Race cards grid */}
      {filteredRaces.length === 0 ? (
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-12 text-center">
          <p className="text-realm-text-muted font-display text-sm">No races found</p>
          {searchQuery && (
            <p className="text-realm-text-muted text-xs mt-1">
              Try adjusting your search query.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(filteredRaces || []).map((race, idx) => {
            const isExpanded = expandedRaceId === race.id;

            return (
              <motion.div
                key={race.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
                className={isExpanded ? 'md:col-span-2 xl:col-span-3' : ''}
              >
                <RealmCard
                  onClick={() => handleCardClick(race.id)}
                  selected={isExpanded}
                  className="flex flex-col min-h-[180px]"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-display text-lg text-realm-text-primary">
                      {race.name}
                    </h3>
                  </div>

                  {/* Trait name — flex-grow pushes stats to bottom */}
                  <p className="text-xs text-realm-text-secondary mb-2 flex-grow">
                    <span className="text-realm-gold-400 font-display">{race.trait?.name}</span>
                    {race.trait?.description ? (
                      <span className="text-realm-text-muted"> — {race.trait.description}</span>
                    ) : null}
                  </p>

                  {/* Stat modifiers — pinned to bottom */}
                  {race.statModifiers && (
                    <div className="mt-auto">
                      <StatModifiersDisplay stats={race.statModifiers} />
                    </div>
                  )}

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && <RaceExpandedDetail race={race} />}
                  </AnimatePresence>
                </RealmCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
