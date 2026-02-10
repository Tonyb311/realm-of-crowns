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
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    label: 'Fed',
    penalties: 'No penalties',
    animate: false,
  },
  HUNGRY: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    label: 'Hungry',
    penalties: '-1 to all physical checks',
    animate: false,
  },
  STARVING: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    label: 'Starving',
    penalties: '-2 all checks, HP loss per tick',
    animate: false,
  },
  INCAPACITATED: {
    color: 'text-red-500',
    bg: 'bg-red-500/15',
    border: 'border-red-500/50',
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
      <p className="text-parchment-400">{config.penalties}</p>
      {daysSinceLastMeal > 0 && (
        <p className="text-parchment-500">
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
