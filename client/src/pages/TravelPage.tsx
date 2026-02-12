import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Check,
  ArrowRight,
  Loader2,
  Users,
  Landmark,
  Church,
  Tent,
  Skull,
  Mountain,
  TreePine,
  Droplets,
  Compass,
  RotateCcw,
  XCircle,
  Clock,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Crown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { TOAST_STYLE } from '../constants';
import Tooltip from '../components/ui/Tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TravelNode {
  id: string;
  name: string;
  description: string;
  terrain: string;
  dangerLevel: number;
  specialType: string | null;
  encounterChance: number;
}

interface TravelRoute {
  id: string;
  name: string;
  originTownName: string;
  destinationTownName: string;
  nodes: TravelNode[];
  difficulty: string;
  terrain: string;
  dangerLevel: number;
}

interface TravelStatus {
  traveling: boolean;
  routeId: string | null;
  routeName: string | null;
  originTownName: string | null;
  destinationTownName: string | null;
  currentNodeIndex: number;
  totalNodes: number;
  currentNode: TravelNode | null;
  nextNode: TravelNode | null;
  direction: 'forward' | 'reverse';
  dayNumber: number;
  estimatedDays: number;
  ticksRemaining: number;
  terrain: string;
  nodes: TravelNode[];
  groupId: string | null;
  groupName: string | null;
  groupMembers: GroupMember[];
}

interface NodePlayer {
  id: string;
  name: string;
  level: number;
  race: string;
}

interface GroupMember {
  id: string;
  name: string;
  level: number;
  race: string;
  role: 'leader' | 'member';
}

// ---------------------------------------------------------------------------
// Terrain styling config
// ---------------------------------------------------------------------------

const TERRAIN_COLORS: Record<string, { badge: string; accent: string; bgTint: string }> = {
  forest:      { badge: 'bg-emerald-800/60 text-emerald-300', accent: 'text-emerald-400', bgTint: 'from-green-950/30' },
  mountain:    { badge: 'bg-slate-700/60 text-slate-300',     accent: 'text-slate-400',   bgTint: 'from-slate-900/30' },
  plains:      { badge: 'bg-green-800/60 text-green-300',     accent: 'text-green-400',   bgTint: 'from-green-950/20' },
  desert:      { badge: 'bg-amber-800/60 text-amber-300',     accent: 'text-amber-400',   bgTint: 'from-amber-950/30' },
  swamp:       { badge: 'bg-emerald-900/60 text-emerald-300', accent: 'text-emerald-500', bgTint: 'from-emerald-950/30' },
  coastal:     { badge: 'bg-blue-800/60 text-blue-300',       accent: 'text-blue-400',    bgTint: 'from-blue-950/30' },
  tundra:      { badge: 'bg-cyan-900/60 text-cyan-300',       accent: 'text-cyan-400',    bgTint: 'from-cyan-950/30' },
  underground: { badge: 'bg-purple-900/60 text-purple-300',   accent: 'text-purple-400',  bgTint: 'from-purple-950/30' },
  volcanic:    { badge: 'bg-red-900/60 text-red-300',         accent: 'text-red-400',     bgTint: 'from-red-950/30' },
  hills:       { badge: 'bg-lime-900/60 text-lime-300',       accent: 'text-lime-400',    bgTint: 'from-lime-950/20' },
  river:       { badge: 'bg-blue-900/60 text-blue-300',       accent: 'text-blue-400',    bgTint: 'from-blue-950/20' },
};

function getTerrainStyle(terrain: string) {
  const key = terrain?.toLowerCase().split('/')[0].trim() ?? '';
  return TERRAIN_COLORS[key] ?? { badge: 'bg-realm-border/60 text-realm-text-secondary', accent: 'text-realm-text-secondary', bgTint: 'from-transparent' };
}

// ---------------------------------------------------------------------------
// Special type icon mapping
// ---------------------------------------------------------------------------

const SPECIAL_TYPE_ICONS: Record<string, typeof Landmark> = {
  ruins:      Landmark,
  shrine:     Church,
  camp:       Tent,
  dungeon:    Skull,
  mountain:   Mountain,
  forest:     TreePine,
  river:      Droplets,
  crossroads: Compass,
};

function getSpecialIcon(specialType: string | null) {
  if (!specialType) return null;
  return SPECIAL_TYPE_ICONS[specialType.toLowerCase()] ?? Landmark;
}

// ---------------------------------------------------------------------------
// Difficulty color
// ---------------------------------------------------------------------------

