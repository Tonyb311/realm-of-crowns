import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Minus,
  Compass,
  Eye,
  EyeOff,
  X,
  MapPin,
  Shield,
  Users,
  ChevronRight,
  Info,
} from 'lucide-react';
import api from '../services/api';
import TravelStartModal from '../components/travel/TravelStartModal';

// ===========================================================================
// Types
// ===========================================================================

interface MapTown {
  id: string;
  name: string;
  type?: 'capital' | 'city' | 'town' | 'village' | 'outpost';
  regionId: string;
  regionName: string;
  mapX: number;
  mapY: number;
  population: number;
  biome: string;
  description?: string;
  isPlayerHere?: boolean;
}

interface RouteNode {
  id: string;
  nodeIndex: number;
  name: string;
  description?: string;
  terrain: string;
  dangerLevel: number;
  specialType: string | null;
  mapX: number;
  mapY: number;
}

interface MapRoute {
  id: string;
  fromTownId: string;
  toTownId: string;
  name?: string;
  difficulty?: string;
  terrain?: string;
  nodeCount?: number;
  dangerLevel: number;
  nodes?: RouteNode[];
}

interface MapRegion {
  id: string;
  name: string;
  biome: string;
  color?: string;
}

interface PlayerPosition {
  type: 'town' | 'traveling' | null;
  townId?: string;
  routeId?: string;
  nodeIndex?: number;
  direction?: string;
}

interface Traveler {
  characterId: string;
  characterName: string;
  routeId: string;
  nodeIndex: number;
}

interface MapData {
  towns: MapTown[];
  routes: MapRoute[];
  regions: MapRegion[];
  playerPosition?: PlayerPosition;
  travelers?: Traveler[];
}

// ===========================================================================
// Constants
// ===========================================================================

const MAP_W = 1000;
const MAP_H = 900;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.2;

// Region color palette keyed by region ID
const REGION_COLORS: Record<string, string> = {
  verdant_heartlands: '#C9A461',
  silverwood_forest: '#4A8C3F',
  ironvault_mountains: '#9CA3AF',
  crossroads: '#D4A574',
  ashenfang_wastes: '#EA580C',
  shadowmere_marshes: '#A855F7',
  frozen_reaches: '#67E8F9',
  suncoast: '#06B6D4',
  twilight_march: '#A3E635',
  scarred_frontier: '#F97316',
  cogsworth_warrens: '#FBBF24',
  pelagic_depths: '#3B82F6',
  thornwilds: '#65A30D',
  glimmerveil: '#E879F9',
  skypeak_plateaus: '#D1D5DB',
  vel_naris_underdark: '#7C3AED',
  mistwood_glens: '#34D399',
  the_foundry: '#78716C',
  the_confluence: '#FB923C',
  ashenmoor: '#6B7280',
};

function getRegionColor(regionId: string): string {
  return REGION_COLORS[regionId] ?? '#9CA3AF';
}

// Terrain colors for travel nodes
const TERRAIN_COLORS: Record<string, string> = {
  plains: '#c4a265',
  forest: '#4a7c59',
  mountain: '#8b7355',
  underground: '#483d8b',
  swamp: '#556b2f',
  tundra: '#6b8fa3',
  coastal: '#4682b4',
  desert: '#cd853f',
  volcanic: '#8b4513',
  fey: '#9b7dcf',
  badlands: '#8b4513',
  underwater: '#4682b4',
};

function getTerrainColor(terrain: string): string {
  const key = terrain?.toLowerCase() ?? '';
  return TERRAIN_COLORS[key] ?? '#888888';
}

// Route line styles by difficulty
function getRouteStyle(difficulty?: string, dangerLevel?: number): {
  stroke: string;
  strokeWidth: number;
  dashArray: string;
} {
  const dl = dangerLevel ?? 0;
  const diff = difficulty?.toLowerCase() ?? '';

  if (diff === 'deadly' || dl >= 8) {
    return { stroke: '#a22', strokeWidth: 1, dashArray: '2 3' };
  }
  if (diff === 'dangerous' || dl >= 5) {
    return { stroke: '#c44', strokeWidth: 1.5, dashArray: '5 3' };
  }
  if (diff === 'moderate' || dl >= 3) {
    return { stroke: '#888', strokeWidth: 1.5, dashArray: 'none' };
  }
  // Safe
  return { stroke: '#666', strokeWidth: 2, dashArray: 'none' };
}

// Town size by type
function getTownSize(type?: string): number {
  switch (type) {
    case 'capital': return 12;
    case 'city': return 10;
    case 'town': return 8;
    case 'village': return 6;
    case 'outpost': return 5;
    default: return 8;
  }
}

// Infer town type from population if not provided
function inferTownType(pop: number): 'capital' | 'city' | 'town' | 'village' | 'outpost' {
  if (pop >= 10000) return 'capital';
  if (pop >= 5000) return 'city';
  if (pop >= 2000) return 'town';
  if (pop >= 1000) return 'village';
  return 'outpost';
}

// ===========================================================================
// Fallback coordinate data (used when API doesn't provide mapX/mapY)
// ===========================================================================

