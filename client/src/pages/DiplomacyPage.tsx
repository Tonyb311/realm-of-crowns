import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScrollText,
  Swords,
  Users,
  Flag,
  Loader2,
  Globe,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { getSocket } from '../services/socket';
import RelationsMatrix from '../components/diplomacy/RelationsMatrix';
import WarDashboard from '../components/diplomacy/WarDashboard';
import RulerDiplomacyPanel from '../components/diplomacy/RulerDiplomacyPanel';
import CitizenDiplomacyPanel from '../components/diplomacy/CitizenDiplomacyPanel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Tab = 'relations' | 'events' | 'wars' | 'petitions';

interface WorldEvent {
  id: string;
  eventType: string;
  title: string;
  message: string;
  timestamp: string;
  races?: string[];
}

interface StateReport {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface Kingdom {
  id: string;
  name: string;
  raceName: string;
}

interface PlayerCharacter {
  id: string;
  name: string;
  race: string;
  kingdomId: string | null;
  isRuler: boolean;
}

interface HeraldPayload {
  type: string;
  title: string;
  message: string;
  races?: string[];
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TAB_CONFIG: Array<{ id: Tab; label: string; icon: typeof Globe }> = [
  { id: 'relations', label: 'Relations Matrix', icon: Users },
  { id: 'events', label: 'World Events', icon: Globe },
  { id: 'wars', label: 'Wars', icon: Swords },
  { id: 'petitions', label: 'Petitions', icon: ScrollText },
];

const EVENT_TYPES = ['ALL', 'WAR', 'TREATY', 'ELECTION', 'PETITION', 'HERALD'] as const;

const TOAST_STYLE = {
  background: '#1a1a2e',
  color: '#e8d5b7',
  border: '1px solid #c9a84c',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DiplomacyPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('relations');
  const [eventPage, setEventPage] = useState(1);
  const [eventFilter, setEventFilter] = useState<string>('ALL');

  // ---- Queries ----
  const { data: character } = useQuery<PlayerCharacter | null>({
    queryKey: ['character', 'me'],
    queryFn: async () => {
      try {
        const res = await api.get('/characters/me');
        return res.data;
      } catch {
        return null;
      }
    },
  });

  const { data: kingdoms } = useQuery<Kingdom[]>({
    queryKey: ['kingdoms'],
    queryFn: async () => {
      try {
        // Kingdoms list may come from various endpoints
        const res = await api.get('/diplomacy/relations');
        // Extract unique race-based kingdoms from relations
        const races = new Set<string>();
        const data: Array<{ race1: string; race2: string }> = res.data;
        for (const r of data) {
          races.add(r.race1);
          races.add(r.race2);
        }
        return Array.from(races).map(r => ({ id: r, name: r.replace(/_/g, ' '), raceName: r }));
      } catch {
        return [];
      }
    },
  });

  const { data: worldEvents, isLoading: loadingEvents } = useQuery<{ events: WorldEvent[]; totalPages: number }>({
    queryKey: ['world-events', eventPage, eventFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: eventPage, limit: 15 };
      if (eventFilter !== 'ALL') params.eventType = eventFilter;
      const res = await api.get('/world-events', { params });
      return res.data;
    },
    enabled: activeTab === 'events',
  });

  const { data: stateReport } = useQuery<StateReport | null>({
    queryKey: ['world-events', 'state-report'],
    queryFn: async () => {
      try {
        const res = await api.get('/world-events/state-report');
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: activeTab === 'events',
  });

  // ---- Socket listeners ----
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onHerald = (payload: HeraldPayload) => {
      queryClient.invalidateQueries({ queryKey: ['world-events'] });
      toast(payload.title, {
        icon: '\uD83D\uDCEF',
        duration: 6000,
        style: TOAST_STYLE,
      });
    };

    const onWorldEvent = () => {
      queryClient.invalidateQueries({ queryKey: ['world-events'] });
    };

    const onStateReport = () => {
      queryClient.invalidateQueries({ queryKey: ['world-events', 'state-report'] });
      toast('New State of Aethermere report available!', {
        icon: '\uD83D\uDCDC',
        duration: 5000,
        style: TOAST_STYLE,
      });
    };

    socket.on('herald:announcement', onHerald);
    socket.on('world-event:new', onWorldEvent);
    socket.on('world-event:state-report', onStateReport);

    return () => {
      socket.off('herald:announcement', onHerald);
      socket.off('world-event:new', onWorldEvent);
      socket.off('world-event:state-report', onStateReport);
    };
  }, [queryClient]);