function getDifficultyStyle(difficulty: string): string {
  switch (difficulty?.toLowerCase()) {
    case 'safe': return 'text-realm-success bg-realm-success/10 border-realm-success/30';
    case 'moderate': return 'text-realm-gold-400 bg-realm-gold-400/10 border-realm-gold-400/30';
    case 'dangerous': return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
    case 'deadly': return 'text-realm-danger bg-realm-danger/10 border-realm-danger/30';
    default: return 'text-realm-text-secondary bg-realm-text-secondary/10 border-realm-border';
  }
}

// ---------------------------------------------------------------------------
// Danger dots
// ---------------------------------------------------------------------------

function DangerDots({ level }: { level: number }) {
  const max = 10;
  const clamped = Math.max(0, Math.min(max, level));

  function dotColor(i: number): string {
    if (i >= clamped) return 'bg-realm-border';
    if (clamped <= 3) return 'bg-realm-success';
    if (clamped <= 6) return 'bg-realm-gold-400';
    if (clamped <= 8) return 'bg-orange-400';
    return 'bg-realm-danger';
  }

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className={`w-1.5 h-1.5 rounded-full ${dotColor(i)}`} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tick countdown timer
// ---------------------------------------------------------------------------

function getNextTickTime(): Date {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0,
  ));
  return next;
}

