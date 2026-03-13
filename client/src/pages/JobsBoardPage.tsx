import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, User, Coins, Package, Award, ScrollText, Shield, XCircle, Hammer, ChevronDown, Search, Truck, MapPin, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router';
import api from '../services/api';
import { RealmPanel, RealmButton, RealmBadge, RealmInput, PageHeader } from '../components/ui/realm-index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface JobListing {
  id: string;
  category: string;
  jobType?: string;
  jobLabel?: string;
  title: string;
  pay: number;
  assetId?: string;
  assetName?: string;
  assetType?: string;
  assetTier?: number;
  professionType?: string;
  ownerName: string;
  ownerId: string;
  autoPosted: boolean;
  createdAt: string;
  // Workshop fields
  recipeName?: string;
  professionRequired?: string;
  tierRequired?: string;
  outputItemName?: string;
  materialsSupplied?: boolean;
  quantity?: number;
  description?: string;
  // Delivery fields
  destinationTownId?: string;
  destinationTownName?: string;
  deliveryItems?: Array<{ itemTemplateId: string; itemName: string; quantity: number }>;
  expiresAt?: string;
  freeAction?: boolean;
}

interface MyJob {
  id: string;
  category: string;
  jobType?: string;
  jobLabel?: string;
  title: string;
  pay: number;
  assetId?: string;
  assetName?: string;
  status: string;
  autoPosted: boolean;
  createdAt: string;
  materialsEscrow?: Array<{ itemTemplateId: string; itemName: string; quantity: number }>;
  // Delivery fields
  destinationTownId?: string;
  destinationTownName?: string;
  deliveryItems?: Array<{ itemTemplateId: string; itemName: string; quantity: number }>;
  expiresAt?: string;
  workerName?: string;
}

interface PickupJob {
  id: string;
  title: string;
  destinationTownId: string;
  destinationTownName?: string;
  deliveryItems: Array<{ itemTemplateId: string; itemName: string; quantity: number }>;
  workerName?: string;
  deliveredAt: string;
  canPickUp: boolean;
}

interface TravelRoute {
  id: string;
  name: string;
  destination: { id: string; name: string };
}

interface JobsResponse {
  jobs: JobListing[];
}

interface MyJobsResponse {
  jobs: MyJob[];
}

interface AcceptResult {
  success: boolean;
  job: { id: string; jobType?: string; assetName?: string; category?: string; recipeName?: string };
  reward: {
    gold: number;
    items: { name: string; quantity: number } | null;
    xp: number;
    professionMatch?: boolean;
    qualities?: string[];
    depositMessage?: string;
  };
}

interface ActionStatusResponse {
  gameDay: number;
  actionUsed: boolean;
  actionType: string | null;
}

interface RecipeInput {
  itemTemplateId: string;
  itemName: string;
  quantity: number;
}

interface RecipeListing {
  id: string;
  name: string;
  professionType: string;
  tier: string;
  inputs: RecipeInput[];
  outputItemTemplateId: string;
  outputItemName: string;
  craftTime: number;
  xpReward: number;
}

interface RecipesResponse {
  recipes: RecipeListing[];
}

