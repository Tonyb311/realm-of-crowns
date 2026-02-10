import { memo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RegionTown {
  x: number;
  y: number;
}

interface RegionOverlayProps {
  regionId: string;
  raceName: string;
  towns: RegionTown[];
  color: { fill: string; stroke: string; glow: string };
  /** Relation-based border color (hex). Default: neutral grey */
  borderColor?: string;
}

// ---------------------------------------------------------------------------
// Race emblem short codes for SVG text rendering
// ---------------------------------------------------------------------------
const RACE_EMBLEMS: Record<string, string> = {
  Human: 'H',
  Dwarf: 'D',
  Elf: 'E',
  Orc: 'O',
  Harthfolk: 'Hf',
  Nethkin: 'T',
  Drakonid: 'Dr',
  'Half-Elf': 'HE',
  'Half-Orc': 'HO',
  Gnome: 'Gn',
  Merfolk: 'M',
  Beastfolk: 'B',
  Faefolk: 'F',
  Goliath: 'Go',
  Nightborne: 'Dw',
  Mosskin: 'Fi',
  Forgeborn: 'W',
  Elementari: 'Ge',
  Revenant: 'R',
  'Free Cities': 'FC',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function RegionOverlayInner({ regionId, raceName, towns, color, borderColor }: RegionOverlayProps) {
  if (towns.length < 2) return null;

  // Compute bounding ellipse
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of towns) {
    if (t.x < minX) minX = t.x;
    if (t.y < minY) minY = t.y;
    if (t.x > maxX) maxX = t.x;
    if (t.y > maxY) maxY = t.y;
  }
  const pad = 35;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = Math.max((maxX - minX) / 2 + pad, 40);
  const ry = Math.max((maxY - minY) / 2 + pad, 40);

  const emblem = RACE_EMBLEMS[raceName] ?? raceName.charAt(0);
  const effectiveBorder = borderColor ?? color.stroke;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Region fill */}
      <ellipse
        cx={cx} cy={cy} rx={rx} ry={ry}
        fill={color.glow}
        opacity={0.12}
      />

      {/* Border outline colored by relation */}
      <ellipse
        cx={cx} cy={cy} rx={rx} ry={ry}
        fill="none"
        stroke={effectiveBorder}
        strokeWidth={1.5}
        strokeDasharray="6 4"
        opacity={0.25}
      />

      {/* Race emblem in center */}
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color.fill}
        fontSize={12}
        fontFamily="Crimson Text, serif"
        fontWeight="bold"
        opacity={0.2}
      >
        {emblem}
      </text>
    </g>
  );
}

const RegionOverlay = memo(RegionOverlayInner);
export default RegionOverlay;
