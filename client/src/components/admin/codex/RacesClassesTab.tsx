import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Users,
  Swords,
  Package,
  Zap,
  Shield,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import api from '../../../services/api';
import StatBlock from '../combat/StatBlock';
import AbilityCard from '../combat/AbilityCard';
import { FEAT_DEFINITIONS, FEAT_UNLOCK_LEVELS, type FeatDefinition } from '@shared/data/feats';

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
  dexSaveMod: number;
  strSaveMod: number;
  damageDealtMod: number;
  healingReceivedMult: number;
  blocksMultiattack: boolean;
  blocksFlee: boolean;
  blocksSpells: boolean;
  blocksMovementAbilities: boolean;
  grantsAdvantageToAttackers: number;
  autoFailDexSave: boolean;
  autoFailStrSave: boolean;
  meleeAutoCrit: boolean;
  vulnerableTo: string[];
  removedBy: string[];
  immuneTo: string[];
  aiPreference?: string;
  fleeChance: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Sub-section definition
// ---------------------------------------------------------------------------

type CodexSection = 'races' | 'classes' | 'feats' | 'items' | 'status-effects';

const SECTIONS: { key: CodexSection; label: string; icon: typeof Users }[] = [
  { key: 'races', label: 'Races', icon: Users },
  { key: 'classes', label: 'Classes', icon: Swords },
  { key: 'feats', label: 'Feats', icon: Shield },
  { key: 'items', label: 'Items', icon: Package },
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
          <span className="bg-realm-gold-500/20 text-realm-gold-400 px-2 py-0.5 rounded-sm text-xs font-display">
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
// Sub-section: Races
// ---------------------------------------------------------------------------

function RacesSection({ search }: { search: string }) {
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
                className={`${RACE_TIER_COLORS[race.tier] ?? 'bg-realm-bg-600 text-realm-text-muted'} px-2 py-0.5 rounded-sm text-xs font-display`}
              >
                {race.tier}
              </span>
              <span className="bg-realm-bg-600 text-realm-text-secondary px-2 py-0.5 rounded-sm text-xs font-display ml-auto">
                {race.abilities.length} abilities
              </span>
            </button>

            {!isExpanded && (
              <div className="px-5 pb-3">
                <StatBlock stats={race.statModifiers} />
              </div>
            )}

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

                <div>
                  <h4 className="text-xs text-realm-text-muted mb-1 font-display uppercase tracking-wider">Stat Modifiers</h4>
                  <StatBlock stats={race.statModifiers} />
                </div>

                {race.startingTowns.length > 0 && (
                  <div>
                    <h4 className="text-xs text-realm-text-muted mb-1 font-display uppercase tracking-wider">Starting Towns</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {race.startingTowns.map((town) => (
                        <span key={town} className="bg-realm-bg-600 text-realm-text-secondary px-2 py-0.5 rounded-sm text-xs">{town}</span>
                      ))}
                    </div>
                  </div>
                )}

                {race.professionBonuses.length > 0 && (
                  <div>
                    <h4 className="text-xs text-realm-text-muted mb-1 font-display uppercase tracking-wider">Profession Bonuses ({race.professionBonuses.length})</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {race.professionBonuses.map((bonus, i) => {
                        const b = bonus as Record<string, unknown>;
                        return (
                          <div key={i} className="text-xs text-realm-text-secondary bg-realm-bg-800/50 rounded-sm px-2 py-1">
                            <span className="text-realm-gold-400">{String(b.profession ?? b.type ?? '--')}</span>
                            {b.bonus != null && <span className="ml-1">+{String(b.bonus)}</span>}
                            {b.description != null && <span className="text-realm-text-muted ml-1">({String(b.description)})</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs text-realm-text-muted mb-2 font-display uppercase tracking-wider">Abilities ({race.abilities.length})</h4>
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
// Cantrip scaling formatter
// ---------------------------------------------------------------------------

function formatCantripScaling(effects: Record<string, unknown>): string | null {
  const diceCount = effects.diceCount as number | undefined;
  const diceSides = effects.diceSides as number | undefined;
  const scalingLevels = effects.scalingLevels as number[] | undefined;
  if (!diceCount || !diceSides || !scalingLevels?.length) return null;

  const parts = [`${diceCount}d${diceSides}`];
  for (let i = 0; i < scalingLevels.length; i++) {
    parts.push(`${diceCount + i + 1}d${diceSides} (L${scalingLevels[i]})`);
  }
  return parts.join(' \u2192 ');
}

// ---------------------------------------------------------------------------
// Sub-section: Classes
// ---------------------------------------------------------------------------

function ClassesSection({ search }: { search: string }) {
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
        // Separate tier -1 abilities (cantrips + L1 defensive) from spec abilities
        const allSpec = cls.specAbilities ?? cls.abilities.filter(a => !a.requiresChoice);
        const innateAbilities = allSpec.filter(a => a.tier === -1);
        const specAbilities = allSpec.filter(a => a.tier !== -1);
        const tier0Groups = cls.tier0Abilities ?? [];
        const tier0Count = tier0Groups.reduce((sum, g) => sum + g.abilities.length, 0);
        const totalCount = innateAbilities.length + tier0Count + specAbilities.length;

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
              <span className="bg-realm-bg-600 text-realm-text-secondary px-2 py-0.5 rounded-sm text-xs font-display">
                {cls.specializations.length} specs
              </span>
              <span className="bg-realm-gold-500/20 text-realm-gold-400 px-2 py-0.5 rounded-sm text-xs font-display ml-auto">
                {totalCount} abilities
              </span>
            </button>

            {isExpanded && (
              <div className="px-5 pb-5 space-y-4">
                {/* Specializations list */}
                <div className="flex flex-wrap gap-1.5">
                  {cls.specializations.map((spec) => (
                    <span
                      key={spec}
                      className="bg-realm-purple/20 text-realm-purple px-2 py-0.5 rounded-sm text-xs font-display"
                    >
                      {spec}
                    </span>
                  ))}
                </div>

                {/* Innate Abilities (Cantrips + L1 Defensive) — shown FIRST */}
                {innateAbilities.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs text-realm-text-muted font-display uppercase tracking-wider">
                      Innate Abilities (Auto-Granted at L1)
                    </h4>
                    {innateAbilities.map((ability) => {
                      const scaling = ability.effects?.type === 'cantrip' ? formatCantripScaling(ability.effects) : null;
                      return (
                        <div key={ability.id}>
                          <AbilityCard
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
                          {scaling && (
                            <div className="ml-5 mt-0.5 text-[10px] text-realm-text-muted font-mono">
                              Scaling: {scaling}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

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
                            <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-sm font-display">
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
// Sub-section: Feats
// ---------------------------------------------------------------------------

const FEAT_CATEGORY_COLORS: Record<string, string> = {
  combat: 'bg-red-500/20 text-red-400',
  defense: 'bg-blue-500/20 text-blue-400',
  utility: 'bg-yellow-500/20 text-yellow-400',
  crafting: 'bg-green-500/20 text-green-400',
  social: 'bg-purple-500/20 text-purple-400',
  exploration: 'bg-teal-500/20 text-teal-400',
};

function FeatsSection({ search }: { search: string }) {
  const filtered = useMemo(() => {
    if (!search) return FEAT_DEFINITIONS;
    const q = search.toLowerCase();
    return FEAT_DEFINITIONS.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q),
    );
  }, [search]);

  // Group by category
  const groups = useMemo(() => {
    const map = new Map<string, FeatDefinition[]>();
    for (const feat of filtered) {
      const list = map.get(feat.category) ?? [];
      list.push(feat);
      map.set(feat.category, list);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-3">
      <div className="text-xs text-realm-text-muted">
        {filtered.length} feats — unlocked at levels {FEAT_UNLOCK_LEVELS.join(' & ')} (max {FEAT_UNLOCK_LEVELS.length})
      </div>
      {groups.map(([category, feats]) => (
        <CollapsibleSection key={category} title={`${category.charAt(0).toUpperCase() + category.slice(1)}`} count={feats.length} defaultOpen>
          <div className="space-y-2">
            {feats.map((feat) => (
              <div key={feat.id} className="bg-realm-bg-800/50 border border-realm-border/50 rounded-sm px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-realm-text-primary font-display">{feat.name}</span>
                  <span className={`${FEAT_CATEGORY_COLORS[feat.category] ?? 'bg-gray-500/20 text-gray-400'} px-2 py-0.5 rounded-sm text-[10px] font-display`}>
                    {feat.category}
                  </span>
                  {feat.excludedClasses && feat.excludedClasses.length > 0 && (
                    <span className="bg-red-500/10 text-red-400/70 px-2 py-0.5 rounded-sm text-[10px] font-display ml-auto">
                      Excluded: {feat.excludedClasses.join(', ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-realm-text-secondary mt-1">{feat.description}</p>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {Object.entries(feat.effects).map(([key, val]) => (
                    <span key={key} className="text-[10px] text-realm-text-muted bg-realm-bg-900/50 px-1.5 py-0.5 rounded-sm">
                      {formatFeatKey(key)}: {formatFeatValue(val)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}

function formatFeatKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^\w/, c => c.toUpperCase()).trim();
}

function formatFeatValue(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') {
    if (v > 0 && v < 1) return `${Math.round(v * 100)}%`;
    return String(v);
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

// ---------------------------------------------------------------------------
// Sub-section: Items
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

function ItemsSection({ search }: { search: string }) {
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
                  className="flex items-start justify-between gap-2 bg-realm-bg-800/50 rounded-sm px-3 py-2"
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
                      <span className="bg-realm-bg-600 text-realm-text-secondary px-2 py-0.5 rounded-sm text-xs font-display">
                        {item.profession ?? item.professionType}
                      </span>
                    )}
                    {item.levelRequired != null && (
                      <span className="bg-realm-bg-600 text-realm-text-muted px-2 py-0.5 rounded-sm text-xs font-display">
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

  if (baseDmg != null) {
    const parts = [`${baseDmg} ${dmgType ?? 'dmg'}`];
    if (reqStr != null || reqDex != null) parts.push(`STR ${reqStr ?? '-'}/DEX ${reqDex ?? '-'}`);
    return parts.join(', ');
  }
  if (armor != null || magicResist != null) {
    const parts: string[] = [];
    if (armor != null) parts.push(`AC +${armor}`);
    if (magicResist != null) parts.push(`MR +${magicResist}`);
    return parts.join(', ');
  }
  if (speedB != null || yieldB != null) {
    const parts: string[] = [];
    if (speedB != null) parts.push(`+${Math.round(speedB * 100)}% speed`);
    if (yieldB != null) parts.push(`+${Math.round(yieldB * 100)}% yield`);
    return parts.join(', ');
  }

  return null;
}

// ---------------------------------------------------------------------------
// Sub-section: Status Effects
// ---------------------------------------------------------------------------

function StatusEffectsSection({ search }: { search: string }) {
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
      <div className="space-y-2">
        {filtered.map((effect) => (
          <div key={effect.name} className="bg-realm-bg-700 border border-realm-border rounded-lg p-4 hover:bg-realm-bg-800/30 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm text-realm-text-primary font-display font-bold">{formatEffectName(effect.name)}</span>
              {effect.preventsAction && (
                <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded-sm text-[10px] font-display">SKIPS TURN</span>
              )}
              {effect.hasDot && (
                <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded-sm text-[10px] font-display">DoT {effect.dotDamageBase}/rd</span>
              )}
              {effect.hasHot && (
                <span className="bg-green-500/10 text-green-400 px-2 py-0.5 rounded-sm text-[10px] font-display">HoT {effect.hotHealingBase}/rd</span>
              )}
            </div>
            <p className="text-xs text-realm-text-secondary mb-2">{effect.description}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
              {effect.attackModifier !== 0 && <span className={effect.attackModifier > 0 ? 'text-green-400' : 'text-red-400'}>ATK {effect.attackModifier > 0 ? '+' : ''}{effect.attackModifier}</span>}
              {effect.acModifier !== 0 && <span className={effect.acModifier > 0 ? 'text-green-400' : 'text-red-400'}>AC {effect.acModifier > 0 ? '+' : ''}{effect.acModifier}</span>}
              {effect.saveModifier !== 0 && <span className={effect.saveModifier > 0 ? 'text-green-400' : 'text-red-400'}>Save {effect.saveModifier > 0 ? '+' : ''}{effect.saveModifier}</span>}
              {effect.dexSaveMod !== 0 && <span className="text-red-400">DEX Save {effect.dexSaveMod}</span>}
              {effect.strSaveMod !== 0 && <span className="text-red-400">STR Save {effect.strSaveMod}</span>}
              {effect.damageDealtMod !== 0 && <span className="text-red-400">DMG {effect.damageDealtMod}</span>}
              {effect.healingReceivedMult !== 1.0 && <span className="text-red-400">Heal x{effect.healingReceivedMult}</span>}
              {effect.grantsAdvantageToAttackers !== 0 && <span className="text-amber-400">Attackers +{effect.grantsAdvantageToAttackers}</span>}
              {effect.autoFailDexSave && <span className="text-red-500">Auto-fail DEX</span>}
              {effect.autoFailStrSave && <span className="text-red-500">Auto-fail STR</span>}
              {effect.meleeAutoCrit && <span className="text-red-500">Melee auto-crit</span>}
              {effect.blocksMultiattack && <span className="text-amber-400">No multiattack</span>}
              {effect.blocksFlee && <span className="text-amber-400">No flee</span>}
              {effect.blocksSpells && <span className="text-amber-400">No spells</span>}
              {effect.blocksMovementAbilities && <span className="text-amber-400">No movement</span>}
              {effect.vulnerableTo.length > 0 && <span className="text-red-400">Vuln: {effect.vulnerableTo.join(', ')}</span>}
              {effect.removedBy.length > 0 && <span className="text-blue-400">Removed by: {effect.removedBy.join(', ')}</span>}
              {effect.immuneTo.length > 0 && <span className="text-cyan-400">Immune: {effect.immuneTo.join(', ')}</span>}
              {effect.aiPreference && <span className="text-purple-400">AI: {effect.aiPreference}</span>}
              {effect.fleeChance > 0 && <span className="text-purple-400">{effect.fleeChance}% flee</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatEffectName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Main RacesClassesTab Component
// ---------------------------------------------------------------------------

export default function RacesClassesTab() {
  const [activeSection, setActiveSection] = useState<CodexSection>('races');
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
          className="w-full bg-realm-bg-700 border border-realm-border rounded-lg pl-10 pr-4 py-2.5 text-sm text-realm-text-primary placeholder-realm-text-muted focus:outline-hidden focus:border-realm-gold-500/50 transition-colors"
        />
      </div>

      {/* Section buttons */}
      <div className="border-b border-realm-border">
        <nav className="flex gap-1">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.key;
            return (
              <button
                key={sec.key}
                onClick={() => {
                  setActiveSection(sec.key);
                  setSearch('');
                }}
                className={`flex items-center gap-2 px-4 py-2.5 font-display text-xs border-b-2 transition-colors ${
                  isActive
                    ? 'border-realm-gold-500 text-realm-gold-400'
                    : 'border-transparent text-realm-text-muted hover:text-realm-text-secondary hover:border-realm-border/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {sec.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active section content */}
      {activeSection === 'races' && <RacesSection search={search} />}
      {activeSection === 'classes' && <ClassesSection search={search} />}
      {activeSection === 'feats' && <FeatsSection search={search} />}
      {activeSection === 'items' && <ItemsSection search={search} />}
      {activeSection === 'status-effects' && <StatusEffectsSection search={search} />}
    </div>
  );
}
