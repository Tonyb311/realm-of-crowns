import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { TOWN_GATHERING_SPOTS } from '@shared/data/gathering';
import type { GatheringSpotDef } from '@shared/data/gathering';
import { RealmCard } from '../ui/RealmCard';
import { RealmBadge } from '../ui/RealmBadge';
import { RealmPanel } from '../ui/RealmPanel';
import { ChevronDown, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CodexWorldProps {
  searchQuery: string;
}

interface RegionData {
  id: string;
  name: string;
  description?: string;
  biome: string;
  levelMin?: number;
  levelMax?: number;
  color?: string;
}

interface TownData {
  id: string;
  name: string;
  regionId: string;
  regionName?: string;
  description?: string;
  biome?: string;
  x?: number;
  y?: number;
  mapX?: number;
  mapY?: number;
  population?: number;
  released?: boolean;
}

// ---------------------------------------------------------------------------
// Pre-build a case-insensitive map for gathering spots
// ---------------------------------------------------------------------------
const gatheringSpotsByLowerName = new Map<string, GatheringSpotDef>();
for (const [townName, spotDef] of Object.entries(TOWN_GATHERING_SPOTS)) {
  gatheringSpotsByLowerName.set(townName.toLowerCase(), spotDef);
}

function getGatheringSpotForTown(townName: string): GatheringSpotDef | null {
  return gatheringSpotsByLowerName.get(townName.toLowerCase()) ?? null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function matchesSearch(query: string, ...values: string[]): boolean {
  const lower = query.toLowerCase();
  return values.some((v) => (v || '').toLowerCase().includes(lower));
}

function formatLevelRange(min?: number, max?: number): string {
  if (min != null && max != null) return `${min}–${max}`;
  if (min != null) return `${min}+`;
  return '';
}

// Map biome strings to badge variants for visual variety
const BIOME_VARIANT: Record<string, 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'default'> = {
  plains: 'common',
  hills: 'common',
  forest: 'uncommon',
  mountain: 'rare',
  mountains: 'rare',
  swamp: 'epic',
  tundra: 'rare',
  coastal: 'uncommon',
  badlands: 'epic',
  underground: 'legendary',
  volcanic: 'legendary',
  enchanted: 'legendary',
  wilderness: 'uncommon',
  industrial: 'rare',
  elemental: 'epic',
  deathlands: 'epic',
};

function getBiomeVariant(biome?: string): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'default' {
  if (!biome) return 'default';
  const lower = biome.toLowerCase();
  // Check for partial matches (e.g. "Ancient Forest" -> "forest")
  for (const [key, variant] of Object.entries(BIOME_VARIANT)) {
    if (lower.includes(key)) return variant;
  }
  return 'default';
}

// Map resource types to display labels
const RESOURCE_TYPE_LABELS: Record<string, string> = {
  orchard: 'Orchard',
  fishing: 'Fishing',
  berry: 'Berry Patch',
  herb: 'Herb Garden',
  mine: 'Mine',
  forest: 'Forest',
  quarry: 'Quarry',
  clay: 'Clay Pit',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CodexWorld({ searchQuery }: CodexWorldProps) {
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [expandedTowns, setExpandedTowns] = useState<Set<string>>(new Set());

  // ---- Fetch world map data (towns + regions) ----
  const { data: mapData, isLoading: mapLoading } = useQuery({
    queryKey: ['codex-world-map'],
    queryFn: async () => {
      const res = await api.get('/world/map');
      return res.data as { towns: TownData[]; regions: RegionData[]; routes: any[] };
    },
  });

  // ---- Fetch full region data (includes description and level range) ----
  const { data: regionsData, isLoading: regionsLoading } = useQuery({
    queryKey: ['codex-world-regions'],
    queryFn: async () => {
      const res = await api.get('/world/regions');
      return res.data as { regions: RegionData[] };
    },
  });

  const isLoading = mapLoading || regionsLoading;

  // Merge region data: use regionsData for description/level info, mapData for the list
  const regionMap = useMemo(() => {
    const map = new Map<string, RegionData>();
    // Start with full region data (has description, levelMin, levelMax)
    for (const r of (regionsData?.regions || [])) {
      map.set(r.id, r);
    }
    // Overlay with map data (has color, and ensures we only show regions with towns)
    for (const r of (mapData?.regions || [])) {
      const existing = map.get(r.id);
      if (existing) {
        map.set(r.id, { ...existing, ...r, description: existing.description || r.description });
      } else {
        map.set(r.id, r);
      }
    }
    return map;
  }, [mapData, regionsData]);

  const regions: RegionData[] = useMemo(() => {
    return Array.from(regionMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [regionMap]);

  const towns: TownData[] = useMemo(() => {
    return mapData?.towns || [];
  }, [mapData]);

  // ---- Filter regions and towns based on search ----
  const { filteredRegions, filteredTownIds } = useMemo(() => {
    if (!searchQuery.trim()) {
      return {
        filteredRegions: regions,
        filteredTownIds: new Set(towns.map((t) => t.id)),
      };
    }

    const matchingTownIds = new Set<string>();
    const matchingRegionIds = new Set<string>();

    // Check which towns match
    for (const town of towns) {
      const spot = getGatheringSpotForTown(town.name);
      if (
        matchesSearch(searchQuery, town.name, town.description || '', town.biome || '') ||
        (spot && matchesSearch(searchQuery, spot.name, spot.resourceType, spot.item.templateName))
      ) {
        matchingTownIds.add(town.id);
        matchingRegionIds.add(town.regionId);
      }
    }

    // Check which regions match by name
    for (const region of regions) {
      if (matchesSearch(searchQuery, region.name, region.description || '', region.biome || '')) {
        matchingRegionIds.add(region.id);
        // When a region matches, include all its towns
        for (const town of towns) {
          if (town.regionId === region.id) {
            matchingTownIds.add(town.id);
          }
        }
      }
    }

    const filtered = regions.filter((r) => matchingRegionIds.has(r.id));
    return { filteredRegions: filtered, filteredTownIds: matchingTownIds };
  }, [searchQuery, regions, towns]);

  // ---- Toggle region accordion ----
  const toggleRegion = (regionId: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(regionId)) {
        next.delete(regionId);
      } else {
        next.add(regionId);
      }
      return next;
    });
  };

  // ---- Toggle town expansion ----
  const toggleTown = (townId: string) => {
    setExpandedTowns((prev) => {
      const next = new Set(prev);
      if (next.has(townId)) {
        next.delete(townId);
      } else {
        next.add(townId);
      }
      return next;
    });
  };

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-realm-bg-700 rounded animate-pulse w-48" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-realm-bg-700 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  // ---- Empty state ----
  if (filteredRegions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-realm-text-muted font-body text-sm">
          {searchQuery.trim()
            ? `No regions or towns match your search for "${searchQuery}".`
            : 'No world data available.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary counts */}
      <div className="flex items-center gap-4 text-sm font-body text-realm-text-muted">
        <span>
          <span className="text-realm-text-secondary font-medium">{regions.length}</span> regions
        </span>
        <span className="text-realm-text-muted">|</span>
        <span>
          <span className="text-realm-text-secondary font-medium">{towns.length}</span> towns
        </span>
        {searchQuery.trim() && (
          <>
            <span className="text-realm-text-muted">|</span>
            <span>
              Showing{' '}
              <span className="text-realm-gold-400 font-medium">{filteredRegions.length}</span> regions,{' '}
              <span className="text-realm-gold-400 font-medium">{filteredTownIds.size}</span> towns
            </span>
          </>
        )}
      </div>

      {/* Region accordion list */}
      <div className="space-y-3">
        {filteredRegions.map((region) => {
          const isExpanded = expandedRegions.has(region.id);
          const regionTowns = towns
            .filter((t) => t.regionId === region.id && filteredTownIds.has(t.id))
            .sort((a, b) => a.name.localeCompare(b.name));
          const levelRange = formatLevelRange(region.levelMin, region.levelMax);

          return (
            <RealmPanel key={region.id} variant="default" className="overflow-hidden">
              {/* Region header (clickable accordion toggle) */}
              <div
                className="flex items-center justify-between cursor-pointer select-none -mx-5 -my-4 px-5 py-4 hover:bg-realm-bg-600/50 transition-colors"
                onClick={() => toggleRegion(region.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleRegion(region.id);
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-realm-gold-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-realm-text-muted flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h3 className="font-display text-lg text-realm-gold-400 truncate">
                      {region.name}
                    </h3>
                    {region.description && (
                      <p className="text-sm font-body text-realm-text-muted truncate mt-0.5">
                        {region.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  {region.biome && (
                    <RealmBadge variant={getBiomeVariant(region.biome)}>
                      {region.biome}
                    </RealmBadge>
                  )}
                  {levelRange && (
                    <span className="text-xs font-body text-realm-text-muted whitespace-nowrap">
                      Lv {levelRange}
                    </span>
                  )}
                  <span className="text-xs font-body text-realm-text-muted whitespace-nowrap">
                    {regionTowns.length} town{regionTowns.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Expanded region content: town list */}
              {isExpanded && (
                <div className="mt-4 space-y-3 border-t border-realm-border pt-4">
                  {regionTowns.length === 0 ? (
                    <p className="text-realm-text-muted text-sm font-body py-2">
                      No towns found in this region.
                    </p>
                  ) : (
                    regionTowns.map((town) => {
                      const isTownExpanded = expandedTowns.has(town.id);
                      const gatheringSpot = getGatheringSpotForTown(town.name);

                      return (
                        <RealmCard
                          key={town.id}
                          onClick={() => toggleTown(town.id)}
                          selected={isTownExpanded}
                          className="flex flex-col"
                        >
                          {/* Town header row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {isTownExpanded ? (
                                <ChevronDown className="w-4 h-4 text-realm-gold-400 flex-shrink-0 mt-0.5" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-realm-text-muted flex-shrink-0 mt-0.5" />
                              )}
                              <div className="min-w-0">
                                <h4 className="font-display text-base text-realm-text-primary">
                                  {town.name}
                                </h4>
                              </div>
                            </div>
                            {town.biome && (
                              <RealmBadge variant={getBiomeVariant(town.biome)}>
                                {town.biome}
                              </RealmBadge>
                            )}
                          </div>

                          {/* Town description */}
                          {town.description && (
                            <p className="text-sm font-body text-realm-text-secondary mt-2 ml-6">
                              {town.description}
                            </p>
                          )}

                          {/* Expanded town: gathering spot info */}
                          {isTownExpanded && (
                            <div className="mt-3 ml-6 bg-realm-bg-800 border border-realm-border rounded p-3">
                              <h5 className="font-display text-sm text-realm-gold-400 mb-2">
                                Gathering Spot
                              </h5>

                              {gatheringSpot ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg" role="img" aria-label={gatheringSpot.resourceType}>
                                      {gatheringSpot.icon}
                                    </span>
                                    <span className="font-body text-sm text-realm-text-primary font-medium">
                                      {gatheringSpot.name}
                                    </span>
                                  </div>

                                  <p className="text-xs font-body text-realm-text-secondary">
                                    {gatheringSpot.description}
                                  </p>

                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-body text-realm-text-muted">
                                    <span>
                                      Type:{' '}
                                      <span className="text-realm-text-secondary">
                                        {RESOURCE_TYPE_LABELS[gatheringSpot.resourceType] || gatheringSpot.resourceType}
                                      </span>
                                    </span>
                                    <span>
                                      Yields:{' '}
                                      <span className="text-realm-text-secondary">
                                        {gatheringSpot.item?.templateName || 'Unknown'}
                                      </span>
                                    </span>
                                    <span>
                                      Amount:{' '}
                                      <span className="text-realm-text-secondary">
                                        {gatheringSpot.minYield}–{gatheringSpot.maxYield}
                                      </span>
                                    </span>
                                    <span>
                                      Value:{' '}
                                      <span className="text-realm-text-secondary">
                                        {gatheringSpot.item?.baseValue ?? '?'} gold
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm font-body text-realm-text-muted">
                                  No gathering data available.
                                </p>
                              )}
                            </div>
                          )}
                        </RealmCard>
                      );
                    })
                  )}
                </div>
              )}
            </RealmPanel>
          );
        })}
      </div>
    </div>
  );
}
