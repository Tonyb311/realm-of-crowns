import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Handshake,
  Swords,
  ScrollText,
  AlertTriangle,
  Loader2,
  X,
  Shield,
  Send,
  Check,
  Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { TOAST_STYLE } from '../../constants';
import ChangelingDiplomatBadge from './ChangelingDiplomatBadge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Treaty {
  id: string;
  type: string;
  party1KingdomId: string;
  party1Name: string;
  party2KingdomId: string;
  party2Name: string;
  status: string;
  intermediaryId?: string;
  createdAt: string;
}

interface TreatyProposal {
  id: string;
  senderKingdomId: string;
  senderName: string;
  receiverKingdomId: string;
  receiverName: string;
  type: string;
  status: string;
  intermediaryId?: string;
  createdAt: string;
}

interface War {
  id: string;
  attackerKingdomId: string;
  attackerName: string;
  defenderKingdomId: string;
  defenderName: string;
  attackerScore: number;
  defenderScore: number;
  status: string;
  reason: string;
  startedAt: string;
}

interface Kingdom {
  id: string;
  name: string;
  raceName: string;
}

interface RulerDiplomacyPanelProps {
  kingdomId: string;
  kingdoms: Kingdom[];
}

const TREATY_TYPES = ['NON_AGGRESSION', 'TRADE', 'ALLIANCE', 'MUTUAL_DEFENSE'] as const;

