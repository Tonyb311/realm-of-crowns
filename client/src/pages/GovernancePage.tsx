import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Gavel,
  ScrollText,
  CircleDollarSign,
  Users,
  Swords,
  Loader2,
  AlertCircle,
  Crown,
  Shield,
  X,
} from 'lucide-react';
import api from '../services/api';
import GoldAmount from '../components/shared/GoldAmount';

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
  kingdomId: string | null; // P1 #25: actual kingdomId from region
  mayor: { id: string; name: string; level: number } | null;
  policy: {
    taxRate?: number;
    sheriff?: { id: string; name: string; level: number } | null;
  } | null;
  council: {
    id: string;
    role: string;
    character: { id: string; name: string; level: number };
    appointedAt: string;
  }[];
}

interface Law {
  id: string;
  kingdomId: string;
  title: string;
  description: string | null;
  effects: Record<string, unknown>;
  status: string;
  lawType: string;
  votesFor: number;
  votesAgainst: number;
  enactedBy: { id: string; name: string } | null;
  proposedAt: string;
  enactedAt: string | null;
}

type Tab = 'laws' | 'treasury' | 'officials' | 'war';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const STATUS_COLORS: Record<string, string> = {
  proposed: 'bg-realm-teal-300/10 text-realm-teal-300 border-realm-teal-300/30',
  voting: 'bg-realm-gold-500/10 text-realm-gold-400 border-realm-gold-500/30',
  active: 'bg-realm-success/10 text-realm-success border-realm-success/30',
  rejected: 'bg-realm-danger/10 text-realm-danger border-realm-danger/30',
  expired: 'bg-realm-text-muted/10 text-realm-text-muted border-realm-text-muted/30',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function GovernancePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>('laws');

  // Law form
  const [showLawModal, setShowLawModal] = useState(false);
  const [lawTitle, setLawTitle] = useState('');
  const [lawDescription, setLawDescription] = useState('');
  const [lawType, setLawType] = useState<string>('general');

  // Tax
  const [taxRate, setTaxRate] = useState<number>(10);

  // Appoint
  const [appointCharId, setAppointCharId] = useState('');
  const [appointRole, setAppointRole] = useState('sheriff');

  // Treasury
  const [allocAmount, setAllocAmount] = useState('');
  const [allocPurpose, setAllocPurpose] = useState<string>('buildings');

  // War
  const [warTargetId, setWarTargetId] = useState('');
  const [warReason, setWarReason] = useState('');

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------
  const { data: character } = useQuery<PlayerCharacter>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  const townId = character?.currentTownId;

  const { data: townData, isLoading: townLoading } = useQuery<{ town: TownInfo }>({
    queryKey: ['governance', 'town-info', townId],
    queryFn: async () => (await api.get(`/governance/town-info/${townId}`)).data,
    enabled: !!townId,
  });

  const town = townData?.town;
  // P1 #25: Use actual kingdomId from town data instead of hardcoded 'default'
  const kingdomId = town?.kingdomId ?? null;

  const { data: lawsData, isLoading: lawsLoading } = useQuery<{ laws: Law[] }>({
    queryKey: ['governance', 'laws', kingdomId],
    queryFn: async () => (await api.get('/governance/laws', { params: { kingdomId } })).data,
    enabled: activeTab === 'laws' && !!kingdomId,
  });

  const laws = lawsData?.laws ?? [];
  const isMayor = town?.mayor?.id === character?.id;

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------
  const proposeLawMutation = useMutation({
    mutationFn: async (data: { kingdomId: string; title: string; description?: string; lawType: string }) => {
      return (await api.post('/governance/propose-law', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'laws'] });
      setShowLawModal(false);
      setLawTitle('');
      setLawDescription('');
      setLawType('general');
    },
  });

  const voteLawMutation = useMutation({
    mutationFn: async (data: { lawId: string; vote: 'for' | 'against' }) => {
      return (await api.post('/governance/vote-law', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'laws'] });
    },
  });

  const setTaxMutation = useMutation({
    mutationFn: async (data: { townId: string; taxRate: number }) => {
      return (await api.post('/governance/set-tax', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'town-info'] });
    },
  });

  const appointMutation = useMutation({
    mutationFn: async (data: { characterId: string; role: string; townId?: string }) => {
      return (await api.post('/governance/appoint', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'town-info'] });
      setAppointCharId('');
      setAppointRole('sheriff');
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async (data: { townId?: string; amount: number; purpose: string }) => {
      return (await api.post('/governance/allocate-treasury', data)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance', 'town-info'] });
      setAllocAmount('');
    },
  });

  const declareWarMutation = useMutation({
    mutationFn: async (data: { targetKingdomId: string; reason?: string }) => {
      return (await api.post('/governance/declare-war', data)).data;
    },
    onSuccess: () => {
      setWarTargetId('');
      setWarReason('');
    },
  });

  // -------------------------------------------------------------------------
  // Access check
  // -------------------------------------------------------------------------
  if (!townLoading && town && !isMayor) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Gavel className="w-16 h-16 text-realm-text-muted/30 mb-6" />
        <h2 className="text-2xl font-display text-realm-gold-400 mb-4">Access Restricted</h2>
        <p className="text-realm-text-secondary mb-6">Only the mayor or ruler can access the governance panel.</p>
        <button
          onClick={() => navigate('/town-hall')}
          className="px-8 py-3 border border-realm-gold-500 text-realm-gold-400 font-display text-lg rounded hover:bg-realm-bg-700 transition-colors"
        >
          Back to Town Hall
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Tabs
  // -------------------------------------------------------------------------
  const tabs: { key: Tab; label: string; icon: typeof Gavel }[] = [
    { key: 'laws', label: 'Laws', icon: ScrollText },
    { key: 'treasury', label: 'Treasury', icon: CircleDollarSign },
    { key: 'officials', label: 'Officials', icon: Users },
    { key: 'war', label: 'War', icon: Swords },
  ];

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
              <Gavel className="w-8 h-8 text-realm-gold-400" />
              <div>
                <h1 className="text-3xl font-display text-realm-gold-400">Governance</h1>
                <p className="text-realm-text-muted text-sm">{town?.name ?? 'Loading...'} - Mayor's Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/town-hall')}
                className="px-5 py-2 border border-realm-gold-500/60 text-realm-gold-400 font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
              >
                Town Hall
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

      {/* Tabs */}
      <div className="border-b border-realm-border bg-realm-bg-800/30">
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
                      ? 'border-realm-gold-500 text-realm-gold-400'
                      : 'border-transparent text-realm-text-muted hover:text-realm-text-secondary hover:border-realm-text-muted/30'
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
        {townLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-realm-gold-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* ============================================================= */}
            {/* TAB: Laws                                                      */}
            {/* ============================================================= */}
            {activeTab === 'laws' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-display text-realm-text-primary">Laws & Proposals</h2>
                  <button
                    onClick={() => setShowLawModal(true)}
                    disabled={!kingdomId}
                    className="px-5 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Propose Law
                  </button>
                </div>

                {/* P1 #25: Fallback when no kingdom is associated */}
                {!kingdomId && !lawsLoading && (
                  <div className="text-center py-20">
                    <ScrollText className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
                    <p className="text-realm-text-muted">This town is not yet part of a kingdom. Laws require a governing kingdom.</p>
                  </div>
                )}

                {lawsLoading ? (
                  <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 text-realm-gold-400 animate-spin" />
                  </div>
                ) : laws.length === 0 ? (
                  <div className="text-center py-20">
                    <ScrollText className="w-12 h-12 text-realm-text-muted/30 mx-auto mb-4" />
                    <p className="text-realm-text-muted">No laws have been proposed yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {laws.map((law) => (
                      <div key={law.id} className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-display text-realm-text-primary text-sm">{law.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${STATUS_COLORS[law.status] ?? ''}`}>
                                {law.status}
                              </span>
                              <span className="text-realm-text-muted text-[10px] capitalize">{law.lawType}</span>
                            </div>
                          </div>
                          {(law.status === 'PROPOSED' || law.status === 'VOTING') && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => voteLawMutation.mutate({ lawId: law.id, vote: 'for' })}
                                disabled={voteLawMutation.isPending}
                                className="px-3 py-1 text-xs text-realm-success border border-realm-success/30 rounded hover:bg-realm-success/10 transition-colors disabled:opacity-50"
                              >
                                Vote For
                              </button>
                              <button
                                onClick={() => voteLawMutation.mutate({ lawId: law.id, vote: 'against' })}
                                disabled={voteLawMutation.isPending}
                                className="px-3 py-1 text-xs text-realm-danger border border-realm-danger/30 rounded hover:bg-realm-danger/10 transition-colors disabled:opacity-50"
                              >
                                Vote Against
                              </button>
                            </div>
                          )}
                        </div>
                        {law.description && (
                          <p className="text-realm-text-secondary text-xs mt-2">{law.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-[10px] text-realm-text-muted">
                          <span>For: {law.votesFor}</span>
                          <span>Against: {law.votesAgainst}</span>
                          {law.enactedBy && <span>By: {law.enactedBy.name}</span>}
                          <span>{new Date(law.proposedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB: Treasury                                                  */}
            {/* ============================================================= */}
            {activeTab === 'treasury' && town && (
              <div className="space-y-8">
                {/* Balance + Tax */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                    <h3 className="font-display text-realm-text-muted text-xs uppercase tracking-wider mb-2">Treasury Balance</h3>
                    <GoldAmount amount={town.treasury} className="text-realm-gold-400 font-display text-2xl" />
                  </div>
                  <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                    <h3 className="font-display text-realm-text-muted text-xs uppercase tracking-wider mb-2">Current Tax Rate</h3>
                    <p className="text-realm-gold-400 font-display text-2xl">{Math.round(town.taxRate * 100)}%</p>
                  </div>
                </div>

                {/* Set Tax Rate */}
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                  <h3 className="font-display text-realm-gold-400 text-sm mb-4">Set Tax Rate</h3>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="25"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseInt(e.target.value, 10))}
                      className="flex-1 accent-realm-gold-500"
                    />
                    <span className="text-realm-text-primary font-display text-lg w-16 text-right">{taxRate}%</span>
                    <button
                      onClick={() => townId && setTaxMutation.mutate({ townId, taxRate: taxRate / 100 })}
                      disabled={setTaxMutation.isPending}
                      className="px-5 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50"
                    >
                      {setTaxMutation.isPending ? 'Saving...' : 'Apply'}
                    </button>
                  </div>
                  {setTaxMutation.isError && (
                    <p className="text-realm-danger text-xs mt-2">Failed to update tax rate.</p>
                  )}
                  {setTaxMutation.isSuccess && (
                    <p className="text-realm-success text-xs mt-2">Tax rate updated.</p>
                  )}
                </div>

                {/* Allocate Treasury */}
                <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                  <h3 className="font-display text-realm-gold-400 text-sm mb-4">Allocate Funds</h3>
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="text-realm-text-muted text-xs mb-1 block">Amount</label>
                      <div className="relative">
                        <CircleDollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-realm-gold-400" />
                        <input
                          type="number"
                          value={allocAmount}
                          onChange={(e) => setAllocAmount(e.target.value)}
                          placeholder="0"
                          min="1"
                          className="w-40 pl-9 pr-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm placeholder:text-realm-text-muted/50 focus:border-realm-gold-500/50 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-realm-text-muted text-xs mb-1 block">Purpose</label>
                      <select
                        value={allocPurpose}
                        onChange={(e) => setAllocPurpose(e.target.value)}
                        className="px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm focus:border-realm-gold-500/50 focus:outline-none"
                      >
                        <option value="buildings">Buildings</option>
                        <option value="military">Military</option>
                        <option value="infrastructure">Infrastructure</option>
                        <option value="events">Events</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        const amount = parseInt(allocAmount, 10);
                        if (townId && amount > 0) {
                          allocateMutation.mutate({ townId, amount, purpose: allocPurpose });
                        }
                      }}
                      disabled={allocateMutation.isPending || !allocAmount || parseInt(allocAmount, 10) <= 0}
                      className="px-5 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {allocateMutation.isPending ? 'Allocating...' : 'Allocate'}
                    </button>
                  </div>
                  {allocateMutation.isError && (
                    <p className="text-realm-danger text-xs mt-2">
                      {(allocateMutation.error as any)?.response?.data?.error ?? 'Failed to allocate funds.'}
                    </p>
                  )}
                  {allocateMutation.isSuccess && (
                    <p className="text-realm-success text-xs mt-2">Funds allocated successfully.</p>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB: Officials                                                 */}
            {/* ============================================================= */}
            {activeTab === 'officials' && town && (
              <div className="space-y-8">
                {/* Current officials */}
                <section>
                  <h2 className="text-xl font-display text-realm-text-primary mb-4">Current Officials</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Crown className="w-4 h-4 text-realm-gold-400" />
                        <h4 className="font-display text-realm-text-muted text-xs uppercase tracking-wider">Mayor</h4>
                      </div>
                      {town.mayor ? (
                        <p className="text-realm-text-primary font-semibold">{town.mayor.name} (Lv. {town.mayor.level})</p>
                      ) : (
                        <p className="text-realm-text-muted text-sm">Vacant</p>
                      )}
                    </div>
                    <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-4 h-4 text-realm-gold-400" />
                        <h4 className="font-display text-realm-text-muted text-xs uppercase tracking-wider">Sheriff</h4>
                      </div>
                      {town.policy?.sheriff ? (
                        <p className="text-realm-text-primary font-semibold">{town.policy.sheriff.name} (Lv. {town.policy.sheriff.level})</p>
                      ) : (
                        <p className="text-realm-text-muted text-sm">Vacant</p>
                      )}
                    </div>
                    {town.council.map((cm) => (
                      <div key={cm.id} className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-realm-gold-400" />
                          <h4 className="font-display text-realm-text-muted text-xs uppercase tracking-wider capitalize">{cm.role}</h4>
                        </div>
                        <p className="text-realm-text-primary font-semibold">{cm.character.name} (Lv. {cm.character.level})</p>
                        <p className="text-realm-text-muted text-[10px]">Since {new Date(cm.appointedAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Appoint form */}
                <section>
                  <h2 className="text-xl font-display text-realm-text-primary mb-4">Appoint Official</h2>
                  <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="text-realm-text-muted text-xs mb-1 block">Character ID</label>
                        <input
                          type="text"
                          value={appointCharId}
                          onChange={(e) => setAppointCharId(e.target.value)}
                          placeholder="Enter character ID"
                          className="w-56 px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm placeholder:text-realm-text-muted/50 focus:border-realm-gold-500/50 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-realm-text-muted text-xs mb-1 block">Role</label>
                        <select
                          value={appointRole}
                          onChange={(e) => setAppointRole(e.target.value)}
                          className="px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm focus:border-realm-gold-500/50 focus:outline-none"
                        >
                          <option value="sheriff">Sheriff</option>
                          <option value="treasurer">Treasurer</option>
                          <option value="advisor">Advisor</option>
                          <option value="captain">Captain of the Guard</option>
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          if (appointCharId.trim() && townId) {
                            appointMutation.mutate({ characterId: appointCharId, role: appointRole, townId });
                          }
                        }}
                        disabled={appointMutation.isPending || !appointCharId.trim()}
                        className="px-5 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {appointMutation.isPending ? 'Appointing...' : 'Appoint'}
                      </button>
                    </div>
                    {appointMutation.isError && (
                      <p className="text-realm-danger text-xs mt-2">
                        {(appointMutation.error as any)?.response?.data?.error ?? 'Failed to appoint.'}
                      </p>
                    )}
                    {appointMutation.isSuccess && (
                      <p className="text-realm-success text-xs mt-2">Official appointed successfully.</p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* ============================================================= */}
            {/* TAB: War                                                       */}
            {/* ============================================================= */}
            {activeTab === 'war' && (
              <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-display text-realm-text-primary mb-4">Declare War</h2>
                  <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
                    <div className="bg-realm-danger/20 border border-realm-danger/30 rounded p-3 mb-4">
                      <p className="text-realm-danger text-xs flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        War declarations are serious actions. Only rulers can declare war on other kingdoms.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label className="text-realm-text-muted text-xs mb-1 block">Target Kingdom ID</label>
                        <input
                          type="text"
                          value={warTargetId}
                          onChange={(e) => setWarTargetId(e.target.value)}
                          placeholder="Enter kingdom ID"
                          className="w-56 px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm placeholder:text-realm-text-muted/50 focus:border-realm-gold-500/50 focus:outline-none"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-realm-text-muted text-xs mb-1 block">Reason (optional)</label>
                        <input
                          type="text"
                          value={warReason}
                          onChange={(e) => setWarReason(e.target.value)}
                          placeholder="Casus belli..."
                          className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm placeholder:text-realm-text-muted/50 focus:border-realm-gold-500/50 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (warTargetId.trim()) {
                            declareWarMutation.mutate({ targetKingdomId: warTargetId, reason: warReason || undefined });
                          }
                        }}
                        disabled={declareWarMutation.isPending || !warTargetId.trim()}
                        className="px-5 py-2 bg-realm-danger/40 text-realm-danger border border-realm-danger/40 font-display text-sm rounded hover:bg-realm-danger/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {declareWarMutation.isPending ? 'Declaring...' : 'Declare War'}
                      </button>
                    </div>
                    {declareWarMutation.isError && (
                      <p className="text-realm-danger text-xs mt-2">
                        {(declareWarMutation.error as any)?.response?.data?.error ?? 'Failed to declare war.'}
                      </p>
                    )}
                    {declareWarMutation.isSuccess && (
                      <p className="text-realm-danger text-xs mt-2">War declared.</p>
                    )}
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </div>

      {/* ================================================================= */}
      {/* MODAL: Propose Law                                                 */}
      {/* ================================================================= */}
      {showLawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowLawModal(false)}>
          <div className="bg-realm-bg-800 border border-realm-border rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display text-realm-gold-400">Propose New Law</h3>
              <button onClick={() => setShowLawModal(false)} className="text-realm-text-muted hover:text-realm-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-realm-text-muted text-xs mb-1 block">Title</label>
                <input
                  type="text"
                  value={lawTitle}
                  onChange={(e) => setLawTitle(e.target.value)}
                  placeholder="Law title..."
                  maxLength={200}
                  className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm placeholder:text-realm-text-muted/50 focus:border-realm-gold-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-realm-text-muted text-xs mb-1 block">Description</label>
                <textarea
                  value={lawDescription}
                  onChange={(e) => setLawDescription(e.target.value)}
                  placeholder="Describe the law..."
                  rows={3}
                  className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm placeholder:text-realm-text-muted/50 focus:border-realm-gold-500/50 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-realm-text-muted text-xs mb-1 block">Type</label>
                <select
                  value={lawType}
                  onChange={(e) => setLawType(e.target.value)}
                  className="w-full px-3 py-2 bg-realm-bg-900 border border-realm-border rounded text-realm-text-primary text-sm focus:border-realm-gold-500/50 focus:outline-none"
                >
                  <option value="general">General</option>
                  <option value="tax">Tax</option>
                  <option value="trade">Trade</option>
                  <option value="military">Military</option>
                  <option value="building">Building</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLawModal(false)}
                className="flex-1 py-2 border border-realm-text-muted/30 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => kingdomId && proposeLawMutation.mutate({ kingdomId, title: lawTitle, description: lawDescription || undefined, lawType })}
                disabled={proposeLawMutation.isPending || !lawTitle.trim()}
                className="flex-1 py-2 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {proposeLawMutation.isPending ? 'Proposing...' : 'Propose'}
              </button>
            </div>
            {proposeLawMutation.isError && (
              <p className="text-realm-danger text-xs mt-3 text-center">
                {(proposeLawMutation.error as any)?.response?.data?.error ?? 'Failed to propose law.'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
