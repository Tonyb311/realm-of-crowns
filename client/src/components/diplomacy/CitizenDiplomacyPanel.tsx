import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  ScrollText,
  Handshake,
  Swords,
  Loader2,
  PenLine,
  Check,
  History,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { TOAST_STYLE } from '../../constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type RelationStatus = 'ALLIED' | 'FRIENDLY' | 'NEUTRAL' | 'DISTRUSTFUL' | 'HOSTILE' | 'BLOOD_FEUD';

interface RacialRelation {
  race1: string;
  race2: string;
  status: RelationStatus;
  score: number;
}

interface Treaty {
  id: string;
  type: string;
  party1KingdomId: string;
  party1Name: string;
  party2KingdomId: string;
  party2Name: string;
  status: string;
}

interface War {
  id: string;
  attackerName: string;
  defenderName: string;
  attackerKingdomId: string;
  defenderKingdomId: string;
  attackerScore: number;
  defenderScore: number;
  status: string;
}

interface Petition {
  id: string;
  kingdomId: string;
  title: string;
  description: string;
  actionType: string;
  status: string;
  signatureCount: number;
  threshold: number;
  createdAt: string;
  hasSigned?: boolean;
}

interface HistoryEvent {
  id: string;
  eventType: string;
  description: string;
  timestamp: string;
}

