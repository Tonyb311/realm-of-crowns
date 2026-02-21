import { useState } from 'react';
import {
  Hammer,
  Clock,
  Search,
  Filter,
  ChevronDown,
  Loader2,
  Package,
  AlertCircle,
  Minus,
  Plus,
} from 'lucide-react';

export interface RecipeIngredient {
  itemTemplateId: string;
  itemName: string;
  quantity: number;
}

export interface MissingIngredient {
  itemTemplateId: string;
  itemName: string;
  needed: number;
  have: number;
}

export interface Recipe {
  id: string;
  name: string;
  professionType: string;
  tier: string;
  levelRequired: number;
  ingredients: RecipeIngredient[];
  result: { itemTemplateId: string; itemName: string };
  craftTime: number;
  xpReward: number;
  hasRequiredProfession: boolean;
  canCraft: boolean;
  missingIngredients: MissingIngredient[];
  specialization?: string | null;
  meetsSpecialization?: boolean;
  playerSpecialization?: string | null;
}

const PROFESSION_LABELS: Record<string, string> = {
  BLACKSMITH: 'Blacksmith',
  ARMORER: 'Armorer',
  LEATHERWORKER: 'Leatherworker',
  TAILOR: 'Tailor',
  WOODWORKER: 'Woodworker',
  ALCHEMIST: 'Alchemist',
  COOK: 'Cook',
  BREWER: 'Brewer',
  SMELTER: 'Smelter',
  TANNER: 'Tanner',
  FLETCHER: 'Fletcher',
  JEWELER: 'Jeweler',
  ENCHANTER: 'Enchanter',
  SCRIBE: 'Scribe',
  MASON: 'Mason',
  FARMER: 'Farmer',
  RANCHER: 'Rancher',
  FISHERMAN: 'Fisherman',
  LUMBERJACK: 'Lumberjack',
  MINER: 'Miner',
  HERBALIST: 'Herbalist',
  HUNTER: 'Hunter',
  MERCHANT: 'Merchant',
  INNKEEPER: 'Innkeeper',
  HEALER: 'Healer',
  STABLE_MASTER: 'Stable Master',
  BANKER: 'Banker',
  COURIER: 'Courier',
  MERCENARY_CAPTAIN: 'Mercenary Captain',
};

function professionLabel(type: string) {
  return PROFESSION_LABELS[type] ?? type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ');
}

const TIER_ORDER = ['APPRENTICE', 'JOURNEYMAN', 'CRAFTSMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'];

const SPECIALIZATION_LABELS: Record<string, string> = {
  TOOLSMITH: 'Toolsmith',
  WEAPONSMITH: 'Weaponsmith',
  ARMORER: 'Armorer',
};

function specializationLabel(spec: string) {
  return SPECIALIZATION_LABELS[spec] ?? spec.charAt(0) + spec.slice(1).toLowerCase();
}

