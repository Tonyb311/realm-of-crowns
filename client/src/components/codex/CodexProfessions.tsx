import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RealmCard } from '../ui/RealmCard';
import { RealmBadge } from '../ui/RealmBadge';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types (match API response shape)
// ---------------------------------------------------------------------------

interface CodexProfessionsProps {
  searchQuery: string;
}

type ProfessionCategory = 'GATHERING' | 'CRAFTING' | 'SERVICE';
type CategoryFilter = 'ALL' | ProfessionCategory;

interface ProfessionData {
  type: string;
  name: string;
  category: ProfessionCategory;
  description: string;
  primaryStat: string;
  relatedProfessions: string[];
  tierUnlocks: Record<string, string[]>;
  recipes: RecipeData[];
}

interface RecipeData {
  id: string;
  name: string;
  tier: string;
  levelRequired: number | null;
  ingredients: any;
  result: string;
  craftTime: number;
  xpReward: number;
  specialization: string | null;
}

interface TierDefinition {
  tier: string;
  levelRange: [number, number];
}

interface ProfessionsResponse {
  professions: ProfessionData[];
  tiers: TierDefinition[];
  tierUnlocks: Record<string, any>;
  total: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'GATHERING', label: 'Gathering' },
  { key: 'CRAFTING', label: 'Crafting' },
  { key: 'SERVICE', label: 'Service' },
];

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

