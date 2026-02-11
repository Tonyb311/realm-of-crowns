import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Vote,
  Loader2,
  Users,
  Trophy,
  Gavel,
  AlertCircle,
  Crown,
  ScrollText,
  X,
} from 'lucide-react';
import api from '../services/api';
import CountdownTimer from '../components/shared/CountdownTimer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PlayerCharacter {
  id: string;
  name: string;
  currentTownId: string | null;
}

interface Candidate {
  characterId: string;
  name: string;
  level: number;
  race: string;
  platform: string;
  nominatedAt: string;
  votes?: number;
}

interface Election {
  id: string;
  type: 'MAYOR' | 'RULER';
  phase: 'NOMINATIONS' | 'VOTING' | 'COMPLETED';
  termNumber: number;
  startDate: string;
  endDate: string;
  town: { id: string; name: string } | null;
  kingdom: { id: string; name: string } | null;
  candidateCount: number;
  voteCount: number;
  candidates: Candidate[];
}

interface ElectionResult {
  id: string;
  type: string;
  termNumber: number;
  startDate: string;
  endDate: string;
  town: { id: string; name: string } | null;
  kingdom: { id: string; name: string } | null;
  winner: { id: string; name: string; level: number; race: string } | null;
  totalVotes: number;
  candidates: {
    characterId: string;
    name: string;
    platform: string;
    votes: number;
  }[];
}

interface Impeachment {
  id: string;
  targetId: string;
  townId: string | null;
  kingdomId: string | null;
  votesFor: number;
  votesAgainst: number;
  status: string;
  startedAt: string;
  endsAt: string;
}

