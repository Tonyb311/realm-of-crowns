import { memo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ExclusiveZoneData {
  id: string;
  name: string;
  regionId: string;
  raceName: string;
  x: number;
  y: number;
  radius?: number;
  hasAccess: boolean;
  requirements?: string;
  resources?: string[];
}

interface ExclusiveZoneOverlayProps {
  zone: ExclusiveZoneData;
  color: { fill: string; stroke: string };
  isSelected: boolean;
  onSelect: () => void;
}

// ---------------------------------------------------------------------------
// Lock / unlock icon paths (tiny SVG)
// ---------------------------------------------------------------------------
function LockIcon({ x, y, unlocked }: { x: number; y: number; unlocked: boolean }) {
  const s = 7;
  if (unlocked) {
    return (
      <g transform={`translate(${x - s / 2},${y - s / 2})`} opacity={0.8}>
        {/* Body */}
        <rect x={0} y={s * 0.4} width={s} height={s * 0.6} rx={1} fill="none" stroke="#4ADE80" strokeWidth={0.8} />
        {/* Shackle (open) */}
        <path d={`M ${s * 0.25} ${s * 0.4} L ${s * 0.25} ${s * 0.2} A ${s * 0.25} ${s * 0.25} 0 0 1 ${s * 0.75} ${s * 0.2} L ${s * 0.75} ${s * 0.25}`}
          fill="none" stroke="#4ADE80" strokeWidth={0.8} strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g transform={`translate(${x - s / 2},${y - s / 2})`} opacity={0.8}>
      {/* Body */}
      <rect x={0} y={s * 0.4} width={s} height={s * 0.6} rx={1} fill="none" stroke="#EF4444" strokeWidth={0.8} />
      {/* Shackle (closed) */}
      <path d={`M ${s * 0.25} ${s * 0.4} L ${s * 0.25} ${s * 0.2} A ${s * 0.25} ${s * 0.25} 0 0 1 ${s * 0.75} ${s * 0.2} L ${s * 0.75} ${s * 0.4}`}
        fill="none" stroke="#EF4444" strokeWidth={0.8} strokeLinecap="round" />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function ExclusiveZoneOverlayInner({ zone, color, isSelected, onSelect }: ExclusiveZoneOverlayProps) {
  const r = zone.radius ?? 20;

  return (
    <g
      style={{ cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      {/* Zone area */}
      <circle
        cx={zone.x} cy={zone.y} r={r}
        fill={zone.hasAccess ? color.fill : '#EF4444'}
        opacity={0.08}
        stroke={zone.hasAccess ? color.stroke : '#EF4444'}
        strokeWidth={isSelected ? 2 : 1}
        strokeDasharray="4 3"
      />

      {/* Pulsing ring if selected */}
      {isSelected && (
        <circle cx={zone.x} cy={zone.y} r={r + 3} fill="none" stroke={color.fill} strokeWidth={1} opacity={0.5}>
          <animate attributeName="r" values={`${r + 2};${r + 6};${r + 2}`} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Race emblem */}
      <text
        x={zone.x} y={zone.y - 3}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color.fill}
        fontSize={8}
        fontFamily="Crimson Text, serif"
        fontWeight="bold"
        opacity={0.5}
        style={{ pointerEvents: 'none' }}
      >
        {zone.raceName.charAt(0)}
      </text>

      {/* Lock / unlock */}
      <LockIcon x={zone.x} y={zone.y + 8} unlocked={zone.hasAccess} />

      {/* Zone name */}
      <text
        x={zone.x} y={zone.y + r + 10}
        textAnchor="middle"
        fill={zone.hasAccess ? '#A89A80' : '#EF4444'}
        fontSize={6.5}
        fontFamily="Crimson Text, serif"
        opacity={0.7}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {zone.name}
      </text>
    </g>
  );
}

const ExclusiveZoneOverlay = memo(ExclusiveZoneOverlayInner);
export default ExclusiveZoneOverlay;
