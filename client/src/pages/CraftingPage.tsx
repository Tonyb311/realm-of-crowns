import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Hammer,
  Clock,
  CheckCircle2,
  Pickaxe,
  Loader2,
  Package,
  ChevronDown,
  Sparkles,
  AlertCircle,
  XCircle,
  Search,
  Filter,
  Building2,
  Minus,
  Plus,
} from 'lucide-react';
import api from '../services/api';
import ToolSlot from '../components/gathering/ToolSlot';
import type { EquippedTool } from '../components/gathering/ToolSlot';
import ToolSelector from '../components/gathering/ToolSelector';
import GatheringResults from '../components/gathering/GatheringResults';
import type { GatheringResultData } from '../components/gathering/GatheringResults';
import CraftingResults from '../components/crafting/CraftingResults';
import type { CraftingResultData } from '../components/crafting/CraftingResults';
import { useGatheringEvents } from '../hooks/useGatheringEvents';
import { useCraftingEvents } from '../hooks/useCraftingEvents';

// ---------------------------------------------------------------------------
// Types (updated to match enhanced backend API)
// ---------------------------------------------------------------------------
interface RecipeIngredient {
  itemTemplateId: string;
  itemName: string;
  quantity: number;
}

interface MissingIngredient {
  itemTemplateId: string;
  itemName: string;
  needed: number;
  have: number;
}

interface Recipe {
  id: string;
  name: string;
  professionType: string;
  tier: string;
  levelRequired: number;
  ingredients: RecipeIngredient[];
  result: { itemTemplateId: string; itemName: string };
  craftTime: number; // minutes
  xpReward: number;
  hasRequiredProfession: boolean;
  canCraft: boolean;
  missingIngredients: MissingIngredient[];
}

interface QueueItem {
  id: string;
  index: number;
  recipeId: string;
  recipeName: string;
  startedAt: string;
  completesAt: string;
  ready: boolean;
  remainingMinutes: number;
}

interface QueueResponse {
  queue: QueueItem[];
  total: number;
  readyCount: number;
}

interface CraftingStatus {
  crafting: boolean;
  ready?: boolean;
  remainingMinutes?: number;
  recipeName?: string;
  recipeId?: string;
  quality?: string;
  startedAt?: string;
  completesAt?: string;
}

interface WorkStatus {
  working: boolean;
  ready?: boolean;
  remainingMinutes?: number;
  resource?: string;
  profession?: string;
  startedAt?: string;
  completesAt?: string;
}

interface Profession {
  professionType: string;
  tier: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

interface InventoryItem {
  templateId: string;
  templateName: string;
  quantity: number;
}

interface CollectResult {
  item?: { name: string; quality: string; rarity: string };
  xpEarned?: number;
  leveledUp?: boolean;
  newLevel?: number;
  items?: { name: string; quantity: number }[];
}

interface TownResource {
  id: string;
  resourceType: string;
  resourceName: string;
  abundance: string;
}

interface WorkshopInfo {
  buildingId: string;
  name: string;
  level: number;
  speedBonus: string;
  qualityBonus: number;
}

// ---------------------------------------------------------------------------
// Rarity colors (shared with inventory)
// ---------------------------------------------------------------------------
const RARITY_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  POOR:       { border: 'border-gray-500',   text: 'text-gray-400',   bg: 'bg-gray-500/10' },
  COMMON:     { border: 'border-parchment-300', text: 'text-parchment-300', bg: 'bg-parchment-300/10' },
  FINE:       { border: 'border-green-500',  text: 'text-green-400',  bg: 'bg-green-500/10' },
  SUPERIOR:   { border: 'border-blue-500',   text: 'text-blue-400',   bg: 'bg-blue-500/10' },
  MASTERWORK: { border: 'border-purple-500', text: 'text-purple-400', bg: 'bg-purple-500/10' },
  LEGENDARY:  { border: 'border-amber-400',  text: 'text-amber-400',  bg: 'bg-amber-400/10' },
};

function getRarityStyle(rarity: string) {
  return RARITY_COLORS[rarity] ?? RARITY_COLORS.COMMON;
}

// ---------------------------------------------------------------------------
// Profession display names
// ---------------------------------------------------------------------------
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
};

function professionLabel(type: string) {
  return PROFESSION_LABELS[type] ?? type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ');
}