interface InventoryItem {
  id: string;
  templateId: string;
  templateName: string;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Tier helpers
// ---------------------------------------------------------------------------
const TIER_COLORS: Record<number, string> = {
  1: 'text-realm-bronze-400 border-realm-bronze-400/50 bg-realm-bronze-400/10',
  2: 'text-realm-gold-400 border-realm-gold-500/50 bg-realm-gold-500/10',
  3: 'text-realm-teal-300 border-realm-teal-300/50 bg-realm-teal-300/10',
};

const PROFESSION_TIER_COLORS: Record<string, string> = {
  APPRENTICE: 'text-realm-bronze-400 border-realm-bronze-400/50 bg-realm-bronze-400/10',
  JOURNEYMAN: 'text-realm-gold-400 border-realm-gold-500/50 bg-realm-gold-500/10',
  EXPERT: 'text-realm-teal-300 border-realm-teal-300/50 bg-realm-teal-300/10',
  MASTER: 'text-realm-purple-300 border-realm-purple-300/50 bg-realm-purple-300/10',
  GRANDMASTER: 'text-red-400 border-red-400/50 bg-red-400/10',
};

function TierBadge({ tier }: { tier: number }) {
  const colorClass = TIER_COLORS[tier] ?? 'text-realm-text-muted border-realm-border';
  return (
    <span className={`text-[10px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${colorClass}`}>
      T{tier}
    </span>
  );
}

function ProfessionTierBadge({ tier }: { tier: string }) {
  const colorClass = PROFESSION_TIER_COLORS[tier] ?? 'text-realm-text-muted border-realm-border';
  return (
    <span className={`text-[10px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${colorClass}`}>
      {tier}
    </span>
  );
}

const CATEGORY_BADGE: Record<string, { label: string; color: string }> = {
  ASSET: { label: 'Asset', color: 'bg-realm-gold-500/15 text-realm-gold-400 border-realm-gold-500/30' },
  WORKSHOP: { label: 'Workshop', color: 'bg-realm-teal-300/15 text-realm-teal-300 border-realm-teal-300/30' },
  DELIVERY: { label: 'Delivery', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
};

function CategoryBadge({ category }: { category: string }) {
  const cfg = CATEGORY_BADGE[category] ?? { label: category, color: 'bg-realm-bg-600 text-realm-text-muted border-realm-bg-500' };
  return (
    <span className={`text-[10px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'text-realm-success',
  IN_PROGRESS: 'text-amber-400',
  DELIVERED: 'text-realm-teal-300',
  COMPLETED: 'text-realm-text-muted',
  CANCELLED: 'text-realm-danger',
  EXPIRED: 'text-realm-warning',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function JobsBoardPage() {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<AcceptResult | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'post-workshop' | 'post-delivery' | 'mine'>('browse');

  // Workshop posting state
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeListing | null>(null);
  const [workshopWage, setWorkshopWage] = useState(10);
  const [workshopQuantity, setWorkshopQuantity] = useState(1);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [expandedProfession, setExpandedProfession] = useState<string | null>(null);

  // Delivery posting state
  const [deliveryDestination, setDeliveryDestination] = useState<string>('');
  const [deliveryWage, setDeliveryWage] = useState(10);
  const [deliveryDeadline, setDeliveryDeadline] = useState(3);
  const [deliveryItems, setDeliveryItems] = useState<Array<{ itemName: string; quantity: number }>>([{ itemName: '', quantity: 1 }]);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  // Fetch character for current town
  const { data: character } = useQuery<{
    id: string;
    name: string;
    gold: number;
    currentTownId: string | null;
  }>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  const townId = character?.currentTownId;

  // Fetch town name
  const { data: town } = useQuery<{ id: string; name: string }>({
    queryKey: ['town', townId],
    queryFn: async () => {
      const res = await api.get(`/towns/${townId}`);
      return res.data.town ?? res.data;
    },
    enabled: !!townId,
  });

  // Fetch open jobs for this town
  const {
    data: jobsData,
    isLoading,
    error,
  } = useQuery<JobsResponse>({
    queryKey: ['jobs', 'town', townId],
    queryFn: async () => (await api.get(`/jobs/town/${townId}`)).data,
    enabled: !!townId,
  });

  // Fetch my jobs
  const { data: myJobsData, isLoading: myJobsLoading } = useQuery<MyJobsResponse>({
    queryKey: ['jobs', 'mine'],
    queryFn: async () => (await api.get('/jobs/mine')).data,
    enabled: activeTab === 'mine',
  });

  // Check daily action status
  const { data: actionStatus } = useQuery<ActionStatusResponse>({
    queryKey: ['game', 'action-status'],
    queryFn: async () => (await api.get('/game/action-status')).data,
    enabled: !!townId,
    refetchInterval: 60_000,
  });

  // Fetch recipe catalog (for workshop posting)
  const { data: recipesData } = useQuery<RecipesResponse>({
    queryKey: ['jobs', 'recipes'],
    queryFn: async () => (await api.get('/jobs/recipes')).data,
    enabled: activeTab === 'post-workshop',
  });

  // Fetch inventory (for material check when posting)
  const { data: inventoryData } = useQuery<{ items: InventoryItem[] }>({
    queryKey: ['inventory', 'mine'],
    queryFn: async () => (await api.get('/inventory')).data,
    enabled: (activeTab === 'post-workshop' && !!selectedRecipe) || activeTab === 'post-delivery',
  });

  // Fetch travel routes (for delivery destination selector)
  const { data: routesData } = useQuery<{ routes: TravelRoute[] }>({
    queryKey: ['travel', 'routes'],
    queryFn: async () => (await api.get('/travel/routes')).data,
    enabled: activeTab === 'post-delivery',
  });

  // Fetch pickups (DELIVERED jobs waiting for collection)
  const { data: pickupsData } = useQuery<{ pickups: PickupJob[] }>({
    queryKey: ['jobs', 'pickups'],
    queryFn: async () => (await api.get('/jobs/pickups')).data,
    enabled: activeTab === 'mine',
  });

  // Accept job mutation
  const acceptMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await api.post(`/jobs/${jobId}/accept`);
      return res.data as AcceptResult;
    },
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      queryClient.invalidateQueries({ queryKey: ['game', 'action-status'] });
    },
  });

  // Cancel job mutation
  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await api.post(`/jobs/${jobId}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  // Post workshop job mutation
  const postWorkshopMutation = useMutation({
    mutationFn: async (body: { townId: string; recipeId: string; wage: number; quantity: number }) => {
      const res = await api.post('/jobs/post-workshop', body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setSelectedRecipe(null);
      setWorkshopWage(10);
      setWorkshopQuantity(1);
      setActiveTab('mine');
    },
  });

  // Post delivery job mutation
  const postDeliveryMutation = useMutation({
    mutationFn: async (body: { townId: string; destinationTownId: string; wage: number; deadlineDays: number; items: Array<{ itemName: string; quantity: number }> }) => {
      const res = await api.post('/jobs/post-delivery', body);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setDeliveryDestination('');
      setDeliveryWage(10);
      setDeliveryDeadline(3);
      setDeliveryItems([{ itemName: '', quantity: 1 }]);
      setActiveTab('mine');
    },
  });

  // Pickup mutation
  const pickupMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await api.post(`/jobs/${jobId}/pickup`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });

  const jobs = jobsData?.jobs ?? [];
  const myJobs = myJobsData?.jobs ?? [];
  const actionUsed = actionStatus?.actionUsed ?? false;
  const townName = town?.name ?? 'this town';
  const allRecipes = recipesData?.recipes ?? [];

  // Group recipes by profession
  const recipesByProfession = useMemo(() => {
    const grouped: Record<string, RecipeListing[]> = {};
    const searchLower = recipeSearch.toLowerCase();
    for (const r of allRecipes) {
      if (searchLower && !r.name.toLowerCase().includes(searchLower) && !r.professionType.toLowerCase().includes(searchLower)) continue;
      if (!grouped[r.professionType]) grouped[r.professionType] = [];
      grouped[r.professionType].push(r);
    }
    return grouped;
  }, [allRecipes, recipeSearch]);

  // Build inventory availability map for selected recipe
  const inventoryByTemplate = useMemo(() => {
    const map = new Map<string, number>();
    if (!inventoryData?.items) return map;
    for (const item of inventoryData.items) {
      const tid = item.templateId;
      map.set(tid, (map.get(tid) ?? 0) + (item.quantity ?? 1));
    }
    return map;
  }, [inventoryData]);

  // Check material availability for selected recipe
  const materialCheck = useMemo(() => {
    if (!selectedRecipe) return null;
    return selectedRecipe.inputs.map(input => {
      const needed = input.quantity * workshopQuantity;
      const available = inventoryByTemplate.get(input.itemTemplateId) ?? 0;
      return { ...input, needed, available, sufficient: available >= needed };
    });
  }, [selectedRecipe, workshopQuantity, inventoryByTemplate]);

  const allMaterialsSufficient = materialCheck?.every(m => m.sufficient) ?? false;
  const canPostWorkshop = selectedRecipe && townId && allMaterialsSufficient && workshopWage >= 1 && (character?.gold ?? 0) >= workshopWage;

  const routes = routesData?.routes ?? [];
  const pickups = pickupsData?.pickups ?? [];
  const pendingPickups = pickups.length;

  // Build unique item names from inventory for delivery item selector
  const inventoryItemNames = useMemo(() => {
    if (!inventoryData?.items) return [];
    const names = new Map<string, number>();
    for (const item of inventoryData.items) {
      const name = item.templateName;
      names.set(name, (names.get(name) ?? 0) + (item.quantity ?? 1));
    }
    return Array.from(names.entries()).map(([name, qty]) => ({ name, qty })).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventoryData]);

  const validDeliveryItems = deliveryItems.filter(i => i.itemName && i.quantity > 0);
  const canPostDelivery = townId && deliveryDestination && validDeliveryItems.length > 0 && deliveryWage >= 1 && (character?.gold ?? 0) >= deliveryWage;

  // -------------------------------------------------------------------------
  // Loading / error
  // -------------------------------------------------------------------------
  if (!townId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <PageHeader title="Jobs Board" icon={<Briefcase className="w-8 h-8 text-realm-gold-400" />} />
        <RealmPanel title="Jobs Board">
          <p className="text-xs text-realm-text-muted">You must be in a town to view jobs.</p>
        </RealmPanel>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <PageHeader title={`Jobs Board \u2014 ${townName}`} icon={<Briefcase className="w-8 h-8 text-realm-gold-400" />} />

      {/* Success toast */}
      {lastResult && (
        <div className="bg-realm-success/10 border border-realm-success/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-realm-success" />
            <span className="text-sm font-display text-realm-success">Job Completed!</span>
            {lastResult.reward.professionMatch === false && (
              <RealmBadge variant="uncommon">Non-matching (50%)</RealmBadge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-realm-text-secondary">
            {lastResult.reward.gold > 0 && (
              <span className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-realm-gold-400" />
                <span className="text-realm-gold-400">{lastResult.reward.gold}g</span> earned
              </span>
            )}
            {lastResult.reward.items && (
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-realm-teal-300" />
                {lastResult.reward.items.quantity}x {lastResult.reward.items.name}
              </span>
            )}
            {lastResult.reward.qualities && lastResult.reward.qualities.length > 0 && (
              <span className="text-realm-text-muted">
                Quality: {lastResult.reward.qualities.join(', ')}
              </span>
            )}
            {lastResult.reward.xp > 0 && (
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-realm-purple-300" />
                +{lastResult.reward.xp} XP
              </span>
            )}
          </div>
          {lastResult.reward.depositMessage && (
            <p className="text-[10px] text-realm-text-muted mt-1">{lastResult.reward.depositMessage}</p>
          )}
          <button
            onClick={() => setLastResult(null)}
            className="text-[10px] text-realm-text-muted hover:text-realm-text-secondary mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Daily action warning */}
      {actionUsed && activeTab === 'browse' && (
        <div className="bg-realm-warning/10 border border-realm-warning/30 rounded-lg px-4 py-3">
          <p className="text-xs text-realm-warning">
            Daily action already used. You cannot accept jobs until the next tick.
          </p>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'browse' as const, label: 'Available Jobs' },
          { key: 'post-workshop' as const, label: 'Post Workshop' },
          { key: 'post-delivery' as const, label: 'Post Delivery' },
          { key: 'mine' as const, label: pendingPickups > 0 ? `My Jobs (${pendingPickups})` : 'My Jobs' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 rounded-md text-xs font-display transition-colors ${
              activeTab === key
                ? 'bg-realm-gold-500/20 text-realm-gold-400 border border-realm-gold-500/30'
                : 'bg-realm-bg-800 text-realm-text-muted hover:text-realm-text-secondary border border-realm-bg-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* Browse tab */}
      {/* ================================================================= */}
      {activeTab === 'browse' && (
        <RealmPanel title="Available Jobs" className="relative">
          {jobs.length > 0 && (
            <div className="absolute top-3 right-5">
              <RealmBadge variant="default">{jobs.length}</RealmBadge>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              <div className="h-20 bg-realm-bg-800 rounded-sm animate-pulse" />
              <div className="h-20 bg-realm-bg-800 rounded-sm animate-pulse" />
            </div>
          ) : error ? (
            <p className="text-xs text-realm-danger">Failed to load job listings.</p>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8">
              <ScrollText className="w-8 h-8 text-realm-text-muted mx-auto mb-3 opacity-50" />
              <p className="text-sm text-realm-text-muted">No jobs posted right now.</p>
              <p className="text-xs text-realm-text-muted mt-1">Check back later or ask local property owners for work.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const isOwnJob = job.ownerId === character?.id;
                const isWorkshop = job.category === 'WORKSHOP';
                const isDelivery = job.category === 'DELIVERY';
                // Delivery jobs are free actions — don't block on daily action
                const canAccept = isDelivery ? !isOwnJob : !isOwnJob && !actionUsed;

                return (
                  <div
                    key={job.id}
                    className="bg-realm-bg-800 border border-realm-bg-600 hover:border-realm-gold-500/30 rounded-lg p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Job title + category badge */}
                        <div className="flex items-center gap-2 mb-1">
                          {isDelivery
                            ? <Truck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            : isWorkshop
                              ? <Hammer className="w-4 h-4 text-realm-teal-300 flex-shrink-0" />
                              : <Briefcase className="w-4 h-4 text-realm-gold-400 flex-shrink-0" />
                          }
                          <span className="text-sm font-display text-realm-text-primary">
                            {isWorkshop || isDelivery ? job.title : (job.jobLabel ?? job.title)}
                          </span>
                          <CategoryBadge category={job.category} />
                          {!isWorkshop && !isDelivery && job.assetTier && <TierBadge tier={job.assetTier} />}
                          {isWorkshop && job.tierRequired && <ProfessionTierBadge tier={job.tierRequired} />}
                          {isDelivery && (
                            <span className="text-[10px] text-realm-success font-display">FREE ACTION</span>
                          )}
                        </div>

                        {/* Details row */}
                        <div className="flex items-center gap-2 text-[11px] mb-1 flex-wrap">
                          {isDelivery ? (
                            <>
                              <MapPin className="w-3 h-3 text-amber-400" />
                              <span className="text-amber-400">{job.destinationTownName}</span>
                              <span className="text-realm-text-muted">&middot;</span>
                              <Package className="w-3 h-3 text-realm-text-secondary" />
                              <span className="text-realm-text-secondary">
                                {(job.deliveryItems ?? []).map(i => `${i.quantity}x ${i.itemName}`).join(', ')}
                              </span>
                              {job.expiresAt && (
                                <>
                                  <span className="text-realm-text-muted">&middot;</span>
                                  <Clock className="w-3 h-3 text-realm-text-muted" />
                                  <span className="text-realm-text-muted">
                                    Expires {new Date(job.expiresAt).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </>
                          ) : isWorkshop ? (
                            <>
                              {job.outputItemName && (
                                <span className="text-realm-text-secondary">
                                  {job.quantity && job.quantity > 1 ? `${job.quantity}x ` : ''}{job.outputItemName}
                                </span>
                              )}
                              {job.professionRequired && (
                                <>
                                  <span className="text-realm-text-muted">&middot;</span>
                                  <span className="text-realm-text-muted capitalize">
                                    Requires {job.professionRequired.toLowerCase()}
                                  </span>
                                </>
                              )}
                              <span className="text-realm-text-muted">&middot;</span>
                              <Package className="w-3 h-3 text-realm-success" />
                              <span className="text-realm-success text-[10px]">Materials supplied</span>
                            </>
                          ) : (
                            <>
                              <span className="text-realm-text-secondary">{job.assetName}</span>
                              <span className="text-realm-text-muted">&middot;</span>
                              <span className="text-realm-text-muted capitalize">
                                {job.professionType?.toLowerCase()}
                              </span>
                            </>
                          )}
                          <span className="text-realm-text-muted">&middot;</span>
                          <User className="w-3 h-3 text-realm-text-muted" />
                          <span className="text-realm-text-muted">{job.ownerName}</span>
                        </div>

                        {/* Pay with escrow indicator */}
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-realm-gold-400" />
                          <span className="text-sm font-display text-realm-gold-400">{job.pay}g</span>
                          <span className="text-[11px] text-realm-text-muted flex items-center gap-1">
                            <Shield className="w-3 h-3 text-realm-success" />
                            guaranteed
                          </span>
                        </div>
                      </div>

                      {/* Accept button */}
                      <RealmButton
                        variant="primary"
                        size="sm"
                        onClick={() => acceptMutation.mutate(job.id)}
                        disabled={acceptMutation.isPending || !canAccept}
                        title={
                          isOwnJob
                            ? 'Cannot accept your own job'
                            : !isDelivery && actionUsed
                              ? 'Daily action already used'
                              : isDelivery
                                ? 'Accept delivery (travel to destination to complete)'
                                : 'Accept this job (uses daily action)'
                        }
                      >
                        {acceptMutation.isPending ? 'Working...' : isDelivery ? 'Accept Delivery' : 'Accept Job'}
                      </RealmButton>
                    </div>
                  </div>
                );
              })}

              {acceptMutation.isError && (
                <p className="text-xs text-realm-danger mt-2">
                  {(acceptMutation.error as any)?.response?.data?.error || 'Failed to accept job.'}
                </p>
              )}
            </div>
          )}
        </RealmPanel>
      )}

      {/* ================================================================= */}
      {/* Post Workshop Job tab */}
      {/* ================================================================= */}
      {activeTab === 'post-workshop' && (
        <RealmPanel title="Post Workshop Job">
          <div className="space-y-4">
            {/* Recipe search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-realm-text-muted" />
              <input
                type="text"
                value={recipeSearch}
                onChange={(e) => setRecipeSearch(e.target.value)}
                placeholder="Search recipes..."
                className="w-full pl-9 pr-3 py-2 bg-realm-bg-900 border border-realm-border rounded-sm text-xs text-realm-text-primary placeholder-realm-text-muted focus:border-realm-gold-500/50 focus:outline-hidden"
              />
            </div>

            {/* Recipe browser — grouped by profession */}
            {!selectedRecipe && (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {Object.keys(recipesByProfession).length === 0 ? (
                  <p className="text-xs text-realm-text-muted text-center py-4">
                    {allRecipes.length === 0 ? 'Loading recipes...' : 'No recipes match your search.'}
                  </p>
                ) : (
                  Object.entries(recipesByProfession).map(([prof, profRecipes]) => (
                    <div key={prof}>
                      <button
                        onClick={() => setExpandedProfession(expandedProfession === prof ? null : prof)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-realm-bg-800 rounded-sm hover:bg-realm-bg-700 transition-colors"
                      >
                        <span className="text-xs font-display text-realm-text-primary capitalize">
                          {prof.toLowerCase()} ({profRecipes.length})
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-realm-text-muted transition-transform ${expandedProfession === prof ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedProfession === prof && (
                        <div className="ml-2 border-l border-realm-bg-600 pl-2 mt-1 space-y-1">
                          {profRecipes.map(recipe => (
                            <button
                              key={recipe.id}
                              onClick={() => { setSelectedRecipe(recipe); setWorkshopQuantity(1); }}
                              className="w-full text-left px-3 py-2 bg-realm-bg-900 rounded-sm hover:bg-realm-bg-800 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-realm-text-primary">{recipe.name}</span>
                                <ProfessionTierBadge tier={recipe.tier} />
                              </div>
                              <p className="text-[10px] text-realm-text-muted mt-0.5">
                                {recipe.inputs.map(i => `${i.quantity}x ${i.itemName}`).join(', ')} &rarr; {recipe.outputItemName}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Selected recipe details */}
            {selectedRecipe && (
              <div className="space-y-3">
                <div className="bg-realm-bg-800 border border-realm-teal-300/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-realm-teal-300" />
                      <span className="text-sm font-display text-realm-text-primary">{selectedRecipe.name}</span>
                      <ProfessionTierBadge tier={selectedRecipe.tier} />
                    </div>
                    <button
                      onClick={() => setSelectedRecipe(null)}
                      className="text-realm-text-muted hover:text-realm-text-secondary"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-[11px] text-realm-text-muted mb-2 capitalize">
                    Requires {selectedRecipe.professionType.toLowerCase()} ({selectedRecipe.tier.toLowerCase()}+)
                  </p>

                  <div className="text-[11px] text-realm-text-secondary mb-1">
                    Output: <span className="text-realm-text-primary">{selectedRecipe.outputItemName}</span>
                  </div>

                  {/* Materials needed */}
                  <div className="text-[11px] text-realm-text-secondary">
                    Materials per unit:
                    <ul className="mt-1 space-y-0.5">
                      {materialCheck ? materialCheck.map((mat, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className={mat.sufficient ? 'text-realm-success' : 'text-realm-danger'}>
                            {mat.available}/{mat.needed}
                          </span>
                          <span>{mat.itemName}</span>
                          {!mat.sufficient && (
                            <span className="text-realm-danger text-[10px]">(need {mat.needed - mat.available} more)</span>
                          )}
                        </li>
                      )) : selectedRecipe.inputs.map((input, i) => (
                        <li key={i}>{input.quantity}x {input.itemName}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Quantity selector */}
                <div className="flex items-center gap-3">
                  <label className="text-xs text-realm-text-secondary">Quantity:</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(q => (
                      <button
                        key={q}
                        onClick={() => setWorkshopQuantity(q)}
                        className={`w-7 h-7 rounded-sm text-xs font-display transition-colors ${
                          workshopQuantity === q
                            ? 'bg-realm-teal-300/20 text-realm-teal-300 border border-realm-teal-300/30'
                            : 'bg-realm-bg-800 text-realm-text-muted border border-realm-bg-600 hover:text-realm-text-secondary'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wage input */}
                <RealmInput
                  label="Worker wage (gold)"
                  type="number"
                  min={1}
                  value={workshopWage}
                  onChange={(e) => setWorkshopWage(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-xs"
                />

                {/* Cost preview */}
                <div className="bg-realm-bg-900 border border-realm-bg-600 rounded-sm p-3">
                  <p className="text-xs font-display text-realm-text-secondary mb-1">Cost Preview</p>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-realm-gold-400" />
                      <span className="text-realm-gold-400">{workshopWage}g</span>
                      <span className="text-realm-text-muted">wage (escrowed)</span>
                    </span>
                  </div>
                  <div className="text-[10px] text-realm-text-muted mt-1">
                    Materials from your inventory will be consumed on posting.
                  </div>
                  {(character?.gold ?? 0) < workshopWage && (
                    <p className="text-[10px] text-realm-danger mt-1">
                      Insufficient gold ({character?.gold ?? 0}g available)
                    </p>
                  )}
                </div>

                {/* Post button */}
                <RealmButton
                  variant="primary"
                  onClick={() => {
                    if (!canPostWorkshop || !townId || !selectedRecipe) return;
                    postWorkshopMutation.mutate({
                      townId,
                      recipeId: selectedRecipe.id,
                      wage: workshopWage,
                      quantity: workshopQuantity,
                    });
                  }}
                  disabled={!canPostWorkshop || postWorkshopMutation.isPending}
                  className="w-full"
                >
                  {postWorkshopMutation.isPending ? 'Posting...' : `Post Workshop Job — ${workshopQuantity}x ${selectedRecipe.name}`}
                </RealmButton>

                {postWorkshopMutation.isError && (
                  <p className="text-xs text-realm-danger">
                    {(postWorkshopMutation.error as any)?.response?.data?.error || 'Failed to post workshop job.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </RealmPanel>
      )}

      {/* ================================================================= */}
      {/* Post Delivery Job tab */}
      {/* ================================================================= */}
      {activeTab === 'post-delivery' && (
        <RealmPanel title="Post Delivery Job">
          <div className="space-y-4">
            <p className="text-xs text-realm-text-muted">
              Hire a traveler to deliver items to another town. Items and wage are escrowed on posting.
              The worker earns the wage upon arrival — no daily action cost for them.
            </p>

            {/* Destination selector */}
            <div>
              <label className="block text-xs text-realm-text-secondary mb-1">Destination Town</label>
              {routes.length === 0 ? (
                <p className="text-xs text-realm-text-muted">Loading routes...</p>
              ) : (
                <select
                  value={deliveryDestination}
                  onChange={(e) => setDeliveryDestination(e.target.value)}
                  className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded-sm text-xs text-realm-text-primary focus:border-realm-gold-500/50 focus:outline-hidden"
                >
                  <option value="">Select destination...</option>
                  {routes.map(r => (
                    <option key={r.destination.id} value={r.destination.id}>
                      {r.destination.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Items to deliver */}
            <div>
              <label className="block text-xs text-realm-text-secondary mb-1">Items to Deliver</label>
              <div className="space-y-2">
                {deliveryItems.map((di, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={di.itemName}
                      onChange={(e) => {
                        const updated = [...deliveryItems];
                        updated[idx] = { ...updated[idx], itemName: e.target.value };
                        setDeliveryItems(updated);
                      }}
                      className="flex-1 px-3 py-1.5 bg-realm-bg-900 border border-realm-border rounded-sm text-xs text-realm-text-primary focus:border-realm-gold-500/50 focus:outline-hidden"
                    >
                      <option value="">Select item...</option>
                      {inventoryItemNames.map(i => (
                        <option key={i.name} value={i.name}>
                          {i.name} ({i.qty} available)
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={di.quantity}
                      onChange={(e) => {
                        const updated = [...deliveryItems];
                        updated[idx] = { ...updated[idx], quantity: Math.max(1, parseInt(e.target.value) || 1) };
                        setDeliveryItems(updated);
                      }}
                      className="w-16 px-2 py-1.5 bg-realm-bg-900 border border-realm-border rounded-sm text-xs text-realm-text-primary text-center focus:border-realm-gold-500/50 focus:outline-hidden"
                    />
                    {deliveryItems.length > 1 && (
                      <button
                        onClick={() => setDeliveryItems(deliveryItems.filter((_, i) => i !== idx))}
                        className="text-realm-text-muted hover:text-realm-danger"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {deliveryItems.length < 10 && (
                  <button
                    onClick={() => setDeliveryItems([...deliveryItems, { itemName: '', quantity: 1 }])}
                    className="text-[10px] text-realm-gold-400 hover:text-realm-gold-300"
                  >
                    + Add another item
                  </button>
                )}
              </div>
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-xs text-realm-text-secondary mb-1">Deadline: {deliveryDeadline} day{deliveryDeadline > 1 ? 's' : ''}</label>
              <input
                type="range"
                min={1}
                max={7}
                value={deliveryDeadline}
                onChange={(e) => setDeliveryDeadline(parseInt(e.target.value))}
                className="w-full accent-amber-400"
              />
              <div className="flex justify-between text-[10px] text-realm-text-muted">
                <span>1 day</span>
                <span>7 days</span>
              </div>
            </div>

            {/* Wage */}
            <RealmInput
              label="Worker wage (gold)"
              type="number"
              min={1}
              value={deliveryWage}
              onChange={(e) => setDeliveryWage(Math.max(1, parseInt(e.target.value) || 1))}
              className="text-xs"
            />

            {/* Cost preview */}
            <div className="bg-realm-bg-900 border border-realm-bg-600 rounded-sm p-3">
              <p className="text-xs font-display text-realm-text-secondary mb-1">Cost Preview</p>
              <div className="flex items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1">
                  <Coins className="w-3 h-3 text-realm-gold-400" />
                  <span className="text-realm-gold-400">{deliveryWage}g</span>
                  <span className="text-realm-text-muted">wage (escrowed)</span>
                </span>
              </div>
              <div className="text-[10px] text-realm-text-muted mt-1">
                Items will be removed from your inventory and held in escrow until delivered.
              </div>
              {(character?.gold ?? 0) < deliveryWage && (
                <p className="text-[10px] text-realm-danger mt-1">
                  Insufficient gold ({character?.gold ?? 0}g available)
                </p>
              )}
            </div>

            {/* Post button */}
            <RealmButton
              variant="primary"
              onClick={() => {
                if (!canPostDelivery || !townId) return;
                postDeliveryMutation.mutate({
                  townId,
                  destinationTownId: deliveryDestination,
                  wage: deliveryWage,
                  deadlineDays: deliveryDeadline,
                  items: validDeliveryItems,
                });
              }}
              disabled={!canPostDelivery || postDeliveryMutation.isPending}
              className="w-full"
            >
              {postDeliveryMutation.isPending ? 'Posting...' : 'Post Delivery Job'}
            </RealmButton>

            {postDeliveryMutation.isError && (
              <p className="text-xs text-realm-danger">
                {(postDeliveryMutation.error as any)?.response?.data?.error || 'Failed to post delivery job.'}
              </p>
            )}
          </div>
        </RealmPanel>
      )}

      {/* ================================================================= */}
      {/* My Jobs tab */}
      {/* ================================================================= */}
      {activeTab === 'mine' && (
        <>
          {/* Pending pickups banner */}
          {pickups.length > 0 && (
            <RealmPanel title="Deliveries Ready for Pickup">
              <div className="space-y-3">
                {pickups.map((p) => (
                  <div
                    key={p.id}
                    className="bg-realm-bg-800 border border-realm-teal-300/30 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-realm-teal-300 flex-shrink-0" />
                          <span className="text-sm font-display text-realm-text-primary">{p.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] flex-wrap mb-1">
                          <MapPin className="w-3 h-3 text-amber-400" />
                          <span className="text-amber-400">{p.destinationTownName}</span>
                          <span className="text-realm-text-muted">&middot;</span>
                          <Package className="w-3 h-3 text-realm-text-secondary" />
                          <span className="text-realm-text-secondary">
                            {p.deliveryItems.map(i => `${i.quantity}x ${i.itemName}`).join(', ')}
                          </span>
                          {p.workerName && (
                            <>
                              <span className="text-realm-text-muted">&middot;</span>
                              <span className="text-realm-text-muted">Delivered by {p.workerName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <RealmButton
                        variant="primary"
                        size="sm"
                        onClick={() => pickupMutation.mutate(p.id)}
                        disabled={!p.canPickUp || pickupMutation.isPending}
                        title={p.canPickUp ? 'Collect delivered items' : `Travel to ${p.destinationTownName} to pick up`}
                      >
                        {pickupMutation.isPending ? 'Collecting...' : p.canPickUp ? 'Pick Up' : 'Not in Town'}
                      </RealmButton>
                    </div>
                  </div>
                ))}
                {pickupMutation.isError && (
                  <p className="text-xs text-realm-danger">
                    {(pickupMutation.error as any)?.response?.data?.error || 'Failed to pick up delivery.'}
                  </p>
                )}
                {pickupMutation.isSuccess && (
                  <p className="text-xs text-realm-success">Delivery collected! Items added to your inventory.</p>
                )}
              </div>
            </RealmPanel>
          )}

          <RealmPanel title="My Jobs">
            {myJobsLoading ? (
              <div className="space-y-3">
                <div className="h-16 bg-realm-bg-800 rounded-sm animate-pulse" />
                <div className="h-16 bg-realm-bg-800 rounded-sm animate-pulse" />
              </div>
            ) : myJobs.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-8 h-8 text-realm-text-muted mx-auto mb-3 opacity-50" />
                <p className="text-sm text-realm-text-muted">You haven't posted any jobs.</p>
                <p className="text-xs text-realm-text-muted mt-1">
                  Post asset jobs from your <Link to="/housing" className="text-realm-gold-400 hover:underline">Properties</Link> page,
                  or use the <button onClick={() => setActiveTab('post-workshop')} className="text-realm-teal-300 hover:underline">Post Workshop</button> or{' '}
                  <button onClick={() => setActiveTab('post-delivery')} className="text-amber-400 hover:underline">Post Delivery</button> tabs.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myJobs.map((job) => {
                  const isWorkshop = job.category === 'WORKSHOP';
                  const isDelivery = job.category === 'DELIVERY';
                  const canCancel = job.status === 'OPEN' || (isDelivery && job.status === 'IN_PROGRESS');

                  return (
                    <div
                      key={job.id}
                      className="bg-realm-bg-800 border border-realm-bg-600 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {isDelivery
                              ? <Truck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              : isWorkshop
                                ? <Hammer className="w-4 h-4 text-realm-teal-300 flex-shrink-0" />
                                : <Briefcase className="w-4 h-4 text-realm-gold-400 flex-shrink-0" />
                            }
                            <span className="text-sm font-display text-realm-text-primary">
                              {job.title}
                            </span>
                            <CategoryBadge category={job.category} />
                          </div>
                          <div className="flex items-center gap-2 text-[11px] flex-wrap">
                            {!isWorkshop && !isDelivery && job.assetName && (
                              <>
                                <span className="text-realm-text-secondary">{job.assetName}</span>
                                <span className="text-realm-text-muted">&middot;</span>
                              </>
                            )}
                            <Coins className="w-3 h-3 text-realm-gold-400" />
                            <span className="text-realm-gold-400">{job.pay}g</span>
                            <span className="text-realm-text-muted">&middot;</span>
                            <span className={STATUS_COLORS[job.status] ?? 'text-realm-text-muted'}>
                              {job.status}
                            </span>
                            {isDelivery && job.workerName && job.status === 'IN_PROGRESS' && (
                              <>
                                <span className="text-realm-text-muted">&middot;</span>
                                <span className="text-realm-text-muted">Worker: {job.workerName}</span>
                              </>
                            )}
                          </div>

                          {/* Workshop escrow details */}
                          {isWorkshop && job.materialsEscrow && job.status === 'OPEN' && (
                            <div className="mt-1.5 text-[10px] text-realm-text-muted">
                              <span className="text-realm-text-secondary">Materials in escrow:</span>{' '}
                              {job.materialsEscrow.map((m, i) => (
                                <span key={i}>
                                  {i > 0 && ', '}{m.quantity}x {m.itemName}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Delivery details */}
                          {isDelivery && (
                            <div className="mt-1.5 text-[10px] text-realm-text-muted space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-amber-400" />
                                <span className="text-amber-400">{job.destinationTownName}</span>
                                {job.expiresAt && (
                                  <>
                                    <span>&middot;</span>
                                    <Clock className="w-3 h-3" />
                                    <span>Expires {new Date(job.expiresAt).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                              {job.deliveryItems && (
                                <div>
                                  <span className="text-realm-text-secondary">Items:</span>{' '}
                                  {(job.deliveryItems as Array<{ itemName: string; quantity: number }>).map((di, i) => (
                                    <span key={i}>
                                      {i > 0 && ', '}{di.quantity}x {di.itemName}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Cancel button */}
                        {canCancel && (
                          <div className="flex flex-col items-end gap-1">
                            {cancelTarget === job.id && isDelivery && job.status === 'IN_PROGRESS' ? (
                              <div className="text-right">
                                <p className="text-[10px] text-realm-warning mb-1 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Wage split 50/50 with worker
                                </p>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => { cancelMutation.mutate(job.id); setCancelTarget(null); }}
                                    disabled={cancelMutation.isPending}
                                    className="text-[10px] px-2 py-0.5 bg-realm-danger/20 text-realm-danger rounded-sm border border-realm-danger/30 hover:bg-realm-danger/30"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setCancelTarget(null)}
                                    className="text-[10px] px-2 py-0.5 bg-realm-bg-700 text-realm-text-muted rounded-sm border border-realm-bg-600"
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  if (isDelivery && job.status === 'IN_PROGRESS') {
                                    setCancelTarget(job.id);
                                  } else {
                                    cancelMutation.mutate(job.id);
                                  }
                                }}
                                disabled={cancelMutation.isPending}
                                className="text-realm-text-muted hover:text-realm-danger transition-colors"
                                title={
                                  isDelivery
                                    ? job.status === 'IN_PROGRESS'
                                      ? 'Cancel delivery (wage split 50/50)'
                                      : 'Cancel delivery (full refund)'
                                    : isWorkshop
                                      ? 'Cancel job (gold & materials refunded)'
                                      : 'Cancel job (gold refunded)'
                                }
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {cancelMutation.isError && (
                  <p className="text-xs text-realm-danger mt-2">
                    {(cancelMutation.error as any)?.response?.data?.error || 'Failed to cancel job.'}
                  </p>
                )}
              </div>
            )}
          </RealmPanel>
        </>
      )}
    </div>
  );
}
