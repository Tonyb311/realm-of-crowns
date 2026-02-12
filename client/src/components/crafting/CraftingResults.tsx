import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, TrendingUp, Hammer } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface CraftingResultData {
  item: {
    id: string;
    name: string;
    type: string;
    quality: string;
    craftedBy: string;
  };
  qualityRoll: {
    roll: number;
    total: number;
    quality: string;
  };
  xpAwarded: number;
  profession: {
    type: string;
    level: number;
    tier: string;
    leveledUp: boolean;
  };
  remainingInQueue: number;
}

interface CraftingResultsProps {
  data: CraftingResultData;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Quality colors
// ---------------------------------------------------------------------------
const QUALITY_COLORS: Record<string, { text: string; glow: string; border: string }> = {
  POOR:       { text: 'text-realm-text-muted',      glow: '',                                                    border: 'border-realm-text-muted' },
  COMMON:     { text: 'text-realm-text-secondary',  glow: '',                                                    border: 'border-realm-text-secondary' },
  FINE:       { text: 'text-realm-success',      glow: 'drop-shadow-[0_0_6px_rgba(74,222,128,0.4)]',         border: 'border-realm-success' },
  SUPERIOR:   { text: 'text-realm-teal-300',       glow: 'drop-shadow-[0_0_6px_rgba(96,165,250,0.4)]',         border: 'border-realm-teal-300' },
  MASTERWORK: { text: 'text-realm-purple-300',     glow: 'drop-shadow-[0_0_6px_rgba(192,132,252,0.4)]',        border: 'border-realm-purple-300' },
  LEGENDARY:  { text: 'text-realm-gold-400',      glow: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',         border: 'border-realm-gold-400' },
};

function qualityStyle(quality: string) {
  return QUALITY_COLORS[quality] ?? QUALITY_COLORS.COMMON;
}

// ---------------------------------------------------------------------------
// D20 Display (dice animation)
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
// Profession label helper
// ---------------------------------------------------------------------------
const PROFESSION_LABELS: Record<string, string> = {
  BLACKSMITH: 'Blacksmith', ARMORER: 'Armorer', LEATHERWORKER: 'Leatherworker',
  TAILOR: 'Tailor', WOODWORKER: 'Woodworker', ALCHEMIST: 'Alchemist',
  COOK: 'Cook', BREWER: 'Brewer', SMELTER: 'Smelter', TANNER: 'Tanner',
  FLETCHER: 'Fletcher', JEWELER: 'Jeweler', ENCHANTER: 'Enchanter',
  SCRIBE: 'Scribe', MASON: 'Mason',
};

function professionLabel(type: string) {
  return PROFESSION_LABELS[type] ?? type.charAt(0) + type.slice(1).toLowerCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CraftingResults({ data, onDismiss }: CraftingResultsProps) {
  const style = qualityStyle(data.item.quality);

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
            <Hammer className="w-8 h-8 text-realm-gold-400 mx-auto mb-2" />
            <h3 className="font-display text-xl text-realm-gold-400">Crafting Complete</h3>
          </div>

          {/* D20 quality roll */}
          <D20Display roll={data.qualityRoll.roll} />

          {/* Quality roll breakdown */}
          <motion.div
            className="text-center mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <p className="text-[10px] text-realm-text-muted">
              Roll: {data.qualityRoll.roll} | Total: {data.qualityRoll.total}
            </p>
          </motion.div>

          {/* Crafted item */}
          <AnimatePresence>
            <motion.div
              className={`flex items-center justify-between bg-realm-bg-900 rounded px-4 py-3 border ${style.border} mb-4`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <div>
                <span className={`text-base font-display ${style.text} ${style.glow}`}>
                  {data.item.name}
                </span>
                <p className={`text-xs mt-0.5 ${style.text} opacity-80`}>
                  {data.item.quality}
                </p>
              </div>
              <Sparkles className={`w-5 h-5 ${style.text}`} />
            </motion.div>
          </AnimatePresence>

          {/* XP earned + profession */}
          {data.xpAwarded > 0 && (
            <motion.div
              className="mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-realm-success" />
                  <span className="text-xs text-realm-text-muted">
                    {professionLabel(data.profession.type)} XP
                  </span>
                </div>
                <span className="text-xs text-realm-success font-display">+{data.xpAwarded}</span>
              </div>
              <p className="text-[10px] text-realm-text-muted">
                Lv.{data.profession.level} ({data.profession.tier})
              </p>
            </motion.div>
          )}

          {/* Level up banner */}
          {data.profession.leveledUp && (
            <motion.div
              className="mb-4 p-3 border border-realm-gold-400 bg-realm-gold-400/10 rounded-lg text-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, type: 'spring' }}
            >
              <p className="font-display text-realm-gold-400 text-lg">Level Up!</p>
              <p className="text-realm-text-secondary text-sm">
                {professionLabel(data.profession.type)} is now level {data.profession.level}
              </p>
            </motion.div>
          )}

          {/* Remaining queue */}
          {data.remainingInQueue > 0 && (
            <motion.p
              className="text-xs text-realm-text-muted text-center mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
            >
              {data.remainingInQueue} more item{data.remainingInQueue !== 1 ? 's' : ''} in queue
            </motion.p>
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
