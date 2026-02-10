import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { SkeletonCard, SkeletonRow } from '../components/ui/LoadingSkeleton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Town {
  id: string;
  name: string;
  region: string;
  population: number;
  biome: string;
  description: string;
  features: string[];
  resources: string[];
  buildings: string[];
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
  plains: 'bg-green-800/60 text-green-300',
  forest: 'bg-forest/60 text-green-300',
  mountains: 'bg-stone-700/60 text-stone-300',
  tundra: 'bg-cyan-900/60 text-cyan-300',
  desert: 'bg-amber-800/60 text-amber-300',
  swamp: 'bg-emerald-900/60 text-emerald-300',
  volcanic: 'bg-red-900/60 text-red-300',
  coastal: 'bg-blue-800/60 text-blue-300',
  hills: 'bg-lime-900/60 text-lime-300',
  underground: 'bg-purple-900/60 text-purple-300',
};

function getBiomeBadgeClass(biome: string): string {
  const key = biome.toLowerCase().split('/')[0].trim();
  return BIOME_COLORS[key] ?? 'bg-dark-50/60 text-parchment-300';
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
      return res.data;
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
      return res.data;
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
    queryFn: async () => (await api.get(`/quests/npcs/${townId}`)).data,
    enabled: !!townId,
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (charLoading) {
    return (
      <div className="min-h-screen bg-dark-500 pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-10 bg-dark-400 rounded animate-pulse w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
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
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h2 className="text-2xl font-display text-primary-400 mb-4">No Character Found</h2>
        <p className="text-parchment-300 mb-6">You need to create a character before entering a town.</p>
        <button
          onClick={() => navigate('/create-character')}
          className="px-8 py-3 bg-primary-400 text-dark-500 font-display text-lg rounded hover:bg-primary-300 transition-colors"
        >
          Create Character
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Traveling / no town
  // -------------------------------------------------------------------------
  if (!townId || character.status === 'traveling') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <Footprints className="w-16 h-16 text-primary-400 mb-6" />
        <h2 className="text-3xl font-display text-primary-400 mb-4">Traveling...</h2>
        <p className="text-parchment-300 mb-2 text-center max-w-md">
          You are currently on the road. The dust of the trail stretches behind you as your destination draws near.
        </p>
        <p className="text-parchment-500 text-sm mb-8">Check the world map for your journey's progress.</p>
        <button
          onClick={() => navigate('/map')}
          className="px-8 py-3 border border-primary-400 text-primary-400 font-display text-lg rounded hover:bg-dark-300 transition-colors"
        >
          View World Map
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Town loading
  // -------------------------------------------------------------------------
  if (townLoading || !town) {
    return (
      <div className="min-h-screen bg-dark-500 pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-10 bg-dark-400 rounded animate-pulse w-48 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
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
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h2 className="text-2xl font-display text-blood-light mb-4">Failed to Load Town</h2>
        <p className="text-parchment-300 mb-6">Something went wrong fetching town data.</p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 border border-primary-400 text-primary-400 font-display rounded hover:bg-dark-300 transition-colors"
        >
          Return Home
        </button>
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
    <div className="min-h-screen bg-dark-500 pt-12">
      {/* Header */}
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-display text-primary-400">{town.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-parchment-300 text-sm flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {town.region}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded ${getBiomeBadgeClass(town.biome)}`}>
                  {town.biome}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/map')}
                className="px-5 py-2 border border-primary-400/60 text-primary-400 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                World Map
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-5 py-2 border border-parchment-500/40 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Character
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar — Town Info */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Description */}
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
              <h3 className="font-display text-primary-400 text-sm mb-3">About</h3>
              <p className="text-parchment-300 text-xs leading-relaxed">{town.description}</p>
            </div>

            {/* Stats */}
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
              <h3 className="font-display text-primary-400 text-sm mb-3">Town Info</h3>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-parchment-500">Population</dt>
                  <dd className="text-parchment-200 font-semibold">
                    <Users className="w-3 h-3 inline mr-1" />
                    {town.population.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-parchment-500">Region</dt>
                  <dd className="text-parchment-200">{town.region}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-parchment-500">Biome</dt>
                  <dd className="text-parchment-200 capitalize">{town.biome}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-parchment-500">Tax Rate</dt>
                  {/* P1 #24: Use actual server tax rate instead of hardcoded 10% */}
                  <dd className="text-parchment-200">{Math.round((town.taxRate ?? 0.10) * 100)}%</dd>
                </div>
              </dl>
            </div>

            {/* Resources */}
            {town.resources && town.resources.length > 0 && (
              <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
                <h3 className="font-display text-primary-400 text-sm mb-3 flex items-center gap-1.5">
                  <Wheat className="w-3.5 h-3.5" />
                  Resources
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {town.resources.map((r) => (
                    <span
                      key={r}
                      className="text-xs bg-dark-50/40 text-parchment-300 px-2 py-0.5 rounded"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Features */}
            {town.features && town.features.length > 0 && (
              <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
                <h3 className="font-display text-primary-400 text-sm mb-3 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  Features
                </h3>
                <ul className="space-y-1">
                  {town.features.map((f) => (
                    <li key={f} className="text-xs text-parchment-300">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>

          {/* Main content */}
          <main className="lg:col-span-3 space-y-8">
            {/* Building cards grid */}
            <section>
              <h2 className="text-xl font-display text-parchment-200 mb-4">Buildings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {BUILDINGS.map((building) => {
                  const Icon = building.icon;
                  return (
                    <Link
                      key={building.key}
                      to={building.route}
                      className="group relative bg-dark-300 border-2 border-dark-50 rounded-lg p-5 transition-all hover:border-primary-400 hover:bg-dark-300/80"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded bg-dark-50/40 flex items-center justify-center group-hover:bg-primary-400/10 transition-colors">
                          <Icon className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <h3 className="font-display text-primary-400 group-hover:text-primary-300 transition-colors">
                            {building.name}
                          </h3>
                          <p className="text-xs text-parchment-500 mt-1">{building.description}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Quest Givers */}
            {questNpcs && questNpcs.length > 0 && (
              <section>
                <h2 className="text-xl font-display text-parchment-200 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary-400" />
                  Quest Givers
                </h2>
                <div className="bg-dark-300 border border-dark-50 rounded-lg divide-y divide-dark-50">
                  {questNpcs.map((npc) => (
                    <div key={npc.id} className="px-5 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-parchment-200 text-sm font-semibold">{npc.name}</span>
                          <span className="text-parchment-500 text-xs ml-2">{npc.role}</span>
                        </div>
                        <span className="text-primary-400 text-xs font-display">
                          {npc.availableQuestCount} quest{npc.availableQuestCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {npc.quests.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {npc.quests.map((quest) => (
                            <button
                              key={quest.id}
                              onClick={() => setSelectedQuest({ ...quest, npcName: npc.name })}
                              className="text-xs px-3 py-1.5 border border-primary-400/30 text-primary-400 rounded hover:bg-primary-400/10 transition-colors"
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
              <h2 className="text-xl font-display text-parchment-200 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-400" />
                Players in Town
              </h2>
              {charsLoading ? (
                <div className="bg-dark-300 border border-dark-50 rounded-lg p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </div>
              ) : otherCharacters.length === 0 ? (
                <div className="bg-dark-300 border border-dark-50 rounded-lg p-6 text-center">
                  <p className="text-parchment-500 text-sm">No other adventurers are in town right now.</p>
                </div>
              ) : (
                <div className="bg-dark-300 border border-dark-50 rounded-lg divide-y divide-dark-50">
                  {otherCharacters.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => navigate(`/profile/${c.id}`)}
                      className="w-full px-5 py-3 flex items-center justify-between hover:bg-dark-200/50 transition-colors text-left"
                    >
                      <div>
                        <span className="text-parchment-200 text-sm font-semibold">{c.name}</span>
                        <span className="text-parchment-500 text-xs ml-2 capitalize">{c.race.toLowerCase()}</span>
                      </div>
                      <span className="text-xs text-parchment-500">Lv. {c.level}</span>
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
