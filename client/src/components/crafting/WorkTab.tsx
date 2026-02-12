import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Loader2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import ToolSlot from '../gathering/ToolSlot';
import type { EquippedTool } from '../gathering/ToolSlot';
import ToolSelector from '../gathering/ToolSelector';
import { professionLabel } from './RecipeList';

export interface WorkStatus {
  working: boolean;
  ready?: boolean;
  remainingMinutes?: number;
  resource?: string;
  profession?: string;
  startedAt?: string;
  completesAt?: string;
}

export interface TownResource {
  id: string;
  resourceType: string;
  resourceName: string;
  abundance: string;
}

export interface Profession {
  professionType: string;
  tier: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

const ABUNDANCE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  ABUNDANT:  { text: 'text-realm-success',  bg: 'bg-realm-success/15',  border: 'border-realm-success/30' },
  HIGH:      { text: 'text-realm-success',  bg: 'bg-realm-success/10',  border: 'border-realm-success/20' },
  MODERATE:  { text: 'text-realm-gold-400', bg: 'bg-realm-gold-400/10', border: 'border-realm-gold-400/20' },
  NORMAL:    { text: 'text-realm-text-secondary', bg: '', border: '' },
  LOW:       { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  SCARCE:    { text: 'text-realm-danger',    bg: 'bg-realm-danger/10',    border: 'border-realm-danger/20' },
  DEPLETED:  { text: 'text-realm-danger',    bg: 'bg-realm-danger/15',    border: 'border-realm-danger/30' },
};

function abundanceStyle(abundance: string) {
  const key = abundance?.toUpperCase() ?? 'NORMAL';
  return ABUNDANCE_COLORS[key] ?? ABUNDANCE_COLORS.NORMAL;
}

interface WorkTabProps {
  workStatus: WorkStatus | null;
  isLoading: boolean;
  townResources: TownResource[];
  professions: Profession[];
  selectedProfession: string;
  setSelectedProfession: (v: string) => void;
  selectedResource: string;
  setSelectedResource: (v: string) => void;
  onStartWork: () => void;
  isStarting: boolean;
  onCollect: () => void;
  isCollecting: boolean;
  onCancel: () => void;
  isCancelling: boolean;
  startError?: string;
  equippedTool: EquippedTool | null;
}

export default function WorkTab({
  workStatus,
  isLoading,
  townResources,
  professions,
  selectedProfession,
  setSelectedProfession,
  selectedResource,
  setSelectedResource,
  onStartWork,
  isStarting,
  onCollect,
  isCollecting,
  onCancel,
  isCancelling,
  startError,
  equippedTool,
}: WorkTabProps) {
  const [now, setNow] = useState(Date.now());
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workStatus?.working || workStatus.ready) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [workStatus?.working, workStatus?.ready]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  // If currently working, show progress
  if (workStatus?.working) {
    const completesAt = workStatus.completesAt ? new Date(workStatus.completesAt).getTime() : 0;
    const startedAt = workStatus.startedAt ? new Date(workStatus.startedAt).getTime() : 0;
    const totalDuration = completesAt - startedAt;
    const elapsed = now - startedAt;
    const progress = workStatus.ready ? 100 : Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    const remaining = workStatus.ready ? 0 : Math.max(0, completesAt - now);
    const remainingMinutes = Math.ceil(remaining / 60000);
    const remainingSeconds = Math.ceil(remaining / 1000) % 60;

    return (
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          {workStatus.ready ? (
            <CheckCircle2 className="w-6 h-6 text-realm-success" />
          ) : (
            <Loader2 className="w-6 h-6 text-realm-success animate-spin" />
          )}
          <div className="flex-1">
            <h3 className="font-display text-lg text-realm-text-primary">
              Gathering {workStatus.resource ?? '...'}
            </h3>
            <p className="text-xs text-realm-text-muted">
              {workStatus.profession ? professionLabel(workStatus.profession) : ''}
              {workStatus.ready ? ' - Ready to collect!' : ` - ${remainingMinutes}m ${remainingSeconds}s remaining`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-realm-bg-900 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              workStatus.ready ? 'bg-realm-success' : 'bg-realm-success/80'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex gap-3">
          {workStatus.ready ? (
            <button
              onClick={onCollect}
              disabled={isCollecting}
              className="flex-1 py-3 bg-realm-success text-realm-text-primary font-display text-base rounded
                hover:bg-realm-success/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCollecting ? 'Collecting...' : 'Collect Resources'}
            </button>
          ) : (
            <>
              {showCancelConfirm ? (
                <div className="flex-1 flex gap-2">
                  <button
                    onClick={() => { onCancel(); setShowCancelConfirm(false); }}
                    disabled={isCancelling}
                    className="flex-1 py-2.5 bg-realm-danger text-realm-text-primary font-display text-sm rounded
                      hover:bg-realm-danger/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Cancel
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-4 py-2.5 border border-realm-text-muted/30 text-realm-text-secondary font-display text-sm rounded hover:bg-realm-bg-800 transition-colors"
                  >
                    Keep Working
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex-1 py-2.5 border border-realm-danger/40 text-realm-danger font-display text-sm rounded
                    hover:bg-realm-danger/10 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Gathering
                </button>
              )}
            </>
          )}
        </div>

        {showCancelConfirm && !workStatus.ready && (
          <p className="text-[10px] text-realm-text-muted mt-2 text-center">
            Cancelling early may yield partial resources or none at all.
          </p>
        )}
      </div>
    );
  }

