import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RealmCard } from '../ui/RealmCard';
import { RealmBadge } from '../ui/RealmBadge';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types (match API response shape)
// ---------------------------------------------------------------------------

interface MonsterData {
  name: string;
  level: number;
  biome: string;
  regionName: string | null;
  category: string;
  size: string;
  difficulty: string;
  stats: {
    hp: number;
    ac: number;
    attack: number;
    damage: string;
  };
  resistances: string[];
  goldRange: string;
  damageType: string;
  immunities: string[];
  vulnerabilities: string[];
  abilities: { name: string; description: string }[];
  isLegendary: boolean;
  itemDrops: string[];
}

interface CodexMonstersProps {
  searchQuery: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BIOME_COLORS: Record<string, string> = {
  FOREST: 'bg-realm-success/10 border-realm-success/30 text-realm-success',
  PLAINS: 'bg-realm-gold-400/10 border-realm-gold-400/30 text-realm-gold-400',
  MOUNTAINS: 'bg-realm-text-muted/10 border-realm-text-muted/30 text-realm-text-secondary',
  SWAMP: 'bg-realm-purple-300/10 border-realm-purple-300/30 text-realm-purple-300',
  UNDERGROUND: 'bg-realm-bronze-400/10 border-realm-bronze-400/30 text-realm-bronze-400',
  TUNDRA: 'bg-realm-teal-300/10 border-realm-teal-300/30 text-realm-teal-300',
  DESERT: 'bg-realm-gold-400/10 border-realm-gold-400/30 text-realm-gold-400',
  COASTAL: 'bg-realm-teal-300/10 border-realm-teal-300/30 text-realm-teal-300',
  VOLCANIC: 'bg-realm-danger/10 border-realm-danger/30 text-realm-danger',
};

const CATEGORY_COLORS: Record<string, string> = {
  beast: 'bg-realm-heal/20 text-realm-heal-light',
  undead: 'bg-realm-magic/20 text-realm-magic-light',
  fiend: 'bg-realm-damage/20 text-realm-damage-muted',
  dragon: 'bg-amber-500/20 text-amber-300',
  construct: 'bg-realm-neutral/20 text-realm-neutral-light',
  elemental: 'bg-cyan-500/20 text-cyan-300',
  humanoid: 'bg-realm-info/20 text-realm-info-light',
  aberration: 'bg-pink-500/20 text-pink-300',
  fey: 'bg-emerald-500/20 text-emerald-300',
  monstrosity: 'bg-orange-500/20 text-orange-300',
  plant: 'bg-lime-500/20 text-lime-300',
  ooze: 'bg-realm-caution/20 text-realm-caution-light',
};

const DAMAGE_TYPE_COLORS: Record<string, string> = {
  FIRE: 'bg-orange-500/20 text-orange-300',
  COLD: 'bg-realm-info/20 text-realm-info-light',
  LIGHTNING: 'bg-realm-caution/20 text-realm-caution-light',
  NECROTIC: 'bg-realm-magic/20 text-realm-magic-light',
  PSYCHIC: 'bg-pink-500/20 text-pink-300',
  FORCE: 'bg-indigo-500/20 text-indigo-300',
  ACID: 'bg-realm-heal/20 text-realm-heal-light',
  RADIANT: 'bg-amber-500/20 text-amber-300',
  POISON: 'bg-emerald-500/20 text-emerald-300',
  THUNDER: 'bg-sky-500/20 text-sky-300',
  SLASHING: 'bg-realm-neutral/20 text-realm-neutral-light',
  PIERCING: 'bg-realm-neutral/20 text-realm-neutral-light',
  BLUDGEONING: 'bg-realm-neutral/20 text-realm-neutral-light',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Common: 'bg-realm-neutral/20 text-realm-neutral-light',
  Dangerous: 'bg-realm-info/20 text-realm-info-light',
  Deadly: 'bg-amber-500/20 text-amber-300',
  Legendary: 'bg-realm-damage/20 text-realm-damage-muted',
};

function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function formatSize(size: string): string {
  return size.charAt(0).toUpperCase() + size.slice(1);
}

function formatBiome(biome: string): string {
  return biome.charAt(0) + biome.slice(1).toLowerCase().replace(/_/g, ' ');
}

function getLevelColor(level: number): string {
  if (level <= 3) return 'text-realm-success';
  if (level <= 6) return 'text-realm-gold-400';
  if (level <= 10) return 'text-realm-bronze-400';
  return 'text-realm-danger';
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CodexMonsters({ searchQuery }: CodexMonstersProps) {
  const [expandedMonster, setExpandedMonster] = useState<string | null>(null);
  const [biomeFilter, setBiomeFilter] = useState<string>('ALL');

  const { data, isLoading } = useQuery<{ monsters: MonsterData[]; total: number }>({
    queryKey: ['codex', 'monsters'],
    queryFn: async () => (await api.get('/codex/monsters')).data,
    staleTime: 5 * 60 * 1000,
  });

  const monsters = data?.monsters ?? [];

  // Get unique biomes for filter
  const biomes = useMemo(() => {
    const set = new Set(monsters.map(m => m.biome));
    return [...set].sort();
  }, [monsters]);

  // Filter by search query and biome
  const filteredMonsters = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase();

    return monsters.filter(m => {
      // Biome filter
      if (biomeFilter !== 'ALL' && m.biome !== biomeFilter) return false;

      // Search filter
      if (query) {
        if (m.name.toLowerCase().includes(query)) return true;
        if ((m.regionName || '').toLowerCase().includes(query)) return true;
        if (m.biome.toLowerCase().includes(query)) return true;
        if (m.category.toLowerCase().includes(query)) return true;
        return false;
      }
      return true;
    });
  }, [monsters, searchQuery, biomeFilter]);

