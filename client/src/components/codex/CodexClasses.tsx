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
  attackType?: 'weapon' | 'spell' | 'save' | 'auto';
  damageType?: string;
  saveType?: string;
}

interface Tier0Ability {
  id: string;
  name: string;
  description: string;
  tier: number;
  levelRequired: number;
  cooldown: number;
  choiceGroup?: string;
  attackType?: 'weapon' | 'spell' | 'save' | 'auto';
  damageType?: string;
  saveType?: string;
}

interface Tier0Group {
  choiceLevel: number;
  abilities: Tier0Ability[];
}

interface ClassData {
  name: string;
  specializations: string[];
  tier0Abilities: Tier0Group[];
  specAbilities: AbilityDefinition[];
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
const TIER_VARIANT: Record<number, 'default' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'> = {
  0: 'default',
  1: 'common',
  2: 'uncommon',
  3: 'rare',
  4: 'epic',
  5: 'legendary',
};

// ---------------------------------------------------------------------------
// Attack type & damage type display
// ---------------------------------------------------------------------------
const ATTACK_TYPE_STYLE: Record<string, { label: string; className: string }> = {
  weapon: { label: 'Melee', className: 'bg-realm-gold-400/15 text-realm-gold-400 border border-realm-gold-400/30' },
  spell: { label: 'Spell', className: 'bg-violet-500/15 text-violet-400 border border-violet-500/30' },
  save: { label: 'Save', className: 'bg-teal-500/15 text-teal-400 border border-teal-500/30' },
};

const DAMAGE_TYPE_STYLE: Record<string, string> = {
  FIRE: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  COLD: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  LIGHTNING: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  RADIANT: 'bg-amber-200/20 text-amber-200 border border-amber-200/30',
  NECROTIC: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  PSYCHIC: 'bg-pink-500/20 text-pink-400 border border-pink-500/30',
  THUNDER: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  SLASHING: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  PIERCING: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  BLUDGEONING: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
};

function AttackTypeBadge({ attackType }: { attackType?: string }) {
  if (!attackType || attackType === 'auto') return null;
  const style = ATTACK_TYPE_STYLE[attackType];
  if (!style) return null;
  return (
    <span className={`${style.className} px-1.5 py-0 rounded text-[10px] font-display leading-4`}>
      {style.label}
    </span>
  );
}

function DamageTypeBadge({ damageType }: { damageType?: string }) {
  if (!damageType) return null;
  const style = DAMAGE_TYPE_STYLE[damageType] ?? 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  return (
    <span className={`${style} px-1.5 py-0 rounded text-[10px] font-display leading-4`}>
      {damageType}
    </span>
  );
}

