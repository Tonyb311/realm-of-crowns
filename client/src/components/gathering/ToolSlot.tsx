import { Wrench, AlertTriangle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface EquippedTool {
  itemId: string;
  name: string;
  tier: string;
  toolType: string;
  durability: number;
  maxDurability: number;
  speedBonus: number;
  yieldBonus: number;
  rarity: string;
}

interface ToolSlotProps {
  tool: EquippedTool | null;
  onClick: () => void;
}

// ---------------------------------------------------------------------------
// Tier badge colors
// ---------------------------------------------------------------------------
const TIER_COLORS: Record<string, string> = {
  CRUDE:       'bg-gray-600 text-gray-200',
  COPPER:      'bg-orange-800 text-orange-200',
  IRON:        'bg-slate-500 text-slate-100',
  STEEL:       'bg-blue-700 text-blue-100',
  MITHRIL:     'bg-purple-700 text-purple-100',
  ADAMANTINE:  'bg-amber-600 text-amber-100',
};

function tierLabel(tier: string): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Durability bar color
// ---------------------------------------------------------------------------
function durabilityColor(ratio: number): string {
  if (ratio > 0.5) return 'bg-green-500';
  if (ratio > 0.25) return 'bg-yellow-500';
  return 'bg-red-500';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ToolSlot({ tool, onClick }: ToolSlotProps) {
  if (!tool) {
    return (
      <button
        onClick={onClick}
        className="w-full p-4 border-2 border-dashed border-dark-50 rounded-lg bg-dark-400/50 hover:border-primary-400/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-dark-500 flex items-center justify-center border border-dark-50">
            <Wrench className="w-5 h-5 text-parchment-500/40" />
          </div>
          <div className="text-left">
            <p className="text-sm text-parchment-400">No Tool Equipped</p>
            <div className="flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-[10px] text-red-400">-25% speed and yield (bare hands)</span>
            </div>
          </div>
        </div>
      </button>
    );
  }

  const ratio = tool.maxDurability > 0 ? tool.durability / tool.maxDurability : 0;
  const tierBadge = TIER_COLORS[tool.tier] ?? TIER_COLORS.CRUDE;

  return (
    <button
      onClick={onClick}
      className="w-full p-4 border border-dark-50 rounded-lg bg-dark-300 hover:border-primary-400/40 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-dark-500 flex items-center justify-center border border-primary-400/20">
          <Wrench className="w-5 h-5 text-primary-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm text-parchment-200 font-display">{tool.name}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-display ${tierBadge}`}>
              {tierLabel(tool.tier)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-green-400">
              +{Math.round(tool.speedBonus * 100)}% speed
            </span>
            <span className="text-[10px] text-blue-400">
              +{Math.round(tool.yieldBonus * 100)}% yield
            </span>
          </div>
          {/* Durability bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-dark-500 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${durabilityColor(ratio)}`}
                style={{ width: `${Math.max(2, ratio * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-parchment-500">
              {tool.durability}/{tool.maxDurability}
            </span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-parchment-500 mt-2 text-left">Click to change tool</p>
    </button>
  );
}