function tierLabel(tier: string) {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

export { professionLabel, tierLabel, TIER_ORDER };

interface RecipeListProps {
  recipes: Recipe[];
  allRecipes: Recipe[];
  uniqueProfessions: string[];
  uniqueTiers: string[];
  professionFilter: string;
  setProfessionFilter: (v: string) => void;
  tierFilter: string;
  setTierFilter: (v: string) => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  showCraftableOnly: boolean;
  setShowCraftableOnly: (v: boolean) => void;
  isLoading: boolean;
  isCrafting: boolean;
  ownedCount: (name: string) => number;
  onCraft: (recipeId: string) => void;
  onBatchCraft: (recipeId: string, count: number) => void;
  isCraftStarting: boolean;
  craftError?: string;
}

export default function RecipeList({
  recipes,
  allRecipes,
  uniqueProfessions,
  uniqueTiers,
  professionFilter,
  setProfessionFilter,
  tierFilter,
  setTierFilter,
  searchQuery,
  setSearchQuery,
  showCraftableOnly,
  setShowCraftableOnly,
  isLoading,
  isCrafting,
  ownedCount,
  onCraft,
  onBatchCraft,
  isCraftStarting,
  craftError,
}: RecipeListProps) {
  const [batchCounts, setBatchCounts] = useState<Record<string, number>>({});

  function getBatchCount(recipeId: string) {
    return batchCounts[recipeId] ?? 1;
  }

  function setBatchCount(recipeId: string, count: number) {
    setBatchCounts((prev) => ({ ...prev, [recipeId]: Math.max(1, Math.min(10, count)) }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  const craftableCount = allRecipes.filter((r) => r.canCraft).length;

  return (
    <div>
      {/* Search bar */}
      <div className="mb-4 relative">
        <Search className="w-4 h-4 text-realm-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-realm-bg-700 border border-realm-border rounded text-sm text-realm-text-primary placeholder:text-realm-text-muted/50 focus:border-realm-gold-400 focus:outline-none"
        />
      </div>

      {/* Filters row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Profession filter */}
        <div className="relative">
          <select
            value={professionFilter}
            onChange={(e) => setProfessionFilter(e.target.value)}
            className="appearance-none bg-realm-bg-700 border border-realm-border rounded px-3 py-1.5 text-sm text-realm-text-primary pr-8 focus:border-realm-gold-400 focus:outline-none"
          >
            <option value="ALL">All Professions</option>
            {uniqueProfessions.map((p) => (
              <option key={p} value={p}>{professionLabel(p)}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-realm-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Tier filter */}
        <div className="relative">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="appearance-none bg-realm-bg-700 border border-realm-border rounded px-3 py-1.5 text-sm text-realm-text-primary pr-8 focus:border-realm-gold-400 focus:outline-none"
          >
            <option value="ALL">All Tiers</option>
            {uniqueTiers.map((t) => (
              <option key={t} value={t}>{tierLabel(t)}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-realm-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* What Can I Make toggle */}
        <button
          onClick={() => setShowCraftableOnly(!showCraftableOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-display rounded border transition-colors
            ${showCraftableOnly
              ? 'bg-realm-success text-realm-text-primary border-realm-success'
              : 'bg-realm-bg-700 text-realm-text-secondary border-realm-border hover:border-realm-gold-400/40'}`}
        >
          <Filter className="w-3 h-3" />
          What Can I Make? ({craftableCount})
        </button>
      </div>

      {craftError && (
        <div className="mb-4 p-3 bg-realm-danger/20 border border-realm-danger/50 rounded text-realm-danger text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {craftError}
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
          <Hammer className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
          <p className="text-realm-text-muted text-sm">
            {showCraftableOnly ? 'No craftable recipes with current materials.' : 'No recipes found.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recipes.map((recipe) => {
            const batchCount = getBatchCount(recipe.id);
            const canCraftSingle = recipe.canCraft && !isCrafting;

            // For batch: check if player has enough materials for batchCount
            const batchMissing: { name: string; need: number; have: number }[] = [];
            for (const ing of recipe.ingredients) {
              const have = ownedCount(ing.itemName);
              const need = ing.quantity * batchCount;
              if (have < need) {
                batchMissing.push({ name: ing.itemName, need, have });
              }
            }
            const meetsSpec = recipe.meetsSpecialization !== false;
            const canBatch = recipe.hasRequiredProfession && meetsSpec && batchMissing.length === 0 && !isCrafting;
            const isGreyedOut = !recipe.hasRequiredProfession || !meetsSpec;

            return (
              <div
                key={recipe.id}
                className={`bg-realm-bg-700 border border-realm-border rounded-lg p-4 transition-all hover:border-realm-border/80
                  ${isGreyedOut ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-display text-realm-gold-400">{recipe.name}</h4>
                    <p className="text-[10px] text-realm-text-muted flex items-center gap-1.5 flex-wrap">
                      <span>{professionLabel(recipe.professionType)} - {tierLabel(recipe.tier)} (Lv.{recipe.levelRequired})</span>
                      {recipe.specialization && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-display border ${
                          meetsSpec
                            ? 'bg-realm-teal-300/15 text-realm-teal-300 border-realm-teal-300/30'
                            : 'bg-realm-danger/15 text-realm-danger border-realm-danger/30'
                        }`}>
                          {specializationLabel(recipe.specialization)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-realm-text-muted">
                    <p className="flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {recipe.craftTime}m
                    </p>
                    <p>+{recipe.xpReward} XP</p>
                  </div>
                </div>

                {/* Ingredients */}
                <div className="mb-3">
                  <p className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-1">Ingredients</p>
                  <div className="space-y-0.5">
                    {recipe.ingredients.map((ing, i) => {
                      const have = ownedCount(ing.itemName);
                      const needTotal = ing.quantity * batchCount;
                      const enough = have >= needTotal;
                      return (
                        <div
                          key={i}
                          className={`text-xs flex justify-between ${enough ? 'text-realm-success' : 'text-realm-danger'}`}
                        >
                          <span>
                            {ing.itemName} x{batchCount > 1 ? needTotal : ing.quantity}
                          </span>
                          <span className="text-realm-text-muted">
                            (have {have})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Missing ingredients warning (from API) */}
                {recipe.missingIngredients.length > 0 && batchCount === 1 && (
                  <div className="mb-3 text-[10px] text-realm-danger">
                    {recipe.missingIngredients.map((mi, i) => (
                      <p key={i}>Need {mi.needed - mi.have} more {mi.itemName}</p>
                    ))}
                  </div>
                )}

                {/* Batch missing warning */}
                {batchMissing.length > 0 && batchCount > 1 && (
                  <div className="mb-3 text-[10px] text-realm-danger">
                    {batchMissing.map((bm, i) => (
                      <p key={i}>Need {bm.need - bm.have} more {bm.name}</p>
                    ))}
                  </div>
                )}

                {/* Result */}
                <div className="mb-3">
                  <p className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-1">Result</p>
                  <p className="text-sm text-realm-text-primary">
                    <Package className="w-3 h-3 inline mr-1" />
                    {recipe.result.itemName}{batchCount > 1 ? ` x${batchCount}` : ''}
                  </p>
                </div>

                {/* Quality formula hint */}
                <p className="text-[10px] text-realm-text-muted mb-3">
                  Quality: d20 + Lv/{5} + workshop bonus
                </p>

                {/* Batch count + Craft button */}
                <div className="flex gap-2">
                  {/* Batch counter */}
                  <div className="flex items-center border border-realm-border rounded bg-realm-bg-800">
                    <button
                      onClick={() => setBatchCount(recipe.id, batchCount - 1)}
                      disabled={batchCount <= 1}
                      className="px-2 py-2 text-realm-text-muted hover:text-realm-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 text-sm text-realm-text-primary font-display min-w-[24px] text-center">
                      {batchCount}
                    </span>
                    <button
                      onClick={() => setBatchCount(recipe.id, batchCount + 1)}
                      disabled={batchCount >= 10}
                      className="px-2 py-2 text-realm-text-muted hover:text-realm-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Craft button */}
                  <button
                    onClick={() => {
                      if (batchCount > 1) {
                        onBatchCraft(recipe.id, batchCount);
                      } else {
                        onCraft(recipe.id);
                      }
                    }}
                    disabled={!(batchCount > 1 ? canBatch : (canCraftSingle && meetsSpec)) || isCraftStarting}
                    className="flex-1 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded
                      hover:bg-realm-gold-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isCraftStarting
                      ? 'Starting...'
                      : !meetsSpec
                        ? `Requires ${specializationLabel(recipe.specialization!)}`
                        : !recipe.hasRequiredProfession
                          ? 'Level Too Low'
                          : isCrafting
                            ? 'Queue Full'
                            : batchCount > 1
                              ? `Craft ${batchCount}x ${recipe.result.itemName}`
                              : 'Craft'}
                  </button>
                </div>

                {/* Total time for batch */}
                {batchCount > 1 && (
                  <p className="text-[10px] text-realm-text-muted mt-1.5 text-right">
                    Total time: ~{recipe.craftTime * batchCount}m
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
