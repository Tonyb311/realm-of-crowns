import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Shield, Sparkles, Star } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AbilityUnlockCelebrationProps {
  abilityName: string;
  abilityDescription: string;
  abilityType: 'active' | 'passive';
  effectType?: string;
  onDismiss: () => void;
}

// ---------------------------------------------------------------------------
// Color theme by ability category
// ---------------------------------------------------------------------------
function getTheme(abilityType: 'active' | 'passive', effectType?: string) {
  const lower = (effectType ?? '').toLowerCase();

  // Combat abilities (damage, combat-related)
  if (lower.includes('damage') || lower.includes('attack') || lower.includes('combat') || lower.includes('breath')) {
    return {
      glow: 'shadow-red-500/40',
      border: 'border-red-500',
      bg: 'bg-red-900/20',
      text: 'text-red-400',
      iconBg: 'bg-red-900/30 border-red-500/40',
      buttonBg: 'bg-red-600 hover:bg-red-500',
      particle: '#ef4444',
    };
  }

  // Passive / defensive
  if (abilityType === 'passive') {
    return {
      glow: 'shadow-green-500/40',
      border: 'border-green-500',
      bg: 'bg-green-900/20',
      text: 'text-green-400',
      iconBg: 'bg-green-900/30 border-green-500/40',
      buttonBg: 'bg-green-600 hover:bg-green-500',
      particle: '#22c55e',
    };
  }

  // Default / utility
  return {
    glow: 'shadow-blue-500/40',
    border: 'border-blue-500',
    bg: 'bg-blue-900/20',
    text: 'text-blue-400',
    iconBg: 'bg-blue-900/30 border-blue-500/40',
    buttonBg: 'bg-blue-600 hover:bg-blue-500',
    particle: '#3b82f6',
  };
}

// ---------------------------------------------------------------------------
// Particle effect
// ---------------------------------------------------------------------------
function Particles({ color }: { color: string }) {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 300 - 150,
    y: Math.random() * 300 - 150,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 0.5,
    duration: Math.random() * 1.5 + 1,
  }));

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: color,
          }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: p.x,
            y: p.y,
            scale: [0, 1.5, 1, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AbilityUnlockCelebration({
  abilityName,
  abilityDescription,
  abilityType,
  effectType,
  onDismiss,
}: AbilityUnlockCelebrationProps) {
  const theme = getTheme(abilityType, effectType);
  const Icon = abilityType === 'active' ? Zap : Shield;

  useEffect(() => {
    const timer = setTimeout(onDismiss, 10000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Enter') onDismiss();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/80"
          onClick={onDismiss}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Particles */}
        <Particles color={theme.particle} />

        {/* Card */}
        <motion.div
          className={`relative bg-dark-400 ${theme.border} border-2 rounded-xl p-8 max-w-sm w-full mx-4 text-center
            shadow-2xl ${theme.glow}`}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 200, delay: 0.1 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sparkle decorators */}
          <motion.div
            className="absolute -top-3 -right-3"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          >
            <Star className={`w-6 h-6 ${theme.text}`} />
          </motion.div>
          <motion.div
            className="absolute -bottom-2 -left-2"
            animate={{ rotate: -360 }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className={`w-5 h-5 ${theme.text} opacity-60`} />
          </motion.div>

          {/* Icon */}
          <motion.div
            className={`w-20 h-20 mx-auto rounded-full ${theme.iconBg} border-2 flex items-center justify-center mb-4`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10, delay: 0.2 }}
          >
            <motion.div
              animate={{
                boxShadow: [
                  `0 0 20px 0px ${theme.particle}40`,
                  `0 0 40px 10px ${theme.particle}60`,
                  `0 0 20px 0px ${theme.particle}40`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="rounded-full p-3"
            >
              <Icon className={`w-8 h-8 ${theme.text}`} />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.p
            className="text-[10px] text-parchment-500 uppercase tracking-widest font-display mb-1"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            New Ability Unlocked
          </motion.p>

          <motion.h2
            className={`text-2xl font-display ${theme.text} mb-3`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            {abilityName}
          </motion.h2>

          {/* Description */}
          <motion.p
            className="text-sm text-parchment-300 leading-relaxed mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {abilityDescription}
          </motion.p>

          {/* Type badge */}
          <motion.div
            className="flex justify-center mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            <span className={`text-xs px-3 py-1 rounded-full ${theme.bg} ${theme.text} font-display`}>
              {abilityType === 'active' ? 'Active Ability' : 'Passive Ability'}
            </span>
          </motion.div>

          {/* Dismiss button */}
          <motion.button
            onClick={onDismiss}
            className={`w-full py-3 ${theme.buttonBg} text-white font-display text-base rounded-lg transition-colors`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Awesome!
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
