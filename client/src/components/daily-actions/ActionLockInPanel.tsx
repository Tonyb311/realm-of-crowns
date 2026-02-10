import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Pickaxe,
  Hammer,
  MapPin,
  Shield,
  Crosshair,
  ScrollText,
  Scale,
  BedDouble,
  Loader2,
  Lock,
  X,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionType = 'GATHER' | 'CRAFT' | 'TRAVEL' | 'GUARD' | 'AMBUSH' | 'ENLIST' | 'PROPOSE_LAW' | 'REST';

interface AvailableAction {
  type: ActionType;
  available: boolean;
  reason?: string;
}

interface AvailableActionsResponse {
  actions: AvailableAction[];
  resources?: { id: string; resourceName: string; resourceType: string }[];
  recipes?: { id: string; name: string; professionType: string }[];
  connectedNodes?: { id: string; name: string; type: string; dangerLevel: number }[];
}

interface LockedAction {
  id: string;
  actionType: ActionType;
  actionTarget: Record<string, unknown>;
  lockedAt: string;
}

// ---------------------------------------------------------------------------
// Action config
// ---------------------------------------------------------------------------

const ACTION_CONFIG: Record<ActionType, { label: string; icon: typeof Pickaxe; color: string }> = {
  GATHER:      { label: 'Gather',      icon: Pickaxe,    color: 'text-green-400' },
  CRAFT:       { label: 'Craft',       icon: Hammer,     color: 'text-blue-400' },
  TRAVEL:      { label: 'Travel',      icon: MapPin,     color: 'text-yellow-400' },
  GUARD:       { label: 'Guard',       icon: Shield,     color: 'text-cyan-400' },
  AMBUSH:      { label: 'Ambush',      icon: Crosshair,  color: 'text-red-400' },
  ENLIST:      { label: 'Enlist',      icon: ScrollText,  color: 'text-purple-400' },
  PROPOSE_LAW: { label: 'Propose Law', icon: Scale,      color: 'text-amber-400' },
  REST:        { label: 'Rest',        icon: BedDouble,  color: 'text-parchment-400' },
};

