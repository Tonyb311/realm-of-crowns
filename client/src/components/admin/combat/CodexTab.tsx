import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Users,
  Swords,
  Package,
  Skull,
  Zap,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import api from '../../../services/api';
import StatBlock from './StatBlock';
import AbilityCard from './AbilityCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RaceAbility {
  name: string;
  description: string;
  tier?: number;
  levelRequired?: number;
  cooldown?: number;
  effects?: Record<string, unknown>;
}

interface RaceEntry {
  id: string;
  name: string;
  tier: string;
  lore: string;
  trait: string;
  statModifiers: Record<string, number>;
  abilities: RaceAbility[];
  professionBonuses: Record<string, unknown>[];
  gatheringBonuses: unknown[];
  subRaces: unknown[];
  homelandRegion: string;
  startingTowns: string[];
  exclusiveZone: unknown | null;
}

interface ClassAbility {
  id: string;
  name: string;
  description: string;
  class: string;
  specialization: string;
  tier: number;
  effects: Record<string, unknown>;
  cooldown: number;
  levelRequired: number;
  prerequisiteAbilityId: string | null;
}

interface ClassEntry {
  name: string;
  specializations: string[];
  abilities: ClassAbility[];
}

interface RecipeEntry {
  id?: string;
  name: string;
  profession?: string;
  professionType?: string;
  levelRequired?: number;
  tier?: number;
  ingredients?: Record<string, number> | { name: string; quantity: number }[];
  result?: unknown;
  craftTime?: number;
}