function TickCountdown() {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function update() {
      const now = Date.now();
      const target = getNextTickTime().getTime();
      const diff = Math.max(0, target - now);

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-realm-gold-400" />
      <span className="text-xs text-realm-text-muted">Next tick in:</span>
      <motion.span
        className="font-display text-lg text-realm-gold-400 tabular-nums"
        animate={{ opacity: [1, 0.7, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {timeLeft}
      </motion.span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route Node Map (horizontal path visualization)
// ---------------------------------------------------------------------------

interface RouteMapProps {
  nodes: TravelNode[];
  currentIndex: number;
  direction: 'forward' | 'reverse';
  routeName: string;
  dayNumber: number;
  estimatedDays: number;
  ticksRemaining: number;
}

function RouteMap({ nodes, currentIndex, direction, routeName, dayNumber, estimatedDays, ticksRemaining }: RouteMapProps) {
  const [expanded, setExpanded] = useState(false);

  // For display, show a scrollable view of all nodes
  const visibleNodes = expanded ? nodes : nodes;

  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-realm-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-realm-gold-400" />
            <h3 className="font-display text-realm-gold-400 text-sm">{routeName}</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-realm-text-muted">
            <span>Day {dayNumber} of ~{estimatedDays}</span>
            <span className="text-realm-text-muted/50">|</span>
            <span>Arriving in ~{ticksRemaining} tick{ticksRemaining !== 1 ? 's' : ''}</span>
            <span className="text-realm-text-muted/50">|</span>
            <span className="flex items-center gap-1">
              {direction === 'forward' ? (
                <ArrowRight className="w-3 h-3 text-realm-gold-400" />
              ) : (
                <RotateCcw className="w-3 h-3 text-realm-gold-400" />
              )}
              {direction === 'forward' ? 'Forward' : 'Reversing'}
            </span>
          </div>
        </div>
      </div>

      {/* Node path visualization */}
      <div className="p-4 overflow-x-auto">
        <div className="flex items-center min-w-max gap-0">
          {visibleNodes.map((node, i) => {
            const isCompleted = i < currentIndex;
            const isCurrent = i === currentIndex;
            const isUpcoming = i > currentIndex;
            const SpecialIcon = getSpecialIcon(node.specialType);

            return (
              <div key={node.id} className="flex items-center">
                {/* Node dot */}
                <div className="flex flex-col items-center">
                  <Tooltip content={`${node.name} — Danger: ${node.dangerLevel}/10${node.specialType ? ` — ${node.specialType}` : ''}`}>
                    <div className="relative">
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                          isCurrent
                            ? 'border-realm-gold-400 bg-realm-gold-400/20 shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                            : isCompleted
                            ? 'border-realm-border bg-realm-bg-800'
                            : 'border-realm-border/50 bg-realm-bg-800/50'
                        }`}
                      >
                        {isCompleted && <Check className="w-3.5 h-3.5 text-realm-text-muted/50" />}
                        {isCurrent && (
                          <motion.div
                            className="w-3 h-3 rounded-full bg-realm-gold-400"
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          />
                        )}
                        {isUpcoming && SpecialIcon && (
                          <SpecialIcon className="w-3 h-3 text-realm-text-muted/40" />
                        )}
                      </div>
                    </div>
                  </Tooltip>

                  {/* Node name label */}
                  <span
                    className={`text-[9px] mt-1.5 max-w-[60px] text-center truncate ${
                      isCurrent
                        ? 'text-realm-gold-400 font-semibold'
                        : isCompleted
                        ? 'text-realm-text-muted/40'
                        : 'text-realm-text-muted/60'
                    }`}
                  >
                    {node.name}
                  </span>
                </div>

                {/* Connecting line */}
                {i < visibleNodes.length - 1 && (
                  <div
                    className={`h-0.5 w-8 sm:w-12 flex-shrink-0 ${
                      i < currentIndex
                        ? 'bg-realm-text-muted/20'
                        : i === currentIndex
                        ? 'bg-gradient-to-r from-realm-gold-400/60 to-realm-border/30'
                        : 'bg-realm-border/20'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expand/collapse for many nodes */}
      {nodes.length > 8 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 border-t border-realm-border flex items-center justify-center gap-1 text-[10px] text-realm-text-muted hover:text-realm-text-secondary transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Collapse' : `Show all ${nodes.length} nodes`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Current Node Panel
// ---------------------------------------------------------------------------

interface CurrentNodePanelProps {
  node: TravelNode;
  nextNode: TravelNode | null;
  terrain: string;
}

function CurrentNodePanel({ node, nextNode, terrain }: CurrentNodePanelProps) {
  const terrainStyle = getTerrainStyle(terrain || node.terrain);

  return (
    <div className={`bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden`}>
      {/* Atmospheric terrain tint at top */}
      <div className={`h-1 bg-gradient-to-r ${terrainStyle.bgTint} to-transparent`} />

      <div className="p-6">
        {/* Node name */}
        <h2 className="text-2xl sm:text-3xl font-display text-realm-gold-400 mb-3">
          {node.name}
        </h2>

        {/* Description */}
        <p className="text-realm-text-secondary text-sm leading-relaxed mb-5">
          {node.description || 'The path stretches before you, winding through the landscape. Each step brings you closer to your destination.'}
        </p>

        {/* Info row */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {/* Terrain badge */}
          <span className={`text-xs px-2.5 py-1 rounded ${terrainStyle.badge}`}>
            {(node.terrain || terrain || 'Unknown').replace(/_/g, ' ')}
          </span>

          {/* Danger level */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-realm-text-muted uppercase tracking-wider">Danger</span>
            <DangerDots level={node.dangerLevel} />
          </div>

          {/* Special type badge */}
          {node.specialType && (
            <span className="text-xs px-2.5 py-1 rounded bg-amber-900/40 text-amber-300 border border-amber-500/20 flex items-center gap-1">
              {(() => {
                const SpecIcon = getSpecialIcon(node.specialType);
                return SpecIcon ? <SpecIcon className="w-3 h-3" /> : null;
              })()}
              {node.specialType}
            </span>
          )}
        </div>

        {/* Next node preview */}
        {nextNode && (
          <div className="flex items-center gap-2 p-3 bg-realm-bg-800/60 rounded-lg border border-realm-border/50">
            <ArrowRight className="w-4 h-4 text-realm-text-muted flex-shrink-0" />
            <span className="text-xs text-realm-text-muted">Next tick moves you to:</span>
            <span className="text-xs text-realm-text-primary font-display">{nextNode.name}</span>
          </div>
        )}

        {!nextNode && (
          <div className="flex items-center gap-2 p-3 bg-realm-success/20 rounded-lg border border-realm-success/20">
            <MapPin className="w-4 h-4 text-realm-success flex-shrink-0" />
            <span className="text-xs text-realm-success">You will arrive at your destination on the next tick.</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Travelers Panel
// ---------------------------------------------------------------------------

function TravelersPanel({ players }: { players: NodePlayer[] }) {
  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg">
      <div className="p-4 border-b border-realm-border">
        <h3 className="font-display text-realm-gold-400 text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          Fellow Travelers
        </h3>
      </div>

      {players.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-realm-text-muted text-xs">No other travelers here.</p>
          <p className="text-realm-text-muted/50 text-[10px] mt-1">The road is quiet and empty.</p>
        </div>
      ) : (
        <div className="divide-y divide-realm-border">
          {players.map((p) => (
            <div key={p.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-realm-text-primary text-sm font-semibold">{p.name}</span>
                <span className="text-realm-text-muted text-xs ml-2 capitalize">{p.race?.toLowerCase()}</span>
              </div>
              <span className="text-xs text-realm-text-muted">Lv. {p.level}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group Panel
// ---------------------------------------------------------------------------

function GroupPanel({ groupName, members }: { groupName: string | null; members: GroupMember[] }) {
  if (!members || members.length === 0) return null;

  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg">
      <div className="p-4 border-b border-realm-border">
        <h3 className="font-display text-realm-gold-400 text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" />
          {groupName || 'Travel Group'}
        </h3>
      </div>

      <div className="divide-y divide-realm-border">
        {members.map((m) => (
          <div key={m.id} className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-realm-text-primary text-sm font-semibold">{m.name}</span>
              <span className="text-realm-text-muted text-xs capitalize">{m.race?.toLowerCase()}</span>
              {m.role === 'leader' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-realm-gold-400/10 text-realm-gold-400 border border-realm-gold-400/30 font-display flex items-center gap-0.5">
                  <Crown className="w-2.5 h-2.5" />
                  Leader
                </span>
              )}
              {m.role === 'member' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-realm-border/40 text-realm-text-muted font-display">
                  Member
                </span>
              )}
            </div>
            <span className="text-xs text-realm-text-muted">Lv. {m.level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action Panel
// ---------------------------------------------------------------------------

interface ActionPanelProps {
  onReverse: () => void;
  onCancel: () => void;
  isReversing: boolean;
  isCanceling: boolean;
  originTownName: string | null;
  destinationTownName: string | null;
  direction: 'forward' | 'reverse';
}

function ActionPanel({
  onReverse,
  onCancel,
  isReversing,
  isCanceling,
  originTownName,
  destinationTownName,
  direction,
}: ActionPanelProps) {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const nearestTown = direction === 'forward' ? originTownName : destinationTownName;

  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
      {/* Tick countdown */}
      <div className="flex items-center justify-center mb-5">
        <TickCountdown />
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Reverse direction */}
        <button
          onClick={() => {
            onReverse();
            toast.success(
              direction === 'forward'
                ? 'Reversing direction. You will head back.'
                : 'Resuming forward travel.',
              { style: TOAST_STYLE }
            );
          }}
          disabled={isReversing}
          className="flex-1 py-3 px-4 border border-realm-gold-400/40 text-realm-gold-400 font-display text-sm rounded hover:bg-realm-gold-400/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isReversing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
          Reverse Direction
        </button>

        {/* Cancel journey */}
        {!showCancelConfirm ? (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="flex-1 py-3 px-4 border border-realm-danger/40 text-realm-danger font-display text-sm rounded hover:bg-realm-danger/10 transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Cancel Journey
          </button>
        ) : (
          <div className="flex-1 flex flex-col gap-2 p-3 bg-realm-danger/10 border border-realm-danger/20 rounded-lg">
            <p className="text-xs text-realm-danger text-center">
              Return to {nearestTown || 'nearest town'}?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onCancel();
                  setShowCancelConfirm(false);
                }}
                disabled={isCanceling}
                className="flex-1 py-2 bg-realm-danger text-realm-text-primary font-display text-xs rounded hover:bg-realm-danger/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isCanceling ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Confirm
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2 border border-realm-border text-realm-text-secondary font-display text-xs rounded hover:bg-realm-bg-800 transition-colors"
              >
                Nevermind
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main TravelPage Component
// ---------------------------------------------------------------------------

export default function TravelPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Travel status
  const {
    data: travelStatus,
    isLoading: statusLoading,
    error: statusError,
  } = useQuery<TravelStatus>({
    queryKey: ['travel', 'status'],
    queryFn: () => api.get('/travel/status').then(r => r.data),
    refetchInterval: 30000,
  });

  // Node players
  const { data: nodePlayers } = useQuery<NodePlayer[]>({
    queryKey: ['travel', 'node-players'],
    queryFn: () => api.get('/travel/node/players').then(r => r.data),
    enabled: !!travelStatus?.traveling,
    refetchInterval: 60000,
  });

  // Mutations
  const cancelMutation = useMutation({
    mutationFn: () => api.post('/travel/cancel'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      toast.success('Journey cancelled. Returning to town.', { style: TOAST_STYLE });
      navigate('/town');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to cancel journey', { style: TOAST_STYLE });
    },
  });

  const reverseMutation = useMutation({
    mutationFn: () => api.post('/travel/reverse'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to reverse direction', { style: TOAST_STYLE });
    },
  });

  // Compute terrain tint for background
  const terrainKey = travelStatus?.currentNode?.terrain || travelStatus?.terrain || '';
  const terrainStyle = getTerrainStyle(terrainKey);

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------
  if (statusLoading) {
    return (
      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6">
          <div className="h-32 bg-realm-bg-700 border border-realm-border rounded-lg animate-pulse" />
          <div className="h-32 bg-realm-bg-700 border border-realm-border rounded-lg animate-pulse" />
          <div className="h-32 bg-realm-bg-700 border border-realm-border rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error
  // ---------------------------------------------------------------------------
  if (statusError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertTriangle className="w-12 h-12 text-realm-danger mb-4" />
        <h2 className="text-2xl font-display text-realm-danger mb-4">Travel Error</h2>
        <p className="text-realm-text-secondary mb-6">Failed to load travel status.</p>
        <button
          onClick={() => navigate('/town')}
          className="px-8 py-3 border border-realm-gold-400 text-realm-gold-400 font-display rounded hover:bg-realm-bg-700 transition-colors"
        >
          Return to Town
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Not traveling
  // ---------------------------------------------------------------------------
  if (!travelStatus?.traveling) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <Compass className="w-16 h-16 text-realm-text-muted/30 mb-6" />
        <h2 className="text-3xl font-display text-realm-gold-400 mb-4">Not Traveling</h2>
        <p className="text-realm-text-secondary mb-2 text-center max-w-md">
          You are not currently on a journey. Visit your town to plan a trip.
        </p>
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => navigate('/town')}
            className="px-8 py-3 bg-realm-gold-500 text-realm-bg-900 font-display text-lg rounded hover:bg-realm-gold-400 transition-colors"
          >
            Go to Town
          </button>
          <button
            onClick={() => navigate('/map')}
            className="px-8 py-3 border border-realm-gold-400 text-realm-gold-400 font-display text-lg rounded hover:bg-realm-bg-700 transition-colors"
          >
            World Map
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Traveling render
  // ---------------------------------------------------------------------------
  const {
    routeName,
    originTownName,
    destinationTownName,
    currentNodeIndex,
    totalNodes,
    currentNode,
    nextNode,
    direction,
    dayNumber,
    estimatedDays,
    ticksRemaining,
    nodes,
    groupId,
    groupName,
    groupMembers,
  } = travelStatus;

  return (
    <div className="pt-12">
      {/* Subtle terrain-influenced gradient at top */}
      <div className={`h-32 bg-gradient-to-b ${terrainStyle.bgTint} to-transparent absolute top-12 left-0 right-0 pointer-events-none`} />

      <div className="relative max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Route header breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-realm-text-muted">
          <MapPin className="w-3 h-3" />
          <span>{originTownName}</span>
          <ArrowRight className="w-3 h-3" />
          <span>{destinationTownName}</span>
        </div>

        {/* Route Map */}
        <AnimatePresence mode="wait">
          <motion.div
            key="route-map"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <RouteMap
              nodes={nodes || []}
              currentIndex={currentNodeIndex}
              direction={direction}
              routeName={routeName || 'Unknown Route'}
              dayNumber={dayNumber}
              estimatedDays={estimatedDays}
              ticksRemaining={ticksRemaining}
            />
          </motion.div>
        </AnimatePresence>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Node (takes 2 cols on large) */}
          <div className="lg:col-span-2 space-y-6">
            {currentNode && (
              <motion.div
                key={currentNode.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
              >
                <CurrentNodePanel
                  node={currentNode}
                  nextNode={nextNode}
                  terrain={terrainKey}
                />
              </motion.div>
            )}

            {/* Action Panel */}
            <ActionPanel
              onReverse={() => reverseMutation.mutate()}
              onCancel={() => cancelMutation.mutate()}
              isReversing={reverseMutation.isPending}
              isCanceling={cancelMutation.isPending}
              originTownName={originTownName}
              destinationTownName={destinationTownName}
              direction={direction}
            />
          </div>

          {/* Side panels */}
          <div className="space-y-6">
            {/* Group Panel */}
            {groupId && (
              <GroupPanel
                groupName={groupName}
                members={groupMembers || []}
              />
            )}

            {/* Travelers Panel */}
            <TravelersPanel players={nodePlayers || []} />
          </div>
        </div>
      </div>
    </div>
  );
}
