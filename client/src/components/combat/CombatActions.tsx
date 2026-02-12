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

  onAction: (action: string, opts?: { spellId?: string; itemId?: string }) => void;
  isPending: boolean;
}

export default function CombatActions({ isPlayerTurn, combatType, spells, items, onAction, isPending }: CombatActionsProps) {
  const [submenu, setSubmenu] = useState<ActionSubmenu>(null);

  const disabled = !isPlayerTurn || isPending;

  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
      {!isPlayerTurn && (
        <div className="text-center py-2 mb-3">
          <Loader2 className="w-4 h-4 text-realm-text-muted animate-spin mx-auto mb-1" />
          <p className="text-realm-text-muted text-xs">Waiting for opponent...</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* Attack */}
        <button
          onClick={() => { setSubmenu(null); onAction('attack'); }}
          disabled={disabled}
          className="flex items-center gap-2 px-4 py-2.5 bg-realm-danger/20 border border-realm-danger/40 text-realm-danger font-display text-sm rounded
            hover:bg-realm-danger/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                ? 'bg-realm-teal-400/20 border-realm-teal-300/50 text-realm-teal-300'
                : 'bg-realm-teal-400/10 border-realm-teal-300/30 text-realm-teal-300 hover:bg-realm-teal-400/30'}`}
          >
            <Sparkles className="w-4 h-4" />
            Spells
          </button>

          {submenu === 'spells' && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-realm-bg-800 border border-realm-border rounded-lg shadow-xl z-10">
              <div className="p-2 max-h-48 overflow-y-auto">
                {spells.length === 0 ? (
                  <p className="text-realm-text-muted text-xs p-2">No spells available.</p>
                ) : (
                  spells.map((spell) => (
                      <button
                        key={spell.id}
                        onClick={() => { onAction('cast_spell', { spellId: spell.id }); setSubmenu(null); }}
                        disabled={isPending}
                        className="w-full text-left px-3 py-2 rounded text-xs hover:bg-realm-bg-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <span className="text-realm-text-primary font-semibold">{spell.name}</span>
                        <p className="text-realm-text-muted mt-0.5">{spell.description}</p>
                      </button>
                    ))
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
                ? 'bg-realm-success/20 border-realm-success/50 text-realm-success'
                : 'bg-realm-success/10 border-realm-success/30 text-realm-success hover:bg-realm-success/30'}`}
          >
            <Package className="w-4 h-4" />
            Items
          </button>

          {submenu === 'items' && (
            <div className="absolute bottom-full left-0 mb-2 w-56 bg-realm-bg-800 border border-realm-border rounded-lg shadow-xl z-10">
              <div className="p-2 max-h-48 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-realm-text-muted text-xs p-2">No usable items.</p>
                ) : (
                  items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { onAction('use_item', { itemId: item.id }); setSubmenu(null); }}
                      disabled={isPending}
                      className="w-full text-left px-3 py-2 rounded text-xs hover:bg-realm-bg-700 transition-colors disabled:opacity-40"
                    >
                      <div className="flex justify-between items-baseline">
                        <span className="text-realm-text-primary font-semibold">{item.name}</span>
                        <span className="text-realm-text-muted">x{item.quantity}</span>
                      </div>
                      <p className="text-realm-text-muted mt-0.5">{item.description}</p>
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
          className="flex items-center gap-2 px-4 py-2.5 bg-realm-gold-400/10 border border-realm-gold-500/30 text-realm-gold-400 font-display text-sm rounded
            hover:bg-realm-gold-400/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Shield className="w-4 h-4" />
          Defend
        </button>

        {/* Flee (PvE only) */}
        {combatType === 'pve' && (
          <button
            onClick={() => { setSubmenu(null); onAction('flee'); }}
            disabled={disabled}
            className="flex items-center gap-2 px-4 py-2.5 bg-realm-bg-800 border border-realm-text-muted/30 text-realm-text-secondary font-display text-sm rounded
              hover:bg-realm-bg-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Footprints className="w-4 h-4" />
            Flee
          </button>
        )}

        {isPending && <Loader2 className="w-5 h-5 text-realm-gold-400 animate-spin self-center ml-2" />}
      </div>
    </div>
  );
}
