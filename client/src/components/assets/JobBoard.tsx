import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, User, LogOut } from 'lucide-react';
import api from '../../services/api';
import { RealmPanel, RealmButton } from '../ui/realm-index';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface JobListing {
  id: string;
  wage: number;
  ownerName: string;
  assetName: string;
  assetTier: number;
  assetType: string;
}

interface JobsResponse {
  jobs: JobListing[];
}

interface CurrentJob {
  id: string;
  wage: number;
  ownerName: string;
  assetName: string;
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
    <span className={`text-[10px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded border ${colorClass}`}>
      T{tier}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main JobBoard
// ---------------------------------------------------------------------------
interface JobBoardProps {
  townId: string;
  characterId: string;
}

export default function JobBoard({ townId, characterId }: JobBoardProps) {
  const queryClient = useQueryClient();

  // -------------------------------------------------------------------------
  // Data queries
  // -------------------------------------------------------------------------
  const {
    data: jobsData,
    isLoading,
    error,
  } = useQuery<JobsResponse>({
    queryKey: ['jobs', townId],
    queryFn: async () => {
      const res = await api.get('/assets/jobs');
      return res.data;
    },
    enabled: !!townId,
  });

  // Check if the character already has a current job by looking at assets/mine
  // The backend may return a currentJob field; we try to parse it from the response.
  const { data: assetsData } = useQuery<{ currentJob?: CurrentJob | null }>({
    queryKey: ['assets', 'mine'],
    queryFn: async () => {
      const res = await api.get('/assets/mine');
      return res.data;
    },
    enabled: !!townId,
  });

  const currentJob = (assetsData as any)?.currentJob ?? null;
  const jobs = jobsData?.jobs ?? [];

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------
  const acceptJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await api.post(`/assets/jobs/${jobId}/accept`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  const quitJobMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/assets/jobs/quit');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  // -------------------------------------------------------------------------
  // Loading / error state
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <RealmPanel title="Available Jobs">
        <div className="space-y-3">
          <div className="h-16 bg-realm-bg-800 rounded animate-pulse" />
          <div className="h-16 bg-realm-bg-800 rounded animate-pulse" />
        </div>
      </RealmPanel>
    );
  }

  if (error) {
    return (
      <RealmPanel title="Available Jobs">
        <p className="text-xs text-realm-danger">Failed to load job listings.</p>
      </RealmPanel>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <RealmPanel title="Available Jobs" className="relative">
      {/* Job count badge */}
      {jobs.length > 0 && (
        <div className="absolute top-3 right-5">
          <span className="text-[10px] font-display uppercase tracking-wider px-1.5 py-0.5 rounded border border-realm-text-muted/50 text-realm-text-secondary">
            {jobs.length}
          </span>
        </div>
      )}

      {/* Current Job */}
      {currentJob && (
        <div className="bg-realm-gold-500/5 border border-realm-gold-500/20 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-4 h-4 text-realm-gold-400 flex-shrink-0" />
            <span className="text-xs font-display text-realm-gold-400 uppercase tracking-wider">
              Current Employment
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-realm-text-primary">
                Working at{' '}
                <span className="text-realm-text-secondary">{currentJob.ownerName}'s</span>{' '}
                <span className="font-display text-realm-gold-400">{currentJob.assetName}</span>
              </p>
              <p className="text-[11px] text-realm-text-muted mt-0.5">
                <span className="text-realm-gold-400">{currentJob.wage}g</span>/harvest
              </p>
            </div>
            <RealmButton
              variant="danger"
              size="sm"
              onClick={() => quitJobMutation.mutate()}
              disabled={quitJobMutation.isPending}
            >
              <LogOut className="w-3 h-3 inline mr-1" />
              {quitJobMutation.isPending ? 'Quitting...' : 'Quit'}
            </RealmButton>
          </div>
          {quitJobMutation.isError && (
            <p className="text-xs text-realm-danger mt-2">
              {(quitJobMutation.error as any)?.response?.data?.error || 'Failed to quit job.'}
            </p>
          )}
        </div>
      )}

      {/* Job listings */}
      {jobs.length === 0 ? (
        <p className="text-xs text-realm-text-muted">No jobs available in this town.</p>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-realm-bg-800 border border-realm-bg-600 hover:border-realm-gold-500/30 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-display text-realm-text-primary truncate">
                      {job.assetName}
                    </span>
                    <TierBadge tier={job.assetTier} />
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <User className="w-3 h-3 text-realm-text-muted" />
                    <span className="text-realm-text-muted">{job.ownerName}</span>
                    <span className="text-realm-text-muted">&middot;</span>
                    <span className="text-realm-text-muted capitalize">
                      {job.assetType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm mt-1">
                    <span className="text-realm-gold-400 font-display">{job.wage}g</span>
                    <span className="text-realm-text-muted text-[11px]"> per harvest</span>
                  </p>
                </div>

                <RealmButton
                  variant="primary"
                  size="sm"
                  onClick={() => acceptJobMutation.mutate(job.id)}
                  disabled={acceptJobMutation.isPending || !!currentJob}
                >
                  {acceptJobMutation.isPending ? 'Accepting...' : 'Accept Job'}
                </RealmButton>
              </div>
            </div>
          ))}

          {acceptJobMutation.isError && (
            <p className="text-xs text-realm-danger mt-2">
              {(acceptJobMutation.error as any)?.response?.data?.error || 'Failed to accept job.'}
            </p>
          )}
        </div>
      )}
    </RealmPanel>
  );
}
