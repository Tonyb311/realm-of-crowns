import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Pickaxe,
  Hammer,
  Handshake,
  ArrowRight,
  MapPin,
  Loader2,
  Star,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { PROFESSION_TIERS } from '@shared/data/professions';
import type { ProfessionTierName } from '@shared/data/professions/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TierUnlock {
  tier: string;
  title: string;
  levelRange: [number, number];
  perks: string[];
  unlocks: string[];
}

interface ProfessionInfo {
  type: string;
  name: string;
  category: string;
  description: string;
  primaryStat: string;
  inputResources: string[];
  outputProducts: string[];
  townTypeAffinity: string[];
  tierUnlocks: TierUnlock[];
  racialBonuses: string[];
  currentProgress?: {
    level: number;
    tier: string;
    xp: number;
    xpToNextLevel: number;
  };
}

interface ProfessionDetailProps {
  professionType: string;
  onClose: () => void;
  onLearn?: () => void;
  onAbandon?: () => void;
  isLearned: boolean;
  isAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const CATEGORY_ICONS: Record<string, typeof Pickaxe> = {
  GATHERING: Pickaxe,
  CRAFTING: Hammer,
  SERVICE: Handshake,
};

const TIER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  APPRENTICE:   { bg: 'bg-realm-text-muted/10', border: 'border-realm-text-muted/30', text: 'text-realm-text-secondary' },
  JOURNEYMAN:   { bg: 'bg-realm-success/10',     border: 'border-realm-success/30',     text: 'text-realm-success' },
  CRAFTSMAN:    { bg: 'bg-realm-teal-300/10',      border: 'border-realm-teal-300/30',      text: 'text-realm-teal-300' },
  EXPERT:       { bg: 'bg-realm-purple-300/10',    border: 'border-realm-purple-300/30',    text: 'text-realm-purple-300' },
  MASTER:       { bg: 'bg-realm-gold-400/10',     border: 'border-realm-gold-400/30',     text: 'text-realm-gold-400' },
  GRANDMASTER:  { bg: 'bg-realm-danger/10',       border: 'border-realm-danger/30',       text: 'text-realm-danger' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ProfessionDetail({
  professionType,
  onClose,
  onLearn,
  onAbandon,
  isLearned,
  isAvailable,
}: ProfessionDetailProps) {
  const { data: info, isLoading } = useQuery<ProfessionInfo>({
    queryKey: ['profession', 'info', professionType],
    queryFn: async () => {
      const res = await api.get(`/professions/info/${professionType}`);
      return res.data;
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-realm-bg-800 border border-realm-border rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-realm-text-muted hover:text-realm-text-primary z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
          </div>
        ) : info ? (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-realm-bg-700 flex items-center justify-center">
                {(() => {
                  const Icon = CATEGORY_ICONS[info.category] ?? Hammer;
                  return <Icon className="w-6 h-6 text-realm-gold-400" />;
                })()}
              </div>
              <div className="flex-1">
                <h2 className="font-display text-2xl text-realm-gold-400">{info.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-realm-text-muted capitalize">
                    {info.category.toLowerCase()}
                  </span>
                  <span className="text-xs text-realm-text-muted">
                    Primary: {info.primaryStat}
                  </span>
                  {info.currentProgress && (
                    <span className="text-xs font-display text-realm-gold-400">
                      Level {info.currentProgress.level} ({info.currentProgress.tier})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-realm-text-secondary leading-relaxed mb-6">
              {info.description}
            </p>

            {/* Current progress bar */}
            {info.currentProgress && (
              <div className="mb-6 p-4 bg-realm-bg-700 border border-realm-gold-400/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-display text-realm-gold-400 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" />
                    Level {info.currentProgress.level}
                  </span>
                  <span className="text-xs text-realm-text-muted">
                    {info.currentProgress.xp}/{info.currentProgress.xpToNextLevel} XP
                  </span>
                </div>
                <div className="h-2 bg-realm-bg-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-realm-gold-400 rounded-full transition-all"
                    style={{
                      width: info.currentProgress.xpToNextLevel > 0
                        ? `${(info.currentProgress.xp / info.currentProgress.xpToNextLevel) * 100}%`
                        : '100%',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Inputs / Outputs */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <h4 className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-2">Inputs</h4>
                <div className="space-y-1">
                  {info.inputResources.map((r) => (
                    <span key={r} className="block text-xs text-realm-text-secondary">{r}</span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-2">Outputs</h4>
                <div className="space-y-1">
                  {info.outputProducts.map((p) => (
                    <span key={p} className="block text-xs text-realm-text-secondary">{p}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Town affinity */}
            {info.townTypeAffinity.length > 0 && (
              <div className="mb-6">
                <h4 className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Best Town Types
                </h4>
                <div className="flex flex-wrap gap-2">
                  {info.townTypeAffinity.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-realm-bg-700 border border-realm-border rounded text-xs text-realm-text-secondary capitalize"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Racial bonuses */}
            {info.racialBonuses && info.racialBonuses.length > 0 && (
              <div className="mb-6 p-3 bg-realm-gold-400/5 border border-realm-gold-400/20 rounded-lg">
                <h4 className="text-[10px] text-realm-gold-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Racial Bonuses
                </h4>
                {info.racialBonuses.map((b, i) => (
                  <p key={i} className="text-xs text-realm-gold-400/80">{b}</p>
                ))}
              </div>
            )}

            {/* Tier progression */}
            <div className="mb-6">
              <h4 className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-3">
                Tier Progression
              </h4>
              <div className="space-y-2">
                {PROFESSION_TIERS.map((tierDef) => {
                  const tc = TIER_COLORS[tierDef.tier] ?? TIER_COLORS.APPRENTICE;
                  const tierData = info.tierUnlocks?.find((t) => t.tier === tierDef.tier);
                  const unlocks = tierData?.unlocks ?? [];
                  const isCurrent = info.currentProgress?.tier === tierDef.tier;

                  return (
                    <div
                      key={tierDef.tier}
                      className={`p-3 rounded border ${tc.bg} ${tc.border} ${isCurrent ? 'ring-1 ring-realm-gold-400/50' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-display ${tc.text}`}>
                          {tierDef.title}
                          {isCurrent && <span className="ml-2 text-realm-gold-400">(Current)</span>}
                        </span>
                        <span className="text-[10px] text-realm-text-muted">
                          Lv. {tierDef.levelRange[0]}-{tierDef.levelRange[1]}
                        </span>
                      </div>
                      {unlocks.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {unlocks.map((u, i) => (
                            <span key={i} className="text-[10px] text-realm-text-secondary flex items-center gap-0.5">
                              <ArrowRight className="w-2.5 h-2.5" />
                              {u}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {isAvailable && onLearn && (
                <button
                  onClick={onLearn}
                  className="flex-1 py-2.5 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors"
                >
                  Learn This Profession
                </button>
              )}
              {isLearned && onAbandon && (
                <button
                  onClick={onAbandon}
                  className="flex-1 py-2.5 border border-realm-danger/40 text-realm-danger font-display text-sm rounded hover:bg-realm-danger/10 transition-colors"
                >
                  Abandon Profession
                </button>
              )}
              <button
                onClick={onClose}
                className="px-6 py-2.5 border border-realm-text-muted/30 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-realm-text-muted text-sm">
            Failed to load profession info.
          </div>
        )}
      </div>
    </div>
  );
}
