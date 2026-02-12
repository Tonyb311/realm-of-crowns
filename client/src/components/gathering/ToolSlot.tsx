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
  CRUDE:       'bg-realm-bg-600 text-realm-text-muted',
  COPPER:      'bg-orange-800 text-orange-200',
  IRON:        'bg-slate-500 text-slate-100',
  STEEL:       'bg-realm-teal-300/20 text-realm-teal-300',
  MITHRIL:     'bg-realm-purple-300/20 text-realm-purple-300',
  ADAMANTINE:  'bg-realm-gold-400/20 text-realm-gold-400',
};

function tierLabel(tier: string): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Durability bar color
// ---------------------------------------------------------------------------
function durabilityColor(ratio: number): string {
  if (ratio > 0.5) return 'bg-realm-success';
  if (ratio > 0.25) return 'bg-realm-gold-400';
  return 'bg-realm-danger';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ToolSlot({ tool, onClick }: ToolSlotProps) {
  if (!tool) {
    return (
      <button
        onClick={onClick}
        className="w-full p-4 border-2 border-dashed border-realm-border rounded-lg bg-realm-bg-800/50 hover:border-realm-gold-400/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-realm-bg-900 flex items-center justify-center border border-realm-border">
            <Wrench className="w-5 h-5 text-realm-text-muted/40" />
          </div>
          <div className="text-left">
            <p className="text-sm text-realm-text-secondary">No Tool Equipped</p>
            <div className="flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3 text-realm-danger" />
              <span className="text-[10px] text-realm-danger">-25% speed and yield (bare hands)</span>
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
      className="w-full p-4 border border-realm-border rounded-lg bg-realm-bg-700 hover:border-realm-gold-400/40 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-realm-bg-900 flex items-center justify-center border border-realm-gold-400/20">
          <Wrench className="w-5 h-5 text-realm-gold-400" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm text-realm-text-primary font-display">{tool.name}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-display ${tierBadge}`}>
              {tierLabel(tool.tier)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] text-realm-success">
              +{Math.round(tool.speedBonus * 100)}% speed
            </span>
            <span className="text-[10px] text-realm-teal-300">
              +{Math.round(tool.yieldBonus * 100)}% yield
            </span>
          </div>
          {/* Durability bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-realm-bg-900 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${durabilityColor(ratio)}`}
                style={{ width: `${Math.max(2, ratio * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-realm-text-muted">
              {tool.durability}/{tool.maxDurability}
            </span>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-realm-text-muted mt-2 text-left">Click to change tool</p>
    </button>
  );
}
