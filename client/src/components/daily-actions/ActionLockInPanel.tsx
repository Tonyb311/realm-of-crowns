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
import { TOAST_STYLE } from '../../constants';

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
  GATHER:      { label: 'Gather',      icon: Pickaxe,    color: 'text-realm-success' },
  CRAFT:       { label: 'Craft',       icon: Hammer,     color: 'text-realm-teal-300' },
  TRAVEL:      { label: 'Travel',      icon: MapPin,     color: 'text-realm-gold-400' },
  GUARD:       { label: 'Guard',       icon: Shield,     color: 'text-cyan-400' },
  AMBUSH:      { label: 'Ambush',      icon: Crosshair,  color: 'text-realm-danger' },
  ENLIST:      { label: 'Enlist',      icon: ScrollText,  color: 'text-realm-purple-300' },
  PROPOSE_LAW: { label: 'Propose Law', icon: Scale,      color: 'text-realm-gold-400' },
  REST:        { label: 'Rest',        icon: BedDouble,  color: 'text-realm-text-secondary' },
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
      <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-realm-gold-400 animate-spin" />
      </div>
    );
  }

  // If there is a locked action, show it
  if (locked) {
    const cfg = ACTION_CONFIG[locked.actionType];
    const Icon = cfg.icon;
    return (
      <div className="bg-realm-bg-700 border border-realm-gold-500/30 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-realm-gold-400" />
          <h3 className="font-display text-realm-gold-400 text-sm">Action Locked</h3>
        </div>

        <div className="flex items-center gap-3 p-4 bg-realm-bg-800 border border-realm-border rounded-lg mb-4">
          <Icon className={`w-6 h-6 ${cfg.color}`} />
          <div className="flex-1">
            <p className={`font-display text-lg ${cfg.color}`}>{cfg.label}</p>
            {locked.actionTarget && Object.keys(locked.actionTarget).length > 0 && (
              <p className="text-realm-text-muted text-xs mt-0.5">
                {formatTarget(locked.actionTarget)}
              </p>
            )}
          </div>
          <CheckCircle2 className="w-5 h-5 text-realm-success flex-shrink-0" />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedType(locked.actionType);
              setActionTarget(locked.actionTarget);
            }}
            className="flex-1 py-2 border border-realm-gold-500/40 text-realm-gold-400 font-display text-sm rounded hover:bg-realm-bg-800 transition-colors"
          >
            Change
          </button>
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="flex-1 py-2 border border-realm-danger/40 text-realm-danger font-display text-sm rounded hover:bg-realm-danger/20 transition-colors disabled:opacity-50"
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
          </button>
        </div>
      </div>
    );
  }

  // No locked action: show action selector
  return (
    <div className="bg-realm-bg-700 border border-realm-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-realm-gold-400 text-sm">Choose Daily Action</h3>
        <span className="text-[10px] text-realm-text-muted bg-realm-bg-800 px-2 py-0.5 rounded">
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
                  ? `border-realm-gold-500 bg-realm-gold-500/10 ${cfg.color}`
                  : isDisabled
                    ? 'border-realm-border bg-realm-bg-800/30 text-realm-text-muted/30 cursor-not-allowed'
                    : 'border-realm-border bg-realm-bg-800/50 text-realm-text-secondary hover:border-realm-gold-500/40'}`}
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
            <p className="text-realm-text-muted text-xs p-3 bg-realm-bg-800 rounded-lg">
              You will enlist in available military service for the day.
            </p>
          )}
          {selectedType === 'PROPOSE_LAW' && (
            <p className="text-realm-text-muted text-xs p-3 bg-realm-bg-800 rounded-lg">
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
          className="w-full py-3 bg-realm-gold-500 text-realm-bg-900 font-display text-sm rounded hover:bg-realm-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        <div className="mt-3 p-3 bg-realm-danger/30 border border-realm-danger/50 rounded text-realm-danger text-xs flex items-center gap-2">
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
    <div className="p-3 bg-realm-bg-800 rounded-lg space-y-3">
      <p className="text-[10px] text-realm-text-muted uppercase tracking-wider">Select Resource</p>
      {resources.length === 0 ? (
        <p className="text-realm-text-muted text-xs">No resources available in your location.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {resources.map((r) => (
            <button
              key={r.id}
              onClick={() => onChange({ ...target, resourceId: r.id, resourceName: r.resourceName })}
              className={`p-2 text-left rounded border text-xs transition-all
                ${target.resourceId === r.id
                  ? 'border-realm-success bg-realm-success/10 text-realm-success'
                  : 'border-realm-border text-realm-text-secondary hover:border-realm-success/40'}`}
            >
              <span className="font-display">{r.resourceName}</span>
              <span className="block text-[10px] text-realm-text-muted capitalize">{r.resourceType.toLowerCase()}</span>
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
    <div className="p-3 bg-realm-bg-800 rounded-lg space-y-3">
      <p className="text-[10px] text-realm-text-muted uppercase tracking-wider">Select Recipe</p>
      {recipes.length === 0 ? (
        <p className="text-realm-text-muted text-xs">No recipes available.</p>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {recipes.map((r) => (
            <button
              key={r.id}
              onClick={() => onChange({ ...target, recipeId: r.id, recipeName: r.name })}
              className={`w-full p-2 text-left rounded border text-xs transition-all
                ${target.recipeId === r.id
                  ? 'border-realm-teal-300 bg-realm-teal-300/10 text-realm-teal-300'
                  : 'border-realm-border text-realm-text-secondary hover:border-realm-teal-300/40'}`}
            >
              <span className="font-display">{r.name}</span>
              <span className="ml-2 text-[10px] text-realm-text-muted">{r.professionType}</span>
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
    if (level <= 2) return 'text-realm-success';
    if (level <= 5) return 'text-realm-gold-400';
    if (level <= 7) return 'text-orange-400';
    return 'text-realm-danger';
  };

  return (
    <div className="p-3 bg-realm-bg-800 rounded-lg space-y-3">
      <p className="text-[10px] text-realm-text-muted uppercase tracking-wider">
        Select Node to {actionLabel}
      </p>
      {nodes.length === 0 ? (
        <p className="text-realm-text-muted text-xs">No connected nodes found.</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {nodes.map((n) => (
            <button
              key={n.id}
              onClick={() => onChange({ ...target, targetNodeId: n.id, nodeName: n.name })}
              className={`w-full p-2 text-left rounded border text-xs transition-all flex items-center justify-between
                ${target.targetNodeId === n.id
                  ? 'border-realm-gold-500 bg-realm-gold-500/10 text-realm-gold-400'
                  : 'border-realm-border text-realm-text-secondary hover:border-realm-gold-500/40'}`}
            >
              <div>
                <span className="font-display">{n.name}</span>
                <span className="ml-2 text-[10px] text-realm-text-muted capitalize">{n.type.toLowerCase().replace(/_/g, ' ')}</span>
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
