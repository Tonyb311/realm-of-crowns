import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sprout,
  Leaf,
  AlertTriangle,
  Lock,
  ShoppingCart,
  XCircle,
  Package,
  Briefcase,
  MapPin,
} from 'lucide-react';
import api from '../../services/api';
import {
  RealmPanel,
  RealmButton,
  RealmProgress,
  RealmBadge,
  RealmModal,
  RealmInput,
} from '../ui/realm-index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OwnedAsset {
  id: string;
  townId: string;
  assetTypeId: string;
  name: string;
  tier: number;
  professionType: string;
  spotType: string;
  cropState: 'EMPTY' | 'GROWING' | 'READY' | 'WITHERED';
  plantedAt: number | null;
  readyAt: number | null;
  witherAt: number | null;
  pendingYield: number;
  pendingYieldSince: number | null;
  jobListings: {
    id: string;
    wage: number;
    jobType: string;
    status: string;
    autoPosted: boolean;
  }[];
}

interface AssetsResponse {
  assets: OwnedAsset[];
  currentGameDay: number;
}

interface AssetTypeOption {
  id: string;
  name: string;
  spotType: string;
  tiers: {
    tier: number;
    cost: number;
    requiredLevel: number;
    maxSlots: number;
  }[];
}

interface ProfessionAvailability {
  type: string;
  level: number;
  assetTypes: AssetTypeOption[];
}

interface AvailableResponse {
  professions: ProfessionAvailability[];
}

// ---------------------------------------------------------------------------
// Job helpers
// ---------------------------------------------------------------------------
const RANCHER_SPOT_TO_JOB: Record<string, string> = {
  chicken_coop: 'gather_eggs',
  dairy_barn: 'milk_cows',
  sheep_pen: 'shear_sheep',
};

const JOB_TYPE_LABELS: Record<string, string> = {
  harvest_field: 'Harvest Field',
  plant_field: 'Plant Field',
  gather_eggs: 'Gather Eggs',
  milk_cows: 'Milk Cows',
  shear_sheep: 'Shear Sheep',
};

function getJobType(asset: OwnedAsset): string | null {
  if (asset.professionType === 'RANCHER') {
    return RANCHER_SPOT_TO_JOB[asset.spotType] ?? null;
  }
  if (asset.cropState === 'READY') return 'harvest_field';
  if (asset.cropState === 'EMPTY') return 'plant_field';
  return null;
}

function canPostJob(asset: OwnedAsset): boolean {
  if (asset.jobListings.length > 0) return false;
  if (asset.professionType === 'RANCHER') return asset.pendingYield > 0;
  return asset.cropState === 'READY' || asset.cropState === 'EMPTY';
}

// ---------------------------------------------------------------------------
// Tier helpers
// ---------------------------------------------------------------------------
const TIER_COLORS: Record<number, string> = {
  1: 'text-realm-bronze-400 border-realm-bronze-400/50 bg-realm-bronze-400/10',
  2: 'text-realm-gold-400 border-realm-gold-500/50 bg-realm-gold-500/10',
  3: 'text-realm-teal-300 border-realm-teal-300/50 bg-realm-teal-300/10',
};