  // Not working -- show resource selection
  const gatheringProfessionTypes = ['FARMER', 'RANCHER', 'FISHERMAN', 'LUMBERJACK', 'MINER', 'HERBALIST', 'HUNTER'];
  const availableProfessions = gatheringProfessionTypes.filter(
    (pt) => professions.some((p) => p.professionType === pt) || true
  );

  return (
    <div className="space-y-6">
      {startError && (
        <div className="p-3 bg-realm-danger/20 border border-realm-danger/50 rounded text-realm-danger text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {startError}
        </div>
      )}

      {/* Profession selector */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
        <h3 className="font-display text-realm-gold-400 text-sm mb-3">Select Profession</h3>
        <div className="flex flex-wrap gap-2">
          {availableProfessions.map((pt) => {
            const prof = professions.find((p) => p.professionType === pt);
            const isSelected = selectedProfession === pt;
            return (
              <button
                key={pt}
                onClick={() => setSelectedProfession(pt)}
                className={`px-3 py-1.5 text-xs font-display rounded border transition-colors
                  ${isSelected
                    ? 'bg-realm-gold-500 text-realm-bg-900 border-realm-gold-500'
                    : 'bg-realm-bg-800 text-realm-text-secondary border-realm-border hover:border-realm-gold-400/40'}`}
              >
                {professionLabel(pt)}
                {prof && <span className="ml-1 opacity-70">Lv.{prof.level}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tool slot */}
      {selectedProfession && (
        <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
          <h3 className="font-display text-realm-gold-400 text-sm mb-3">Equipped Tool</h3>
          <ToolSlot
            tool={equippedTool}
            onClick={() => setShowToolSelector(true)}
          />
        </div>
      )}

      {/* Tool selector modal */}
      {showToolSelector && selectedProfession && (
        <ToolSelector
          professionType={selectedProfession}
          currentTool={equippedTool}
          onClose={() => setShowToolSelector(false)}
          onEquipped={() => {
            queryClient.invalidateQueries({ queryKey: ['tools', 'equipped', selectedProfession] });
          }}
        />
      )}

      {/* Available resources */}
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
        <h3 className="font-display text-realm-gold-400 text-sm mb-3">Available Resources</h3>
        {townResources.length === 0 ? (
          <p className="text-realm-text-muted text-xs">No resources available in this town.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {townResources.map((tr) => {
              const isSelected = selectedResource === tr.id;
              const aStyle = abundanceStyle(tr.abundance);
              return (
                <button
                  key={tr.id}
                  onClick={() => setSelectedResource(tr.id)}
                  className={`p-3 text-left rounded border transition-all
                    ${isSelected
                      ? 'border-realm-gold-400 bg-realm-gold-400/10'
                      : `border-realm-border bg-realm-bg-800/50 hover:border-realm-border/80 ${aStyle.bg}`}`}
                >
                  <p className="text-sm text-realm-text-primary">{tr.resourceName}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-realm-text-muted capitalize">{tr.resourceType.toLowerCase()}</span>
                    <span className={`text-[10px] capitalize font-display ${aStyle.text}`}>
                      {tr.abundance?.toLowerCase() ?? 'normal'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Start work button */}
      <button
        onClick={onStartWork}
        disabled={!selectedProfession || !selectedResource || isStarting}
        className="w-full py-3 bg-realm-success text-realm-text-primary font-display text-base rounded
          hover:bg-realm-success/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isStarting ? 'Starting...' : 'Start Working'}
      </button>
    </div>
  );
}
