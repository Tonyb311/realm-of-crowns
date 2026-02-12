import { useEffect, useRef } from 'react';
import { Scroll } from 'lucide-react';

export interface CombatLogEntry {
  id: string;
  actor: string;
  actorType: 'player' | 'enemy' | 'system';
  action: string;
  roll?: number;
  damage?: number;
  healing?: number;
  message: string;
  timestamp: string;
}

const LOG_COLORS: Record<string, string> = {
  player: 'text-realm-gold-400',
  enemy: 'text-realm-danger',
  system: 'text-realm-text-muted',
};

export default function CombatLog({ entries }: { entries: CombatLogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg flex flex-col h-full">
      <div className="px-4 py-2 border-b border-realm-border flex items-center gap-2">
        <Scroll className="w-4 h-4 text-realm-text-muted" />
        <h3 className="font-display text-xs text-realm-text-secondary uppercase tracking-wider">Combat Log</h3>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[400px] scrollbar-thin">
        {entries.length === 0 ? (
          <p className="text-realm-text-muted/50 text-xs text-center py-4">Combat begins...</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="text-xs leading-relaxed">
              <span className={`font-semibold ${LOG_COLORS[entry.actorType] ?? 'text-realm-text-muted'}`}>
                {entry.actor}
              </span>
              <span className="text-realm-text-secondary"> {entry.message}</span>
              {entry.roll && (
                <span className={`ml-1 ${entry.roll === 20 ? 'text-realm-gold-400 font-bold' : entry.roll === 1 ? 'text-realm-danger font-bold' : 'text-realm-text-muted'}`}>
                  [d20: {entry.roll}]
                </span>
              )}
              {entry.damage && (
                <span className="text-realm-danger ml-1">-{entry.damage} HP</span>
              )}
              {entry.healing && (
                <span className="text-realm-success ml-1">+{entry.healing} HP</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
