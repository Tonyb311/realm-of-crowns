import { memo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface TownMarkerData {
  id: string;
  name: string;
  regionId: string;
  x: number;
  y: number;
  population: number;
  biome: string;
  specialty: string;
}

interface TownMarkerProps {
  town: TownMarkerData;
  color: { fill: string; stroke: string };
  isSelected: boolean;
  isPlayerHere: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Population tier -> base radius */
function getRadius(pop: number): number {
  if (pop >= 10000) return 8;   // Capital
  if (pop >= 5000) return 6;    // Major
  if (pop >= 2500) return 5;    // Medium
  return 4;                      // Small
}

/** Population tier label */
export function getPopulationTier(pop: number): string {
  if (pop >= 10000) return 'Capital';
  if (pop >= 5000) return 'Major';
  if (pop >= 2500) return 'Medium';
  return 'Small';
}

/** Determine town icon type from biome */
function getTownType(biome: string): 'underwater' | 'underground' | 'floating' | 'standard' {
  const lower = biome.toLowerCase();
  if (lower.includes('underwater') || lower.includes('deep ocean') || lower.includes('shallow sea')) return 'underwater';
  if (lower.includes('underground') || lower.includes('underdark') || lower.includes('cavern') || lower.includes('deep underground')) return 'underground';
  if (lower.includes('feywild') || lower.includes('enchanted') || lower.includes('floating') || lower.includes('sacred grove')) return 'floating';
  return 'standard';
}

/** Specialty -> small icon path offset from center */
function getSpecialtyIcon(specialty: string): string | null {
  const lower = specialty.toLowerCase();
  if (lower.includes('mining') || lower.includes('smelting')) return 'pickaxe';
  if (lower.includes('farming') || lower.includes('ranching') || lower.includes('cooking')) return 'wheat';
  if (lower.includes('fishing') || lower.includes('shipbuilding') || lower.includes('navigation')) return 'anchor';
  if (lower.includes('military') || lower.includes('combat')) return 'sword';
  return null;
}

// ---------------------------------------------------------------------------
// SVG sub-icons rendered near the town circle
// ---------------------------------------------------------------------------
function SpecialtyBadge({ x, y, icon, radius }: { x: number; y: number; icon: string; radius: number }) {
  const ox = x + radius + 2;
  const oy = y - radius + 1;
  const s = 5; // icon size

  const paths: Record<string, JSX.Element> = {
    pickaxe: (
      <g transform={`translate(${ox},${oy})`}>
        <line x1={0} y1={s} x2={s} y2={0} stroke="#A89A80" strokeWidth={1.2} strokeLinecap="round" />
        <line x1={s * 0.65} y1={s * 0.05} x2={s} y2={s * 0.4} stroke="#A89A80" strokeWidth={1.2} strokeLinecap="round" />
      </g>
    ),
    wheat: (
      <g transform={`translate(${ox},${oy})`}>
        <line x1={s / 2} y1={s} x2={s / 2} y2={0} stroke="#A89A80" strokeWidth={1} strokeLinecap="round" />
        <line x1={s * 0.2} y1={s * 0.3} x2={s / 2} y2={s * 0.5} stroke="#A89A80" strokeWidth={0.8} strokeLinecap="round" />
        <line x1={s * 0.8} y1={s * 0.3} x2={s / 2} y2={s * 0.5} stroke="#A89A80" strokeWidth={0.8} strokeLinecap="round" />
      </g>
    ),
    anchor: (
      <g transform={`translate(${ox},${oy})`}>
        <line x1={s / 2} y1={0} x2={s / 2} y2={s} stroke="#A89A80" strokeWidth={1} strokeLinecap="round" />
        <path d={`M ${s * 0.15} ${s * 0.75} Q ${s / 2} ${s * 1.1} ${s * 0.85} ${s * 0.75}`} fill="none" stroke="#A89A80" strokeWidth={0.8} />
        <circle cx={s / 2} cy={s * 0.15} r={1.2} fill="none" stroke="#A89A80" strokeWidth={0.8} />
      </g>
    ),
    sword: (
      <g transform={`translate(${ox},${oy})`}>
        <line x1={s / 2} y1={0} x2={s / 2} y2={s * 0.85} stroke="#A89A80" strokeWidth={1.2} strokeLinecap="round" />
        <line x1={s * 0.2} y1={s * 0.6} x2={s * 0.8} y2={s * 0.6} stroke="#A89A80" strokeWidth={1} strokeLinecap="round" />
      </g>
    ),
  };

  return paths[icon] ?? null;
}

// ---------------------------------------------------------------------------
// Town type decorations
// ---------------------------------------------------------------------------
function TownTypeDecor({ x, y, radius, type }: { x: number; y: number; radius: number; type: string }) {
  if (type === 'underwater') {
    // Wavy lines below
    return (
      <g style={{ pointerEvents: 'none' }}>
        <path
          d={`M ${x - radius} ${y + radius + 2} Q ${x - radius / 2} ${y + radius} ${x} ${y + radius + 2} Q ${x + radius / 2} ${y + radius + 4} ${x + radius} ${y + radius + 2}`}
          fill="none" stroke="#3B82F6" strokeWidth={0.8} opacity={0.5}
        />
      </g>
    );
  }
  if (type === 'underground') {
    // Small inverted triangle "cavern" hint
    return (
      <g style={{ pointerEvents: 'none' }}>
        <path
          d={`M ${x - radius * 0.6} ${y - radius - 2} L ${x} ${y - radius - 5} L ${x + radius * 0.6} ${y - radius - 2}`}
          fill="none" stroke="#9CA3AF" strokeWidth={0.8} opacity={0.5}
        />
      </g>
    );
  }
  if (type === 'floating') {
    // Small sparkle dots above
    return (
      <g style={{ pointerEvents: 'none' }} opacity={0.5}>
        <circle cx={x - 3} cy={y - radius - 4} r={0.8} fill="#E879F9" />
        <circle cx={x + 3} cy={y - radius - 5} r={0.6} fill="#E879F9" />
        <circle cx={x} cy={y - radius - 7} r={0.7} fill="#E879F9" />
      </g>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function TownMarkerInner({
  town,
  color,
  isSelected,
  isPlayerHere,
  isHovered,
  onSelect,
  onHoverStart,
  onHoverEnd,
}: TownMarkerProps) {
  const radius = getRadius(town.population);
  const townType = getTownType(town.biome);
  const specialtyIcon = getSpecialtyIcon(town.specialty);

  return (
    <g
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      style={{ cursor: 'pointer' }}
      filter={isPlayerHere ? 'url(#playerGlow)' : isHovered ? 'url(#hoverGlow)' : undefined}
    >
      {/* Selection ring */}
      {isSelected && (
        <circle cx={town.x} cy={town.y} r={radius + 4} fill="none" stroke="#C9A461" strokeWidth={1.5} opacity={0.8}>
          <animate attributeName="r" values={`${radius + 3};${radius + 6};${radius + 3}`} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Player location pulse */}
      {isPlayerHere && (
        <>
          <circle cx={town.x} cy={town.y} r={radius + 2} fill="none" stroke="#C9A461" strokeWidth={2}>
            <animate attributeName="r" values={`${radius + 2};${radius + 10};${radius + 2}`} dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={town.x} cy={town.y} r={radius + 1} fill="#C9A461" opacity={0.3} />
        </>
      )}

      {/* Town type decoration */}
      <TownTypeDecor x={town.x} y={town.y} radius={radius} type={townType} />

      {/* Town circle */}
      <circle
        cx={town.x} cy={town.y}
        r={radius}
        fill={isPlayerHere ? '#C9A461' : color.fill}
        stroke={isSelected ? '#F5EBCB' : isHovered ? '#E8D49A' : color.stroke}
        strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 1}
        opacity={isHovered || isSelected ? 1 : 0.85}
      />

      {/* Population tier inner ring for capitals */}
      {town.population >= 10000 && (
        <circle
          cx={town.x} cy={town.y} r={radius - 2.5}
          fill="none" stroke="#F5EBCB" strokeWidth={0.5} opacity={0.5}
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Specialty badge */}
      {specialtyIcon && (
        <SpecialtyBadge x={town.x} y={town.y} icon={specialtyIcon} radius={radius} />
      )}

      {/* Town name label */}
      <text
        x={town.x}
        y={town.y + radius + 10}
        textAnchor="middle"
        fill={isSelected ? '#F5EBCB' : isHovered ? '#E8D49A' : '#A89A80'}
        fontSize={isSelected || isHovered ? 9 : 7.5}
        fontFamily="Crimson Text, serif"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {town.name}
      </text>
    </g>
  );
}

const TownMarker = memo(TownMarkerInner);
export default TownMarker;