function SaveInfo({ attackType, saveType }: { attackType?: string; saveType?: string }) {
  if (attackType !== 'save' || !saveType) return null;
  return (
    <span className="text-teal-400 text-xs ml-1">
      (Target: {saveType.toUpperCase()} Save)
    </span>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatCooldown(ability: { cooldown: number; effects?: { type: 'passive' | 'active' } }): string {
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

  // ---- Count total abilities (spec + tier 0) ----
  const getTotalAbilityCount = (classData: ClassData): number => {
    const specCount = classData.specAbilities?.length ?? classData.abilities?.length ?? 0;
    const tier0Count = classData.tier0Abilities?.reduce((sum, g) => sum + g.abilities.length, 0) ?? 0;
    return specCount + tier0Count;
  };

  // ---- Filter classes based on search query ----
  const filteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return allClasses;

    return allClasses.filter((classData) => {
      const cls = classData.name;
      const info = CLASS_INFO[cls];
      const specs = classData.specializations;
      const specAbilities = classData.specAbilities ?? classData.abilities ?? [];
      const tier0Abilities = classData.tier0Abilities ?? [];

      if (matchesSearch(searchQuery, cls, info?.description || '', info?.role || '')) {
        return true;
      }
      if (specs.some((spec) => matchesSearch(searchQuery, spec))) {
        return true;
      }
      if (specAbilities.some((a) => matchesSearch(searchQuery, a.name, a.description, a.damageType || '', a.attackType || ''))) {
        return true;
      }
      if (tier0Abilities.some((g) => g.abilities.some((a) => matchesSearch(searchQuery, a.name, a.description, a.damageType || '', a.attackType || '')))) {
        return true;
      }
      return false;
    });
  }, [allClasses, searchQuery]);

  // ---- Build abilities grouped by specialization for expanded class ----
  const getAbilitiesBySpec = (classData: ClassData, spec: string): AbilityDefinition[] => {
    const abilities = classData.specAbilities ?? classData.abilities ?? [];
    return abilities
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
        return matchesSearch(searchQuery, a.name, a.description, a.damageType || '', a.attackType || '');
      })
      .sort((a, b) => a.tier - b.tier || a.levelRequired - b.levelRequired);
  };

  // ---- Filter tier 0 groups by search ----
  const getFilteredTier0 = (classData: ClassData): Tier0Group[] => {
    const tier0 = classData.tier0Abilities ?? [];
    if (!searchQuery.trim()) return tier0;

    const cls = classData.name;
    const classInfo = CLASS_INFO[cls];
    // If class name/description matches, show all tier 0
    if (matchesSearch(searchQuery, cls, classInfo?.description || '', classInfo?.role || '')) {
      return tier0;
    }
    // Otherwise filter by individual ability match
    return tier0
      .map(g => ({
        ...g,
        abilities: g.abilities.filter(a => matchesSearch(searchQuery, a.name, a.description, a.damageType || '', a.attackType || '')),
      }))
      .filter(g => g.abilities.length > 0);
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
          const totalAbilities = getTotalAbilityCount(classData);
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
                  <span className="text-realm-text-secondary">{totalAbilities}</span> abilities
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

        const filteredTier0 = getFilteredTier0(classData);
        const hasTier0 = filteredTier0.some(g => g.abilities.length > 0);

        return (
          <div className="bg-realm-bg-800 border border-realm-border rounded-md p-6 space-y-6">
            {/* Tier 0 — Early Abilities */}
            {hasTier0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="font-display text-2xl text-realm-teal-300">
                    Early Abilities
                  </h2>
                  <p className="text-sm font-body text-realm-text-muted mt-1">
                    Choose one ability at each level. Your choice is permanent.
                  </p>
                </div>

                {filteredTier0.map((group) => (
                  <div key={group.choiceLevel} className="space-y-2">
                    <h3 className="font-display text-sm text-realm-text-secondary">
                      Level {group.choiceLevel} — Choose One:
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {group.abilities.map((ability) => (
                        <div
                          key={ability.id}
                          className="bg-realm-bg-700 border border-realm-teal-500/20 rounded-lg p-4 space-y-2"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <RealmBadge variant="default">T0</RealmBadge>
                            <span className="font-display text-sm text-realm-text-primary">
                              {ability.name}
                            </span>
                            <AttackTypeBadge attackType={ability.attackType} />
                            <DamageTypeBadge damageType={ability.damageType} />
                          </div>
                          <p className="text-xs font-body text-realm-text-secondary leading-relaxed">
                            {ability.description}
                            <SaveInfo attackType={ability.attackType} saveType={ability.saveType} />
                          </p>
                          <div className="text-xs font-body text-realm-text-muted">
                            {ability.cooldown === 0 ? 'No CD' : `${ability.cooldown} rounds`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Divider between tier 0 and spec */}
            {hasTier0 && (
              <div className="border-t border-realm-border" />
            )}

            {/* Specialization Abilities */}
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl text-realm-gold-400">
                  Specialization Abilities
                </h2>
                <p className="text-sm font-body text-realm-text-muted mt-1">
                  Unlock automatically as you level up after choosing your path at level 10.
                </p>
              </div>

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
                                <td className="py-2 pr-3">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-realm-text-primary font-medium">{ability.name}</span>
                                    <AttackTypeBadge attackType={ability.attackType} />
                                    <DamageTypeBadge damageType={ability.damageType} />
                                  </div>
                                </td>
                                <td className="py-2 pr-3 text-realm-text-secondary">
                                  {ability.description}
                                  <SaveInfo attackType={ability.attackType} saveType={ability.saveType} />
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
          </div>
        );
      })()}
    </div>
  );
}
