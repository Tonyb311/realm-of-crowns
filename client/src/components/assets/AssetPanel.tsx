import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sprout,
  Leaf,
  AlertTriangle,
  Lock,
  ShoppingCart,
  User,
  XCircle,
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
  cropState: 'EMPTY' | 'GROWING' | 'READY' | 'WITHERED';
  plantedAt: number | null;
  readyAt: number | null;
  witherAt: number | null;
  jobListing: {
    id: string;
    wage: number;
    workerName: string | null;
  } | null;
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
// Crop state display
// ---------------------------------------------------------------------------
function CropStateDisplay({
  asset,
  currentGameDay,
  onPlant,
  onHarvest,
  plantPending,
  harvestPending,
}: {
  asset: OwnedAsset;
  currentGameDay: number;
  onPlant: () => void;
  onHarvest: () => void;
  plantPending: boolean;
  harvestPending: boolean;
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
            disabled={plantPending}
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
              disabled={harvestPending}
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
// Job management per asset
// ---------------------------------------------------------------------------
function JobSection({
  asset,
  onPostJob,
  onCancelJob,
  postPending,
  cancelPending,
}: {
  asset: OwnedAsset;
  onPostJob: (wage: number) => void;
  onCancelJob: () => void;
  postPending: boolean;
  cancelPending: boolean;
}) {
  const [showWageInput, setShowWageInput] = useState(false);
  const [wage, setWage] = useState('5');

  if (!asset.jobListing) {
    if (showWageInput) {
      return (
        <div className="flex items-center gap-2 mt-2">
          <RealmInput
            type="number"
            min="1"
            value={wage}
            onChange={(e) => setWage(e.target.value)}
            className="w-20 !py-1 !px-2 text-xs"
            placeholder="Wage"
          />
          <span className="text-[11px] text-realm-text-muted">g/harvest</span>
          <RealmButton
            variant="primary"
            size="sm"
            disabled={postPending || !wage || Number(wage) < 1}
            onClick={() => {
              onPostJob(Number(wage));
              setShowWageInput(false);
            }}
          >
            {postPending ? 'Posting...' : 'Post Job'}
          </RealmButton>
          <RealmButton
            variant="ghost"
            size="sm"
            onClick={() => setShowWageInput(false)}
          >
            Cancel
          </RealmButton>
        </div>
      );
    }

    return (
      <div className="mt-2">
        <RealmButton
          variant="secondary"
          size="sm"
          onClick={() => setShowWageInput(true)}
        >
          Hire Worker
        </RealmButton>
      </div>
    );
  }

  if (!asset.jobListing.workerName) {
    return (
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-realm-text-muted">
          Seeking worker &mdash;{' '}
          <span className="text-realm-gold-400">{asset.jobListing.wage}g</span>/harvest
        </span>
        <button
          onClick={onCancelJob}
          disabled={cancelPending}
          className="text-realm-text-muted hover:text-realm-danger transition-colors"
          title="Cancel job listing"
        >
          <XCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between mt-2">
      <span className="text-[11px] text-realm-text-secondary">
        <User className="w-3 h-3 inline mr-1" />
        {asset.jobListing.workerName} &mdash;{' '}
        <span className="text-realm-gold-400">{asset.jobListing.wage}g</span>/harvest
      </span>
      <RealmButton
        variant="danger"
        size="sm"
        onClick={onCancelJob}
        disabled={cancelPending}
      >
        Fire
      </RealmButton>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AssetPanel
// ---------------------------------------------------------------------------
interface AssetPanelProps {
  townId: string;
  characterId: string;
}

export default function AssetPanel({ townId, characterId }: AssetPanelProps) {
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
    enabled: !!townId,
  });

  const { data: availableData } = useQuery<AvailableResponse>({
    queryKey: ['assets', 'available'],
    queryFn: async () => {
      const res = await api.get('/assets/available');
      return res.data;
    },
    enabled: showBuyModal,
  });

  // Filter to current town
  const townAssets = assetsData?.assets?.filter((a) => a.townId === townId) || [];
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
    mutationFn: async ({ assetId, wage }: { assetId: string; wage: number }) => {
      const res = await api.post(`/assets/${assetId}/post-job`, { wage });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const cancelJobMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const res = await api.post(`/assets/${assetId}/cancel-job`);
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
      <RealmPanel
        title={`Your Properties`}
        className="relative"
      >
        {/* Property count badge */}
        {townAssets.length > 0 && (
          <div className="absolute top-3 right-5">
            <RealmBadge variant="default">{townAssets.length}</RealmBadge>
          </div>
        )}

        {townAssets.length === 0 ? (
          <p className="text-xs text-realm-text-muted">
            You have no properties in this town.
          </p>
        ) : (
          <div className="space-y-3">
            {townAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-realm-bg-800 border border-realm-bg-600 rounded-lg p-4"
              >
                {/* Header row */}
                <div className="flex items-center gap-2 mb-2">
                  <Sprout className="w-4 h-4 text-realm-gold-400 flex-shrink-0" />
                  <span className="text-sm font-display text-realm-text-primary truncate">
                    {asset.name}
                  </span>
                  <TierBadge tier={asset.tier} />
                </div>

                {/* Crop state */}
                <CropStateDisplay
                  asset={asset}
                  currentGameDay={currentGameDay}
                  onPlant={() => plantMutation.mutate(asset.id)}
                  onHarvest={() => harvestMutation.mutate(asset.id)}
                  plantPending={plantMutation.isPending}
                  harvestPending={harvestMutation.isPending}
                />

                {/* Job management */}
                <div className="border-t border-realm-bg-600 mt-3 pt-2">
                  <JobSection
                    asset={asset}
                    onPostJob={(wage) =>
                      postJobMutation.mutate({ assetId: asset.id, wage })
                    }
                    onCancelJob={() => cancelJobMutation.mutate(asset.id)}
                    postPending={postJobMutation.isPending}
                    cancelPending={cancelJobMutation.isPending}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Buy New Asset button */}
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
