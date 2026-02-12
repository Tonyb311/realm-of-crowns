import { Apple, AlertTriangle } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HungerState = 'FED' | 'HUNGRY' | 'STARVING' | 'INCAPACITATED';

interface HungerStatusIndicatorProps {
  hungerState: HungerState;
  daysSinceLastMeal?: number;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HUNGER_CONFIG: Record<HungerState, {
  color: string;
  bg: string;
  border: string;
  label: string;
  penalties: string;
  animate: boolean;
}> = {
  FED: {
    color: 'text-realm-success',
    bg: 'bg-realm-success/10',
    border: 'border-realm-success/30',
    label: 'Fed',
    penalties: 'No penalties',
    animate: false,
  },
  HUNGRY: {
    color: 'text-realm-gold-400',
    bg: 'bg-realm-gold-500/10',
    border: 'border-realm-gold-500/30',
    label: 'Hungry',
    penalties: '-1 to all physical checks',
    animate: false,
  },
  STARVING: {
    color: 'text-realm-danger',
    bg: 'bg-realm-danger/10',
    border: 'border-realm-danger/30',
    label: 'Starving',
    penalties: '-2 all checks, HP loss per tick',
    animate: false,
  },
  INCAPACITATED: {
    color: 'text-realm-danger',
    bg: 'bg-realm-danger/15',
    border: 'border-realm-danger/50',
    label: 'Incapacitated',
    penalties: 'Cannot perform actions',
    animate: true,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HungerStatusIndicator({
  hungerState,
  daysSinceLastMeal = 0,
}: HungerStatusIndicatorProps) {
  const config = HUNGER_CONFIG[hungerState] ?? HUNGER_CONFIG.FED;

  const tooltipContent = (
    <div className="space-y-1">
      <p className="font-display">{config.label}</p>
      <p className="text-realm-text-secondary">{config.penalties}</p>
      {daysSinceLastMeal > 0 && (
        <p className="text-realm-text-muted">
          {daysSinceLastMeal} day{daysSinceLastMeal !== 1 ? 's' : ''} since last meal
        </p>
      )}
    </div>
  );

  const Icon = hungerState === 'INCAPACITATED' ? AlertTriangle : Apple;

  return (
    <Tooltip content={tooltipContent} position="bottom">
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${config.bg} ${config.border} ${config.animate ? 'animate-pulse' : ''}`}
      >
        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
        <span className={`text-[10px] font-display ${config.color}`}>
          {config.label}
        </span>
      </div>
    </Tooltip>
  );
}
