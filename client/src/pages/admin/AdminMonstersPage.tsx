import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Search, ChevronDown, ChevronRight, Skull, Shield, Swords, Heart, Coins, Star, MapPin, TreePine, Loader2 } from 'lucide-react';

// Types
interface MonsterStats {
  hp: number; ac: number; attack: number; damage: string;
  damageType: string; speed: number;
  str: number; dex: number; con: number;
  int: number; wis: number; cha: number;
}

interface LootEntry {
  dropChance: number; minQty: number; maxQty: number; gold: number;
}

interface Monster {
  id: string;
  name: string;
  level: number;
  biome: string;
  regionId: string | null;
  regionName: string | null;
  stats: MonsterStats;
  lootTable: LootEntry[];
  rewards: { xp: number; goldRange: { min: number; max: number } };
}

interface Summary {
  totalMonsters: number;
  levelRange: { min: number; max: number };
  biomes: string[];
  regions: string[];
  tierBreakdown: { low: number; mid: number; high: number };
}

type GroupMode = 'level' | 'biome' | 'region';

function getModifier(stat: number): string {
  const mod = Math.floor((stat - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function getLevelColor(level: number): string {
  if (level <= 5) return 'bg-emerald-900/60 text-emerald-300 border-emerald-700';
  if (level <= 10) return 'bg-yellow-900/60 text-yellow-300 border-yellow-700';
  return 'bg-red-900/60 text-red-300 border-red-700';
}

function getLevelTier(level: number): string {
  if (level <= 5) return 'Tier 1 (Levels 1-5)';
  if (level <= 10) return 'Tier 2 (Levels 6-10)';
  return 'Tier 3 (Levels 11+)';
}

// Stat block component
function StatBlock({ stats }: { stats: MonsterStats }) {
  const abilities = [
    { label: 'STR', value: stats.str },
    { label: 'DEX', value: stats.dex },
    { label: 'CON', value: stats.con },
    { label: 'INT', value: stats.int },
    { label: 'WIS', value: stats.wis },
    { label: 'CHA', value: stats.cha },
  ];

  return (
    <div className="grid grid-cols-6 gap-2 text-center">
      {abilities.map(a => (
        <div key={a.label} className="bg-realm-bg-900/80 rounded px-2 py-1.5 border border-realm-border/30">
          <div className="text-[10px] font-semibold text-realm-text-muted tracking-wider">{a.label}</div>
          <div className="text-sm font-bold text-realm-text-primary">{a.value}</div>
          <div className="text-xs text-realm-gold-400">{getModifier(a.value)}</div>
        </div>
      ))}
    </div>
  );
}

// Monster card component
function MonsterCard({ monster }: { monster: Monster }) {
  const [expanded, setExpanded] = useState(false);
  const s = monster.stats;

  return (
    <div className="border border-realm-border/40 rounded-lg bg-realm-bg-800/80 overflow-hidden">
      {/* Collapsed header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-realm-bg-700/40 transition-colors text-left"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-realm-gold-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
        )}

        <Skull className="w-5 h-5 text-realm-text-muted flex-shrink-0" />

        <span className="font-display text-realm-text-primary font-semibold flex-shrink-0">
          {monster.name}
        </span>

        <span className={`text-xs px-2 py-0.5 rounded border ${getLevelColor(monster.level)} flex-shrink-0`}>
          Lv {monster.level}
        </span>

        <div className="flex items-center gap-4 ml-auto text-sm text-realm-text-secondary flex-shrink-0">
          <span className="flex items-center gap-1" title="Hit Points">
            <Heart className="w-3.5 h-3.5 text-red-400" /> {s.hp}
          </span>
          <span className="flex items-center gap-1" title="Armor Class">
            <Shield className="w-3.5 h-3.5 text-blue-400" /> {s.ac}
          </span>
          <span className="flex items-center gap-1" title="Damage">
            <Swords className="w-3.5 h-3.5 text-orange-400" /> {s.damage}
          </span>
          <span className="hidden sm:flex items-center gap-1 text-xs text-realm-text-muted" title="Biome">
            <TreePine className="w-3.5 h-3.5" /> {monster.biome}
          </span>
          {monster.regionName && (
            <span className="hidden md:flex items-center gap-1 text-xs text-realm-text-muted" title="Region">
              <MapPin className="w-3.5 h-3.5" /> {monster.regionName}
            </span>
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-realm-border/20 space-y-4">
          {/* Ability Scores */}
          <div>
            <h4 className="text-xs font-semibold text-realm-text-muted uppercase tracking-wider mb-2">Ability Scores</h4>
            <StatBlock stats={s} />
          </div>

          {/* Combat Stats */}
          <div>
            <h4 className="text-xs font-semibold text-realm-text-muted uppercase tracking-wider mb-2">Combat</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-realm-bg-900/60 rounded px-3 py-2 border border-realm-border/20">
                <span className="text-realm-text-muted text-xs">Attack Bonus</span>
                <div className="text-realm-text-primary font-semibold">+{s.attack}</div>
              </div>
              <div className="bg-realm-bg-900/60 rounded px-3 py-2 border border-realm-border/20">
                <span className="text-realm-text-muted text-xs">Damage</span>
                <div className="text-realm-text-primary font-semibold">{s.damage}</div>
              </div>
              <div className="bg-realm-bg-900/60 rounded px-3 py-2 border border-realm-border/20">
                <span className="text-realm-text-muted text-xs">Damage Type</span>
                <div className="text-realm-text-primary font-semibold">{s.damageType}</div>
              </div>
              <div className="bg-realm-bg-900/60 rounded px-3 py-2 border border-realm-border/20">
                <span className="text-realm-text-muted text-xs">Speed</span>
                <div className="text-realm-text-primary font-semibold">{s.speed} ft</div>
              </div>
            </div>
          </div>

          {/* Rewards */}
          <div>
            <h4 className="text-xs font-semibold text-realm-text-muted uppercase tracking-wider mb-2">Rewards</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-realm-bg-900/60 rounded px-3 py-2 border border-realm-border/20 flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-400" />
                <div>
                  <span className="text-realm-text-muted text-xs">XP</span>
                  <div className="text-realm-text-primary font-semibold">{monster.rewards.xp}</div>
                </div>
              </div>
              <div className="bg-realm-bg-900/60 rounded px-3 py-2 border border-realm-border/20 flex items-center gap-2">
                <Coins className="w-4 h-4 text-realm-gold-400" />
                <div>
                  <span className="text-realm-text-muted text-xs">Gold</span>
                  <div className="text-realm-text-primary font-semibold">
                    {monster.rewards.goldRange.min === monster.rewards.goldRange.max
                      ? monster.rewards.goldRange.max
                      : `${monster.rewards.goldRange.min}-${monster.rewards.goldRange.max}`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loot Table */}
          {monster.lootTable.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-realm-text-muted uppercase tracking-wider mb-2">Loot Table</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-realm-text-muted text-xs border-b border-realm-border/20">
                    <th className="text-left py-1 pr-4">Drop %</th>
                    <th className="text-left py-1 pr-4">Gold</th>
                    <th className="text-left py-1">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {monster.lootTable.map((entry, i) => (
                    <tr key={i} className="border-b border-realm-border/10 text-realm-text-secondary">
                      <td className="py-1 pr-4">{Math.round(entry.dropChance * 100)}%</td>
                      <td className="py-1 pr-4">{entry.gold}g</td>
                      <td className="py-1">{entry.minQty === entry.maxQty ? entry.minQty : `${entry.minQty}-${entry.maxQty}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Location */}
          <div className="flex gap-4 text-sm text-realm-text-secondary">
            <span className="flex items-center gap-1">
              <TreePine className="w-4 h-4 text-green-400" /> {monster.biome}
            </span>
            {monster.regionName && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-realm-gold-400" /> {monster.regionName}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main page
export default function AdminMonstersPage() {
  const [search, setSearch] = useState('');
  const [levelMin, setLevelMin] = useState('');
  const [levelMax, setLevelMax] = useState('');
  const [biomeFilter, setBiomeFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [groupMode, setGroupMode] = useState<GroupMode>('level');
  const [expandAll, setExpandAll] = useState(false);

  const { data, isLoading, isError, error } = useQuery<{ monsters: Monster[]; summary: Summary }>({
    queryKey: ['admin', 'monsters'],
    queryFn: async () => (await api.get('/admin/monsters')).data,
  });

  // Filter monsters
  const filtered = useMemo(() => {
    if (!data?.monsters) return [];
    return data.monsters.filter(m => {
      if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (levelMin && m.level < parseInt(levelMin)) return false;
      if (levelMax && m.level > parseInt(levelMax)) return false;
      if (biomeFilter !== 'All' && m.biome !== biomeFilter) return false;
      if (regionFilter !== 'All' && m.regionName !== regionFilter) return false;
      return true;
    });
  }, [data?.monsters, search, levelMin, levelMax, biomeFilter, regionFilter]);

  // Group monsters
  const groups = useMemo(() => {
    const map = new Map<string, Monster[]>();
    for (const m of filtered) {
      let key: string;
      switch (groupMode) {
        case 'level': key = getLevelTier(m.level); break;
        case 'biome': key = m.biome; break;
        case 'region': key = m.regionName ?? 'No Region'; break;
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    // Sort groups
    const entries = [...map.entries()];
    if (groupMode === 'level') {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }
    return entries;
  }, [filtered, groupMode]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-realm-gold-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20 text-red-400">
        Failed to load monster data: {(error as Error).message}
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-display text-realm-gold-400">Monster Compendium</h1>
        <p className="text-realm-text-muted mt-1">
          All PvE enemies — {summary?.totalMonsters ?? 0} monsters, levels {summary?.levelRange.min}–{summary?.levelRange.max}
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-realm-bg-800 rounded-lg px-4 py-3 border border-realm-border/30">
            <div className="text-xs text-realm-text-muted">Total</div>
            <div className="text-xl font-bold text-realm-text-primary">{summary.totalMonsters}</div>
          </div>
          <div className="bg-realm-bg-800 rounded-lg px-4 py-3 border border-realm-border/30">
            <div className="text-xs text-realm-text-muted">Low (1-5)</div>
            <div className="text-xl font-bold text-emerald-400">{summary.tierBreakdown.low}</div>
          </div>
          <div className="bg-realm-bg-800 rounded-lg px-4 py-3 border border-realm-border/30">
            <div className="text-xs text-realm-text-muted">Mid (6-10)</div>
            <div className="text-xl font-bold text-yellow-400">{summary.tierBreakdown.mid}</div>
          </div>
          <div className="bg-realm-bg-800 rounded-lg px-4 py-3 border border-realm-border/30">
            <div className="text-xs text-realm-text-muted">High (11+)</div>
            <div className="text-xl font-bold text-red-400">{summary.tierBreakdown.high}</div>
          </div>
        </div>
      )}

      {/* Filters + View Toggle */}
      <div className="bg-realm-bg-800 rounded-lg p-4 border border-realm-border/30 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-realm-text-muted" />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-realm-bg-900 border border-realm-border/40 rounded text-sm text-realm-text-primary placeholder:text-realm-text-muted focus:outline-none focus:border-realm-gold-400/60"
            />
          </div>

          {/* Level Range */}
          <div className="flex items-center gap-1">
            <input
              type="number" min="1" max="20" placeholder="Min Lv"
              value={levelMin} onChange={e => setLevelMin(e.target.value)}
              className="w-20 px-2 py-2 bg-realm-bg-900 border border-realm-border/40 rounded text-sm text-realm-text-primary placeholder:text-realm-text-muted focus:outline-none focus:border-realm-gold-400/60"
            />
            <span className="text-realm-text-muted">–</span>
            <input
              type="number" min="1" max="20" placeholder="Max Lv"
              value={levelMax} onChange={e => setLevelMax(e.target.value)}
              className="w-20 px-2 py-2 bg-realm-bg-900 border border-realm-border/40 rounded text-sm text-realm-text-primary placeholder:text-realm-text-muted focus:outline-none focus:border-realm-gold-400/60"
            />
          </div>

          {/* Biome Filter */}
          <select
            value={biomeFilter} onChange={e => setBiomeFilter(e.target.value)}
            className="px-3 py-2 bg-realm-bg-900 border border-realm-border/40 rounded text-sm text-realm-text-primary focus:outline-none focus:border-realm-gold-400/60"
          >
            <option value="All">All Biomes</option>
            {summary?.biomes.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          {/* Region Filter */}
          <select
            value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
            className="px-3 py-2 bg-realm-bg-900 border border-realm-border/40 rounded text-sm text-realm-text-primary focus:outline-none focus:border-realm-gold-400/60"
          >
            <option value="All">All Regions</option>
            {summary?.regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* View Toggle + Expand All */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(['level', 'biome', 'region'] as GroupMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setGroupMode(mode)}
                className={`px-3 py-1.5 text-xs rounded transition-colors ${
                  groupMode === mode
                    ? 'bg-realm-gold-400/20 text-realm-gold-400 border border-realm-gold-400/40'
                    : 'text-realm-text-muted hover:text-realm-text-secondary border border-transparent'
                }`}
              >
                By {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <span className="text-xs text-realm-text-muted">
            {filtered.length} monster{filtered.length !== 1 ? 's' : ''} shown
          </span>
        </div>
      </div>

      {/* Monster Groups */}
      {groups.length === 0 ? (
        <div className="text-center py-12 text-realm-text-muted">
          No monsters match the current filters.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([groupName, monsters]) => (
            <div key={groupName}>
              <h3 className="text-sm font-semibold text-realm-gold-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Skull className="w-4 h-4" />
                {groupName}
                <span className="text-realm-text-muted font-normal">({monsters.length})</span>
              </h3>
              <div className="space-y-2">
                {monsters.map(m => <MonsterCard key={m.id} monster={m} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
