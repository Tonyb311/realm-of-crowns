import { useState, useMemo } from 'react';
import { ALL_PROFESSIONS, getProfessionsByCategory } from '@shared/data/professions';
import type { ProfessionDefinition, ProfessionCategory } from '@shared/data/professions/types';
import {
  ALL_PROCESSING_RECIPES,
  ALL_FINISHED_GOODS_RECIPES,
  ALL_CONSUMABLE_RECIPES,
  ALL_ACCESSORY_RECIPES,
} from '@shared/data/recipes';
import type { RecipeDefinition, FinishedGoodsRecipe, ConsumableRecipe } from '@shared/data/recipes/types';
import { RealmCard } from '../ui/RealmCard';
import { RealmBadge } from '../ui/RealmBadge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CodexProfessionsProps {
  searchQuery: string;
}

type CategoryFilter = 'ALL' | ProfessionCategory;

interface NormalizedRecipe {
  recipeId: string;
  name: string;
  levelRequired: number;
  tier: number;
  inputs: { itemName: string; quantity: number }[];
  outputs: { itemName: string; quantity: number }[];
  craftTime: number;
  xpReward: number;
  description?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_TABS: { key: CategoryFilter; label: string; count?: number }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'GATHERING', label: 'Gathering' },
  { key: 'CRAFTING', label: 'Crafting' },
  { key: 'SERVICE', label: 'Service' },
];

const CATEGORY_COLORS: Record<ProfessionCategory, string> = {
  GATHERING: 'text-realm-success',
  CRAFTING: 'text-realm-gold-400',
  SERVICE: 'text-realm-teal-300',
};

const CATEGORY_BG_COLORS: Record<ProfessionCategory, string> = {
  GATHERING: 'bg-realm-success/10 border-realm-success/30 text-realm-success',
  CRAFTING: 'bg-realm-gold-400/10 border-realm-gold-400/30 text-realm-gold-400',
  SERVICE: 'bg-realm-teal-300/10 border-realm-teal-300/30 text-realm-teal-300',
};

const TIER_NAMES = [
  'APPRENTICE',
  'JOURNEYMAN',
  'CRAFTSMAN',
  'EXPERT',
  'MASTER',
  'GRANDMASTER',
] as const;

const TIER_LABEL: Record<string, string> = {
  APPRENTICE: 'Apprentice',
  JOURNEYMAN: 'Journeyman',
  CRAFTSMAN: 'Craftsman',
  EXPERT: 'Expert',
  MASTER: 'Master',
  GRANDMASTER: 'Grandmaster',
};