  const isRuler = character?.isRuler ?? false;

  return (
    <div className="min-h-screen bg-dark-500 pt-12 pb-16">
      {/* Header */}
      <div className="px-6 py-4 bg-dark-400 border-b border-dark-50">
        <h1 className="text-2xl font-display text-primary-400 flex items-center gap-2">
          <Flag className="w-6 h-6" />
          Diplomacy
        </h1>
        <p className="text-parchment-500 text-xs mt-1">Relations, treaties, wars, and world affairs</p>
      </div>

      {/* Tab navigation */}
      <div className="px-6 py-2 bg-dark-400/50 border-b border-dark-50 flex items-center gap-1 overflow-x-auto">
        {TAB_CONFIG.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-display transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-primary-400/15 text-primary-400 border border-primary-400/30'
                  : 'text-parchment-500 hover:text-parchment-200 hover:bg-dark-400/50 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
        {isRuler && (
          <button
            onClick={() => setActiveTab('relations')}
            className="ml-auto text-[10px] px-2 py-1 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30 font-display"
          >
            Ruler
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex px-6 py-4 gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'relations' && (
              <motion.div
                key="relations"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <RelationsMatrix />
              </motion.div>
            )}

            {activeTab === 'events' && (
              <motion.div
                key="events"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* State of Aethermere report */}
                {stateReport && (
                  <section className="bg-dark-400 border border-primary-400/20 rounded-lg p-4">
                    <h3 className="font-display text-primary-400 text-sm mb-2 flex items-center gap-1.5">
                      <ScrollText className="w-4 h-4" />
                      State of Aethermere
                    </h3>
                    <p className="text-parchment-200 text-xs font-display mb-1">{stateReport.title}</p>
                    <p className="text-parchment-400 text-xs whitespace-pre-wrap leading-relaxed">
                      {stateReport.content}
                    </p>
                    <p className="text-parchment-500 text-[10px] mt-2">
                      {new Date(stateReport.createdAt).toLocaleDateString()}
                    </p>
                  </section>
                )}

                {/* Event filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-parchment-500" />
                  <div className="flex gap-1 flex-wrap">
                    {EVENT_TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => { setEventFilter(type); setEventPage(1); }}
                        className={`text-[10px] px-2 py-0.5 rounded font-display transition-colors ${
                          eventFilter === type
                            ? 'bg-primary-400/15 text-primary-400 border border-primary-400/30'
                            : 'text-parchment-500 hover:text-parchment-300 border border-transparent'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Event list */}
                {loadingEvents ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
                  </div>
                ) : !worldEvents?.events || worldEvents.events.length === 0 ? (
                  <p className="text-parchment-500 text-xs text-center py-10">No world events found.</p>
                ) : (
                  <div className="space-y-2">
                    {worldEvents.events.map((evt, i) => (
                      <motion.div
                        key={evt.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="bg-dark-400 border border-dark-50 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-parchment-200 text-xs font-display">{evt.title}</span>
                          <span className="text-parchment-500 text-[10px]">
                            {new Date(evt.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-parchment-400 text-xs">{evt.message}</p>
                        {evt.races && evt.races.length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {evt.races.map(r => (
                              <span key={r} className="text-[9px] px-1.5 py-0.5 rounded bg-dark-500 text-parchment-500 border border-dark-50">
                                {r.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {worldEvents && worldEvents.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setEventPage(p => Math.max(1, p - 1))}
                      disabled={eventPage <= 1}
                      className="text-parchment-500 hover:text-parchment-200 disabled:opacity-30 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-parchment-500 text-xs">
                      Page {eventPage} of {worldEvents.totalPages}
                    </span>
                    <button
                      onClick={() => setEventPage(p => Math.min(worldEvents.totalPages, p + 1))}
                      disabled={eventPage >= worldEvents.totalPages}
                      className="text-parchment-500 hover:text-parchment-200 disabled:opacity-30 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'wars' && (
              <motion.div
                key="wars"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <WarDashboard />
              </motion.div>
            )}

            {activeTab === 'petitions' && character && (
              <motion.div
                key="petitions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <CitizenDiplomacyPanel
                  playerRace={character.race}
                  kingdomId={character.kingdomId ?? ''}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Ruler sidebar */}
        {isRuler && character?.kingdomId && (
          <div className="w-80 shrink-0 hidden lg:block">
            <RulerDiplomacyPanel
              kingdomId={character.kingdomId}
              kingdoms={kingdoms ?? []}
            />
          </div>
        )}
      </div>
    </div>
  );
}