const FALLBACK_COORDS: Record<string, { x: number; y: number }> = {
  // Frozen Reaches
  drakenspire: { x: 500, y: 60 }, frostfang: { x: 410, y: 40 }, emberpeak: { x: 590, y: 45 },
  scalehaven: { x: 440, y: 95 }, wyrmrest: { x: 560, y: 100 },
  // Ironvault Mountains
  kazad_vorn: { x: 160, y: 230 }, deepvein: { x: 100, y: 190 }, hammerfall: { x: 195, y: 305 },
  gemhollow: { x: 115, y: 270 }, alehearth: { x: 210, y: 185 },
  // Verdant Heartlands
  kingshold: { x: 500, y: 230 }, millhaven: { x: 440, y: 195 }, bridgewater: { x: 540, y: 280 },
  ironford: { x: 440, y: 275 }, whitefield: { x: 560, y: 195 },
  // Shadowmere Marshes
  nethermire: { x: 830, y: 230 }, boghollow: { x: 870, y: 190 }, mistwatch: { x: 790, y: 280 },
  cinderkeep: { x: 880, y: 270 }, whispering_docks: { x: 850, y: 315 },
  // Crossroads
  hearthshire: { x: 500, y: 400 }, greenhollow: { x: 440, y: 370 }, peddlers_rest: { x: 555, y: 375 },
  bramblewood: { x: 450, y: 430 }, riverside: { x: 555, y: 430 },
  // Ashenfang Wastes
  grakthar: { x: 160, y: 570 }, bonepile: { x: 100, y: 540 }, ironfist_hold: { x: 120, y: 620 },
  thornback_camp: { x: 215, y: 530 }, ashen_market: { x: 205, y: 615 },
  // Suncoast
  porto_sole: { x: 500, y: 590 }, coral_bay: { x: 440, y: 560 }, sandrift: { x: 555, y: 555 },
  libertad: { x: 460, y: 620 }, beacons_end: { x: 545, y: 625 },
  // Silverwood Forest
  aelindra: { x: 830, y: 570 }, moonhaven: { x: 880, y: 535 }, thornwatch: { x: 780, y: 540 },
  willowmere: { x: 870, y: 610 }, eldergrove: { x: 790, y: 615 },
  // Twilight March
  dawnmere: { x: 720, y: 370 }, twinvale: { x: 760, y: 400 }, harmony_point: { x: 740, y: 440 },
  // Scarred Frontier
  scarwatch: { x: 280, y: 430 }, tuskbridge: { x: 310, y: 470 }, proving_grounds: { x: 260, y: 500 },
  // Cogsworth Warrens
  cogsworth: { x: 260, y: 175 }, sparkhollow: { x: 290, y: 210 }, fumblewick: { x: 305, y: 160 },
  // Pelagic Depths
  coralspire: { x: 410, y: 680 }, shallows_end: { x: 470, y: 700 }, abyssal_reach: { x: 350, y: 710 },
  // Thornwilds
  thornden: { x: 720, y: 500 }, clawridge: { x: 750, y: 530 }, windrun: { x: 700, y: 540 },
  // Glimmerveil
  glimmerheart: { x: 920, y: 440 }, dewdrop_hollow: { x: 940, y: 480 }, moonpetal_grove: { x: 930, y: 520 },
  // Exotic
  skyhold: { x: 80, y: 120 }, windbreak: { x: 60, y: 160 },
  vel_naris: { x: 850, y: 375 }, gloom_market: { x: 890, y: 410 },
  misthaven: { x: 680, y: 620 }, rootholme: { x: 660, y: 660 },
  the_foundry: { x: 330, y: 260 },
  the_confluence: { x: 360, y: 530 }, emberheart: { x: 330, y: 570 },
  ashenmoor: { x: 310, y: 620 },
};

// ===========================================================================
// Hook: useMapData
// ===========================================================================