  const handleMonsterClick = (name: string) => {
    setExpandedMonster(prev => (prev === name ? null : name));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-realm-text-muted">
          <div className="w-5 h-5 border-2 border-realm-gold-400/50 border-t-realm-gold-400 rounded-full animate-spin" />
          <span className="font-body text-sm">Loading monsters...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-realm-text-primary">
          Bestiary
        </h2>
        <span className="text-sm text-realm-text-muted">
          {filteredMonsters.length === monsters.length
            ? `${monsters.length} creatures`
            : `${filteredMonsters.length} of ${monsters.length} creatures`}
        </span>
      </div>

      {/* Biome filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setBiomeFilter('ALL')}
          className={`px-3 py-1.5 rounded-sm text-sm font-body transition-colors ${
            biomeFilter === 'ALL'
              ? 'bg-realm-gold-400/20 text-realm-gold-400 border border-realm-gold-400/40'
              : 'bg-realm-bg-700 text-realm-text-secondary border border-realm-border hover:text-realm-text-primary'
          }`}
        >
          All ({monsters.length})
        </button>
        {biomes.map(biome => {
          const count = monsters.filter(m => m.biome === biome).length;
          return (
            <button
              key={biome}
              onClick={() => setBiomeFilter(biome)}
              className={`px-3 py-1.5 rounded-sm text-sm font-body transition-colors ${
                biomeFilter === biome
                  ? 'bg-realm-gold-400/20 text-realm-gold-400 border border-realm-gold-400/40'
                  : 'bg-realm-bg-700 text-realm-text-secondary border border-realm-border hover:text-realm-text-primary'
              }`}
            >
              {formatBiome(biome)} ({count})
            </button>
          );
        })}
      </div>

      {/* Monster grid */}
      {filteredMonsters.length === 0 ? (
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-12 text-center">
          <p className="text-realm-text-muted font-display text-sm">No creatures found</p>
          {searchQuery && (
            <p className="text-realm-text-muted text-xs mt-1">
              Try adjusting your search query.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMonsters.map((monster) => {
            const isExpanded = expandedMonster === monster.name;

            return (
              <RealmCard
                key={monster.name}
                onClick={() => handleMonsterClick(monster.name)}
                selected={isExpanded}
                className={`flex flex-col min-h-[140px] ${isExpanded ? 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4' : ''}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base text-realm-text-primary">
                      {monster.name}
                    </h3>
                    {monster.isLegendary && (
                      <span className="text-[10px] font-display uppercase tracking-wider px-2 py-0.5 rounded-xs bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Legendary
                      </span>
                    )}
                  </div>
                  <span className={`font-display text-sm ${getLevelColor(monster.level)}`}>
                    Lv.{monster.level}
                  </span>
                </div>

                {/* Classification badges */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <span className={`text-[10px] font-display uppercase tracking-wider px-2 py-0.5 rounded-xs ${CATEGORY_COLORS[monster.category] || 'bg-realm-bg-700 text-realm-text-muted'}`}>
                    {formatCategory(monster.category)}
                  </span>
                  <span className={`text-[10px] font-display uppercase tracking-wider px-2 py-0.5 rounded-xs ${DIFFICULTY_COLORS[monster.difficulty] || 'bg-realm-neutral/20 text-realm-neutral-light'}`}>
                    {monster.difficulty}
                  </span>
                  <span className="text-[10px] font-display uppercase tracking-wider px-2 py-0.5 rounded-xs bg-realm-bg-600/50 text-realm-text-muted">
                    {formatSize(monster.size)}
                  </span>
                </div>

                {/* Biome badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-display uppercase tracking-wider px-2 py-0.5 rounded-xs border ${BIOME_COLORS[monster.biome] || 'bg-realm-bg-700 border-realm-border text-realm-text-muted'}`}>
                    {formatBiome(monster.biome)}
                  </span>
                  {monster.regionName && (
                    <span className="text-[10px] text-realm-text-muted">
                      {monster.regionName}
                    </span>
                  )}
                </div>

                {/* Quick stats (collapsed) */}
                {!isExpanded && (
                  <div className="mt-auto flex items-center gap-4 text-xs text-realm-text-muted">
                    <span>HP {monster.stats.hp}</span>
                    <span>AC {monster.stats.ac}</span>
                    <span>{monster.stats.damage}</span>
                  </div>
                )}

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-realm-border/50 space-y-4">
                    {/* Combat stats */}
                    <div>
                      <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
                        Combat Stats
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-realm-bg-800 border border-realm-border/50 rounded-sm p-2 text-center">
                          <div className="text-lg font-display text-realm-danger">{monster.stats.hp}</div>
                          <div className="text-[10px] text-realm-text-muted uppercase">HP</div>
                        </div>
                        <div className="bg-realm-bg-800 border border-realm-border/50 rounded-sm p-2 text-center">
                          <div className="text-lg font-display text-realm-teal-300">{monster.stats.ac}</div>
                          <div className="text-[10px] text-realm-text-muted uppercase">AC</div>
                        </div>
                        <div className="bg-realm-bg-800 border border-realm-border/50 rounded-sm p-2 text-center">
                          <div className="text-lg font-display text-realm-gold-400">+{monster.stats.attack}</div>
                          <div className="text-[10px] text-realm-text-muted uppercase">Attack</div>
                        </div>
                        <div className="bg-realm-bg-800 border border-realm-border/50 rounded-sm p-2 text-center">
                          <div className="text-lg font-display text-realm-text-primary">{monster.stats.damage}</div>
                          <div className="text-[10px] text-realm-text-muted uppercase">Damage</div>
                          {monster.damageType && (
                            <span className={`inline-block mt-1 text-[10px] font-display uppercase tracking-wider px-2 py-0.5 rounded-xs ${DAMAGE_TYPE_COLORS[monster.damageType] || 'bg-realm-neutral/20 text-realm-neutral-light'}`}>
                              {monster.damageType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Resistances */}
                    {monster.resistances.length > 0 && (
                      <div>
                        <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
                          Resistances
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {monster.resistances.map(r => (
                            <RealmBadge key={r} variant="uncommon">{r}</RealmBadge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Immunities */}
                    {monster.immunities && monster.immunities.length > 0 && (
                      <div>
                        <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
                          Immunities
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {monster.immunities.map(i => (
                            <RealmBadge key={i} variant="rare">{i}</RealmBadge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vulnerabilities */}
                    {monster.vulnerabilities && monster.vulnerabilities.length > 0 && (
                      <div>
                        <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
                          Vulnerabilities
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {monster.vulnerabilities.map(v => (
                            <span key={v} className="text-[10px] font-display uppercase tracking-wider px-2 py-0.5 rounded-xs bg-realm-damage/20 text-realm-damage-muted">
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Abilities */}
                    {monster.abilities && monster.abilities.length > 0 && (
                      <div>
                        <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
                          Abilities
                        </h4>
                        <div className="space-y-2">
                          {monster.abilities.map(a => (
                            <div key={a.name} className="bg-realm-bg-800 border border-realm-border/50 rounded-sm p-2">
                              <div className="font-display text-realm-text-primary text-sm">{a.name}</div>
                              <div className="text-realm-text-secondary text-xs mt-0.5">{a.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Loot */}
                    <div>
                      <h4 className="font-display text-realm-gold-400 text-xs uppercase tracking-wider mb-2">
                        Loot
                      </h4>
                      <p className="text-sm text-realm-text-secondary font-body">
                        Gold: {monster.goldRange}
                      </p>
                      {/* Item Drops */}
                      {monster.itemDrops && monster.itemDrops.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {monster.itemDrops.map(item => (
                            <RealmBadge key={item} variant="uncommon">{item}</RealmBadge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </RealmCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
