import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Swords,
  Shield,
  Sparkles,
  Package,
  Loader2,
  Heart,
  Droplets,
  Dices,
  Trophy,
  Skull,
  X,
  Crown,
  ChevronRight,
  AlertCircle,
  Footprints,
  Users,
  Scroll,
} from 'lucide-react';
import api from '../services/api';
import { SkeletonCard } from '../components/ui/LoadingSkeleton';
import PlayerSearch from '../components/PlayerSearch';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Combatant {
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

interface StatusEffect {
  id: string;
  name: string;
  icon?: string;
  duration: number;
}

interface CombatLogEntry {
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

interface CombatSpell {
  id: string;
  name: string;
  mpCost: number;
  description: string;
  type: 'damage' | 'heal' | 'buff' | 'debuff';
}

interface CombatItem {
  id: string;
  name: string;
  quantity: number;
  type: string;
  description: string;
}

interface LootItem {
  name: string;
  quantity: number;
  rarity: string;
}

interface CombatResult {
  outcome: 'victory' | 'defeat' | 'fled';
  xpGained?: number;
  goldGained?: number;
  goldLost?: number;
  xpLost?: number;
  loot?: LootItem[];
}

interface CombatState {
  sessionId: string;
  status: 'active' | 'finished';
  combatType: 'pve' | 'pvp';
  currentTurnEntityId: string;
  round: number;
  combatants: Combatant[];
  log: CombatLogEntry[];
  availableSpells: CombatSpell[];
  availableItems: CombatItem[];
  result?: CombatResult;
  wager?: number;
}

interface PvpChallenge {
  sessionId: string;
  challengerName: string;
  challengerId: string;
  wager?: number;
  createdAt: string;
}

interface LeaderboardEntry {
  rank: number;
  characterId: string;
  characterName: string;
  wins: number;
  losses: number;
  rating: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const RARITY_COLORS: Record<string, string> = {
  POOR: 'text-gray-400',
  COMMON: 'text-parchment-200',
  FINE: 'text-green-400',
  SUPERIOR: 'text-blue-400',
  MASTERWORK: 'text-purple-400',
  LEGENDARY: 'text-amber-400',
};

const LOG_COLORS: Record<string, string> = {
  player: 'text-primary-400',
  enemy: 'text-red-400',
  system: 'text-parchment-500',
};

type Tab = 'battle' | 'pvp' | 'leaderboard';
type ActionSubmenu = null | 'spells' | 'items';

// ---------------------------------------------------------------------------
// Dice Roll Display Component
// ---------------------------------------------------------------------------
function DiceRollDisplay({ roll, visible, onDone }: { roll: number | null; visible: boolean; onDone: () => void }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onDone, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onDone]);

  if (!visible || roll === null) return null;

  const isCritical = roll === 20;
  const isMiss = roll === 1;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="animate-bounce">
        <div className={`
          w-24 h-24 rounded-xl flex items-center justify-center border-4 shadow-2xl
          ${isCritical ? 'bg-primary-400/20 border-primary-400 shadow-primary-400/30' :
            isMiss ? 'bg-red-900/30 border-red-500 shadow-red-500/30' :
            'bg-dark-300 border-parchment-500/50'}
        `}>
          <div className="text-center">
            <Dices className={`w-5 h-5 mx-auto mb-1 ${isCritical ? 'text-primary-400' : isMiss ? 'text-red-400' : 'text-parchment-400'}`} />
            <span className={`text-3xl font-display ${isCritical ? 'text-primary-400' : isMiss ? 'text-red-400' : 'text-parchment-200'}`}>
              {roll}
            </span>
          </div>
        </div>
        {isCritical && (
          <p className="text-center mt-2 text-primary-400 font-display text-lg animate-pulse">CRITICAL!</p>
        )}
        {isMiss && (
          <p className="text-center mt-2 text-red-400 font-display text-lg animate-pulse">MISS!</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Floating Damage Number
// ---------------------------------------------------------------------------
function FloatingDamage({ amount, type, id }: { amount: number; type: 'damage' | 'heal'; id: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <span
      key={id}
      className={`absolute font-display text-2xl font-bold animate-float-up pointer-events-none
        ${type === 'damage' ? 'text-red-400' : 'text-green-400'}`}
      style={{ top: '30%', right: type === 'damage' ? '20%' : '60%' }}
    >
      {type === 'damage' ? `-${amount}` : `+${amount}`}
    </span>
  );
}

// ---------------------------------------------------------------------------
// HP / MP Bar
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Combatant Portrait Card
// ---------------------------------------------------------------------------
function CombatantCard({ combatant, isActive, side }: { combatant: Combatant; isActive: boolean; side: 'left' | 'right' }) {
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

// ---------------------------------------------------------------------------
// Combat Log Panel
// ---------------------------------------------------------------------------
function CombatLog({ entries }: { entries: CombatLogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="bg-dark-300 border border-dark-50 rounded-lg flex flex-col h-full">
      <div className="px-4 py-2 border-b border-dark-50 flex items-center gap-2">
        <Scroll className="w-4 h-4 text-parchment-500" />
        <h3 className="font-display text-xs text-parchment-400 uppercase tracking-wider">Combat Log</h3>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[400px] scrollbar-thin">
        {entries.length === 0 ? (
          <p className="text-parchment-500/50 text-xs text-center py-4">Combat begins...</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="text-xs leading-relaxed">
              <span className={`font-semibold ${LOG_COLORS[entry.actorType] ?? 'text-parchment-500'}`}>
                {entry.actor}
              </span>
              <span className="text-parchment-400"> {entry.message}</span>
              {entry.roll && (
                <span className={`ml-1 ${entry.roll === 20 ? 'text-primary-400 font-bold' : entry.roll === 1 ? 'text-red-400 font-bold' : 'text-parchment-500'}`}>
                  [d20: {entry.roll}]
                </span>
              )}
              {entry.damage && (
                <span className="text-red-400 ml-1">-{entry.damage} HP</span>
              )}
              {entry.healing && (
                <span className="text-green-400 ml-1">+{entry.healing} HP</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Initiative Order Bar
// ---------------------------------------------------------------------------
function InitiativeBar({ combatants, currentTurnId }: { combatants: Combatant[]; currentTurnId: string }) {
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

// ---------------------------------------------------------------------------
// Action Menu
// ---------------------------------------------------------------------------
interface ActionMenuProps {
  isPlayerTurn: boolean;
  combatType: 'pve' | 'pvp';
  spells: CombatSpell[];
  items: CombatItem[];
  playerMp: number;
  onAction: (action: string, opts?: { spellId?: string; itemId?: string }) => void;
  isPending: boolean;
}

function ActionMenu({ isPlayerTurn, combatType, spells, items, playerMp, onAction, isPending }: ActionMenuProps) {
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

// ---------------------------------------------------------------------------
// Victory / Defeat Screen
// ---------------------------------------------------------------------------
function CombatResultScreen({ result, onReturn }: { result: CombatResult; onReturn: () => void }) {
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
                    <span className={RARITY_COLORS[item.rarity] ?? 'text-parchment-200'}>{item.name}</span>
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

// ---------------------------------------------------------------------------
// PvP Challenge List
// ---------------------------------------------------------------------------
function PvpChallengePanel({
  challenges,
  isLoading,
  onAccept,
  onDecline,
  acceptPending,
  declinePending,
}: {
  challenges: PvpChallenge[];
  isLoading: boolean;
  onAccept: (sessionId: string) => void;
  onDecline: (sessionId: string) => void;
  acceptPending: boolean;
  declinePending: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-8 text-center">
        <Swords className="w-10 h-10 text-parchment-500/30 mx-auto mb-3" />
        <p className="text-parchment-500 text-sm">No pending challenges.</p>
        <p className="text-parchment-500/60 text-xs mt-1">Challenge another player from the town screen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {challenges.map((ch) => (
        <div key={ch.sessionId} className="bg-dark-300 border border-dark-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-display text-parchment-200 text-sm">{ch.challengerName}</h4>
              <p className="text-parchment-500 text-[10px]">
                {new Date(ch.createdAt).toLocaleTimeString()}
                {ch.wager != null && ch.wager > 0 && (
                  <span className="ml-2 text-primary-400">Wager: {ch.wager} gold</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onAccept(ch.sessionId)}
                disabled={acceptPending}
                className="px-4 py-1.5 bg-primary-400 text-dark-500 font-display text-xs rounded hover:bg-primary-300 transition-colors disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => onDecline(ch.sessionId)}
                disabled={declinePending}
                className="px-4 py-1.5 border border-red-500/40 text-red-400 font-display text-xs rounded hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PvP Leaderboard
// ---------------------------------------------------------------------------
function PvpLeaderboard({ entries, isLoading }: { entries: LeaderboardEntry[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-8 text-center">
        <Trophy className="w-10 h-10 text-parchment-500/30 mx-auto mb-3" />
        <p className="text-parchment-500 text-sm">No rankings yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-dark-300 border border-dark-50 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-50 text-left">
            <th className="px-4 py-3 text-parchment-500 text-xs font-display w-16">Rank</th>
            <th className="px-4 py-3 text-parchment-500 text-xs font-display">Name</th>
            <th className="px-4 py-3 text-parchment-500 text-xs font-display text-center">Wins</th>
            <th className="px-4 py-3 text-parchment-500 text-xs font-display text-center">Losses</th>
            <th className="px-4 py-3 text-parchment-500 text-xs font-display text-right">Rating</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-50">
          {entries.map((entry) => (
            <tr key={entry.characterId} className="hover:bg-dark-200/30 transition-colors">
              <td className="px-4 py-3 font-display text-sm">
                {entry.rank <= 3 ? (
                  <span className={`${entry.rank === 1 ? 'text-primary-400' : entry.rank === 2 ? 'text-parchment-300' : 'text-amber-700'}`}>
                    #{entry.rank}
                  </span>
                ) : (
                  <span className="text-parchment-500">#{entry.rank}</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-parchment-200 font-semibold">{entry.characterName}</td>
              <td className="px-4 py-3 text-sm text-green-400 text-center">{entry.wins}</td>
              <td className="px-4 py-3 text-sm text-red-400 text-center">{entry.losses}</td>
              <td className="px-4 py-3 text-sm text-primary-400 font-display text-right">{entry.rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PvP Challenge Modal
// ---------------------------------------------------------------------------
// MAJ-20: Replaced raw UUID input with PlayerSearch component
function ChallengeModal({
  onClose,
  onChallenge,
  isPending,
  error,
}: {
  onClose: () => void;
  onChallenge: (targetId: string, wager?: number) => void;
  isPending: boolean;
  error?: string;
}) {
  const [targetId, setTargetId] = useState('');
  const [targetName, setTargetName] = useState('');
  const [wager, setWager] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-dark-400 border border-dark-50 rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display text-primary-400">Challenge Player</h3>
          <button onClick={onClose} className="text-parchment-500 hover:text-parchment-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-parchment-500 text-xs mb-1 block">Search Player</label>
            {targetName ? (
              <div className="flex items-center justify-between px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm">
                <span>{targetName}</span>
                <button
                  onClick={() => { setTargetId(''); setTargetName(''); }}
                  className="text-parchment-500 hover:text-parchment-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <PlayerSearch
                placeholder="Search by name..."
                onSelect={(character) => {
                  setTargetId(character.id);
                  setTargetName(character.name);
                }}
              />
            )}
          </div>
          <div>
            <label className="text-parchment-500 text-xs mb-1 block">Wager (optional)</label>
            <input
              type="number"
              value={wager}
              onChange={(e) => setWager(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm placeholder:text-parchment-500/50 focus:border-primary-400/50 focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 p-2 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onChallenge(targetId, wager ? parseInt(wager, 10) : undefined)}
            disabled={isPending || !targetId.trim()}
            className="flex-1 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Sending...' : 'Challenge'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function CombatPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('battle');
  const [diceRoll, setDiceRoll] = useState<number | null>(null);
  const [showDice, setShowDice] = useState(false);
  const [floatingDamages, setFloatingDamages] = useState<{ id: string; amount: number; type: 'damage' | 'heal' }[]>([]);
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  const hideDice = useCallback(() => setShowDice(false), []);

  // -------------------------------------------------------------------------
  // PvE Queries & Mutations
  // -------------------------------------------------------------------------
  const { data: pveState, isLoading: pveLoading } = useQuery<CombatState>({
    queryKey: ['combat', 'pve', 'state'],
    queryFn: async () => (await api.get('/combat/pve/state')).data,
    refetchInterval: 3000,
    enabled: activeTab === 'battle',
  });

  const pveActionMutation = useMutation({
    mutationFn: async (params: { action: string; spellId?: string; itemId?: string }) => {
      return (await api.post('/combat/pve/action', params)).data;
    },
    onSuccess: (data: CombatState) => {
      queryClient.setQueryData(['combat', 'pve', 'state'], data);
      processNewLogEntries(data);
    },
  });

  // -------------------------------------------------------------------------
  // PvP Queries & Mutations
  // -------------------------------------------------------------------------
  const { data: pvpState } = useQuery<CombatState>({
    queryKey: ['combat', 'pvp', 'state'],
    queryFn: async () => (await api.get('/combat/pvp/state')).data,
    refetchInterval: 3000,
    enabled: activeTab === 'battle',
  });

  const { data: challenges, isLoading: challengesLoading } = useQuery<PvpChallenge[]>({
    queryKey: ['combat', 'pvp', 'challenges'],
    queryFn: async () => (await api.get('/combat/pvp/challenges')).data,
    refetchInterval: 10000,
    enabled: activeTab === 'pvp',
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['combat', 'pvp', 'leaderboard'],
    queryFn: async () => (await api.get('/combat/pvp/leaderboard')).data,
    enabled: activeTab === 'leaderboard',
  });

  const pvpActionMutation = useMutation({
    mutationFn: async (params: { action: string; spellId?: string; itemId?: string }) => {
      return (await api.post('/combat/pvp/action', params)).data;
    },
    onSuccess: (data: CombatState) => {
      queryClient.setQueryData(['combat', 'pvp', 'state'], data);
      processNewLogEntries(data);
    },
  });

  const pvpAcceptMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return (await api.post('/combat/pvp/accept', { sessionId })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combat', 'pvp'] });
      setActiveTab('battle');
    },
  });

  const pvpDeclineMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return (await api.post('/combat/pvp/decline', { sessionId })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combat', 'pvp', 'challenges'] });
    },
  });

  const pvpChallengeMutation = useMutation({
    mutationFn: async ({ targetCharacterId, wager }: { targetCharacterId: string; wager?: number }) => {
      return (await api.post('/combat/pvp/challenge', { targetCharacterId, wager })).data;
    },
    onSuccess: () => {
      setShowChallengeModal(false);
      queryClient.invalidateQueries({ queryKey: ['combat', 'pvp', 'challenges'] });
    },
  });

  // -------------------------------------------------------------------------
  // Determine active combat state
  // -------------------------------------------------------------------------
  const activeCombat: CombatState | null =
    (pvpState?.status === 'active' ? pvpState : null) ??
    (pveState?.status === 'active' ? pveState : null) ??
    (pveState?.status === 'finished' ? pveState : null) ??
    (pvpState?.status === 'finished' ? pvpState : null) ??
    null;

  const player = activeCombat?.combatants.find((c) => c.type === 'player') ?? null;
  const enemies = activeCombat?.combatants.filter((c) => c.type === 'enemy') ?? [];
  const isPlayerTurn = activeCombat ? activeCombat.currentTurnEntityId === player?.entityId : false;
  const isActive = activeCombat?.status === 'active';

  // -------------------------------------------------------------------------
  // Show dice roll and floating damage on new log entries
  // -------------------------------------------------------------------------
  const lastLogIdRef = useRef<string>('');

  function processNewLogEntries(state: CombatState) {
    const log = state.log;
    if (log.length === 0) return;

    const lastEntry = log[log.length - 1];
    if (lastEntry.id === lastLogIdRef.current) return;
    lastLogIdRef.current = lastEntry.id;

    if (lastEntry.roll) {
      setDiceRoll(lastEntry.roll);
      setShowDice(true);
    }

    if (lastEntry.damage) {
      setFloatingDamages((prev) => [...prev, { id: lastEntry.id, amount: lastEntry.damage!, type: 'damage' }]);
    }
    if (lastEntry.healing) {
      setFloatingDamages((prev) => [...prev, { id: lastEntry.id + '-heal', amount: lastEntry.healing!, type: 'heal' }]);
    }
  }

  // Process log from polling
  useEffect(() => {
    if (activeCombat) {
      processNewLogEntries(activeCombat);
    }
  }, [activeCombat?.log.length]);

  // Clean up old floating damages
  useEffect(() => {
    if (floatingDamages.length > 0) {
      const timer = setTimeout(() => {
        setFloatingDamages((prev) => prev.slice(1));
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [floatingDamages.length]);

  // -------------------------------------------------------------------------
  // Action handler
  // -------------------------------------------------------------------------
  function handleAction(action: string, opts?: { spellId?: string; itemId?: string }) {
    const params = { action, ...opts };
    if (activeCombat?.combatType === 'pvp') {
      pvpActionMutation.mutate(params);
    } else {
      pveActionMutation.mutate(params);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-dark-500 pt-12">
      {/* Dice Roll Overlay */}
      <DiceRollDisplay roll={diceRoll} visible={showDice} onDone={hideDice} />

      {/* Result Screen */}
      {activeCombat?.status === 'finished' && activeCombat.result && (
        <CombatResultScreen
          result={activeCombat.result}
          onReturn={() => navigate('/town')}
        />
      )}

      {/* Floating damage numbers */}
      <div className="fixed inset-0 pointer-events-none z-30">
        {floatingDamages.map((fd) => (
          <FloatingDamage key={fd.id} amount={fd.amount} type={fd.type} id={fd.id} />
        ))}
      </div>

      {/* Header */}
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Swords className="w-8 h-8 text-primary-400" />
              <div>
                <h1 className="text-3xl font-display text-primary-400">Combat</h1>
                <p className="text-parchment-500 text-sm">
                  {activeCombat?.status === 'active'
                    ? `Round ${activeCombat.round} - ${activeCombat.combatType === 'pvp' ? 'PvP' : 'PvE'}`
                    : 'Ready for battle'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activeCombat?.wager != null && activeCombat.wager > 0 && (
                <div className="bg-dark-300 border border-primary-400/30 rounded px-3 py-1.5 text-xs">
                  <span className="text-parchment-500">Wager: </span>
                  <span className="text-primary-400 font-display">{activeCombat.wager} gold</span>
                </div>
              )}
              <button
                onClick={() => navigate('/town')}
                className="px-5 py-2 border border-parchment-500/40 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Back to Town
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-dark-50 bg-dark-400/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1">
            {([
              { key: 'battle' as Tab, label: 'Battle', icon: Swords },
              { key: 'pvp' as Tab, label: 'PvP Challenges', icon: Users },
              { key: 'leaderboard' as Tab, label: 'Leaderboard', icon: Trophy },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-5 py-3 font-display text-sm border-b-2 transition-colors
                  ${activeTab === key
                    ? 'border-primary-400 text-primary-400'
                    : 'border-transparent text-parchment-500 hover:text-parchment-300 hover:border-parchment-500/30'}`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {key === 'pvp' && challenges && challenges.length > 0 && (
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {challenges.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* ================================================================= */}
        {/* TAB: Battle                                                       */}
        {/* ================================================================= */}
        {activeTab === 'battle' && (
          <div>
            {pveLoading ? (
              <div className="space-y-6">
                <div className="h-12 bg-dark-300 border border-dark-50 rounded-lg animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                  <SkeletonCard className="h-64" />
                </div>
              </div>
            ) : !activeCombat || activeCombat.status === 'finished' ? (
              <div className="bg-dark-300 border border-dark-50 rounded-lg p-12 text-center">
                <Swords className="w-16 h-16 text-parchment-500/20 mx-auto mb-4" />
                <h2 className="text-xl font-display text-parchment-300 mb-2">No Active Combat</h2>
                <p className="text-parchment-500 text-sm mb-6">
                  Start a PvE encounter or accept a PvP challenge to begin fighting.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setActiveTab('pvp')}
                    className="px-6 py-2 border border-primary-400/60 text-primary-400 font-display text-sm rounded hover:bg-dark-300 transition-colors"
                  >
                    View PvP Challenges
                  </button>
                  <button
                    onClick={() => navigate('/town')}
                    className="px-6 py-2 border border-parchment-500/40 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
                  >
                    Back to Town
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Initiative bar */}
                <InitiativeBar
                  combatants={activeCombat.combatants}
                  currentTurnId={activeCombat.currentTurnEntityId}
                />

                {/* Combat arena + log */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Arena (2 cols) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Combatant portraits */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                      {/* Player side */}
                      <div className="space-y-3">
                        {player && (
                          <CombatantCard
                            combatant={player}
                            isActive={activeCombat.currentTurnEntityId === player.entityId}
                            side="left"
                          />
                        )}
                        {activeCombat.combatants
                          .filter((c) => c.type === 'ally')
                          .map((ally) => (
                            <CombatantCard
                              key={ally.entityId}
                              combatant={ally}
                              isActive={activeCombat.currentTurnEntityId === ally.entityId}
                              side="left"
                            />
                          ))}
                      </div>

                      {/* VS divider */}
                      <div className="hidden sm:flex absolute inset-0 items-center justify-center pointer-events-none">
                        <div className="bg-dark-400 border border-dark-50 rounded-full w-10 h-10 flex items-center justify-center">
                          <span className="text-parchment-500 font-display text-xs">VS</span>
                        </div>
                      </div>

                      {/* Enemy side */}
                      <div className="space-y-3">
                        {enemies.map((enemy) => (
                          <CombatantCard
                            key={enemy.entityId}
                            combatant={enemy}
                            isActive={activeCombat.currentTurnEntityId === enemy.entityId}
                            side="right"
                          />
                        ))}
                      </div>
                    </div>

                    {/* Action menu */}
                    {isActive && (
                      <ActionMenu
                        isPlayerTurn={isPlayerTurn}
                        combatType={activeCombat.combatType}
                        spells={activeCombat.availableSpells}
                        items={activeCombat.availableItems}
                        playerMp={player?.mp ?? 0}
                        onAction={handleAction}
                        isPending={pveActionMutation.isPending || pvpActionMutation.isPending}
                      />
                    )}

                    {/* Error display */}
                    {(pveActionMutation.isError || pvpActionMutation.isError) && (
                      <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        Action failed. Please try again.
                      </div>
                    )}
                  </div>

                  {/* Combat Log (1 col) */}
                  <div className="lg:col-span-1">
                    <CombatLog entries={activeCombat.log} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: PvP Challenges                                               */}
        {/* ================================================================= */}
        {activeTab === 'pvp' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display text-parchment-200">PvP Challenges</h2>
              <button
                onClick={() => setShowChallengeModal(true)}
                className="px-5 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors"
              >
                Challenge Player
              </button>
            </div>

            <PvpChallengePanel
              challenges={challenges ?? []}
              isLoading={challengesLoading}
              onAccept={(sessionId) => pvpAcceptMutation.mutate(sessionId)}
              onDecline={(sessionId) => pvpDeclineMutation.mutate(sessionId)}
              acceptPending={pvpAcceptMutation.isPending}
              declinePending={pvpDeclineMutation.isPending}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: Leaderboard                                                  */}
        {/* ================================================================= */}
        {activeTab === 'leaderboard' && (
          <div>
            <h2 className="text-xl font-display text-parchment-200 mb-6">PvP Rankings</h2>
            <PvpLeaderboard
              entries={leaderboard ?? []}
              isLoading={leaderboardLoading}
            />
          </div>
        )}
      </div>

      {/* Challenge Modal */}
      {showChallengeModal && (
        <ChallengeModal
          onClose={() => setShowChallengeModal(false)}
          onChallenge={(targetId, wager) => pvpChallengeMutation.mutate({ targetCharacterId: targetId, wager })}
          isPending={pvpChallengeMutation.isPending}
          error={pvpChallengeMutation.error?.message}
        />
      )}
    </div>
  );
}
