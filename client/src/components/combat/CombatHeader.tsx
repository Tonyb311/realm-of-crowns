import { ChevronRight, Skull, Crown } from 'lucide-react';
import type { Combatant } from './CombatantCard';

export default function InitiativeBar({ combatants, currentTurnId }: { combatants: Combatant[]; currentTurnId: string }) {
  const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);

  return (
    <div className="flex items-center gap-2 bg-dark-300 border border-dark-50 rounded-lg px-4 py-2">
      <span className="text-[10px] text-parchment-500 font-display uppercase tracking-wider mr-2">Initiative</span>
      {sorted.map((c) => {
        const isActive = c.entityId === currentTurnId;
        return (
          <div
            key={c.entityId}
            className={`flex items-center gap-1.5 px-2 py-1 rounded border text-xs transition-all
              ${isActive
                ? 'border-primary-400 bg-primary-400/10 text-primary-400'
                : c.type === 'enemy'
                  ? 'border-red-900/30 text-red-400/70'
                  : 'border-dark-50 text-parchment-400'
              }`}
            title={`${c.name}: Initiative ${c.initiative}`}
          >
            {c.type === 'enemy' ? (
              <Skull className="w-3 h-3" />
            ) : (
              <Crown className="w-3 h-3" />
            )}
            <span className="truncate max-w-[60px]">{c.name}</span>
            {isActive && <ChevronRight className="w-3 h-3 animate-pulse" />}
          </div>
        );
      })}
    </div>
  );
}
