import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Landmark,
  Crown,
  Shield,
  Users,
  ScrollText,
  Loader2,
  Vote,
  Gavel,
} from 'lucide-react';
import api from '../services/api';
import GoldAmount from '../components/shared/GoldAmount';
import CountdownTimer from '../components/shared/CountdownTimer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PlayerCharacter {
  id: string;
  name: string;
  currentTownId: string | null;
}

interface TownInfo {
  id: string;
  name: string;
  population: number;
  treasury: number;
  taxRate: number;
  mayor: { id: string; name: string; level: number } | null;
  policy: {
    taxRate?: number;
    sheriff?: { id: string; name: string; level: number } | null;
    sheriffId?: string | null;
  } | null;
  council: {
    id: string;
    role: string;
    character: { id: string; name: string; level: number };
    appointedAt: string;
  }[];
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
  candidates: {
    characterId: string;
    name: string;
    level: number;
    race: string;
    platform: string;
    nominatedAt: string;
  }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const PHASE_COLORS: Record<string, string> = {
  NOMINATIONS: 'bg-realm-teal-300/10 text-realm-teal-300 border-realm-teal-300/30',
  VOTING: 'bg-realm-success/10 text-realm-success border-realm-success/30',
  COMPLETED: 'bg-realm-text-muted/10 text-realm-text-muted border-realm-text-muted/30',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TownHallPage() {
  const navigate = useNavigate();

  const { data: character, isLoading: charLoading } = useQuery<PlayerCharacter>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  const townId = character?.currentTownId;

  const { data: townData, isLoading: townLoading } = useQuery<{ town: TownInfo }>({
    queryKey: ['governance', 'town-info', townId],
    queryFn: async () => (await api.get(`/governance/town-info/${townId}`)).data,
    enabled: !!townId,
  });

  const { data: electionsData, isLoading: electionsLoading } = useQuery<{ elections: Election[] }>({
    queryKey: ['elections', 'current'],
    queryFn: async () => (await api.get('/elections/current')).data,
    enabled: !!townId,
  });

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------
  if (charLoading) {
    return (
      <div className="pt-12 space-y-6 max-w-7xl mx-auto px-4 py-8">
        <div className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
        <div className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
        <div className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
      </div>
    );
  }

  if (!character || !townId) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Landmark className="w-16 h-16 text-realm-text-muted/30 mb-6" />
        <h2 className="text-2xl font-display text-realm-gold-400 mb-4">No Town</h2>
        <p className="text-realm-text-secondary mb-6">You must be in a town to visit the Town Hall.</p>
        <button
          onClick={() => navigate('/town')}
          className="px-8 py-3 border border-realm-gold-500 text-realm-gold-400 font-display text-lg rounded hover:bg-realm-bg-700 transition-colors"
        >
          Back to Town
        </button>
      </div>
    );
  }

