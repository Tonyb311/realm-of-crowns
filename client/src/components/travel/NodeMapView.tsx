import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Loader2,
  MapPin,
  Home,
  TreePine,
  Mountain,
  Droplets,
  Tent,
  Skull,
  CircleDot,
} from 'lucide-react';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MapNode {
  id: string;
  name: string;
  type: string;
  regionId: string;
  dangerLevel: number;
  encounterChance: number;
  townId: string | null;
  description: string;
  position: { x: number; y: number } | null;
}

interface MapConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  bidirectional: boolean;
}

interface NodeMapData {
  regionId: string;
  nodes: MapNode[];
  connections: MapConnection[];
}

interface Position {
  inTown: boolean;
  town: { id: string; name: string } | null;
  onNode: boolean;
  node: { id: string; name: string } | null;
}

// ---------------------------------------------------------------------------
// Node type config
// ---------------------------------------------------------------------------

const NODE_TYPE_CONFIG: Record<string, { icon: typeof MapPin; color: string; fill: string }> = {
  TOWN_GATE:    { icon: Home,      color: 'text-green-400',    fill: 'fill-green-400/20' },
  FOREST:       { icon: TreePine,  color: 'text-emerald-400',  fill: 'fill-emerald-400/20' },
  MOUNTAIN:     { icon: Mountain,  color: 'text-slate-400',    fill: 'fill-slate-400/20' },
  RIVER:        { icon: Droplets,  color: 'text-blue-400',     fill: 'fill-blue-400/20' },
  CAMP:         { icon: Tent,      color: 'text-orange-400',   fill: 'fill-orange-400/20' },
  RUINS:        { icon: Skull,     color: 'text-red-400',      fill: 'fill-red-400/20' },
  CROSSROADS:   { icon: CircleDot, color: 'text-yellow-400',   fill: 'fill-yellow-400/20' },
  PLAINS:       { icon: MapPin,    color: 'text-stone-400',     fill: 'fill-stone-400/20' },
  SWAMP:        { icon: Droplets,  color: 'text-green-600',    fill: 'fill-green-600/20' },
  UNDERGROUND:  { icon: Mountain,  color: 'text-purple-400',   fill: 'fill-purple-400/20' },
  COASTAL:      { icon: Droplets,  color: 'text-cyan-400',     fill: 'fill-cyan-400/20' },
};

function getNodeConfig(type: string) {
  return NODE_TYPE_CONFIG[type] ?? { icon: MapPin, color: 'text-stone-500', fill: 'fill-stone-500/20' };
}

