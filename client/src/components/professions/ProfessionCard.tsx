import {
  Pickaxe,
  Hammer,
  Handshake,
  ChevronRight,
  Lock,
  Star,
  TrendingUp,
} from 'lucide-react';
import type { ProfessionCategory, ProfessionTierName } from '@shared/data/professions/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ProfessionCardData {
  professionType: string;
  name: string;
  category: ProfessionCategory;
  description: string;
  primaryStat: string;
  status: 'learned' | 'available' | 'locked' | 'inactive';
  lockReason?: string;
  level?: number;
  tier?: ProfessionTierName;
  xp?: number;
  xpToNextLevel?: number;
  outputProducts?: string[];
  townTypeAffinity?: string[];
  racialBonuses?: string[];
}

interface ProfessionCardProps {
  profession: ProfessionCardData;
  compact?: boolean;
  onClick?: () => void;
  onLearn?: () => void;
  onAbandon?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const CATEGORY_ICONS: Record<ProfessionCategory, typeof Pickaxe> = {
  GATHERING: Pickaxe,
  CRAFTING: Hammer,
  SERVICE: Handshake,
};

const CATEGORY_COLORS: Record<ProfessionCategory, { badge: string; text: string }> = {
  GATHERING: { badge: 'bg-green-500/15 text-green-400 border-green-500/30', text: 'text-green-400' },
  CRAFTING: { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30', text: 'text-blue-400' },
  SERVICE: { badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30', text: 'text-purple-400' },
};

const TIER_COLORS: Record<string, string> = {
  APPRENTICE: 'text-parchment-500',
  JOURNEYMAN: 'text-green-400',
  CRAFTSMAN: 'text-blue-400',
  EXPERT: 'text-purple-400',
  MASTER: 'text-amber-400',
  GRANDMASTER: 'text-red-400',
};

function tierLabel(tier: string): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ProfessionCard({
  profession,
  compact = false,
  onClick,
  onLearn,
  onAbandon,
}: ProfessionCardProps) {
  const CategoryIcon = CATEGORY_ICONS[profession.category] ?? Hammer;
  const catColor = CATEGORY_COLORS[profession.category] ?? CATEGORY_COLORS.CRAFTING;
  const isLearned = profession.status === 'learned';
  const isLocked = profession.status === 'locked';

  return (
    <div
      onClick={onClick}
      className={`group relative bg-dark-300 border rounded-lg transition-all
        ${isLearned
          ? 'border-primary-400/40 hover:border-primary-400/60'
          : isLocked
            ? 'border-dark-50/50 opacity-60'
            : 'border-dark-50 hover:border-dark-50/80'}
        ${onClick ? 'cursor-pointer' : ''}
        ${compact ? 'p-3' : 'p-4'}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-9 h-9 rounded flex items-center justify-center ${
          isLearned ? 'bg-primary-400/15' : 'bg-dark-400'
        }`}>
          {isLocked ? (
            <Lock className="w-4 h-4 text-parchment-500/50" />
          ) : (
            <CategoryIcon className={`w-4 h-4 ${isLearned ? 'text-primary-400' : 'text-parchment-400'}`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-display text-sm truncate ${
              isLearned ? 'text-primary-400' : 'text-parchment-200'
            }`}>
              {profession.name}
            </h4>
            {isLearned && profession.tier && (
              <span className={`text-[10px] font-display ${TIER_COLORS[profession.tier] ?? 'text-parchment-500'}`}>
                {tierLabel(profession.tier)}
              </span>
            )}
          </div>

          {/* Category badge + stat */}
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border ${catColor.badge}`}>
              {profession.category.charAt(0) + profession.category.slice(1).toLowerCase()}
            </span>
            <span className="text-[10px] text-parchment-500">
              {profession.primaryStat}
            </span>
          </div>
        </div>

        {onClick && (
          <ChevronRight className="w-4 h-4 text-parchment-500/50 group-hover:text-parchment-300 flex-shrink-0 mt-1 transition-colors" />
        )}
      </div>

      {/* Description (expanded mode) */}
      {!compact && (
        <p className="text-xs text-parchment-500 mt-2 line-clamp-2">
          {profession.description}
        </p>
      )}

      {/* Level bar (learned professions) */}
      {isLearned && profession.level != null && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-parchment-400 font-display flex items-center gap-1">
              <Star className="w-3 h-3" />
              Level {profession.level}
            </span>
            <span className="text-[10px] text-parchment-500">
              {profession.xp ?? 0}/{profession.xpToNextLevel ?? 0} XP
            </span>
          </div>
          <div className="h-1.5 bg-dark-500 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-400/70 rounded-full transition-all"
              style={{
                width: profession.xpToNextLevel && profession.xpToNextLevel > 0
                  ? `${Math.min(100, ((profession.xp ?? 0) / profession.xpToNextLevel) * 100)}%`
                  : '100%',
              }}
            />
          </div>
        </div>
      )}

      {/* Town affinity + products (expanded, non-learned) */}
      {!compact && !isLearned && profession.townTypeAffinity && profession.townTypeAffinity.length > 0 && (
        <div className="mt-2 flex items-center gap-1 flex-wrap">
          <TrendingUp className="w-3 h-3 text-parchment-500/50" />
          {profession.townTypeAffinity.map((t) => (
            <span key={t} className="text-[10px] text-parchment-500 capitalize">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Lock reason */}
      {isLocked && profession.lockReason && (
        <p className="text-[10px] text-red-400/80 mt-2">
          {profession.lockReason}
        </p>
      )}

      {/* Racial bonuses */}
      {!compact && profession.racialBonuses && profession.racialBonuses.length > 0 && (
        <div className="mt-2">
          {profession.racialBonuses.map((b, i) => (
            <span key={i} className="text-[10px] text-amber-400/80 block">
              {b}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {!compact && (
        <div className="mt-3">
          {profession.status === 'available' && onLearn && (
            <button
              onClick={(e) => { e.stopPropagation(); onLearn(); }}
              className="w-full py-1.5 bg-primary-400 text-dark-500 font-display text-xs rounded hover:bg-primary-300 transition-colors"
            >
              Learn
            </button>
          )}
          {profession.status === 'learned' && onAbandon && (
            <button
              onClick={(e) => { e.stopPropagation(); onAbandon(); }}
              className="w-full py-1.5 border border-red-500/40 text-red-400 font-display text-xs rounded hover:bg-red-500/10 transition-colors"
            >
              Abandon
            </button>
          )}
        </div>
      )}
    </div>
  );
}
