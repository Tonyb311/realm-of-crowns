export interface PriceHistoryPoint {
  date: string;
  avgPrice: number;
  volume: number;
}

export default function PriceChart({ data }: { data: PriceHistoryPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-parchment-500 text-sm">
        No price data available
      </div>
    );
  }

  const width = 600;
  const height = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const prices = data.map((d) => d.avgPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const xScale = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v: number) => padding.top + chartH - ((v - minPrice) / priceRange) * chartH;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(d.avgPrice).toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L ${xScale(data.length - 1).toFixed(1)} ${(padding.top + chartH).toFixed(1)} L ${padding.left.toFixed(1)} ${(padding.top + chartH).toFixed(1)} Z`;

  // Y-axis labels (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) => minPrice + (priceRange * i) / 4);

  // X-axis labels (up to 6)
  const xStep = Math.max(1, Math.floor(data.length / 5));
  const xTicks = data.filter((_, i) => i % xStep === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid lines */}
      {yTicks.map((tick) => (
        <line
          key={tick}
          x1={padding.left}
          y1={yScale(tick)}
          x2={width - padding.right}
          y2={yScale(tick)}
          stroke="rgba(168, 154, 128, 0.15)"
          strokeDasharray="4 4"
        />
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#goldGradient)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#C9A461" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.avgPrice)} r="3" fill="#C9A461" stroke="#1A1A2E" strokeWidth="1.5" />
      ))}

      {/* Y-axis labels */}
      {yTicks.map((tick) => (
        <text key={tick} x={padding.left - 8} y={yScale(tick) + 4} textAnchor="end" fontSize="10" fill="#A89A80">
          {Math.round(tick).toLocaleString()}
        </text>
      ))}

      {/* X-axis labels */}
      {xTicks.map((d) => {
        const idx = data.indexOf(d);
        const date = new Date(d.date);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;
        return (
          <text key={d.date} x={xScale(idx)} y={height - 8} textAnchor="middle" fontSize="10" fill="#A89A80">
            {label}
          </text>
        );
      })}

      {/* Gradient definition */}
      <defs>
        <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9A461" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#C9A461" stopOpacity="0.02" />
        </linearGradient>
      </defs>
    </svg>
  );
}