const STAT_LABELS: Record<string, string> = {
  STR: 'Strength',
  DEX: 'Dexterity',
  CON: 'Constitution',
  INT: 'Intelligence',
  WIS: 'Wisdom',
  CHA: 'Charisma',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize any recipe type into a common shape for display. */
function normalizeRecipe(
  recipe: RecipeDefinition | FinishedGoodsRecipe | ConsumableRecipe,
): NormalizedRecipe {
  const base = {
    recipeId: recipe.recipeId,
    name: recipe.name,
    levelRequired: recipe.levelRequired,
    tier: recipe.tier,
    inputs: (recipe.inputs || []).map((i) => ({
      itemName: String(i.itemName),
      quantity: i.quantity,
    })),
    craftTime: recipe.craftTime,
    xpReward: recipe.xpReward,
  };

  // ConsumableRecipe uses singular `output` instead of `outputs`
  if ('output' in recipe && recipe.output) {
    const cr = recipe as ConsumableRecipe;
    return {
      ...base,
      outputs: [{ itemName: String(cr.output.itemName), quantity: cr.output.quantity }],
      description: cr.description,
    };
  }

  // RecipeDefinition / FinishedGoodsRecipe use `outputs` array
  const r = recipe as RecipeDefinition;
  return {
    ...base,
    outputs: (r.outputs || []).map((o) => ({
      itemName: String(o.itemName),
      quantity: o.quantity,
    })),
  };
}

/** Build a map of profession type -> normalized recipes. */
function buildRecipeMap(): Map<string, NormalizedRecipe[]> {
  const map = new Map<string, NormalizedRecipe[]>();

  const addRecipe = (profType: string, recipe: NormalizedRecipe) => {
    const list = map.get(profType) ?? [];
    list.push(recipe);
    map.set(profType, list);
  };

  for (const r of ALL_PROCESSING_RECIPES || []) {
    addRecipe(r.professionRequired, normalizeRecipe(r));
  }
  for (const r of ALL_FINISHED_GOODS_RECIPES || []) {
    addRecipe(r.professionRequired, normalizeRecipe(r));
  }
  for (const r of ALL_ACCESSORY_RECIPES || []) {
    addRecipe(r.professionRequired, normalizeRecipe(r));
  }
  for (const r of ALL_CONSUMABLE_RECIPES || []) {
    addRecipe(r.professionRequired, normalizeRecipe(r));
  }

  return map;
}

function formatCraftTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || '';
  return text.slice(0, maxLength).trimEnd() + '...';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RecipeRow({ recipe }: { recipe: NormalizedRecipe }) {
  return (
    <div className="bg-realm-bg-800 border border-realm-border rounded p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="font-display text-sm text-realm-text-primary">{recipe.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-realm-text-muted">
            Lvl {recipe.levelRequired}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-realm-bg-700 text-realm-text-muted border border-realm-border">
            T{recipe.tier}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {/* Inputs */}
        <div>
          <span className="text-realm-text-muted">Inputs: </span>
          <span className="text-realm-text-secondary">
            {(recipe.inputs || []).length > 0
              ? recipe.inputs.map((i) => `${i.itemName} x${i.quantity}`).join(', ')
              : 'None'}
          </span>
        </div>
        {/* Outputs */}
        <div>
          <span className="text-realm-text-muted">Outputs: </span>
          <span className="text-realm-text-secondary">
            {(recipe.outputs || []).length > 0
              ? recipe.outputs.map((o) => `${o.itemName} x${o.quantity}`).join(', ')
              : 'None'}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-realm-text-muted">
        <span>Time: {formatCraftTime(recipe.craftTime)}</span>
        <span>XP: {recipe.xpReward}</span>
        {recipe.description && (
          <span className="italic text-realm-text-muted/70">{truncate(recipe.description, 80)}</span>
        )}
      </div>
    </div>
  );
}

function TierUnlockSection({
  tierUnlocks,
}: {
  tierUnlocks: Record<string, string[]>;
}) {
  if (!tierUnlocks) return null;

  return (
    <div className="space-y-2">
      <h4 className="font-display text-sm text-realm-gold-400">Tier Unlocks</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TIER_NAMES.map((tier) => {
          const unlocks = tierUnlocks[tier];
          if (!unlocks || unlocks.length === 0) return null;
          return (
            <div
              key={tier}
              className="bg-realm-bg-800 border border-realm-border rounded p-2"
            >
              <span className="font-display text-xs text-realm-text-primary">
                {TIER_LABEL[tier] || tier}
              </span>
              <ul className="mt-1 space-y-0.5">
                {unlocks.map((unlock, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-realm-text-secondary pl-2 before:content-['\2022'] before:mr-1.5 before:text-realm-text-muted"
                  >
                    {unlock}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfessionExpandedDetail({
  profession,
  recipes,
}: {
  profession: ProfessionDefinition;
  recipes: NormalizedRecipe[];
}) {
  return (
    <div className="mt-4 pt-4 border-t border-realm-border space-y-4">
      {/* Full description */}
      <p className="text-sm text-realm-text-secondary font-body leading-relaxed">
        {profession.description}
      </p>

      {/* Primary stat & related professions */}
      <div className="flex flex-wrap gap-4">
        <div>
          <span className="text-xs text-realm-text-muted">Primary Stat: </span>
          <span className="text-xs text-realm-gold-400 font-display">
            {STAT_LABELS[profession.primaryStat] || profession.primaryStat}
          </span>
        </div>
        {(profession.relatedProfessions || []).length > 0 && (
          <div>
            <span className="text-xs text-realm-text-muted">Related: </span>
            <span className="text-xs text-realm-text-secondary">
              {profession.relatedProfessions
                .map((rp) => {
                  const found = (ALL_PROFESSIONS || []).find((p) => p.type === rp);
                  return found?.name || String(rp).charAt(0) + String(rp).slice(1).toLowerCase().replace(/_/g, ' ');
                })
                .join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Tier unlocks */}
      <TierUnlockSection tierUnlocks={profession.tierUnlocks} />

      {/* Recipes */}
      {recipes.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-display text-sm text-realm-gold-400">
            Recipes ({recipes.length})
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {recipes
              .sort((a, b) => a.levelRequired - b.levelRequired || a.tier - b.tier)
              .map((recipe) => (
                <RecipeRow key={recipe.recipeId} recipe={recipe} />
              ))}
          </div>
        </div>
      )}

      {recipes.length === 0 && profession.category !== 'GATHERING' && profession.category !== 'SERVICE' && (
        <p className="text-xs text-realm-text-muted italic">
          No crafting recipes found for this profession.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function CodexProfessions({ searchQuery }: CodexProfessionsProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [expandedProfession, setExpandedProfession] = useState<string | null>(null);

  // Build recipe lookup once
  const recipeMap = useMemo(() => buildRecipeMap(), []);

  // Build a lookup of recipe names per profession type for search matching
  const recipeNamesByProfession = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [profType, recipes] of recipeMap.entries()) {
      map.set(
        profType,
        recipes.map((r) => r.name.toLowerCase()),
      );
    }
    return map;
  }, [recipeMap]);

  // Filter professions by category and search query
  const filteredProfessions = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase();

    let professions =
      categoryFilter === 'ALL'
        ? [...(ALL_PROFESSIONS || [])]
        : getProfessionsByCategory(categoryFilter) || [];

    if (query) {
      professions = professions.filter((p) => {
        const nameMatch = (p.name || '').toLowerCase().includes(query);
        const descMatch = (p.description || '').toLowerCase().includes(query);
        const recipeNames = recipeNamesByProfession.get(p.type) || [];
        const recipeMatch = recipeNames.some((rn) => rn.includes(query));
        return nameMatch || descMatch || recipeMatch;
      });
    }

    return professions;
  }, [categoryFilter, searchQuery, recipeNamesByProfession]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase();
    const countFor = (profs: ProfessionDefinition[]): number => {
      if (!query) return profs.length;
      return profs.filter((p) => {
        const nameMatch = (p.name || '').toLowerCase().includes(query);
        const descMatch = (p.description || '').toLowerCase().includes(query);
        const recipeNames = recipeNamesByProfession.get(p.type) || [];
        const recipeMatch = recipeNames.some((rn) => rn.includes(query));
        return nameMatch || descMatch || recipeMatch;
      }).length;
    };
    return {
      ALL: countFor(ALL_PROFESSIONS || []),
      GATHERING: countFor(getProfessionsByCategory('GATHERING') || []),
      CRAFTING: countFor(getProfessionsByCategory('CRAFTING') || []),
      SERVICE: countFor(getProfessionsByCategory('SERVICE') || []),
    };
  }, [searchQuery, recipeNamesByProfession]);

  const toggleExpand = (profType: string) => {
    setExpandedProfession((prev) => (prev === profType ? null : profType));
  };

  return (
    <div className="space-y-6">
      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key)}
            className={`px-4 py-2 text-xs font-display rounded-lg border transition-colors ${
              categoryFilter === key
                ? 'bg-realm-gold-400/10 text-realm-gold-400 border-realm-gold-400/30'
                : 'bg-realm-bg-700 text-realm-text-muted border-realm-border hover:border-realm-gold-400/20 hover:text-realm-text-secondary'
            }`}
          >
            {label}
            <span className="ml-1.5 text-[10px] opacity-60">
              ({categoryCounts[key]})
            </span>
          </button>
        ))}
      </div>

      {/* Profession grid */}
      {filteredProfessions.length === 0 ? (
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
          <p className="text-realm-text-muted text-sm">
            {searchQuery
              ? 'No professions match your search.'
              : 'No professions found in this category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredProfessions.map((profession) => {
            const isExpanded = expandedProfession === profession.type;
            const recipes = recipeMap.get(profession.type) || [];

            return (
              <RealmCard
                key={profession.type}
                className={isExpanded ? 'lg:col-span-2' : ''}
                onClick={() => toggleExpand(profession.type)}
                selected={isExpanded}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-base text-realm-text-primary">
                        {profession.name}
                      </h3>
                      <span
                        className={`text-[10px] font-display uppercase tracking-wider px-2 py-0.5 rounded-sm border inline-block ${CATEGORY_BG_COLORS[profession.category]}`}
                      >
                        {profession.category}
                      </span>
                    </div>
                    <p className="text-xs text-realm-text-muted mt-1 font-body">
                      {isExpanded
                        ? '' /* Full description shown in expanded detail */
                        : truncate(profession.description, 120)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <RealmBadge variant="default">
                      {profession.primaryStat}
                    </RealmBadge>
                    {recipes.length > 0 && (
                      <span className="text-[10px] text-realm-text-muted">
                        {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <ProfessionExpandedDetail
                    profession={profession}
                    recipes={recipes}
                  />
                )}
              </RealmCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
