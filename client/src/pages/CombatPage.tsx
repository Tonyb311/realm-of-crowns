import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Swords,
  Loader2,
  Dices,
  Trophy,
  Skull,
  X,
  AlertCircle,
  Users,
} from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { RealmButton } from '../components/ui/realm-index';
import PlayerSearch from '../components/PlayerSearch';
import CombatLog from '../components/combat/CombatLog';
import type { CombatLogEntry } from '../components/combat/CombatLog';
import CombatantCard from '../components/combat/CombatantCard';
import type { Combatant } from '../components/combat/CombatantCard';
import CombatActions from '../components/combat/CombatActions';
import type { CombatSpell, CombatItem } from '../components/combat/CombatActions';
import LootPanel from '../components/combat/LootPanel';
import type { CombatResult } from '../components/combat/LootPanel';
import InitiativeBar from '../components/combat/CombatHeader';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CombatState {
  sessionId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'finished';
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

type Tab = 'battle' | 'pvp' | 'leaderboard';

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
          ${isCritical ? 'bg-realm-gold-400/20 border-realm-gold-500 shadow-realm-gold-400/30' :
            isMiss ? 'bg-realm-danger/20 border-realm-danger shadow-realm-danger/30' :
            'bg-realm-bg-700 border-realm-text-muted/50'}
        `}>
          <div className="text-center">
            <Dices className={`w-5 h-5 mx-auto mb-1 ${isCritical ? 'text-realm-gold-400' : isMiss ? 'text-realm-danger' : 'text-realm-text-secondary'}`} />
            <span className={`text-3xl font-display ${isCritical ? 'text-realm-gold-400' : isMiss ? 'text-realm-danger' : 'text-realm-text-primary'}`}>
              {roll}
            </span>
          </div>
        </div>
        {isCritical && (
          <p className="text-center mt-2 text-realm-gold-400 font-display text-lg animate-pulse">CRITICAL!</p>
        )}
        {isMiss && (
          <p className="text-center mt-2 text-realm-danger font-display text-lg animate-pulse">MISS!</p>
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
        ${type === 'damage' ? 'text-realm-danger' : 'text-realm-success'}`}
      style={{ top: '30%', right: type === 'damage' ? '20%' : '60%' }}
    >
      {type === 'damage' ? `-${amount}` : `+${amount}`}
    </span>
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
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
        <Swords className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
        <p className="text-realm-text-muted text-sm">No pending challenges.</p>
        <p className="text-realm-text-muted/60 text-xs mt-1">Challenge another player from the town screen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {challenges.map((ch) => (
        <div key={ch.sessionId} className="bg-realm-bg-700 border border-realm-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-display text-realm-text-primary text-sm">{ch.challengerName}</h4>
              <p className="text-realm-text-muted text-[10px]">
                {new Date(ch.createdAt).toLocaleTimeString()}
                {ch.wager != null && ch.wager > 0 && (
                  <span className="ml-2 text-realm-gold-400">Wager: {ch.wager} gold</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onAccept(ch.sessionId)}
                disabled={acceptPending}
                className="px-4 py-1.5 bg-realm-gold-400 text-realm-bg-900 font-display text-xs rounded hover:bg-realm-gold-300 transition-colors disabled:opacity-50"
              >
                Accept
              </button>
              <button
                onClick={() => onDecline(ch.sessionId)}
                disabled={declinePending}
                className="px-4 py-1.5 border border-realm-danger/40 text-realm-danger font-display text-xs rounded hover:bg-realm-danger/20 transition-colors disabled:opacity-50"
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
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-8 text-center">
        <Trophy className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
        <p className="text-realm-text-muted text-sm">No rankings yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-realm-border text-left">
            <th className="px-4 py-3 text-realm-text-muted text-xs font-display w-16">Rank</th>
            <th className="px-4 py-3 text-realm-text-muted text-xs font-display">Name</th>
            <th className="px-4 py-3 text-realm-text-muted text-xs font-display text-center">Wins</th>
            <th className="px-4 py-3 text-realm-text-muted text-xs font-display text-center">Losses</th>
            <th className="px-4 py-3 text-realm-text-muted text-xs font-display text-right">Rating</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-realm-border">
          {entries.map((entry) => (
            <tr key={entry.characterId} className="hover:bg-realm-bg-600/30 transition-colors">
              <td className="px-4 py-3 font-display text-sm">
                {entry.rank <= 3 ? (
                  <span className={`${entry.rank === 1 ? 'text-realm-gold-400' : entry.rank === 2 ? 'text-realm-text-secondary' : 'text-realm-bronze-400'}`}>
                    #{entry.rank}
                  </span>
                ) : (
                  <span className="text-realm-text-muted">#{entry.rank}</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-realm-text-primary font-semibold">{entry.characterName}</td>
              <td className="px-4 py-3 text-sm text-realm-success text-center">{entry.wins}</td>
              <td className="px-4 py-3 text-sm text-realm-danger text-center">{entry.losses}</td>
              <td className="px-4 py-3 text-sm text-realm-gold-400 font-display text-right">{entry.rating}</td>
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
      <div className="bg-realm-bg-800 border border-realm-border rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display text-realm-gold-400">Challenge Player</h3>
          <button onClick={onClose} className="text-realm-text-muted hover:text-realm-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-realm-text-muted text-xs mb-1 block">Search Player</label>
            {targetName ? (
              <div className="flex items-center justify-between px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm">
                <span>{targetName}</span>
                <button
                  onClick={() => { setTargetId(''); setTargetName(''); }}
                  className="text-realm-text-muted hover:text-realm-text-primary"
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
            <label className="text-realm-text-muted text-xs mb-1 block">Wager (optional)</label>
            <input
              type="number"
              value={wager}
              onChange={(e) => setWager(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm placeholder:text-realm-text-muted/50 focus:border-realm-gold-500/50 focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 p-2 bg-realm-danger/20 border border-realm-danger/50 rounded text-realm-danger text-xs flex items-center gap-2">
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-realm-text-muted/30 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onChallenge(targetId, wager ? parseInt(wager, 10) : undefined)}
            disabled={isPending || !targetId.trim()}
            className="flex-1 py-2 bg-realm-gold-400 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  // Socket-based combat state refresh
  // -------------------------------------------------------------------------
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleCombatResult = () => {
      queryClient.invalidateQueries({ queryKey: ['combat'] });
    };

    socket.on('combat:result', handleCombatResult);
    return () => { socket.off('combat:result', handleCombatResult); };
  }, [queryClient]);

  // -------------------------------------------------------------------------
  // PvE Queries & Mutations
  // -------------------------------------------------------------------------
  const { data: pveState, isLoading: pveLoading } = useQuery<CombatState>({
    queryKey: ['combat', 'pve', 'state'],
    queryFn: async () => (await api.get('/combat/pve/state')).data,
    refetchInterval: 5000,
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
    refetchInterval: 5000,
    enabled: activeTab === 'battle',
  });

  const { data: challenges, isLoading: challengesLoading } = useQuery<PvpChallenge[]>({
    queryKey: ['combat', 'pvp', 'challenges'],
    queryFn: async () => (await api.get('/combat/pvp/challenges')).data,
    refetchInterval: 15000,
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
    (pvpState?.status === 'ACTIVE' ? pvpState : null) ??
    (pveState?.status === 'ACTIVE' ? pveState : null) ??
    (pveState?.status === 'COMPLETED' ? pveState : null) ??
    (pvpState?.status === 'COMPLETED' ? pvpState : null) ??
    null;

  const player = activeCombat?.combatants.find((c) => c.type === 'player') ?? null;
  const enemies = activeCombat?.combatants.filter((c) => c.type === 'enemy') ?? [];
  const isPlayerTurn = activeCombat ? activeCombat.currentTurnEntityId === player?.entityId : false;
  const isActive = activeCombat?.status === 'ACTIVE';

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
    <div>
      {/* Dice Roll Overlay */}
      <DiceRollDisplay roll={diceRoll} visible={showDice} onDone={hideDice} />

      {/* Result Screen */}
      {activeCombat?.status === 'COMPLETED' && activeCombat.result && (
        <LootPanel
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
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Swords className="w-8 h-8 text-realm-gold-400" />
              <div>
                <h1 className="text-3xl font-display text-realm-gold-400">Combat</h1>
                <p className="text-realm-text-muted text-sm">
                  {activeCombat?.status === 'ACTIVE'
                    ? `Round ${activeCombat.round} - ${activeCombat.combatType === 'pvp' ? 'PvP' : 'PvE'}`
                    : 'Ready for battle'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activeCombat?.wager != null && activeCombat.wager > 0 && (
                <div className="bg-realm-bg-700 border border-realm-gold-500/30 rounded px-3 py-1.5 text-xs">
                  <span className="text-realm-text-muted">Wager: </span>
                  <span className="text-realm-gold-400 font-display">{activeCombat.wager} gold</span>
                </div>
              )}
              <RealmButton
                variant="ghost"
                size="sm"
                onClick={() => navigate('/town')}
              >
                Back to Town
              </RealmButton>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-realm-border bg-realm-bg-800/30">
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
                    ? 'border-realm-gold-500 text-realm-gold-400'
                    : 'border-transparent text-realm-text-muted hover:text-realm-text-secondary hover:border-realm-text-muted/30'}`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {key === 'pvp' && challenges && challenges.length > 0 && (
                  <span className="w-5 h-5 bg-realm-danger text-realm-text-primary text-[10px] font-bold rounded-full flex items-center justify-center">
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

        {/* TAB: Battle */}
        {activeTab === 'battle' && (
          <div>
            {pveLoading ? (
              <div className="space-y-6">
                <div className="h-12 bg-realm-bg-700 border border-realm-border rounded-lg animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="h-48 bg-realm-bg-700 border border-realm-border rounded-lg animate-pulse" />
                    <div className="h-48 bg-realm-bg-700 border border-realm-border rounded-lg animate-pulse" />
                  </div>
                  <div className="h-64 bg-realm-bg-700 border border-realm-border rounded-lg animate-pulse" />
                </div>
              </div>
            ) : !activeCombat || activeCombat.status === 'finished' ? (
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-12 text-center">
                <Swords className="w-16 h-16 text-realm-text-muted/20 mx-auto mb-4" />
                <h2 className="text-xl font-display text-realm-text-secondary mb-2">No Active Combat</h2>
                <p className="text-realm-text-muted text-sm mb-6">
                  Start a PvE encounter or accept a PvP challenge to begin fighting.
                </p>
                <div className="flex gap-3 justify-center">
                  <RealmButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setActiveTab('pvp')}
                  >
                    View PvP Challenges
                  </RealmButton>
                  <RealmButton
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/town')}
                  >
                    Back to Town
                  </RealmButton>
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
                        <div className="bg-realm-bg-800 border border-realm-border rounded-full w-10 h-10 flex items-center justify-center">
                          <span className="text-realm-text-muted font-display text-xs">VS</span>
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
                      <CombatActions
                        isPlayerTurn={isPlayerTurn}
                        combatType={activeCombat.combatType}
                        spells={activeCombat.availableSpells}
                        items={activeCombat.availableItems}

                        onAction={handleAction}
                        isPending={pveActionMutation.isPending || pvpActionMutation.isPending}
                      />
                    )}

                    {/* Error display */}
                    {(pveActionMutation.isError || pvpActionMutation.isError) && (
                      <div className="p-3 bg-realm-danger/20 border border-realm-danger/50 rounded text-realm-danger text-sm flex items-center gap-2">
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

        {/* TAB: PvP Challenges */}
        {activeTab === 'pvp' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display text-realm-text-primary">PvP Challenges</h2>
              <RealmButton
                variant="primary"
                size="sm"
                onClick={() => setShowChallengeModal(true)}
              >
                Challenge Player
              </RealmButton>
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

        {/* TAB: Leaderboard */}
        {activeTab === 'leaderboard' && (
          <div>
            <h2 className="text-xl font-display text-realm-text-primary mb-6">PvP Rankings</h2>
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
