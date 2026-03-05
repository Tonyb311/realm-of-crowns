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
  type?: 'active' | 'passive';
  effectType?: string;
  effectValue?: any;
  targetType?: 'self' | 'party' | 'enemy' | 'aoe';
  cooldownSeconds?: number;
  duration?: number;
}

interface RaceEntry {
  id: string;
  name: string;
  tier: string;
  lore: string;
  trait: string | { name: string; description: string };
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
  requiresChoice?: boolean;
  choiceGroup?: string | null;
  attackType?: string | null;
  damageType?: string | null;
  grantsSetupTag?: string | null;
  requiresSetupTag?: string | null;
  consumesSetupTag?: boolean;
}

interface Tier0Group {
  choiceLevel: number;
  abilities: ClassAbility[];
}

interface ClassEntry {
  name: string;
  specializations: string[];
  tier0Abilities?: Tier0Group[];
  specAbilities?: ClassAbility[];
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
  outputStats?: Record<string, unknown>;
  outputItemType?: string;
  consumableStats?: Record<string, unknown>;
}

interface MonsterAbility {
  id: string;
  name: string;
  type: string;
  damage?: string;
  damageType?: string;
  saveType?: string;
  saveDC?: number;
  statusEffect?: string;
  statusDuration?: number;
  cooldown?: number;
  recharge?: number;
  usesPerCombat?: number;
  priority?: number;
  description?: string;
  isLegendaryAction?: boolean;
  legendaryCost?: number;
  attacks?: number;
}

interface PhaseTransition {
  hpThresholdPercent: number;
  name?: string;
  description?: string;
  effects: { type: string; statBoost?: unknown; aoeBurst?: unknown; ability?: unknown }[];
}