type Tab = 'current' | 'history' | 'impeachment';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PHASE_COLORS: Record<string, string> = {
  NOMINATIONS: 'bg-blue-400/10 text-blue-400 border-blue-400/30',
  VOTING: 'bg-green-400/10 text-green-400 border-green-400/30',
  COMPLETED: 'bg-parchment-500/10 text-parchment-500 border-parchment-500/30',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ElectionPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('current');
  const [showNominateModal, setShowNominateModal] = useState(false);
  const [nominateElectionId, setNominateElectionId] = useState('');
  const [platform, setPlatform] = useState('');
  const [showImpeachModal, setShowImpeachModal] = useState(false);
  const [impeachTargetId, setImpeachTargetId] = useState('');

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------
  const { data: character } = useQuery<PlayerCharacter>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  const { data: electionsData, isLoading: electionsLoading } = useQuery<{ elections: Election[] }>({
    queryKey: ['elections', 'current'],
    queryFn: async () => (await api.get('/elections/current')).data,
    enabled: activeTab === 'current',
  });

  const { data: resultsData, isLoading: resultsLoading } = useQuery<{ results: ElectionResult[] }>({
    queryKey: ['elections', 'results'],
    queryFn: async () => (await api.get('/elections/results')).data,
    enabled: activeTab === 'history',
  });

  const elections = electionsData?.elections ?? [];
  const results = resultsData?.results ?? [];

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------
  const nominateMutation = useMutation({
    mutationFn: async (data: { electionId: string; platform: string }) => {
      return (await api.post('/elections/nominate', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      setShowNominateModal(false);
      setPlatform('');
      setNominateElectionId('');
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (data: { electionId: string; candidateId: string }) => {
      return (await api.post('/elections/vote', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
    },
  });

  const impeachMutation = useMutation({
    mutationFn: async (data: { targetId: string; townId?: string }) => {
      return (await api.post('/elections/impeach', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      setShowImpeachModal(false);
      setImpeachTargetId('');
    },
  });

  const impeachVoteMutation = useMutation({
    mutationFn: async (data: { impeachmentId: string; support: boolean }) => {
      return (await api.post('/elections/impeach/vote', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections'] });
    },
  });

  // -------------------------------------------------------------------------
  // Tabs
  // -------------------------------------------------------------------------
  const tabs: { key: Tab; label: string; icon: typeof Vote }[] = [
    { key: 'current', label: 'Current Elections', icon: Vote },
    { key: 'history', label: 'Past Results', icon: Trophy },
    { key: 'impeachment', label: 'Impeachment', icon: Gavel },
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-dark-500 pt-12">
      {/* Header */}
      <header className="border-b border-dark-50 bg-dark-400/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Vote className="w-8 h-8 text-primary-400" />
              <div>
                <h1 className="text-3xl font-display text-primary-400">Elections</h1>
                <p className="text-parchment-500 text-sm">Shape the future of your realm</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/town-hall')}
                className="px-5 py-2 border border-primary-400/60 text-primary-400 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Town Hall
              </button>
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
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 font-display text-sm border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary-400 text-primary-400'
                      : 'border-transparent text-parchment-500 hover:text-parchment-300 hover:border-parchment-500/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        {/* ================================================================= */}
        {/* TAB: Current Elections                                            */}
        {/* ================================================================= */}
        {activeTab === 'current' && (
          <div>
            {electionsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
            ) : elections.length === 0 ? (
              <div className="text-center py-20">
                <Vote className="w-12 h-12 text-parchment-500/30 mx-auto mb-4" />
                <p className="text-parchment-500 mb-2">No active or upcoming elections.</p>
                <p className="text-parchment-500/60 text-sm">Check back later for new elections.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {elections.map((election) => (
                  <div key={election.id} className="bg-dark-300 border border-dark-50 rounded-lg overflow-hidden">
                    {/* Election header */}
                    <div className="px-6 py-4 border-b border-dark-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-display text-parchment-200 text-lg">
                          {election.type === 'MAYOR' ? 'Mayoral' : 'Ruler'} Election
                          {election.town && ` - ${election.town.name}`}
                        </h3>
                        <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${PHASE_COLORS[election.phase] ?? ''}`}>
                          {election.phase}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <CountdownTimer endDate={election.endDate} />
                        <span className="text-parchment-500 text-xs">Term #{election.termNumber}</span>
                      </div>
                    </div>

                    {/* Candidates */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-display text-parchment-400 text-sm flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Candidates ({election.candidates.length})
                        </h4>
                        {election.phase === 'NOMINATIONS' && (
                          <button
                            onClick={() => { setNominateElectionId(election.id); setShowNominateModal(true); }}
                            className="px-4 py-1.5 bg-primary-400 text-dark-500 font-display text-xs rounded hover:bg-primary-300 transition-colors"
                          >
                            Run for Office
                          </button>
                        )}
                      </div>

                      {election.candidates.length === 0 ? (
                        <p className="text-parchment-500 text-sm">No candidates have entered the race yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {election.candidates.map((candidate) => (
                            <div
                              key={candidate.characterId}
                              className="bg-dark-400 border border-dark-50 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg border-2 border-primary-400/30 bg-primary-400/10 flex items-center justify-center">
                                  <Crown className="w-5 h-5 text-primary-400" />
                                </div>
                                <div>
                                  <p className="text-parchment-200 font-semibold text-sm">{candidate.name}</p>
                                  <p className="text-parchment-500 text-xs">
                                    {candidate.race} - Lv. {candidate.level}
                                  </p>
                                </div>
                              </div>
                              {candidate.platform && (
                                <p className="text-parchment-400 text-xs flex-1 sm:mx-4 italic">
                                  "{candidate.platform}"
                                </p>
                              )}
                              {election.phase === 'VOTING' && candidate.characterId !== character?.id && (
                                <button
                                  onClick={() => voteMutation.mutate({ electionId: election.id, candidateId: candidate.characterId })}
                                  disabled={voteMutation.isPending}
                                  className="px-4 py-1.5 bg-green-400/20 text-green-400 text-xs font-display rounded border border-green-400/30 hover:bg-green-400/30 transition-colors disabled:opacity-50"
                                >
                                  {voteMutation.isPending ? 'Voting...' : 'Vote'}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {voteMutation.isError && (
                        <div className="mt-3 p-2 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-xs flex items-center gap-2">
                          <AlertCircle className="w-3 h-3 flex-shrink-0" />
                          {(voteMutation.error as any)?.response?.data?.error ?? 'Failed to cast vote.'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: Past Results                                                 */}
        {/* ================================================================= */}
        {activeTab === 'history' && (
          <div>
            {resultsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-20">
                <Trophy className="w-12 h-12 text-parchment-500/30 mx-auto mb-4" />
                <p className="text-parchment-500">No past election results.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="bg-dark-300 border border-dark-50 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-display text-parchment-200 text-sm">
                          {result.type === 'MAYOR' ? 'Mayoral' : 'Ruler'} Election - Term #{result.termNumber}
                        </h4>
                        <p className="text-parchment-500 text-xs">
                          {new Date(result.startDate).toLocaleDateString()} - {new Date(result.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-parchment-500 text-xs">{result.totalVotes} total votes</span>
                    </div>

                    {result.winner && (
                      <div className="bg-primary-400/10 border border-primary-400/30 rounded p-3 mb-3 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-primary-400" />
                        <span className="text-primary-400 font-display text-sm">Winner: {result.winner.name}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                      {result.candidates.map((candidate) => {
                        const pct = result.totalVotes > 0 ? Math.round((candidate.votes / result.totalVotes) * 100) : 0;
                        const isWinner = result.winner?.id === candidate.characterId;
                        return (
                          <div key={candidate.characterId} className="flex items-center gap-3">
                            <span className={`text-sm w-32 truncate ${isWinner ? 'text-primary-400 font-semibold' : 'text-parchment-300'}`}>
                              {candidate.name}
                            </span>
                            <div className="flex-1 h-4 bg-dark-500 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isWinner ? 'bg-primary-400/60' : 'bg-parchment-500/30'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-parchment-400 text-xs w-16 text-right">
                              {candidate.votes} ({pct}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB: Impeachment                                                  */}
        {/* ================================================================= */}
        {activeTab === 'impeachment' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display text-parchment-200">Impeachment</h2>
              <button
                onClick={() => setShowImpeachModal(true)}
                className="px-5 py-2 bg-red-900/30 border border-red-500/40 text-red-400 font-display text-sm rounded hover:bg-red-900/50 transition-colors"
              >
                Start Impeachment
              </button>
            </div>

            <div className="bg-dark-300 border border-dark-50 rounded-lg p-8 text-center">
              <Gavel className="w-12 h-12 text-parchment-500/30 mx-auto mb-4" />
              <p className="text-parchment-500 text-sm mb-2">
                Impeachment allows citizens to remove an elected official from office.
              </p>
              <p className="text-parchment-500/60 text-xs">
                Requires a majority vote within the 48-hour voting period.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* MODAL: Nominate                                                    */}
      {/* ================================================================= */}
      {showNominateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowNominateModal(false)}>
          <div className="bg-dark-400 border border-dark-50 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-primary-400">Run for Office</h3>
              <button onClick={() => setShowNominateModal(false)} className="text-parchment-500 hover:text-parchment-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-parchment-500 text-xs mb-1 block">Your Platform</label>
                <textarea
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="Share your vision for the town..."
                  maxLength={2000}
                  rows={4}
                  className="w-full px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm placeholder:text-parchment-500/50 focus:border-primary-400/50 focus:outline-none resize-none"
                />
                <p className="text-parchment-500/50 text-[10px] text-right mt-1">{platform.length}/2000</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNominateModal(false)}
                className="flex-1 py-2 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => nominateMutation.mutate({ electionId: nominateElectionId, platform })}
                disabled={nominateMutation.isPending}
                className="flex-1 py-2 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {nominateMutation.isPending ? 'Submitting...' : 'Enter Race'}
              </button>
            </div>
            {nominateMutation.isError && (
              <p className="text-blood-light text-xs mt-3 text-center">
                {(nominateMutation.error as any)?.response?.data?.error ?? 'Failed to nominate.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: Start Impeachment                                           */}
      {/* ================================================================= */}
      {showImpeachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowImpeachModal(false)}>
          <div className="bg-dark-400 border border-dark-50 rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-red-400">Start Impeachment</h3>
              <button onClick={() => setShowImpeachModal(false)} className="text-parchment-500 hover:text-parchment-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-parchment-500 text-xs mb-1 block">Target Official ID</label>
                <input
                  type="text"
                  value={impeachTargetId}
                  onChange={(e) => setImpeachTargetId(e.target.value)}
                  placeholder="Character ID of the official"
                  className="w-full px-3 py-2 bg-dark-500 border border-dark-50 rounded text-parchment-200 text-sm placeholder:text-parchment-500/50 focus:border-primary-400/50 focus:outline-none"
                />
              </div>

              <div className="bg-red-900/20 border border-red-500/30 rounded p-3">
                <p className="text-red-300 text-xs">
                  This will start a 48-hour impeachment vote. All town residents can vote. A majority is required to remove the official.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowImpeachModal(false)}
                className="flex-1 py-2 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => impeachMutation.mutate({ targetId: impeachTargetId, townId: character?.currentTownId ?? undefined })}
                disabled={impeachMutation.isPending || !impeachTargetId.trim()}
                className="flex-1 py-2 bg-red-900/40 text-red-400 border border-red-500/40 font-display text-sm rounded hover:bg-red-900/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {impeachMutation.isPending ? 'Starting...' : 'Start Vote'}
              </button>
            </div>
            {impeachMutation.isError && (
              <p className="text-blood-light text-xs mt-3 text-center">
                {(impeachMutation.error as any)?.response?.data?.error ?? 'Failed to start impeachment.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