function formatTreatyType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function RulerDiplomacyPanel({ kingdomId, kingdoms }: RulerDiplomacyPanelProps) {
  const queryClient = useQueryClient();

  // Propose treaty form state
  const [showProposeForm, setShowProposeForm] = useState(false);
  const [receiverKingdomId, setReceiverKingdomId] = useState('');
  const [treatyType, setTreatyType] = useState<string>(TREATY_TYPES[0]);
  const [intermediaryId, setIntermediaryId] = useState('');
  const [useIntermediary, setUseIntermediary] = useState(false);

  // Declare war state
  const [showWarConfirm, setShowWarConfirm] = useState(false);
  const [warTargetId, setWarTargetId] = useState('');
  const [warReason, setWarReason] = useState('');

  // Break treaty state
  const [breakTreatyId, setBreakTreatyId] = useState<string | null>(null);

  // ---- Queries ----
  const { data: treaties, isLoading: loadingTreaties } = useQuery<Treaty[]>({
    queryKey: ['diplomacy', 'treaties'],
    queryFn: async () => {
      const res = await api.get('/diplomacy/treaties');
      return res.data;
    },
  });

  const { data: wars, isLoading: loadingWars } = useQuery<War[]>({
    queryKey: ['diplomacy', 'wars'],
    queryFn: async () => {
      const res = await api.get('/diplomacy/wars');
      return res.data;
    },
  });

  const { data: proposals } = useQuery<TreatyProposal[]>({
    queryKey: ['diplomacy', 'proposals', kingdomId],
    queryFn: async () => {
      // Proposals come from the treaties endpoint with status PENDING
      const res = await api.get('/diplomacy/treaties');
      const all: TreatyProposal[] = res.data;
      return all.filter((t: TreatyProposal) => t.status === 'PENDING');
    },
  });

  // ---- Mutations ----
  const proposeTreaty = useMutation({
    mutationFn: async () => {
      const body: Record<string, string> = { receiverKingdomId, type: treatyType };
      if (useIntermediary && intermediaryId) body.intermediaryId = intermediaryId;
      return api.post('/diplomacy/propose-treaty', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diplomacy'] });
      toast.success('Treaty proposal sent!', { style: TOAST_STYLE });
      setShowProposeForm(false);
      setReceiverKingdomId('');
      setTreatyType(TREATY_TYPES[0]);
      setIntermediaryId('');
      setUseIntermediary(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to propose treaty', { style: TOAST_STYLE });
    },
  });

  const respondTreaty = useMutation({
    mutationFn: async ({ proposalId, accept }: { proposalId: string; accept: boolean }) => {
      return api.post(`/diplomacy/respond-treaty/${proposalId}`, { accept });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['diplomacy'] });
      toast.success(vars.accept ? 'Treaty accepted!' : 'Treaty rejected.', { style: TOAST_STYLE });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to respond', { style: TOAST_STYLE });
    },
  });

  const breakTreaty = useMutation({
    mutationFn: async (treatyId: string) => {
      return api.post(`/diplomacy/break-treaty/${treatyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diplomacy'] });
      toast.success('Treaty broken.', { style: TOAST_STYLE });
      setBreakTreatyId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to break treaty', { style: TOAST_STYLE });
    },
  });

  const declareWar = useMutation({
    mutationFn: async () => {
      return api.post('/diplomacy/declare-war', { defenderKingdomId: warTargetId, reason: warReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diplomacy'] });
      toast.success('War declared!', {
        style: { ...TOAST_STYLE, border: '1px solid #ef4444', color: '#fca5a5' },
      });
      setShowWarConfirm(false);
      setWarTargetId('');
      setWarReason('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to declare war', { style: TOAST_STYLE });
    },
  });

  const negotiatePeace = useMutation({
    mutationFn: async (warId: string) => {
      return api.post(`/diplomacy/wars/${warId}/negotiate-peace`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diplomacy'] });
      toast.success('Peace negotiations initiated.', { style: TOAST_STYLE });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to negotiate peace', { style: TOAST_STYLE });
    },
  });

  const otherKingdoms = kingdoms.filter(k => k.id !== kingdomId);
  const myTreaties = (treaties ?? []).filter(
    t => t.status === 'ACTIVE' && (t.party1KingdomId === kingdomId || t.party2KingdomId === kingdomId)
  );
  const myWars = (wars ?? []).filter(
    w => w.status === 'ACTIVE' && (w.attackerKingdomId === kingdomId || w.defenderKingdomId === kingdomId)
  );
  const pendingForMe = (proposals ?? []).filter(p => p.receiverKingdomId === kingdomId);

  return (
    <div className="space-y-4">
      <h3 className="font-display text-primary-400 text-lg flex items-center gap-2">
        <Shield className="w-5 h-5" />
        Royal Diplomacy
      </h3>

      {/* Pending proposals */}
      {pendingForMe.length > 0 && (
        <section className="bg-dark-400 border border-amber-400/30 rounded-lg p-3">
          <h4 className="font-display text-amber-400 text-sm mb-2 flex items-center gap-1.5">
            <ScrollText className="w-3.5 h-3.5" />
            Pending Proposals ({pendingForMe.length})
          </h4>
          <div className="space-y-2">
            {pendingForMe.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-dark-500 rounded p-2">
                <div>
                  <span className="text-parchment-300 text-xs">
                    <span className="text-primary-400 font-display">{p.senderName}</span>
                    {' proposes '}
                    <span className="text-parchment-200">{formatTreatyType(p.type)}</span>
                  </span>
                  {p.intermediaryId && <ChangelingDiplomatBadge className="ml-2" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => respondTreaty.mutate({ proposalId: p.id, accept: true })}
                    disabled={respondTreaty.isPending}
                    className="p-1 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => respondTreaty.mutate({ proposalId: p.id, accept: false })}
                    disabled={respondTreaty.isPending}
                    className="p-1 rounded bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active treaties */}
      <section className="bg-dark-400 border border-dark-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-display text-parchment-300 text-sm flex items-center gap-1.5">
            <Handshake className="w-3.5 h-3.5 text-emerald-400" />
            Active Treaties
          </h4>
          <button
            onClick={() => setShowProposeForm(true)}
            className="text-[10px] px-2 py-1 rounded bg-primary-400/10 text-primary-400 border border-primary-400/30 hover:bg-primary-400/20 transition-colors font-display"
          >
            Propose Treaty
          </button>
        </div>

        {loadingTreaties ? (
          <Loader2 className="w-4 h-4 text-primary-400 animate-spin mx-auto my-4" />
        ) : myTreaties.length === 0 ? (
          <p className="text-parchment-500 text-xs py-2">No active treaties.</p>
        ) : (
          <div className="space-y-1.5">
            {myTreaties.map(t => {
              const partner = t.party1KingdomId === kingdomId ? t.party2Name : t.party1Name;
              return (
                <div key={t.id} className="flex items-center justify-between bg-dark-500 rounded p-2">
                  <div className="text-xs text-parchment-300">
                    <span className="text-emerald-400 font-display">{formatTreatyType(t.type)}</span>
                    {' with '}
                    <span className="text-parchment-200">{partner}</span>
                    {t.intermediaryId && <ChangelingDiplomatBadge className="ml-2" />}
                  </div>
                  <button
                    onClick={() => setBreakTreatyId(t.id)}
                    className="text-[10px] px-1.5 py-0.5 rounded text-red-400 hover:bg-red-500/15 transition-colors"
                  >
                    Break
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Active wars */}
      <section className="bg-dark-400 border border-dark-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-display text-parchment-300 text-sm flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-red-400" />
            Active Wars
          </h4>
          <button
            onClick={() => setShowWarConfirm(true)}
            className="text-[10px] px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-400/30 hover:bg-red-500/20 transition-colors font-display"
          >
            Declare War
          </button>
        </div>

        {loadingWars ? (
          <Loader2 className="w-4 h-4 text-primary-400 animate-spin mx-auto my-4" />
        ) : myWars.length === 0 ? (
          <p className="text-parchment-500 text-xs py-2">No active wars.</p>
        ) : (
          <div className="space-y-1.5">
            {myWars.map(w => {
              const isAttacker = w.attackerKingdomId === kingdomId;
              const enemy = isAttacker ? w.defenderName : w.attackerName;
              const myScore = isAttacker ? w.attackerScore : w.defenderScore;
              const theirScore = isAttacker ? w.defenderScore : w.attackerScore;
              return (
                <div key={w.id} className="bg-dark-500 rounded p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-parchment-300">
                      War vs <span className="text-red-400 font-display">{enemy}</span>
                    </span>
                    <button
                      onClick={() => negotiatePeace.mutate(w.id)}
                      disabled={negotiatePeace.isPending}
                      className="text-[10px] px-1.5 py-0.5 rounded text-sky-400 hover:bg-sky-500/15 transition-colors font-display"
                    >
                      Negotiate Peace
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-dark-400 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.max(5, (myScore / Math.max(1, myScore + theirScore)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-parchment-500">{myScore} - {theirScore}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Propose Treaty Modal */}
      <AnimatePresence>
        {showProposeForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setShowProposeForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-dark-400 border border-dark-50 rounded-lg p-5 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-primary-400">Propose Treaty</h3>
                <button onClick={() => setShowProposeForm(false)} className="text-parchment-500 hover:text-parchment-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-parchment-500 text-xs font-display block mb-1">Receiver Kingdom</label>
                  <select
                    value={receiverKingdomId}
                    onChange={e => setReceiverKingdomId(e.target.value)}
                    className="w-full bg-dark-500 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400/50 outline-none"
                  >
                    <option value="">Select a kingdom...</option>
                    {otherKingdoms.map(k => (
                      <option key={k.id} value={k.id}>{k.name} ({k.raceName})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-parchment-500 text-xs font-display block mb-1">Treaty Type</label>
                  <select
                    value={treatyType}
                    onChange={e => setTreatyType(e.target.value)}
                    className="w-full bg-dark-500 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400/50 outline-none"
                  >
                    {TREATY_TYPES.map(t => (
                      <option key={t} value={t}>{formatTreatyType(t)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useIntermediary}
                      onChange={e => setUseIntermediary(e.target.checked)}
                      className="rounded border-dark-50 bg-dark-500 text-primary-400"
                    />
                    <span className="text-parchment-300 text-xs">Use Changeling Intermediary</span>
                  </label>
                  {useIntermediary && (
                    <div className="mt-2">
                      <ChangelingDiplomatBadge className="mb-2" />
                      <input
                        type="text"
                        value={intermediaryId}
                        onChange={e => setIntermediaryId(e.target.value)}
                        placeholder="Changeling character ID"
                        className="w-full bg-dark-500 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-primary-400/50 outline-none"
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => proposeTreaty.mutate()}
                  disabled={!receiverKingdomId || proposeTreaty.isPending}
                  className="w-full py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {proposeTreaty.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send Proposal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Declare War Confirmation */}
      <AnimatePresence>
        {showWarConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setShowWarConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-dark-400 border border-red-500/30 rounded-lg p-5 w-full max-w-md"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="font-display text-red-400">Declare War</h3>
              </div>
              <p className="text-parchment-500 text-xs mb-4">
                This action cannot be undone easily. Declaring war will affect relations with all allied kingdoms.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-parchment-500 text-xs font-display block mb-1">Target Kingdom</label>
                  <select
                    value={warTargetId}
                    onChange={e => setWarTargetId(e.target.value)}
                    className="w-full bg-dark-500 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-red-400/50 outline-none"
                  >
                    <option value="">Select a kingdom...</option>
                    {otherKingdoms.map(k => (
                      <option key={k.id} value={k.id}>{k.name} ({k.raceName})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-parchment-500 text-xs font-display block mb-1">Reason (Casus Belli)</label>
                  <textarea
                    value={warReason}
                    onChange={e => setWarReason(e.target.value)}
                    placeholder="State your reason for war..."
                    rows={3}
                    className="w-full bg-dark-500 border border-dark-50 rounded px-3 py-2 text-parchment-300 text-sm focus:border-red-400/50 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowWarConfirm(false)}
                    className="flex-1 py-2 bg-dark-500 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors border border-dark-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => declareWar.mutate()}
                    disabled={!warTargetId || !warReason.trim() || declareWar.isPending}
                    className="flex-1 py-2 bg-red-600 text-white font-display text-sm rounded hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {declareWar.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Swords className="w-4 h-4" />
                    )}
                    Declare War
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Break Treaty Confirmation */}
      <AnimatePresence>
        {breakTreatyId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            onClick={() => setBreakTreatyId(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-dark-400 border border-amber-400/30 rounded-lg p-5 w-full max-w-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-display text-amber-400 text-sm">Break Treaty?</h3>
              </div>
              <p className="text-parchment-500 text-xs mb-4">
                Breaking a treaty will damage your relations and reputation. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setBreakTreatyId(null)}
                  className="flex-1 py-2 bg-dark-500 text-parchment-300 font-display text-xs rounded hover:bg-dark-300 transition-colors border border-dark-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => breakTreaty.mutate(breakTreatyId)}
                  disabled={breakTreaty.isPending}
                  className="flex-1 py-2 bg-amber-600 text-white font-display text-xs rounded hover:bg-amber-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {breakTreaty.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Break Treaty
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
