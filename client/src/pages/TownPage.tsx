import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Store,
  Beer,
  Hammer,
  Landmark,
  Swords,
  Heart,
  ScrollText,
  Footprints,
  MapPin,
  Users,
  Wheat,
  Shield,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import QuestDialog, { type QuestOffer } from '../components/QuestDialog';
import { RealmPanel, RealmButton, RealmBadge } from '../components/ui/realm-index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TownResource {
  id: string;
  resourceType: string;
  abundance: number;
  respawnRate: number;
}

interface Town {
  id: string;
  name: string;
  region: { id: string; name: string; biome: string } | string;
  population: number;
  biome: string;
  description: string;
  features: string[];
  resources: TownResource[];
  buildings: { id: string; type: string; name: string; level: number }[];
  characters: TownCharacter[];
  taxRate?: number; // P1 #24: actual tax rate from server
}

interface TownCharacter {
  id: string;
  name: string;
  race: string;
  level: number;
}

interface PlayerCharacter {
  id: string;
  name: string;
  currentTownId: string | null;
  status: string;
}

interface QuestNpc {
  id: string;
  name: string;
  role: string;
  availableQuestCount: number;
  quests: QuestOffer[];
}

interface GatheringSpot {
  name: string;
  description: string;
  resourceType: string;
  item: { name: string; baseValue: number; icon: string; isFood: boolean };
  minYield: number;
  maxYield: number;
  icon: string;
}

interface GatheringSpotResponse {
  spot: GatheringSpot | null;
  canGather: boolean;
  actionsRemaining: number;
  reason: string | null;
}

interface GatherResult {
  success: boolean;
  gathered: {
    spotName: string;
    item: { name: string; icon: string; baseValue: number };
    quantity: number;
    message: string;
  };
  xpEarned?: number;
  actionsRemaining: number;
}

// ---------------------------------------------------------------------------
// Building definitions
// ---------------------------------------------------------------------------
interface BuildingDef {
  key: string;
  name: string;
  description: string;
  route: string;
  icon: typeof Store;
}

const BUILDINGS: BuildingDef[] = [
  { key: 'market', name: 'Market', description: 'Buy and sell goods', route: '/market', icon: Store },
  { key: 'tavern', name: 'Tavern', description: 'Rest, recruit, hear rumors', route: '/tavern', icon: Beer },
  { key: 'blacksmith', name: 'Blacksmith', description: 'Forge weapons and armor', route: '/crafting', icon: Hammer },
  { key: 'town_hall', name: 'Town Hall', description: 'Governance and laws', route: '/town-hall', icon: Landmark },
  { key: 'training_grounds', name: 'Training Grounds', description: 'Combat practice', route: '/training', icon: Swords },
  { key: 'temple', name: 'Temple', description: 'Healing and blessings', route: '/temple', icon: Heart },
  { key: 'jobs_board', name: 'Jobs Board', description: 'Find work and quests', route: '/jobs', icon: ScrollText },
  { key: 'stable', name: 'Stable', description: 'Manage mounts, prepare travel', route: '/stable', icon: Footprints },
];

// ---------------------------------------------------------------------------
// Biome color mapping
// ---------------------------------------------------------------------------
const BIOME_COLORS: Record<string, string> = {
  plains: 'bg-realm-success/20 text-realm-success',
  forest: 'bg-realm-success/20 text-realm-success',
  mountains: 'bg-realm-text-muted/20 text-realm-text-secondary',
  tundra: 'bg-realm-teal-400/20 text-realm-teal-300',
  desert: 'bg-realm-gold-500/20 text-realm-gold-300',
  swamp: 'bg-realm-success/20 text-realm-success',
  volcanic: 'bg-realm-danger/20 text-realm-danger',
  coastal: 'bg-realm-teal-300/20 text-realm-teal-300',
  hills: 'bg-realm-success/20 text-realm-success',
  underground: 'bg-realm-purple-400/20 text-realm-purple-300',
};

