import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  Globe,
  MapPin,
  Users,
  Building2,
  Crown,
  X,
  Loader2,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { SkeletonCard } from '../../components/ui/LoadingSkeleton';
import ErrorMessage from '../../components/ui/ErrorMessage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Region {
  id: string;
  name: string;
  biome: string;
  description?: string;
  townCount: number;
}

interface Town {
  id: string;
  name: string;
  regionId: string;
  regionName: string;
  biome: string;
  population: number;
  description?: string;
  mayorName?: string;
  characterCount: number;
  buildingCount: number;
}

interface TownResource {
  id: string;
  resourceId: string;
  resourceName: string;
  abundance: number;
  respawnRate: number;
}

interface TownDetail {
  town: Town;
  resources: TownResource[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminWorldPage() {
  const queryClient = useQueryClient();

  // Expanded regions
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

  // Town detail modal
  const [selectedTown, setSelectedTown] = useState<Town | null>(null);

  // Edit forms
  const [editPopulation, setEditPopulation] = useState<number>(0);
  const [editDescription, setEditDescription] = useState<string>('');
  const [editResources, setEditResources] = useState<TownResource[]>([]);

  // Regions query
  const { data: regions, isLoading: regionsLoading, isError: regionsError, error: regionsErr, refetch: regionsRefetch } = useQuery<Region[]>({
    queryKey: ['admin', 'regions'],
    queryFn: async () => (await api.get('/admin/world/regions')).data,
  });

  // Town detail query
  const {
    data: townDetail,
    isLoading: townDetailLoading,
  } = useQuery<TownDetail>({
    queryKey: ['admin', 'town-detail', selectedTown?.id],
    queryFn: async () => (await api.get(`/admin/world/towns/${selectedTown!.id}`)).data,
    enabled: !!selectedTown,
  });

  // Update town mutation
  const updateTownMutation = useMutation({
    mutationFn: async ({ townId, updates }: { townId: string; updates: { population?: number; description?: string } }) => {
      return (await api.patch(`/admin/world/towns/${townId}`, updates)).data;
    },
    onSuccess: () => {
      toast.success('Town updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update town');
    },
  });

  // Update resources mutation
  const updateResourcesMutation = useMutation({
    mutationFn: async ({ townId, resources }: { townId: string; resources: { resourceId: string; abundance: number; respawnRate: number }[] }) => {
      return (await api.patch(`/admin/world/towns/${townId}/resources`, { resources })).data;
    },
    onSuccess: () => {
      toast.success('Resources updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'town-detail'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update resources');
    },
  });

  // Toggle region expand
  const toggleRegion = useCallback((regionId: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(regionId)) {
        next.delete(regionId);
      } else {
        next.add(regionId);
      }
      return next;
    });
  }, []);

  // Open town detail
  const handleOpenTown = useCallback((town: Town) => {
    setSelectedTown(town);
    setEditPopulation(town.population);
    setEditDescription(town.description || '');
    setEditResources([]);
  }, []);

  // When townDetail loads, populate resource form
  const populateResources = useCallback(() => {
    if (townDetail?.resources) {
      setEditResources(townDetail.resources.map((r) => ({ ...r })));
    }
  }, [townDetail]);

  // Save town info
  const handleSaveTown = useCallback(() => {
    if (!selectedTown) return;
    updateTownMutation.mutate({
      townId: selectedTown.id,
      updates: { population: editPopulation, description: editDescription },
    });
  }, [selectedTown, editPopulation, editDescription, updateTownMutation]);

  // Save resources
  const handleSaveResources = useCallback(() => {
    if (!selectedTown) return;
    updateResourcesMutation.mutate({
      townId: selectedTown.id,
      resources: editResources.map((r) => ({
        resourceId: r.resourceId,
        abundance: r.abundance,
        respawnRate: r.respawnRate,
      })),
    });
  }, [selectedTown, editResources, updateResourcesMutation]);

  // Update a resource field
  const updateResource = useCallback((index: number, field: 'abundance' | 'respawnRate', value: number) => {
    setEditResources((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-display text-primary-400 mb-6">World Management</h1>

      {regionsLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : regionsError ? (
        <ErrorMessage error={regionsErr} onRetry={regionsRefetch} />
      ) : !regions?.length ? (
        <div className="text-center py-20">
          <Globe className="w-12 h-12 text-parchment-500/30 mx-auto mb-4" />
          <p className="text-parchment-500">No regions found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {regions.map((region) => (
            <RegionAccordion
              key={region.id}
              region={region}
              isExpanded={expandedRegions.has(region.id)}
              onToggle={() => toggleRegion(region.id)}
              onSelectTown={handleOpenTown}
            />
          ))}
        </div>
      )}

      {/* Town Detail Modal */}
      {selectedTown && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={() => setSelectedTown(null)}
        >
          <div
            className="bg-dark-400 border border-dark-50 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-50 flex-shrink-0">
              <div>
                <h3 className="text-lg font-display text-primary-400">{selectedTown.name}</h3>
                <p className="text-parchment-500 text-xs">
                  {selectedTown.regionName} - {selectedTown.biome}
                </p>
              </div>
              <button
                onClick={() => setSelectedTown(null)}
                className="text-parchment-500 hover:text-parchment-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-6">
              {/* Town Info */}
              <div>
                <h4 className="font-display text-parchment-200 text-sm mb-3">Town Information</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-parchment-500 text-xs mb-1 block">Population</label>
                    <input
                      type="number"
                      value={editPopulation}
                      onChange={(e) => setEditPopulation(parseInt(e.target.value, 10) || 0)}
                      min="0"
                      className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-parchment-500 text-xs mb-1 block">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-dark-400 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400 focus:outline-none resize-none"
                    />
                  </div>
                  <button
                    onClick={handleSaveTown}
                    disabled={updateTownMutation.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateTownMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save Town Info
                  </button>
                </div>
              </div>

              {/* Resources */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-display text-parchment-200 text-sm">Resources</h4>
                  {townDetail?.resources && editResources.length === 0 && (
                    <button
                      onClick={populateResources}
                      className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      Edit Resources
                    </button>
                  )}
                </div>

                {townDetailLoading ? (
                  <div className="space-y-2 animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-10 bg-dark-500 rounded" />
                    ))}
                  </div>
                ) : editResources.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-[1fr_100px_100px] gap-2 text-xs text-parchment-500 font-display px-2">
                      <span>Resource</span>
                      <span>Abundance</span>
                      <span>Respawn Rate</span>
                    </div>
                    {editResources.map((resource, idx) => (
                      <div
                        key={resource.resourceId}
                        className="grid grid-cols-[1fr_100px_100px] gap-2 items-center bg-dark-500/50 rounded px-2 py-1.5"
                      >
                        <span className="text-parchment-300 text-sm truncate">{resource.resourceName}</span>
                        <input
                          type="number"
                          value={resource.abundance}
                          onChange={(e) => updateResource(idx, 'abundance', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.1"
                          className="w-full bg-dark-400 border border-dark-50 rounded px-2 py-1 text-parchment-300 text-xs focus:border-primary-400 focus:outline-none"
                        />
                        <input
                          type="number"
                          value={resource.respawnRate}
                          onChange={(e) => updateResource(idx, 'respawnRate', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.1"
                          className="w-full bg-dark-400 border border-dark-50 rounded px-2 py-1 text-parchment-300 text-xs focus:border-primary-400 focus:outline-none"
                        />
                      </div>
                    ))}
                    <button
                      onClick={handleSaveResources}
                      disabled={updateResourcesMutation.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                      {updateResourcesMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      Save Resources
                    </button>
                  </div>
                ) : townDetail?.resources && townDetail.resources.length > 0 ? (
                  <div className="bg-dark-500/50 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-dark-50 text-left">
                          <th className="px-3 py-2 text-parchment-500 text-xs font-display">Resource</th>
                          <th className="px-3 py-2 text-parchment-500 text-xs font-display">Abundance</th>
                          <th className="px-3 py-2 text-parchment-500 text-xs font-display">Respawn Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-50">
                        {townDetail.resources.map((r) => (
                          <tr key={r.resourceId}>
                            <td className="px-3 py-2 text-parchment-300 text-sm">{r.resourceName}</td>
                            <td className="px-3 py-2 text-parchment-400 text-sm">{r.abundance}</td>
                            <td className="px-3 py-2 text-parchment-400 text-sm">{r.respawnRate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-parchment-500 text-xs italic">No resources configured for this town.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Region Accordion Sub-component
// ---------------------------------------------------------------------------
function RegionAccordion({
  region,
  isExpanded,
  onToggle,
  onSelectTown,
}: {
  region: Region;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectTown: (town: Town) => void;
}) {
  // Fetch towns for this region when expanded
  const { data: towns, isLoading } = useQuery<Town[]>({
    queryKey: ['admin', 'region-towns', region.id],
    queryFn: async () => {
      const res = await api.get('/admin/world/towns', { params: { regionId: region.id, pageSize: '100' } });
      return res.data.towns ?? res.data;
    },
    enabled: isExpanded,
  });

  return (
    <div className="bg-dark-300 border border-dark-50 rounded-lg overflow-hidden">
      {/* Region Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-dark-400/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-primary-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-parchment-500 flex-shrink-0" />
          )}
          <div>
            <h3 className="font-display text-parchment-200 text-sm">{region.name}</h3>
            <p className="text-parchment-500 text-xs">{region.biome}</p>
          </div>
        </div>
        <span className="text-parchment-500 text-xs font-display">
          {region.townCount} town{region.townCount !== 1 ? 's' : ''}
        </span>
      </button>

      {/* Towns Grid */}
      {isExpanded && (
        <div className="border-t border-dark-50 px-5 py-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 bg-dark-500 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !towns?.length ? (
            <p className="text-parchment-500 text-xs italic">No towns in this region.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {towns.map((town) => (
                <div
                  key={town.id}
                  onClick={() => onSelectTown(town)}
                  className="bg-dark-500 border border-dark-50 rounded-lg p-4 hover:border-primary-400/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-display text-parchment-200 text-sm">{town.name}</h4>
                    <span className="text-[10px] text-parchment-500 bg-dark-400 px-1.5 py-0.5 rounded">
                      {town.biome}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-parchment-400">
                      <Users className="w-3 h-3" />
                      <span>Pop: {town.population.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-parchment-400">
                      <MapPin className="w-3 h-3" />
                      <span>{town.characterCount} character{town.characterCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-parchment-400">
                      <Building2 className="w-3 h-3" />
                      <span>{town.buildingCount} building{town.buildingCount !== 1 ? 's' : ''}</span>
                    </div>
                    {town.mayorName && (
                      <div className="flex items-center gap-1.5 text-xs text-primary-400">
                        <Crown className="w-3 h-3" />
                        <span>Mayor: {town.mayorName}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