function TierBadge({ tier }: { tier: number }) {
  const colorClass = TIER_COLORS[tier] ?? 'text-realm-text-muted border-realm-border';
  return (
    <span className={`text-[10px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded border ${colorClass}`}>
      T{tier}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Crop state display (FARMER assets)
// ---------------------------------------------------------------------------
function CropStateDisplay({
  asset,
  currentGameDay,
  onPlant,
  onHarvest,
  plantPending,
  harvestPending,
  disabled,
}: {
  asset: OwnedAsset;
  currentGameDay: number;
  onPlant: () => void;
  onHarvest: () => void;
  plantPending: boolean;
  harvestPending: boolean;
  disabled: boolean;
}) {
  switch (asset.cropState) {
    case 'EMPTY':
      return (
        <div className="flex items-center gap-3">
          <Sprout className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
          <span className="text-xs text-realm-text-muted">Ready to plant</span>
          <RealmButton
            variant="primary"
            size="sm"
            onClick={onPlant}
            disabled={plantPending || disabled}
            title={disabled ? 'Must be in home town to plant' : undefined}
          >
            {plantPending ? 'Planting...' : 'Plant'}
          </RealmButton>
        </div>
      );

    case 'GROWING': {
      const planted = asset.plantedAt ?? currentGameDay;
      const ready = asset.readyAt ?? currentGameDay + 1;
      const totalDays = Math.max(ready - planted, 1);
      const elapsed = currentGameDay - planted;
      const progress = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));
      const daysLeft = Math.max(0, ready - currentGameDay);

      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-realm-success flex-shrink-0" />
            <span className="text-xs text-realm-success">Growing</span>
            <span className="text-[11px] text-realm-text-muted ml-auto">
              Ready in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
            </span>
          </div>
          <RealmProgress value={progress} max={100} variant="default" />
        </div>
      );
    }

    case 'READY': {
      const witherAt = asset.witherAt;
      const daysUntilWither = witherAt != null ? Math.max(0, witherAt - currentGameDay) : null;
      const showWitherWarning = daysUntilWither != null && daysUntilWither <= 3;

      return (
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-display uppercase tracking-wider px-2 py-0.5 rounded bg-realm-success/20 border border-realm-success/40 text-realm-success animate-pulse">
              Ready to Harvest
            </span>
            <RealmButton
              variant="primary"
              size="sm"
              onClick={onHarvest}
              disabled={harvestPending || disabled}
              title={disabled ? 'Must be in home town to harvest' : undefined}
            >
              {harvestPending ? 'Harvesting...' : 'Harvest'}
            </RealmButton>
          </div>
          {showWitherWarning && (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-realm-warning flex-shrink-0" />
              <span className="text-[11px] text-realm-warning">
                Withers in {daysUntilWither} day{daysUntilWither !== 1 ? 's' : ''}!
              </span>
            </div>
          )}
        </div>
      );
    }

    case 'WITHERED':
      return (
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
          <span className="text-xs text-realm-text-muted">Crop withered</span>
        </div>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Rancher state display (RANCHER assets)
// ---------------------------------------------------------------------------
function RancherStateDisplay({
  asset,
  onCollect,
  collectPending,
  disabled,
}: {
  asset: OwnedAsset;
  onCollect: () => void;
  collectPending: boolean;
  disabled: boolean;
}) {
  if (asset.pendingYield > 0) {
    return (
      <div className="flex items-center gap-3">
        <Package className="w-4 h-4 text-realm-success flex-shrink-0" />
        <span className="text-xs text-realm-success">
          {asset.pendingYield} product{asset.pendingYield !== 1 ? 's' : ''} ready
        </span>
        <RealmButton
          variant="primary"
          size="sm"
          onClick={onCollect}
          disabled={collectPending || disabled}
          title={disabled ? 'Must be in home town to collect' : undefined}
        >
          {collectPending ? 'Collecting...' : 'Collect'}
        </RealmButton>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Package className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
      <span className="text-xs text-realm-text-muted">No products to collect</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Job section per asset (one-shot model)
// ---------------------------------------------------------------------------
function JobSection({
  asset,
  onPostJob,
  onCancelJob,
  postPending,
  cancelPending,
}: {
  asset: OwnedAsset;
  onPostJob: (jobType: string, pay: number) => void;
  onCancelJob: (jobId: string) => void;
  postPending: boolean;
  cancelPending: boolean;
}) {
  const [showPayInput, setShowPayInput] = useState(false);
  const [pay, setPay] = useState('5');

  const openJob = asset.jobListings[0] ?? null;
  const jobType = getJobType(asset);

  // Show existing open job
  if (openJob) {
    return (
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <Briefcase className="w-3.5 h-3.5 text-realm-gold-400 flex-shrink-0" />
          <span className="text-[11px] text-realm-text-secondary">
            {JOB_TYPE_LABELS[openJob.jobType] ?? openJob.jobType} posted
            {' \u2014 '}
            <span className="text-realm-gold-400">{openJob.wage}g</span>
          </span>
        </div>
        <button
          onClick={() => onCancelJob(openJob.id)}
          disabled={cancelPending}
          className="text-realm-text-muted hover:text-realm-danger transition-colors"
          title="Cancel job"
        >
          <XCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Can't post a job for this asset
  if (!canPostJob(asset) || !jobType) return null;

  // Pay input form
  if (showPayInput) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <RealmInput
          type="number"
          min="1"
          value={pay}
          onChange={(e) => setPay(e.target.value)}
          className="w-20 !py-1 !px-2 text-xs"
          placeholder="Pay"
        />
        <span className="text-[11px] text-realm-text-muted">gold</span>
        <RealmButton
          variant="primary"
          size="sm"
          disabled={postPending || !pay || Number(pay) < 1}
          onClick={() => {
            onPostJob(jobType, Number(pay));
            setShowPayInput(false);
          }}
        >
          {postPending ? 'Posting...' : 'Post Job'}
        </RealmButton>
        <RealmButton variant="ghost" size="sm" onClick={() => setShowPayInput(false)}>
          Cancel
        </RealmButton>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <RealmButton variant="secondary" size="sm" onClick={() => setShowPayInput(true)}>
        <Briefcase className="w-3 h-3 inline mr-1" />
        Post Job
      </RealmButton>
      <span className="text-[11px] text-realm-text-muted ml-2">
        {JOB_TYPE_LABELS[jobType] ?? jobType}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AssetPanel
// ---------------------------------------------------------------------------
interface AssetPanelProps {
  townId: string;
  characterId: string;
  isHomeTown: boolean;
  homeTownName?: string;
}

export default function AssetPanel({ townId, characterId, isHomeTown, homeTownName }: AssetPanelProps) {
  const queryClient = useQueryClient();
  const [showBuyModal, setShowBuyModal] = useState(false);

  // -------------------------------------------------------------------------
  // Data queries
  // -------------------------------------------------------------------------
  const {
    data: assetsData,
    isLoading,
    error,
  } = useQuery<AssetsResponse>({
    queryKey: ['assets', 'mine'],
    queryFn: async () => {
      const res = await api.get('/assets/mine');
      return res.data;
    },
    enabled: !!characterId,
  });

  const { data: availableData } = useQuery<AvailableResponse>({
    queryKey: ['assets', 'available'],
    queryFn: async () => {
      const res = await api.get('/assets/available');
      return res.data;
    },
    enabled: showBuyModal,
  });

  // Show all assets (they're always in home town)
  const allAssets = assetsData?.assets ?? [];
  const currentGameDay = assetsData?.currentGameDay || 0;

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------
  const plantMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const res = await api.post(`/assets/${assetId}/plant`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const harvestMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const res = await api.post(`/assets/${assetId}/harvest`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      queryClient.invalidateQueries({ queryKey: ['game', 'action-status'] });
    },
  });

  const collectMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const res = await api.post(`/assets/${assetId}/collect`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      queryClient.invalidateQueries({ queryKey: ['game', 'action-status'] });
    },
  });

  const buyMutation = useMutation({
    mutationFn: async (data: { assetTypeId: string; tier: number }) => {
      const res = await api.post('/assets/buy', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });

  const postJobMutation = useMutation({
    mutationFn: async ({ assetId, jobType, pay }: { assetId: string; jobType: string; pay: number }) => {
      const res = await api.post('/jobs/post', { assetId, jobType, pay });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await api.post(`/jobs/${jobId}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  // -------------------------------------------------------------------------
  // Loading / empty state
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <RealmPanel title="Your Properties">
        <div className="space-y-3">
          <div className="h-20 bg-realm-bg-800 rounded animate-pulse" />
          <div className="h-20 bg-realm-bg-800 rounded animate-pulse" />
        </div>
      </RealmPanel>
    );
  }

  if (error) {
    return (
      <RealmPanel title="Your Properties">
        <p className="text-xs text-realm-danger">Failed to load properties.</p>
      </RealmPanel>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <>
      <RealmPanel title="Your Properties" className="relative">
        {/* Property count badge */}
        {allAssets.length > 0 && (
          <div className="absolute top-3 right-5">
            <RealmBadge variant="default">{allAssets.length}</RealmBadge>
          </div>
        )}

        {/* Away from home notice */}
        {!isHomeTown && allAssets.length > 0 && (
          <div className="flex items-center gap-2 bg-realm-bg-800 border border-realm-bg-600 rounded-lg p-3 mb-3">
            <MapPin className="w-4 h-4 text-realm-warning flex-shrink-0" />
            <span className="text-[11px] text-realm-text-muted">
              You're away from {homeTownName || 'home'}. Physical actions unavailable — you can still post jobs remotely.
            </span>
          </div>
        )}

        {allAssets.length === 0 ? (
          <p className="text-xs text-realm-text-muted">
            You have no properties.
          </p>
        ) : (
          <div className="space-y-3">
            {allAssets.map((asset) => {
              const isRancher = asset.professionType === 'RANCHER';
              const AssetIcon = isRancher ? Package : Sprout;

              return (
                <div
                  key={asset.id}
                  className="bg-realm-bg-800 border border-realm-bg-600 rounded-lg p-4"
                >
                  {/* Header row */}
                  <div className="flex items-center gap-2 mb-2">
                    <AssetIcon className="w-4 h-4 text-realm-gold-400 flex-shrink-0" />
                    <span className="text-sm font-display text-realm-text-primary truncate">
                      {asset.name}
                    </span>
                    <TierBadge tier={asset.tier} />
                    <span className="text-[10px] text-realm-text-muted uppercase tracking-wider ml-auto">
                      {asset.professionType}
                    </span>
                  </div>

                  {/* State display per profession type */}
                  {isRancher ? (
                    <RancherStateDisplay
                      asset={asset}
                      onCollect={() => collectMutation.mutate(asset.id)}
                      collectPending={collectMutation.isPending}
                      disabled={!isHomeTown}
                    />
                  ) : (
                    <CropStateDisplay
                      asset={asset}
                      currentGameDay={currentGameDay}
                      onPlant={() => plantMutation.mutate(asset.id)}
                      onHarvest={() => harvestMutation.mutate(asset.id)}
                      plantPending={plantMutation.isPending}
                      harvestPending={harvestMutation.isPending}
                      disabled={!isHomeTown}
                    />
                  )}

                  {/* Job management (always active, even remotely) */}
                  <div className="border-t border-realm-bg-600 mt-3 pt-2">
                    <JobSection
                      asset={asset}
                      onPostJob={(jobType, pay) =>
                        postJobMutation.mutate({ assetId: asset.id, jobType, pay })
                      }
                      onCancelJob={(jobId) => cancelJobMutation.mutate(jobId)}
                      postPending={postJobMutation.isPending}
                      cancelPending={cancelJobMutation.isPending}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Buy New Asset button — home town only */}
        {isHomeTown && (
          <div className="mt-4">
            <RealmButton
              variant="secondary"
              size="sm"
              onClick={() => setShowBuyModal(true)}
              className="w-full"
            >
              <ShoppingCart className="w-3.5 h-3.5 inline mr-1.5" />
              Buy New Property
            </RealmButton>
          </div>
        )}
      </RealmPanel>

      {/* Purchase Modal */}
      <RealmModal
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        title="Buy Property"
      >
        {!availableData ? (
          <div className="space-y-3">
            <div className="h-12 bg-realm-bg-800 rounded animate-pulse" />
            <div className="h-12 bg-realm-bg-800 rounded animate-pulse" />
          </div>
        ) : availableData.professions.length === 0 ? (
          <p className="text-xs text-realm-text-muted">
            You don't have any gathering professions that can own properties.
          </p>
        ) : (
          <div className="space-y-5">
            {availableData.professions.map((prof) => (
              <div key={prof.type}>
                <h4 className="text-sm font-display text-realm-text-primary mb-2 capitalize">
                  {prof.type.replace(/_/g, ' ')}
                  <span className="text-realm-text-muted text-[11px] ml-2">
                    Lv. {prof.level}
                  </span>
                </h4>

                <div className="space-y-2">
                  {prof.assetTypes.map((at) => (
                    <div key={at.id}>
                      <p className="text-xs text-realm-text-secondary mb-1.5">{at.name}</p>
                      <div className="space-y-1.5">
                        {at.tiers.map((t) => {
                          const locked = prof.level < t.requiredLevel;
                          return (
                            <div
                              key={t.tier}
                              className={`flex items-center justify-between bg-realm-bg-800 border rounded px-3 py-2 ${
                                locked
                                  ? 'border-realm-bg-600 opacity-50'
                                  : 'border-realm-bg-600 hover:border-realm-gold-500/30'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <TierBadge tier={t.tier} />
                                <span className="text-xs text-realm-text-secondary">
                                  {t.cost}g
                                </span>
                              </div>

                              {locked ? (
                                <span className="flex items-center gap-1 text-[11px] text-realm-text-muted">
                                  <Lock className="w-3 h-3" />
                                  Requires Lv. {t.requiredLevel}
                                </span>
                              ) : (
                                <RealmButton
                                  variant="primary"
                                  size="sm"
                                  disabled={buyMutation.isPending}
                                  onClick={() =>
                                    buyMutation.mutate({
                                      assetTypeId: at.id,
                                      tier: t.tier,
                                    })
                                  }
                                >
                                  {buyMutation.isPending ? 'Buying...' : 'Buy'}
                                </RealmButton>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {buyMutation.isError && (
              <p className="text-xs text-realm-danger">
                {(buyMutation.error as any)?.response?.data?.error || 'Purchase failed.'}
              </p>
            )}

            {buyMutation.isSuccess && (
              <p className="text-xs text-realm-success">Property purchased!</p>
            )}
          </div>
        )}
      </RealmModal>
    </>
  );
}
