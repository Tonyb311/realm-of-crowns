import { ChevronRight, Skull, Crown } from 'lucide-react';

export interface StatusEffect {
  id: string;
  name: string;
  icon?: string;
  duration: number;
}

export interface Combatant {
  entityId: string;
  name: string;
  type: 'player' | 'enemy' | 'ally';
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  initiative: number;
  statusEffects: StatusEffect[];
  portrait?: string;
  level?: number;
}

function StatBar({ current, max, color, label }: { current: number; max: number; color: 'red' | 'blue'; label: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const gradient = color === 'red'
    ? 'from-red-700 to-red-500'
    : 'from-blue-700 to-blue-500';

  return (
    <div>
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-parchment-500">{label}</span>
        <span className="text-parchment-400">{current}/{max}</span>
      </div>
      <div className="h-3 bg-dark-500 rounded-full overflow-hidden border border-dark-50">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function CombatantCard({ combatant, isActive, side }: { combatant: Combatant; isActive: boolean; side: 'left' | 'right' }) {
  const borderColor = isActive ? 'border-primary-400' : combatant.type === 'enemy' ? 'border-red-900/50' : 'border-dark-50';

  return (
    <div className={`bg-dark-300 border-2 ${borderColor} rounded-lg p-4 transition-all ${isActive ? 'ring-1 ring-primary-400/30' : ''}`}>
      {isActive && (
        <div className="flex items-center gap-1 mb-2">
          <ChevronRight className="w-3 h-3 text-primary-400 animate-pulse" />
          <span className="text-[10px] text-primary-400 font-display uppercase tracking-wider">Current Turn</span>
        </div>
      )}
      <div className={`flex items-center gap-3 ${side === 'right' ? 'flex-row-reverse text-right' : ''}`}>
        <div className={`w-14 h-14 rounded-lg border-2 flex items-center justify-center flex-shrink-0
          ${combatant.type === 'enemy' ? 'border-red-900/50 bg-red-900/10' : 'border-primary-400/30 bg-primary-400/10'}`}
        >
          {combatant.type === 'enemy' ? (
            <Skull className="w-7 h-7 text-red-400" />
          ) : (
            <Crown className="w-7 h-7 text-primary-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-display text-sm truncate ${combatant.type === 'enemy' ? 'text-red-400' : 'text-parchment-200'}`}>
            {combatant.name}
          </h3>
          {combatant.level && (
            <p className="text-[10px] text-parchment-500">Lv. {combatant.level}</p>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <StatBar current={combatant.hp} max={combatant.maxHp} color="red" label="HP" />
        <StatBar current={combatant.mp} max={combatant.maxMp} color="blue" label="MP" />
      </div>

      {combatant.statusEffects.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {combatant.statusEffects.map((effect) => (
            <span
              key={effect.id}
              className="text-[9px] bg-dark-500 border border-dark-50 rounded px-1.5 py-0.5 text-parchment-400"
              title={`${effect.name} (${effect.duration} turns)`}
            >
              {effect.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