interface MonsterEntry {
  id: string;
  name: string;
  level: number;
  biome: string;
  category: string;
  encounterType: string;
  sentient: boolean;
  size: string;
  regionName: string | null;
  formulaCR: number | null;
  simCR: number | null;
  damageType: string;
  abilities: MonsterAbility[];
  resistances: string[];
  immunities: string[];
  vulnerabilities: string[];
  conditionImmunities: string[];
  critImmunity: boolean;
  critResistance: number;
  legendaryActions: number;
  legendaryResistances: number;
  phaseTransitions: PhaseTransition[];
  stats: {
    hp: number;
    ac: number;
    attack: number;
    damage: string;
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
                  Trait:{' '}
                  {typeof race.trait === 'object' && race.trait !== null ? (
                    <>
                      <span className="text-realm-text-secondary">{race.trait.name}</span>
                      {race.trait.description && (
                        <span className="text-realm-text-muted ml-1">({race.trait.description})</span>
                      )}
                    </>
                  ) : (
                    <span className="text-realm-text-secondary">{String(race.trait)}</span>
                  )}
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
                        type={ability.type}
                        effectType={ability.effectType}
                        effectValue={ability.effectValue}
                        targetType={ability.targetType}
                        cooldownSeconds={ability.cooldownSeconds}
                        duration={ability.duration}
                        abilitySource="race"
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
            a.specialization.toLowerCase().includes(q) ||
            (a.damageType ?? '').toLowerCase().includes(q) ||
            (a.attackType ?? '').toLowerCase().includes(q),
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
        // Spec abilities only (exclude tier 0)
        const specAbilities = cls.specAbilities ?? cls.abilities.filter(a => !a.requiresChoice);
        const tier0Groups = cls.tier0Abilities ?? [];
        const tier0Count = tier0Groups.reduce((sum, g) => sum + g.abilities.length, 0);
        const totalCount = specAbilities.length + tier0Count;

        // Group spec abilities by specialization
        const specGroups = new Map<string, ClassAbility[]>();
        for (const a of specAbilities) {
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
                {tier0Count > 0
                  ? `${tier0Count} tier 0 + ${specAbilities.length} spec = ${totalCount}`
                  : `${totalCount} abilities`}
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

                {/* Tier 0 — Early Abilities */}
                {tier0Groups.length > 0 && tier0Groups.some(g => g.abilities.length > 0) && (
                  <div className="space-y-3">
                    <h4 className="text-xs text-realm-text-muted font-display uppercase tracking-wider">
                      Tier 0 — Early Abilities (Choose 1 of 3)
                    </h4>
                    {tier0Groups.map((group) => (
                      group.abilities.length > 0 && (
                        <div key={group.choiceLevel} className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-realm-text-muted">
                            <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded font-display">
                              Level {group.choiceLevel}
                            </span>
                            <span>— Choose One</span>
                            {group.abilities[0]?.choiceGroup && (
                              <span className="text-realm-text-muted/60 font-mono text-[10px]">
                                [{group.abilities[0].choiceGroup}]
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            {group.abilities.map((ability) => (
                              <AbilityCard
                                key={ability.id}
                                name={ability.name}
                                description={ability.description}
                                tier={ability.tier}
                                levelRequired={ability.levelRequired}
                                cooldown={ability.cooldown}
                                effects={ability.effects}
                                specialization={ability.specialization || 'none'}
                                abilitySource="class"
                                attackType={ability.attackType}
                                damageType={ability.damageType}
                                grantsSetupTag={ability.grantsSetupTag}
                                requiresSetupTag={ability.requiresSetupTag}
                                characterClass={cls.name}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                )}

                {/* Spec Abilities grouped by specialization */}
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
                          abilitySource="class"
                          attackType={ability.attackType}
                          damageType={ability.damageType}
                          grantsSetupTag={ability.grantsSetupTag}
                          requiresSetupTag={ability.requiresSetupTag}
                          characterClass={cls.name}
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
              const statSummary = formatCompactStats(item);
              return (
                <div
                  key={item.id ?? `${cat.key}-${i}`}
                  className="flex items-start justify-between gap-2 bg-realm-bg-800/50 rounded px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="text-sm text-realm-text-primary">{item.name}</span>
                    {statSummary && (
                      <div className="text-xs text-realm-teal-300/80 mt-0.5">{statSummary}</div>
                    )}
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

/** Compact one-line stat summary for admin codex items */
function formatCompactStats(item: RecipeEntry): string | null {
  const stats = item.outputStats as Record<string, unknown> | undefined;
  const cStats = item.consumableStats as Record<string, unknown> | undefined;

  if (cStats && typeof cStats.effect === 'string') {
    const effect = cStats.effect as string;
    const mag = typeof cStats.magnitude === 'number' ? cStats.magnitude : 0;
    const dur = typeof cStats.duration === 'number' ? cStats.duration : 0;
    const EFFECT_SHORT: Record<string, string> = {
      heal_hp: `Heals ${mag} HP`, heal_mana: `Restores ${mag} Mana`,
      hp_regen: `+${mag} HP regen/${dur}m`, mana_regen: `+${mag} MP regen/${dur}m`,
      buff_strength: `+${mag} STR ${dur}m`, buff_dexterity: `+${mag} DEX ${dur}m`,
      buff_intelligence: `+${mag} INT ${dur}m`, buff_constitution: `+${mag} CON ${dur}m`,
      buff_wisdom: `+${mag} WIS ${dur}m`, buff_charisma: `+${mag} CHA ${dur}m`,
      buff_all_stats: `+${mag} All Stats ${dur}m`, buff_armor: `+${mag} AC ${dur}m`,
      cure_poison: 'Cures Poison', cure_disease: 'Cures Disease', cure_all: 'Cures All',
      poison_immunity: `Poison Immunity ${dur}m`, apply_poison: `Poison ${mag} dmg`,
      damage_fire: `${mag} Fire`, damage_ice: `${mag} Ice`, damage_lightning: `${mag} Lightning`,
      sustenance: `Food ${dur}m`, stun: `Stun ${dur}m`,
    };
    return EFFECT_SHORT[effect] ?? `${effect}: ${mag}`;
  }

  if (!stats) return null;

  const baseDmg = typeof stats.baseDamage === 'number' ? stats.baseDamage : null;
  const dmgType = typeof stats.damageType === 'string' ? stats.damageType : null;
  const armor = typeof stats.armor === 'number' ? stats.armor : null;
  const magicResist = typeof stats.magicResist === 'number' ? stats.magicResist : null;
  const speedB = typeof stats.speedBonus === 'number' ? stats.speedBonus : null;
  const yieldB = typeof stats.yieldBonus === 'number' ? stats.yieldBonus : null;
  const reqStr = typeof stats.requiredStr === 'number' ? stats.requiredStr : null;
  const reqDex = typeof stats.requiredDex === 'number' ? stats.requiredDex : null;

  // Weapons
  if (baseDmg != null) {
    const parts = [`${baseDmg} ${dmgType ?? 'dmg'}`];
    if (reqStr != null || reqDex != null) {
      parts.push(`STR ${reqStr ?? '-'}/DEX ${reqDex ?? '-'}`);
    }
    return parts.join(', ');
  }
  // Armor
  if (armor != null || magicResist != null) {
    const parts: string[] = [];
    if (armor != null) parts.push(`AC +${armor}`);
    if (magicResist != null) parts.push(`MR +${magicResist}`);
    return parts.join(', ');
  }
  // Tools
  if (speedB != null || yieldB != null) {
    const parts: string[] = [];
    if (speedB != null) parts.push(`+${Math.round(speedB * 100)}% speed`);
    if (yieldB != null) parts.push(`+${Math.round(yieldB * 100)}% yield`);
    return parts.join(', ');
  }

  return null;
}

// ---------------------------------------------------------------------------
// Sub-tab: Monsters
// ---------------------------------------------------------------------------

const MONSTER_CATEGORY_COLORS: Record<string, string> = {
  beast: 'bg-green-500/20 text-green-300',
  undead: 'bg-purple-500/20 text-purple-300',
  fiend: 'bg-red-500/20 text-red-300',
  dragon: 'bg-amber-500/20 text-amber-300',
  construct: 'bg-slate-500/20 text-slate-300',
  elemental: 'bg-cyan-500/20 text-cyan-300',
  humanoid: 'bg-blue-500/20 text-blue-300',
  aberration: 'bg-pink-500/20 text-pink-300',
  fey: 'bg-emerald-500/20 text-emerald-300',
  monstrosity: 'bg-orange-500/20 text-orange-300',
  plant: 'bg-lime-500/20 text-lime-300',
  ooze: 'bg-yellow-500/20 text-yellow-300',
};

const ENCOUNTER_TYPE_COLORS: Record<string, string> = {
  standard: 'bg-gray-500/20 text-gray-300',
  elite: 'bg-blue-500/20 text-blue-300',
  boss: 'bg-yellow-500/20 text-yellow-300',
  world_boss: 'bg-red-500/20 text-red-300',
};

const DAMAGE_TYPE_COLORS: Record<string, string> = {
  FIRE: 'bg-orange-500/20 text-orange-300',
  COLD: 'bg-blue-500/20 text-blue-300',
  LIGHTNING: 'bg-yellow-500/20 text-yellow-300',
  NECROTIC: 'bg-purple-500/20 text-purple-300',
  PSYCHIC: 'bg-pink-500/20 text-pink-300',
  FORCE: 'bg-indigo-500/20 text-indigo-300',
  ACID: 'bg-green-500/20 text-green-300',
  RADIANT: 'bg-amber-500/20 text-amber-300',
  POISON: 'bg-emerald-500/20 text-emerald-300',
  THUNDER: 'bg-sky-500/20 text-sky-300',
  SLASHING: 'bg-gray-500/20 text-gray-300',
  PIERCING: 'bg-gray-500/20 text-gray-300',
  BLUDGEONING: 'bg-gray-500/20 text-gray-300',
};

const ABILITY_TYPE_COLORS: Record<string, string> = {
  damage: 'bg-red-500/20 text-red-300',
  aoe: 'bg-orange-500/20 text-orange-300',
  status: 'bg-purple-500/20 text-purple-300',
  multiattack: 'bg-blue-500/20 text-blue-300',
  on_hit: 'bg-amber-500/20 text-amber-300',
  heal: 'bg-green-500/20 text-green-300',
  buff: 'bg-teal-500/20 text-teal-300',
  fear_aura: 'bg-violet-500/20 text-violet-300',
  damage_aura: 'bg-red-500/20 text-red-300',
  death_throes: 'bg-gray-500/20 text-gray-300',
  swallow: 'bg-pink-500/20 text-pink-300',
};

function MonstersSubTab({ search }: { search: string }) {
  const { data, isLoading, error } = useQuery<{ monsters: MonsterEntry[]; summary: unknown }>({
    queryKey: ['admin', 'monsters'],
    queryFn: async () => (await api.get('/admin/monsters')).data,
    staleTime: Infinity,
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data?.monsters) return [];
    if (!search) return data.monsters;
    const q = search.toLowerCase();
    return data.monsters.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.biome.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q) ||
        m.encounterType.toLowerCase().replace('_', ' ').includes(q) ||
        m.regionName?.toLowerCase().includes(q) ||
        m.damageType?.toLowerCase().includes(q) ||
        m.abilities?.some((a) => a.name.toLowerCase().includes(q)),
    );
  }, [data, search]);

  if (isLoading) return <CodexSkeleton />;
  if (error || !data) return <CodexError message="Failed to load monsters." />;

  return (
    <div className="space-y-3">
      <div className="text-xs text-realm-text-muted">{filtered.length} monsters</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((monster) => {
          const isExpanded = expandedId === monster.id;
          const resCount = monster.resistances?.length ?? 0;
          const immCount = monster.immunities?.length ?? 0;
          const vulnCount = monster.vulnerabilities?.length ?? 0;
          const defSummaryParts: string[] = [];
          if (resCount > 0) defSummaryParts.push(`${resCount} res`);
          if (immCount > 0) defSummaryParts.push(`${immCount} imm`);
          if (vulnCount > 0) defSummaryParts.push(`${vulnCount} vuln`);
          const defSummary = defSummaryParts.join(', ');

          return (
            <div
              key={monster.id}
              className={`bg-realm-bg-700 border border-realm-border rounded-lg ${isExpanded ? 'col-span-full' : ''}`}
            >
              {/* Collapsed header — always visible */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : monster.id)}
                className="w-full text-left px-4 py-3"
              >
                {/* Row 1: Name, level, CR, XP, chevron */}
                <div className="flex items-center gap-2 flex-wrap">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
                  )}
                  <span className="font-display text-sm text-realm-text-primary">{monster.name}</span>
                  <span className="bg-realm-bg-600 text-realm-text-secondary px-2 py-0.5 rounded text-xs font-display">
                    Lv {monster.level}
                  </span>
                  {monster.formulaCR != null && (
                    <span className="bg-realm-gold-500/20 text-realm-gold-400 px-2 py-0.5 rounded text-xs font-display">
                      CR {monster.formulaCR}
                    </span>
                  )}
                  <span className="bg-realm-gold-500/20 text-realm-gold-400 px-2 py-0.5 rounded text-xs font-display">
                    {monster.rewards.xp} XP
                  </span>

                  {/* Classification badges */}
                  <span className={`${MONSTER_CATEGORY_COLORS[monster.category] ?? 'bg-realm-bg-600 text-realm-text-muted'} px-2 py-0.5 rounded text-xs font-display`}>
                    {monster.category}
                  </span>
                  <span className={`${ENCOUNTER_TYPE_COLORS[monster.encounterType] ?? 'bg-gray-500/20 text-gray-300'} px-2 py-0.5 rounded text-xs font-display`}>
                    {monster.encounterType.replace('_', ' ')}
                  </span>
                  <span className="bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded text-xs font-display">
                    {monster.size}
                  </span>
                  {monster.sentient && (
                    <span className="bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded text-xs font-display">
                      Sentient
                    </span>
                  )}
                </div>

                {/* Row 2: Biome, region, inline stats, damage type, defense summary */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded text-xs font-display">
                    {monster.biome}
                  </span>
                  {monster.regionName && (
                    <span className="text-xs text-realm-text-muted">{monster.regionName}</span>
                  )}
                  <span className="text-xs text-realm-text-secondary ml-1">
                    HP {monster.stats.hp} | AC {monster.stats.ac} | ATK +{monster.stats.attack} | DMG {monster.stats.damage}
                  </span>
                  {monster.damageType && (
                    <span className={`${DAMAGE_TYPE_COLORS[monster.damageType] ?? 'bg-realm-bg-600 text-realm-text-muted'} px-2 py-0.5 rounded text-xs font-display`}>
                      {monster.damageType}
                    </span>
                  )}
                  {defSummary && (
                    <span className="text-xs text-realm-text-muted ml-auto">{defSummary}</span>
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-4 border-t border-realm-border/30">

                  {/* A. Core Stats */}
                  <div className="pt-3">
                    <h4 className="text-xs text-realm-text-muted mb-2 font-display uppercase tracking-wider">
                      Core Stats
                    </h4>
                    <StatBlock stats={monster.stats} showCombatStats />
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {monster.formulaCR != null && (
                        <span className="text-xs text-realm-text-secondary">
                          Formula CR: <span className="text-realm-gold-400 font-display">{monster.formulaCR}</span>
                        </span>
                      )}
                      {monster.simCR != null && (
                        <span className="text-xs text-realm-text-secondary">
                          Sim CR: <span className="text-realm-teal-300 font-display">{monster.simCR}</span>
                        </span>
                      )}
                      {monster.damageType && (
                        <span className={`${DAMAGE_TYPE_COLORS[monster.damageType] ?? 'bg-realm-bg-600 text-realm-text-muted'} px-2 py-0.5 rounded text-xs font-display`}>
                          {monster.damageType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* B. Defenses */}
                  {(resCount > 0 || immCount > 0 || vulnCount > 0 || (monster.conditionImmunities?.length ?? 0) > 0 || monster.critImmunity || (monster.critResistance ?? 0) > 0) && (
                    <div>
                      <h4 className="text-xs text-realm-text-muted mb-2 font-display uppercase tracking-wider">
                        Defenses
                      </h4>
                      <div className="space-y-2">
                        {resCount > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-realm-text-muted w-24 flex-shrink-0">Resistances</span>
                            {monster.resistances.map((r) => (
                              <span
                                key={r}
                                className={`${DAMAGE_TYPE_COLORS[r] ?? 'bg-realm-bg-600 text-realm-text-muted'} px-2 py-0.5 rounded text-xs font-display border border-current/20`}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                        {immCount > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-realm-text-muted w-24 flex-shrink-0">Immunities</span>
                            {monster.immunities.map((r) => (
                              <span
                                key={r}
                                className={`${DAMAGE_TYPE_COLORS[r] ?? 'bg-realm-bg-600 text-realm-text-muted'} px-2 py-0.5 rounded text-xs font-display font-bold`}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                        {vulnCount > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-realm-text-muted w-24 flex-shrink-0">Vulnerabilities</span>
                            {monster.vulnerabilities.map((r) => (
                              <span
                                key={r}
                                className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded text-xs font-display border border-red-500/30"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                        {(monster.conditionImmunities?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-realm-text-muted w-24 flex-shrink-0">Cond. Immune</span>
                            {monster.conditionImmunities.map((c) => (
                              <span
                                key={c}
                                className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-xs font-display"
                              >
                                {formatEffectName(c)}
                              </span>
                            ))}
                          </div>
                        )}
                        {(monster.critImmunity || (monster.critResistance ?? 0) > 0) && (
                          <div className="flex items-center gap-2">
                            {monster.critImmunity && (
                              <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded text-xs font-display">
                                Crit Immune
                              </span>
                            )}
                            {(monster.critResistance ?? 0) > 0 && (
                              <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-xs font-display">
                                Crit Resist: {monster.critResistance}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* C. Abilities */}
                  {(monster.abilities?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="text-xs text-realm-text-muted mb-2 font-display uppercase tracking-wider">
                        Abilities ({monster.abilities.length})
                      </h4>
                      <div className="space-y-2">
                        {monster.abilities.map((ability) => (
                          <div
                            key={ability.id}
                            className="bg-realm-bg-800/50 rounded px-3 py-2 space-y-1"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-realm-text-primary font-display">{ability.name}</span>
                              <span className={`${ABILITY_TYPE_COLORS[ability.type] ?? 'bg-realm-bg-600 text-realm-text-muted'} px-2 py-0.5 rounded text-xs font-display`}>
                                {ability.type.replace('_', ' ')}
                              </span>
                              {ability.damage && ability.damageType && (
                                <span className={`${DAMAGE_TYPE_COLORS[ability.damageType] ?? 'bg-realm-bg-600 text-realm-text-muted'} px-2 py-0.5 rounded text-xs font-display`}>
                                  {ability.damage} {ability.damageType}
                                </span>
                              )}
                              {ability.damage && !ability.damageType && (
                                <span className="bg-realm-bg-600 text-realm-text-secondary px-2 py-0.5 rounded text-xs font-display">
                                  {ability.damage}
                                </span>
                              )}
                              {ability.saveType && (
                                <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded text-xs font-display">
                                  DC {ability.saveDC ?? '?'} {ability.saveType}
                                </span>
                              )}
                              {ability.statusEffect && (
                                <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded text-xs font-display">
                                  {formatEffectName(ability.statusEffect)}
                                  {ability.statusDuration ? ` (${ability.statusDuration}t)` : ''}
                                </span>
                              )}
                              {ability.isLegendaryAction && (
                                <span className="bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded text-xs font-display">
                                  Legendary{ability.legendaryCost ? ` (${ability.legendaryCost})` : ''}
                                </span>
                              )}
                            </div>
                            {ability.description && (
                              <p className="text-xs text-realm-text-muted leading-relaxed">{ability.description}</p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                              {ability.cooldown != null && ability.cooldown > 0 && (
                                <span className="text-[10px] text-realm-text-muted">CD: {ability.cooldown}t</span>
                              )}
                              {ability.recharge != null && ability.recharge > 0 && (
                                <span className="text-[10px] text-realm-text-muted">Recharge: {ability.recharge}+</span>
                              )}
                              {ability.usesPerCombat != null && ability.usesPerCombat > 0 && (
                                <span className="text-[10px] text-realm-text-muted">Uses: {ability.usesPerCombat}/combat</span>
                              )}
                              {ability.attacks != null && ability.attacks > 1 && (
                                <span className="text-[10px] text-realm-text-muted">Attacks: {ability.attacks}x</span>
                              )}
                              {ability.priority != null && (
                                <span className="text-[10px] text-realm-text-muted">Priority: {ability.priority}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* D. Legendary Mechanics */}
                  {((monster.legendaryActions ?? 0) > 0 || (monster.legendaryResistances ?? 0) > 0) && (
                    <div>
                      <h4 className="text-xs text-realm-text-muted mb-2 font-display uppercase tracking-wider">
                        Legendary Mechanics
                      </h4>
                      <div className="flex items-center gap-3">
                        {(monster.legendaryActions ?? 0) > 0 && (
                          <span className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded text-xs font-display">
                            {monster.legendaryActions} Legendary Actions
                          </span>
                        )}
                        {(monster.legendaryResistances ?? 0) > 0 && (
                          <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded text-xs font-display">
                            {monster.legendaryResistances} Legendary Resistances
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* E. Phase Transitions */}
                  {(monster.phaseTransitions?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="text-xs text-realm-text-muted mb-2 font-display uppercase tracking-wider">
                        Phase Transitions ({monster.phaseTransitions.length})
                      </h4>
                      <div className="space-y-2">
                        {monster.phaseTransitions.map((phase, idx) => (
                          <div key={idx} className="bg-realm-bg-800/50 rounded px-3 py-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded text-xs font-display">
                                {phase.hpThresholdPercent}% HP
                              </span>
                              {phase.name && (
                                <span className="text-sm text-realm-text-primary font-display">{phase.name}</span>
                              )}
                            </div>
                            {phase.description && (
                              <p className="text-xs text-realm-text-muted">{phase.description}</p>
                            )}
                            {phase.effects.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {phase.effects.map((eff, ei) => (
                                  <span key={ei} className="bg-realm-bg-600 text-realm-text-secondary px-2 py-0.5 rounded text-xs font-display">
                                    {eff.type}
                                    {eff.statBoost ? ' (stat boost)' : ''}
                                    {eff.aoeBurst ? ' (AoE burst)' : ''}
                                    {eff.ability ? ' (ability)' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* F. Loot */}
                  <div>
                    <h4 className="text-xs text-realm-text-muted mb-2 font-display uppercase tracking-wider">
                      Loot
                    </h4>
                    {(monster.rewards.goldRange.min > 0 || monster.rewards.goldRange.max > 0) && (
                      <div className="text-xs text-realm-text-muted mb-1">
                        Gold:{' '}
                        <span className="text-realm-gold-400">
                          {monster.rewards.goldRange.min}-{monster.rewards.goldRange.max}g
                        </span>
                      </div>
                    )}
                    {monster.rewards.itemDrops.length > 0 ? (
                      <div className="space-y-1">
                        {monster.rewards.itemDrops.map((drop, di) => (
                          <div key={di} className="flex items-center gap-2 bg-realm-bg-800/50 rounded px-3 py-1.5">
                            <span className="text-xs text-realm-text-primary">{drop.name}</span>
                            <span className="text-[10px] text-realm-text-muted">
                              {Math.round(drop.dropChance * 100)}% drop
                            </span>
                            {(drop.minQty !== 1 || drop.maxQty !== 1) && (
                              <span className="text-[10px] text-realm-text-muted">
                                x{drop.minQty}-{drop.maxQty}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-realm-text-muted">No item drops</div>
                    )}
                  </div>

                </div>
              )}
            </div>
          );
        })}
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