const TIER_YIELD_BONUS: Record<string, string> = {
  APPRENTICE: '+0%',
  JOURNEYMAN: '+25%',
  CRAFTSMAN: '+50%',
  EXPERT: '+75%',
  MASTER: '+100%',
  GRANDMASTER: '+150%',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function RecipeRow({ recipe }: { recipe: RecipeData }) {
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

  return (
    <div className="bg-realm-bg-800 border border-realm-border rounded p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="font-display text-sm text-realm-text-primary">{recipe.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-realm-text-muted">
            Lvl {recipe.levelRequired ?? '?'}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-realm-bg-700 text-realm-text-muted border border-realm-border">
            {TIER_LABEL[recipe.tier] || recipe.tier}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {/* Inputs */}
        <div>
          <span className="text-realm-text-muted">Inputs: </span>
          <span className="text-realm-text-secondary">
            {ingredients.length > 0
              ? ingredients.map((i: any) => `${i.itemName} x${i.quantity}`).join(', ')
              : 'None'}
          </span>
        </div>
        {/* Output */}
        <div>
          <span className="text-realm-text-muted">Output: </span>
          <span className="text-realm-text-secondary">{recipe.result}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-realm-text-muted">
        <span>Time: {formatCraftTime(recipe.craftTime)}</span>
        <span>XP: {recipe.xpReward}</span>
        {recipe.specialization && (
          <span className="text-realm-teal-300">Spec: {recipe.specialization}</span>
        )}
      </div>
    </div>
  );
}

function TierUnlockSection({
  tierUnlocks,
  professionType,
  category,
  tiers,
  tierUnlockData,
}: {
  tierUnlocks: Record<string, string[]>;
  professionType: string;
  category: string;
  tiers: TierDefinition[];
  tierUnlockData: Record<string, any>;
}) {
  if (!tierUnlocks) return null;

  const profTierUnlock = tierUnlockData?.[professionType];
  const isGathering = category === 'GATHERING';

  return (
    <div className="space-y-2">
      <h4 className="font-display text-sm text-realm-gold-400">Tier Unlocks</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TIER_NAMES.map((tier) => {
          const unlocks = tierUnlocks[tier];
          if (!unlocks || unlocks.length === 0) return null;
          const tierDef = tiers.find(t => t.tier === tier);
          const tierEntry = profTierUnlock?.[tier];
          const isComingSoon = !!tierEntry?.NOT_YET_IMPLEMENTED;
          return (
            <div
              key={tier}
              className={`bg-realm-bg-800 border rounded p-2 ${
                isComingSoon ? 'border-realm-border/50 opacity-60' : 'border-realm-border'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-xs text-realm-text-primary">
                  {TIER_LABEL[tier] || tier}
                </span>
                {tierDef && (
                  <span className="text-[10px] text-realm-text-muted">
                    Lv. {tierDef.levelRange[0]}-{tierDef.levelRange[1] > 99 ? '99+' : tierDef.levelRange[1]}
                  </span>
                )}
              </div>
              <ul className="space-y-0.5">
                {unlocks.map((unlock, idx) => {
                  const comingTag = unlock.includes('Coming Soon');
                  return (
                    <li
                      key={idx}
                      className={`text-xs pl-2 before:content-['\\2022'] before:mr-1.5 ${
                        comingTag
                          ? 'text-realm-text-muted/60 before:text-realm-text-muted/40 italic'
                          : 'text-realm-text-secondary before:text-realm-text-muted'
                      }`}
                    >
                      {unlock}
                    </li>
                  );
                })}
              </ul>
              {isGathering && (
                <div className="mt-1 text-[10px] text-realm-text-muted">
                  Yield: {TIER_YIELD_BONUS[tier] || '+0%'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfessionExpandedDetail({
  profession,
  tiers,
  tierUnlockData,
  allProfessions,
}: {
  profession: ProfessionData;
  tiers: TierDefinition[];
  tierUnlockData: Record<string, any>;
  allProfessions: ProfessionData[];
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
                  const found = allProfessions.find((p) => p.type === rp);
                  return found?.name || String(rp).charAt(0) + String(rp).slice(1).toLowerCase().replace(/_/g, ' ');
                })
                .join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Tier unlocks */}
      <TierUnlockSection
        tierUnlocks={profession.tierUnlocks}
        professionType={profession.type}
        category={profession.category}
        tiers={tiers}
        tierUnlockData={tierUnlockData}
      />

      {/* Recipes */}
      {profession.recipes.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-display text-sm text-realm-gold-400">
            Recipes ({profession.recipes.length})
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {[...profession.recipes]
              .sort((a, b) => (a.levelRequired ?? 0) - (b.levelRequired ?? 0))
              .map((recipe) => (
                <RecipeRow key={recipe.id} recipe={recipe} />
              ))}
          </div>
        </div>
      )}

      {profession.recipes.length === 0 && profession.category !== 'GATHERING' && profession.category !== 'SERVICE' && (
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

  const { data, isLoading } = useQuery<ProfessionsResponse>({
    queryKey: ['codex', 'professions'],
    queryFn: async () => (await api.get('/codex/professions')).data,
    staleTime: 5 * 60 * 1000,
  });

  const allProfessions = data?.professions ?? [];
  const tiers = data?.tiers ?? [];
  const tierUnlockData = data?.tierUnlocks ?? {};

  // Build a lookup of recipe names per profession type for search matching
  const recipeNamesByProfession = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const prof of allProfessions) {
      map.set(
        prof.type,
        prof.recipes.map((r) => r.name.toLowerCase()),
      );
    }
    return map;
  }, [allProfessions]);

  // Filter professions by category and search query
  const filteredProfessions = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase();

    let professions =
      categoryFilter === 'ALL'
        ? [...allProfessions]
        : allProfessions.filter(p => p.category === categoryFilter);

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
  }, [allProfessions, categoryFilter, searchQuery, recipeNamesByProfession]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const query = (searchQuery || '').trim().toLowerCase();
    const countFor = (profs: ProfessionData[]): number => {
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
      ALL: countFor(allProfessions),
      GATHERING: countFor(allProfessions.filter(p => p.category === 'GATHERING')),
      CRAFTING: countFor(allProfessions.filter(p => p.category === 'CRAFTING')),
      SERVICE: countFor(allProfessions.filter(p => p.category === 'SERVICE')),
    };
  }, [allProfessions, searchQuery, recipeNamesByProfession]);

  const toggleExpand = (profType: string) => {
    setExpandedProfession((prev) => (prev === profType ? null : profType));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-realm-text-muted">
          <div className="w-5 h-5 border-2 border-realm-gold-400/50 border-t-realm-gold-400 rounded-full animate-spin" />
          <span className="font-body text-sm">Loading professions...</span>
        </div>
      </div>
    );
  }

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

            return (
              <RealmCard
                key={profession.type}
                className={`flex flex-col min-h-[160px] ${isExpanded ? 'lg:col-span-2' : ''}`}
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
                    <p className="text-xs text-realm-text-muted mt-1 font-body flex-grow">
                      {isExpanded
                        ? ''
                        : truncate(profession.description, 120)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0 mt-auto">
                    <RealmBadge variant="default">
                      {profession.primaryStat}
                    </RealmBadge>
                    {profession.recipes.length > 0 && (
                      <span className="text-[10px] text-realm-text-muted">
                        {profession.recipes.length} recipe{profession.recipes.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <ProfessionExpandedDetail
                    profession={profession}
                    tiers={tiers}
                    tierUnlockData={tierUnlockData}
                    allProfessions={allProfessions}
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
