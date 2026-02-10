import { useState, useRef, useEffect, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// SVG-space tooltip positioned next to a map element
// Renders in an HTML overlay so it can use Tailwind classes
// ---------------------------------------------------------------------------

interface MapTooltipProps {
  /** SVG x coordinate of the anchor point */
  x: number;
  /** SVG y coordinate of the anchor point */
  y: number;
  /** The SVG element to convert coords from */
  svgRef: React.RefObject<SVGSVGElement | null>;
  children: ReactNode;
  className?: string;
}

export default function MapTooltip({ x, y, svgRef, children, className = '' }: MapTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = x;
    pt.y = y;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const screenPt = pt.matrixTransform(ctm);
    setPos({ left: screenPt.x, top: screenPt.y });
  }, [x, y, svgRef]);

  if (!pos) return null;

  return (
    <div
      ref={tooltipRef}
      className={`fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full ${className}`}
      style={{ left: pos.left, top: pos.top - 12 }}
    >
      <div className="bg-dark-600 border border-dark-50 text-parchment-200 text-xs rounded px-3 py-2 shadow-lg whitespace-nowrap max-w-xs">
        {children}
      </div>
      {/* Arrow */}
      <div className="w-0 h-0 mx-auto border-x-4 border-x-transparent border-t-4 border-t-dark-600" />
    </div>
  );
}