  const town = townData?.town;
  const elections = electionsData?.elections ?? [];
  const isMayor = town?.mayor?.id === character.id;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="pt-12">
      {/* Header */}
      <header className="border-b border-realm-border bg-realm-bg-800/50">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Landmark className="w-8 h-8 text-realm-gold-400" />
              <div>
                <h1 className="text-3xl font-display text-realm-gold-400">Town Hall</h1>
                <p className="text-realm-text-muted text-sm">{town?.name ?? 'Loading...'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isMayor && (
                <button
                  onClick={() => navigate('/governance')}
                  className="px-5 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors"
                >
                  Governance Panel
                </button>
              )}
              <button
                onClick={() => navigate('/elections')}
                className="px-5 py-2 border border-realm-gold-500/60 text-realm-gold-400 font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
              >
                Elections
              </button>
              <button
                onClick={() => navigate('/town')}
                className="px-5 py-2 border border-realm-text-muted/40 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
              >
                Back to Town
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {townLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
              <div className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
              <div className="h-20 bg-realm-bg-700 rounded-md animate-pulse border border-realm-border" />
            </div>
          </div>
        ) : !town ? (
          <div className="text-center py-20">
            <Landmark className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
            <p className="text-realm-text-muted">Failed to load town information.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column -- Mayor & Officials */}
            <div className="space-y-6">
              {/* Mayor card */}
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                <h3 className="font-display text-realm-gold-400 text-sm mb-4 flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  Mayor
                </h3>
                {town.mayor ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg border-2 border-realm-gold-500/30 bg-realm-gold-500/10 flex items-center justify-center">
                      <Crown className="w-6 h-6 text-realm-gold-400" />
                    </div>
                    <div>
                      <p className="text-realm-text-primary font-semibold">{town.mayor.name}</p>
                      <p className="text-realm-text-muted text-xs">Level {town.mayor.level}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-realm-text-muted text-sm">No mayor elected yet.</p>
                )}
              </div>

              {/* Sheriff */}
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                <h3 className="font-display text-realm-gold-400 text-sm mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Sheriff
                </h3>
                {town.policy?.sheriff ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg border-2 border-realm-border bg-realm-border/40 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-realm-text-secondary" />
                    </div>
                    <div>
                      <p className="text-realm-text-primary font-semibold text-sm">{town.policy.sheriff.name}</p>
                      <p className="text-realm-text-muted text-xs">Level {town.policy.sheriff.level}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-realm-text-muted text-sm">No sheriff appointed.</p>
                )}
              </div>

              {/* Council Members */}
              <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                <h3 className="font-display text-realm-gold-400 text-sm mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Town Council
                </h3>
                {(town.council ?? []).length === 0 ? (
                  <p className="text-realm-text-muted text-sm">No council members appointed.</p>
                ) : (
                  <div className="space-y-2">
                    {(town.council ?? []).map((cm) => (
                      <div key={cm.id} className="flex items-center justify-between py-1.5">
                        <div>
                          <p className="text-realm-text-primary text-sm font-semibold">{cm.character.name}</p>
                          <p className="text-realm-text-muted text-[10px] capitalize">{cm.role}</p>
                        </div>
                        <span className="text-realm-text-muted text-xs">Lv. {cm.character.level}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Middle + Right columns */}
            <div className="lg:col-span-2 space-y-8">
              {/* Treasury & Tax */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                  <h3 className="font-display text-realm-text-muted text-xs uppercase tracking-wider mb-2">Town Treasury</h3>
                  <GoldAmount amount={town.treasury ?? 0} className="text-realm-gold-400 font-display text-2xl" />
                </div>
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                  <h3 className="font-display text-realm-text-muted text-xs uppercase tracking-wider mb-2">Tax Rate</h3>
                  <p className="text-realm-gold-400 font-display text-2xl">
                    {Math.round((town.taxRate ?? 0.10) * 100)}%
                  </p>
                </div>
              </div>

              {/* Elections */}
              <section>
                <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                  <Vote className="w-5 h-5 text-realm-gold-400" />
                  Elections
                </h2>
                {electionsLoading ? (
                  <div className="flex items-center gap-2 text-realm-text-muted text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading elections...
                  </div>
                ) : elections.length === 0 ? (
                  <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-6 text-center">
                    <Gavel className="w-10 h-10 text-realm-text-muted/30 mx-auto mb-3" />
                    <p className="text-realm-text-muted text-sm">No active or upcoming elections.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {elections.map((election) => (
                      <div
                        key={election.id}
                        className="bg-realm-bg-700 border border-realm-border rounded-lg p-4 hover:border-realm-gold-500/40 transition-colors cursor-pointer"
                        onClick={() => navigate('/elections')}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-display text-realm-text-primary text-sm">
                              {election.type === 'MAYOR' ? 'Mayoral' : 'Ruler'} Election
                            </h4>
                            <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${PHASE_COLORS[election.phase] ?? ''}`}>
                              {election.phase}
                            </span>
                          </div>
                          <CountdownTimer endDate={election.endDate} />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-realm-text-muted">
                          <span>Term #{election.termNumber}</span>
                          <span>{election.candidateCount} candidate{election.candidateCount !== 1 ? 's' : ''}</span>
                          <span>{election.voteCount} vote{election.voteCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Town Info */}
              <section>
                <h2 className="text-xl font-display text-realm-text-primary mb-4 flex items-center gap-2">
                  <ScrollText className="w-5 h-5 text-realm-gold-400" />
                  Town Details
                </h2>
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                  <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-realm-text-muted text-xs">Population</dt>
                      <dd className="text-realm-text-primary font-semibold">{(town.population ?? 0).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-realm-text-muted text-xs">Treasury</dt>
                      <dd><GoldAmount amount={town.treasury ?? 0} className="text-realm-text-primary font-semibold" /></dd>
                    </div>
                    <div>
                      <dt className="text-realm-text-muted text-xs">Tax Rate</dt>
                      <dd className="text-realm-text-primary font-semibold">{Math.round((town.taxRate ?? 0.10) * 100)}%</dd>
                    </div>
                    <div>
                      <dt className="text-realm-text-muted text-xs">Officials</dt>
                      <dd className="text-realm-text-primary font-semibold">{(town.council ?? []).length + (town.mayor ? 1 : 0) + (town.policy?.sheriff ? 1 : 0)}</dd>
                    </div>
                  </dl>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
