import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Crown,
  Swords,
  ScrollText,
  CircleDollarSign,
  Users,
  Loader2,
  Shield,
  Landmark,
} from 'lucide-react';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface KingdomInfo {
  id: string;
  name: string;
  treasury: number;
  ruler: { id: string; name: string; level: number } | null;
  activeLaws: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    lawType: string;
    votesFor: number;
    votesAgainst: number;
    enactedBy: { id: string; name: string } | null;
    enactedAt: string | null;
  }[];
  activeWars: {
    id: string;
    role: 'attacker' | 'defender';
    opponent: { id: string; name: string };
    startedAt: string;
  }[];
  council: {
    id: string;
    role: string;
    character: { id: string; name: string; level: number };
    appointedAt: string;
  }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function GoldAmount({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <CircleDollarSign className="w-3.5 h-3.5 text-primary-400 flex-shrink-0" />
      <span>{amount.toLocaleString()}</span>
    </span>
  );
}

const LAW_TYPE_COLORS: Record<string, string> = {
  tax: 'text-amber-400',
  trade: 'text-green-400',
  military: 'text-red-400',
  building: 'text-blue-400',
  general: 'text-parchment-400',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function KingdomPage() {
  const navigate = useNavigate();

  // For now, use a default kingdom ID. In production this would come from
  // the player's town -> region -> kingdom chain.
  const kingdomId = new URLSearchParams(window.location.search).get('id') || 'default';

  const { data: kingdomData, isLoading, error } = useQuery<{ kingdom: KingdomInfo }>({
    queryKey: ['governance', 'kingdom', kingdomId],
    queryFn: async () => (await api.get(`/governance/kingdom/${kingdomId}`)).data,
  });

  const kingdom = kingdomData?.kingdom;

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    );
  }

  if (error || !kingdom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <Crown className="w-16 h-16 text-parchment-500/30 mb-6" />
        <h2 className="text-2xl font-display text-primary-400 mb-4">Kingdom Not Found</h2>
        <p className="text-parchment-300 mb-6">Unable to load kingdom information.</p>
        <button
          onClick={() => navigate('/town')}
          className="px-8 py-3 border border-primary-400 text-primary-400 font-display text-lg rounded hover:bg-dark-300 transition-colors"
        >
          Back to Town
        </button>
      </div>
    );
  }

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
              <Crown className="w-8 h-8 text-primary-400" />
              <div>
                <h1 className="text-3xl font-display text-primary-400">{kingdom.name}</h1>
                <p className="text-parchment-500 text-sm">Kingdom Overview</p>
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

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column — Ruler & Council */}
          <div className="space-y-6">
            {/* Ruler card */}
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
              <h3 className="font-display text-primary-400 text-sm mb-4 flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Ruler
              </h3>
              {kingdom.ruler ? (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg border-2 border-primary-400/30 bg-primary-400/10 flex items-center justify-center">
                    <Crown className="w-7 h-7 text-primary-400" />
                  </div>
                  <div>
                    <p className="text-parchment-200 font-semibold">{kingdom.ruler.name}</p>
                    <p className="text-parchment-500 text-xs">Level {kingdom.ruler.level}</p>
                  </div>
                </div>
              ) : (
                <p className="text-parchment-500 text-sm">No ruler. The throne is vacant.</p>
              )}
            </div>

            {/* Treasury */}
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
              <h3 className="font-display text-parchment-500 text-xs uppercase tracking-wider mb-2">Kingdom Treasury</h3>
              <GoldAmount amount={kingdom.treasury} className="text-primary-400 font-display text-2xl" />
            </div>

            {/* Council */}
            <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
              <h3 className="font-display text-primary-400 text-sm mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Royal Council
              </h3>
              {kingdom.council.length === 0 ? (
                <p className="text-parchment-500 text-sm">No council members appointed.</p>
              ) : (
                <div className="space-y-2">
                  {kingdom.council.map((cm) => (
                    <div key={cm.id} className="flex items-center justify-between py-1.5">
                      <div>
                        <p className="text-parchment-200 text-sm font-semibold">{cm.character.name}</p>
                        <p className="text-parchment-500 text-[10px] capitalize">{cm.role}</p>
                      </div>
                      <span className="text-parchment-500 text-xs">Lv. {cm.character.level}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Middle + Right columns */}
          <div className="lg:col-span-2 space-y-8">
            {/* Active Wars */}
            <section>
              <h2 className="text-xl font-display text-parchment-200 mb-4 flex items-center gap-2">
                <Swords className="w-5 h-5 text-red-400" />
                Active Wars
              </h2>
              {kingdom.activeWars.length === 0 ? (
                <div className="bg-dark-300 border border-dark-50 rounded-lg p-6 text-center">
                  <Shield className="w-10 h-10 text-parchment-500/30 mx-auto mb-3" />
                  <p className="text-parchment-500 text-sm">The kingdom is at peace.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {kingdom.activeWars.map((war) => (
                    <div key={war.id} className="bg-dark-300 border border-dark-50 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          war.role === 'attacker' ? 'bg-red-900/30 border-2 border-red-500/40' : 'bg-blue-900/30 border-2 border-blue-500/40'
                        }`}>
                          <Swords className={`w-5 h-5 ${war.role === 'attacker' ? 'text-red-400' : 'text-blue-400'}`} />
                        </div>
                        <div>
                          <p className="text-parchment-200 font-semibold text-sm">
                            vs. {war.opponent.name}
                          </p>
                          <p className="text-parchment-500 text-[10px] capitalize">
                            {war.role} - Since {new Date(war.startedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${
                        war.role === 'attacker'
                          ? 'bg-red-400/10 text-red-400 border-red-400/30'
                          : 'bg-blue-400/10 text-blue-400 border-blue-400/30'
                      }`}>
                        {war.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Kingdom Laws */}
            <section>
              <h2 className="text-xl font-display text-parchment-200 mb-4 flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-primary-400" />
                Active Laws
              </h2>
              {kingdom.activeLaws.length === 0 ? (
                <div className="bg-dark-300 border border-dark-50 rounded-lg p-6 text-center">
                  <ScrollText className="w-10 h-10 text-parchment-500/30 mx-auto mb-3" />
                  <p className="text-parchment-500 text-sm">No active laws in this kingdom.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {kingdom.activeLaws.map((law) => (
                    <div key={law.id} className="bg-dark-300 border border-dark-50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-display text-parchment-200 text-sm">{law.title}</h4>
                          <span className={`text-[10px] capitalize ${LAW_TYPE_COLORS[law.lawType] ?? 'text-parchment-400'}`}>
                            {law.lawType}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border bg-green-400/10 text-green-400 border-green-400/30">
                          Active
                        </span>
                      </div>
                      {law.description && (
                        <p className="text-parchment-400 text-xs mt-1">{law.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-[10px] text-parchment-500">
                        <span>Votes: {law.votesFor} for, {law.votesAgainst} against</span>
                        {law.enactedBy && <span>By: {law.enactedBy.name}</span>}
                        {law.enactedAt && <span>Enacted: {new Date(law.enactedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Elections link */}
            <section>
              <h2 className="text-xl font-display text-parchment-200 mb-4 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-primary-400" />
                Elections
              </h2>
              <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
                <p className="text-parchment-400 text-sm mb-4">
                  Ruler elections are held periodically. Only mayors may run for ruler.
                </p>
                <button
                  onClick={() => navigate('/elections')}
                  className="px-5 py-2 border border-primary-400/60 text-primary-400 font-display text-sm rounded hover:bg-dark-300 transition-colors"
                >
                  View Elections
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
