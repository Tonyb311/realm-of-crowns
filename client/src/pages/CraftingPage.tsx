import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Hammer,
  Clock,
  Pickaxe,
  Sparkles,
  Building2,
} from 'lucide-react';
import api from '../services/api';
import type { EquippedTool } from '../components/gathering/ToolSlot';
import GatheringResults from '../components/gathering/GatheringResults';
import type { GatheringResultData } from '../components/gathering/GatheringResults';
import CraftingResults from '../components/crafting/CraftingResults';
import type { CraftingResultData } from '../components/crafting/CraftingResults';
import { useGatheringEvents } from '../hooks/useGatheringEvents';
import { useCraftingEvents } from '../hooks/useCraftingEvents';
import RecipeList, { type Recipe, professionLabel, TIER_ORDER } from '../components/crafting/RecipeList';
import CraftingQueue, { type QueueItem } from '../components/crafting/CraftingQueue';
import WorkTab, { type WorkStatus, type TownResource, type Profession } from '../components/crafting/WorkTab';
import { getRarityStyle } from '../constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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

interface WorkshopInfo {
  buildingId: string;
  name: string;
  level: number;
  speedBonus: string;
  qualityBonus: number;
}

// ---------------------------------------------------------------------------
// Workshop Indicator
// ---------------------------------------------------------------------------
function WorkshopIndicator({ workshop }: { workshop: WorkshopInfo }) {
  return (
    <div className="mb-6 p-3 bg-realm-bg-700 border border-realm-gold-400/30 rounded-lg flex items-center gap-3">
      <Building2 className="w-5 h-5 text-realm-gold-400 flex-shrink-0" />
      <div>
        <p className="text-sm text-realm-text-primary font-display">
          Crafting in Level {workshop.level} {workshop.name}
        </p>
        <p className="text-[10px] text-realm-text-muted">
          +{workshop.speedBonus} speed, +{workshop.qualityBonus} quality bonus
        </p>
      </div>
    </div>
  );
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
      return res.data.professions ?? res.data;
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
    refetchInterval: 30000,
  });

  // Crafting queue
  const { data: queueData, isLoading: queueLoading } = useQuery<QueueResponse>({
    queryKey: ['crafting', 'queue'],
    queryFn: async () => {
      const res = await api.get('/crafting/queue');
      return res.data;
    },
    refetchInterval: 30000,
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
    refetchInterval: 30000,
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
    <div className="pt-12">
      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display text-realm-gold-400">Workshop</h1>
              <p className="text-realm-text-muted text-sm mt-1">Craft, gather, and refine</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/inventory')}
                className="px-5 py-2 border border-realm-gold-400/60 text-realm-gold-400 font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
              >
                Inventory
              </button>
              <button
                onClick={() => navigate('/town')}
                className="px-5 py-2 border border-realm-text-muted/40 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
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
            <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5 sticky top-8">
              <h3 className="font-display text-realm-gold-400 text-sm mb-3">Your Professions</h3>
              {!professions || professions.length === 0 ? (
                <p className="text-realm-text-muted text-xs">No professions yet. Start gathering to learn one.</p>
              ) : (
                <div className="space-y-3">
                  {professions.map((prof) => (
                    <div key={prof.professionType}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-realm-text-primary text-xs font-semibold">
                          {professionLabel(prof.professionType)}
                        </span>
                        <span className="text-realm-text-muted text-[10px]">
                          Lv.{prof.level} ({prof.tier})
                        </span>
                      </div>
                      <div className="h-1.5 bg-realm-bg-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-realm-gold-400/70 rounded-full transition-all"
                          style={{
                            width: prof.xpToNextLevel > 0
                              ? `${(prof.xp / prof.xpToNextLevel) * 100}%`
                              : '100%',
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-realm-text-muted mt-0.5">
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
            <div className="flex border-b border-realm-border mb-6">
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
                      ? 'border-realm-gold-400 text-realm-gold-400'
                      : 'border-transparent text-realm-text-muted hover:text-realm-text-secondary'}`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {key === 'progress' && queueCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-display bg-realm-gold-400/20 text-realm-gold-400 rounded-full">
                      {readyCount > 0 ? `${readyCount} ready` : queueCount}
                    </span>
                  )}
                  {key === 'work' && isWorking && (
                    <span className="w-2 h-2 bg-realm-success rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {/* Collect Result Notification (fallback for simple results) */}
            {collectResult && (
              <div className="mb-6 p-4 bg-realm-bg-700 border border-realm-gold-400/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-realm-gold-400 flex-shrink-0 mt-0.5" />
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
                      <p key={i} className="text-realm-text-primary text-sm">
                        {it.name} x{it.quantity}
                      </p>
                    ))}
                    {collectResult.xpEarned && (
                      <p className="text-realm-text-secondary text-xs mt-1">+{collectResult.xpEarned} XP</p>
                    )}
                    {collectResult.leveledUp && (
                      <p className="text-realm-gold-400 text-xs mt-1 font-display">
                        Level Up! Now level {collectResult.newLevel}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setCollectResult(null)}
                    className="ml-auto text-realm-text-muted hover:text-realm-text-secondary text-xs"
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
              <RecipeList
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
              <CraftingQueue
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