function useMapData() {
  return useQuery<MapData>({
    queryKey: ['world-map'],
    queryFn: async () => {
      const { data } = await api.get('/world/map');

      // Normalize towns: ensure mapX/mapY exist using fallback coordinates
      const towns: MapTown[] = (data.towns ?? []).map((t: any) => {
        const fallback = FALLBACK_COORDS[t.id];
        const type = t.type ?? inferTownType(t.population ?? 0);
        return {
          id: t.id,
          name: t.name,
          type,
          regionId: t.regionId,
          regionName: t.regionName ?? t.region?.name ?? '',
          mapX: t.mapX ?? t.x ?? fallback?.x ?? 500,
          mapY: t.mapY ?? t.y ?? fallback?.y ?? 450,
          population: t.population ?? 0,
          biome: t.biome ?? '',
          description: t.description ?? '',
          isPlayerHere: t.isPlayerHere ?? false,
        };
      });

      const routes: MapRoute[] = (data.routes ?? []).map((r: any) => ({
        id: r.id,
        fromTownId: r.fromTownId,
        toTownId: r.toTownId,
        name: r.name ?? '',
        difficulty: r.difficulty ?? 'safe',
        terrain: r.terrain ?? 'mixed',
        nodeCount: r.nodeCount ?? 0,
        dangerLevel: r.dangerLevel ?? 0,
        nodes: (r.nodes ?? []).map((n: any) => ({
          id: n.id,
          nodeIndex: n.nodeIndex,
          name: n.name ?? '',
          description: n.description ?? '',
          terrain: n.terrain ?? 'plains',
          dangerLevel: n.dangerLevel ?? 0,
          specialType: n.specialType ?? null,
          mapX: n.mapX ?? 0,
          mapY: n.mapY ?? 0,
        })),
      }));

      const regions: MapRegion[] = (data.regions ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        biome: r.biome ?? '',
        color: r.color ?? getRegionColor(r.id),
      }));

      return {
        towns,
        routes,
        regions,
        playerPosition: data.playerPosition ?? null,
        travelers: data.travelers ?? [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}

// ===========================================================================
// Hook: usePlayerLocation
// ===========================================================================

function usePlayerLocation() {
  return useQuery<{ currentTownId: string | null; travelStatus: string }>({
    queryKey: ['player-location'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/characters/me');
        return {
          currentTownId: data?.currentTownId ?? null,
          travelStatus: data?.travelStatus ?? 'idle',
        };
      } catch {
        return { currentTownId: null, travelStatus: 'idle' };
      }
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

// ===========================================================================
// Viewport culling helpers
// ===========================================================================

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function isInViewport(px: number, py: number, vb: ViewBox, margin: number = 100): boolean {
  return (
    px >= vb.x - margin &&
    px <= vb.x + vb.w + margin &&
    py >= vb.y - margin &&
    py <= vb.y + vb.h + margin
  );
}

// ===========================================================================
// Sub-component: TownNode
// ===========================================================================

interface TownNodeProps {
  town: MapTown;
  isPlayerHere: boolean;
  isSelected: boolean;
  zoom: number;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

function TownNode({ town, isPlayerHere, isSelected, zoom, onClick, onHoverStart, onHoverEnd }: TownNodeProps) {
  const size = getTownSize(town.type);
  const color = getRegionColor(town.regionId);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const hitSize = isMobile ? size + 4 : size + 2;

  // Capital: star/diamond shape
  const isCapital = town.type === 'capital';
  const isOutpost = town.type === 'outpost';

  // Font size scales inversely with zoom at high levels so labels don't get huge
  const labelSize = Math.max(6, Math.min(10, 9 / Math.max(zoom, 1)));

  return (
    <g
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      style={{ cursor: 'pointer' }}
    >
      {/* Player glow ring */}
      {isPlayerHere && (
        <>
          <circle cx={town.mapX} cy={town.mapY} r={size + 6} fill="none" stroke="#fbbf24" strokeWidth={2} opacity={0.6}>
            <animate attributeName="r" values={`${size + 4};${size + 8};${size + 4}`} dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={town.mapX} cy={town.mapY} r={size + 3} fill="none" stroke="#fbbf24" strokeWidth={1} opacity={0.3} />
        </>
      )}

      {/* Selection ring */}
      {isSelected && !isPlayerHere && (
        <circle cx={town.mapX} cy={town.mapY} r={size + 4} fill="none" stroke="#fbbf24" strokeWidth={1.5} opacity={0.7} />
      )}

      {/* Invisible hit area */}
      <circle cx={town.mapX} cy={town.mapY} r={hitSize} fill="transparent" />

      {/* Town shape */}
      {isCapital ? (
        // Diamond for capitals
        <g>
          <polygon
            points={`${town.mapX},${town.mapY - size} ${town.mapX + size},${town.mapY} ${town.mapX},${town.mapY + size} ${town.mapX - size},${town.mapY}`}
            fill={color}
            stroke="#fbbf24"
            strokeWidth={1.5}
            filter={isPlayerHere ? 'url(#playerGlow)' : undefined}
          />
        </g>
      ) : isOutpost ? (
        // Small diamond for outposts
        <polygon
          points={`${town.mapX},${town.mapY - size} ${town.mapX + size},${town.mapY} ${town.mapX},${town.mapY + size} ${town.mapX - size},${town.mapY}`}
          fill={color}
          stroke={color}
          strokeWidth={0.5}
          opacity={0.8}
        />
      ) : (
        // Circle for city/town/village
        <circle
          cx={town.mapX}
          cy={town.mapY}
          r={size}
          fill={color}
          stroke={town.type === 'village' ? 'none' : '#1a1a2e'}
          strokeWidth={town.type === 'village' ? 0 : 1}
          opacity={town.type === 'village' ? 0.75 : 1}
          filter={isPlayerHere ? 'url(#playerGlow)' : undefined}
        />
      )}

      {/* Town name label - always visible */}
      <text
        x={town.mapX}
        y={town.mapY + size + labelSize + 2}
        textAnchor="middle"
        fill="#E8E0D0"
        fontSize={labelSize}
        fontFamily="Crimson Text, Georgia, serif"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {town.name}
      </text>

      {/* "You Are Here" label for player */}
      {isPlayerHere && (
        <text
          x={town.mapX}
          y={town.mapY - size - 6}
          textAnchor="middle"
          fill="#fbbf24"
          fontSize={Math.max(6, 8 / Math.max(zoom, 1))}
          fontFamily="MedievalSharp, serif"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          You Are Here
        </text>
      )}
    </g>
  );
}

// ===========================================================================
// Sub-component: TravelNode
// ===========================================================================

interface TravelNodeProps {
  node: RouteNode;
  isPlayerHere: boolean;
  zoom: number;
  onHoverStart: (node: RouteNode, e: React.MouseEvent) => void;
  onHoverEnd: () => void;
}

function TravelNodeDot({ node, isPlayerHere, zoom, onHoverStart, onHoverEnd }: TravelNodeProps) {
  const color = getTerrainColor(node.terrain);
  const showLabel = zoom > 3;

  return (
    <g
      onMouseEnter={(e) => onHoverStart(node, e)}
      onMouseLeave={onHoverEnd}
      style={{ cursor: 'pointer' }}
    >
      {isPlayerHere && (
        <circle cx={node.mapX} cy={node.mapY} r={7} fill="none" stroke="#fbbf24" strokeWidth={1.5} opacity={0.7}>
          <animate attributeName="r" values="5;9;5" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      <circle
        cx={node.mapX}
        cy={node.mapY}
        r={isPlayerHere ? 5 : 4}
        fill={isPlayerHere ? '#fbbf24' : color}
        stroke={isPlayerHere ? '#fbbf24' : 'none'}
        strokeWidth={isPlayerHere ? 1 : 0}
        opacity={isPlayerHere ? 1 : 0.7}
      />
      {node.specialType && (
        <circle
          cx={node.mapX}
          cy={node.mapY - 6}
          r={2}
          fill="#fbbf24"
          opacity={0.8}
        />
      )}
      {showLabel && (
        <text
          x={node.mapX}
          y={node.mapY + 10}
          textAnchor="middle"
          fill="#A89A80"
          fontSize={5}
          fontFamily="Crimson Text, Georgia, serif"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {node.name}
        </text>
      )}
    </g>
  );
}

// ===========================================================================
// Sub-component: RouteLines
// ===========================================================================

interface RouteLinesProps {
  route: MapRoute;
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  isActive: boolean;
  isHighlighted: boolean;
  zoom: number;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

function RouteLine({ route, fromPos, toPos, isActive, isHighlighted, zoom, onClick, onHoverStart, onHoverEnd }: RouteLinesProps) {
  const style = getRouteStyle(route.difficulty, route.dangerLevel);
  const hasNodes = route.nodes && route.nodes.length > 0;

  // Build path from nodes if available, else straight line
  let pathD: string;
  if (hasNodes) {
    const sorted = [...route.nodes!].sort((a, b) => a.nodeIndex - b.nodeIndex);
    const points = [fromPos, ...sorted.map(n => ({ x: n.mapX, y: n.mapY })), toPos];
    pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  } else {
    pathD = `M ${fromPos.x} ${fromPos.y} L ${toPos.x} ${toPos.y}`;
  }

  const activeStroke = '#fbbf24';
  const highlightStroke = '#C9A461';

  return (
    <g>
      {/* Invisible wide hit area for route clicking */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        style={{ cursor: 'pointer' }}
      />
      {/* Active glow */}
      {isActive && (
        <path
          d={pathD}
          fill="none"
          stroke={activeStroke}
          strokeWidth={style.strokeWidth + 3}
          opacity={0.25}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
      )}
      {/* Visible route line */}
      <path
        d={pathD}
        fill="none"
        stroke={isActive ? activeStroke : isHighlighted ? highlightStroke : style.stroke}
        strokeWidth={isActive ? style.strokeWidth + 1 : isHighlighted ? style.strokeWidth + 0.5 : style.strokeWidth}
        strokeDasharray={isActive ? 'none' : style.dashArray}
        opacity={isActive ? 0.9 : isHighlighted ? 0.8 : 0.45}
        strokeLinecap="round"
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}

// ===========================================================================
// Sub-component: MiniMap
// ===========================================================================

interface MiniMapProps {
  towns: MapTown[];
  playerTownId: string | null;
  viewBox: ViewBox;
  onClick: (x: number, y: number) => void;
}

function MiniMap({ towns, playerTownId, viewBox, onClick }: MiniMapProps) {
  const miniW = 160;
  const miniH = 144; // same aspect ratio as 1000x900
  const scaleX = miniW / MAP_W;
  const scaleY = miniH / MAP_H;

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * MAP_W;
    const my = ((e.clientY - rect.top) / rect.height) * MAP_H;
    onClick(mx, my);
  }, [onClick]);

  return (
    <div className="absolute top-4 right-4 bg-dark-500/90 border border-dark-50 rounded-lg overflow-hidden shadow-lg hidden md:block">
      <svg
        width={miniW}
        height={miniH}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        onClick={handleClick}
        style={{ cursor: 'crosshair', display: 'block' }}
      >
        <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="#0E0E1A" />
        {towns.map(t => (
          <circle
            key={t.id}
            cx={t.mapX}
            cy={t.mapY}
            r={t.id === playerTownId ? 12 : 6}
            fill={t.id === playerTownId ? '#fbbf24' : getRegionColor(t.regionId)}
            opacity={t.id === playerTownId ? 1 : 0.6}
          />
        ))}
        {/* Viewport rect */}
        <rect
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.w}
          height={viewBox.h}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={8}
          opacity={0.5}
          rx={4}
        />
      </svg>
    </div>
  );
}

// ===========================================================================
// Sub-component: TownInfoPanel (desktop sidebar / mobile bottom sheet)
// ===========================================================================

interface TownInfoPanelProps {
  town: MapTown;
  isPlayerHere: boolean;
  isTraveling: boolean;
  connectedRoutes: MapRoute[];
  townLookup: Map<string, MapTown>;
  onClose: () => void;
  onTravel: (townId: string) => void;
  onSelectTown: (town: MapTown) => void;
}

function TownInfoPanel({
  town, isPlayerHere, isTraveling, connectedRoutes, townLookup, onClose, onTravel, onSelectTown,
}: TownInfoPanelProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const typeBadgeColor = {
    capital: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    city: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    town: 'text-parchment-300 bg-parchment-300/10 border-parchment-300/30',
    village: 'text-green-400 bg-green-400/10 border-green-400/30',
    outpost: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  }[town.type ?? 'town'] ?? 'text-parchment-300 bg-parchment-300/10 border-parchment-300/30';

  const difficultyLabel = (dl: number) => {
    if (dl <= 1) return { text: 'Safe', cls: 'text-green-400' };
    if (dl <= 3) return { text: 'Moderate', cls: 'text-yellow-400' };
    if (dl <= 6) return { text: 'Dangerous', cls: 'text-orange-400' };
    return { text: 'Deadly', cls: 'text-red-400' };
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-dark-50">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-primary-400 shrink-0" />
          <h2 className="font-display text-primary-400 text-lg truncate">{town.name}</h2>
        </div>
        <button onClick={onClose} className="text-parchment-500 hover:text-parchment-200 transition-colors shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${typeBadgeColor}`}>
            {town.type ?? 'town'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded border text-parchment-400 bg-dark-300/50 border-dark-50">
            {town.regionName}
          </span>
          {isPlayerHere && (
            <span className="text-[10px] px-2 py-0.5 rounded border text-amber-400 bg-amber-400/10 border-amber-400/30">
              Current Location
            </span>
          )}
        </div>

        {/* Population */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-3.5 h-3.5 text-parchment-500" />
          <span className="text-parchment-300">Population: {town.population.toLocaleString()}</span>
        </div>

        {/* Biome */}
        <div className="flex items-center gap-2 text-sm">
          <Info className="w-3.5 h-3.5 text-parchment-500" />
          <span className="text-parchment-300">Biome: {town.biome}</span>
        </div>

        {/* Description */}
        {town.description && (
          <p className="text-parchment-400 text-sm leading-relaxed">{town.description}</p>
        )}

        {/* Connected routes */}
        {connectedRoutes.length > 0 && (
          <div>
            <h3 className="text-parchment-200 text-xs font-display uppercase tracking-wider mb-2">Connected Routes</h3>
            <div className="space-y-2">
              {connectedRoutes.map(route => {
                const otherTownId = route.fromTownId === town.id ? route.toTownId : route.fromTownId;
                const otherTown = townLookup.get(otherTownId);
                const dl = difficultyLabel(route.dangerLevel);
                return (
                  <button
                    key={route.id}
                    onClick={() => otherTown && onSelectTown(otherTown)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-dark-400 hover:bg-dark-300 border border-dark-50 rounded transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <span className="text-parchment-200 text-xs block truncate">{otherTown?.name ?? otherTownId}</span>
                      {route.name && (
                        <span className="text-parchment-500 text-[10px] block truncate">{route.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] ${dl.cls}`}>{dl.text}</span>
                      <ChevronRight className="w-3 h-3 text-parchment-500" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Travel button */}
      {!isPlayerHere && (
        <div className="px-5 py-4 border-t border-dark-50">
          <button
            onClick={() => onTravel(town.id)}
            disabled={isTraveling}
            className="w-full py-3 rounded-lg font-display text-sm bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 border border-primary-500/30 hover:border-primary-400/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4" />
            Travel Here
          </button>
        </div>
      )}
    </div>
  );

  // Desktop: side panel
  if (!isMobile) {
    return (
      <motion.div
        initial={{ x: 320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 320, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-80 bg-dark-500 border-l border-dark-50 flex flex-col h-full shrink-0"
      >
        {content}
      </motion.div>
    );
  }

  // Mobile: bottom sheet
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute bottom-0 left-0 right-0 bg-dark-500 border-t border-dark-50 rounded-t-xl max-h-[60vh] flex flex-col z-30"
    >
      {/* Drag handle */}
      <div className="flex justify-center py-2">
        <div className="w-10 h-1 bg-dark-50 rounded-full" />
      </div>
      {content}
    </motion.div>
  );
}

// ===========================================================================
// Sub-component: NodeTooltip
// ===========================================================================

interface NodeTooltipProps {
  node: RouteNode;
  x: number;
  y: number;
}

function NodeTooltip({ node, x, y }: NodeTooltipProps) {
  return (
    <div
      className="fixed z-50 pointer-events-none bg-dark-400 border border-dark-50 rounded-lg px-3 py-2 shadow-xl"
      style={{ left: x + 12, top: y - 8 }}
    >
      <p className="font-display text-primary-400 text-xs">{node.name}</p>
      {node.description && <p className="text-parchment-500 text-[10px] mt-0.5">{node.description}</p>}
      <div className="flex items-center gap-3 mt-1">
        <span className="text-parchment-400 text-[10px] capitalize">{node.terrain}</span>
        <span className={`text-[10px] ${node.dangerLevel <= 2 ? 'text-green-400' : node.dangerLevel <= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
          Danger: {node.dangerLevel}
        </span>
      </div>
      {node.specialType && (
        <span className="text-amber-400 text-[10px] block mt-0.5">{node.specialType}</span>
      )}
    </div>
  );
}

// ===========================================================================
// Sub-component: RouteInfoTooltip (in SVG)
// ===========================================================================

interface RouteTooltipSVGProps {
  route: MapRoute;
  midX: number;
  midY: number;
}

function RouteTooltipSVG({ route, midX, midY }: RouteTooltipSVGProps) {
  const dl = route.dangerLevel ?? 0;
  const label = dl <= 1 ? 'Safe' : dl <= 3 ? 'Moderate' : dl <= 6 ? 'Dangerous' : 'Deadly';
  const color = dl <= 1 ? '#4ade80' : dl <= 3 ? '#facc15' : dl <= 6 ? '#fb923c' : '#ef4444';

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={midX - 55}
        y={midY - 26}
        width={110}
        height={36}
        rx={4}
        fill="#252538"
        stroke="#C9A461"
        strokeWidth={0.5}
        opacity={0.95}
      />
      <text x={midX} y={midY - 10} textAnchor="middle" fill="#E8E0D0" fontSize={9} fontFamily="Crimson Text, serif">
        {route.name || `${route.nodeCount ?? '?'} nodes`}
      </text>
      <text x={midX} y={midY + 3} textAnchor="middle" fill={color} fontSize={8} fontFamily="Crimson Text, serif">
        {label} (Danger {dl})
      </text>
    </g>
  );
}

// ===========================================================================
// Main Component
// ===========================================================================

export default function WorldMapPage() {
  const svgRef = useRef<SVGSVGElement>(null);

  // Data
  const { data: mapData, isLoading, error: loadError } = useMapData();
  const { data: playerLoc } = usePlayerLocation();

  // UI state
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, w: MAP_W, h: MAP_H });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedTown, setSelectedTown] = useState<MapTown | null>(null);
  const [hoveredRoute, setHoveredRoute] = useState<MapRoute | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ node: RouteNode; screenX: number; screenY: number } | null>(null);
  const [showTravelers, setShowTravelers] = useState(true);
  const [travelModalOpen, setTravelModalOpen] = useState(false);
  const [travelDestination, setTravelDestination] = useState<string | undefined>();

  // Computed zoom level (1 = default; >1 = zoomed in)
  const zoom = useMemo(() => MAP_W / viewBox.w, [viewBox.w]);

  // LOD thresholds
  const showTravelNodes = zoom >= 1.5;
  const showFullDetail = zoom >= 3;

  // Town lookup
  const townLookup = useMemo(() => {
    if (!mapData) return new Map<string, MapTown>();
    const m = new Map<string, MapTown>();
    for (const t of mapData.towns) m.set(t.id, t);
    return m;
  }, [mapData]);

  // Player town ID — from mapData if available, else from character query
  const playerTownId = useMemo(() => {
    if (mapData?.playerPosition?.townId) return mapData.playerPosition.townId;
    // Check isPlayerHere flag on towns
    const hereTown = mapData?.towns.find(t => t.isPlayerHere);
    if (hereTown) return hereTown.id;
    return playerLoc?.currentTownId ?? null;
  }, [mapData, playerLoc]);

  const isTraveling = useMemo(() => {
    if (mapData?.playerPosition?.type === 'traveling') return true;
    return playerLoc?.travelStatus === 'traveling';
  }, [mapData, playerLoc]);

  // Routes connected to selected town
  const connectedRoutes = useMemo(() => {
    if (!selectedTown || !mapData) return [];
    return mapData.routes.filter(r => r.fromTownId === selectedTown.id || r.toTownId === selectedTown.id);
  }, [selectedTown, mapData]);

  // Traveler clusters — group by position
  const travelerClusters = useMemo(() => {
    if (!mapData?.travelers?.length) return [];
    const groups = new Map<string, { x: number; y: number; travelers: Traveler[] }>();
    for (const t of mapData.travelers) {
      const route = mapData.routes.find(r => r.id === t.routeId);
      if (!route?.nodes?.length) continue;
      const node = route.nodes.find(n => n.nodeIndex === t.nodeIndex);
      if (!node) continue;
      const key = `${node.mapX}-${node.mapY}`;
      const group = groups.get(key) ?? { x: node.mapX, y: node.mapY, travelers: [] };
      group.travelers.push(t);
      groups.set(key, group);
    }
    return Array.from(groups.values());
  }, [mapData]);

  // ===========================================================================
  // Pan & Zoom handlers
  // ===========================================================================

  const clampViewBox = useCallback((vb: ViewBox): ViewBox => {
    const minW = MAP_W / MAX_ZOOM;
    const maxW = MAP_W / MIN_ZOOM;
    const w = Math.max(minW, Math.min(maxW, vb.w));
    const h = w * (MAP_H / MAP_W);
    // Allow panning with some margin
    const margin = w * 0.3;
    const x = Math.max(-margin, Math.min(MAP_W - w + margin, vb.x));
    const y = Math.max(-margin, Math.min(MAP_H - h + margin, vb.y));
    return { x, y, w, h };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = viewBox.w / rect.width;
    const scaleY = viewBox.h / rect.height;
    const dx = (e.clientX - panStart.x) * scaleX;
    const dy = (e.clientY - panStart.y) * scaleY;
    setViewBox(prev => clampViewBox({ ...prev, x: prev.x - dx, y: prev.y - dy }));
    setPanStart({ x: e.clientX, y: e.clientY });
  }, [isPanning, panStart, viewBox.w, viewBox.h, clampViewBox]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Wheel zoom — centers on cursor position
  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    // Mouse position in SVG coordinate space
    const mouseXRatio = (e.clientX - rect.left) / rect.width;
    const mouseYRatio = (e.clientY - rect.top) / rect.height;
    const mouseSvgX = viewBox.x + mouseXRatio * viewBox.w;
    const mouseSvgY = viewBox.y + mouseYRatio * viewBox.h;

    const factor = e.deltaY > 0 ? 1.12 : 0.89;

    setViewBox(prev => {
      const newW = prev.w * factor;
      const newH = newW * (MAP_H / MAP_W);
      // Keep the mouse position stable
      const newX = mouseSvgX - mouseXRatio * newW;
      const newY = mouseSvgY - mouseYRatio * newH;
      return clampViewBox({ x: newX, y: newY, w: newW, h: newH });
    });
  }, [viewBox, clampViewBox]);

  // Touch handlers for mobile pinch/pan
  const touchRef = useRef<{ dist: number; mid: { x: number; y: number }; vb: ViewBox } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      touchRef.current = {
        dist: Math.sqrt(dx * dx + dy * dy),
        mid: {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        },
        vb: { ...viewBox },
      };
    } else if (e.touches.length === 1) {
      setIsPanning(true);
      setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, [viewBox]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchRef.current && svgRef.current) {
      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      const scale = touchRef.current.dist / newDist;
      const newW = touchRef.current.vb.w * scale;
      const newH = newW * (MAP_H / MAP_W);
      const newMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const newMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect = svgRef.current.getBoundingClientRect();
      const panDx = ((newMidX - touchRef.current.mid.x) / rect.width) * newW;
      const panDy = ((newMidY - touchRef.current.mid.y) / rect.height) * newH;
      setViewBox(clampViewBox({
        x: touchRef.current.vb.x + (touchRef.current.vb.w - newW) / 2 - panDx,
        y: touchRef.current.vb.y + (touchRef.current.vb.h - newH) / 2 - panDy,
        w: newW,
        h: newH,
      }));
    } else if (e.touches.length === 1 && isPanning && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = viewBox.w / rect.width;
      const scaleY = viewBox.h / rect.height;
      const dx = (e.touches[0].clientX - panStart.x) * scaleX;
      const dy = (e.touches[0].clientY - panStart.y) * scaleY;
      setViewBox(prev => clampViewBox({ ...prev, x: prev.x - dx, y: prev.y - dy }));
      setPanStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, [isPanning, panStart, viewBox, clampViewBox]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
    touchRef.current = null;
  }, []);

  // Keyboard handlers
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const PAN_STEP = viewBox.w * 0.1;
      switch (e.key) {
        case 'ArrowLeft':
          setViewBox(prev => clampViewBox({ ...prev, x: prev.x - PAN_STEP }));
          break;
        case 'ArrowRight':
          setViewBox(prev => clampViewBox({ ...prev, x: prev.x + PAN_STEP }));
          break;
        case 'ArrowUp':
          setViewBox(prev => clampViewBox({ ...prev, y: prev.y - PAN_STEP }));
          break;
        case 'ArrowDown':
          setViewBox(prev => clampViewBox({ ...prev, y: prev.y + PAN_STEP }));
          break;
        case '+':
        case '=': {
          setViewBox(prev => {
            const cx = prev.x + prev.w / 2;
            const cy = prev.y + prev.h / 2;
            const nw = prev.w * 0.85;
            const nh = nw * (MAP_H / MAP_W);
            return clampViewBox({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh });
          });
          break;
        }
        case '-':
        case '_': {
          setViewBox(prev => {
            const cx = prev.x + prev.w / 2;
            const cy = prev.y + prev.h / 2;
            const nw = prev.w * 1.18;
            const nh = nw * (MAP_H / MAP_W);
            return clampViewBox({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh });
          });
          break;
        }
        case 'Escape':
          setSelectedTown(null);
          setHoveredRoute(null);
          break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewBox.w, clampViewBox]);

  // ===========================================================================
  // Actions
  // ===========================================================================

  const zoomIn = useCallback(() => {
    setViewBox(prev => {
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      const nw = prev.w * 0.8;
      const nh = nw * (MAP_H / MAP_W);
      return clampViewBox({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh });
    });
  }, [clampViewBox]);

  const zoomOut = useCallback(() => {
    setViewBox(prev => {
      const cx = prev.x + prev.w / 2;
      const cy = prev.y + prev.h / 2;
      const nw = prev.w * 1.25;
      const nh = nw * (MAP_H / MAP_W);
      return clampViewBox({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh });
    });
  }, [clampViewBox]);

  const centerOnPlayer = useCallback(() => {
    if (!playerTownId) return;
    const town = townLookup.get(playerTownId);
    if (!town) return;
    const w = 400;
    const h = w * (MAP_H / MAP_W);
    setViewBox(clampViewBox({ x: town.mapX - w / 2, y: town.mapY - h / 2, w, h }));
  }, [playerTownId, townLookup, clampViewBox]);

  const handleMiniMapClick = useCallback((mx: number, my: number) => {
    setViewBox(prev => clampViewBox({ ...prev, x: mx - prev.w / 2, y: my - prev.h / 2 }));
  }, [clampViewBox]);

  const handleTravelClick = useCallback((townId: string) => {
    setTravelDestination(townId);
    setTravelModalOpen(true);
  }, []);

  const handleTravelNodeHover = useCallback((node: RouteNode, e: React.MouseEvent) => {
    setHoveredNode({ node, screenX: e.clientX, screenY: e.clientY });
  }, []);

  // ===========================================================================
  // Render
  // ===========================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-500">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-primary-400 font-display text-2xl animate-pulse">
            Charting the realm...
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !mapData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-500">
        <div className="text-center">
          <Shield className="w-12 h-12 text-parchment-500/30 mx-auto mb-4" />
          <p className="text-parchment-300 font-display text-xl mb-2">No map data available</p>
          <p className="text-parchment-500 text-sm">The cartographers are still at work.</p>
        </div>
      </div>
    );
  }

  // Build lists of visible elements (viewport culling)
  const visibleTowns = mapData.towns.filter(t => isInViewport(t.mapX, t.mapY, viewBox));

  const visibleRoutes = mapData.routes.filter(r => {
    const from = townLookup.get(r.fromTownId);
    const to = townLookup.get(r.toTownId);
    if (!from || !to) return false;
    // Route is visible if either endpoint is in viewport
    return isInViewport(from.mapX, from.mapY, viewBox, 200) || isInViewport(to.mapX, to.mapY, viewBox, 200);
  });

  // Collect visible travel nodes from visible routes
  const visibleTravelNodes: { node: RouteNode; routeId: string }[] = [];
  if (showTravelNodes) {
    for (const route of visibleRoutes) {
      if (!route.nodes) continue;
      for (const node of route.nodes) {
        if (isInViewport(node.mapX, node.mapY, viewBox)) {
          visibleTravelNodes.push({ node, routeId: route.id });
        }
      }
    }
  }

  // Determine active route (player is on it)
  const activeRouteId = mapData.playerPosition?.routeId ?? null;
  const playerNodeIndex = mapData.playerPosition?.nodeIndex ?? null;

  // Region labels (shown at low zoom)
  const regionCenters = new Map<string, { x: number; y: number; name: string }>();
  if (zoom < 2) {
    const regionTowns = new Map<string, MapTown[]>();
    for (const t of mapData.towns) {
      const arr = regionTowns.get(t.regionId) ?? [];
      arr.push(t);
      regionTowns.set(t.regionId, arr);
    }
    for (const [regionId, towns] of regionTowns) {
      if (towns.length < 2) continue;
      const cx = towns.reduce((s, t) => s + t.mapX, 0) / towns.length;
      const cy = towns.reduce((s, t) => s + t.mapY, 0) / towns.length;
      const region = mapData.regions.find(r => r.id === regionId);
      if (region) {
        regionCenters.set(regionId, { x: cx, y: cy, name: region.name });
      }
    }
  }

  return (
    <div className="min-h-screen bg-dark-500 flex flex-col">
      {/* Map + Panel layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* SVG Map */}
        <div className="flex-1 relative overflow-hidden" style={{ touchAction: 'none' }}>
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            className={`w-full h-full ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={() => {
              // Clicking background deselects
              if (!isPanning) {
                setSelectedTown(null);
                setHoveredRoute(null);
              }
            }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* --- SVG Defs --- */}
            <defs>
              <radialGradient id="mapBgGrad" cx="50%" cy="50%" r="65%">
                <stop offset="0%" stopColor="#1a1a2e" />
                <stop offset="100%" stopColor="#080810" />
              </radialGradient>

              <filter id="playerGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feFlood floodColor="#fbbf24" floodOpacity="0.4" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id="activeRouteGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feFlood floodColor="#fbbf24" floodOpacity="0.3" />
                <feComposite in2="blur" operator="in" />
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* === Layer 1: Background === */}
            <rect
              x={-200}
              y={-200}
              width={MAP_W + 400}
              height={MAP_H + 400}
              fill="url(#mapBgGrad)"
            />

            {/* === Layer 2: Region boundaries (subtle) === */}
            {zoom < 2 && Array.from(regionCenters.entries()).map(([regionId, center]) => {
              const color = getRegionColor(regionId);
              return (
                <g key={`region-${regionId}`}>
                  <circle
                    cx={center.x}
                    cy={center.y}
                    r={80}
                    fill={color}
                    opacity={0.04}
                    style={{ pointerEvents: 'none' }}
                  />
                  <text
                    x={center.x}
                    y={center.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={color}
                    fontSize={14}
                    fontFamily="MedievalSharp, serif"
                    opacity={0.3}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {center.name}
                  </text>
                </g>
              );
            })}

            {/* === Layer 3: Route lines === */}
            {visibleRoutes.map(route => {
              const from = townLookup.get(route.fromTownId);
              const to = townLookup.get(route.toTownId);
              if (!from || !to) return null;

              const isActive = route.id === activeRouteId;
              const isHighlighted = hoveredRoute?.id === route.id;

              return (
                <RouteLine
                  key={route.id}
                  route={route}
                  fromPos={{ x: from.mapX, y: from.mapY }}
                  toPos={{ x: to.mapX, y: to.mapY }}
                  isActive={isActive}
                  isHighlighted={isHighlighted}
                  zoom={zoom}
                  onClick={() => setHoveredRoute(hoveredRoute?.id === route.id ? null : route)}
                  onHoverStart={() => setHoveredRoute(route)}
                  onHoverEnd={() => setHoveredRoute(null)}
                />
              );
            })}

            {/* === Layer 4: Travel nodes === */}
            {showTravelNodes && visibleTravelNodes.map(({ node, routeId }) => {
              const isPlayerNode =
                activeRouteId === routeId &&
                playerNodeIndex === node.nodeIndex &&
                mapData.playerPosition?.type === 'traveling';
              return (
                <TravelNodeDot
                  key={node.id}
                  node={node}
                  isPlayerHere={isPlayerNode}
                  zoom={zoom}
                  onHoverStart={handleTravelNodeHover}
                  onHoverEnd={() => setHoveredNode(null)}
                />
              );
            })}

            {/* === Layer 5: Town nodes === */}
            {visibleTowns.map(town => (
              <TownNode
                key={town.id}
                town={town}
                isPlayerHere={town.id === playerTownId}
                isSelected={selectedTown?.id === town.id}
                zoom={zoom}
                onClick={() => setSelectedTown(selectedTown?.id === town.id ? null : town)}
                onHoverStart={() => {}}
                onHoverEnd={() => {}}
              />
            ))}

            {/* === Layer 6: Travelers === */}
            {showTravelers && showTravelNodes && travelerClusters.map((cluster, i) => (
              <g key={`travelers-${i}`}>
                <circle
                  cx={cluster.x}
                  cy={cluster.y}
                  r={5}
                  fill="#3B82F6"
                  opacity={0.7}
                  stroke="#1e40af"
                  strokeWidth={0.5}
                />
                {cluster.travelers.length > 1 && (
                  <text
                    x={cluster.x}
                    y={cluster.y + 1}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={5}
                    fontWeight="bold"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {cluster.travelers.length}
                  </text>
                )}
              </g>
            ))}

            {/* === Route hover tooltip (SVG) === */}
            {hoveredRoute && (() => {
              const from = townLookup.get(hoveredRoute.fromTownId);
              const to = townLookup.get(hoveredRoute.toTownId);
              if (!from || !to) return null;
              const midX = (from.mapX + to.mapX) / 2;
              const midY = (from.mapY + to.mapY) / 2;
              return <RouteTooltipSVG route={hoveredRoute} midX={midX} midY={midY} />;
            })()}
          </svg>

          {/* === UI Overlay: Zoom controls === */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-10">
            <button
              onClick={zoomIn}
              className="w-9 h-9 bg-dark-400/90 border border-dark-50 rounded-lg text-parchment-300 hover:text-primary-400 hover:border-primary-400/50 transition-colors flex items-center justify-center"
              title="Zoom in (+)"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={zoomOut}
              className="w-9 h-9 bg-dark-400/90 border border-dark-50 rounded-lg text-parchment-300 hover:text-primary-400 hover:border-primary-400/50 transition-colors flex items-center justify-center"
              title="Zoom out (-)"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="w-9 h-px bg-dark-50 my-0.5" />
            <button
              onClick={centerOnPlayer}
              className="w-9 h-9 bg-dark-400/90 border border-dark-50 rounded-lg text-parchment-300 hover:text-primary-400 hover:border-primary-400/50 transition-colors flex items-center justify-center"
              title="Center on me"
            >
              <Compass className="w-4 h-4" />
            </button>
            {mapData.travelers && mapData.travelers.length > 0 && (
              <button
                onClick={() => setShowTravelers(prev => !prev)}
                className={`w-9 h-9 bg-dark-400/90 border rounded-lg transition-colors flex items-center justify-center ${
                  showTravelers ? 'border-blue-400/50 text-blue-400' : 'border-dark-50 text-parchment-500'
                }`}
                title={showTravelers ? 'Hide travelers' : 'Show travelers'}
              >
                {showTravelers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* === UI Overlay: Zoom level + LOD indicator === */}
          <div className="absolute top-4 left-4 bg-dark-400/90 border border-dark-50 rounded-lg px-3 py-1.5 z-10">
            <span className="text-parchment-500 text-[10px] uppercase tracking-wider">
              {zoom < 1.5 ? 'Continent View' : zoom < 3 ? 'Region View' : 'Detail View'}
            </span>
            <span className="text-parchment-500/50 text-[9px] ml-2">
              {zoom.toFixed(1)}x
            </span>
          </div>

          {/* === UI Overlay: Title === */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <h1 className="font-display text-primary-400 text-xl md:text-2xl drop-shadow-lg whitespace-nowrap">
              World of Aethermere
            </h1>
          </div>

          {/* === UI Overlay: MiniMap === */}
          <MiniMap
            towns={mapData.towns}
            playerTownId={playerTownId}
            viewBox={viewBox}
            onClick={handleMiniMapClick}
          />

          {/* === UI Overlay: Legend (bottom-left) === */}
          <RegionLegend regions={mapData.regions} />

          {/* === HTML Overlay: Travel node tooltip === */}
          {hoveredNode && (
            <NodeTooltip
              node={hoveredNode.node}
              x={hoveredNode.screenX}
              y={hoveredNode.screenY}
            />
          )}
        </div>

        {/* === Town Info Panel === */}
        <AnimatePresence>
          {selectedTown && (
            <TownInfoPanel
              key={selectedTown.id}
              town={selectedTown}
              isPlayerHere={selectedTown.id === playerTownId}
              isTraveling={isTraveling}
              connectedRoutes={connectedRoutes}
              townLookup={townLookup}
              onClose={() => setSelectedTown(null)}
              onTravel={handleTravelClick}
              onSelectTown={setSelectedTown}
            />
          )}
        </AnimatePresence>
      </div>

      {/* === Travel Modal === */}
      <TravelStartModal
        isOpen={travelModalOpen}
        onClose={() => { setTravelModalOpen(false); setTravelDestination(undefined); }}
        destinationTownId={travelDestination}
      />
    </div>
  );
}

// ===========================================================================
// Sub-component: RegionLegend (collapsible)
// ===========================================================================

function RegionLegend({ regions }: { regions: MapRegion[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-10">
      <div className="bg-dark-400/90 border border-dark-50 rounded-lg overflow-hidden">
        <button
          onClick={() => setOpen(prev => !prev)}
          className="flex items-center gap-2 px-3 py-2 w-full text-left"
        >
          <MapPin className="w-3 h-3 text-primary-400" />
          <span className="font-display text-primary-400 text-xs">Regions</span>
          <span className="text-parchment-500 text-[10px] ml-auto">{open ? '[-]' : '[+]'}</span>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-2 space-y-1 max-h-48 overflow-y-auto">
                {regions.map(r => (
                  <div key={r.id} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: getRegionColor(r.id) }}
                    />
                    <span className="text-parchment-300 text-[10px]">{r.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
