import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Navigation,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Lock,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Town {
  id: string;
  name: string;
}

interface RouteNode {
  id: string;
  name: string;
  type: string;
  dangerLevel: number;
  encounterChance: number;
  townId: string | null;
}

interface RouteData {
  from: Town;
  to: Town;
  distance: number;
  nodes: RouteNode[];
  dangers: {
    maxDangerLevel: number;
    avgDangerLevel: number;
    terrainTypes: string[];
    totalEncounterRisk: number;
  };
}

interface Position {
  inTown: boolean;
  town: { id: string; name: string; regionId: string } | null;
  onNode: boolean;
  node: { id: string; townId: string | null } | null;
}

const TOAST_STYLE = {
  background: '#1a1a2e',
  color: '#e8d5b7',
  border: '1px solid #c9a84c',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TravelPlanner() {
  const queryClient = useQueryClient();
  const [destinationTownId, setDestinationTownId] = useState<string>('');

  // Player's position
  const { data: positionData } = useQuery<{ position: Position }>({
    queryKey: ['travel', 'position'],
    queryFn: async () => {
      const res = await api.get('/travel/position');
      return res.data;
    },
  });

  // Available towns (use connected nodes to find reachable towns)
  const { data: nodesData } = useQuery<{
    currentNodeId: string | null;
    nodes: { id: string; name: string; type: string; dangerLevel: number; townId: string | null }[];
  }>({
    queryKey: ['travel', 'nodes'],
    queryFn: async () => {
      const res = await api.get('/travel/nodes');
      return res.data;
    },
  });

  // Route query
  const fromTownId = positionData?.position?.town?.id ?? '';

  const { data: routeData, isLoading: routeLoading } = useQuery<{ route: RouteData }>({
    queryKey: ['travel', 'route', fromTownId, destinationTownId],
    queryFn: async () => {
      const res = await api.get(`/travel/routes/${fromTownId}/${destinationTownId}`);
      return res.data;
    },
    enabled: !!fromTownId && !!destinationTownId && fromTownId !== destinationTownId,
  });

  // Lock in travel action
  const lockInMutation = useMutation({
    mutationFn: async () => {
      const nextNode = nodesData?.nodes?.[0];
      const res = await api.post('/actions/lock-in', {
        actionType: 'TRAVEL',
        actionTarget: {
          destinationTownId,
          targetNodeId: nextNode?.id,
          nodeName: nextNode?.name,
        },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions', 'current'] });
      queryClient.invalidateQueries({ queryKey: ['actions', 'available'] });
      toast.success('Travel action locked in!', { style: TOAST_STYLE });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to lock in travel', { style: TOAST_STYLE });
    },
  });

  const route = routeData?.route;
  const position = positionData?.position;

  // Extract destination town options from connected nodes that have townIds
  const connectedTowns = (nodesData?.nodes ?? [])
    .filter(n => n.townId && n.type === 'TOWN_GATE')
    .map(n => ({ id: n.townId!, name: n.name }));

  return (
    <div className="bg-dark-300 border border-dark-50 rounded-lg p-5 space-y-4">
      <h3 className="font-display text-primary-400 text-sm flex items-center gap-2">
        <Navigation className="w-4 h-4" />
        Travel Planner
      </h3>

      {/* Current location */}
      {position && (
        <div className="p-3 bg-dark-400 rounded-lg">
          <p className="text-[10px] text-parchment-500 uppercase tracking-wider mb-1">Current Location</p>
          <p className="text-parchment-200 text-xs font-display flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-primary-400" />
            {position.town?.name ?? position.node?.id ?? 'Unknown'}
          </p>
        </div>
      )}

      {/* Destination selector */}
      <div>
        <p className="text-[10px] text-parchment-500 uppercase tracking-wider mb-1.5">Destination</p>
        <div className="relative">
          <select
            value={destinationTownId}
            onChange={(e) => setDestinationTownId(e.target.value)}
            className="w-full appearance-none bg-dark-400 border border-dark-50 rounded px-3 py-2 text-sm text-parchment-200 pr-8 focus:border-primary-400 focus:outline-none"
          >
            <option value="">Select destination...</option>
            {connectedTowns.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-parchment-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Route preview */}
      {routeLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
        </div>
      )}

      {route && (
        <div className="space-y-3">
          {/* Route stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-dark-400 rounded-lg text-center">
              <p className="text-primary-400 font-display text-lg">{route.nodes.length}</p>
              <p className="text-parchment-500 text-[10px]">Nodes</p>
            </div>
            <div className="p-2.5 bg-dark-400 rounded-lg text-center">
              <p className="text-primary-400 font-display text-lg">{route.nodes.length}</p>
              <p className="text-parchment-500 text-[10px]">Days Travel</p>
            </div>
            <div className="p-2.5 bg-dark-400 rounded-lg text-center">
              <p className={`font-display text-lg ${
                route.dangers.maxDangerLevel <= 3 ? 'text-green-400'
                  : route.dangers.maxDangerLevel <= 6 ? 'text-yellow-400'
                  : 'text-red-400'
              }`}>
                {route.dangers.maxDangerLevel}
              </p>
              <p className="text-parchment-500 text-[10px]">Max Danger</p>
            </div>
          </div>

          {/* Danger summary */}
          {route.dangers.maxDangerLevel >= 5 && (
            <div className="flex items-center gap-2 p-2.5 bg-red-900/20 border border-red-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-[10px]">
                High danger route! Max danger level: {route.dangers.maxDangerLevel}.
                Total encounter risk: {Math.round(route.dangers.totalEncounterRisk * 100)}%.
              </p>
            </div>
          )}

          {/* Route nodes */}
          <div>
            <p className="text-[10px] text-parchment-500 uppercase tracking-wider mb-1.5">Route Path</p>
            <div className="space-y-1">
              {route.nodes.map((node, i) => (
                <div
                  key={node.id}
                  className="flex items-center gap-2 p-2 bg-dark-400/50 rounded text-xs"
                >
                  <span className="text-parchment-500 w-4 text-center">{i + 1}</span>
                  <span className="text-parchment-200 flex-1 font-display">{node.name}</span>
                  <span className="text-parchment-500 text-[10px] capitalize">
                    {node.type.toLowerCase().replace(/_/g, ' ')}
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
          </div>

          {/* Terrain types */}
          <div className="flex flex-wrap gap-1.5">
            {route.dangers.terrainTypes.map((type) => (
              <span
                key={type}
                className="text-[9px] px-2 py-0.5 rounded bg-dark-400 text-parchment-500 border border-dark-50 capitalize"
              >
                {type.toLowerCase().replace(/_/g, ' ')}
              </span>
            ))}
          </div>

          {/* Lock in travel button */}
          <button
            onClick={() => lockInMutation.mutate()}
            disabled={lockInMutation.isPending}
            className="w-full py-3 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {lockInMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Locking In...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Lock In Travel
              </>
            )}
          </button>
        </div>
      )}

      {!destinationTownId && !routeLoading && (
        <p className="text-parchment-500 text-xs text-center py-4">
          Select a destination to see route details.
        </p>
      )}
    </div>
  );
}
