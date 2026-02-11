import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Unlock, Loader2, Shield, MapPin, Users, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RaceRelease {
  id: string;
  contentType: string;
  contentId: string;
  contentName: string;
  tier: string;
  isReleased: boolean;
  releasedAt: string | null;
  releaseOrder: number | null;
  releaseNotes: string | null;
  playerCount: number;
}

interface TownRelease {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  isReleased: boolean;
  releasedAt: string | null;
  releaseOrder: number | null;
  releaseNotes: string | null;
  playerCount: number;
}

interface ContentReleaseSummary {
  totalRaces: number;
  releasedRaces: number;
  totalTowns: number;
  releasedTowns: number;
  percentReleased: number;
}

interface ContentReleaseData {
  summary: ContentReleaseSummary;
  races: RaceRelease[];
  towns: TownRelease[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIER_STYLES: Record<string, { badge: string; label: string }> = {
  core: {
    badge: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/30',
    label: 'Core',
  },
  common: {
    badge: 'text-gray-300 bg-gray-300/10 border border-gray-300/30',
    label: 'Common',
  },
  exotic: {
    badge: 'text-amber-600 bg-amber-600/10 border border-amber-600/30',
    label: 'Exotic',
  },
};

const TIER_ORDER = ['core', 'common', 'exotic'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ isReleased }: { isReleased: boolean }) {
  return isReleased ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded text-green-400 bg-green-400/10 border border-green-400/30">
      <Unlock className="w-3 h-3" />
      Released
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded text-parchment-500 bg-dark-500/50 border border-dark-50">
      <Lock className="w-3 h-3" />
      Locked
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const style = TIER_STYLES[tier.toLowerCase()] || TIER_STYLES.common;
  return (
    <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded ${style.badge}`}>
      {style.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContentReleasePage() {
  const queryClient = useQueryClient();

  // Local state
  const [racePanelOpen, setRacePanelOpen] = useState(true);
  const [townPanelOpen, setTownPanelOpen] = useState(true);

  // ---------------------------------------------------------------------------
  // Query
  // ---------------------------------------------------------------------------

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ContentReleaseData>({
    queryKey: ['admin', 'content-release'],
    queryFn: async () => (await api.get('/admin/content-release')).data,
    refetchInterval: 10000,
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const releaseMutation = useMutation({
    mutationFn: async ({ contentType, contentId, notes }: { contentType: string; contentId: string; notes?: string }) => {
      return (await api.patch(`/admin/content-release/${contentType}/${contentId}/release`, { notes })).data;
    },
    onSuccess: () => {
      toast.success('Content released successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'content-release'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to release content');
    },
  });

  const unreleaseMutation = useMutation({
    mutationFn: async ({ contentType, contentId, notes }: { contentType: string; contentId: string; notes?: string }) => {
      return (await api.patch(`/admin/content-release/${contentType}/${contentId}/unrelease`, { notes })).data;
    },
    onSuccess: () => {
      toast.success('Content locked successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'content-release'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to lock content');
    },
  });

  const bulkReleaseMutation = useMutation({
    mutationFn: async ({ items, notes }: { items: { contentType: string; contentId: string }[]; notes?: string }) => {
      return (await api.post('/admin/content-release/bulk-release', { items, notes })).data;
    },
    onSuccess: () => {
      toast.success('Bulk release completed successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'content-release'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Bulk release failed');
    },
  });

  const anyMutationPending = releaseMutation.isPending || unreleaseMutation.isPending || bulkReleaseMutation.isPending;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleToggleRelease(contentType: string, contentId: string, isReleased: boolean, playerCount: number) {
    if (isReleased) {
      // Unreleasing
      if (playerCount > 0) {
        const confirmed = window.confirm(
          `This content has ${playerCount} active player(s). Locking it may affect their experience. Are you sure?`
        );
        if (!confirmed) return;
      }
      unreleaseMutation.mutate({ contentType, contentId });
    } else {
      releaseMutation.mutate({ contentType, contentId });
    }
  }

  function handleBulkReleaseRaceTier(tier: string) {
    if (!data) return;
    const unreleased = data.races.filter(
      (r) => r.tier.toLowerCase() === tier.toLowerCase() && !r.isReleased
    );
    if (unreleased.length === 0) return;
    bulkReleaseMutation.mutate({
      items: unreleased.map((r) => ({ contentType: r.contentType, contentId: r.contentId })),
      notes: `Bulk release all ${tier} races`,
    });
  }

  function handleBulkReleaseRegion(regionName: string) {
    if (!data) return;
    const unreleased = data.towns.filter(
      (t) => t.regionName === regionName && !t.isReleased
    );
    if (unreleased.length === 0) return;
    bulkReleaseMutation.mutate({
      items: unreleased.map((t) => ({ contentType: 'town', contentId: t.id })),
      notes: `Bulk release all towns in ${regionName}`,
    });
  }

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const racesByTier = data ? groupBy(data.races, (r) => r.tier.toLowerCase()) : {};
  const townsByRegion = data ? groupBy(data.towns, (t) => t.regionName) : {};
  const sortedRegionNames = Object.keys(townsByRegion).sort();

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-display text-primary-400 mb-6">Content Release Manager</h1>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <h1 className="text-2xl font-display text-primary-400 mb-6">Content Release Manager</h1>
        <div className="bg-dark-300 border border-dark-50 rounded-lg p-8 text-center">
          <p className="text-parchment-300 mb-4">
            {(error as any)?.response?.data?.message || 'Failed to load content release data'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-5 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div>
      <h1 className="text-2xl font-display text-primary-400 mb-6">Content Release Manager</h1>

      {/* ------------------------------------------------------------------- */}
      {/* 1. Summary Cards                                                     */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* Races Released */}
        <div className="bg-dark-500/50 border border-dark-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary-400" />
            <span className="text-parchment-500 text-xs">Races Released</span>
          </div>
          <p className="text-2xl font-display text-parchment-200">
            {summary?.releasedRaces ?? 0}
            <span className="text-parchment-500 text-base">/{summary?.totalRaces ?? 0}</span>
          </p>
        </div>

        {/* Towns Released */}
        <div className="bg-dark-500/50 border border-dark-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-primary-400" />
            <span className="text-parchment-500 text-xs">Towns Released</span>
          </div>
          <p className="text-2xl font-display text-parchment-200">
            {summary?.releasedTowns ?? 0}
            <span className="text-parchment-500 text-base">/{summary?.totalTowns ?? 0}</span>
          </p>
        </div>

        {/* Total Content */}
        <div className="bg-dark-500/50 border border-dark-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary-400" />
            <span className="text-parchment-500 text-xs">Total Content</span>
          </div>
          <p className="text-2xl font-display text-parchment-200">
            {summary?.percentReleased ?? 0}%
            <span className="text-parchment-500 text-base"> released</span>
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-parchment-500 text-xs font-display">Overall Release Progress</span>
          <span className="text-parchment-200 text-xs font-display">{summary?.percentReleased ?? 0}%</span>
        </div>
        <div className="w-full bg-dark-500 rounded-full h-3 overflow-hidden">
          <div
            className="bg-primary-400 h-3 rounded-full transition-all duration-500"
            style={{ width: `${summary?.percentReleased ?? 0}%` }}
          />
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 2. Race Release Panel                                                */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-dark-300 border border-dark-50 rounded-lg mb-6">
        <button
          onClick={() => setRacePanelOpen(!racePanelOpen)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-400" />
            <h2 className="font-display text-parchment-200 text-lg">Race Releases</h2>
            <span className="text-parchment-500 text-xs ml-2">
              {summary?.releasedRaces ?? 0}/{summary?.totalRaces ?? 0}
            </span>
          </div>
          {racePanelOpen ? (
            <ChevronUp className="w-5 h-5 text-parchment-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-parchment-500" />
          )}
        </button>

        {racePanelOpen && (
          <div className="px-5 pb-5 space-y-6">
            {TIER_ORDER.map((tier) => {
              const races = racesByTier[tier] || [];
              if (races.length === 0) return null;
              const hasUnreleased = races.some((r) => !r.isReleased);

              return (
                <div key={tier}>
                  {/* Tier Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TierBadge tier={tier} />
                      <span className="text-parchment-200 text-sm font-display">
                        {TIER_STYLES[tier]?.label || tier} Races
                      </span>
                      <span className="text-parchment-500 text-xs">
                        ({races.filter((r) => r.isReleased).length}/{races.length} released)
                      </span>
                    </div>
                    {hasUnreleased && (
                      <button
                        onClick={() => handleBulkReleaseRaceTier(tier)}
                        disabled={anyMutationPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-400 text-dark-500 font-display text-xs rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {bulkReleaseMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Unlock className="w-3 h-3" />
                        )}
                        Release All {TIER_STYLES[tier]?.label || tier}
                      </button>
                    )}
                  </div>

                  {/* Race Rows */}
                  <div className="space-y-1">
                    {races.map((race) => (
                      <div
                        key={race.id}
                        className="flex items-center justify-between py-2.5 px-3 rounded hover:bg-dark-400/30 transition-colors border border-transparent hover:border-dark-50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-parchment-200 text-sm font-medium truncate">
                            {race.contentName}
                          </span>
                          <TierBadge tier={race.tier} />
                          <StatusBadge isReleased={race.isReleased} />
                        </div>

                        <div className="flex items-center gap-4 shrink-0 ml-4">
                          {race.releasedAt && (
                            <span className="text-parchment-500 text-xs hidden lg:inline">
                              {formatDate(race.releasedAt)}
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-parchment-500 text-xs min-w-[60px] justify-end">
                            <Users className="w-3 h-3" />
                            <span>{race.playerCount}</span>
                          </div>
                          <button
                            onClick={() => handleToggleRelease(race.contentType, race.contentId, race.isReleased, race.playerCount)}
                            disabled={anyMutationPending}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-display text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              race.isReleased
                                ? 'bg-dark-500 text-parchment-500 border border-dark-50 hover:bg-dark-400 hover:text-parchment-300'
                                : 'bg-primary-400 text-dark-500 hover:bg-primary-300'
                            }`}
                          >
                            {race.isReleased ? (
                              <>
                                <Lock className="w-3 h-3" />
                                Lock
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3" />
                                Release
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. Town Release Panel                                                */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-dark-300 border border-dark-50 rounded-lg mb-6">
        <button
          onClick={() => setTownPanelOpen(!townPanelOpen)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-400" />
            <h2 className="font-display text-parchment-200 text-lg">Town Releases</h2>
            <span className="text-parchment-500 text-xs ml-2">
              {summary?.releasedTowns ?? 0}/{summary?.totalTowns ?? 0}
            </span>
          </div>
          {townPanelOpen ? (
            <ChevronUp className="w-5 h-5 text-parchment-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-parchment-500" />
          )}
        </button>

        {townPanelOpen && (
          <div className="px-5 pb-5 space-y-6">
            {sortedRegionNames.map((regionName) => {
              const towns = townsByRegion[regionName] || [];
              if (towns.length === 0) return null;
              const hasUnreleased = towns.some((t) => !t.isReleased);

              return (
                <div key={regionName}>
                  {/* Region Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-parchment-500" />
                      <span className="text-parchment-200 text-sm font-display">
                        {regionName}
                      </span>
                      <span className="text-parchment-500 text-xs">
                        ({towns.filter((t) => t.isReleased).length}/{towns.length} released)
                      </span>
                    </div>
                    {hasUnreleased && (
                      <button
                        onClick={() => handleBulkReleaseRegion(regionName)}
                        disabled={anyMutationPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-400 text-dark-500 font-display text-xs rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {bulkReleaseMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Unlock className="w-3 h-3" />
                        )}
                        Release All in {regionName}
                      </button>
                    )}
                  </div>

                  {/* Town Rows */}
                  <div className="space-y-1">
                    {towns.map((town) => (
                      <div
                        key={town.id}
                        className="flex items-center justify-between py-2.5 px-3 rounded hover:bg-dark-400/30 transition-colors border border-transparent hover:border-dark-50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-parchment-200 text-sm font-medium truncate">
                            {town.name}
                          </span>
                          <span className="text-parchment-500 text-xs hidden sm:inline">
                            {town.regionName}
                          </span>
                          <StatusBadge isReleased={town.isReleased} />
                        </div>

                        <div className="flex items-center gap-4 shrink-0 ml-4">
                          {town.releasedAt && (
                            <span className="text-parchment-500 text-xs hidden lg:inline">
                              {formatDate(town.releasedAt)}
                            </span>
                          )}
                          <div className="flex items-center gap-1 text-parchment-500 text-xs min-w-[60px] justify-end">
                            <Users className="w-3 h-3" />
                            <span>{town.playerCount}</span>
                          </div>
                          <button
                            onClick={() => handleToggleRelease('town', town.id, town.isReleased, town.playerCount)}
                            disabled={anyMutationPending}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-display text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              town.isReleased
                                ? 'bg-dark-500 text-parchment-500 border border-dark-50 hover:bg-dark-400 hover:text-parchment-300'
                                : 'bg-primary-400 text-dark-500 hover:bg-primary-300'
                            }`}
                          >
                            {town.isReleased ? (
                              <>
                                <Lock className="w-3 h-3" />
                                Lock
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3" />
                                Release
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
