import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Clock,
  Flame,
  Droplets,
  Wind,
  Mountain,
  Trees,
  Cog,
  Skull,
  Sparkles,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TransformationOverlayProps {
  transformationName: string;
  remainingSeconds?: number;
  subRace?: string;
  onCancel?: () => void;
  /** true if the player can voluntarily dismiss this transformation */
  canDismiss?: boolean;
}

// ---------------------------------------------------------------------------
// Theme by transformation type
// ---------------------------------------------------------------------------
interface TransformTheme {
  borderColor: string;
  glowColor: string;
  bgGradient: string;
  icon: typeof Flame;
  label: string;
  animateStyle: 'pulse' | 'spin' | 'wave' | 'flicker';
}

function getTransformTheme(name: string, subRace?: string): TransformTheme {
  const lower = name.toLowerCase();
  const sub = (subRace ?? '').toLowerCase();

  if (lower.includes('beast form')) {
    return {
      borderColor: 'border-amber-500',
      glowColor: 'shadow-amber-500/30',
      bgGradient: 'from-amber-900/30 to-transparent',
      icon: Skull,
      label: 'Beast Form',
      animateStyle: 'pulse',
    };
  }

  if (lower.includes('guardian form') || lower.includes('treant')) {
    return {
      borderColor: 'border-green-500',
      glowColor: 'shadow-green-500/30',
      bgGradient: 'from-green-900/30 to-transparent',
      icon: Trees,
      label: 'Guardian Form',
      animateStyle: 'wave',
    };
  }

  if (lower.includes('siege mode')) {
    return {
      borderColor: 'border-slate-400',
      glowColor: 'shadow-slate-400/30',
      bgGradient: 'from-slate-800/40 to-transparent',
      icon: Cog,
      label: 'Siege Mode',
      animateStyle: 'spin',
    };
  }

  if (lower.includes('primordial') || lower.includes('awakening')) {
    // Element-specific themes
    if (sub.includes('fire')) {
      return {
        borderColor: 'border-orange-500',
        glowColor: 'shadow-orange-500/40',
        bgGradient: 'from-orange-900/30 to-transparent',
        icon: Flame,
        label: 'Primordial Awakening',
        animateStyle: 'flicker',
      };
    }
    if (sub.includes('water') || sub.includes('tide')) {
      return {
        borderColor: 'border-cyan-500',
        glowColor: 'shadow-cyan-500/30',
        bgGradient: 'from-cyan-900/30 to-transparent',
        icon: Droplets,
        label: 'Primordial Awakening',
        animateStyle: 'wave',
      };
    }
    if (sub.includes('earth') || sub.includes('stone')) {
      return {
        borderColor: 'border-amber-700',
        glowColor: 'shadow-amber-700/30',
        bgGradient: 'from-amber-950/40 to-transparent',
        icon: Mountain,
        label: 'Primordial Awakening',
        animateStyle: 'pulse',
      };
    }
    if (sub.includes('air') || sub.includes('storm')) {
      return {
        borderColor: 'border-sky-400',
        glowColor: 'shadow-sky-400/30',
        bgGradient: 'from-sky-900/30 to-transparent',
        icon: Wind,
        label: 'Primordial Awakening',
        animateStyle: 'wave',
      };
    }
    // Default elemental
    return {
      borderColor: 'border-purple-500',
      glowColor: 'shadow-purple-500/30',
      bgGradient: 'from-purple-900/30 to-transparent',
      icon: Sparkles,
      label: 'Primordial Awakening',
      animateStyle: 'pulse',
    };
  }

  // Drakonid elemental glow
  if (lower.includes('dragon') || lower.includes('breath')) {
    if (sub.includes('fire') || sub.includes('red') || sub.includes('gold') || sub.includes('brass')) {
      return {
        borderColor: 'border-orange-500',
        glowColor: 'shadow-orange-500/40',
        bgGradient: 'from-orange-900/30 to-transparent',
        icon: Flame,
        label: 'Draconic Power',
        animateStyle: 'flicker',
      };
    }
    if (sub.includes('blue') || sub.includes('bronze') || sub.includes('lightning')) {
      return {
        borderColor: 'border-blue-500',
        glowColor: 'shadow-blue-500/40',
        bgGradient: 'from-blue-900/30 to-transparent',
        icon: Sparkles,
        label: 'Draconic Power',
        animateStyle: 'flicker',
      };
    }
    return {
      borderColor: 'border-primary-400',
      glowColor: 'shadow-primary-400/30',
      bgGradient: 'from-primary-400/20 to-transparent',
      icon: Flame,
      label: 'Draconic Power',
      animateStyle: 'flicker',
    };
  }

  // Default
  return {
    borderColor: 'border-primary-400',
    glowColor: 'shadow-primary-400/30',
    bgGradient: 'from-primary-400/20 to-transparent',
    icon: Sparkles,
    label: name,
    animateStyle: 'pulse',
  };
}

