import { Trophy, Skull, Footprints } from 'lucide-react';
import { RARITY_TEXT_COLORS } from '../../constants';

export interface LootItem {
  name: string;
  quantity: number;
  rarity: string;
}

export interface CombatResult {
  outcome: 'victory' | 'defeat' | 'fled';
  xpGained?: number;
  goldGained?: number;
  goldLost?: number;
  xpLost?: number;
  loot?: LootItem[];
}

export default function LootPanel({ result, onReturn }: { result: CombatResult; onReturn: () => void }) {
  const isVictory = result.outcome === 'victory';
  const isFled = result.outcome === 'fled';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className={`bg-realm-bg-800 rounded-lg p-8 max-w-md w-full mx-4 border-2 text-center
        ${isVictory ? 'border-realm-gold-500 shadow-lg shadow-realm-gold-400/20' : isFled ? 'border-realm-text-muted/50' : 'border-realm-danger shadow-lg shadow-realm-danger/20'}`}
      >
        {isVictory ? (
          <>
            <Trophy className="w-16 h-16 text-realm-gold-400 mx-auto mb-4" />
            <h2 className="text-3xl font-display text-realm-gold-400 mb-2">VICTORY!</h2>
          </>
        ) : isFled ? (
          <>
            <Footprints className="w-16 h-16 text-realm-text-muted mx-auto mb-4" />
            <h2 className="text-3xl font-display text-realm-text-secondary mb-2">ESCAPED</h2>
          </>
        ) : (
          <>
            <Skull className="w-16 h-16 text-realm-danger mx-auto mb-4" />
            <h2 className="text-3xl font-display text-realm-danger mb-2">DEFEATED</h2>
          </>
        )}

        <div className="mt-6 space-y-3">
          {result.xpGained != null && result.xpGained > 0 && (
            <div className="flex justify-between text-sm bg-realm-bg-900 rounded px-4 py-2">
              <span className="text-realm-text-muted">XP Gained</span>
              <span className="text-realm-success font-display">+{result.xpGained}</span>
            </div>
          )}
          {result.goldGained != null && result.goldGained > 0 && (
            <div className="flex justify-between text-sm bg-realm-bg-900 rounded px-4 py-2">
              <span className="text-realm-text-muted">Gold Earned</span>
              <span className="text-realm-gold-400 font-display">+{result.goldGained}</span>
            </div>
          )}
          {result.xpLost != null && result.xpLost > 0 && (
            <div className="flex justify-between text-sm bg-realm-bg-900 rounded px-4 py-2">
              <span className="text-realm-text-muted">XP Lost</span>
              <span className="text-realm-danger font-display">-{result.xpLost}</span>
            </div>
          )}
          {result.goldLost != null && result.goldLost > 0 && (
            <div className="flex justify-between text-sm bg-realm-bg-900 rounded px-4 py-2">
              <span className="text-realm-text-muted">Gold Lost</span>
              <span className="text-realm-danger font-display">-{result.goldLost}</span>
            </div>
          )}
          {result.loot && result.loot.length > 0 && (
            <div className="bg-realm-bg-900 rounded px-4 py-3">
              <p className="text-[10px] text-realm-text-muted uppercase tracking-wider mb-2">Loot</p>
              <div className="space-y-1">
                {result.loot.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className={RARITY_TEXT_COLORS[item.rarity] ?? 'text-realm-text-primary'}>{item.name}</span>
                    <span className="text-realm-text-muted">x{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onReturn}
          className={`mt-8 w-full py-3 font-display text-base rounded transition-colors
            ${isVictory
              ? 'bg-realm-gold-400 text-realm-bg-900 hover:bg-realm-gold-300'
              : 'bg-realm-bg-700 text-realm-text-secondary border border-realm-text-muted/30 hover:bg-realm-bg-600'}`}
        >
          Return to Town
        </button>
      </div>
    </div>
  );
}
