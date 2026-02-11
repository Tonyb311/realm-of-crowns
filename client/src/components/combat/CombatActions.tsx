import { useState } from 'react';
import {
  Swords,
  Shield,
  Sparkles,
  Package,
  Loader2,
  Footprints,
} from 'lucide-react';

export interface CombatSpell {
  id: string;
  name: string;
  mpCost: number;
  description: string;
  type: 'damage' | 'heal' | 'buff' | 'debuff';
}

export interface CombatItem {
  id: string;
  name: string;
  quantity: number;
  type: string;
  description: string;
}

type ActionSubmenu = null | 'spells' | 'items';

interface CombatActionsProps {
  isPlayerTurn: boolean;
  combatType: 'pve' | 'pvp';
  spells: CombatSpell[];
  items: CombatItem[];
  playerMp: number;
  onAction: (action: string, opts?: { spellId?: string; itemId?: string }) => void;
  isPending: boolean;
}

export default function CombatActions({ isPlayerTurn, combatType, spells, items, playerMp, onAction, isPending }: CombatActionsProps) {
  const [submenu, setSubmenu] = useState<ActionSubmenu>(null);

  const disabled = !isPlayerTurn || isPending;

  return (
    <div className="bg-dark-300 border border-dark-50 rounded-lg p-4">
      {!isPlayerTurn && (
        <div className="text-center py-2 mb-3">
          <Loader2 className="w-4 h-4 text-parchment-500 animate-spin mx-auto mb-1" />
          <p className="text-parchment-500 text-xs">Waiting for opponent...</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Attack */}
        <button
          onClick={() => { setSubmenu(null); onAction('attack'); }}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-900/30 border border-red-500/40 text-red-400 font-display text-sm rounded
            hover:bg-red-900/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Swords className="w-4 h-4" />
          Attack
        </button>

        {/* Spells */}
        <div className="relative">
          <button
            onClick={() => setSubmenu(submenu === 'spells' ? null : 'spells')}
            disabled={disabled}
            className={`flex items-center gap-2 px-4 py-2.5 border font-display text-sm rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed
              ${submenu === 'spells'
                ? 'bg-blue-900/30 border-blue-400/50 text-blue-400'
                : 'bg-blue-900/20 border-blue-500/30 text-blue-400 hover:bg-blue-900/40'}`}
          >
            <Sparkles className="w-4 h-4" />
            Spells
          </button>

          {submenu === 'spells' && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-dark-400 border border-dark-50 rounded-lg shadow-xl z-10">
              <div className="p-2 max-h-48 overflow-y-auto">
                {spells.length === 0 ? (
                  <p className="text-parchment-500 text-xs p-2">No spells available.</p>
                ) : (
                  spells.map((spell) => {
                    const canCast = playerMp >= spell.mpCost;
                    return (
                      <button
                        key={spell.id}
                        onClick={() => { onAction('cast_spell', { spellId: spell.id }); setSubmenu(null); }}
                        disabled={!canCast || isPending}
                        className="w-full text-left px-3 py-2 rounded text-xs hover:bg-dark-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <div className="flex justify-between items-baseline">
                          <span className="text-parchment-200 font-semibold">{spell.name}</span>
                          <span className={`${canCast ? 'text-blue-400' : 'text-red-400'}`}>
                            {spell.mpCost} MP
                          </span>
                        </div>
                        <p className="text-parchment-500 mt-0.5">{spell.description}</p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="relative">
          <button
            onClick={() => setSubmenu(submenu === 'items' ? null : 'items')}
            disabled={disabled}
            className={`flex items-center gap-2 px-4 py-2.5 border font-display text-sm rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed
              ${submenu === 'items'
                ? 'bg-green-900/30 border-green-400/50 text-green-400'
                : 'bg-green-900/20 border-green-500/30 text-green-400 hover:bg-green-900/40'}`}
          >
            <Package className="w-4 h-4" />
            Items
          </button>

          {submenu === 'items' && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-dark-400 border border-dark-50 rounded-lg shadow-xl z-10">
              <div className="p-2 max-h-48 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-parchment-500 text-xs p-2">No usable items.</p>
                ) : (
                  items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { onAction('use_item', { itemId: item.id }); setSubmenu(null); }}
                      disabled={isPending}
                      className="w-full text-left px-3 py-2 rounded text-xs hover:bg-dark-300 transition-colors disabled:opacity-40"
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="text-parchment-200 font-semibold">{item.name}</span>
                        <span className="text-parchment-500">x{item.quantity}</span>
                      </div>
                      <p className="text-parchment-500 mt-0.5">{item.description}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Defend */}
        <button
          onClick={() => { setSubmenu(null); onAction('defend'); }}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-400/10 border border-primary-400/30 text-primary-400 font-display text-sm rounded
            hover:bg-primary-400/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Shield className="w-4 h-4" />
          Defend
        </button>

        {/* Flee (PvE only) */}
        {combatType === 'pve' && (
          <button
            onClick={() => { setSubmenu(null); onAction('flee'); }}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2.5 bg-dark-400 border border-parchment-500/30 text-parchment-400 font-display text-sm rounded
              hover:bg-dark-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Footprints className="w-4 h-4" />
            Flee
          </button>
        )}

        {isPending && <Loader2 className="w-5 h-5 text-primary-400 animate-spin self-center ml-2" />}
      </div>
    </div>
  );
}
