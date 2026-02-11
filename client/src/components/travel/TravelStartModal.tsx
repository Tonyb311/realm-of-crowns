import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Compass,
  MapPin,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  Shield,
  Users,
  Footprints,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { TOAST_STYLE } from '../../constants';
import GroupFormationPanel from './GroupFormationPanel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RouteNode {
  id: string;
  name: string;
  type: string;
  dangerLevel: number;
}

interface TravelRoute {
  id: string;
  name: string;
  originTownId: string;
  originTownName: string;
  destinationTownId: string;
  destinationTownName: string;
  nodeCount: number;
  difficulty: string;
  terrain: string;
  dangerLevel: number;
  nodes: RouteNode[];
}

// ---------------------------------------------------------------------------
// Difficulty badge
// ---------------------------------------------------------------------------

function getDifficultyStyle(difficulty: string): string {
  switch (difficulty?.toLowerCase()) {
    case 'safe':      return 'text-green-400 bg-green-400/10 border-green-400/30';
    case 'moderate':  return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    case 'dangerous': return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
    case 'deadly':    return 'text-red-400 bg-red-400/10 border-red-400/30';
    default:          return 'text-parchment-400 bg-parchment-400/10 border-parchment-400/30';
  }
}

// ---------------------------------------------------------------------------
// Danger bar
// ---------------------------------------------------------------------------

function DangerBar({ level }: { level: number }) {
  const pct = Math.min(100, (level / 10) * 100);

  let barColor = 'from-green-500 to-green-400';
  if (level > 7) barColor = 'from-red-600 to-red-400';
  else if (level > 5) barColor = 'from-orange-500 to-orange-400';
  else if (level > 3) barColor = 'from-yellow-500 to-yellow-400';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-parchment-500 w-12">Danger</span>
      <div className="flex-1 h-1.5 bg-dark-400 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-parchment-500 w-6 text-right">{level}/10</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Route Card
// ---------------------------------------------------------------------------

interface RouteCardProps {
  route: TravelRoute;
  onTravelSolo: (routeId: string) => void;
  onFormGroup: (routeId: string) => void;
  isTraveling: boolean;
}

function RouteCard({ route, onTravelSolo, onFormGroup, isTraveling }: RouteCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-dark-400 border border-dark-50 rounded-lg overflow-hidden">
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h4 className="font-display text-parchment-200 text-sm">{route.name}</h4>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3 h-3 text-primary-400" />
              <span className="text-xs text-parchment-400">{route.destinationTownName}</span>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded border ${getDifficultyStyle(route.difficulty)}`}>
            {route.difficulty}
          </span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1">
            <Footprints className="w-3 h-3 text-parchment-500" />
            <span className="text-xs text-parchment-400">~{route.nodeCount} day{route.nodeCount !== 1 ? 's' : ''} journey</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-dark-50/40 text-parchment-500 capitalize">
            {(route.terrain || 'mixed').replace(/_/g, ' ')}
          </span>
        </div>

        {/* Danger bar */}
        <DangerBar level={route.dangerLevel} />

        {/* Expand to see nodes */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-[10px] text-parchment-500 hover:text-parchment-300 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Hide route details' : 'Show route details'}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-1">
                {(route.nodes || []).map((node, i) => (
                  <div
                    key={node.id}
                    className="flex items-center gap-2 py-1.5 px-2 bg-dark-500/50 rounded text-xs"
                  >
                    <span className="text-parchment-500 w-4 text-center text-[10px]">{i + 1}</span>
                    <span className="text-parchment-300 flex-1">{node.name}</span>
                    <span className="text-parchment-500 text-[10px] capitalize">
                      {node.type?.toLowerCase().replace(/_/g, ' ')}
                    </span>
                    <span className={`text-[10px] font-display ${
                      node.dangerLevel <= 2 ? 'text-green-400'
                        : node.dangerLevel <= 5 ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}>
                      D{node.dangerLevel}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className="flex border-t border-dark-50">
        <button
          onClick={() => onTravelSolo(route.id)}
          disabled={isTraveling}
          className="flex-1 py-3 text-xs font-display text-primary-400 hover:bg-primary-400/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 border-r border-dark-50"
        >
          {isTraveling ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Compass className="w-3 h-3" />
          )}
          Travel Solo
        </button>
        <button
          onClick={() => onFormGroup(route.id)}
          disabled={isTraveling}
          className="flex-1 py-3 text-xs font-display text-parchment-400 hover:bg-dark-300/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <Users className="w-3 h-3" />
          Form Group
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Modal Component
// ---------------------------------------------------------------------------

interface TravelStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationTownId?: string;
}

export default function TravelStartModal({ isOpen, onClose, destinationTownId }: TravelStartModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [groupRouteId, setGroupRouteId] = useState<string | null>(null);

  // Fetch available routes
  const { data: routes, isLoading: routesLoading, error: routesError } = useQuery<TravelRoute[]>({
    queryKey: ['travel', 'routes'],
    queryFn: () => api.get('/travel/routes').then(r => r.data),
    enabled: isOpen,
  });

  // Travel solo mutation
  const travelMutation = useMutation({
    mutationFn: (routeId: string) => api.post('/travel/start', { routeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      toast.success('Your journey has begun!', { style: TOAST_STYLE });
      onClose();
      navigate('/travel');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to start journey', { style: TOAST_STYLE });
    },
  });

  // Filter routes if a destination is provided
  const filteredRoutes = routes
    ? destinationTownId
      ? routes.filter(r => r.destinationTownId === destinationTownId)
      : routes
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative bg-dark-500 border border-dark-50 rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-50">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary-400" />
            <h2 className="text-xl font-display text-primary-400">Choose Your Path</h2>
          </div>
          <button
            onClick={onClose}
            className="text-parchment-500 hover:text-parchment-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Group formation panel */}
          {groupRouteId && (
            <div className="mb-6">
              <GroupFormationPanel
                routeId={groupRouteId}
                onClose={() => setGroupRouteId(null)}
              />
            </div>
          )}

          {/* Loading */}
          {routesLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin mb-3" />
              <p className="text-parchment-500 text-sm">Scouting available routes...</p>
            </div>
          )}

          {/* Error */}
          {routesError && (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
              <p className="text-red-300 text-sm">Failed to load routes.</p>
            </div>
          )}

          {/* Empty */}
          {!routesLoading && !routesError && filteredRoutes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <MapPin className="w-10 h-10 text-parchment-500/30 mb-3" />
              <p className="text-parchment-500 text-sm">No available routes found.</p>
              <p className="text-parchment-500/50 text-xs mt-1">
                {destinationTownId
                  ? 'No routes lead to this destination from your current town.'
                  : 'There are no routes from your current location.'}
              </p>
            </div>
          )}

          {/* Route list */}
          {!routesLoading && filteredRoutes.length > 0 && !groupRouteId && (
            <div className="space-y-4">
              {filteredRoutes.map((route) => (
                <RouteCard
                  key={route.id}
                  route={route}
                  onTravelSolo={(routeId) => travelMutation.mutate(routeId)}
                  onFormGroup={(routeId) => setGroupRouteId(routeId)}
                  isTraveling={travelMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
