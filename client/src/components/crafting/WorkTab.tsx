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
  ABUNDANT:  { text: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30' },
  HIGH:      { text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20' },
  MODERATE:  { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  NORMAL:    { text: 'text-parchment-400', bg: '', border: '' },
  LOW:       { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  SCARCE:    { text: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
  DEPLETED:  { text: 'text-red-500',    bg: 'bg-red-500/15',    border: 'border-red-500/30' },
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
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
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
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          {workStatus.ready ? (
            <CheckCircle2 className="w-6 h-6 text-green-400" />
          ) : (
            <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
          )}
          <div className="flex-1">
            <h3 className="font-display text-lg text-parchment-200">
              Gathering {workStatus.resource ?? '...'}
            </h3>
            <p className="text-xs text-parchment-500">
              {workStatus.profession ? professionLabel(workStatus.profession) : ''}
              {workStatus.ready ? ' - Ready to collect!' : ` - ${remainingMinutes}m ${remainingSeconds}s remaining`}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-dark-500 rounded-full overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              workStatus.ready ? 'bg-green-500' : 'bg-green-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex gap-3">
          {workStatus.ready ? (
            <button
              onClick={onCollect}
              disabled={isCollecting}
              className="flex-1 py-3 bg-green-600 text-white font-display text-base rounded
                hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="flex-1 py-2.5 bg-red-700 text-white font-display text-sm rounded
                      hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm Cancel
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-4 py-2.5 border border-parchment-500/30 text-parchment-300 font-display text-sm rounded hover:bg-dark-400 transition-colors"
                  >
                    Keep Working
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="flex-1 py-2.5 border border-red-500/40 text-red-400 font-display text-sm rounded
                    hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel Gathering
                </button>
              )}
            </>
          )}
        </div>

        {showCancelConfirm && !workStatus.ready && (
          <p className="text-[10px] text-parchment-500 mt-2 text-center">
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
        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {startError}
        </div>
      )}

      {/* Profession selector */}
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
        <h3 className="font-display text-primary-400 text-sm mb-3">Select Profession</h3>
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
                    ? 'bg-primary-400 text-dark-500 border-primary-400'
                    : 'bg-dark-400 text-parchment-300 border-dark-50 hover:border-primary-400/40'}`}
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
        <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
          <h3 className="font-display text-primary-400 text-sm mb-3">Equipped Tool</h3>
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
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
        <h3 className="font-display text-primary-400 text-sm mb-3">Available Resources</h3>
        {townResources.length === 0 ? (
          <p className="text-parchment-500 text-xs">No resources available in this town.</p>
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
                      ? 'border-primary-400 bg-primary-400/10'
                      : `border-dark-50 bg-dark-400/50 hover:border-dark-50/80 ${aStyle.bg}`}`}
                >
                  <p className="text-sm text-parchment-200">{tr.resourceName}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-parchment-500 capitalize">{tr.resourceType.toLowerCase()}</span>
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
        className="w-full py-3 bg-forest text-white font-display text-base rounded
          hover:bg-forest-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isStarting ? 'Starting...' : 'Start Working'}
      </button>
    </div>
  );
}
