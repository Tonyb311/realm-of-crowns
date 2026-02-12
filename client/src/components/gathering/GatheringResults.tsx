import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, TrendingUp, AlertTriangle, Wrench } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface GatheringResultData {
  items: { name: string; quantity: number; rarity: string }[];
  d20Roll?: number;
  xpEarned: number;
  profession?: string;
  professionLevel?: number;
  professionXp?: number;
  professionXpToNext?: number;
  leveledUp?: boolean;
  newLevel?: number;
  toolDurabilityUsed?: number;
  toolDurabilityRemaining?: number;
  toolName?: string;
  abundanceDropped?: boolean;
  newAbundance?: string;
}

interface GatheringResultsProps {
  data: GatheringResultData;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Rarity colors (matching resource rarities from shared types)
// ---------------------------------------------------------------------------
const RARITY_COLORS: Record<string, { text: string; glow: string }> = {
  COMMON:    { text: 'text-realm-text-secondary', glow: '' },
  UNCOMMON:  { text: 'text-realm-success',     glow: 'drop-shadow-[0_0_6px_rgba(74,222,128,0.4)]' },
  RARE:      { text: 'text-realm-teal-300',      glow: 'drop-shadow-[0_0_6px_rgba(96,165,250,0.4)]' },
  EXOTIC:    { text: 'text-realm-purple-300',    glow: 'drop-shadow-[0_0_6px_rgba(192,132,252,0.4)]' },
  LEGENDARY: { text: 'text-realm-gold-400',     glow: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' },
};

function rarityStyle(rarity: string) {
  return RARITY_COLORS[rarity] ?? RARITY_COLORS.COMMON;
}

// ---------------------------------------------------------------------------
// D20 face display
// ---------------------------------------------------------------------------
function D20Display({ roll }: { roll: number }) {
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowResult(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="relative w-16 h-16 mx-auto mb-3"
      initial={{ rotateY: 0 }}
      animate={showResult ? { rotateY: 360 } : { rotateY: [0, 180, 360], transition: { duration: 0.6, repeat: Infinity } }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-display text-2xl border-2 ${
        roll >= 18 ? 'border-realm-gold-400 bg-realm-gold-400/10 text-realm-gold-400' :
        roll >= 10 ? 'border-realm-success bg-realm-success/10 text-realm-success' :
        roll >= 5 ? 'border-realm-text-secondary bg-realm-bg-900 text-realm-text-secondary' :
        'border-realm-danger bg-realm-danger/10 text-realm-danger'
      }`}>
        {showResult ? roll : '?'}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function GatheringResults({ data, onDismiss }: GatheringResultsProps) {
  const profXpPct = data.professionXpToNext && data.professionXpToNext > 0
    ? Math.min(100, ((data.professionXp ?? 0) / data.professionXpToNext) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onDismiss}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Modal */}
      <motion.div
        className="relative bg-realm-bg-800 border border-realm-border rounded-lg max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-realm-text-muted hover:text-realm-text-primary z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-4">
            <Sparkles className="w-8 h-8 text-realm-gold-400 mx-auto mb-2" />
            <h3 className="font-display text-xl text-realm-gold-400">Gathering Complete</h3>
          </div>

          {/* D20 roll */}
          {data.d20Roll != null && (
            <D20Display roll={data.d20Roll} />
          )}

          {/* Resources gained */}
          <div className="space-y-1.5 mb-4">
            <AnimatePresence>
              {data.items.map((item, i) => {
                const style = rarityStyle(item.rarity);
                return (
                  <motion.div
                    key={`${item.name}-${i}`}
                    className="flex justify-between items-center bg-realm-bg-900 rounded px-3 py-2"
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 * i + 0.3, duration: 0.3 }}
                  >
                    <span className={`text-sm font-display ${style.text} ${style.glow}`}>
                      {item.name}
                    </span>
                    <span className="text-sm text-realm-text-secondary font-display">x{item.quantity}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* XP earned + profession progress */}
          {data.xpEarned > 0 && (
            <motion.div
              className="mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-realm-success" />
                  <span className="text-xs text-realm-text-muted">
                    {data.profession ?? 'Profession'} XP
                  </span>
                </div>
                <span className="text-xs text-realm-success font-display">+{data.xpEarned}</span>
              </div>
              <div className="h-2 bg-realm-bg-900 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-realm-success/80 to-realm-success"
                  initial={{ width: 0 }}
                  animate={{ width: `${profXpPct}%` }}
                  transition={{ delay: 0.7, duration: 0.6, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[10px] text-realm-text-muted">
                  Lv.{data.professionLevel ?? '?'}
                </span>
                <span className="text-[10px] text-realm-text-muted">
                  {data.professionXp ?? 0}/{data.professionXpToNext ?? '?'} XP
                </span>
              </div>
            </motion.div>
          )}

          {/* Level up banner */}
          {data.leveledUp && (
            <motion.div
              className="mb-4 p-3 border border-realm-gold-400 bg-realm-gold-400/10 rounded-lg text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, type: 'spring' }}
            >
              <p className="font-display text-realm-gold-400 text-lg">Level Up!</p>
              <p className="text-realm-text-secondary text-sm">
                {data.profession} is now level {data.newLevel}
              </p>
            </motion.div>
          )}

          {/* Tool durability */}
          {data.toolName && data.toolDurabilityUsed != null && (
            <motion.div
              className="mb-4 flex items-center gap-2 bg-realm-bg-900 rounded px-3 py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Wrench className="w-3.5 h-3.5 text-realm-text-muted flex-shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="text-xs text-realm-text-secondary">{data.toolName}</span>
                  <span className="text-[10px] text-realm-text-muted">
                    -{data.toolDurabilityUsed} use{data.toolDurabilityUsed !== 1 ? 's' : ''}
                  </span>
                </div>
                {data.toolDurabilityRemaining != null && (
                  <p className="text-[10px] text-realm-text-muted">
                    {data.toolDurabilityRemaining} uses remaining
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Depletion warning */}
          {data.abundanceDropped && (
            <motion.div
              className="mb-4 flex items-center gap-2 bg-realm-danger/10 border border-realm-danger/30 rounded px-3 py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-realm-danger flex-shrink-0" />
              <span className="text-xs text-realm-danger">
                Resource abundance has dropped{data.newAbundance ? ` to ${data.newAbundance.toLowerCase()}` : ''}
              </span>
            </motion.div>
          )}

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            className="w-full py-2.5 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors"
          >
            Continue
          </button>
        </div>
      </motion.div>
    </div>
  );
}
