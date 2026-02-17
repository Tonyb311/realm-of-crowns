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
  MessageSquare,
  CheckCircle,
  Home,
  Package,
} from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import QuestDialog, { type QuestOffer } from '../components/QuestDialog';
import { RealmPanel, RealmButton } from '../components/ui/realm-index';
import PartyPanel from '../components/party/PartyPanel';
import AssetPanel from '../components/assets/AssetPanel';
import { ActionConfirmModal } from '../components/hud/ActionConfirmModal';

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
  homeTownId: string | null;
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
  committedAction?: {
    type: string;
    detail: string;
    status: string;
  } | null;
}

interface ActionStatusResponse {
  gameDay: number;
  actionUsed: boolean;
  actionType: string | null;
  resetsAt: string;
  timeUntilResetMs: number;
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
  freeAction?: boolean;
}

const BUILDINGS: BuildingDef[] = [
  { key: 'market', name: 'Market', description: 'Buy and sell goods', route: '/market', icon: Store, freeAction: true },
  { key: 'tavern', name: 'Tavern', description: 'Rest, recruit, hear rumors', route: '/tavern', icon: Beer, freeAction: true },
  { key: 'blacksmith', name: 'Blacksmith', description: 'Forge weapons and armor', route: '/crafting', icon: Hammer },
  { key: 'town_hall', name: 'Town Hall', description: 'Governance and laws', route: '/town-hall', icon: Landmark, freeAction: true },
  { key: 'notice_board', name: 'Notice Board', description: 'Travel advisories and road reports', route: '/travel', icon: Swords },
  { key: 'temple', name: 'Temple', description: 'Healing and blessings', route: '/temple', icon: Heart, freeAction: true },
  { key: 'jobs_board', name: 'Jobs Board', description: 'Find work and quests', route: '/jobs', icon: ScrollText, freeAction: true },
  { key: 'stable', name: 'Stable', description: 'Manage mounts, prepare travel', route: '/stable', icon: Footprints, freeAction: true },
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

  // Action status query -- is daily action used?
  const { data: actionStatus } = useQuery<ActionStatusResponse>({
    queryKey: ['game', 'action-status'],
    queryFn: async () => (await api.get('/game/action-status')).data,
    enabled: !!townId,
    refetchInterval: 60_000,
  });

  // House in current town query (only fetch for home town)
  const isHomeTown = !!character && !!townId && character.homeTownId === townId;
  const { data: houseData, isLoading: houseLoading } = useQuery<{ hasHouse: boolean; isHomeTown?: boolean; house?: { id: string; name: string; storageSlots: number; storageUsed: number } }>({
    queryKey: ['houses', 'town', townId],
    queryFn: async () => (await api.get(`/houses/town/${townId}`)).data,
    enabled: !!townId && isHomeTown,
  });

  // Confirm modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Gather mutation
  const [gatherResult, setGatherResult] = useState<GatherResult | null>(null);

  const gatherMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/gathering/gather');
      return res.data;
    },
    onSuccess: (data: GatherResult) => {
      setGatherResult(data);
      setShowConfirmModal(false);
      queryClient.invalidateQueries({ queryKey: ['gathering', 'spot', townId] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['character', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['game', 'action-status'] });
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

            {/* Gathering */}
            {!gatheringLoading && gatheringData?.spot && (
              <div
                className={`bg-realm-bg-700 border rounded-lg overflow-hidden transition-colors ${
                  actionStatus?.actionUsed
                    ? 'border-realm-border opacity-60'
                    : 'border-realm-border hover:border-realm-gold-500/40 cursor-pointer'
                }`}
                onClick={() => {
                  if (actionStatus?.actionUsed || gatherMutation.isPending) return;
                  setShowConfirmModal(true);
                }}
              >
                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                  <h3 className="font-display text-realm-gold-400 text-sm flex items-center gap-1.5">
                    <Wheat className="w-3.5 h-3.5" />
                    Gathering
                  </h3>
                  <span className="text-[9px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded bg-realm-gold-500/10 border border-realm-gold-500/30 text-realm-gold-400">
                    Daily Action
                  </span>
                </div>
                <div className="px-4 pb-3">
                  {actionStatus?.actionUsed ? (
                    <div className="flex items-center gap-2 py-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-realm-text-muted flex-shrink-0" />
                      <span className="text-[11px] text-realm-text-muted">Action committed</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 py-1">
                      <span className="text-lg leading-none mt-0.5">{gatheringData.spot.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-realm-text-primary truncate">{gatheringData.spot.name}</p>
                        <span className="text-[11px] text-realm-text-muted">
                          {gatheringData.spot.item.name} (x{gatheringData.spot.minYield}-{gatheringData.spot.maxYield})
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gather result toast */}
                {gatherResult?.success && (
                  <div className="px-4 pb-3">
                    <div className="bg-realm-gold-500/10 border border-realm-gold-500/20 rounded p-2">
                      <div className="flex items-center gap-2">
                        <span>{gatherResult.gathered.item.icon}</span>
                        <span className="text-xs text-realm-gold-400 font-display">
                          {gatherResult.gathered.item.name} x{gatherResult.gathered.quantity}
                        </span>
                        {gatherResult.xpEarned != null && gatherResult.xpEarned > 0 && (
                          <span className="text-[10px] text-realm-teal-400 font-display">
                            +{gatherResult.xpEarned} XP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Gather error */}
                {gatherMutation.isError && (
                  <div className="px-4 pb-3">
                    <p className="text-[11px] text-realm-danger">
                      {(gatherMutation.error as any)?.response?.data?.error || 'Gathering failed.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Private Asset Ownership */}
            {character && town && (
              <AssetPanel
                townId={town.id}
                characterId={character.id}
                isHomeTown={isHomeTown}
                homeTownName={town.name}
              />
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

            {/* Party */}
            <PartyPanel characterId={character.id} />
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
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-realm-gold-400 group-hover:text-realm-gold-300 transition-colors">
                              {building.name}
                            </h3>
                            {building.freeAction && (
                              <span className="text-[9px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded bg-realm-success/10 border border-realm-success/30 text-realm-success">
                                Free
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-realm-text-muted mt-1">{building.description}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Housing Tile — only in home town */}
              {isHomeTown && !houseLoading && houseData?.hasHouse && (
                <div className="mt-4">
                  <Link
                    to="/housing"
                    className="group relative bg-realm-bg-700 border border-realm-gold-500/30 rounded-md p-5 transition-all hover:border-realm-gold-500/50 hover:bg-realm-bg-700/80 block"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded bg-realm-gold-400/10 flex items-center justify-center">
                        <Home className="w-5 h-5 text-realm-gold-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-realm-gold-400 group-hover:text-realm-gold-300 transition-colors">
                            {houseData.house?.name ?? 'Your Cottage'}
                          </h3>
                          <span className="text-[9px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded bg-realm-success/10 border border-realm-success/30 text-realm-success">
                            Home
                          </span>
                        </div>
                        <p className="text-xs text-realm-text-muted mt-1 flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          Storage: {houseData.house?.storageUsed ?? 0}/{houseData.house?.storageSlots ?? 20} slots
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </section>

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

      {/* Action Confirm Modal */}
      <ActionConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={() => gatherMutation.mutate()}
        actionType="Gather"
        actionDetail={
          gatheringData?.spot
            ? `${gatheringData.spot.item.name} at ${gatheringData.spot.name}`
            : 'Unknown resource'
        }
        isPending={gatherMutation.isPending}
      />
    </div>
  );
}