interface MonsterEntry {
  id: string;
  name: string;
  level: number;
  biome: string;
  regionName: string | null;
  stats: {
    hp: number;
    ac: number;
    attack: number;
    damage: string;
    damageType: string;
    speed: number;
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  rewards: {
    xp: number;
    goldRange: { min: number; max: number };
    itemDrops: { name: string; dropChance: number; minQty: number; maxQty: number }[];
  };
}

interface StatusEffectEntry {
  name: string;
  preventsAction: boolean;
  hasDot: boolean;
  dotDamageBase: number;
  hasHot: boolean;
  hotHealingBase: number;
  attackModifier: number;
  acModifier: number;
  saveModifier: number;
}

// ---------------------------------------------------------------------------
// Sub-tab definition
// ---------------------------------------------------------------------------

type CodexSubTab = 'races' | 'classes' | 'items' | 'monsters' | 'status-effects';

const SUB_TABS: { key: CodexSubTab; label: string; icon: typeof Users }[] = [
  { key: 'races', label: 'Races', icon: Users },
  { key: 'classes', label: 'Classes', icon: Swords },
  { key: 'items', label: 'Items', icon: Package },
  { key: 'monsters', label: 'Monsters', icon: Skull },
  { key: 'status-effects', label: 'Status Effects', icon: Zap },
];

// ---------------------------------------------------------------------------
// Tier badge helpers
// ---------------------------------------------------------------------------

const RACE_TIER_COLORS: Record<string, string> = {
  core: 'bg-green-500/20 text-green-400',
  common: 'bg-blue-500/20 text-blue-400',
  exotic: 'bg-purple-500/20 text-purple-400',
};

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <span className="font-display text-sm text-realm-text-primary">{title}</span>
        <div className="flex items-center gap-2">
          <span className="bg-realm-gold-500/20 text-realm-gold-400 px-2 py-0.5 rounded text-xs font-display">
            {count}
          </span>
          {open ? (
            <ChevronDown className="w-4 h-4 text-realm-text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-realm-text-muted" />
          )}
        </div>
      </button>
      {open && <div className="px-5 pb-4 space-y-2">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function CodexSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 h-24 animate-pulse" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error panel
// ---------------------------------------------------------------------------

function CodexError({ message }: { message: string }) {
  return (
    <div className="bg-realm-bg-700 border border-realm-danger/30 rounded-lg p-6 text-realm-danger">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-tab: Races
// ---------------------------------------------------------------------------

function RacesSubTab({ search }: { search: string }) {
  const { data, isLoading, error } = useQuery<{ races: RaceEntry[]; total: number }>({
    queryKey: ['admin', 'combat', 'codex', 'races'],
    queryFn: async () => (await api.get('/admin/combat/codex/races')).data,
    staleTime: Infinity,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data?.races) return [];
    if (!search) return data.races;
    const q = search.toLowerCase();
    return data.races.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.tier.toLowerCase().includes(q) ||
        r.homelandRegion?.toLowerCase().includes(q),
    );
  }, [data, search]);

  if (isLoading) return <CodexSkeleton />;
  if (error || !data) return <CodexError message="Failed to load races." />;

  return (
    <div className="space-y-3">
      <div className="text-xs text-realm-text-muted">{filtered.length} races</div>
      {filtered.map((race) => {
        const isExpanded = expandedId === race.id;
        return (
          <div key={race.id} className="bg-realm-bg-700 border border-realm-border rounded-lg">
            {/* Header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : race.id)}
              className="w-full flex items-center gap-3 px-5 py-3 text-left"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
              )}
              <span className="font-display text-sm text-realm-text-primary">{race.name}</span>
              <span
                className={`${RACE_TIER_COLORS[race.tier] ?? 'bg-realm-bg-600 text-realm-text-muted'} px-2 py-0.5 rounded text-xs font-display`}
              >
                {race.tier}
              </span>
              <span className="bg-realm-bg-600 text-realm-text-secondary px-2 py-0.5 rounded text-xs font-display ml-auto">
                {race.abilities.length} abilities
              </span>
            </button>

            {/* Collapsed inline: stat modifiers */}
            {!isExpanded && (
              <div className="px-5 pb-3">
                <StatBlock stats={race.statModifiers} />
              </div>
            )}

            {/* Expanded detail */}
            {isExpanded && (
              <div className="px-5 pb-5 space-y-4">
                <p className="text-xs text-realm-text-secondary leading-relaxed italic">{race.lore}</p>
                <div className="text-xs text-realm-text-muted">
                  Trait: <span className="text-realm-text-secondary">{race.trait}</span>
                </div>

                {/* Stat modifiers */}
                <div>
                  <h4 className="text-xs text-realm-text-muted mb-1 font-display uppercase tracking-wider">
                    Stat Modifiers
                  </h4>
                  <StatBlock stats={race.statModifiers} />
                </div>

                {/* Starting towns */}
                {race.startingTowns.length > 0 && (
                  <div>
                    <h4 className="text-xs text-realm-text-muted mb-1 font-display uppercase tracking-wider">
                      Starting Towns
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {race.startingTowns.map((town) => (
                        <span
                          key={town}
                          className="bg-realm-bg-600 text-realm-text-secondary px-2 py-0.5 rounded text-xs"
                        >
                          {town}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profession bonuses */}
                {race.professionBonuses.length > 0 && (
                  <div>
                    <h4 className="text-xs text-realm-text-muted mb-1 font-display uppercase tracking-wider">
                      Profession Bonuses ({race.professionBonuses.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {race.professionBonuses.map((bonus, i) => {
                        const b = bonus as Record<string, unknown>;
                        return (
                          <div key={i} className="text-xs text-realm-text-secondary bg-realm-bg-800/50 rounded px-2 py-1">
                            <span className="text-realm-gold-400">{String(b.profession ?? b.type ?? '--')}</span>
                            {b.bonus != null && <span className="ml-1">+{String(b.bonus)}</span>}
                            {b.description != null && <span className="text-realm-text-muted ml-1">({String(b.description)})</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Abilities */}
                <div>
                  <h4 className="text-xs text-realm-text-muted mb-2 font-display uppercase tracking-wider">
                    Abilities ({race.abilities.length})
                  </h4>
                  <div className="space-y-1.5">
                    {race.abilities.map((ability, i) => (
                      <AbilityCard
                        key={i}
                        name={ability.name}
                        description={ability.description}
                        tier={ability.tier}
                        levelRequired={ability.levelRequired}
                        cooldown={ability.cooldown}
                        effects={ability.effects}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-tab: Classes
// ---------------------------------------------------------------------------

function ClassesSubTab({ search }: { search: string }) {
  const { data, isLoading, error } = useQuery<{
    classes: ClassEntry[];
    totalClasses: number;
    totalAbilities: number;
  }>({
    queryKey: ['admin', 'combat', 'codex', 'classes'],
    queryFn: async () => (await api.get('/admin/combat/codex/classes')).data,
    staleTime: Infinity,
  });

  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data?.classes) return [];
    if (!search) return data.classes;
    const q = search.toLowerCase();
    return data.classes
      .map((cls) => {
        const nameMatch = cls.name.toLowerCase().includes(q);
        const matchedAbilities = cls.abilities.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            a.specialization.toLowerCase().includes(q),
        );
        if (nameMatch) return cls;
        if (matchedAbilities.length > 0) return { ...cls, abilities: matchedAbilities };
        return null;
      })
      .filter(Boolean) as ClassEntry[];
  }, [data, search]);

  if (isLoading) return <CodexSkeleton />;
  if (error || !data) return <CodexError message="Failed to load classes." />;

  return (
    <div className="space-y-3">
      <div className="text-xs text-realm-text-muted">
        {data.totalClasses} classes, {data.totalAbilities} total abilities
      </div>
      {filtered.map((cls) => {
        const isExpanded = expandedClass === cls.name;
        // Group abilities by specialization
        const specGroups = new Map<string, ClassAbility[]>();
        for (const a of cls.abilities) {
          const key = a.specialization || 'General';
          const list = specGroups.get(key) ?? [];
          list.push(a);
          specGroups.set(key, list);
        }

        return (
          <div key={cls.name} className="bg-realm-bg-700 border border-realm-border rounded-lg">
            <button
              onClick={() => setExpandedClass(isExpanded ? null : cls.name)}
              className="w-full flex items-center gap-3 px-5 py-3 text-left"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
              )}
              <span className="font-display text-sm text-realm-text-primary capitalize">{cls.name}</span>
              <span className="bg-realm-bg-600 text-realm-text-secondary px-2 py-0.5 rounded text-xs font-display">
                {cls.specializations.length} specs
              </span>
              <span className="bg-realm-gold-500/20 text-realm-gold-400 px-2 py-0.5 rounded text-xs font-display ml-auto">
                {cls.abilities.length} abilities
              </span>
            </button>

            {isExpanded && (
              <div className="px-5 pb-5 space-y-4">
                {/* Specializations list */}
                <div className="flex flex-wrap gap-1.5">
                  {cls.specializations.map((spec) => (
                    <span
                      key={spec}
                      className="bg-realm-purple/20 text-realm-purple px-2 py-0.5 rounded text-xs font-display"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                {/* Abilities grouped by specialization */}
                {[...specGroups.entries()].map(([specName, abilities]) => (
                  <div key={specName}>
                    <h4 className="text-xs text-realm-text-muted mb-2 font-display uppercase tracking-wider">
                      {specName} ({abilities.length})
                    </h4>
                    <div className="space-y-1.5">
                      {abilities.map((ability) => (
                        <AbilityCard
                          key={ability.id}
                          name={ability.name}
                          description={ability.description}
                          tier={ability.tier}
                          levelRequired={ability.levelRequired}
                          cooldown={ability.cooldown}
                          effects={ability.effects}
                          specialization={ability.specialization}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-tab: Items
// ---------------------------------------------------------------------------

interface ItemsResponse {
  weapons: RecipeEntry[];
  armor: RecipeEntry[];
  consumables: RecipeEntry[];
  accessories: RecipeEntry[];
  processing: RecipeEntry[];
  finishedGoods?: RecipeEntry[];
  totals: Record<string, number>;
}

function ItemsSubTab({ search }: { search: string }) {
  const { data, isLoading, error } = useQuery<ItemsResponse>({
    queryKey: ['admin', 'combat', 'codex', 'items'],
    queryFn: async () => (await api.get('/admin/combat/codex/items')).data,
    staleTime: Infinity,
  });

  const categories = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase();
    const filterItems = (items: RecipeEntry[]) =>
      q
        ? items.filter(
            (item) =>
              item.name.toLowerCase().includes(q) ||
              item.profession?.toLowerCase().includes(q) ||
              item.professionType?.toLowerCase().includes(q),
          )
        : items;

    return [
      { key: 'weapons', label: 'Weapons', items: filterItems(data.weapons ?? []) },
      { key: 'armor', label: 'Armor', items: filterItems(data.armor ?? []) },
      { key: 'consumables', label: 'Consumables', items: filterItems(data.consumables ?? []) },
      { key: 'accessories', label: 'Accessories', items: filterItems(data.accessories ?? []) },
      { key: 'processing', label: 'Processing', items: filterItems(data.processing ?? []) },
      ...(data.finishedGoods
        ? [{ key: 'finishedGoods', label: 'Finished Goods', items: filterItems(data.finishedGoods) }]
        : []),
    ].filter((cat) => cat.items.length > 0);
  }, [data, search]);

  if (isLoading) return <CodexSkeleton />;
  if (error || !data) return <CodexError message="Failed to load items." />;

  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);

  return (
    <div className="space-y-3">
      <div className="text-xs text-realm-text-muted">{totalItems} items across {categories.length} categories</div>
      {categories.map((cat, idx) => (
        <CollapsibleSection key={cat.key} title={cat.label} count={cat.items.length} defaultOpen={idx === 0}>
          <div className="space-y-1">
            {cat.items.map((item, i) => {
              const ingredients = formatIngredients(item.ingredients);
              return (
                <div
                  key={item.id ?? `${cat.key}-${i}`}
                  className="flex items-start justify-between gap-2 bg-realm-bg-800/50 rounded px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="text-sm text-realm-text-primary">{item.name}</span>
                    {ingredients && (
                      <div className="text-xs text-realm-text-muted mt-0.5">{ingredients}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {(item.profession || item.professionType) && (
                      <span className="bg-realm-bg-600 text-realm-text-secondary px-2 py-0.5 rounded text-xs font-display">
                        {item.profession ?? item.professionType}
                      </span>
                    )}
                    {item.levelRequired != null && (
                      <span className="bg-realm-bg-600 text-realm-text-muted px-2 py-0.5 rounded text-xs font-display">
                        Lv {item.levelRequired}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}

function formatIngredients(
  ingredients?: Record<string, number> | { name: string; quantity: number }[],
): string | null {
  if (!ingredients) return null;
  if (Array.isArray(ingredients)) {
    return ingredients.map((ing) => `${ing.name} x${ing.quantity}`).join(', ');
  }
  if (typeof ingredients === 'object') {
    return Object.entries(ingredients)
      .map(([name, qty]) => `${name} x${qty}`)
      .join(', ');
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sub-tab: Monsters
// ---------------------------------------------------------------------------

function MonstersSubTab({ search }: { search: string }) {
  const { data, isLoading, error } = useQuery<{ monsters: MonsterEntry[]; summary: unknown }>({
    queryKey: ['admin', 'monsters'],
    queryFn: async () => (await api.get('/admin/monsters')).data,
    staleTime: Infinity,
  });

  const filtered = useMemo(() => {
    if (!data?.monsters) return [];
    if (!search) return data.monsters;
    const q = search.toLowerCase();
    return data.monsters.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.biome.toLowerCase().includes(q) ||
        m.regionName?.toLowerCase().includes(q),
    );
  }, [data, search]);

  if (isLoading) return <CodexSkeleton />;
  if (error || !data) return <CodexError message="Failed to load monsters." />;

  return (
    <div className="space-y-3">
      <div className="text-xs text-realm-text-muted">{filtered.length} monsters</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((monster) => (
          <div key={monster.id} className="bg-realm-bg-700 border border-realm-border rounded-lg p-4 space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm text-realm-text-primary">{monster.name}</span>
                <span className="bg-realm-bg-600 text-realm-text-secondary px-2 py-0.5 rounded text-xs font-display">
                  Lv {monster.level}
                </span>
              </div>
              <span className="bg-realm-gold-500/20 text-realm-gold-400 px-2 py-0.5 rounded text-xs font-display">
                {monster.rewards.xp} XP
              </span>
            </div>

            {/* Biome badge */}
            <div className="flex items-center gap-1.5">
              <span className="bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded text-xs font-display">
                {monster.biome}
              </span>
              {monster.regionName && (
                <span className="text-xs text-realm-text-muted">{monster.regionName}</span>
              )}
            </div>

            {/* Stat block */}
            <StatBlock stats={monster.stats} showCombatStats />

            {/* Gold range */}
            {(monster.rewards.goldRange.min > 0 || monster.rewards.goldRange.max > 0) && (
              <div className="text-xs text-realm-text-muted">
                Gold:{' '}
                <span className="text-realm-gold-400">
                  {monster.rewards.goldRange.min}-{monster.rewards.goldRange.max}g
                </span>
              </div>
            )}

            {/* Loot drops */}
            {monster.rewards.itemDrops.length > 0 && (
              <div className="text-xs">
                <span className="text-realm-text-muted">Loot: </span>
                <span className="text-realm-text-secondary">
                  {monster.rewards.itemDrops.map((d) => d.name).join(', ')}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-tab: Status Effects
// ---------------------------------------------------------------------------

function StatusEffectsSubTab({ search }: { search: string }) {
  const { data, isLoading, error } = useQuery<{ effects: StatusEffectEntry[]; total: number }>({
    queryKey: ['admin', 'combat', 'codex', 'status-effects'],
    queryFn: async () => (await api.get('/admin/combat/codex/status-effects')).data,
    staleTime: Infinity,
  });

  const filtered = useMemo(() => {
    if (!data?.effects) return [];
    if (!search) return data.effects;
    const q = search.toLowerCase();
    return data.effects.filter((e) => e.name.toLowerCase().includes(q));
  }, [data, search]);

  if (isLoading) return <CodexSkeleton />;
  if (error || !data) return <CodexError message="Failed to load status effects." />;

  return (
    <div className="space-y-3">
      <div className="text-xs text-realm-text-muted">{filtered.length} status effects</div>
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-4 py-2 border-b border-realm-border bg-realm-bg-800/50 text-[10px] text-realm-text-muted uppercase tracking-wider font-display">
          <span>Name</span>
          <span className="text-center w-16">Prevents</span>
          <span className="text-center w-16">DoT/HoT</span>
          <span className="text-center w-14">ATK</span>
          <span className="text-center w-14">AC</span>
          <span className="text-center w-14">Save</span>
        </div>

        {/* Table rows */}
        {filtered.map((effect) => (
          <div
            key={effect.name}
            className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 px-4 py-2 border-b border-realm-border/30 last:border-0 items-center hover:bg-realm-bg-800/30 transition-colors"
          >
            <span className="text-sm text-realm-text-primary font-display">{formatEffectName(effect.name)}</span>

            <span className="text-center w-16">
              {effect.preventsAction ? (
                <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-display">Yes</span>
              ) : (
                <span className="text-realm-text-muted text-xs">--</span>
              )}
            </span>

            <span className="text-center w-16">
              {effect.hasDot ? (
                <span className="text-red-400 text-xs font-display">-{effect.dotDamageBase}</span>
              ) : effect.hasHot ? (
                <span className="text-green-400 text-xs font-display">+{effect.hotHealingBase}</span>
              ) : (
                <span className="text-realm-text-muted text-xs">--</span>
              )}
            </span>

            <ModifierCell value={effect.attackModifier} />
            <ModifierCell value={effect.acModifier} />
            <ModifierCell value={effect.saveModifier} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ModifierCell({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="text-center w-14 text-realm-text-muted text-xs">--</span>
    );
  }
  return (
    <span
      className={`text-center w-14 text-xs font-display ${value > 0 ? 'text-green-400' : 'text-red-400'}`}
    >
      {value > 0 ? `+${value}` : value}
    </span>
  );
}

function formatEffectName(name: string): string {
  // Convert SCREAMING_SNAKE or camelCase to Title Case
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Main CodexTab Component
// ---------------------------------------------------------------------------

export default function CodexTab() {
  const [activeSubTab, setActiveSubTab] = useState<CodexSubTab>('races');
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-realm-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search codex..."
          className="w-full bg-realm-bg-700 border border-realm-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-realm-text-primary placeholder-realm-text-muted focus:outline-none focus:border-realm-gold-500/50 transition-colors"
        />
      </div>

      {/* Sub-tab buttons */}
      <div className="border-b border-realm-border">
        <nav className="flex gap-1">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveSubTab(tab.key);
                  setSearch('');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 font-display text-xs border-b-2 transition-colors ${
                  isActive
                    ? 'border-realm-gold-500 text-realm-gold-400'
                    : 'border-transparent text-realm-text-muted hover:text-realm-text-secondary hover:border-realm-border/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active sub-tab content */}
      {activeSubTab === 'races' && <RacesSubTab search={search} />}
      {activeSubTab === 'classes' && <ClassesSubTab search={search} />}
      {activeSubTab === 'items' && <ItemsSubTab search={search} />}
      {activeSubTab === 'monsters' && <MonstersSubTab search={search} />}
      {activeSubTab === 'status-effects' && <StatusEffectsSubTab search={search} />}
    </div>
  );
}
