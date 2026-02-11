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
      <div className={`bg-dark-400 rounded-lg p-8 max-w-md w-full mx-4 border-2 text-center
        ${isVictory ? 'border-primary-400 shadow-lg shadow-primary-400/20' : isFled ? 'border-parchment-500/50' : 'border-red-500 shadow-lg shadow-red-500/20'}`}
      >
        {isVictory ? (
          <>
            <Trophy className="w-16 h-16 text-primary-400 mx-auto mb-4" />
            <h2 className="text-3xl font-display text-primary-400 mb-2">VICTORY!</h2>
          </>
        ) : isFled ? (
          <>
            <Footprints className="w-16 h-16 text-parchment-500 mx-auto mb-4" />
            <h2 className="text-3xl font-display text-parchment-400 mb-2">ESCAPED</h2>
          </>
        ) : (
          <>
            <Skull className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-3xl font-display text-red-400 mb-2">DEFEATED</h2>
          </>
        )}

        <div className="mt-6 space-y-3">
          {result.xpGained != null && result.xpGained > 0 && (
            <div className="flex justify-between text-sm bg-dark-500 rounded px-4 py-2">
              <span className="text-parchment-500">XP Gained</span>
              <span className="text-green-400 font-display">+{result.xpGained}</span>
            </div>
          )}
          {result.goldGained != null && result.goldGained > 0 && (
            <div className="flex justify-between text-sm bg-dark-500 rounded px-4 py-2">
              <span className="text-parchment-500">Gold Earned</span>
              <span className="text-primary-400 font-display">+{result.goldGained}</span>
            </div>
          )}
          {result.xpLost != null && result.xpLost > 0 && (
            <div className="flex justify-between text-sm bg-dark-500 rounded px-4 py-2">
              <span className="text-parchment-500">XP Lost</span>
              <span className="text-red-400 font-display">-{result.xpLost}</span>
            </div>
          )}
          {result.goldLost != null && result.goldLost > 0 && (
            <div className="flex justify-between text-sm bg-dark-500 rounded px-4 py-2">
              <span className="text-parchment-500">Gold Lost</span>
              <span className="text-red-400 font-display">-{result.goldLost}</span>
            </div>
          )}
          {result.loot && result.loot.length > 0 && (
            <div className="bg-dark-500 rounded px-4 py-3">
              <p className="text-[10px] text-parchment-500 uppercase tracking-wider mb-2">Loot</p>
              <div className="space-y-1">
                {result.loot.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className={RARITY_TEXT_COLORS[item.rarity] ?? 'text-parchment-200'}>{item.name}</span>
                    <span className="text-parchment-500">x{item.quantity}</span>
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
              ? 'bg-primary-400 text-dark-500 hover:bg-primary-300'
              : 'bg-dark-300 text-parchment-300 border border-parchment-500/30 hover:bg-dark-200'}`}
        >
          Return to Town
        </button>
      </div>
    </div>
  );
}
