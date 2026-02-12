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

// LOD zoom thresholds
const ZOOM_REGIONAL = 2.0;
const ZOOM_DETAIL = 4.0;

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

// Town node sizes in screen pixels (non-scaling via 1/zoom)
function getTownSize(type?: string): number {
  switch (type) {
    case 'capital': return 19;
    case 'city': return 13;
    case 'town': return 9;
    case 'village': return 6;
    case 'outpost': return 4;
    default: return 9;
  }
}

// Town type priority for label collision ordering
function getTownPriority(type?: string): number {
  switch (type) {
    case 'capital': return 5;
    case 'city': return 4;
    case 'town': return 3;
    case 'village': return 2;
    case 'outpost': return 1;
    default: return 3;
  }
}

// Label font sizes in screen pixels (non-scaling via 1/zoom)
function getLabelFontSize(type?: string): number {
  switch (type) {
    case 'capital': return 16;
    case 'city': return 13;
    case 'town': return 11;
    case 'village': return 9;
    case 'outpost': return 8;
    default: return 11;
  }
}

// Town fill opacity by type
function getTownOpacity(type?: string): number {
  switch (type) {
    case 'capital': return 1;
    case 'city': return 1;
    case 'town': return 0.85;
    case 'village': return 0.6;
    case 'outpost': return 0.5;
    default: return 0.85;
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

// Single muted route color used everywhere
const ROUTE_COLOR = '#B4A078'; // parchment-gold muted

// ===========================================================================
// Label Collision Avoidance
// ===========================================================================

interface LabelPlacement {
  x: number;
  y: number;
  show: boolean;
  anchor: 'start' | 'middle' | 'end';
}

interface LabelRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function rectsOverlap(a: LabelRect, b: LabelRect): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

/**
 * Priority-based label collision avoidance.
 * For each visible town (sorted by priority), tries 8 label placement positions.
 * Returns a Map from town ID to { x, y, show, anchor }.
 */
function computeLabelLayout(
  towns: MapTown[],
  zoom: number,
): Map<string, LabelPlacement> {
  const result = new Map<string, LabelPlacement>();
  const placedRects: LabelRect[] = [];

  // Scale factor: all sizes in SVG coords are divided by zoom to stay constant on screen
  const s = 1 / zoom;

  // Also treat town node circles as occupied rects to avoid overlapping nodes
  const nodeRects: LabelRect[] = towns.map(t => {
    const size = getTownSize(t.type) * s;
    return {
      x1: t.mapX - size,
      y1: t.mapY - size,
      x2: t.mapX + size,
      y2: t.mapY + size,
    };
  });

  // Sort by priority descending (capitals first)
  const sorted = [...towns].sort((a, b) => getTownPriority(b.type) - getTownPriority(a.type));

  // Approximate char width in SVG coords at a given font size (already zoom-scaled)
  const charWidth = (fs: number) => fs * s * 0.55;
  const lineHeight = (fs: number) => fs * s * 1.3;

  // 8 candidate positions: S, N, E, W, SE, SW, NE, NW
  type Offset = { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' };
  const getOffsets = (nodeSize: number, fontSize: number): Offset[] => {
    const gap = 3 * s;
    const ns = nodeSize * s; // node size in SVG coords
    const lh = lineHeight(fontSize);
    const fsSvg = fontSize * s;
    return [
      { dx: 0, dy: ns + gap + lh * 0.7, anchor: 'middle' },        // S (below)
      { dx: 0, dy: -(ns + gap), anchor: 'middle' },                 // N (above)
      { dx: ns + gap, dy: fsSvg * 0.35, anchor: 'start' },          // E (right)
      { dx: -(ns + gap), dy: fsSvg * 0.35, anchor: 'end' },         // W (left)
      { dx: ns + gap, dy: ns + gap + lh * 0.4, anchor: 'start' },   // SE
      { dx: -(ns + gap), dy: ns + gap + lh * 0.4, anchor: 'end' },  // SW
      { dx: ns + gap, dy: -(ns * 0.5), anchor: 'start' },           // NE
      { dx: -(ns + gap), dy: -(ns * 0.5), anchor: 'end' },          // NW
    ];
  };

  for (const town of sorted) {
    const fontSize = getLabelFontSize(town.type);
    const nodeSize = getTownSize(town.type);
    const textW = town.name.length * charWidth(fontSize);
    const textH = lineHeight(fontSize);
    const offsets = getOffsets(nodeSize, fontSize);

    let placed = false;

    for (const offset of offsets) {
      let lx: number;
      if (offset.anchor === 'middle') {
        lx = town.mapX + offset.dx - textW / 2;
      } else if (offset.anchor === 'start') {
        lx = town.mapX + offset.dx;
      } else {
        // 'end'
        lx = town.mapX + offset.dx - textW;
      }
      const ly = town.mapY + offset.dy - textH * 0.5;

      const candidateRect: LabelRect = {
        x1: lx - 1,
        y1: ly - 1,
        x2: lx + textW + 1,
        y2: ly + textH + 1,
      };

      // Check overlap with all already-placed labels
      let overlaps = false;
      for (const pr of placedRects) {
        if (rectsOverlap(candidateRect, pr)) {
          overlaps = true;
          break;
        }
      }

      // Also check overlap with town node rects (avoid covering nodes)
      if (!overlaps) {
        for (const nr of nodeRects) {
          if (rectsOverlap(candidateRect, nr)) {
            overlaps = true;
            break;
          }
        }
      }

      if (!overlaps) {
        result.set(town.id, {
          x: town.mapX + offset.dx,
          y: town.mapY + offset.dy,
          show: true,
          anchor: offset.anchor,
        });
        placedRects.push(candidateRect);
        placed = true;
        break;
      }
    }

    if (!placed) {
      // Mark as hover-only — do not render label normally
      result.set(town.id, {
        x: town.mapX,
        y: town.mapY + nodeSize * s + 10 * s,
        show: false,
        anchor: 'middle' as const,
      });
    }
  }

  return result;
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

// Determine if a town is visible at the current zoom level
function isTownVisibleAtZoom(type: string | undefined, zoom: number): boolean {
  const t = type ?? 'town';
  if (zoom < ZOOM_REGIONAL) {
    // Continental: only capitals and cities
    return t === 'capital' || t === 'city';
  }
  if (zoom < ZOOM_DETAIL) {
    // Regional: all town types, no travel nodes
    return t === 'capital' || t === 'city' || t === 'town' || t === 'village' || t === 'outpost';
  }
  // Detail: everything
  return true;
}

// ===========================================================================
// Sub-component: TownNode (with LOD-aware rendering)
// ===========================================================================

interface TownNodeProps {
  town: MapTown;
  isPlayerHere: boolean;
  isSelected: boolean;
  zoom: number;
  labelPlacement: LabelPlacement | undefined;
  isHovered: boolean;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

function TownNode({ town, isPlayerHere, isSelected, zoom, labelPlacement, isHovered, onClick, onHoverStart, onHoverEnd }: TownNodeProps) {
  // All sizes divided by zoom to stay constant in screen pixels
  const s = 1 / zoom;
  const size = getTownSize(town.type) * s;
  const opacity = getTownOpacity(town.type);

  // Node fill colors by type — clear visual hierarchy
  const color = town.type === 'capital' ? '#D4A843'
    : town.type === 'city' ? '#C8B898'
    : town.type === 'town' ? '#9098A0'
    : town.type === 'village' ? '#707880'
    : '#585E64';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const hitSize = (isMobile ? getTownSize(town.type) + 8 : getTownSize(town.type) + 6) * s;

  const isCapital = town.type === 'capital';
  const isCity = town.type === 'city';
  const isOutpost = town.type === 'outpost';

  const fontSize = getLabelFontSize(town.type) * s;
  const showLabel = labelPlacement?.show ?? false;

  // Hover-only labels: show when hovered or selected
  const showHoverLabel = !showLabel && (isHovered || isSelected);

  // Scaled constants
  const strokeW = s; // 1px screen stroke

  return (
    <g
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      className="town-node"
      style={{ cursor: 'pointer' }}
    >
      {/* Player glow ring */}
      {isPlayerHere && (
        <>
          <circle cx={town.mapX} cy={town.mapY} r={size + 6 * s} fill="none" stroke="#fbbf24" strokeWidth={2 * s} opacity={0.6}>
            <animate attributeName="r" values={`${size + 4 * s};${size + 8 * s};${size + 4 * s}`} dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={town.mapX} cy={town.mapY} r={size + 3 * s} fill="none" stroke="#fbbf24" strokeWidth={strokeW} opacity={0.3} />
        </>
      )}

      {/* Selection ring - bright gold */}
      {isSelected && (
        <circle cx={town.mapX} cy={town.mapY} r={size + 5 * s} fill="none" stroke="#fbbf24" strokeWidth={3 * s} opacity={0.9} />
      )}

      {/* Invisible hit area */}
      <circle cx={town.mapX} cy={town.mapY} r={hitSize} fill="transparent" />

      {/* Town shape */}
      {isCapital ? (
        // Diamond with gold border and glow for capitals
        <polygon
          points={`${town.mapX},${town.mapY - size} ${town.mapX + size},${town.mapY} ${town.mapX},${town.mapY + size} ${town.mapX - size},${town.mapY}`}
          fill={color}
          stroke="#fbbf24"
          strokeWidth={2 * s}
          filter="url(#capitalGlow)"
          opacity={opacity}
        />
      ) : isOutpost ? (
        // Small diamond for outposts
        <polygon
          points={`${town.mapX},${town.mapY - size} ${town.mapX + size},${town.mapY} ${town.mapX},${town.mapY + size} ${town.mapX - size},${town.mapY}`}
          fill={color}
          stroke="none"
          opacity={opacity}
        />
      ) : isCity ? (
        // Circle with thick border for cities
        <circle
          cx={town.mapX}
          cy={town.mapY}
          r={size}
          fill={color}
          stroke="#1a1a2e"
          strokeWidth={1.5 * s}
          opacity={opacity}
          filter={isPlayerHere ? 'url(#playerGlow)' : undefined}
        />
      ) : (
        // Circle for town/village/outpost
        <circle
          cx={town.mapX}
          cy={town.mapY}
          r={size}
          fill={color}
          stroke={town.type === 'town' ? '#1a1a2e' : 'none'}
          strokeWidth={town.type === 'town' ? 0.8 * s : 0}
          opacity={opacity}
          filter={isPlayerHere ? 'url(#playerGlow)' : undefined}
        />
      )}

      {/* Town name label - collision-aware placement */}
      {showLabel && labelPlacement && (
        <text
          x={labelPlacement.x}
          y={labelPlacement.y}
          textAnchor={labelPlacement.anchor}
          fill={isCapital ? '#E8D5A0' : isCity ? '#D8D0C0' : '#B8B0A0'}
          fontSize={fontSize}
          fontWeight={isCapital ? 'bold' : 'normal'}
          fontFamily="Crimson Text, Georgia, serif"
          className="map-label"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {town.name}
        </text>
      )}

      {/* Hover-only label (for labels that couldn't be placed without overlap) */}
      {showHoverLabel && (
        <g className="map-label-hover" style={{ pointerEvents: 'none' }}>
          {/* Background rect for readability */}
          <rect
            x={town.mapX - (town.name.length * fontSize * 0.275) - 3 * s}
            y={town.mapY + size + 2 * s}
            width={town.name.length * fontSize * 0.55 + 6 * s}
            height={fontSize + 4 * s}
            rx={2 * s}
            fill="#1a1a2e"
            opacity={0.85}
          />
          <text
            x={town.mapX}
            y={town.mapY + size + fontSize + 2 * s}
            textAnchor="middle"
            fill="#fbbf24"
            fontSize={fontSize}
            fontFamily="Crimson Text, Georgia, serif"
            style={{ userSelect: 'none' }}
          >
            {town.name}
          </text>
        </g>
      )}

      {/* "You Are Here" label for player */}
      {isPlayerHere && (
        <text
          x={town.mapX}
          y={town.mapY - size - 8 * s}
          textAnchor="middle"
          fill="#fbbf24"
          fontSize={10 * s}
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
// Sub-component: WaypointDots — evenly spaced along straight road line
// ===========================================================================

interface WaypointDotsProps {
  route: MapRoute;
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  zoom: number;
  activeRouteId: string | null;
  playerNodeIndex: number | null;
  isPlayerTraveling: boolean;
  onHoverStart: (node: RouteNode, e: React.MouseEvent, totalNodes: number) => void;
  onHoverEnd: () => void;
}

function WaypointDots({ route, fromPos, toPos, zoom, activeRouteId, playerNodeIndex, isPlayerTraveling, onHoverStart, onHoverEnd }: WaypointDotsProps) {
  const nodeCount = route.nodes?.length ?? 0;
  if (nodeCount === 0) return null;

  const s = 1 / zoom;
  const sortedNodes = [...route.nodes!].sort((a, b) => a.nodeIndex - b.nodeIndex);
  const hoverEnabled = zoom >= ZOOM_REGIONAL; // hover tooltips at zoom 2-3 only

  return (
    <g>
      {sortedNodes.map((node, i) => {
        // Evenly space dots along the straight line: t = (i+1) / (nodeCount+1)
        const t = (i + 1) / (nodeCount + 1);
        const cx = fromPos.x + (toPos.x - fromPos.x) * t;
        const cy = fromPos.y + (toPos.y - fromPos.y) * t;

        const isPlayerNode =
          activeRouteId === route.id &&
          playerNodeIndex === node.nodeIndex &&
          isPlayerTraveling;

        return (
          <g
            key={node.id}
            onMouseEnter={hoverEnabled ? (e) => onHoverStart(node, e, nodeCount) : undefined}
            onMouseLeave={hoverEnabled ? onHoverEnd : undefined}
            style={hoverEnabled ? { cursor: 'pointer' } : undefined}
          >
            {isPlayerNode && (
              <circle cx={cx} cy={cy} r={6 * s} fill="none" stroke="#fbbf24" strokeWidth={1.5 * s} opacity={0.7}>
                <animate attributeName="r" values={`${4 * s};${8 * s};${4 * s}`} dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}
            <circle
              cx={cx}
              cy={cy}
              r={(isPlayerNode ? 5 : 4) * s}
              fill={isPlayerNode ? '#fbbf24' : '#8B7D6B'}
              stroke={isPlayerNode ? '#fbbf24' : '#B4A078'}
              strokeWidth={0.8 * s}
              opacity={isPlayerNode ? 1 : 0.85}
            />
          </g>
        );
      })}
    </g>
  );
}

// ===========================================================================
// Sub-component: RouteLine (zoom-dependent styling)
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
  const s = 1 / zoom; // scale factor for constant screen-pixel sizes

  // Active travel route: always fully visible with glow
  if (isActive) {
    return (
      <g>
        <line x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y}
          stroke="transparent" strokeWidth={14 * s}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}
          style={{ cursor: 'pointer' }} />
        <line x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y}
          stroke="#D4A843" strokeWidth={4 * s} opacity={0.15}
          strokeLinecap="round" style={{ pointerEvents: 'none' }} />
        <line x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y}
          stroke="#D4A843" strokeWidth={2 * s} opacity={0.7}
          strokeLinecap="round" style={{ pointerEvents: 'none' }}
          filter="url(#activeRouteGlow)" />
      </g>
    );
  }

  // Zoom-dependent route styling — ONE muted color, no dashing, no multi-color
  const strokeWidth = 1.5 * s;
  const routeOpacity = zoom < ZOOM_REGIONAL
    ? (isHighlighted ? 0.6 : 0.25)
    : zoom < ZOOM_DETAIL
      ? (isHighlighted ? 0.65 : 0.30)
      : (isHighlighted ? 0.7 : 0.35);

  return (
    <g>
      {/* Invisible wide hit area */}
      <line x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y}
        stroke="transparent" strokeWidth={14 * s}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd}
        style={{ cursor: 'pointer' }} />
      {/* Visible route line — single muted parchment color */}
      <line
        x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y}
        stroke={isHighlighted ? '#D4B880' : ROUTE_COLOR}
        strokeWidth={isHighlighted ? strokeWidth + 0.5 * s : strokeWidth}
        opacity={routeOpacity}
        strokeLinecap="round"
        className="route-line"
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}

// ===========================================================================
// Sub-component: MiniMap (improved)
// ===========================================================================

interface MiniMapProps {
  towns: MapTown[];
  playerTownId: string | null;
  viewBox: ViewBox;
  onClick: (x: number, y: number) => void;
}

function MiniMap({ towns, playerTownId, viewBox, onClick }: MiniMapProps) {
  const [collapsed, setCollapsed] = useState(false);
  const miniW = 200;
  const miniH = 180;

  const handleClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * MAP_W;
    const my = ((e.clientY - rect.top) / rect.height) * MAP_H;
    onClick(mx, my);
  }, [onClick]);

  // Only show capitals and cities on minimap
  const miniTowns = useMemo(() =>
    towns.filter(t => t.type === 'capital' || t.type === 'city'),
    [towns]
  );

  if (collapsed) {
    return (
      <div className="absolute top-4 right-4 z-10 hidden md:block">
        <button
          onClick={() => setCollapsed(false)}
          className="w-9 h-9 bg-realm-bg-800/90 border border-realm-border rounded-lg text-realm-text-secondary hover:text-realm-gold-400 hover:border-realm-gold-400/50 transition-colors flex items-center justify-center"
          title="Show minimap"
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-4 bg-realm-bg-900/85 border border-realm-border rounded-lg overflow-hidden shadow-lg hidden md:block z-10">
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(true)}
        className="absolute top-1 right-1 z-20 w-5 h-5 bg-realm-bg-800/80 border border-realm-border rounded text-realm-text-muted hover:text-realm-text-primary transition-colors flex items-center justify-center"
        title="Hide minimap"
      >
        <X className="w-3 h-3" />
      </button>
      <svg
        width={miniW}
        height={miniH}
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        onClick={handleClick}
        style={{ cursor: 'crosshair', display: 'block' }}
      >
        <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="#0E0E1A" />
        {miniTowns.map(t => (
          <circle
            key={t.id}
            cx={t.mapX}
            cy={t.mapY}
            r={t.id === playerTownId ? 16 : (t.type === 'capital' ? 10 : 7)}
            fill={t.id === playerTownId ? '#fbbf24' : getRegionColor(t.regionId)}
            opacity={t.id === playerTownId ? 1 : 0.7}
          />
        ))}
        {/* Player dot — extra bright if not at a visible town */}
        {playerTownId && !miniTowns.find(t => t.id === playerTownId) && (() => {
          const pt = towns.find(t => t.id === playerTownId);
          if (!pt) return null;
          return (
            <circle
              cx={pt.mapX}
              cy={pt.mapY}
              r={16}
              fill="#fbbf24"
              opacity={1}
            />
          );
        })()}
        {/* Viewport rect */}
        <rect
          x={viewBox.x}
          y={viewBox.y}
          width={viewBox.w}
          height={viewBox.h}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={10}
          opacity={0.7}
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
    capital: 'text-realm-gold-400 bg-realm-gold-400/10 border-realm-gold-400/30',
    city: 'text-realm-teal-300 bg-realm-teal-300/10 border-realm-teal-300/30',
    town: 'text-realm-text-secondary bg-realm-text-secondary/10 border-realm-border',
    village: 'text-realm-success bg-realm-success/10 border-realm-success/30',
    outpost: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  }[town.type ?? 'town'] ?? 'text-realm-text-secondary bg-realm-text-secondary/10 border-realm-border';

  const difficultyLabel = (dl: number) => {
    if (dl <= 1) return { text: 'Safe', cls: 'text-realm-success' };
    if (dl <= 3) return { text: 'Moderate', cls: 'text-realm-gold-400' };
    if (dl <= 6) return { text: 'Dangerous', cls: 'text-orange-400' };
    return { text: 'Deadly', cls: 'text-realm-danger' };
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-realm-border">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-realm-gold-400 shrink-0" />
          <h2 className="font-display text-realm-gold-400 text-lg truncate">{town.name}</h2>
        </div>
        <button onClick={onClose} className="text-realm-text-muted hover:text-realm-text-primary transition-colors shrink-0">
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
          <span className="text-[10px] px-2 py-0.5 rounded border text-realm-text-secondary bg-realm-bg-700/50 border-realm-border">
            {town.regionName}
          </span>
          {isPlayerHere && (
            <span className="text-[10px] px-2 py-0.5 rounded border text-realm-gold-400 bg-realm-gold-400/10 border-realm-gold-400/30">
              Current Location
            </span>
          )}
        </div>

        {/* Population */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-3.5 h-3.5 text-realm-text-muted" />
          <span className="text-realm-text-secondary">Population: {town.population.toLocaleString()}</span>
        </div>

        {/* Biome */}
        <div className="flex items-center gap-2 text-sm">
          <Info className="w-3.5 h-3.5 text-realm-text-muted" />
          <span className="text-realm-text-secondary">Biome: {town.biome}</span>
        </div>

        {/* Description */}
        {town.description && (
          <p className="text-realm-text-secondary text-sm leading-relaxed">{town.description}</p>
        )}

        {/* Connected routes */}
        {connectedRoutes.length > 0 && (
          <div>
            <h3 className="text-realm-text-primary text-xs font-display uppercase tracking-wider mb-2">Connected Routes</h3>
            <div className="space-y-2">
              {connectedRoutes.map(route => {
                const otherTownId = route.fromTownId === town.id ? route.toTownId : route.fromTownId;
                const otherTown = townLookup.get(otherTownId);
                const dl = difficultyLabel(route.dangerLevel);
                return (
                  <button
                    key={route.id}
                    onClick={() => otherTown && onSelectTown(otherTown)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-realm-bg-800 hover:bg-realm-bg-600 border border-realm-border rounded transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <span className="text-realm-text-primary text-xs block truncate">{otherTown?.name ?? otherTownId}</span>
                      {route.name && (
                        <span className="text-realm-text-muted text-[10px] block truncate">{route.name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] ${dl.cls}`}>{dl.text}</span>
                      <ChevronRight className="w-3 h-3 text-realm-text-muted" />
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
        <div className="px-5 py-4 border-t border-realm-border">
          <button
            onClick={() => onTravel(town.id)}
            disabled={isTraveling}
            className="w-full py-3 rounded-lg font-display text-sm bg-realm-gold-500/20 hover:bg-realm-gold-500/30 text-realm-gold-400 border border-realm-gold-500/30 hover:border-realm-gold-400/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        className="w-80 bg-realm-bg-900 border-l border-realm-border flex flex-col h-full shrink-0"
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
      className="absolute bottom-0 left-0 right-0 bg-realm-bg-900 border-t border-realm-border rounded-t-xl max-h-[60vh] flex flex-col z-30"
    >
      {/* Drag handle */}
      <div className="flex justify-center py-2">
        <div className="w-10 h-1 bg-realm-border rounded-full" />
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
  totalNodes: number;
}

function NodeTooltip({ node, x, y, totalNodes }: NodeTooltipProps) {
  return (
    <div
      className="fixed z-50 pointer-events-none bg-realm-bg-800/95 border border-realm-border rounded-lg px-3 py-2 shadow-xl"
      style={{ left: x + 20, top: y - 20 }}
    >
      <p className="font-display text-realm-gold-400 text-xs">{node.name}</p>
      {node.description && <p className="text-realm-text-muted text-[10px] mt-0.5">{node.description}</p>}
      <div className="flex items-center gap-3 mt-1">
        <span className="text-realm-text-secondary text-[10px] capitalize">{node.terrain}</span>
        <span className={`text-[10px] ${node.dangerLevel <= 2 ? 'text-realm-success' : node.dangerLevel <= 5 ? 'text-realm-gold-400' : 'text-realm-danger'}`}>
          Danger: {node.dangerLevel}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-0.5">
        <span className="text-realm-text-muted text-[10px]">Day {node.nodeIndex} of {totalNodes + 1}</span>
        {node.specialType && (
          <span className="text-realm-gold-400 text-[10px]">{node.specialType}</span>
        )}
      </div>
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
  zoom: number;
}

function RouteTooltipSVG({ route, midX, midY, zoom }: RouteTooltipSVGProps) {
  const dl = route.dangerLevel ?? 0;
  const label = dl <= 1 ? 'Safe' : dl <= 3 ? 'Moderate' : dl <= 6 ? 'Dangerous' : 'Deadly';
  const color = dl <= 1 ? '#4ade80' : dl <= 3 ? '#facc15' : dl <= 6 ? '#fb923c' : '#ef4444';
  const s = 1 / zoom;

  // Offset tooltip above the route midpoint
  const tooltipY = midY - 25 * s;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={midX - 55 * s}
        y={tooltipY - 18 * s}
        width={110 * s}
        height={36 * s}
        rx={4 * s}
        fill="#252538"
        stroke="#C9A461"
        strokeWidth={0.5 * s}
        opacity={0.97}
      />
      <text x={midX} y={tooltipY - 2 * s} textAnchor="middle" fill="#E8E0D0" fontSize={9 * s} fontFamily="Crimson Text, serif">
        {route.name || `${route.nodeCount ?? '?'} nodes`}
      </text>
      <text x={midX} y={tooltipY + 11 * s} textAnchor="middle" fill={color} fontSize={8 * s} fontFamily="Crimson Text, serif">
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
  const [hoveredTownId, setHoveredTownId] = useState<string | null>(null);
  const [hoveredRoute, setHoveredRoute] = useState<MapRoute | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{ node: RouteNode; screenX: number; screenY: number; totalNodes: number } | null>(null);
  const [showTravelers, setShowTravelers] = useState(true);
  const [travelModalOpen, setTravelModalOpen] = useState(false);
  const [travelDestination, setTravelDestination] = useState<string | undefined>();

  // Computed zoom level (1 = default; >1 = zoomed in)
  const zoom = useMemo(() => MAP_W / viewBox.w, [viewBox.w]);

  // LOD level for display
  const lodLevel = zoom < ZOOM_REGIONAL ? 1 : zoom < ZOOM_DETAIL ? 2 : 3;

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

  // Visible towns filtered by zoom LOD + viewport culling
  const visibleTowns = useMemo(() => {
    if (!mapData) return [];
    return mapData.towns.filter(t =>
      isTownVisibleAtZoom(t.type, zoom) && isInViewport(t.mapX, t.mapY, viewBox)
    );
  }, [mapData, zoom, viewBox]);

  // Visible routes — LOD filtering by zoom level
  // Backend now only serves MST routes, so we filter directly from mapData.routes
  const visibleRoutes = useMemo(() => {
    if (!mapData) return [];

    const activeId = mapData.playerPosition?.routeId ?? null;
    const isMajorType = (type?: string) => type === 'capital' || type === 'city';
    const isTownOrAbove = (type?: string) => type === 'capital' || type === 'city' || type === 'town';

    return mapData.routes.filter(r => {
      const from = townLookup.get(r.fromTownId);
      const to = townLookup.get(r.toTownId);
      if (!from || !to) return false;

      // At least one endpoint must be near viewport
      const inView = isInViewport(from.mapX, from.mapY, viewBox, 200) || isInViewport(to.mapX, to.mapY, viewBox, 200);
      if (!inView) return false;

      // Active travel route always visible
      if (r.id === activeId) return true;

      if (zoom < ZOOM_REGIONAL) {
        // Continental: only routes where at least one endpoint is capital/city
        return isMajorType(from.type) || isMajorType(to.type);
      }
      if (zoom < ZOOM_DETAIL) {
        // Regional: routes where at least one endpoint is town or above
        return isTownOrAbove(from.type) || isTownOrAbove(to.type);
      }
      // Detail: all routes in viewport
      return true;
    });
  }, [mapData, townLookup, viewBox, zoom]);

  // Compute label layout with collision avoidance
  const labelLayout = useMemo(() => {
    return computeLabelLayout(visibleTowns, zoom);
  }, [visibleTowns, zoom]);

  // Region centroids for region name display
  const regionCentroids = useMemo(() => {
    if (!mapData) return new Map<string, { x: number; y: number; name: string; color: string }>();
    const regionTowns = new Map<string, MapTown[]>();
    for (const t of mapData.towns) {
      const arr = regionTowns.get(t.regionId) ?? [];
      arr.push(t);
      regionTowns.set(t.regionId, arr);
    }
    const centroids = new Map<string, { x: number; y: number; name: string; color: string }>();
    for (const [regionId, towns] of regionTowns) {
      if (towns.length < 1) continue;
      const cx = towns.reduce((s, t) => s + t.mapX, 0) / towns.length;
      const cy = towns.reduce((s, t) => s + t.mapY, 0) / towns.length;
      const region = mapData.regions.find(r => r.id === regionId);
      if (region) {
        centroids.set(regionId, { x: cx, y: cy, name: region.name, color: getRegionColor(regionId) });
      }
    }
    return centroids;
  }, [mapData]);

  // Region name opacity — subtle watermark, never dominant
  const regionNameOpacity = useMemo(() => {
    if (zoom < ZOOM_REGIONAL) {
      // Level 1: very subtle watermark
      return 0.10;
    }
    if (zoom < ZOOM_REGIONAL + 0.3) {
      // Quick fade to invisible
      const t = (zoom - ZOOM_REGIONAL) / 0.3;
      return 0.10 * (1 - t);
    }
    // Level 2-3: completely hidden
    return 0;
  }, [zoom]);

  // Region name font size — much smaller than before
  const regionFontSize = useMemo(() => {
    if (zoom < ZOOM_REGIONAL) return 22;
    return 0;
  }, [zoom]);

  // Determine active route (player is on it)
  const activeRouteId = mapData?.playerPosition?.routeId ?? null;
  const playerNodeIndex = mapData?.playerPosition?.nodeIndex ?? null;

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

  const handleTravelNodeHover = useCallback((node: RouteNode, e: React.MouseEvent, totalNodes: number) => {
    setHoveredNode({ node, screenX: e.clientX, screenY: e.clientY, totalNodes });
  }, []);

  // (Waypoint dots are rendered inline per-route in WaypointDots component)

  // ===========================================================================
  // Render
  // ===========================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-realm-bg-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-realm-gold-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-realm-gold-400 font-display text-2xl animate-pulse">
            Charting the realm...
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !mapData) {
    return (
      <div className="flex items-center justify-center h-full bg-realm-bg-900">
        <div className="text-center">
          <Shield className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
          <p className="text-realm-text-secondary font-display text-xl mb-2">No map data available</p>
          <p className="text-realm-text-muted text-sm">The cartographers are still at work.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-realm-bg-900 flex flex-col">
      {/* Inline style for smooth LOD transitions */}
      <style>{`
        .town-node { cursor: pointer; }
        .route-line { transition: opacity 0.3s ease; }
        .travel-node { transition: opacity 0.3s ease; }
        .region-label { transition: opacity 0.4s ease; }
        .map-label { transition: opacity 0.3s ease; }
        .map-label-hover { transition: opacity 0.2s ease; }
      `}</style>

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

              <filter id="capitalGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feFlood floodColor="#fbbf24" floodOpacity="0.25" />
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

            {/* === Layer 2: Region names — subtle watermarks behind everything === */}
            {regionNameOpacity > 0 && Array.from(regionCentroids.entries()).map(([regionId, center]) => {
              const rs = 1 / zoom;
              return (
                <g key={`region-${regionId}`} className="region-label">
                  <text
                    x={center.x}
                    y={center.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#64584E"
                    fontSize={regionFontSize * rs}
                    fontFamily="MedievalSharp, serif"
                    opacity={regionNameOpacity}
                    letterSpacing={`${0.3 * regionFontSize * rs}px`}
                    style={{
                      pointerEvents: 'none',
                      userSelect: 'none',
                      textTransform: 'uppercase',
                    } as React.CSSProperties}
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

            {/* === Layer 4: Waypoint dots — evenly spaced along each road === */}
            {visibleRoutes.map(route => {
              const from = townLookup.get(route.fromTownId);
              const to = townLookup.get(route.toTownId);
              if (!from || !to) return null;
              return (
                <WaypointDots
                  key={`dots-${route.id}`}
                  route={route}
                  fromPos={{ x: from.mapX, y: from.mapY }}
                  toPos={{ x: to.mapX, y: to.mapY }}
                  zoom={zoom}
                  activeRouteId={activeRouteId}
                  playerNodeIndex={playerNodeIndex}
                  isPlayerTraveling={mapData.playerPosition?.type === 'traveling'}
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
                labelPlacement={labelLayout.get(town.id)}
                isHovered={hoveredTownId === town.id}
                onClick={() => setSelectedTown(selectedTown?.id === town.id ? null : town)}
                onHoverStart={() => setHoveredTownId(town.id)}
                onHoverEnd={() => setHoveredTownId(null)}
              />
            ))}

            {/* === Layer 6: Travelers (non-scaling) === */}
            {showTravelers && zoom >= ZOOM_DETAIL && travelerClusters.map((cluster, i) => {
              const ts = 1 / zoom;
              return (
                <g key={`travelers-${i}`}>
                  <circle
                    cx={cluster.x}
                    cy={cluster.y}
                    r={5 * ts}
                    fill="#3B82F6"
                    opacity={0.7}
                    stroke="#1e40af"
                    strokeWidth={0.5 * ts}
                  />
                  {cluster.travelers.length > 1 && (
                    <text
                      x={cluster.x}
                      y={cluster.y + 1 * ts}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize={5 * ts}
                      fontWeight="bold"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {cluster.travelers.length}
                    </text>
                  )}
                </g>
              );
            })}

            {/* === Route hover tooltip (SVG, non-scaling) === */}
            {hoveredRoute && (() => {
              const from = townLookup.get(hoveredRoute.fromTownId);
              const to = townLookup.get(hoveredRoute.toTownId);
              if (!from || !to) return null;
              const midX = (from.mapX + to.mapX) / 2;
              const midY = (from.mapY + to.mapY) / 2;
              return <RouteTooltipSVG route={hoveredRoute} midX={midX} midY={midY} zoom={zoom} />;
            })()}
          </svg>

          {/* === UI Overlay: Zoom controls === */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-10">
            <button
              onClick={zoomIn}
              className="w-9 h-9 bg-realm-bg-800/90 border border-realm-border rounded-lg text-realm-text-secondary hover:text-realm-gold-400 hover:border-realm-gold-400/50 transition-colors flex items-center justify-center"
              title="Zoom in (+)"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={zoomOut}
              className="w-9 h-9 bg-realm-bg-800/90 border border-realm-border rounded-lg text-realm-text-secondary hover:text-realm-gold-400 hover:border-realm-gold-400/50 transition-colors flex items-center justify-center"
              title="Zoom out (-)"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="w-9 h-px bg-realm-border my-0.5" />
            <button
              onClick={centerOnPlayer}
              className="w-9 h-9 bg-realm-bg-800/90 border border-realm-border rounded-lg text-realm-text-secondary hover:text-realm-gold-400 hover:border-realm-gold-400/50 transition-colors flex items-center justify-center"
              title="Center on me"
            >
              <Compass className="w-4 h-4" />
            </button>
            {mapData.travelers && mapData.travelers.length > 0 && (
              <button
                onClick={() => setShowTravelers(prev => !prev)}
                className={`w-9 h-9 bg-realm-bg-800/90 border rounded-lg transition-colors flex items-center justify-center ${
                  showTravelers ? 'border-realm-teal-300/50 text-realm-teal-300' : 'border-realm-border text-realm-text-muted'
                }`}
                title={showTravelers ? 'Hide travelers' : 'Show travelers'}
              >
                {showTravelers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* === UI Overlay: Zoom level + LOD indicator === */}
          <div className="absolute top-4 left-4 bg-realm-bg-800/90 border border-realm-border rounded-lg px-3 py-1.5 z-10">
            <span className="text-realm-text-muted text-[10px] uppercase tracking-wider">
              {lodLevel === 1 ? 'Continent View' : lodLevel === 2 ? 'Region View' : 'Detail View'}
            </span>
            <span className="text-realm-text-muted/50 text-[9px] ml-2">
              {zoom.toFixed(1)}x
            </span>
          </div>

          {/* === UI Overlay: Title === */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <h1 className="font-display text-realm-gold-400 text-xl md:text-2xl drop-shadow-lg whitespace-nowrap">
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
              totalNodes={hoveredNode.totalNodes}
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
      <div className="bg-realm-bg-800/90 border border-realm-border rounded-lg overflow-hidden">
        <button
          onClick={() => setOpen(prev => !prev)}
          className="flex items-center gap-2 px-3 py-2 w-full text-left"
        >
          <MapPin className="w-3 h-3 text-realm-gold-400" />
          <span className="font-display text-realm-gold-400 text-xs">Regions</span>
          <span className="text-realm-text-muted text-[10px] ml-auto">{open ? '[-]' : '[+]'}</span>
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
                    <span className="text-realm-text-secondary text-[10px]">{r.name}</span>
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
