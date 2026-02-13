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
  /** When true, the Learn button is replaced with a "Locked" badge (character below PROFESSION_UNLOCK_LEVEL). */
  levelLocked?: boolean;
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
  GATHERING: { badge: 'bg-realm-success/15 text-realm-success border-realm-success/30', text: 'text-realm-success' },
  CRAFTING: { badge: 'bg-realm-teal-300/15 text-realm-teal-300 border-realm-teal-300/30', text: 'text-realm-teal-300' },
  SERVICE: { badge: 'bg-realm-purple-300/15 text-realm-purple-300 border-realm-purple-300/30', text: 'text-realm-purple-300' },
};

const TIER_COLORS: Record<string, string> = {
  APPRENTICE: 'text-realm-text-muted',
  JOURNEYMAN: 'text-realm-success',
  CRAFTSMAN: 'text-realm-teal-300',
  EXPERT: 'text-realm-purple-300',
  MASTER: 'text-realm-gold-400',
  GRANDMASTER: 'text-realm-danger',
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
  levelLocked = false,
}: ProfessionCardProps) {
  const CategoryIcon = CATEGORY_ICONS[profession.category] ?? Hammer;
  const catColor = CATEGORY_COLORS[profession.category] ?? CATEGORY_COLORS.CRAFTING;
  const isLearned = profession.status === 'learned';
  const isLocked = profession.status === 'locked';

  return (
    <div
      onClick={onClick}
      className={`group relative bg-realm-bg-700 border rounded-lg transition-all
        ${isLearned
          ? 'border-realm-gold-400/40 hover:border-realm-gold-400/60'
          : isLocked
            ? 'border-realm-border/50 opacity-60'
            : 'border-realm-border hover:border-realm-border/80'}
        ${onClick ? 'cursor-pointer' : ''}
        ${compact ? 'p-3' : 'p-4'}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-9 h-9 rounded flex items-center justify-center ${
          isLearned ? 'bg-realm-gold-400/15' : 'bg-realm-bg-800'
        }`}>
          {isLocked ? (
            <Lock className="w-4 h-4 text-realm-text-muted/50" />
          ) : (
            <CategoryIcon className={`w-4 h-4 ${isLearned ? 'text-realm-gold-400' : 'text-realm-text-secondary'}`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-display text-sm truncate ${
              isLearned ? 'text-realm-gold-400' : 'text-realm-text-primary'
            }`}>
              {profession.name}
            </h4>
            {isLearned && profession.tier && (
              <span className={`text-[10px] font-display ${TIER_COLORS[profession.tier] ?? 'text-realm-text-muted'}`}>
                {tierLabel(profession.tier)}
              </span>
            )}
          </div>

          {/* Category badge + stat */}
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border ${catColor.badge}`}>
              {profession.category.charAt(0) + profession.category.slice(1).toLowerCase()}
            </span>
            <span className="text-[10px] text-realm-text-muted">
              {profession.primaryStat}
            </span>
          </div>
        </div>

        {onClick && (
          <ChevronRight className="w-4 h-4 text-realm-text-muted/50 group-hover:text-realm-text-secondary flex-shrink-0 mt-1 transition-colors" />
        )}
      </div>

      {/* Description (expanded mode) */}
      {!compact && (
        <p className="text-xs text-realm-text-muted mt-2 line-clamp-2">
          {profession.description}
        </p>
      )}

      {/* Level bar (learned professions) */}
      {isLearned && profession.level != null && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-realm-text-secondary font-display flex items-center gap-1">
              <Star className="w-3 h-3" />
              Level {profession.level}
            </span>
            <span className="text-[10px] text-realm-text-muted">
              {profession.xp ?? 0}/{profession.xpToNextLevel ?? 0} XP
            </span>
          </div>
          <div className="h-1.5 bg-realm-bg-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-realm-gold-400/70 rounded-full transition-all"
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
          <TrendingUp className="w-3 h-3 text-realm-text-muted/50" />
          {profession.townTypeAffinity.map((t) => (
            <span key={t} className="text-[10px] text-realm-text-muted capitalize">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Lock reason */}
      {isLocked && profession.lockReason && (
        <p className="text-[10px] text-realm-danger/80 mt-2">
          {profession.lockReason}
        </p>
      )}

      {/* Racial bonuses */}
      {!compact && profession.racialBonuses && profession.racialBonuses.length > 0 && (
        <div className="mt-2">
          {profession.racialBonuses.map((b, i) => (
            <span key={i} className="text-[10px] text-realm-gold-400/80 block">
              {b}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      {!compact && (
        <div className="mt-3">
          {profession.status === 'available' && levelLocked && (
            <button
              disabled
              className="w-full py-1.5 bg-realm-bg-800 text-realm-text-muted font-display text-xs rounded cursor-not-allowed flex items-center justify-center gap-1"
            >
              <Lock className="w-3 h-3" /> Requires Level 3
            </button>
          )}
          {profession.status === 'available' && !levelLocked && onLearn && (
            <button
              onClick={(e) => { e.stopPropagation(); onLearn(); }}
              className="w-full py-1.5 bg-realm-gold-500 text-realm-bg-900 font-display text-xs rounded hover:bg-realm-gold-400 transition-colors"
            >
              Learn
            </button>
          )}
          {profession.status === 'learned' && onAbandon && (
            <button
              onClick={(e) => { e.stopPropagation(); onAbandon(); }}
              className="w-full py-1.5 border border-realm-danger/40 text-realm-danger font-display text-xs rounded hover:bg-realm-danger/10 transition-colors"
            >
              Abandon
            </button>
          )}
        </div>
      )}
    </div>
  );
}