const TOAST_STYLE = {
  background: '#1a1a2e',
  color: '#e8d5b7',
  border: '1px solid #c9a84c',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ActionLockInPanel() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<ActionType | null>(null);
  const [actionTarget, setActionTarget] = useState<Record<string, unknown>>({});

  // Fetch available actions
  const { data: available, isLoading: loadingAvailable } = useQuery<AvailableActionsResponse>({
    queryKey: ['actions', 'available'],
    queryFn: async () => {
      const res = await api.get('/actions/available');
      return res.data;
    },
  });

  // Fetch current locked action
  const { data: currentAction, isLoading: loadingCurrent } = useQuery<{ action: LockedAction | null; defaultAction?: string }>({
    queryKey: ['actions', 'current'],
    queryFn: async () => {
      const res = await api.get('/actions/current');
      return res.data;
    },
  });

  // Fetch connected nodes for TRAVEL / GUARD / AMBUSH
  const { data: nodesData } = useQuery<{ currentNodeId: string | null; nodes: { id: string; name: string; type: string; dangerLevel: number }[] }>({
    queryKey: ['travel', 'nodes'],
    queryFn: async () => {
      const res = await api.get('/travel/nodes');
      return res.data;
    },
    enabled: selectedType === 'TRAVEL' || selectedType === 'GUARD' || selectedType === 'AMBUSH',
  });

  // Lock-in mutation
  const lockInMutation = useMutation({
    mutationFn: async ({ actionType, target }: { actionType: ActionType; target: Record<string, unknown> }) => {
      const res = await api.post('/actions/lock-in', {
        actionType,
        actionTarget: target,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions', 'current'] });
      queryClient.invalidateQueries({ queryKey: ['actions', 'available'] });
      setSelectedType(null);
      setActionTarget({});
      toast.success('Action locked in!', { style: TOAST_STYLE });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to lock in action', { style: TOAST_STYLE });
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete('/actions/current');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions', 'current'] });
      queryClient.invalidateQueries({ queryKey: ['actions', 'available'] });
      toast.success('Action cancelled. You will Rest by default.', { style: TOAST_STYLE });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error ?? 'Failed to cancel action', { style: TOAST_STYLE });
    },
  });

  const isLoading = loadingAvailable || loadingCurrent;
  const locked = currentAction?.action;
  const actions = available?.actions ?? [];

  if (isLoading) {
    return (
      <div className="bg-dark-300 border border-dark-50 rounded-lg p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary-400 animate-spin" />
      </div>
    );
  }

  // If there is a locked action, show it
  if (locked) {
    const cfg = ACTION_CONFIG[locked.actionType];
    const Icon = cfg.icon;
    return (
      <div className="bg-dark-300 border border-primary-400/30 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-primary-400" />
          <h3 className="font-display text-primary-400 text-sm">Action Locked</h3>
        </div>

        <div className="flex items-center gap-3 p-4 bg-dark-400 border border-dark-50 rounded-lg mb-4">
          <Icon className={`w-6 h-6 ${cfg.color}`} />
          <div className="flex-1">
            <p className={`font-display text-lg ${cfg.color}`}>{cfg.label}</p>
            {locked.actionTarget && Object.keys(locked.actionTarget).length > 0 && (
              <p className="text-parchment-500 text-xs mt-0.5">
                {formatTarget(locked.actionTarget)}
              </p>
            )}
          </div>
          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedType(locked.actionType);
              setActionTarget(locked.actionTarget);
            }}
            className="flex-1 py-2 border border-primary-400/40 text-primary-400 font-display text-sm rounded hover:bg-dark-400 transition-colors"
          >
            Change
          </button>
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="flex-1 py-2 border border-red-500/40 text-red-400 font-display text-sm rounded hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
          </button>
        </div>
      </div>
    );
  }

  // No locked action: show action selector
  return (
    <div className="bg-dark-300 border border-dark-50 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-primary-400 text-sm">Choose Daily Action</h3>
        <span className="text-[10px] text-parchment-500 bg-dark-400 px-2 py-0.5 rounded">
          Default: REST
        </span>
      </div>

      {/* Action type grid */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {actions.map((action) => {
          const cfg = ACTION_CONFIG[action.type];
          const Icon = cfg.icon;
          const isSelected = selectedType === action.type;
          const isDisabled = !action.available;

          return (
            <button
              key={action.type}
              onClick={() => {
                if (!isDisabled) {
                  setSelectedType(action.type);
                  setActionTarget({});
                }
              }}
              disabled={isDisabled}
              title={action.reason ?? cfg.label}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-display transition-all
                ${isSelected
                  ? `border-primary-400 bg-primary-400/10 ${cfg.color}`
                  : isDisabled
                    ? 'border-dark-50 bg-dark-400/30 text-parchment-500/30 cursor-not-allowed'
                    : 'border-dark-50 bg-dark-400/50 text-parchment-300 hover:border-primary-400/40'}`}
            >
              <Icon className="w-5 h-5" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Context sub-panel */}
      {selectedType && selectedType !== 'REST' && (
        <div className="mb-4">
          {selectedType === 'GATHER' && (
            <GatherSubPanel
              resources={available?.resources ?? []}
              target={actionTarget}
              onChange={setActionTarget}
            />
          )}
          {selectedType === 'CRAFT' && (
            <CraftSubPanel
              recipes={available?.recipes ?? []}
              target={actionTarget}
              onChange={setActionTarget}
            />
          )}
          {(selectedType === 'TRAVEL' || selectedType === 'GUARD' || selectedType === 'AMBUSH') && (
            <NodeSubPanel
              nodes={nodesData?.nodes ?? []}
              target={actionTarget}
              onChange={setActionTarget}
              actionLabel={ACTION_CONFIG[selectedType].label}
            />
          )}
          {selectedType === 'ENLIST' && (
            <p className="text-parchment-500 text-xs p-3 bg-dark-400 rounded-lg">
              You will enlist in available military service for the day.
            </p>
          )}
          {selectedType === 'PROPOSE_LAW' && (
            <p className="text-parchment-500 text-xs p-3 bg-dark-400 rounded-lg">
              You will spend the day drafting a new law proposal.
            </p>
          )}
        </div>
      )}

      {/* Lock in button */}
      {selectedType && (
        <button
          onClick={() => lockInMutation.mutate({ actionType: selectedType, target: actionTarget })}
          disabled={lockInMutation.isPending}
          className="w-full py-3 bg-primary-400 text-dark-500 font-display text-sm rounded hover:bg-primary-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {lockInMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Locking In...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Lock In {ACTION_CONFIG[selectedType].label}
            </>
          )}
        </button>
      )}

      {lockInMutation.isError && (
        <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {(lockInMutation.error as any)?.response?.data?.error ?? 'Failed to lock in action'}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-panels
// ---------------------------------------------------------------------------

function GatherSubPanel({
  resources,
  target,
  onChange,
}: {
  resources: { id: string; resourceName: string; resourceType: string }[];
  target: Record<string, unknown>;
  onChange: (t: Record<string, unknown>) => void;
}) {
  return (
    <div className="p-3 bg-dark-400 rounded-lg space-y-3">
      <p className="text-[10px] text-parchment-500 uppercase tracking-wider">Select Resource</p>
      {resources.length === 0 ? (
        <p className="text-parchment-500 text-xs">No resources available in your location.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {resources.map((r) => (
            <button
              key={r.id}
              onClick={() => onChange({ ...target, resourceId: r.id, resourceName: r.resourceName })}
              className={`p-2 text-left rounded border text-xs transition-all
                ${target.resourceId === r.id
                  ? 'border-green-500 bg-green-500/10 text-green-400'
                  : 'border-dark-50 text-parchment-300 hover:border-green-500/40'}`}
            >
              <span className="font-display">{r.resourceName}</span>
              <span className="block text-[10px] text-parchment-500 capitalize">{r.resourceType.toLowerCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CraftSubPanel({
  recipes,
  target,
  onChange,
}: {
  recipes: { id: string; name: string; professionType: string }[];
  target: Record<string, unknown>;
  onChange: (t: Record<string, unknown>) => void;
}) {
  return (
    <div className="p-3 bg-dark-400 rounded-lg space-y-3">
      <p className="text-[10px] text-parchment-500 uppercase tracking-wider">Select Recipe</p>
      {recipes.length === 0 ? (
        <p className="text-parchment-500 text-xs">No recipes available.</p>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {recipes.map((r) => (
            <button
              key={r.id}
              onClick={() => onChange({ ...target, recipeId: r.id, recipeName: r.name })}
              className={`w-full p-2 text-left rounded border text-xs transition-all
                ${target.recipeId === r.id
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-dark-50 text-parchment-300 hover:border-blue-500/40'}`}
            >
              <span className="font-display">{r.name}</span>
              <span className="ml-2 text-[10px] text-parchment-500">{r.professionType}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NodeSubPanel({
  nodes,
  target,
  onChange,
  actionLabel,
}: {
  nodes: { id: string; name: string; type: string; dangerLevel: number }[];
  target: Record<string, unknown>;
  onChange: (t: Record<string, unknown>) => void;
  actionLabel: string;
}) {
  const dangerColor = (level: number) => {
    if (level <= 2) return 'text-green-400';
    if (level <= 5) return 'text-yellow-400';
    if (level <= 7) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="p-3 bg-dark-400 rounded-lg space-y-3">
      <p className="text-[10px] text-parchment-500 uppercase tracking-wider">
        Select Node to {actionLabel}
      </p>
      {nodes.length === 0 ? (
        <p className="text-parchment-500 text-xs">No connected nodes found.</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {nodes.map((n) => (
            <button
              key={n.id}
              onClick={() => onChange({ ...target, targetNodeId: n.id, nodeName: n.name })}
              className={`w-full p-2 text-left rounded border text-xs transition-all flex items-center justify-between
                ${target.targetNodeId === n.id
                  ? 'border-yellow-500 bg-yellow-500/10 text-yellow-400'
                  : 'border-dark-50 text-parchment-300 hover:border-yellow-500/40'}`}
            >
              <div>
                <span className="font-display">{n.name}</span>
                <span className="ml-2 text-[10px] text-parchment-500 capitalize">{n.type.toLowerCase().replace(/_/g, ' ')}</span>
              </div>
              <span className={`text-[10px] font-display ${dangerColor(n.dangerLevel)}`}>
                Danger {n.dangerLevel}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTarget(target: Record<string, unknown>): string {
  const parts: string[] = [];
  if (target.resourceName) parts.push(String(target.resourceName));
  if (target.recipeName) parts.push(String(target.recipeName));
  if (target.nodeName) parts.push(String(target.nodeName));
  return parts.join(', ') || 'No target selected';
}
