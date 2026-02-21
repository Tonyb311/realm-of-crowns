import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RealmCard } from '../ui/RealmCard';
import { RealmBadge } from '../ui/RealmBadge';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types (match API response shape)
// ---------------------------------------------------------------------------
interface CodexClassesProps {
  searchQuery: string;
}

interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
  specialization: string;
  tier: number;
  levelRequired: number;
  cooldown: number;
  effects?: { type: 'passive' | 'active' };
}

interface ClassData {
  name: string;
  specializations: string[];
  abilities: AbilityDefinition[];
}

// ---------------------------------------------------------------------------
// Static class metadata (no ClassDefinition with descriptions exists)
// ---------------------------------------------------------------------------
const CLASS_INFO: Record<string, { description: string; primaryStat: string; role: string }> = {
  warrior: { description: 'Masters of melee combat, built for the front line.', primaryStat: 'STR', role: 'Tank / DPS' },
  mage: { description: 'Wielders of arcane magic, devastating from afar.', primaryStat: 'INT', role: 'Ranged DPS' },
  rogue: { description: 'Stealthy strikers who excel in precision and subterfuge.', primaryStat: 'DEX', role: 'Melee DPS' },
  cleric: { description: 'Divine casters who heal allies and smite enemies.', primaryStat: 'WIS', role: 'Healer / Support' },
  ranger: { description: 'Versatile fighters with mastery of bow and beast.', primaryStat: 'DEX', role: 'Ranged DPS' },
  bard: { description: 'Charismatic performers who inspire allies and confound foes.', primaryStat: 'CHA', role: 'Support / Utility' },
  psion: { description: 'Mind-benders who warp reality with psychic power.', primaryStat: 'INT', role: 'Control / DPS' },
};

// ---------------------------------------------------------------------------
// Tier badge variant mapping
// ---------------------------------------------------------------------------
const TIER_VARIANT: Record<number, 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'> = {
  1: 'common',
  2: 'uncommon',
  3: 'rare',
  4: 'epic',
  5: 'legendary',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatCooldown(ability: AbilityDefinition): string {
  if (ability.cooldown === 0) {
    const effectType = ability.effects?.type;
    if (effectType === 'passive') return 'Passive';
    return 'No CD';
  }
  return `${ability.cooldown} rounds`;
}

