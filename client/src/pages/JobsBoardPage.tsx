import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, User, Coins, Package, Award, ScrollText, Shield, XCircle } from 'lucide-react';
import { Link } from 'react-router';
import api from '../services/api';
import { RealmPanel, RealmButton, RealmBadge, PageHeader } from '../components/ui/realm-index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface JobListing {
  id: string;
  category: string;
  jobType: string;
  jobLabel: string;
  title: string;
  pay: number;
  assetId: string;
  assetName: string;
  assetType: string;
  assetTier: number;
  professionType: string;
  ownerName: string;
  ownerId: string;
  autoPosted: boolean;
  createdAt: string;
}

interface MyJob {
  id: string;
  category: string;
  jobType: string;
  jobLabel: string;
  title: string;
  pay: number;
  assetId: string;
  assetName: string;
  status: string;
  autoPosted: boolean;
  createdAt: string;
}

interface JobsResponse {
  jobs: JobListing[];
}

interface MyJobsResponse {
  jobs: MyJob[];
}

interface AcceptResult {
  success: boolean;
  job: { id: string; jobType: string; assetName: string };
  reward: {
    gold: number;
    items: { name: string; quantity: number } | null;
    xp: number;
    professionMatch: boolean;
  };
}

interface ActionStatusResponse {
  gameDay: number;
  actionUsed: boolean;
  actionType: string | null;
}

// ---------------------------------------------------------------------------
// Tier helpers
// ---------------------------------------------------------------------------
const TIER_COLORS: Record<number, string> = {
  1: 'text-realm-bronze-400 border-realm-bronze-400/50 bg-realm-bronze-400/10',
  2: 'text-realm-gold-400 border-realm-gold-500/50 bg-realm-gold-500/10',
  3: 'text-realm-teal-300 border-realm-teal-300/50 bg-realm-teal-300/10',
};