function dangerBorderColor(level: number): string {
  if (level <= 2) return 'stroke-green-500/40';
  if (level <= 5) return 'stroke-yellow-500/40';
  if (level <= 7) return 'stroke-orange-500/40';
  return 'stroke-red-500/40';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NodeMapViewProps {
  highlightNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
}

export default function NodeMapView({ highlightNodeId, onNodeClick }: NodeMapViewProps) {
  const { data: mapData, isLoading: mapLoading } = useQuery<NodeMapData>({
    queryKey: ['travel', 'node-map'],
    queryFn: async () => {
      const res = await api.get('/travel/node-map');
      return res.data;
    },
  });

  const { data: positionData } = useQuery<{ position: Position }>({
    queryKey: ['travel', 'position'],
    queryFn: async () => {
      const res = await api.get('/travel/position');
      return res.data;
    },
  });

  // Build position lookup
  const nodePositions = useMemo(() => {
    if (!mapData?.nodes) return new Map<string, { x: number; y: number }>();

    const positions = new Map<string, { x: number; y: number }>();
    const nodesWithPos = mapData.nodes.filter(n => n.position);
    const nodesWithoutPos = mapData.nodes.filter(n => !n.position);

    nodesWithPos.forEach(n => {
      positions.set(n.id, n.position!);
    });

    // Auto-layout nodes without positions in a grid
    const cols = Math.ceil(Math.sqrt(nodesWithoutPos.length));
    nodesWithoutPos.forEach((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.set(n.id, {
        x: 80 + col * 120,
        y: 80 + row * 100,
      });
    });

    return positions;
  }, [mapData?.nodes]);

  // Current player node
  const currentNodeId = positionData?.position?.node?.id ?? null;

  if (mapLoading) {
    return (
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  if (!mapData || mapData.nodes.length === 0) {
    return (
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
        <MapPin className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
        <p className="text-realm-text-muted text-sm">No map data available for this region.</p>
      </div>
    );
  }

  // Calculate viewBox from node positions
  const allPos = Array.from(nodePositions.values());
  const minX = Math.min(...allPos.map(p => p.x)) - 60;
  const minY = Math.min(...allPos.map(p => p.y)) - 60;
  const maxX = Math.max(...allPos.map(p => p.x)) + 60;
  const maxY = Math.max(...allPos.map(p => p.y)) + 60;
  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;

  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden">
      <div className="p-3 border-b border-realm-border flex items-center justify-between">
        <h3 className="font-display text-realm-gold-400 text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Node Map
        </h3>
        {positionData?.position?.town && (
          <span className="text-[10px] text-realm-text-muted">
            Currently in: {positionData.position.town.name}
          </span>
        )}
      </div>

      <svg
        viewBox={viewBox}
        className="w-full h-[400px] bg-realm-bg-800"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Connections */}
        {mapData.connections.map((conn) => {
          const from = nodePositions.get(conn.fromNodeId);
          const to = nodePositions.get(conn.toNodeId);
          if (!from || !to) return null;

          return (
            <line
              key={conn.id}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className="stroke-stone-500/20"
              strokeWidth={2}
              strokeDasharray={conn.bidirectional ? undefined : '4 4'}
            />
          );
        })}

        {/* Nodes */}
        {mapData.nodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;

          const cfg = getNodeConfig(node.type);
          const isPlayerHere = node.id === currentNodeId;
          const isHighlighted = node.id === highlightNodeId;
          const r = isPlayerHere ? 20 : 16;

          return (
            <g
              key={node.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onClick={() => onNodeClick?.(node.id)}
              className="cursor-pointer"
            >
              {/* Danger ring */}
              <circle
                r={r + 4}
                className={`fill-transparent ${dangerBorderColor(node.dangerLevel)}`}
                strokeWidth={2}
              />

              {/* Node circle */}
              <circle
                r={r}
                className={`fill-slate-900 stroke-stone-500/40 ${
                  isPlayerHere ? 'stroke-amber-400 stroke-[3]' : ''
                } ${isHighlighted ? 'stroke-yellow-400 stroke-[3]' : ''}`}
                strokeWidth={isPlayerHere || isHighlighted ? 3 : 1.5}
              />

              {/* Player indicator */}
              {isPlayerHere && (
                <circle r={5} className="fill-amber-400 animate-pulse" />
              )}

              {/* Node type indicator (colored dot) */}
              {!isPlayerHere && (
                <circle r={4} className={cfg.fill.replace('fill-', 'fill-').replace('/20', '')} />
              )}

              {/* Label */}
              <text
                y={r + 14}
                textAnchor="middle"
                className={`text-[8px] fill-stone-300 font-display ${isPlayerHere ? 'fill-amber-400' : ''}`}
              >
                {node.name.length > 14 ? node.name.slice(0, 12) + '...' : node.name}
              </text>

              {/* Town indicator */}
              {node.townId && (
                <text
                  y={-r - 6}
                  textAnchor="middle"
                  className="text-[7px] fill-green-400 font-display"
                >
                  Town
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="p-3 border-t border-realm-border flex flex-wrap gap-3">
        {Object.entries(NODE_TYPE_CONFIG).slice(0, 6).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
            <span className="text-[9px] text-realm-text-muted capitalize">
              {type.toLowerCase().replace(/_/g, ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