// ---------------------------------------------------------------------------
// Animated border effect
// ---------------------------------------------------------------------------
function AnimatedBorder({ style, borderColor }: { style: TransformTheme['animateStyle']; borderColor: string }) {
  const baseClasses = `absolute inset-0 rounded-xl border-2 ${borderColor} pointer-events-none`;

  if (style === 'pulse') {
    return (
      <motion.div
        className={baseClasses}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    );
  }

  if (style === 'flicker') {
    return (
      <motion.div
        className={baseClasses}
        animate={{ opacity: [0.3, 1, 0.5, 0.9, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    );
  }

  if (style === 'wave') {
    return (
      <>
        <motion.div
          className={baseClasses}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={`${baseClasses} border-dashed`}
          animate={{ opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        />
      </>
    );
  }

  // spin
  return (
    <motion.div
      className={baseClasses}
      style={{ borderStyle: 'dashed' }}
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    />
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function TransformationOverlay({
  transformationName,
  remainingSeconds,
  subRace,
  onCancel,
  canDismiss = true,
}: TransformationOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(remainingSeconds ?? 0);
  const theme = getTransformTheme(transformationName, subRace);
  const Icon = theme.icon;

  useEffect(() => {
    if (remainingSeconds != null) setTimeLeft(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed top-16 left-1/2 -translate-x-1/2 z-30"
      >
        <div className={`relative bg-dark-400/95 backdrop-blur-sm rounded-xl shadow-xl ${theme.glowColor} shadow-lg`}>
          {/* Animated border */}
          <AnimatedBorder style={theme.animateStyle} borderColor={theme.borderColor} />

          {/* Background gradient */}
          <div className={`absolute inset-0 bg-gradient-to-r ${theme.bgGradient} rounded-xl pointer-events-none`} />

          {/* Content */}
          <div className="relative flex items-center gap-3 px-4 py-3">
            <motion.div
              animate={
                theme.animateStyle === 'spin'
                  ? { rotate: 360 }
                  : { scale: [1, 1.15, 1] }
              }
              transition={
                theme.animateStyle === 'spin'
                  ? { duration: 4, repeat: Infinity, ease: 'linear' }
                  : { duration: 2, repeat: Infinity }
              }
            >
              <Icon className={`w-5 h-5 ${theme.borderColor.replace('border-', 'text-')}`} />
            </motion.div>

            <div>
              <p className={`text-sm font-display ${theme.borderColor.replace('border-', 'text-')}`}>
                {theme.label}
              </p>
              {timeLeft > 0 && (
                <p className="text-[10px] text-parchment-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {minutes > 0 ? `${minutes}m ` : ''}{seconds}s remaining
                </p>
              )}
            </div>

            {canDismiss && onCancel && (
              <button
                onClick={onCancel}
                className="ml-3 p-1 text-parchment-500 hover:text-parchment-200 transition-colors"
                title="Cancel transformation"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