function matchesSearch(query: string, ...values: string[]): boolean {
  const lower = query.toLowerCase();
  return values.some((v) => (v || '').toLowerCase().includes(lower));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CodexClasses({ searchQuery }: CodexClassesProps) {
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ classes: ClassData[] }>({
    queryKey: ['codex', 'classes'],
    queryFn: async () => (await api.get('/codex/classes')).data,
    staleTime: 5 * 60 * 1000,
  });

  const allClasses = data?.classes ?? [];

  // ---- Filter classes based on search query ----
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return allClasses;

    return allClasses.filter((classData) => {
      const cls = classData.name;
      const info = CLASS_INFO[cls];
      const specs = classData.specializations;
      const abilities = classData.abilities;

      if (matchesSearch(searchQuery, cls, info?.description || '', info?.role || '')) {
        return true;
      }
      if (specs.some((spec) => matchesSearch(searchQuery, spec))) {
        return true;
      }
      if (abilities.some((a) => matchesSearch(searchQuery, a.name, a.description))) {
        return true;
      }
      return false;
    });
  }, [allClasses, searchQuery]);

  // ---- Build abilities grouped by specialization for expanded class ----
  const getAbilitiesBySpec = (classData: ClassData, spec: string): AbilityDefinition[] => {
    return classData.abilities
      .filter((a) => a.specialization === spec)
      .filter((a) => {
        if (!searchQuery.trim()) return true;
        const cls = classData.name;
        const classInfo = CLASS_INFO[cls];
        if (matchesSearch(searchQuery, cls, classInfo?.description || '', classInfo?.role || '')) {
          return true;
        }
        if (matchesSearch(searchQuery, spec)) {
          return true;
        }
        return matchesSearch(searchQuery, a.name, a.description);
      })
      .sort((a, b) => a.tier - b.tier || a.levelRequired - b.levelRequired);
  };

  // ---- Toggle expansion ----
  const handleClassClick = (cls: string) => {
    setExpandedClass((prev) => (prev === cls ? null : cls));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-realm-text-muted">
          <div className="w-5 h-5 border-2 border-realm-gold-400/50 border-t-realm-gold-400 rounded-full animate-spin" />
          <span className="font-body text-sm">Loading classes...</span>
        </div>
      </div>
    );
  }

  // ---- Empty state ----
  if (filteredClasses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-realm-text-muted font-body text-sm">
          No classes match your search for "{searchQuery}".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Class card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredClasses.map((classData) => {
          const cls = classData.name;
          const info = CLASS_INFO[cls] || { description: '', primaryStat: '?', role: '?' };
          const specs = classData.specializations;
          const abilities = classData.abilities;
          const isExpanded = expandedClass === cls;

          return (
            <RealmCard
              key={cls}
              onClick={() => handleClassClick(cls)}
              selected={isExpanded}
              className="flex flex-col min-h-[180px]"
            >
              {/* Class name */}
              <h3 className="font-display text-lg text-realm-gold-400 mb-1">
                {capitalize(cls)}
              </h3>

              {/* Role & primary stat */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-body text-realm-text-muted uppercase tracking-wide">
                  {info.role}
                </span>
                <span className="text-xs font-body text-realm-text-muted">|</span>
                <span className="text-xs font-body text-realm-teal-300 uppercase tracking-wide">
                  {info.primaryStat}
                </span>
              </div>

              {/* Description — flex-grow pushes stats to bottom */}
              <p className="text-sm font-body text-realm-text-secondary mb-3 flex-grow">
                {info.description}
              </p>

              {/* Stats row — pinned to bottom */}
              <div className="mt-auto flex items-center gap-4 text-xs font-body text-realm-text-muted">
                <span>
                  <span className="text-realm-text-secondary">{specs.length}</span> specializations
                </span>
                <span>
                  <span className="text-realm-text-secondary">{abilities.length}</span> abilities
                </span>
              </div>
            </RealmCard>
          );
        })}
      </div>

      {/* Expanded class detail */}
      {expandedClass && (() => {
        const classData = allClasses.find(c => c.name === expandedClass);
        if (!classData) return null;

        return (
          <div className="bg-realm-bg-800 border border-realm-border rounded-md p-6 space-y-6">
            <h2 className="font-display text-2xl text-realm-gold-400">
              {capitalize(expandedClass)} Specializations
            </h2>

            {classData.specializations.map((spec) => {
              const specAbilities = getAbilitiesBySpec(classData, spec);

              return (
                <div key={spec} className="space-y-3">
                  {/* Specialization header */}
                  <h3 className="font-display text-lg text-realm-text-primary border-b border-realm-border pb-1">
                    {capitalize(spec)}
                  </h3>

                  {specAbilities.length === 0 ? (
                    <p className="text-realm-text-muted text-sm font-body py-2">
                      No abilities match your search in this specialization.
                    </p>
                  ) : (
                    /* Ability table */
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm font-body">
                        <thead>
                          <tr className="text-left text-realm-text-muted border-b border-realm-bg-600">
                            <th className="py-2 pr-3 w-20">Tier</th>
                            <th className="py-2 pr-3 w-48">Name</th>
                            <th className="py-2 pr-3">Description</th>
                            <th className="py-2 pr-3 w-20 text-center">Level</th>
                            <th className="py-2 w-24 text-center">Cooldown</th>
                          </tr>
                        </thead>
                        <tbody>
                          {specAbilities.map((ability) => (
                            <tr
                              key={ability.id}
                              className="border-b border-realm-bg-700 hover:bg-realm-bg-700/50 transition-colors"
                            >
                              <td className="py-2 pr-3">
                                <RealmBadge variant={TIER_VARIANT[ability.tier] || 'default'}>
                                  T{ability.tier}
                                </RealmBadge>
                              </td>
                              <td className="py-2 pr-3 text-realm-text-primary font-medium">
                                {ability.name}
                              </td>
                              <td className="py-2 pr-3 text-realm-text-secondary">
                                {ability.description}
                              </td>
                              <td className="py-2 pr-3 text-center text-realm-text-muted">
                                {ability.levelRequired}
                              </td>
                              <td className="py-2 text-center text-realm-text-muted">
                                {formatCooldown(ability)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