// ---------------------------------------------------------------------------
// Tier display
// ---------------------------------------------------------------------------
const TIER_ORDER = ['APPRENTICE', 'JOURNEYMAN', 'CRAFTSMAN', 'EXPERT', 'MASTER', 'GRANDMASTER'];

function tierLabel(tier: string) {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
type Tab = 'recipes' | 'progress' | 'work';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function CraftingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('recipes');
  const [professionFilter, setProfessionFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCraftableOnly, setShowCraftableOnly] = useState(false);
  const [collectResult, setCollectResult] = useState<CollectResult | null>(null);
  const [gatheringResult, setGatheringResult] = useState<GatheringResultData | null>(null);
  const [craftingResult, setCraftingResult] = useState<CraftingResultData | null>(null);
  const [workshopInfo, setWorkshopInfo] = useState<WorkshopInfo | null>(null);

  // Socket event listeners
  useGatheringEvents();
  useCraftingEvents();

  // Fetch professions
  const { data: professions } = useQuery<Profession[]>({
    queryKey: ['professions'],
    queryFn: async () => {
      const res = await api.get('/work/professions');
      return res.data;
    },
  });

  // Fetch inventory (for ingredient checks)
  const { data: character } = useQuery<{ inventory: InventoryItem[]; currentTownId?: string }>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data;
    },
  });

  const inventory = character?.inventory ?? [];

  // Build inventory lookup by template name
  const inventoryByName: Record<string, number> = {};
  for (const item of inventory) {
    const name = item.templateName ?? '';
    inventoryByName[name] = (inventoryByName[name] ?? 0) + item.quantity;
  }

  // -------------------------------------------------------------------------
  // Recipes Tab
  // -------------------------------------------------------------------------
  const { data: recipesResponse, isLoading: recipesLoading } = useQuery<{ recipes: Recipe[] }>({
    queryKey: ['recipes'],
    queryFn: async () => {
      const res = await api.get('/crafting/recipes');
      return res.data;
    },
  });

  const allRecipes = recipesResponse?.recipes ?? [];

  // Apply filters
  const filteredRecipes = allRecipes.filter((r) => {
    if (professionFilter !== 'ALL' && r.professionType !== professionFilter) return false;
    if (tierFilter !== 'ALL' && r.tier !== tierFilter) return false;
    if (searchQuery && !r.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (showCraftableOnly && !r.canCraft) return false;
    return true;
  });

  const uniqueProfessions = [...new Set(allRecipes.map((r) => r.professionType))].sort();
  const uniqueTiers = [...new Set(allRecipes.map((r) => r.tier))].sort(
    (a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b)
  );

  // Crafting status (for backward compat / single craft check)
  const { data: craftingStatus } = useQuery<CraftingStatus>({
    queryKey: ['crafting', 'status'],
    queryFn: async () => {
      const res = await api.get('/crafting/status');
      return res.data;
    },
    refetchInterval: 15000,
  });

  // Crafting queue
  const { data: queueData, isLoading: queueLoading } = useQuery<QueueResponse>({
    queryKey: ['crafting', 'queue'],
    queryFn: async () => {
      const res = await api.get('/crafting/queue');
      return res.data;
    },
    refetchInterval: 10000,
  });

  const isCrafting = (queueData?.total ?? 0) > 0 || (craftingStatus?.crafting ?? false);
  const queueCount = queueData?.total ?? 0;
  const readyCount = queueData?.readyCount ?? 0;

  // Start crafting mutation (single)
  const startCraftMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      const res = await api.post('/crafting/start', { recipeId });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.crafting?.workshop) {
        setWorkshopInfo(data.crafting.workshop);
      }
      queryClient.invalidateQueries({ queryKey: ['crafting', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['crafting', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setActiveTab('progress');
    },
  });

  // Batch craft mutation (queue)
  const batchCraftMutation = useMutation({
    mutationFn: async ({ recipeId, count }: { recipeId: string; count: number }) => {
      const res = await api.post('/crafting/queue', { recipeId, count });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.queued?.workshop) {
        setWorkshopInfo(data.queued.workshop);
      }
      queryClient.invalidateQueries({ queryKey: ['crafting', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['crafting', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setActiveTab('progress');
    },
  });

  // Collect crafting mutation
  const collectCraftMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/crafting/collect');
      return res.data;
    },
    onSuccess: (data) => {
      // Show CraftingResults modal if full collect data present
      if (data.collected && data.item && data.qualityRoll) {
        setCraftingResult(data as CraftingResultData);
      } else {
        setCollectResult(data);
      }
      queryClient.invalidateQueries({ queryKey: ['crafting', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['crafting', 'queue'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['professions'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  // -------------------------------------------------------------------------
  // Work/Gather Tab
  // -------------------------------------------------------------------------
  const { data: workStatus, isLoading: workStatusLoading } = useQuery<WorkStatus>({
    queryKey: ['work', 'status'],
    queryFn: async () => {
      const res = await api.get('/work/status');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const { data: townResources } = useQuery<TownResource[]>({
    queryKey: ['town', 'resources'],
    queryFn: async () => {
      try {
        const charRes = await api.get('/characters/me');
        const townId = charRes.data.currentTownId;
        if (!townId) return [];
        const res = await api.get(`/towns/${townId}/resources`);
        return res.data;
      } catch {
        return [];
      }
    },
  });

  const isWorking = workStatus?.working ?? false;

  const [selectedWorkProfession, setSelectedWorkProfession] = useState<string>('');
  const [selectedResource, setSelectedResource] = useState<string>('');

  const startWorkMutation = useMutation({
    mutationFn: async ({ professionType, resourceId }: { professionType: string; resourceId: string }) => {
      const res = await api.post('/work/start', { professionType, resourceId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work', 'status'] });
    },
  });

  const collectWorkMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/work/collect');
      return res.data;
    },
    onSuccess: (data) => {
      if (data.items && Array.isArray(data.items) && data.items.length > 0 && data.items[0].rarity) {
        setGatheringResult(data as GatheringResultData);
      } else {
        setCollectResult(data);
      }
      queryClient.invalidateQueries({ queryKey: ['work', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['professions'] });
      queryClient.invalidateQueries({ queryKey: ['tools', 'equipped'] });
      queryClient.invalidateQueries({ queryKey: ['town', 'resources'] });
    },
  });

  const cancelWorkMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/work/cancel');
      return res.data;
    },
    onSuccess: (data) => {
      if (data.items && Array.isArray(data.items) && data.items.length > 0 && data.items[0].rarity) {
        setGatheringResult(data as GatheringResultData);
      } else if (data.items?.length > 0 || data.item) {
        setCollectResult(data);
      }
      queryClient.invalidateQueries({ queryKey: ['work', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['tools', 'equipped'] });
    },
  });

  const { data: equippedTool } = useQuery<EquippedTool | null>({
    queryKey: ['tools', 'equipped', selectedWorkProfession],
    queryFn: async () => {
      if (!selectedWorkProfession) return null;
      try {
        const res = await api.get(`/tools/equipped?professionType=${selectedWorkProfession}`);
        return res.data ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!selectedWorkProfession,
  });

  function ownedCount(name: string): number {
    return inventoryByName[name] ?? 0;
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-dark-500 pt-12">
      {/* Header */}
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display text-primary-400">Workshop</h1>
              <p className="text-parchment-500 text-sm mt-1">Craft, gather, and refine</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/inventory')}
                className="px-5 py-2 border border-primary-400/60 text-primary-400 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Inventory
              </button>
              <button
                onClick={() => navigate('/town')}
                className="px-5 py-2 border border-parchment-500/40 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Back to Town
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar -- Professions */}
          <aside className="lg:col-span-1">
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-5 sticky top-8">
              <h3 className="font-display text-primary-400 text-sm mb-3">Your Professions</h3>
              {!professions || professions.length === 0 ? (
                <p className="text-parchment-500 text-xs">No professions yet. Start gathering to learn one.</p>
              ) : (
                <div className="space-y-3">
                  {professions.map((prof) => (
                    <div key={prof.professionType}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-parchment-200 text-xs font-semibold">
                          {professionLabel(prof.professionType)}
                        </span>
                        <span className="text-parchment-500 text-[10px]">
                          Lv.{prof.level} ({prof.tier})
                        </span>
                      </div>
                      <div className="h-1.5 bg-dark-500 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-400/70 rounded-full transition-all"
                          style={{
                            width: prof.xpToNextLevel > 0
                              ? `${(prof.xp / prof.xpToNextLevel) * 100}%`
                              : '100%',
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-parchment-500 mt-0.5">
                        {prof.xp}/{prof.xpToNextLevel} XP
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Main content */}
          <main className="lg:col-span-3">
            {/* Tabs */}
            <div className="flex border-b border-dark-50 mb-6">
              {([
                { key: 'recipes' as Tab, label: 'Recipes', icon: Hammer },
                { key: 'progress' as Tab, label: 'Queue', icon: Clock },
                { key: 'work' as Tab, label: 'Work / Gather', icon: Pickaxe },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => { setActiveTab(key); setCollectResult(null); }}
                  className={`flex items-center gap-2 px-5 py-3 font-display text-sm border-b-2 transition-colors
                    ${activeTab === key
                      ? 'border-primary-400 text-primary-400'
                      : 'border-transparent text-parchment-500 hover:text-parchment-300'}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {key === 'progress' && queueCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-display bg-primary-400/20 text-primary-400 rounded-full">
                      {readyCount > 0 ? `${readyCount} ready` : queueCount}
                    </span>
                  )}
                  {key === 'work' && isWorking && (
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {/* Collect Result Notification (fallback for simple results) */}
            {collectResult && (
              <div className="mb-6 p-4 bg-dark-300 border border-primary-400/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                  <div>
                    {collectResult.item && (
                      <p className={`font-display text-lg ${getRarityStyle(collectResult.item.quality || collectResult.item.rarity).text}`}>
                        {collectResult.item.name}
                        <span className="text-xs ml-2 opacity-80">
                          ({collectResult.item.quality || collectResult.item.rarity})
                        </span>
                      </p>
                    )}
                    {collectResult.items && collectResult.items.map((it, i) => (
                      <p key={i} className="text-parchment-200 text-sm">
                        {it.name} x{it.quantity}
                      </p>
                    ))}
                    {collectResult.xpEarned && (
                      <p className="text-parchment-300 text-xs mt-1">+{collectResult.xpEarned} XP</p>
                    )}
                    {collectResult.leveledUp && (
                      <p className="text-primary-400 text-xs mt-1 font-display">
                        Level Up! Now level {collectResult.newLevel}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setCollectResult(null)}
                    className="ml-auto text-parchment-500 hover:text-parchment-300 text-xs"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Workshop indicator (shown on recipes and queue tabs) */}
            {(activeTab === 'recipes' || activeTab === 'progress') && workshopInfo && (
              <WorkshopIndicator workshop={workshopInfo} />
            )}

            {/* Tab content */}
            {activeTab === 'recipes' && (
              <RecipesTab
                recipes={filteredRecipes}
                allRecipes={allRecipes}
                uniqueProfessions={uniqueProfessions}
                uniqueTiers={uniqueTiers}
                professionFilter={professionFilter}
                setProfessionFilter={setProfessionFilter}
                tierFilter={tierFilter}
                setTierFilter={setTierFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                showCraftableOnly={showCraftableOnly}
                setShowCraftableOnly={setShowCraftableOnly}
                isLoading={recipesLoading}
                isCrafting={isCrafting}
                ownedCount={ownedCount}
                onCraft={(recipeId) => startCraftMutation.mutate(recipeId)}
                onBatchCraft={(recipeId, count) => batchCraftMutation.mutate({ recipeId, count })}
                isCraftStarting={startCraftMutation.isPending || batchCraftMutation.isPending}
                craftError={startCraftMutation.error?.message || batchCraftMutation.error?.message}
              />
            )}

            {activeTab === 'progress' && (
              <QueueTab
                queue={queueData?.queue ?? []}
                isLoading={queueLoading}
                onCollect={() => collectCraftMutation.mutate()}
                isCollecting={collectCraftMutation.isPending}
              />
            )}

            {activeTab === 'work' && (
              <WorkTab
                workStatus={workStatus ?? null}
                isLoading={workStatusLoading}
                townResources={townResources ?? []}
                professions={professions ?? []}
                selectedProfession={selectedWorkProfession}
                setSelectedProfession={setSelectedWorkProfession}
                selectedResource={selectedResource}
                setSelectedResource={setSelectedResource}
                onStartWork={() =>
                  startWorkMutation.mutate({
                    professionType: selectedWorkProfession,
                    resourceId: selectedResource,
                  })
                }
                isStarting={startWorkMutation.isPending}
                onCollect={() => collectWorkMutation.mutate()}
                isCollecting={collectWorkMutation.isPending}
                onCancel={() => cancelWorkMutation.mutate()}
                isCancelling={cancelWorkMutation.isPending}
                startError={startWorkMutation.error?.message}
                equippedTool={equippedTool ?? null}
              />
            )}
          </main>
        </div>
      </div>

      {/* Gathering Results Modal */}
      {gatheringResult && (
        <GatheringResults
          data={gatheringResult}
          onDismiss={() => setGatheringResult(null)}
        />
      )}

      {/* Crafting Results Modal */}
      {craftingResult && (
        <CraftingResults
          data={craftingResult}
          onDismiss={() => setCraftingResult(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workshop Indicator
// ---------------------------------------------------------------------------
function WorkshopIndicator({ workshop }: { workshop: WorkshopInfo }) {
  return (
    <div className="mb-6 p-3 bg-dark-300 border border-primary-400/30 rounded-lg flex items-center gap-3">
      <Building2 className="w-5 h-5 text-primary-400 flex-shrink-0" />
      <div>
        <p className="text-sm text-parchment-200 font-display">
          Crafting in Level {workshop.level} {workshop.name}
        </p>
        <p className="text-[10px] text-parchment-500">
          +{workshop.speedBonus} speed, +{workshop.qualityBonus} quality bonus
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recipes Tab
// ---------------------------------------------------------------------------
interface RecipesTabProps {
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

function RecipesTab({
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
}: RecipesTabProps) {
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
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    );
  }

  const craftableCount = allRecipes.filter((r) => r.canCraft).length;

  return (
    <div>
      {/* Search bar */}
      <div className="mb-4 relative">
        <Search className="w-4 h-4 text-parchment-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-dark-300 border border-dark-50 rounded text-sm text-parchment-200 placeholder:text-parchment-500/50 focus:border-primary-400 focus:outline-none"
        />
      </div>

      {/* Filters row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Profession filter */}
        <div className="relative">
          <select
            value={professionFilter}
            onChange={(e) => setProfessionFilter(e.target.value)}
            className="appearance-none bg-dark-300 border border-dark-50 rounded px-3 py-1.5 text-sm text-parchment-200 pr-8 focus:border-primary-400 focus:outline-none"
          >
            <option value="ALL">All Professions</option>
            {uniqueProfessions.map((p) => (
              <option key={p} value={p}>{professionLabel(p)}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-parchment-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Tier filter */}
        <div className="relative">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="appearance-none bg-dark-300 border border-dark-50 rounded px-3 py-1.5 text-sm text-parchment-200 pr-8 focus:border-primary-400 focus:outline-none"
          >
            <option value="ALL">All Tiers</option>
            {uniqueTiers.map((t) => (
              <option key={t} value={t}>{tierLabel(t)}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-parchment-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* What Can I Make toggle */}
        <button
          onClick={() => setShowCraftableOnly(!showCraftableOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-display rounded border transition-colors
            ${showCraftableOnly
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-dark-300 text-parchment-300 border-dark-50 hover:border-primary-400/40'}`}
        >
          <Filter className="w-3 h-3" />
          What Can I Make? ({craftableCount})
        </button>
      </div>

      {craftError && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {craftError}
        </div>
      )}

      {recipes.length === 0 ? (
        <div className="bg-dark-300 border border-dark-50 rounded-lg p-8 text-center">
          <Hammer className="w-10 h-10 text-parchment-500/30 mx-auto mb-3" />
          <p className="text-parchment-500 text-sm">
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
            const canBatch = recipe.hasRequiredProfession && batchMissing.length === 0 && !isCrafting;
            const isGreyedOut = !recipe.hasRequiredProfession;

            return (
              <div
                key={recipe.id}
                className={`bg-dark-300 border border-dark-50 rounded-lg p-4 transition-all hover:border-dark-50/80
                  ${isGreyedOut ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-display text-primary-400">{recipe.name}</h4>
                    <p className="text-[10px] text-parchment-500">
                      {professionLabel(recipe.professionType)} - {tierLabel(recipe.tier)} (Lv.{recipe.levelRequired})
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-parchment-500">
                    <p className="flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {recipe.craftTime}m
                    </p>
                    <p>+{recipe.xpReward} XP</p>
                  </div>
                </div>

                {/* Ingredients */}
                <div className="mb-3">
                  <p className="text-[10px] text-parchment-500 uppercase tracking-wider mb-1">Ingredients</p>
                  <div className="space-y-0.5">
                    {recipe.ingredients.map((ing, i) => {
                      const have = ownedCount(ing.itemName);
                      const needTotal = ing.quantity * batchCount;
                      const enough = have >= needTotal;
                      return (
                        <div
                          key={i}
                          className={`text-xs flex justify-between ${enough ? 'text-green-400' : 'text-red-400'}`}
                        >
                          <span>
                            {ing.itemName} x{batchCount > 1 ? needTotal : ing.quantity}
                          </span>
                          <span className="text-parchment-500">
                            (have {have})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Missing ingredients warning (from API) */}
                {recipe.missingIngredients.length > 0 && batchCount === 1 && (
                  <div className="mb-3 text-[10px] text-red-400">
                    {recipe.missingIngredients.map((mi, i) => (
                      <p key={i}>Need {mi.needed - mi.have} more {mi.itemName}</p>
                    ))}
                  </div>
                )}

                {/* Batch missing warning */}
                {batchMissing.length > 0 && batchCount > 1 && (
                  <div className="mb-3 text-[10px] text-red-400">
                    {batchMissing.map((bm, i) => (
                      <p key={i}>Need {bm.need - bm.have} more {bm.name}</p>
                    ))}
                  </div>
                )}

                {/* Result */}
                <div className="mb-3">
                  <p className="text-[10px] text-parchment-500 uppercase tracking-wider mb-1">Result</p>
                  <p className="text-sm text-parchment-200">
                    <Package className="w-3 h-3 inline mr-1" />
                    {recipe.result.itemName}{batchCount > 1 ? ` x${batchCount}` : ''}
                  </p>
                </div>

                {/* Quality formula hint */}
                <p className="text-[10px] text-parchment-500 mb-3">
                  Quality: d20 + Lv/{5} + workshop bonus
                </p>

                {/* Batch count + Craft button */}
                <div className="flex gap-2">
                  {/* Batch counter */}
                  <div className="flex items-center border border-dark-50 rounded bg-dark-400">
                    <button
                      onClick={() => setBatchCount(recipe.id, batchCount - 1)}
                      disabled={batchCount <= 1}
                      className="px-2 py-2 text-parchment-500 hover:text-parchment-200 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 text-sm text-parchment-200 font-display min-w-[24px] text-center">
                      {batchCount}
                    </span>
                    <button
                      onClick={() => setBatchCount(recipe.id, batchCount + 1)}
                      disabled={batchCount >= 10}
                      className="px-2 py-2 text-parchment-500 hover:text-parchment-200 disabled:opacity-30 disabled:cursor-not-allowed"
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
                    disabled={!(batchCount > 1 ? canBatch : canCraftSingle) || isCraftStarting}
                    className="flex-1 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded
                      hover:bg-primary-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isCraftStarting
                      ? 'Starting...'
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
                  <p className="text-[10px] text-parchment-500 mt-1.5 text-right">
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

// ---------------------------------------------------------------------------
// Queue Tab (replaces old ProgressTab)
// ---------------------------------------------------------------------------
interface QueueTabProps {
  queue: QueueItem[];
  isLoading: boolean;
  onCollect: () => void;
  isCollecting: boolean;
}

function QueueTab({ queue, isLoading, onCollect, isCollecting }: QueueTabProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (queue.length === 0) return;
    const hasActive = queue.some((q) => !q.ready);
    if (!hasActive) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [queue]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-8 text-center">
        <Clock className="w-10 h-10 text-parchment-500/30 mx-auto mb-3" />
        <p className="text-parchment-500 text-sm">No active crafting.</p>
        <p className="text-parchment-500/60 text-xs mt-1">Start a recipe from the Recipes tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {queue.map((item) => {
        const completesAt = new Date(item.completesAt).getTime();
        const startedAt = new Date(item.startedAt).getTime();
        const totalDuration = completesAt - startedAt;
        const elapsed = now - startedAt;
        const isReady = item.ready || completesAt <= now;
        const progress = isReady ? 100 : Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        const remaining = isReady ? 0 : Math.max(0, completesAt - now);
        const remainingMin = Math.floor(remaining / 60000);
        const remainingSec = Math.ceil((remaining % 60000) / 1000);
        const isFirst = item.index === 1 || queue.indexOf(item) === 0;

        return (
          <div
            key={item.id}
            className={`bg-dark-300 border rounded-lg p-4 ${
              isReady ? 'border-green-500/50' : 'border-dark-50'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              {isReady ? (
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              ) : (
                <Loader2 className="w-5 h-5 text-primary-400 animate-spin flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-display text-parchment-200 text-sm truncate">
                    {item.recipeName}
                  </h4>
                  <span className="text-[10px] text-parchment-500 flex-shrink-0">
                    #{item.index}
                  </span>
                </div>
                <p className="text-[10px] text-parchment-500">
                  {isReady ? 'Ready to collect!' : `${remainingMin}m ${remainingSec}s remaining`}
                </p>
              </div>
              {isReady && isFirst && (
                <button
                  onClick={onCollect}
                  disabled={isCollecting}
                  className="px-4 py-1.5 bg-green-600 text-white font-display text-xs rounded
                    hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {isCollecting ? 'Collecting...' : 'Collect'}
                </button>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-dark-500 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  isReady ? 'bg-green-500' : 'bg-primary-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Abundance indicator colors
// ---------------------------------------------------------------------------
const ABUNDANCE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  ABUNDANT:  { text: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30' },
  HIGH:      { text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
  MODERATE:  { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  NORMAL:    { text: 'text-parchment-400', bg: '', border: '' },
  LOW:       { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  SCARCE:    { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
  DEPLETED:  { text: 'text-red-500',    bg: 'bg-red-500/15',    border: 'border-red-500/30' },
};

function abundanceStyle(abundance: string) {
  const key = abundance?.toUpperCase() ?? 'NORMAL';
  return ABUNDANCE_COLORS[key] ?? ABUNDANCE_COLORS.NORMAL;
}

// ---------------------------------------------------------------------------
// Work / Gather Tab
// ---------------------------------------------------------------------------
interface WorkTabProps {
  workStatus: WorkStatus | null;
  isLoading: boolean;
  townResources: TownResource[];
  professions: Profession[];
  selectedProfession: string;
  setSelectedProfession: (v: string) => void;
  selectedResource: string;
  setSelectedResource: (v: string) => void;
  onStartWork: () => void;
  isStarting: boolean;
  onCollect: () => void;
  isCollecting: boolean;
  onCancel: () => void;
  isCancelling: boolean;
  startError?: string;
  equippedTool: EquippedTool | null;
}

function WorkTab({
  workStatus,
  isLoading,
  townResources,
  professions,
  selectedProfession,
  setSelectedProfession,
  selectedResource,
  setSelectedResource,
  onStartWork,
  isStarting,
  onCollect,
  isCollecting,
  onCancel,
  isCancelling,
  startError,
  equippedTool,
}: WorkTabProps) {
  const [now, setNow] = useState(Date.now());
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workStatus?.working || workStatus.ready) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [workStatus?.working, workStatus?.ready]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    );
  }

  // If currently working, show progress
  if (workStatus?.working) {
    const completesAt = workStatus.completesAt ? new Date(workStatus.completesAt).getTime() : 0;
    const startedAt = workStatus.startedAt ? new Date(workStatus.startedAt).getTime() : 0;
    const totalDuration = completesAt - startedAt;
    const elapsed = now - startedAt;
    const progress = workStatus.ready ? 100 : Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    const remaining = workStatus.ready ? 0 : Math.max(0, completesAt - now);
    const remainingMinutes = Math.ceil(remaining / 60000);
    const remainingSeconds = Math.ceil(remaining / 1000) % 60;

    return (
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          {workStatus.ready ? (
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          ) : (
            <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
          )}
          <div className="flex-1">
            <h3 className="font-display text-lg text-parchment-200">
              Gathering {workStatus.resource ?? '...'}
            </h3>
            <p className="text-xs text-parchment-500">
              {workStatus.profession ? professionLabel(workStatus.profession) : ''}
              {workStatus.ready ? ' - Ready to collect!' : ` - ${remainingMinutes}m ${remainingSeconds}s remaining`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-dark-500 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              workStatus.ready ? 'bg-green-500' : 'bg-green-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex gap-3">
          {workStatus.ready ? (
            <button
              onClick={onCollect}
              disabled={isCollecting}
              className="flex-1 py-3 bg-green-600 text-white font-display text-base rounded
                hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCollecting ? 'Collecting...' : 'Collect Resources'}
            </button>
          ) : (
            <>
              {showCancelConfirm ? (
                <div className="flex-1 flex gap-2">
                  <button
                    onClick={() => { onCancel(); setShowCancelConfirm(false); }}
                    disabled={isCancelling}
                    className="flex-1 py-2.5 bg-red-700 text-white font-display text-sm rounded
                      hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Cancel
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-4 py-2.5 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-400 transition-colors"
                  >
                    Keep Working
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex-1 py-2.5 border border-red-500/40 text-red-400 font-display text-sm rounded
                    hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Gathering
                </button>
              )}
            </>
          )}
        </div>

        {showCancelConfirm && !workStatus.ready && (
          <p className="text-[10px] text-parchment-500 mt-2 text-center">
            Cancelling early may yield partial resources or none at all.
          </p>
        )}
      </div>
    );
  }

  // Not working -- show resource selection
  const gatheringProfessionTypes = ['FARMER', 'RANCHER', 'FISHERMAN', 'LUMBERJACK', 'MINER', 'HERBALIST', 'HUNTER'];
  const availableProfessions = gatheringProfessionTypes.filter(
    (pt) => professions.some((p) => p.professionType === pt) || true
  );

  return (
    <div className="space-y-6">
      {startError && (
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {startError}
        </div>
      )}

      {/* Profession selector */}
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
        <h3 className="font-display text-primary-400 text-sm mb-3">Select Profession</h3>
        <div className="flex flex-wrap gap-2">
          {availableProfessions.map((pt) => {
            const prof = professions.find((p) => p.professionType === pt);
            const isSelected = selectedProfession === pt;
            return (
              <button
                key={pt}
                onClick={() => setSelectedProfession(pt)}
                className={`px-3 py-1.5 text-xs font-display rounded border transition-colors
                  ${isSelected
                    ? 'bg-primary-400 text-dark-500 border-primary-400'
                    : 'bg-dark-400 text-parchment-300 border-dark-50 hover:border-primary-400/40'}`}
              >
                {professionLabel(pt)}
                {prof && <span className="ml-1 opacity-70">Lv.{prof.level}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tool slot */}
      {selectedProfession && (
        <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
          <h3 className="font-display text-primary-400 text-sm mb-3">Equipped Tool</h3>
          <ToolSlot
            tool={equippedTool}
            onClick={() => setShowToolSelector(true)}
          />
        </div>
      )}

      {/* Tool selector modal */}
      {showToolSelector && selectedProfession && (
        <ToolSelector
          professionType={selectedProfession}
          currentTool={equippedTool}
          onClose={() => setShowToolSelector(false)}
          onEquipped={() => {
            queryClient.invalidateQueries({ queryKey: ['tools', 'equipped', selectedProfession] });
          }}
        />
      )}

      {/* Available resources */}
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
        <h3 className="font-display text-primary-400 text-sm mb-3">Available Resources</h3>
        {townResources.length === 0 ? (
          <p className="text-parchment-500 text-xs">No resources available in this town.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {townResources.map((tr) => {
              const isSelected = selectedResource === tr.id;
              const aStyle = abundanceStyle(tr.abundance);
              return (
                <button
                  key={tr.id}
                  onClick={() => setSelectedResource(tr.id)}
                  className={`p-3 text-left rounded border transition-all
                    ${isSelected
                      ? 'border-primary-400 bg-primary-400/10'
                      : `border-dark-50 bg-dark-400/50 hover:border-dark-50/80 ${aStyle.bg}`}`}
                >
                  <p className="text-sm text-parchment-200">{tr.resourceName}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-parchment-500 capitalize">{tr.resourceType.toLowerCase()}</span>
                    <span className={`text-[10px] capitalize font-display ${aStyle.text}`}>
                      {tr.abundance?.toLowerCase() ?? 'normal'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Start work button */}
      <button
        onClick={onStartWork}
        disabled={!selectedProfession || !selectedResource || isStarting}
        className="w-full py-3 bg-forest text-white font-display text-base rounded
          hover:bg-forest-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isStarting ? 'Starting...' : 'Start Working'}
      </button>
    </div>
  );
}