function getBiomeBadgeClass(biome: string): string {
  const key = biome.toLowerCase().split('/')[0].trim();
  return BIOME_COLORS[key] ?? 'bg-realm-bg-600/60 text-realm-text-secondary';
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TownPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch current player character
  const {
    data: character,
    isLoading: charLoading,
    error: charError,
  } = useQuery<PlayerCharacter>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      const res = await api.get('/characters/me');
      return res.data;
    },
  });

  // Fetch town data once we have the character's town
  const townId = character?.currentTownId;
  const {
    data: town,
    isLoading: townLoading,
    error: townError,
  } = useQuery<Town>({
    queryKey: ['town', townId],
    queryFn: async () => {
      const res = await api.get(`/towns/${townId}`);
      return res.data.town ?? res.data;
    },
    enabled: !!townId,
  });

  // Fetch other characters in town
  const {
    data: townCharacters,
    isLoading: charsLoading,
  } = useQuery<TownCharacter[]>({
    queryKey: ['town', townId, 'characters'],
    queryFn: async () => {
      const res = await api.get(`/towns/${townId}/characters`);
      return res.data.characters ?? res.data;
    },
    enabled: !!townId,
  });

  // Subscribe to player enter/leave town events for live updates
  useEffect(() => {
    if (!townId) return;
    const socket = getSocket();
    if (!socket) return;

    const handleEnter = (payload: { townId: string }) => {
      if (payload.townId === townId) {
        queryClient.invalidateQueries({ queryKey: ['town', townId, 'characters'] });
      }
    };
    const handleLeave = (payload: { townId: string }) => {
      if (payload.townId === townId) {
        queryClient.invalidateQueries({ queryKey: ['town', townId, 'characters'] });
      }
    };

    socket.on('player:enter-town', handleEnter);
    socket.on('player:leave-town', handleLeave);
    return () => {
      socket.off('player:enter-town', handleEnter);
      socket.off('player:leave-town', handleLeave);
    };
  }, [townId, queryClient]);

  // Quest NPCs
  const [selectedQuest, setSelectedQuest] = useState<QuestOffer | null>(null);

  const { data: questNpcs } = useQuery<QuestNpc[]>({
    queryKey: ['quests', 'npcs', townId],
    queryFn: async () => {
      const res = await api.get(`/quests/npcs/${townId}`);
      return res.data.npcs ?? res.data;
    },
    enabled: !!townId,
  });

  // Gathering spot query
  const {
    data: gatheringData,
    isLoading: gatheringLoading,
  } = useQuery<GatheringSpotResponse>({
    queryKey: ['gathering', 'spot', townId],
    queryFn: async () => {
      const raw = (await api.get('/gathering/spot')).data;
      return {
        spot: raw?.spot ?? null,
        canGather: raw?.canGather ?? false,
        actionsRemaining: raw?.actionsRemaining ?? 0,
        reason: raw?.reason ?? null,
      };
    },
    enabled: !!townId,
  });

  // Gather mutation
  const [gatherResult, setGatherResult] = useState<GatherResult | null>(null);

  const gatherMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/gathering/gather');
      return res.data;
    },
    onSuccess: (data: GatherResult) => {
      setGatherResult(data);
      queryClient.invalidateQueries({ queryKey: ['gathering', 'spot', townId] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      // Auto-hide result after 5 seconds
      setTimeout(() => setGatherResult(null), 5000);
    },
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (charLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-10 bg-realm-bg-800 rounded animate-pulse w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="h-24 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
            <div className="h-24 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
          </div>
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Error / no character
  // -------------------------------------------------------------------------
  if (charError || !character) {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-8">
        <h2 className="text-2xl font-display text-realm-gold-400 mb-4">No Character Found</h2>
        <p className="text-realm-text-secondary mb-6">You need to create a character before entering a town.</p>
        <RealmButton
          variant="primary"
          size="lg"
          onClick={() => navigate('/create-character')}
        >
          Create Character
        </RealmButton>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Traveling / no town
  // -------------------------------------------------------------------------
  if (!townId || character.status === 'traveling') {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-8">
        <Footprints className="w-16 h-16 text-realm-gold-400 mb-6" />
        <h2 className="text-3xl font-display text-realm-gold-400 mb-4">Traveling...</h2>
        <p className="text-realm-text-secondary mb-2 text-center max-w-md">
          You are currently on the road. The dust of the trail stretches behind you as your destination draws near.
        </p>
        <p className="text-realm-text-muted text-sm mb-8">Check the world map for your journey's progress.</p>
        <RealmButton
          variant="secondary"
          size="lg"
          onClick={() => navigate('/map')}
        >
          View World Map
        </RealmButton>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Town loading
  // -------------------------------------------------------------------------
  if (townLoading || !town) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-10 bg-realm-bg-800 rounded animate-pulse w-48 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="h-24 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
            <div className="h-24 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
          </div>
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Town error
  // -------------------------------------------------------------------------
  if (townError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-8">
        <h2 className="text-2xl font-display text-realm-danger mb-4">Failed to Load Town</h2>
        <p className="text-realm-text-secondary mb-6">Something went wrong fetching town data.</p>
        <RealmButton
          variant="secondary"
          onClick={() => navigate('/')}
        >
          Return Home
        </RealmButton>
      </div>
    );
  }

  // Filter out the current player from "other characters in town"
  const otherCharacters = (townCharacters ?? town.characters ?? []).filter(
    (c) => c.id !== character.id
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div>
      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display text-realm-gold-400">{town.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-realm-text-secondary text-sm flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {typeof town.region === 'object' ? town.region.name : town.region}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${getBiomeBadgeClass(town.biome)}`}>
                  {town.biome.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <RealmButton
                variant="secondary"
                size="sm"
                onClick={() => navigate('/map')}
              >
                World Map
              </RealmButton>
              <RealmButton
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
              >
                Character
              </RealmButton>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar -- Town Info */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Description */}
            <RealmPanel title="About">
              <p className="text-realm-text-secondary text-xs leading-relaxed">{town.description}</p>
            </RealmPanel>

            {/* Stats */}
            <RealmPanel title="Town Info">
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-realm-text-muted">Population</dt>
                  <dd className="text-realm-text-primary font-semibold">
                    <Users className="w-3 h-3 inline mr-1" />
                    {town.population.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-realm-text-muted">Region</dt>
                  <dd className="text-realm-text-primary">{typeof town.region === 'object' ? town.region.name : town.region}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-realm-text-muted">Biome</dt>
                  <dd className="text-realm-text-primary">{town.biome.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-realm-text-muted">Tax Rate</dt>
                  {/* P1 #24: Use actual server tax rate instead of hardcoded 10% */}
                  <dd className="text-realm-text-primary">{Math.round((town.taxRate ?? 0.10) * 100)}%</dd>
                </div>
              </dl>
            </RealmPanel>

            {/* Resources */}
            {town.resources && town.resources.length > 0 && (
              <RealmPanel title="Resources">
                <div className="flex flex-wrap gap-1.5">
                  {town.resources.map((r) => (
                    <span
                      key={r.id ?? r.resourceType}
                      className="text-xs bg-realm-bg-600/40 text-realm-text-secondary px-2 py-0.5 rounded"
                    >
                      {(r.resourceType ?? r).toString().toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </span>
                  ))}
                </div>
              </RealmPanel>
            )}

            {/* Features */}
            {town.features && town.features.length > 0 && (
              <RealmPanel title="Features">
                <ul className="space-y-1">
                  {town.features.map((f) => (
                    <li key={f} className="text-xs text-realm-text-secondary">
                      {f}
                    </li>
                  ))}
                </ul>
              </RealmPanel>
            )}
          </aside>

          {/* Main content */}
          <main className="lg:col-span-3 space-y-8">
            {/* Building cards grid */}
            <section>
              <h2 className="text-xl font-display text-realm-text-primary mb-4">Buildings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {BUILDINGS.map((building) => {
                  const Icon = building.icon;
                  return (
                    <Link
                      key={building.key}
                      to={building.route}
                      className="group relative bg-realm-bg-700 border border-realm-border rounded-md p-5 transition-all hover:border-realm-gold-500/50 hover:bg-realm-bg-700/80"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded bg-realm-bg-600/40 flex items-center justify-center group-hover:bg-realm-gold-400/10 transition-colors">
                          <Icon className="w-5 h-5 text-realm-gold-400" />
                        </div>
                        <div>
                          <h3 className="font-display text-realm-gold-400 group-hover:text-realm-gold-300 transition-colors">
                            {building.name}
                          </h3>
                          <p className="text-xs text-realm-text-muted mt-1">{building.description}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Gathering Spot */}
            {!gatheringLoading && gatheringData?.spot && (
              <section>
                <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                  <Wheat className="w-5 h-5 text-realm-gold-400" />
                  Gathering
                </h2>
                <div className="bg-realm-bg-700 border border-realm-border rounded-md p-5">
                  {/* Spot header */}
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">{gatheringData.spot.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-display text-lg text-realm-gold-400">{gatheringData.spot.name}</h3>
                      <p className="text-xs text-realm-text-muted capitalize">{gatheringData.spot.resourceType}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-realm-text-secondary mb-4">{gatheringData.spot.description}</p>

                  {/* What you'll get */}
                  <div className="flex items-center gap-3 mb-4 bg-realm-bg-800 rounded-md p-3">
                    <span className="text-xl">{gatheringData.spot.item.icon}</span>
                    <div className="flex-1">
                      <span className="text-sm text-realm-text-primary">{gatheringData.spot.item.name}</span>
                      <span className="text-xs text-realm-text-muted ml-2">
                        x{gatheringData.spot.minYield}-{gatheringData.spot.maxYield}
                      </span>
                    </div>
                    <span className="text-xs text-realm-gold-400">{gatheringData.spot.item.baseValue}g each</span>
                    {gatheringData.spot.item.isFood && (
                      <RealmBadge variant="uncommon">Edible</RealmBadge>
                    )}
                  </div>

                  {/* Gather button */}
                  <RealmButton
                    variant="primary"
                    className="w-full"
                    onClick={() => gatherMutation.mutate()}
                    disabled={!gatheringData.canGather || gatherMutation.isPending}
                  >
                    {gatherMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Gathering...
                      </>
                    ) : gatheringData.canGather ? (
                      'Gather (1 Daily Action)'
                    ) : gatheringData.reason === 'no_actions' ? (
                      'Daily Action Used'
                    ) : (
                      'Cannot Gather'
                    )}
                  </RealmButton>

                  {/* Gather result */}
                  {gatherResult?.success && (
                    <div className="mt-3 bg-realm-gold-500/10 border border-realm-gold-500/20 rounded-md p-3">
                      <p className="text-sm text-realm-gold-400 font-display mb-1">
                        {gatherResult.gathered.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{gatherResult.gathered.item.icon}</span>
                        <span className="text-sm text-realm-text-primary">
                          {gatherResult.gathered.item.name} x{gatherResult.gathered.quantity}
                        </span>
                        <span className="text-xs text-realm-text-muted">
                          ({gatherResult.gathered.item.baseValue * gatherResult.gathered.quantity}g value)
                        </span>
                        {gatherResult.xpEarned != null && gatherResult.xpEarned > 0 && (
                          <span className="text-xs text-realm-teal-400 font-display">
                            +{gatherResult.xpEarned} XP
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error message */}
                  {gatherMutation.isError && (
                    <div className="mt-3 bg-realm-danger/10 border border-realm-danger/20 rounded-md p-3">
                      <p className="text-sm text-realm-danger">
                        {(gatherMutation.error as any)?.response?.data?.error || 'Gathering failed. Try again.'}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Quest Givers */}
            {questNpcs && questNpcs.length > 0 && (
              <section>
                <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-realm-gold-400" />
                  Quest Givers
                </h2>
                <div className="bg-realm-bg-700 border border-realm-border rounded-md divide-y divide-realm-border">
                  {questNpcs.map((npc) => (
                    <div key={npc.id} className="px-5 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-realm-text-primary text-sm font-semibold">{npc.name}</span>
                          <span className="text-realm-text-muted text-xs ml-2">{npc.role}</span>
                        </div>
                        <span className="text-realm-gold-400 text-xs font-display">
                          {npc.availableQuestCount} quest{npc.availableQuestCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {npc.quests.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {npc.quests.map((quest) => (
                            <button
                              key={quest.id}
                              onClick={() => setSelectedQuest({ ...quest, npcName: npc.name })}
                              className="text-xs px-3 py-1.5 border border-realm-gold-500/30 text-realm-gold-400 rounded hover:bg-realm-gold-500/10 transition-colors"
                            >
                              {quest.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Players in town */}
            <section>
              <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-realm-gold-400" />
                Players in Town
              </h2>
              {charsLoading ? (
                <div className="bg-realm-bg-700 border border-realm-border rounded-md p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-6 bg-realm-bg-600 rounded animate-pulse" />
                  ))}
                </div>
              ) : otherCharacters.length === 0 ? (
                <div className="bg-realm-bg-700 border border-realm-border rounded-md p-6 text-center">
                  <p className="text-realm-text-muted text-sm">No other adventurers are in town right now.</p>
                </div>
              ) : (
                <div className="bg-realm-bg-700 border border-realm-border rounded-md divide-y divide-realm-border">
                  {otherCharacters.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/profile/${c.id}`)}
                      className="w-full px-5 py-3 flex items-center justify-between hover:bg-realm-bg-600/50 transition-colors text-left"
                    >
                      <div>
                        <span className="text-realm-text-primary text-sm font-semibold">{c.name}</span>
                        <span className="text-realm-text-muted text-xs ml-2">{c.race.toLowerCase().replace(/_/g, '-').replace(/\b\w/g, c2 => c2.toUpperCase())}</span>
                      </div>
                      <span className="text-xs text-realm-text-muted">Lv. {c.level}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      {/* Quest Dialog */}
      {selectedQuest && (
        <QuestDialog
          quest={selectedQuest}
          onClose={() => setSelectedQuest(null)}
          onAccepted={() => queryClient.invalidateQueries({ queryKey: ['quests', 'npcs', townId] })}
        />
      )}
    </div>
  );
}
