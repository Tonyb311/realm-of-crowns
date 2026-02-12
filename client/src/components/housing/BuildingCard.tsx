import {
  Home,
  Hammer,
  Wrench,
  Store,
  Warehouse,
  Building2,
  Star,
  Clock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface BuildingData {
  id: string;
  type: string;
  name: string;
  level: number;
  town?: { id: string; name: string };
  owner?: { id: string; name: string };
  underConstruction?: boolean;
  constructionStatus?: string | null;
  completesAt?: string | null;
  isWorkshop?: boolean;
  hasStorage?: boolean;
}

interface BuildingCardProps {
  building: BuildingData;
  onClick?: (building: BuildingData) => void;
  showOwner?: boolean;
}

// ---------------------------------------------------------------------------
// Building type display helpers
// ---------------------------------------------------------------------------
const BUILDING_TYPE_LABELS: Record<string, string> = {
  HOUSE_SMALL: 'Small House',
  HOUSE_MEDIUM: 'Medium House',
  HOUSE_LARGE: 'Large House',
  SMITHY: 'Smithy',
  SMELTERY: 'Smeltery',
  TANNERY: 'Tannery',
  TAILOR_SHOP: 'Tailor Shop',
  ALCHEMY_LAB: 'Alchemy Lab',
  ENCHANTING_TOWER: 'Enchanting Tower',
  KITCHEN: 'Kitchen',
  BREWERY: 'Brewery',
  JEWELER_WORKSHOP: 'Jeweler Workshop',
  FLETCHER_BENCH: 'Fletcher Bench',
  MASON_YARD: 'Mason Yard',
  LUMBER_MILL: 'Lumber Mill',
  SCRIBE_STUDY: 'Scribe Study',
  STABLE: 'Stable',
  WAREHOUSE: 'Warehouse',
  BANK: 'Bank',
  INN: 'Inn',
  MARKET_STALL: 'Market Stall',
  FARM: 'Farm',
  RANCH: 'Ranch',
  MINE: 'Mine',
};

export function buildingTypeLabel(type: string): string {
  return BUILDING_TYPE_LABELS[type] ?? type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ');
}

function BuildingIcon({ type, className }: { type: string; className?: string }) {
  const cls = className ?? 'w-5 h-5';
  if (type.startsWith('HOUSE_')) return <Home className={cls} />;
  if (type === 'WAREHOUSE') return <Warehouse className={cls} />;
  if (type === 'MARKET_STALL') return <Store className={cls} />;
  if (['SMITHY', 'SMELTERY', 'TANNERY', 'TAILOR_SHOP', 'ALCHEMY_LAB', 'ENCHANTING_TOWER',
    'KITCHEN', 'BREWERY', 'JEWELER_WORKSHOP', 'FLETCHER_BENCH', 'MASON_YARD',
    'LUMBER_MILL', 'SCRIBE_STUDY'].includes(type)) {
    return <Wrench className={cls} />;
  }
  return <Building2 className={cls} />;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ building }: { building: BuildingData }) {
  if (building.underConstruction || building.level === 0) {
    if (building.constructionStatus === 'IN_PROGRESS') {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-display bg-realm-gold-500/15 text-realm-gold-400 border border-realm-gold-500/30 rounded-full">
          <Clock className="w-3 h-3" />
          Building
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-display bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded-full">
        <Hammer className="w-3 h-3" />
        Pending
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-display bg-realm-success/15 text-realm-success border border-realm-success/30 rounded-full">
      Active
    </span>
  );
}

// ---------------------------------------------------------------------------
// Level stars
// ---------------------------------------------------------------------------
function LevelStars({ level }: { level: number }) {
  if (level === 0) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < level ? 'text-realm-gold-400 fill-realm-gold-400' : 'text-realm-border'}`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function BuildingCard({ building, onClick, showOwner }: BuildingCardProps) {
  return (
    <button
      onClick={() => onClick?.(building)}
      className="w-full text-left bg-realm-bg-700 border border-realm-border rounded-lg p-4 transition-all hover:border-realm-gold-500/30 hover:bg-realm-bg-700/80 group"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-realm-bg-900 flex items-center justify-center flex-shrink-0 border border-realm-border group-hover:border-realm-gold-500/20">
          <BuildingIcon type={building.type} className="w-5 h-5 text-realm-gold-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className="font-display text-realm-text-primary text-sm truncate">
              {building.name}
            </h4>
            <StatusBadge building={building} />
          </div>
          <p className="text-[10px] text-realm-text-muted mb-1">
            {buildingTypeLabel(building.type)}
          </p>
          <div className="flex items-center gap-3">
            <LevelStars level={building.level} />
            {building.town && (
              <span className="text-[10px] text-realm-text-muted">
                {building.town.name}
              </span>
            )}
            {showOwner && building.owner && (
              <span className="text-[10px] text-realm-text-muted">
                Owner: {building.owner.name}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        {onClick && (
          <ChevronRight className="w-4 h-4 text-realm-text-muted group-hover:text-realm-gold-400 flex-shrink-0 mt-1" />
        )}
      </div>
    </button>
  );
}
