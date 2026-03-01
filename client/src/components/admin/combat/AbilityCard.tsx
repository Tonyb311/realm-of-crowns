import { useState } from 'react';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';

interface AbilityCardProps {
  name: string;
  description: string;
  tier?: number;
  levelRequired?: number;
  cooldown?: number;
  effects?: Record<string, unknown>;
  specialization?: string;
  type?: 'passive' | 'active';
}

const TIER_COLORS: Record<number, string> = {
  1: 'bg-green-500/20 text-green-400',
  2: 'bg-blue-500/20 text-blue-400',
  3: 'bg-purple-500/20 text-purple-400',
  4: 'bg-yellow-500/20 text-yellow-400',
  5: 'bg-red-500/20 text-red-400',
};

export default function AbilityCard({
  name,
  description,
  tier,
  levelRequired,
  cooldown,
  effects,
  specialization,
  type,
}: AbilityCardProps) {
  const [expanded, setExpanded] = useState(false);

  const tierClass = tier ? TIER_COLORS[tier] ?? 'bg-realm-bg-600 text-realm-text-muted' : null;
  const effectType = effects?.type as string | undefined;
  const derivedType = type ?? (effectType === 'passive' ? 'passive' : effectType === 'active' ? 'active' : undefined);

  return (
    <div
      className="bg-realm-bg-800/50 border border-realm-border/50 rounded px-3 py-2 cursor-pointer hover:border-realm-border transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Collapsed header */}
      <div className="flex items-center gap-2 flex-wrap">
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-realm-text-muted flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-realm-text-muted flex-shrink-0" />
        )}
        <span className="text-sm text-realm-text-primary font-display">{name}</span>

        {/* Badges */}
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {tier != null && tierClass && (
            <span className={`${tierClass} px-2 py-0.5 rounded text-xs font-display`}>T{tier}</span>
          )}
          {levelRequired != null && (
            <span className="bg-realm-bg-600 text-realm-text-secondary px-2 py-0.5 rounded text-xs font-display">
              Lv {levelRequired}
            </span>
          )}
          {derivedType && (
            <span
              className={`px-2 py-0.5 rounded text-xs font-display ${
                derivedType === 'passive'
                  ? 'bg-teal-500/20 text-teal-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {derivedType}
            </span>
          )}
          {effectType && effectType !== 'passive' && effectType !== 'active' && (
            <span className="bg-realm-purple/20 text-realm-purple px-2 py-0.5 rounded text-xs font-display">
              {effectType}
            </span>
          )}
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="mt-2 ml-5 space-y-1.5">
          <p className="text-xs text-realm-text-secondary leading-relaxed">{description}</p>

          {specialization && (
            <div className="text-xs text-realm-text-muted">
              Specialization: <span className="text-realm-text-secondary">{specialization}</span>
            </div>
          )}

          {cooldown != null && cooldown > 0 && (
            <div className="flex items-center gap-1 text-xs text-realm-text-muted">
              <Clock className="w-3 h-3" />
              <span>{cooldown} round{cooldown !== 1 ? 's' : ''} cooldown</span>
            </div>
          )}

          {effects && Object.keys(effects).length > 0 && (
            <div className="text-xs">
              <span className="text-realm-text-muted">Effects: </span>
              <span className="text-realm-text-secondary">
                {Object.entries(effects)
                  .filter(([k]) => k !== 'type')
                  .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                  .join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