function TierBadge({ tier }: { tier: number }) {
  const colorClass = TIER_COLORS[tier] ?? 'text-realm-text-muted border-realm-border';
  return (
    <span className={`text-[10px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${colorClass}`}>
      T{tier}
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'text-realm-success',
  COMPLETED: 'text-realm-text-muted',
  CANCELLED: 'text-realm-danger',
  EXPIRED: 'text-realm-warning',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function JobsBoardPage() {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<AcceptResult | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'mine'>('browse');

  // Fetch character for current town
  const { data: character } = useQuery<{
    id: string;
    name: string;
    currentTownId: string | null;
  }>({
    queryKey: ['character', 'me'],
    queryFn: async () => (await api.get('/characters/me')).data,
  });

  const townId = character?.currentTownId;

  // Fetch town name
  const { data: town } = useQuery<{ id: string; name: string }>({
    queryKey: ['town', townId],
    queryFn: async () => {
      const res = await api.get(`/towns/${townId}`);
      return res.data.town ?? res.data;
    },
    enabled: !!townId,
  });

  // Fetch open jobs for this town
  const {
    data: jobsData,
    isLoading,
    error,
  } = useQuery<JobsResponse>({
    queryKey: ['jobs', 'town', townId],
    queryFn: async () => (await api.get(`/jobs/town/${townId}`)).data,
    enabled: !!townId,
  });

  // Fetch my jobs
  const { data: myJobsData, isLoading: myJobsLoading } = useQuery<MyJobsResponse>({
    queryKey: ['jobs', 'mine'],
    queryFn: async () => (await api.get('/jobs/mine')).data,
    enabled: activeTab === 'mine',
  });

  // Check daily action status
  const { data: actionStatus } = useQuery<ActionStatusResponse>({
    queryKey: ['game', 'action-status'],
    queryFn: async () => (await api.get('/game/action-status')).data,
    enabled: !!townId,
    refetchInterval: 60_000,
  });

  // Accept job mutation
  const acceptMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await api.post(`/jobs/${jobId}/accept`);
      return res.data as AcceptResult;
    },
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      queryClient.invalidateQueries({ queryKey: ['game', 'action-status'] });
    },
  });

  // Cancel job mutation
  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await api.post(`/jobs/${jobId}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });

  const jobs = jobsData?.jobs ?? [];
  const myJobs = myJobsData?.jobs ?? [];
  const actionUsed = actionStatus?.actionUsed ?? false;
  const townName = town?.name ?? 'this town';

  // -------------------------------------------------------------------------
  // Loading / error
  // -------------------------------------------------------------------------
  if (!townId) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <PageHeader title="Jobs Board" icon={<Briefcase className="w-8 h-8 text-realm-gold-400" />} />
        <RealmPanel title="Jobs Board">
          <p className="text-xs text-realm-text-muted">You must be in a town to view jobs.</p>
        </RealmPanel>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <PageHeader title={`Jobs Board \u2014 ${townName}`} icon={<Briefcase className="w-8 h-8 text-realm-gold-400" />} />

      {/* Success toast */}
      {lastResult && (
        <div className="bg-realm-success/10 border border-realm-success/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-realm-success" />
            <span className="text-sm font-display text-realm-success">Job Completed!</span>
            {!lastResult.reward.professionMatch && (
              <RealmBadge variant="uncommon">Non-matching (50%)</RealmBadge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-realm-text-secondary">
            {lastResult.reward.gold > 0 && (
              <span className="flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-realm-gold-400" />
                <span className="text-realm-gold-400">{lastResult.reward.gold}g</span> earned
              </span>
            )}
            {lastResult.reward.items && (
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-realm-teal-300" />
                {lastResult.reward.items.quantity}x {lastResult.reward.items.name}
              </span>
            )}
            {lastResult.reward.xp > 0 && (
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-realm-purple-300" />
                +{lastResult.reward.xp} XP
              </span>
            )}
          </div>
          <button
            onClick={() => setLastResult(null)}
            className="text-[10px] text-realm-text-muted hover:text-realm-text-secondary mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Daily action warning */}
      {actionUsed && activeTab === 'browse' && (
        <div className="bg-realm-warning/10 border border-realm-warning/30 rounded-lg px-4 py-3">
          <p className="text-xs text-realm-warning">
            Daily action already used. You cannot accept jobs until the next tick.
          </p>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-3 py-1.5 rounded-md text-xs font-display transition-colors ${
            activeTab === 'browse'
              ? 'bg-realm-gold-500/20 text-realm-gold-400 border border-realm-gold-500/30'
              : 'bg-realm-bg-800 text-realm-text-muted hover:text-realm-text-secondary border border-realm-bg-600'
          }`}
        >
          Available Jobs
        </button>
        <button
          onClick={() => setActiveTab('mine')}
          className={`px-3 py-1.5 rounded-md text-xs font-display transition-colors ${
            activeTab === 'mine'
              ? 'bg-realm-gold-500/20 text-realm-gold-400 border border-realm-gold-500/30'
              : 'bg-realm-bg-800 text-realm-text-muted hover:text-realm-text-secondary border border-realm-bg-600'
          }`}
        >
          My Jobs
        </button>
      </div>

      {/* Browse tab */}
      {activeTab === 'browse' && (
        <RealmPanel title="Available Jobs" className="relative">
          {jobs.length > 0 && (
            <div className="absolute top-3 right-5">
              <RealmBadge variant="default">{jobs.length}</RealmBadge>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              <div className="h-20 bg-realm-bg-800 rounded-sm animate-pulse" />
              <div className="h-20 bg-realm-bg-800 rounded-sm animate-pulse" />
            </div>
          ) : error ? (
            <p className="text-xs text-realm-danger">Failed to load job listings.</p>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8">
              <ScrollText className="w-8 h-8 text-realm-text-muted mx-auto mb-3 opacity-50" />
              <p className="text-sm text-realm-text-muted">No jobs posted right now.</p>
              <p className="text-xs text-realm-text-muted mt-1">Check back later or ask local property owners for work.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const isOwnJob = job.ownerId === character?.id;

                return (
                  <div
                    key={job.id}
                    className="bg-realm-bg-800 border border-realm-bg-600 hover:border-realm-gold-500/30 rounded-lg p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Job title + tier */}
                        <div className="flex items-center gap-2 mb-1">
                          <Briefcase className="w-4 h-4 text-realm-gold-400 flex-shrink-0" />
                          <span className="text-sm font-display text-realm-text-primary">
                            {job.jobLabel}
                          </span>
                          <TierBadge tier={job.assetTier} />
                        </div>

                        {/* Asset name + owner */}
                        <div className="flex items-center gap-2 text-[11px] mb-1">
                          <span className="text-realm-text-secondary">{job.assetName}</span>
                          <span className="text-realm-text-muted">&middot;</span>
                          <User className="w-3 h-3 text-realm-text-muted" />
                          <span className="text-realm-text-muted">{job.ownerName}</span>
                        </div>

                        {/* Pay with escrow indicator */}
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5 text-realm-gold-400" />
                          <span className="text-sm font-display text-realm-gold-400">{job.pay}g</span>
                          <span className="text-[11px] text-realm-text-muted flex items-center gap-1">
                            <Shield className="w-3 h-3 text-realm-success" />
                            guaranteed
                          </span>
                          <span className="text-[11px] text-realm-text-muted ml-2 capitalize">
                            {job.professionType?.toLowerCase()}
                          </span>
                        </div>
                      </div>

                      {/* Accept button */}
                      <RealmButton
                        variant="primary"
                        size="sm"
                        onClick={() => acceptMutation.mutate(job.id)}
                        disabled={acceptMutation.isPending || actionUsed || isOwnJob}
                        title={
                          isOwnJob
                            ? 'Cannot accept your own job'
                            : actionUsed
                              ? 'Daily action already used'
                              : 'Accept this job (uses daily action)'
                        }
                      >
                        {acceptMutation.isPending ? 'Working...' : 'Accept Job'}
                      </RealmButton>
                    </div>
                  </div>
                );
              })}

              {acceptMutation.isError && (
                <p className="text-xs text-realm-danger mt-2">
                  {(acceptMutation.error as any)?.response?.data?.error || 'Failed to accept job.'}
                </p>
              )}
            </div>
          )}
        </RealmPanel>
      )}

      {/* My Jobs tab */}
      {activeTab === 'mine' && (
        <RealmPanel title="My Jobs">
          {myJobsLoading ? (
            <div className="space-y-3">
              <div className="h-16 bg-realm-bg-800 rounded-sm animate-pulse" />
              <div className="h-16 bg-realm-bg-800 rounded-sm animate-pulse" />
            </div>
          ) : myJobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-8 h-8 text-realm-text-muted mx-auto mb-3 opacity-50" />
              <p className="text-sm text-realm-text-muted">You haven't posted any jobs.</p>
              <p className="text-xs text-realm-text-muted mt-1">
                Post jobs from your <Link to="/housing" className="text-realm-gold-400 hover:underline">Properties</Link> page.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-realm-bg-800 border border-realm-bg-600 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="w-4 h-4 text-realm-gold-400 flex-shrink-0" />
                        <span className="text-sm font-display text-realm-text-primary">
                          {job.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-realm-text-secondary">{job.assetName}</span>
                        <span className="text-realm-text-muted">&middot;</span>
                        <Coins className="w-3 h-3 text-realm-gold-400" />
                        <span className="text-realm-gold-400">{job.pay}g</span>
                        <span className="text-realm-text-muted">&middot;</span>
                        <span className={STATUS_COLORS[job.status] ?? 'text-realm-text-muted'}>
                          {job.status}
                        </span>
                      </div>
                    </div>

                    {job.status === 'OPEN' && (
                      <button
                        onClick={() => cancelMutation.mutate(job.id)}
                        disabled={cancelMutation.isPending}
                        className="text-realm-text-muted hover:text-realm-danger transition-colors"
                        title="Cancel job (gold refunded)"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {cancelMutation.isError && (
                <p className="text-xs text-realm-danger mt-2">
                  {(cancelMutation.error as any)?.response?.data?.error || 'Failed to cancel job.'}
                </p>
              )}
            </div>
          )}
        </RealmPanel>
      )}
    </div>
  );
}
