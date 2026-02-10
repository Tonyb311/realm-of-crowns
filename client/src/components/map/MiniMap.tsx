import { memo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MiniMapTown {
  id: string;
  x: number;
  y: number;
  regionId: string;
}

interface MiniMapProps {
  towns: MiniMapTown[];
  playerTownId: string | null;
  viewBox: { x: number; y: number; w: number; h: number };
  mapWidth: number;
  mapHeight: number;
  getColor: (regionId: string) => { fill: string };
  onClickMiniMap: (x: number, y: number) => void;
}

// ---------------------------------------------------------------------------
// MiniMap sizing
// ---------------------------------------------------------------------------
const MINI_W = 160;
const MINI_H = 120;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
function MiniMapInner({ towns, playerTownId, viewBox, mapWidth, mapHeight, getColor, onClickMiniMap }: MiniMapProps) {
  const scaleX = MINI_W / mapWidth;
  const scaleY = MINI_H / mapHeight;

  // Viewport rectangle in minimap coordinates
  const vpX = viewBox.x * scaleX;
  const vpY = viewBox.y * scaleY;
  const vpW = viewBox.w * scaleX;
  const vpH = viewBox.h * scaleY;

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * mapWidth;
    const my = ((e.clientY - rect.top) / rect.height) * mapHeight;
    onClickMiniMap(mx, my);
  }

  return (
    <div className="absolute top-4 right-4 bg-dark-400/90 border border-dark-50 rounded-lg p-1.5 shadow-lg">
      <svg
        width={MINI_W}
        height={MINI_H}
        viewBox={`0 0 ${MINI_W} ${MINI_H}`}
        className="cursor-pointer"
        onClick={handleClick}
        style={{ background: '#0E0E1A' }}
      >
        {/* Town dots */}
        {towns.map(t => {
          const isPlayer = t.id === playerTownId;
          return (
            <circle
              key={t.id}
              cx={t.x * scaleX}
              cy={t.y * scaleY}
              r={isPlayer ? 2.5 : 1.2}
              fill={isPlayer ? '#C9A461' : getColor(t.regionId).fill}
              opacity={isPlayer ? 1 : 0.6}
            />
          );
        })}

        {/* Player pulse */}
        {playerTownId && (() => {
          const pt = towns.find(t => t.id === playerTownId);
          if (!pt) return null;
          return (
            <circle cx={pt.x * scaleX} cy={pt.y * scaleY} r={2.5} fill="none" stroke="#C9A461" strokeWidth={1}>
              <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
            </circle>
          );
        })()}

        {/* Viewport rectangle */}
        <rect
          x={vpX} y={vpY} width={vpW} height={vpH}
          fill="none" stroke="#C9A461" strokeWidth={1} opacity={0.6}
          rx={1}
        />
      </svg>
    </div>
  );
}

const MiniMap = memo(MiniMapInner);
export default MiniMap;