interface CitizenDiplomacyPanelProps {
  playerRace: string;
  kingdomId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STATUS_COLORS: Record<RelationStatus, { bg: string; text: string }> = {
  ALLIED:      { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  FRIENDLY:    { bg: 'bg-sky-500/15',     text: 'text-sky-400' },
  NEUTRAL:     { bg: 'bg-slate-500/15',   text: 'text-slate-400' },
  DISTRUSTFUL: { bg: 'bg-realm-gold-500/15', text: 'text-realm-gold-400' },
  HOSTILE:     { bg: 'bg-orange-500/15',   text: 'text-orange-400' },
  BLOOD_FEUD:  { bg: 'bg-realm-danger/15',     text: 'text-realm-danger' },
};

const ACTION_TYPES = ['PEACE_PETITION', 'WAR_PETITION', 'TREATY_REQUEST', 'POLICY_CHANGE'] as const;

function formatRaceName(race: string): string {
  return race.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatActionType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CitizenDiplomacyPanel({ playerRace, kingdomId }: CitizenDiplomacyPanelProps) {
  const queryClient = useQueryClient();

  // Petition form
  const [showPetitionForm, setShowPetitionForm] = useState(false);
  const [petitionTitle, setPetitionTitle] = useState('');
  const [petitionDesc, setPetitionDesc] = useState('');
  const [petitionAction, setPetitionAction] = useState<string>(ACTION_TYPES[0]);

  // History pagination
  const [historyPage, setHistoryPage] = useState(1);

  // ---- Queries ----
  const { data: relations } = useQuery<RacialRelation[]>({
    queryKey: ['diplomacy', 'relations'],
    queryFn: async () => {
      const res = await api.get('/diplomacy/relations');
      return res.data;
    },
  });

  const { data: treaties } = useQuery<Treaty[]>({
    queryKey: ['diplomacy', 'treaties'],
    queryFn: async () => {
      const res = await api.get('/diplomacy/treaties');
      return res.data;
    },
  });

  const { data: wars } = useQuery<War[]>({
    queryKey: ['diplomacy', 'wars'],
    queryFn: async () => {
      const res = await api.get('/diplomacy/wars');
      return res.data;
    },
  });

  const { data: petitions } = useQuery<Petition[]>({
    queryKey: ['petitions', kingdomId],
    queryFn: async () => {
      const res = await api.get('/petitions', { params: { kingdomId, status: 'ACTIVE' } });
      return res.data;
    },
  });

  const { data: historyData } = useQuery<{ events: HistoryEvent[]; totalPages: number }>({
    queryKey: ['diplomacy', 'history', playerRace, historyPage],
    queryFn: async () => {
      const res = await api.get('/diplomacy/history', { params: { race: playerRace, page: historyPage, limit: 10 } });
      return res.data;
    },
  });

  // ---- Mutations ----
  const createPetition = useMutation({
    mutationFn: async () => {
      return api.post('/petitions', {
        kingdomId,
        title: petitionTitle,
        description: petitionDesc,
        actionType: petitionAction,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petitions'] });
      toast.success('Petition created!', { style: TOAST_STYLE });
      setShowPetitionForm(false);
      setPetitionTitle('');
      setPetitionDesc('');
      setPetitionAction(ACTION_TYPES[0]);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to create petition', { style: TOAST_STYLE });
    },
  });

  const signPetition = useMutation({
    mutationFn: async (petitionId: string) => {
      return api.post(`/petitions/${petitionId}/sign`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['petitions'] });
      toast.success('Petition signed!', { style: TOAST_STYLE });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to sign petition', { style: TOAST_STYLE });
    },
  });

  // Filter relations for this race
  const myRelations = (relations ?? []).filter(
    r => r.race1 === playerRace || r.race2 === playerRace
  ).map(r => ({
    race: r.race1 === playerRace ? r.race2 : r.race1,
    status: r.status,
    score: r.score,
  }));

  const myTreaties = (treaties ?? []).filter(
    t => t.status === 'ACTIVE' && (t.party1KingdomId === kingdomId || t.party2KingdomId === kingdomId)
  );

  const myWars = (wars ?? []).filter(
    w => w.status === 'ACTIVE' && (w.attackerKingdomId === kingdomId || w.defenderKingdomId === kingdomId)
  );

  return (
    <div className="space-y-4">
      {/* Relations overview */}
      <section className="bg-realm-bg-800 border border-realm-border rounded-lg p-3">
        <h4 className="font-display text-realm-text-secondary text-sm mb-2 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-realm-gold-400" />
          Your Kingdom's Relations
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {myRelations.map(r => {
            const c = STATUS_COLORS[r.status] ?? STATUS_COLORS.NEUTRAL;
            return (
              <div key={r.race} className={`${c.bg} rounded px-2 py-1.5 flex items-center justify-between`}>
                <span className="text-realm-text-secondary text-[11px]">{formatRaceName(r.race)}</span>
                <span className={`text-[10px] font-display ${c.text}`}>
                  {r.status.replace(/_/g, ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Treaties and wars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <section className="bg-realm-bg-800 border border-realm-border rounded-lg p-3">
          <h4 className="font-display text-realm-text-secondary text-xs mb-2 flex items-center gap-1.5">
            <Handshake className="w-3.5 h-3.5 text-emerald-400" />
            Active Treaties ({myTreaties.length})
          </h4>
          {myTreaties.length === 0 ? (
            <p className="text-realm-text-muted text-xs">None</p>
          ) : (
            <div className="space-y-1">
              {myTreaties.map(t => {
                const partner = t.party1KingdomId === kingdomId ? t.party2Name : t.party1Name;
                return (
                  <div key={t.id} className="text-xs text-realm-text-secondary">
                    <span className="text-emerald-400">{t.type.replace(/_/g, ' ')}</span> with {partner}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-realm-bg-800 border border-realm-border rounded-lg p-3">
          <h4 className="font-display text-realm-text-secondary text-xs mb-2 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-realm-danger" />
            Active Wars ({myWars.length})
          </h4>
          {myWars.length === 0 ? (
            <p className="text-realm-text-muted text-xs">None</p>
          ) : (
            <div className="space-y-1">
              {myWars.map(w => {
                const isAttacker = w.attackerKingdomId === kingdomId;
                const enemy = isAttacker ? w.defenderName : w.attackerName;
                return (
                  <div key={w.id} className="text-xs text-realm-text-secondary">
                    vs <span className="text-realm-danger">{enemy}</span>
                    <span className="text-realm-text-muted ml-1">
                      ({w.attackerScore}-{w.defenderScore})
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Petitions */}
      <section className="bg-realm-bg-800 border border-realm-border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-display text-realm-text-secondary text-sm flex items-center gap-1.5">
            <ScrollText className="w-3.5 h-3.5 text-realm-gold-400" />
            Petitions
          </h4>
          <button
            onClick={() => setShowPetitionForm(!showPetitionForm)}
            className="text-[10px] px-2 py-1 rounded bg-realm-gold-500/10 text-realm-gold-400 border border-realm-gold-500/30 hover:bg-realm-gold-500/20 transition-colors font-display flex items-center gap-1"
          >
            <PenLine className="w-3 h-3" />
            New Petition
          </button>
        </div>

        {/* Petition creation form */}
        {showPetitionForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-3 bg-realm-bg-900 rounded p-3 space-y-2"
          >
            <input
              type="text"
              value={petitionTitle}
              onChange={e => setPetitionTitle(e.target.value)}
              placeholder="Petition title"
              className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-1.5 text-realm-text-secondary text-sm focus:border-realm-gold-500/50 outline-none"
            />
            <textarea
              value={petitionDesc}
              onChange={e => setPetitionDesc(e.target.value)}
              placeholder="Describe what you want to change..."
              rows={3}
              className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-1.5 text-realm-text-secondary text-sm focus:border-realm-gold-500/50 outline-none resize-none"
            />
            <select
              value={petitionAction}
              onChange={e => setPetitionAction(e.target.value)}
              className="w-full bg-realm-bg-800 border border-realm-border rounded px-3 py-1.5 text-realm-text-secondary text-sm focus:border-realm-gold-500/50 outline-none"
            >
              {ACTION_TYPES.map(t => (
                <option key={t} value={t}>{formatActionType(t)}</option>
              ))}
            </select>
            <button
              onClick={() => createPetition.mutate()}
              disabled={!petitionTitle.trim() || createPetition.isPending}
              className="w-full py-1.5 bg-realm-gold-500 text-realm-bg-900 font-display text-xs rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {createPetition.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
              Submit Petition
            </button>
          </motion.div>
        )}

        {/* Petition list */}
        {!petitions || petitions.length === 0 ? (
          <p className="text-realm-text-muted text-xs">No active petitions.</p>
        ) : (
          <div className="space-y-2">
            {petitions.map(p => {
              const pct = Math.min(100, Math.round((p.signatureCount / Math.max(1, p.threshold)) * 100));
              return (
                <div key={p.id} className="bg-realm-bg-900 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-realm-text-primary text-xs font-display">{p.title}</span>
                    <span className="text-realm-text-muted text-[10px]">{formatActionType(p.actionType)}</span>
                  </div>
                  <p className="text-realm-text-muted text-[11px] mb-1.5 line-clamp-2">{p.description}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-realm-bg-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-realm-gold-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-realm-text-muted">
                      {p.signatureCount}/{p.threshold}
                    </span>
                    {!p.hasSigned && (
                      <button
                        onClick={() => signPetition.mutate(p.id)}
                        disabled={signPetition.isPending}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-realm-gold-500/10 text-realm-gold-400 hover:bg-realm-gold-500/20 transition-colors flex items-center gap-0.5"
                      >
                        <Check className="w-3 h-3" />
                        Sign
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Diplomatic history timeline */}
      <section className="bg-realm-bg-800 border border-realm-border rounded-lg p-3">
        <h4 className="font-display text-realm-text-secondary text-sm mb-2 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-realm-text-muted" />
          Diplomatic History
        </h4>
        {!historyData?.events || historyData.events.length === 0 ? (
          <p className="text-realm-text-muted text-xs">No events recorded.</p>
        ) : (
          <>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {historyData.events.map(evt => (
                <div key={evt.id} className="flex items-start gap-2 text-xs border-l-2 border-realm-border pl-2">
                  <span className="text-realm-text-muted whitespace-nowrap shrink-0 text-[10px]">
                    {new Date(evt.timestamp).toLocaleDateString()}
                  </span>
                  <span className="text-realm-text-secondary">{evt.description}</span>
                </div>
              ))}
            </div>
            {historyData.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-2">
                <button
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage <= 1}
                  className="text-realm-text-muted hover:text-realm-text-primary disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-realm-text-muted text-xs">
                  {historyPage} / {historyData.totalPages}
                </span>
                <button
                  onClick={() => setHistoryPage(p => Math.min(historyData.totalPages, p + 1))}
                  disabled={historyPage >= historyData.totalPages}
                  className="text-realm-text-muted hover:text-realm-text-primary disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
